import { WorkflowContext } from "@upstash/workflow";
import { connectToDB } from "../config/database.js";
import { env } from "../config/keys.js";
import logger from "../config/logger.js";
import { getPaystack } from "../config/paystack.js";
import Transfer from "../models/transfer.js";
import UserModel from "../models/user.js";
import { NotificationService } from "../services/notification.service.js";
import emailService from "../services/email.service.js";
import { invalidateCache } from "../utils/cache.js";
import { workflowClient } from "./client.js";

interface TransferNotificationPayload {
  reference: string;
  status: "success" | "failed" | "reversed" | "aborted" | "abandoned";
}

interface TransferSyncResult {
  checked: number;
  resolved: number;
  unchanged: number;
  now: string;
}

const TERMINAL_STATUSES = new Set([
  "success",
  "failed",
  "reversed",
  "aborted",
  "abandoned",
]);

/**
 * Maps a Paystack transfer status to the local Transfer enum.
 * Non-terminal / unknown statuses return `null` so the local row is untouched.
 */
const mapRemoteStatus = (status?: string) => {
  if (!status) return null;
  const normalized = status.toLowerCase();
  if (TERMINAL_STATUSES.has(normalized)) return normalized;
  if (normalized === "payout_processing") return null;
  if (normalized === "in_transit") return "in_transit";
  if (normalized === "pending") return "pending";
  if (normalized === "otp") return "otp";
  return null;
};

const STALE_THRESHOLD_MS = 15 * 60 * 1000;

/**
 * Notifies a recipient that their transfer has resolved (success/failure).
 * Triggered from the transfer webhook handler once a terminal status lands.
 */
export const sendTransferNotificationWorkflow = async (
  context: WorkflowContext<TransferNotificationPayload>,
) => {
  const payload = context.requestPayload;
  if (!payload) {
    logger.error("No requestPayload received in sendTransferNotificationWorkflow");
    return;
  }

  await context.run("send-transfer-notification", async () => {
    try {
      await connectToDB();
      const transfer = await Transfer.findOne({
        reference: payload.reference,
      }).lean();
      if (!transfer) {
        logger.error(
          `Transfer ${payload.reference} not found for notification workflow`,
        );
        return;
      }

      const user = await UserModel.findById(transfer.userId).lean();
      if (!user) {
        logger.error(
          `User ${transfer.userId} not found for transfer notification workflow`,
        );
        return;
      }

      const isSuccess = payload.status === "success";

      await emailService.sendTransferNotificationEmail({
        user: {
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
        } as any,
        data: {
          amount: transfer.amount,
          reference: payload.reference,
          date: transfer.createdAt ?? new Date(),
          status: payload.status,
        },
      });

      await NotificationService.send({
        userId: transfer.userId.toString(),
        type: "transfer_received",
        title: isSuccess ? "Transfer Received" : "Transfer Update",
        message: isSuccess
          ? `A transfer of ₦${transfer.amount.toLocaleString()} has been sent to your bank account. Reference: ${payload.reference}`
          : `A transfer of ₦${transfer.amount.toLocaleString()} could not be completed. Reference: ${payload.reference}`,
        metadata: {
          amount: transfer.amount,
          reference: payload.reference,
          status: payload.status,
        },
      });

      logger.info(
        `Transfer notification sent for ${payload.reference} to ${user.email}`,
      );
    } catch (error: any) {
      logger.error(
        `Workflow failed to send transfer notification for ${payload.reference}:`,
        error.message || error,
      );
    }
  });
};

/**
 * Reconciles stale `pending`/`in_transit` transfers against Paystack.
 * Paystack processes transfers asynchronously and webhooks can be missed, so
 * this scheduled sweep verifies each local row against `GET /transfer/verify`
 * and syncs the terminal status (success/failed/reversed/aborted).
 */
export const runTransferSyncWorkflow = async (
  context: WorkflowContext,
): Promise<TransferSyncResult> => {
  const local = await context.run("fetch-stale-transfers", async () => {
    await connectToDB();
    const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS);
    const docs = await Transfer.find({
      status: { $in: ["pending", "in_transit", "otp"] },
      createdAt: { $lte: cutoff },
    })
      .select("_id userId reference transferCode status")
      .lean();
    return docs as unknown as Array<{
      _id: string;
      userId: unknown;
      reference: string;
      transferCode?: string;
      status: string;
    }>;
  });

  const result = await context.run("reconcile-with-paystack", async () => {
    let resolved = 0;
    let unchanged = 0;

    const updateOps: Array<{
      updateOne: {
        filter: { _id: string };
        update: { $set: Record<string, unknown> };
      };
    }> = [];
    // Transfers that transitioned to a terminal status this sweep. If their
    // webhook was missed, the recipient would otherwise never be notified.
    const notifications: Array<{
      reference: string;
      status: "success" | "failed" | "reversed" | "aborted" | "abandoned";
    }> = [];

    for (const transfer of local) {
      try {
        const { data } = await getPaystack().get(
          `/transfer/verify/${transfer.reference}`,
        );
        const remote = data?.data ?? null;
        if (!remote) {
          unchanged += 1;
          continue;
        }
        const mapped = mapRemoteStatus(remote.status);
        if (!mapped || mapped === transfer.status) {
          unchanged += 1;
          continue;
        }
        updateOps.push({
          updateOne: {
            filter: { _id: transfer._id },
            update: {
              $set: {
                status: mapped,
                transferCode: remote.transfer_code || transfer.transferCode,
                failureReason: remote.failure_reason || undefined,
              },
            },
          },
        });
        if (TERMINAL_STATUSES.has(mapped)) {
          notifications.push({
            reference: transfer.reference,
            status: mapped as
              | "success"
              | "failed"
              | "reversed"
              | "aborted"
              | "abandoned",
          });
        }
        resolved += 1;
      } catch (error: any) {
        if (error.response?.status === 404) {
          // Transfer no longer exists on Paystack — heal to failed.
          updateOps.push({
            updateOne: {
              filter: { _id: transfer._id },
              update: {
                $set: { status: "failed", failureReason: "Transfer not found" },
              },
            },
          });
          notifications.push({
            reference: transfer.reference,
            status: "failed",
          });
          resolved += 1;
          continue;
        }
        logger.error(
          `Transfer sync: failed to verify ${transfer.reference}:`,
          error.response?.data?.message || error.message || error,
        );
        unchanged += 1;
      }
    }

    if (updateOps.length > 0) {
      await Transfer.bulkWrite(updateOps);
      await Promise.all([
        invalidateCache("transfers:user:*"),
        invalidateCache("transfers:all:*"),
      ]);

      // Notify recipients resolved this sweep. The deterministic
      // workflowRunId deduplicates against any webhook that already notified.
      if (notifications.length > 0) {
        await Promise.allSettled(
          notifications.map((n) =>
            workflowClient.trigger({
              url: `${env.clientUrl}/api/v1/workflow/transfer-notification`,
              workflowRunId: `transfer-notification:${n.reference}:${n.status}`,
              body: { reference: n.reference, status: n.status },
            }),
          ),
        );
      }
    }

    const summary: TransferSyncResult = {
      checked: local.length,
      resolved,
      unchanged,
      now: new Date().toISOString(),
    };
    logger.info({ ...summary, message: "Transfer sync sweep complete" });
    return summary;
  });

  return result;
};
