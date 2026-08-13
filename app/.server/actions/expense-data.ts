import mongoose from "mongoose";
import z from "zod";
import { hasPermission } from "~/lib/rbac";
import { createExpenseSchema, updateExpenseSchema } from "~/lib/schema";
import { tryCatchWrapper } from "~/lib/tryCatchWrapper";
import type {
  CreateExpenseSchemaType,
  UpdateExpenseSchemaType,
} from "~/types";
import logger from "../config/logger";
import Expense from "../models/expense";
import { AuditLogService } from "../services/auditlog-service";
import { auth } from "../services/better-auth";
import { fetchWithCache, invalidateCache } from "../utils/cache";
import { checkRateLimit } from "../utils/rate-limit";

const EXPENSE_STATUSES = ["pending", "approved", "rejected"] as const;
const EXPENSE_CATEGORIES = [
  "logistics",
  "refreshments",
  "venue",
  "equipment",
  "welfare",
  "other",
] as const;

function monthKeyOf(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function createExpense(
  request: Request,
  payload: CreateExpenseSchemaType,
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
    const result = createExpenseSchema.safeParse(payload);
    if (!result.success) {
      logger.error("Invalid data format");
      return Response.json(
        {
          success: false,
          message: "Invalid data format",
          errors: z.treeifyError(result.error),
        },
        { status: 400 },
      );
    }
    const { idempotencyKey, transferId, ...data } = result.data;
    let isReplay = false;
    const expense = await Expense.create({
      ...data,
      userId: session.user.id,
      monthKey: monthKeyOf(new Date()),
      ...(transferId && mongoose.Types.ObjectId.isValid(transferId)
        ? { transferId }
        : {}),
      ...(idempotencyKey ? { idempotencyKey } : {}),
    }).catch(async (err: any) => {
      if (err?.code === 11000 && idempotencyKey) {
        const existing = await Expense.findOne({ idempotencyKey })
          .select("_id title")
          .lean();
        if (existing) {
          isReplay = true;
          return existing;
        }
      }
      throw err;
    });
    if (isReplay) {
      return Response.json(
        { success: true, message: "Expense created" },
        { status: 201 },
      );
    }
    await invalidateCache("expenses:*");

    await AuditLogService.record(request, {
      action: "CREATE_EXPENSE",
      category: "expenses",
      description: `Recorded expense "${expense.title}" of ${expense.amount} ${expense.currency}`,
      details: {
        expenseId: expense._id.toString(),
        title: expense.title,
        amount: expense.amount,
        category: expense.category,
        status: expense.status,
      },
    });

    return Response.json(
      { success: true, message: "Expense created", body: expense },
      { status: 201 },
    );
  });
}

export async function getExpenses({
  request,
  page,
  limit,
  query,
  status,
  category,
}: {
  request: Request;
  page: number;
  limit: number;
  query: string | undefined;
  status: string | undefined;
  category: string | undefined;
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
    if (status && !(EXPENSE_STATUSES as readonly string[]).includes(status)) {
      logger.error("Invalid status filter");
      return Response.json(
        { success: false, message: "Invalid status filter" },
        { status: 400 },
      );
    }
    if (
      category &&
      !(EXPENSE_CATEGORIES as readonly string[]).includes(category)
    ) {
      logger.error("Invalid category filter");
      return Response.json(
        { success: false, message: "Invalid category filter" },
        { status: 400 },
      );
    }
    const canManage = hasPermission(session.user.role, "MANAGE_PAYMENTS");
    const cacheKey = `expenses:p${page}:l${limit}:q${query ?? ""}:status${status ?? ""}:cat${category ?? ""}:manage${canManage}`;
    const body = await fetchWithCache(cacheKey, 300, async () => {
      const matchStage: Record<string, any> = {};
      if (status) matchStage.status = status;
      if (category) matchStage.category = category;
      if (query) {
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        matchStage.$or = [
          { title: { $regex: escaped, $options: "i" } },
          { description: { $regex: escaped, $options: "i" } },
        ];
        if (mongoose.Types.ObjectId.isValid(query)) {
          matchStage.$or.push({ _id: query });
        }
      }
      const expenses = await Expense.find(matchStage)
        .populate("userId", "name email image")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      const total = await Expense.countDocuments(matchStage);
      return {
        expenses,
        meta: {
          currentPage: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
          hasMore: (page - 1) * limit + expenses.length < total,
        },
      };
    });
    return Response.json({
      success: true,
      message: "Expenses fetched successfully",
      body,
    });
  });
}

export async function getExpense(
  request: Request,
  payload: { expenseId: string },
) {
  return tryCatchWrapper(async () => {
    await checkRateLimit(request, "general");
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return Response.json(
        { success: false, message: "Unauthorized, session expired" },
        { status: 401 },
      );
    }
    const expenseId = payload.expenseId as string;
    if (!expenseId || !mongoose.Types.ObjectId.isValid(expenseId)) {
      return Response.json(
        { success: false, message: "Expense ID is required" },
        { status: 400 },
      );
    }
    const cacheKey = `expense:${expenseId}`;
    const body = await fetchWithCache(cacheKey, 300, async () => {
      const found = await Expense.findById(expenseId)
        .populate({ path: "userId", select: "name email image" })
        .lean();
      return found ?? null;
    });
    if (!body) {
      return Response.json(
        { success: false, message: "Expense not found" },
        { status: 404 },
      );
    }
    return Response.json({
      success: true,
      message: "Expense fetched successfully",
      body,
    });
  });
}

export async function updateExpense(
  request: Request,
  payload: UpdateExpenseSchemaType & { expenseId?: string },
) {
  return tryCatchWrapper(async () => {
    await checkRateLimit(request, "strict");
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      logger.error("Unauthorized");
      return Response.json(
        { success: false, message: "Unauthorized, session expired" },
        { status: 401 },
      );
    }
    if (!hasPermission(session.user.role, "MANAGE_PAYMENTS")) {
      logger.error("Forbidden");
      return Response.json(
        {
          success: false,
          message:
            "Access denied. Requires 'MANAGE_PAYMENTS' permission.",
        },
        { status: 403 },
      );
    }
    const expenseId = payload.expenseId as string | undefined;
    if (!expenseId || !mongoose.Types.ObjectId.isValid(expenseId)) {
      logger.error("Invalid expense id");
      return Response.json(
        { success: false, message: "Invalid expense id" },
        { status: 400 },
      );
    }
    const { expenseId: _id, ...rest } = payload;
    const result = updateExpenseSchema.safeParse(rest);
    if (!result.success) {
      logger.error("Invalid data format");
      return Response.json(
        {
          success: false,
          message: "Invalid data format",
          errors: z.treeifyError(result.error),
        },
        { status: 400 },
      );
    }
    const existing = await Expense.findById(expenseId).lean();
    if (!existing) {
      logger.error("Expense not found");
      return Response.json(
        { success: false, message: "Expense not found" },
        { status: 404 },
      );
    }
    const setData: Record<string, unknown> = { ...result.data };
    delete setData.transferId;

    const unsetData: Record<string, 1> = {};
    if (result.data.transferId) {
      if (mongoose.Types.ObjectId.isValid(result.data.transferId)) {
        setData.transferId = result.data.transferId;
      }
    } else if (result.data.transferId === "") {
      unsetData.transferId = 1;
    }

    const update: Record<string, unknown> = { $set: setData };
    if (Object.keys(unsetData).length > 0) update.$unset = unsetData;

    const updated = await Expense.findByIdAndUpdate(expenseId, update, {
      returnDocument: "after",
    })
      .populate({ path: "userId", select: "name image" })
      .lean();

    await invalidateCache("expenses:*");
    await invalidateCache(`expense:${expenseId}`);

    await AuditLogService.record(request, {
      action: "UPDATE_EXPENSE",
      category: "expenses",
      description: `Updated expense "${existing.title}"`,
      details: {
        expenseId,
        title: existing.title,
        amount: updated?.amount,
        category: updated?.category,
        status: updated?.status,
      },
    });

    return Response.json(
      {
        success: true,
        message: "Expense updated successfully",
        body: updated,
      },
      { status: 200 },
    );
  });
}

export async function deleteExpense(
  request: Request,
  payload: { expenseId: string },
) {
  return tryCatchWrapper(async () => {
    await checkRateLimit(request, "strict");
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      logger.error("Unauthorized");
      return Response.json(
        { success: false, message: "Unauthorized, session expired" },
        { status: 401 },
      );
    }
    if (!hasPermission(session.user.role, "MANAGE_PAYMENTS")) {
      logger.error("Forbidden");
      return Response.json(
        {
          success: false,
          message:
            "Access denied. Requires 'MANAGE_PAYMENTS' permission.",
        },
        { status: 403 },
      );
    }
    const expenseId = payload.expenseId as string;
    if (!expenseId || !mongoose.Types.ObjectId.isValid(expenseId)) {
      logger.error("Invalid expense id");
      return Response.json(
        { success: false, message: "Expense ID is required" },
        { status: 400 },
      );
    }
    const expense = await Expense.findById(expenseId).select("title").lean();
    if (!expense) {
      return Response.json(
        { success: true, message: "Expense deleted successfully" },
        { status: 200 },
      );
    }

    await Expense.findByIdAndDelete(expenseId);

    await invalidateCache("expenses:*");
    await invalidateCache(`expense:${expenseId}`);

    await AuditLogService.record(request, {
      action: "DELETE_EXPENSE",
      category: "expenses",
      description: `Deleted expense "${expense.title}"`,
      details: {
        expenseId,
        title: expense.title,
      },
    });

    return Response.json(
      { success: true, message: "Expense deleted successfully" },
      { status: 200 },
    );
  });
}
