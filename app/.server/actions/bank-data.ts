import z from "zod";
import { createBankAccountSchema, resolveBankAccountSchema } from "~/lib/schema";
import { tryCatchWrapper } from "~/lib/tryCatchWrapper";
import type {
  CreateBankAccountSchemaType,
  ResolveBankAccountSchemaType,
} from "~/types";
import logger from "../config/logger";
import BankDetails from "../models/bank";
import { AuditLogService } from "../services/auditlog-service";
import { auth } from "../services/better-auth";
import { PaystackService } from "../services/paystack.service";
import { fetchWithCache, invalidateCache } from "../utils/cache";
import { checkRateLimit } from "../utils/rate-limit";

export async function saveBankAccount(
  request: Request,
  payload: CreateBankAccountSchemaType,
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
    const result = createBankAccountSchema.safeParse(payload);
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

    // Resolve the account server-side so the stored name is authoritative.
    let resolvedAccountName: string;
    try {
      const resolved = await PaystackService.resolveAccountNumber({
        account_number: result.data.bankAccountNumber,
        bank_code: result.data.bankCode,
      });
      resolvedAccountName = resolved.account_name;
    } catch (error: any) {
      logger.error(
        {
          message: error.message,
          details: error.response?.data || "No additional details",
        },
        "Failed to resolve account number while saving bank details:",
      );
      return Response.json(
        {
          success: false,
          message:
            "Could not verify account details. Please check the account number and bank.",
        },
        { status: 400 },
      );
    }

    const update = {
      bankAccountNumber: result.data.bankAccountNumber,
      bankAccountName: resolvedAccountName,
      bank: result.data.bank,
      bankCode: result.data.bankCode,
    };

    const existing = await BankDetails.findOne({ userId: session.user.id });
    const isFirstCreation = !existing;

    let bankDetails;
    if (existing) {
      bankDetails = await BankDetails.findOneAndUpdate(
        { _id: existing._id },
        update,
        { returnDocument: "after" },
      );
    } else {
      bankDetails = await BankDetails.create({
        ...update,
        userId: session.user.id,
      });
    }

    await invalidateCache(`bank-data:user:${session.user.id}*`);
    await AuditLogService.record(request, {
      action: "BANK_DATA_CHANGE",
      category: "settings",
      description: `${
        isFirstCreation ? "Added" : "Updated"
      } bank details for user ${session.user.id}`,
      details: update,
    });

    // Only on first creation, mark onboarding as complete and forward the
    // refreshed session cookies.
    if (isFirstCreation) {
      const sessionUpdate = await auth.api.updateUser({
        body: { isOnboarded: true, tourPending: true },
        headers: request.headers,
        asResponse: true,
      });
      if (!sessionUpdate.ok) {
        logger.error(
          { status: sessionUpdate.status },
          "Failed to mark user as onboarded",
        );
        await BankDetails.deleteOne({ _id: bankDetails._id });
        await invalidateCache(`bank-data:user:${session.user.id}*`);
        return Response.json(
          {
            success: false,
            message: "Failed to complete onboarding. Please try again.",
          },
          { status: 400 },
        );
      }

      return Response.json(
        {
          success: true,
          message: "Bank details added successfully",
          body: bankDetails,
        },
        { status: 201, headers: new Headers(sessionUpdate.headers) },
      );
    }

    return Response.json(
      {
        success: true,
        message: "Bank details updated successfully",
        body: bankDetails,
      },
      { status: 200 },
    );
  });
}

export async function resolveBankAccount(
  request: Request,
  payload: ResolveBankAccountSchemaType,
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
    const result = resolveBankAccountSchema.safeParse(payload);
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
    let resolved: { account_number: string; account_name: string };
    try {
      resolved = await PaystackService.resolveAccountNumber({
        account_number: result.data.accountNumber,
        bank_code: result.data.bankCode,
      });
    } catch (error: any) {
      logger.error(
        {
          message: error.message,
          details: error.response?.data || "No additional details",
        },
        "Failed to resolve account number:",
      );
      return Response.json(
        {
          success: false,
          message:
            "Could not verify account. Check the account number and bank.",
        },
        { status: 400 },
      );
    }
    return Response.json(
      {
        success: true,
        message: "Account verified",
        body: { accountName: resolved.account_name },
      },
      { status: 200 },
    );
  });
}

export async function getUserBankAccount(request: Request) {
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
    const cacheKey = `bank-data:user:${session.user.id}`;
    const bankData = await fetchWithCache(cacheKey, 3600, async () => {
      return await BankDetails.findOne({ userId: session.user.id });
    });
    if (!bankData) {
      return Response.json(
        { success: false, message: "No bank data found" },
        { status: 404 },
      );
    }
    return Response.json(
      {
        success: true,
        message: "Bank data retrieved successfully",
        body: bankData,
      },
      { status: 200 },
    );
  });
}