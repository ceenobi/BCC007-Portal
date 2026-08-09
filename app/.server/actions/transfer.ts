import mongoose from "mongoose";
import z from "zod";
import { hasPermission } from "~/lib/rbac";
import {
  createTransferSchema,
  finalizeTransferSchema,
  retryTransferSchema,
  verifyTransferSchema,
} from "~/lib/schema";
import { tryCatchWrapper } from "~/lib/tryCatchWrapper";
import {
  escapeRegex,
  REPORT_PERIODS,
  toEndOfDay,
  toStartOfDay,
} from "~/lib/utils";
import type {
  CreateTransferSchemaType,
  FinalizeTransferSchemaType,
  RetryTransferSchemaType,
  VerifyTransferSchemaType,
} from "~/types";
import logger from "../config/logger";
import BankDetails from "../models/bank";
import Transfer from "../models/transfer";
import User from "../models/user";
import { AuditLogService } from "../services/auditlog-service";
import { auth } from "../services/better-auth";
import { PaystackService } from "../services/paystack.service";
import { fetchWithCache, invalidateCache } from "../utils/cache";
import { checkRateLimit } from "../utils/rate-limit";

const TRANSFER_STATUSES = [
  "pending",
  "otp",
  "in_transit",
  "success",
  "failed",
  "reversed",
  "aborted",
  "abandoned",
] as const;

const TRANSFER_STATUS_SET = new Set<string>(TRANSFER_STATUSES);

/**
 * Normalizes a Paystack-initiated transfer status to a valid local enum value.
 * Paystack may return `otp` (transfer awaiting OTP approval) or other
 * non-terminal statuses that our model does not store; these map to `pending`
 * so the row persists and the reconciliation workflow later syncs the true
 * terminal status.
 */
const normalizeStatus = (
  status?: string,
): (typeof TRANSFER_STATUSES)[number] => {
  if (status && TRANSFER_STATUS_SET.has(status)) {
    return status as (typeof TRANSFER_STATUSES)[number];
  }
  return "pending";
};

// How long a transient in-flight claim (retry / finalize) is held before it is
// considered stale and can be reclaimed after a crash.
const TRANSFER_CLAIM_TTL_MS = 5 * 60 * 1000;

/**
 * Atomically claims a transfer for a transient operation (retry / finalize).
 *
 * Uses a conditional `findOneAndUpdate` on a `metadata.*` stamp so only one
 * concurrent request can proceed. A stale stamp (crashed mid-operation) is
 * cleared and re-claimed. Returns true when the caller won the claim.
 */
async function claimTransferMeta(
  transferId: unknown,
  key: "retrying" | "finalizing",
  statusFilter: (typeof TRANSFER_STATUSES)[number],
  by: string,
): Promise<boolean> {
  const stamp = { at: new Date(), by };
  const filter = {
    _id: transferId,
    status: statusFilter,
    [`metadata.${key}`]: { $exists: false },
  };
  const claimed = await Transfer.findOneAndUpdate(
    filter,
    { $set: { [`metadata.${key}`]: stamp } },
    { returnDocument: "after" },
  ).lean();
  if (claimed) return true;

  const current = await Transfer.findById(transferId)
    .select("status metadata")
    .lean();
  const existing = (current?.metadata?.[key] ?? undefined) as
    | { at?: Date | string; by?: string }
    | undefined;
  if (
    current?.status === statusFilter &&
    existing &&
    Date.now() - new Date(existing.at as any).getTime() < TRANSFER_CLAIM_TTL_MS
  ) {
    return false; // actively held by another in-flight request
  }

  // Stale claim from a crashed request — clear it and re-claim atomically.
  await Transfer.updateOne(
    { _id: transferId },
    { $unset: { [`metadata.${key}`]: "" } },
  );
  const reClaimed = await Transfer.findOneAndUpdate(
    filter,
    { $set: { [`metadata.${key}`]: { at: new Date(), by } } },
    { returnDocument: "after" },
  ).lean();
  return Boolean(reClaimed);
}

/**
 * Releases a claim held by the caller. No-op if the stamp belongs to another
 * request (or was already cleared).
 */
async function releaseTransferMeta(
  transferId: unknown,
  key: "retrying" | "finalizing",
  by: string,
): Promise<void> {
  await Transfer.updateOne(
    { _id: transferId, [`metadata.${key}.by`]: by },
    { $unset: { [`metadata.${key}`]: "" } },
  ).catch(() => undefined);
}

/**
 * Initiates a transfer from the Paystack balance to a member's saved bank
 * account. Only users with `MANAGE_PAYMENTS` permission can send money.
 *
 * The Paystack transfer recipient is created once per bank account and reused
 * on subsequent transfers (looked up from previous Transfer docs by
 * `bankDetailsId`).
 */
export async function initiateTransfer(
  request: Request,
  payload: CreateTransferSchemaType,
) {
  return tryCatchWrapper(async () => {
    await checkRateLimit(request, "strict");
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (!session) {
      logger.error("Unauthorized");
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }
    if (!hasPermission(session.user.role, "MANAGE_TRANSFERS")) {
      logger.error("Forbidden");
      return Response.json(
        {
          success: false,
          message: "Access denied. Requires 'MANAGE_TRANSFERS' permission.",
        },
        { status: 403 },
      );
    }
    const result = createTransferSchema.safeParse(payload);
    if (!result.success) {
      logger.error("Invalid data format");
      return Response.json(
        {
          success: false,
          message: "Invalid dataschema",
          errors: z.treeifyError(result.error),
        },
        { status: 400 },
      );
    }

    const recipientUser = await User.findById(result.data.userId).lean();
    if (!recipientUser) {
      logger.error(`Recipient user not found: ${result.data.userId}`);
      return Response.json(
        { success: false, message: "Recipient user not found" },
        { status: 404 },
      );
    }

    const bankDetails = await BankDetails.findOne({
      userId: result.data.userId,
    }).lean();
    if (!bankDetails) {
      logger.error(`No bank details for recipient ${result.data.userId}`);
      return Response.json(
        {
          success: false,
          message:
            "Recipient has no saved bank account. Ask them to add one in Settings.",
        },
        { status: 400 },
      );
    }

    // Reuse an existing Paystack recipient for this bank account if one exists.
    const previous = await Transfer.findOne({
      bankDetailsId: bankDetails._id,
      recipientCode: { $exists: true, $ne: "" },
    })
      .sort({ createdAt: -1 })
      .select("recipientCode")
      .lean();

    let recipientCode = previous?.recipientCode ?? "";
    if (!recipientCode) {
      const recipient = await PaystackService.createTransferRecipient({
        name: bankDetails.bankAccountName,
        account_number: bankDetails.bankAccountNumber,
        bank_code: bankDetails.bankCode,
      });
      if (!recipient.status || !recipient.data?.recipient_code) {
        logger.error("Paystack failed to create transfer recipient");
        return Response.json(
          {
            success: false,
            message: "Failed to create transfer recipient. Please try again.",
          },
          { status: 400 },
        );
      }
      recipientCode = recipient.data.recipient_code;
    }

    const reference = PaystackService.generateReference("BCC-TRF");

    // Idempotency claim: create the Transfer row BEFORE calling Paystack so
    // concurrent/duplicate submissions for the same idempotency key can never
    // double-send money. The unique index on `idempotencyKey` resolves the race.
    let transfer;
    try {
      transfer = await Transfer.create({
        userId: result.data.userId,
        bankDetailsId: bankDetails._id,
        recipientCode,
        amount: result.data.amount,
        reference,
        reason: result.data.reason,
        status: "pending",
        idempotencyKey: result.data.idempotencyKey ?? undefined,
        metadata: { initiatedBy: session.user.id },
      });
    } catch (error: any) {
      if (error?.code !== 11000) throw error;
      // Duplicate idempotency key — an identical submission already claimed
      // this intent. Replay the existing transfer instead of sending again.
      const existing = await Transfer.findOne({
        idempotencyKey: result.data.idempotencyKey,
      }).lean();
      if (!existing) throw error;
      logger.info(
        `Duplicate transfer initiation for key ${result.data.idempotencyKey}; returning existing ${existing.reference}`,
      );
      return Response.json(
        {
          success: true,
          message: "Transfer already initiated",
          body: existing,
        },
        { status: 201 },
      );
    }

    let initiated;
    try {
      initiated = await PaystackService.initiateTransfer({
        recipient: recipientCode,
        amount: result.data.amount,
        reason: result.data.reason,
        reference,
      });
    } catch (error) {
      // Paystack never accepted the transfer — remove the pending row so the
      // same idempotency key can be retried immediately.
      await Transfer.deleteOne({ _id: transfer._id }).catch(() => undefined);
      throw error;
    }

    if (!initiated.status || !initiated.data?.transfer_code) {
      logger.error("Paystack failed to initiate transfer");
      await Transfer.deleteOne({ _id: transfer._id }).catch(() => undefined);
      return Response.json(
        {
          success: false,
          message: "Transfer initiation failed. Please try again.",
        },
        { status: 400 },
      );
    }

    const updated = await Transfer.findOneAndUpdate(
      { _id: transfer._id },
      {
        $set: {
          status: normalizeStatus(initiated.data.status),
          transferCode: initiated.data.transfer_code,
        },
      },
      { returnDocument: "after" },
    );

    await invalidateCache(`transfers:user:${result.data.userId}*`);
    await invalidateCache("transfers:all*");
    await invalidateCache("balance:available");
    await AuditLogService.record(request, {
      action: "TRANSFER_INITIATED",
      category: "payment",
      description: `Initiated ₦${result.data.amount} transfer to ${recipientUser.name}`,
      details: {
        reference,
        amount: result.data.amount,
        recipient: result.data.userId,
      },
    });

    return Response.json(
      {
        success: true,
        message: "Transfer initiated successfully",
        body: updated,
      },
      { status: 201 },
    );
  });
}

/**
 * Verifies a transfer against Paystack and syncs its status locally.
 */
export async function verifyTransfer(
  request: Request,
  payload: VerifyTransferSchemaType,
) {
  return tryCatchWrapper(async () => {
    await checkRateLimit(request, "strict");
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (!session) {
      logger.error("Unauthorized");
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }
    const result = verifyTransferSchema.safeParse(payload);
    if (!result.success) {
      logger.error("Invalid data format");
      return Response.json(
        {
          success: false,
          message: "Invalid dataschema",
          errors: z.treeifyError(result.error),
        },
        { status: 400 },
      );
    }

    const transfer = await Transfer.findOne({
      reference: result.data.reference,
    }).lean();
    if (!transfer) {
      logger.error(`Transfer not found: ${result.data.reference}`);
      return Response.json(
        { success: false, message: "Transfer not found" },
        { status: 404 },
      );
    }

    const verified = await PaystackService.verifyTransfer(
      result.data.reference,
    );
    const remote = verified.data;
    const localStatus =
      remote.status && TRANSFER_STATUSES.includes(remote.status as any)
        ? (remote.status as (typeof TRANSFER_STATUSES)[number])
        : transfer.status;

    const updated = await Transfer.findOneAndUpdate(
      { reference: result.data.reference },
      {
        $set: {
          status: localStatus,
          transferCode: remote.transfer_code || transfer.transferCode,
          failureReason: remote.failure_reason || undefined,
        },
      },
      { returnDocument: "after" },
    );

    await invalidateCache(`transfers:user:${transfer.userId.toString()}*`);
    await invalidateCache("transfers:all*");

    return Response.json({
      success: true,
      message: "Transfer verified",
      body: updated,
    });
  });
}

/**
 * Returns the available Paystack balance for the integration account, the
 * ceiling for what can be transferred to a member. Amounts are Naira.
 */
export async function getAvailableBalance(request: Request) {
  return tryCatchWrapper(async () => {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (!session) {
      logger.error("Unauthorized");
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const entry = await fetchWithCache(
      "balance:available",
      60,
      () => PaystackService.getBalance("NGN"),
    );
    const available = entry
      ? {
          total: entry.available_balance / 100,
          pending: entry.pending_balance / 100,
          balance: entry.balance / 100,
          currency: entry.currency,
        }
      : { total: 0, pending: 0, balance: 0, currency: "NGN" };

    return Response.json({
      success: true,
      message: "Available balance fetched successfully",
      body: available,
    });
  });
}

/**
 * Completes a transfer that Paystack flagged for OTP approval.
 *
 * When "Confirm transfers before sending" is enabled on the Paystack
 * dashboard, `initiateTransfer` returns `data.status: "otp"` and the OTP is
 * emailed/texted to the business owner. This action submits that OTP to
 * `POST /transfer/finalize_transfer` so Paystack continues processing.
 */
export async function finalizeTransfer(
  request: Request,
  payload: FinalizeTransferSchemaType,
) {
  return tryCatchWrapper(async () => {
    await checkRateLimit(request, "strict");
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (!session) {
      logger.error("Unauthorized");
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }
    if (!hasPermission(session.user.role, "MANAGE_TRANSFERS")) {
      logger.error("Forbidden");
      return Response.json(
        {
          success: false,
          message: "Access denied. Requires 'MANAGE_TRANSFERS' permission.",
        },
        { status: 403 },
      );
    }
    const result = finalizeTransferSchema.safeParse(payload);
    if (!result.success) {
      logger.error("Invalid data format");
      return Response.json(
        {
          success: false,
          message: "Invalid dataschema",
          errors: z.treeifyError(result.error),
        },
        { status: 400 },
      );
    }

    const transfer = await Transfer.findOne({
      transferCode: result.data.transferCode,
    }).lean();
    if (!transfer) {
      logger.error(`Transfer not found: ${result.data.transferCode}`);
      return Response.json(
        { success: false, message: "Transfer not found" },
        { status: 404 },
      );
    }
    if (transfer.status !== "otp") {
      logger.error(
        `Transfer ${result.data.transferCode} is not awaiting OTP approval`,
      );
      return Response.json(
        {
          success: false,
          message: "This transfer is not awaiting OTP approval.",
        },
        { status: 400 },
      );
    }

    // Atomic guard: only one OTP submission may finalize a given transfer.
    // Concurrent submits (double-click) would otherwise both call Paystack.
    const claimed = await claimTransferMeta(
      transfer._id,
      "finalizing",
      "otp",
      session.user.id,
    );
    if (!claimed) {
      return Response.json(
        {
          success: false,
          message:
            "This transfer is already being finalized. Check back shortly.",
        },
        { status: 409 },
      );
    }

    const releaseClaim = () =>
      releaseTransferMeta(transfer._id, "finalizing", session.user.id);

    let updated;
    try {
      const finalized = await PaystackService.finalizeTransfer(
        result.data.transferCode,
        result.data.otp,
      );

      if (!finalized.status || !finalized.data?.transfer_code) {
        await releaseClaim();
        logger.error("Paystack failed to finalize transfer");
        return Response.json(
          {
            success: false,
            message:
              finalized.message ||
              "Failed to finalize transfer. Please retry.",
          },
          { status: 400 },
        );
      }

      const localStatus = normalizeStatus(finalized.data.status);
      updated = await Transfer.findOneAndUpdate(
        { transferCode: result.data.transferCode },
        {
          $set: {
            status: localStatus,
            failureReason: finalized.data.failures
              ? JSON.stringify(finalized.data.failures)
              : undefined,
          },
        },
        { returnDocument: "after" },
      );

      await releaseClaim();
    } catch (error) {
      await releaseClaim();
      throw error;
    }

    await invalidateCache(`transfers:user:${transfer.userId.toString()}*`);
    await invalidateCache("transfers:all*");
    await AuditLogService.record(request, {
      action: "TRANSFER_FINALIZED",
      category: "payment",
      description: `Finalized ₦${transfer.amount} transfer ${transfer.reference} with OTP approval`,
      details: {
        transferCode: result.data.transferCode,
        reference: transfer.reference,
      },
    });

    return Response.json({
      success: true,
      message: "Transfer finalized successfully",
      body: updated,
    });
  });
}

/**
 * Retries a transfer that Paystack reports as failed.
 *
 * Safety: the transfer is verified against Paystack first — if the remote
 * status is anything but a terminal non-success (`failed`/`aborted`/
 * `reversed`/`abandoned`), the retry is rejected so money is never sent
 * twice. A retry produces a *new* Transfer row with a fresh reference
 * (references are globally unique), leaving the original as the audit trail.
 */
export async function retryTransfer(
  request: Request,
  payload: RetryTransferSchemaType,
) {
  return tryCatchWrapper(async () => {
    await checkRateLimit(request, "strict");
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (!session) {
      logger.error("Unauthorized");
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }
    if (!hasPermission(session.user.role, "MANAGE_TRANSFERS")) {
      logger.error("Forbidden");
      return Response.json(
        {
          success: false,
          message: "Access denied. Requires 'MANAGE_TRANSFERS' permission.",
        },
        { status: 403 },
      );
    }
    const result = retryTransferSchema.safeParse(payload);
    if (!result.success) {
      logger.error("Invalid data format");
      return Response.json(
        {
          success: false,
          message: "Invalid dataschema",
          errors: z.treeifyError(result.error),
        },
        { status: 400 },
      );
    }

    const original = await Transfer.findOne({
      reference: result.data.reference,
    }).lean();
    if (!original) {
      logger.error(`Transfer not found: ${result.data.reference}`);
      return Response.json(
        { success: false, message: "Transfer not found" },
        { status: 404 },
      );
    }
    if (original.status !== "failed") {
      logger.error(
        `Transfer ${result.data.reference} (${original.status}) is not retryable`,
      );
      return Response.json(
        {
          success: false,
          message:
            "Only failed transfers can be retried. Verify the transfer if it is still processing.",
        },
        { status: 400 },
      );
    }
    if (original.metadata?.retriedTo) {
      logger.error(
        `Transfer ${result.data.reference} has already been retried (→ ${original.metadata.retriedTo})`,
      );
      return Response.json(
        {
          success: false,
          message:
            "This transfer has already been retried. Check the new transfer for its status.",
        },
        { status: 409 },
      );
    }

    // Atomic claim: only one concurrent retry may proceed for a given original.
    // The `metadata.retrying` stamp (with TTL) prevents double-payout when two
    // requests retry the same failed transfer at the same time.
    const claimed = await claimTransferMeta(
      original._id,
      "retrying",
      "failed",
      session.user.id,
    );
    if (!claimed) {
      return Response.json(
        {
          success: false,
          message:
            "A retry for this transfer is already in progress. Check back shortly.",
        },
        { status: 409 },
      );
    }

    const releaseClaim = () =>
      releaseTransferMeta(original._id, "retrying", session.user.id);

    try {
      const remote = await PaystackService.verifyTransfer(result.data.reference);
      const remoteStatus = remote.data?.status?.toLowerCase();
      const terminalFailed = new Set([
        "failed",
        "aborted",
        "reversed",
        "abandoned",
      ]);
      if (!remoteStatus || !terminalFailed.has(remoteStatus)) {
        await releaseClaim();
        logger.error(
          `Transfer ${result.data.reference} is not terminally failed remotely (${remoteStatus ?? "unknown"})`,
        );
        return Response.json(
          {
            success: false,
            message:
              "Transfer is still processing on Paystack. Check back later instead of retrying.",
          },
          { status: 400 },
        );
      }

      const newReference = PaystackService.generateReference("BCC-TRF");
      const initiated = await PaystackService.initiateTransfer({
        recipient: original.recipientCode,
        amount: original.amount,
        reason: original.reason,
        reference: newReference,
      });
      if (!initiated.status || !initiated.data?.transfer_code) {
        await releaseClaim();
        logger.error("Paystack failed to initiate retry transfer");
        return Response.json(
          {
            success: false,
            message: "Retry failed to initiate. Please try again.",
          },
          { status: 400 },
        );
      }

      const transfer = await Transfer.create({
        userId: original.userId,
        bankDetailsId: original.bankDetailsId,
        recipientCode: original.recipientCode,
        amount: original.amount,
        reference: newReference,
        transferCode: initiated.data.transfer_code,
        reason: original.reason,
        status: normalizeStatus(initiated.data.status),
        metadata: {
          initiatedBy: session.user.id,
          retriedFrom: original.reference,
        },
      });

      await Transfer.updateOne(
        { _id: original._id, "metadata.retrying.by": session.user.id },
        {
          $set: { "metadata.retriedTo": newReference },
          $unset: { "metadata.retrying": "" },
        },
      );

      await invalidateCache(`transfers:user:${original.userId.toString()}*`);
      await invalidateCache("transfers:all*");
      await invalidateCache("balance:available");
      await AuditLogService.record(request, {
        action: "TRANSFER_RETRIED",
        category: "payment",
        description: `Retried ₦${original.amount} transfer ${original.reference} → ${newReference}`,
        details: {
          fromReference: original.reference,
          newReference,
          amount: original.amount,
          recipient: original.userId.toString(),
        },
      });

      return Response.json(
        {
          success: true,
          message: "Transfer retried successfully",
          body: transfer,
        },
        { status: 201 },
      );
    } catch (error) {
      await releaseClaim();
      throw error;
    }
  });
}

/**
 * Lists the session user's own transfers.
 */
export async function getUserTransfers({
  request,
  page,
  limit,
  transferStatus,
  startDate,
  endDate,
}: {
  request: Request;
  page: number;
  limit: number;
  transferStatus: string | undefined;
  startDate: string | undefined;
  endDate: string | undefined;
}) {
  return tryCatchWrapper(async () => {
    await checkRateLimit(request, "general");
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (!session) {
      logger.error("Unauthorized");
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }
    if (!Number.isInteger(page) || page < 1) {
      logger.error("Invalid page");
      return Response.json(
        { success: false, message: "Invalid page" },
        { status: 400 },
      );
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      logger.error("Invalid limit");
      return Response.json(
        { success: false, message: "Invalid limit" },
        { status: 400 },
      );
    }
    if (
      transferStatus &&
      !(TRANSFER_STATUSES as readonly string[]).includes(transferStatus)
    ) {
      logger.error("Invalid status filter");
      return Response.json(
        { success: false, message: "Invalid status filter" },
        { status: 400 },
      );
    }
    const start = startDate ? toStartOfDay(startDate) : null;
    const end = endDate ? toEndOfDay(endDate) : null;
    if (start && Number.isNaN(start.getTime())) {
      logger.error("Invalid start date");
      return Response.json(
        { success: false, message: "Invalid start date" },
        { status: 400 },
      );
    }
    if (end && Number.isNaN(end.getTime())) {
      logger.error("Invalid end date");
      return Response.json(
        { success: false, message: "Invalid end date" },
        { status: 400 },
      );
    }
    const cacheKey = `transfers:user:${session.user.id}:p${page}:l${limit}:${transferStatus ?? ""}:${startDate ?? ""}:${endDate ?? ""}`;
    const body = await fetchWithCache(cacheKey, 3600, async () => {
      const dateFilter: Record<string, Date> = {};
      if (start) dateFilter.$gte = start;
      if (end) dateFilter.$lte = end;
      const matchStage: Record<string, any> = {
        userId: session.user.id,
      };
      if (Object.keys(dateFilter).length > 0) {
        matchStage.createdAt = dateFilter;
      }
      if (transferStatus) matchStage.transferStatus = transferStatus;
      const total = await Transfer.countDocuments(matchStage);
      const transfers = await Transfer.find(matchStage)
        .populate("userId", "name email image")
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean();
      return {
        transfers,
        meta: {
          currentPage: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: (page - 1) * limit + transfers.length < total,
        },
      };
    });
    return Response.json({
      success: true,
      message: "Transfers fetched successfully",
      body,
    });
  });
}

/**
 * Lists all transfers (group-wide). Requires `MANAGE_PAYMENTS`.
 */
export async function getAllTransfers({
  request,
  page,
  limit,
  query,
  transferStatus,
  startDate,
  endDate,
}: {
  request: Request;
  page: number;
  limit: number;
  query?: string;
  transferStatus?: string;
  startDate?: string;
  endDate?: string;
}) {
  return tryCatchWrapper(async () => {
    await checkRateLimit(request, "general");
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (!session) {
      logger.error("Unauthorized");
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }
    if (!hasPermission(session.user.role, "MANAGE_PAYMENTS")) {
      logger.error("Forbidden");
      return Response.json(
        {
          success: false,
          message: "Access denied. Requires 'MANAGE_PAYMENTS' permission.",
        },
        { status: 403 },
      );
    }
    if (!Number.isInteger(page) || page < 1) {
      logger.error("Invalid page");
      return Response.json(
        { success: false, message: "Invalid page" },
        { status: 400 },
      );
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      logger.error("Invalid limit");
      return Response.json(
        { success: false, message: "Invalid limit" },
        { status: 400 },
      );
    }
    if (
      transferStatus &&
      !(TRANSFER_STATUSES as readonly string[]).includes(transferStatus)
    ) {
      logger.error("Invalid status filter");
      return Response.json(
        { success: false, message: "Invalid status filter" },
        { status: 400 },
      );
    }
    const start = startDate ? toStartOfDay(startDate) : null;
    const end = endDate ? toEndOfDay(endDate) : null;
    if (start && Number.isNaN(start.getTime())) {
      logger.error("Invalid start date");
      return Response.json(
        { success: false, message: "Invalid start date" },
        { status: 400 },
      );
    }
    if (end && Number.isNaN(end.getTime())) {
      logger.error("Invalid end date");
      return Response.json(
        { success: false, message: "Invalid end date" },
        { status: 400 },
      );
    }
    const cacheKey = `transfers:all:p${page}:l${limit}:q${query ?? ""}:status${transferStatus ?? ""}:s${startDate ?? ""}:e${endDate ?? ""}`;
    const body = await fetchWithCache(cacheKey, 3600, async () => {
      const dateFilter: Record<string, Date> = {};
      if (start) dateFilter.$gte = start;
      if (end) dateFilter.$lte = end;
      const matchStage: Record<string, any> = {};
      if (Object.keys(dateFilter).length > 0) {
        matchStage.createdAt = dateFilter;
      }
      if (query) {
        const trimmed = query.trim();
        const escaped = escapeRegex(trimmed);
        const users = await User.find({
          name: { $regex: escaped, $options: "i" },
        })
          .select("_id")
          .lean();
        const userIds = users.map((u: any) => u._id);
        matchStage.$or = [
          { reference: { $regex: escaped, $options: "i" } },
          { userId: { $in: userIds } },
        ];
      }
      if (transferStatus) matchStage.transferStatus = transferStatus;
      const total = await Transfer.countDocuments(matchStage);
      const transfers = await Transfer.find(matchStage)
        .populate("userId", "name email image")
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean();
      return {
        transfers,
        meta: {
          currentPage: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: (page - 1) * limit + transfers.length < total,
        },
      };
    });
    return Response.json({
      success: true,
      message: "Transfers fetched successfully",
      body,
    });
  });
}

// ── Report aggregation helpers ──────────────────────────────────────────

interface MatchStageInput {
  period?: string;
  transferStatus?: string;
  userId?: string;
}

function getPeriodRange(period: string | undefined) {
  const end = new Date();
  if (period === "1w") {
    const start = new Date();
    start.setDate(end.getDate() - 7);
    return { start, end };
  }
  const months = period === "1m" ? 1 : period === "6m" ? 6 : 12;
  const start = new Date(end.getFullYear(), end.getMonth() - (months - 1), 1);
  return { start, end };
}

function buildMatchStageAndDateFormat(input: MatchStageInput) {
  const { period, transferStatus, userId } = input;
  const matchStage: any = {};

  if (userId) matchStage.userId = new mongoose.Types.ObjectId(userId);
  if (transferStatus) matchStage.status = transferStatus;

  if (period && period !== "all") {
    const { start } = getPeriodRange(period);
    matchStage.createdAt = { $gte: start };
  }

  const dateFormat = period === "1w" || period === "1m" ? "%Y-%m-%d" : "%Y-%m";
  return { matchStage, dateFormat };
}

function extractStatsFromFacet(result: any) {
  return {
    totalSent: result.statsTotals[0]?.totalSent || 0,
    totalCount: result.statsTotals[0]?.totalCount || 0,
    successSent: result.statsSuccess[0]?.successSent || 0,
    successCount: result.statsSuccess[0]?.successCount || 0,
    pendingSent: result.statsPending[0]?.pendingSent || 0,
    pendingCount: result.statsPending[0]?.pendingCount || 0,
  };
}

async function runFacetAggregation(matchStage: any, dateFormat: string) {
  return Transfer.aggregate([
    { $match: matchStage },
    {
      $facet: {
        statsTotals: [
          {
            $group: {
              _id: null,
              totalSent: { $sum: "$amount" },
              totalCount: { $sum: 1 },
            },
          },
        ],
        statsSuccess: [
          { $match: { status: "success" } },
          {
            $group: {
              _id: null,
              successSent: { $sum: "$amount" },
              successCount: { $sum: 1 },
            },
          },
        ],
        statsPending: [
          { $match: { status: { $in: ["pending", "otp", "in_transit"] } } },
          {
            $group: {
              _id: null,
              pendingSent: { $sum: "$amount" },
              pendingCount: { $sum: 1 },
            },
          },
        ],
        statusBreakdown: [
          {
            $group: {
              _id: "$status",
              sent: { $sum: "$amount" },
              count: { $sum: 1 },
            },
          },
        ],
        trends: [
          {
            $group: {
              _id: {
                $dateToString: { format: dateFormat, date: "$createdAt" },
              },
              sent: { $sum: "$amount" },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, date: "$_id", sent: 1, count: 1 } },
        ],
      },
    },
  ]);
}

function listMonthsInRange(start: Date, end: Date) {
  const months: Array<{
    _id: string;
    month: string;
    total: number;
    count: number;
  }> = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const stop = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= stop) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    months.push({
      _id: key,
      month: cursor.toLocaleString("default", {
        month: "long",
        year: "numeric",
      }),
      total: 0,
      count: 0,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

async function buildMonthlyBreakdown(
  matchStageBase: any,
  range: { start: Date; end: Date },
) {
  const monthlyMatchStage: any = {
    createdAt: { $gte: range.start, $lte: range.end },
    ...matchStageBase,
  };

  const transfersByMonth = await Transfer.aggregate([
    { $match: monthlyMatchStage },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
        month: {
          $first: {
            $dateToString: { format: "%B %Y", date: "$createdAt" },
          },
        },
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const allMonths = listMonthsInRange(range.start, range.end);

  const monthlyBreakdown = allMonths.map((m) => {
    const fromDb = transfersByMonth.find((p: any) => p._id === m._id);
    if (!fromDb) return m;
    return {
      _id: fromDb._id,
      month: fromDb.month || m.month,
      total: fromDb.total || 0,
      count: fromDb.count || 0,
    };
  });

  const monthlySummary = {
    year: range.end.getFullYear(),
    total: monthlyBreakdown.reduce((sum: number, m: any) => sum + m.total, 0),
  };

  return { monthlyBreakdown, monthlySummary };
}

export async function getGroupTransferReports({
  request,
  period,
  transferStatus,
}: {
  request: Request;
  period: string | undefined;
  transferStatus: string | undefined;
}) {
  return tryCatchWrapper(async () => {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (!session) {
      logger.error("Unauthorized");
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }
    if (!hasPermission(session.user.role, "MANAGE_TRANSFERS")) {
      logger.error("Forbidden");
      return Response.json(
        {
          success: false,
          message:
            "Access denied. Requires 'MANAGE_TRANSFERS' permission.",
        },
        { status: 403 },
      );
    }

    if (
      period &&
      !(REPORT_PERIODS as readonly string[]).includes(period)
    ) {
      return Response.json(
        {
          success: false,
          message: `Invalid period '${period}'. Allowed values: ${REPORT_PERIODS.join(", ")}`,
        },
        { status: 400 },
      );
    }
    if (
      transferStatus &&
      !(TRANSFER_STATUSES as readonly string[]).includes(transferStatus)
    ) {
      return Response.json(
        {
          success: false,
          message: `Invalid transferStatus '${transferStatus}'. Allowed values: ${TRANSFER_STATUSES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const cacheKey = `transfers:group:reports:period:${period ?? "all"}:status:${transferStatus ?? ""}`;
    const body = await fetchWithCache(cacheKey, 3600, async () => {
      const range = getPeriodRange(period);
      const { matchStage, dateFormat } = buildMatchStageAndDateFormat({
        period,
        transferStatus,
      });

      const aggregateResult = await runFacetAggregation(
        matchStage,
        dateFormat,
      );
      const result = aggregateResult[0];
      const stats = extractStatsFromFacet(result);

      const { monthlyBreakdown, monthlySummary } =
        await buildMonthlyBreakdown(
          {
            ...(transferStatus && { status: transferStatus }),
          },
          range,
        );

      return {
        stats,
        statusBreakdown: result.statusBreakdown,
        trends: result.trends,
        monthlyBreakdown,
        monthlySummary,
      };
    });

    return Response.json({
      success: true,
      message: "Transfer reports fetched successfully",
      body,
    });
  });
}

export async function getUserTransferReports({
  request,
  period,
  transferStatus,
}: {
  request: Request;
  period: string | undefined;
  transferStatus: string | undefined;
}) {
  return tryCatchWrapper(async () => {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (!session) {
      logger.error("Unauthorized");
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    if (
      period &&
      !(REPORT_PERIODS as readonly string[]).includes(period)
    ) {
      return Response.json(
        {
          success: false,
          message: `Invalid period '${period}'. Allowed values: ${REPORT_PERIODS.join(", ")}`,
        },
        { status: 400 },
      );
    }
    if (
      transferStatus &&
      !(TRANSFER_STATUSES as readonly string[]).includes(transferStatus)
    ) {
      return Response.json(
        {
          success: false,
          message: `Invalid transferStatus '${transferStatus}'. Allowed values: ${TRANSFER_STATUSES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const cacheKey = `transfers:user:${session.user.id}:reports:period:${period ?? "all"}:status:${transferStatus ?? ""}`;
    const body = await fetchWithCache(cacheKey, 3600, async () => {
      const range = getPeriodRange(period);
      const { matchStage, dateFormat } = buildMatchStageAndDateFormat({
        period,
        transferStatus,
        userId: session.user.id,
      });

      const aggregateResult = await runFacetAggregation(
        matchStage,
        dateFormat,
      );
      const result = aggregateResult[0];
      const stats = extractStatsFromFacet(result);

      const { monthlyBreakdown, monthlySummary } =
        await buildMonthlyBreakdown(
          {
            userId: new mongoose.Types.ObjectId(session.user.id),
            ...(transferStatus && { status: transferStatus }),
          },
          range,
        );

      return {
        stats,
        statusBreakdown: result.statusBreakdown,
        trends: result.trends,
        monthlyBreakdown,
        monthlySummary,
      };
    });

    return Response.json({
      success: true,
      message: "Transfer reports fetched successfully",
      body,
    });
  });
}
