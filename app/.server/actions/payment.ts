import mongoose from "mongoose";
import z from "zod";
import {
    cancelSubscriptionSchema,
    initializePaymentSchema,
    verifyPaymentSchema,
} from "~/lib/schema";
import { tryCatchWrapper } from "~/lib/tryCatchWrapper";
import { hasPermission } from "~/lib/rbac";
import type {
  CancelSubscriptionSchemaType,
  InitializePaymentSchemaType,
  VerifyPaymentSchemaType,
} from "~/types";
import logger from "../config/logger";
import Payment from "../models/payment";
import User from "../models/user";
import { AuditLogService } from "../services/auditlog-service";
import { auth } from "../services/better-auth";
import {
  MEMBERSHIP_DUES_AMOUNT,
  PaystackService,
} from "../services/paystack.service";
import { fetchWithCache, invalidateCache } from "../utils/cache";
import { checkRateLimit } from "../utils/rate-limit";
import { escapeRegex, REPORT_PERIODS, toEndOfDay, toStartOfDay } from "~/lib/utils";

const PAYMENT_STATUSES = [
  "pending",
  "completed",
  "failed",
  "cancelled",
] as const;
const PAYMENT_TYPES = ["donation", "event", "membership_dues"] as const;
// const REPORT_PERIODS = ["all", "1w", "1m", "6m", "1y"] as const;
// const isDateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
// const toStartOfDay = (value: string) =>
//   isDateOnly(value) ? new Date(`${value}T00:00:00.000Z`) : new Date(value);
// const toEndOfDay = (value: string) =>
//   isDateOnly(value) ? new Date(`${value}T23:59:59.999Z`) : new Date(value);
// const escapeRegex = (value: string) =>
//   value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ── Shared aggregation helpers ──────────────────────────────────────────

interface MatchStageInput {
  period?: string;
  paymentStatus?: string;
  paymentType?: string;
  userId?: string;
}

/**
 * Resolves a report period into a `{ start, end }` window.
 * `"all"` and any unknown/undefined period fall back to a rolling 12-month
 * window ending now.
 */
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
  const { period, paymentStatus, paymentType, userId } = input;
  const matchStage: any = {};

  if (userId) matchStage.userId = new mongoose.Types.ObjectId(userId);
  if (paymentStatus) matchStage.paymentStatus = paymentStatus;
  if (paymentType) matchStage.paymentType = paymentType;

  if (period && period !== "all") {
    const { start } = getPeriodRange(period);
    matchStage.createdAt = { $gte: start };
  }

  const dateFormat = period === "1w" || period === "1m" ? "%Y-%m-%d" : "%Y-%m";
  return { matchStage, dateFormat };
}

function extractStatsFromFacet(result: any) {
  return {
    totalRevenue: result.statsTotals[0]?.totalRevenue || 0,
    totalCount: result.statsTotals[0]?.totalCount || 0,
    completedRevenue: result.statsCompleted[0]?.completedRevenue || 0,
    completedCount: result.statsCompleted[0]?.completedCount || 0,
    pendingRevenue: result.statsPending[0]?.pendingRevenue || 0,
    pendingCount: result.statsPending[0]?.pendingCount || 0,
  };
}

async function runFacetAggregation(matchStage: any, dateFormat: string) {
  return Payment.aggregate([
    { $match: matchStage },
    {
      $facet: {
        statsTotals: [
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$amount" },
              totalCount: { $sum: 1 },
            },
          },
        ],
        statsCompleted: [
          { $match: { paymentStatus: "completed" } },
          {
            $group: {
              _id: null,
              completedRevenue: { $sum: "$amount" },
              completedCount: { $sum: 1 },
            },
          },
        ],
        statsPending: [
          { $match: { paymentStatus: "pending" } },
          {
            $group: {
              _id: null,
              pendingRevenue: { $sum: "$amount" },
              pendingCount: { $sum: 1 },
            },
          },
        ],
        typeBreakdown: [
          {
            $group: {
              _id: "$paymentType",
              revenue: { $sum: "$amount" },
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
              revenue: { $sum: "$amount" },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, date: "$_id", revenue: 1, count: 1 } },
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

  const paymentsByMonth = await Payment.aggregate([
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
    const fromDb = paymentsByMonth.find((p: any) => p._id === m._id);
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

async function buildMembershipDuesStats(
  userId?: string,
  memberCount = 1,
  onboardedUserIds?: string[],
) {
  const range = getPeriodRange("all");
  const match: any = {
    paymentType: "membership_dues",
    paymentStatus: "completed",
    createdAt: { $gte: range.start, $lte: range.end },
  };
  if (userId) match.userId = new mongoose.Types.ObjectId(userId);

  const [agg] = await Promise.all([
    Payment.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalPaid: { $sum: "$amount" },
          monthsPaidSet: {
            $addToSet: {
              $dateToString: { format: "%Y-%m", date: "$createdAt" },
            },
          },
          lastPayment: { $max: "$createdAt" },
        },
      },
    ]),
  ]);

  const paidMonths: string[] = (agg[0]?.monthsPaidSet as string[]) || [];
  const monthsPaid = paidMonths.length;
  const expectedMonths = 12;
  const totalPaidThisYear = agg[0]?.totalPaid || 0;
  const lastMonthlyDuesPaid: Date | null = agg[0]?.lastPayment || null;

  const paymentPercentage = Math.min(
    100,
    Math.round((monthsPaid / expectedMonths) * 100),
  );
  const currentMonthKey = `${range.end.getFullYear()}-${String(
    range.end.getMonth() + 1,
  ).padStart(2, "0")}`;

  let isUpToDate: boolean;
  if (userId) {
    isUpToDate = paidMonths.includes(currentMonthKey);
  } else if (onboardedUserIds && onboardedUserIds.length > 0) {
    const currentMonthStart = new Date(
      range.end.getFullYear(),
      range.end.getMonth(),
      1,
    );
    const paidThisMonth = await Payment.distinct("userId", {
      paymentType: "membership_dues",
      paymentStatus: "completed",
      createdAt: { $gte: currentMonthStart, $lte: range.end },
      userId: {
        $in: onboardedUserIds.map((id) => new mongoose.Types.ObjectId(id)),
      },
    });
    isUpToDate = paidThisMonth.length >= onboardedUserIds.length;
  } else {
    isUpToDate = false;
  }

  return {
    yearlyDues: memberCount * expectedMonths * MEMBERSHIP_DUES_AMOUNT,
    totalPaidThisYear,
    monthsPaid,
    expectedMonths,
    paidMonths,
    paymentPercentage,
    isUpToDate,
    cycleStart: range.start,
    cycleEnd: range.end,
    lastMonthlyDuesPaid,
  };
}

// ── Actions ──────────────────────────────────────────────────────────────

export async function initializePayment(
  request: Request,
  payload: InitializePaymentSchemaType,
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
    const result = initializePaymentSchema.safeParse(payload);
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

    const response = await PaystackService.initializePayment(
      result.data,
      session.user,
    );

    await AuditLogService.record(request, {
      action: "PAYMENT_INITIATED",
      category: "payment",
      description: `Initialized ${result.data.paymentType} payment of ₦${result.data.amount}`,
      details: {
        paymentType: result.data.paymentType,
        amount: result.data.amount,
        isRecurring: result.data.isRecurring ?? false,
        reference: response.data.reference,
      },
    });

    return Response.json(
      {
        success: true,
        message: "Payment initialized successfully",
        body: response.data,
      },
      { status: 200 },
    );
  });
}

export async function verifyPayment(
  request: Request,
  payload: VerifyPaymentSchemaType,
) {
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
    const result = verifyPaymentSchema.safeParse(payload);
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

    const response = await PaystackService.verifyPayment(
      result.data,
      session.user,
    );

    await AuditLogService.record(request, {
      action: "PAYMENT_SUCCESS",
      category: "payment",
      description: `Verified payment ${result.data.reference}`,
      details: {
        reference: result.data.reference,
        amount: response.data?.amount ?? null,
      },
    });

    await invalidateCache(`payments:user:${session.user.id}`);

    return Response.json(
      {
        success: true,
        message: "Payment verified successfully",
        body: response.data,
      },
      { status: 200 },
    );
  });
}

export async function cancelSubscription(
  request: Request,
  payload: CancelSubscriptionSchemaType,
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
    const result = cancelSubscriptionSchema.safeParse(payload);
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

    const response = await PaystackService.cancelSubscription(
      session.user,
      result.data.code,
      result.data.token,
      result.data.reference,
    );

    await AuditLogService.record(request, {
      action: "SUBSCRIPTION_CHANGE",
      category: "payment",
      description: "Cancelled recurring membership subscription",
      details: {
        reference: result.data.reference ?? null,
        subscriptionCode: result.data.code || null,
      },
    });

    return Response.json(
      {
        success: true,
        message: "Subscription cancelled successfully",
        body: response,
      },
      { status: 200 },
    );
  });
}

export async function getUserSubscription(request: Request) {
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
    const sub = await Payment.findOne({
      userId: session.user.id,
      paymentType: "membership_dues",
      $or: [
        { subscriptionStatus: "active", isRecurring: true },
        { isRecurring: true, subscriptionStatus: { $exists: false } },
      ],
    })
      .select(
        "reference paystackSubscriptionId paystackEmailToken nextPaymentDate lastPaymentDate amount subscriptionStatus isRecurring",
      )
      .lean();
    return Response.json({
      success: true,
      message: "Subscription fetched successfully",
      body: sub ?? null,
    });
  });
}

export async function getUserPayments({
  request,
  page,
  limit,
  query,
  paymentStatus,
  paymentType,
  startDate,
  endDate,
}: {
  request: Request;
  page: number;
  limit: number;
  query: string | undefined;
  paymentStatus: string | undefined;
  paymentType: string | undefined;
  startDate: string | undefined;
  endDate: string | undefined;
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
      paymentStatus &&
      !(PAYMENT_STATUSES as readonly string[]).includes(paymentStatus)
    ) {
      logger.error("Invalid status filter");
      return Response.json(
        { success: false, message: "Invalid status filter" },
        { status: 400 },
      );
    }
    if (
      paymentType &&
      !(PAYMENT_TYPES as readonly string[]).includes(paymentType)
    ) {
      logger.error("Invalid event type filter");
      return Response.json(
        { success: false, message: "Invalid event type filter" },
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
    const cacheKey = `payments:user:${session.user.id}:p${page}:l${limit}:q${query ?? ""}:paymentStatus${paymentStatus ?? ""}:paymentType${paymentType ?? ""}:startDate${startDate ?? ""}:endDate${endDate ?? ""}`;
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
      if (query) matchStage.reference = query;
      if (paymentStatus) matchStage.paymentStatus = paymentStatus;
      if (paymentType) matchStage.paymentType = paymentType;
      const payments = await Payment.find(matchStage)
        .populate("userId", "name email image")
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean();
      const total = await Payment.countDocuments(matchStage);
      return {
        payments,
        meta: {
          currentPage: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
          hasMore: (page - 1) * limit + payments.length < total,
        },
      };
    });
    return Response.json({
      success: true,
      message: "Payments fetched successfully",
      body,
    });
  });
}

export async function getGroupPayments({
  request,
  page,
  limit,
  query,
  paymentStatus,
  paymentType,
  startDate,
  endDate,
}: {
  request: Request;
  page: number;
  limit: number;
  query: string | undefined;
  paymentStatus: string | undefined;
  paymentType: string | undefined;
  startDate: string | undefined;
  endDate: string | undefined;
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
      paymentStatus &&
      !(PAYMENT_STATUSES as readonly string[]).includes(paymentStatus)
    ) {
      logger.error("Invalid status filter");
      return Response.json(
        { success: false, message: "Invalid status filter" },
        { status: 400 },
      );
    }
    if (
      paymentType &&
      !(PAYMENT_TYPES as readonly string[]).includes(paymentType)
    ) {
      logger.error("Invalid event type filter");
      return Response.json(
        { success: false, message: "Invalid event type filter" },
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
    const cacheKey = `payments:group:p${page}:l${limit}:q${query ?? ""}:paymentStatus${paymentStatus ?? ""}:paymentType${paymentType ?? ""}:startDate${startDate ?? ""}:endDate${endDate ?? ""}`;
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
      if (paymentStatus) matchStage.paymentStatus = paymentStatus;
      if (paymentType) matchStage.paymentType = paymentType;
      const payments = await Payment.find(matchStage)
        .populate("userId", "name email image")
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean();
      const total = await Payment.countDocuments(matchStage);
      return {
        payments,
        meta: {
          currentPage: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
          hasMore: (page - 1) * limit + payments.length < total,
        },
      };
    });
    return Response.json({
      success: true,
      message: "Group Payments fetched successfully",
      body,
    });
  });
}

export async function getGroupPaymentReports({
  request,
  period,
  paymentStatus,
  paymentType,
}: {
  request: Request;
  period: string | undefined;
  paymentStatus: string | undefined;
  paymentType: string | undefined;
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
      paymentStatus &&
      !(PAYMENT_STATUSES as readonly string[]).includes(paymentStatus)
    ) {
      return Response.json(
        {
          success: false,
          message: `Invalid paymentStatus '${paymentStatus}'. Allowed values: ${PAYMENT_STATUSES.join(", ")}`,
        },
        { status: 400 },
      );
    }
    if (
      paymentType &&
      !(PAYMENT_TYPES as readonly string[]).includes(paymentType)
    ) {
      return Response.json(
        {
          success: false,
          message: `Invalid paymentType '${paymentType}'. Allowed values: ${PAYMENT_TYPES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const cacheKey = `payments:group:reports:period:${period ?? "all"}:status:${paymentStatus ?? ""}:type:${paymentType ?? ""}`;
    const body = await fetchWithCache(cacheKey, 3600, async () => {
      const range = getPeriodRange(period);
      const { matchStage, dateFormat } = buildMatchStageAndDateFormat({
        period,
        paymentStatus,
        paymentType,
      });

      const aggregateResult = await runFacetAggregation(
        matchStage,
        dateFormat,
      );
      const result = aggregateResult[0];
      const stats = extractStatsFromFacet(result);

      const [monthlyResult, paymentStats] = await Promise.all([
        buildMonthlyBreakdown(
          {
            ...(paymentStatus && { paymentStatus }),
            ...(paymentType && { paymentType }),
          },
          range,
        ),
        (async () => {
          const onboardedMembers = await User.find({ isOnboarded: true })
            .select("_id")
            .lean();
          const onboardedIds = onboardedMembers.map((m) =>
            String(m._id),
          );
          return buildMembershipDuesStats(
            undefined,
            onboardedIds.length,
            onboardedIds,
          );
        })(),
      ]);
      const { monthlyBreakdown, monthlySummary } = monthlyResult;

      return {
        stats,
        typeBreakdown: result.typeBreakdown,
        trends: result.trends,
        monthlyBreakdown,
        monthlySummary,
        paymentStats,
      };
    });

    return Response.json({
      success: true,
      message: "Payment reports fetched successfully",
      body,
    });
  });
}

export async function getUserPaymentReports({
  request,
  period,
  paymentStatus,
  paymentType,
}: {
  request: Request;
  period: string | undefined;
  paymentStatus: string | undefined;
  paymentType: string | undefined;
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
      paymentStatus &&
      !(PAYMENT_STATUSES as readonly string[]).includes(paymentStatus)
    ) {
      return Response.json(
        {
          success: false,
          message: `Invalid paymentStatus '${paymentStatus}'. Allowed values: ${PAYMENT_STATUSES.join(", ")}`,
        },
        { status: 400 },
      );
    }
    if (
      paymentType &&
      !(PAYMENT_TYPES as readonly string[]).includes(paymentType)
    ) {
      return Response.json(
        {
          success: false,
          message: `Invalid paymentType '${paymentType}'. Allowed values: ${PAYMENT_TYPES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const cacheKey = `payments:user:${session.user.id}:reports:period:${period ?? "all"}:status:${paymentStatus ?? ""}:type:${paymentType ?? ""}`;
    const body = await fetchWithCache(cacheKey, 3600, async () => {
      const range = getPeriodRange(period);
      const { matchStage, dateFormat } = buildMatchStageAndDateFormat({
        period,
        paymentStatus,
        paymentType,
        userId: session.user.id,
      });

      const aggregateResult = await runFacetAggregation(
        matchStage,
        dateFormat,
      );
      const result = aggregateResult[0];
      const stats = extractStatsFromFacet(result);

      const { monthlyBreakdown, monthlySummary } = await buildMonthlyBreakdown(
        {
          userId: new mongoose.Types.ObjectId(session.user.id),
          ...(paymentStatus && { paymentStatus }),
          ...(paymentType && { paymentType }),
        },
        range,
      );
      const paymentStats = await buildMembershipDuesStats(session.user.id);

      return {
        stats,
        typeBreakdown: result.typeBreakdown,
        trends: result.trends,
        monthlyBreakdown,
        monthlySummary,
        paymentStats,
      };
    });

    return Response.json({
      success: true,
      message: "Payment reports fetched successfully",
      body,
    });
  });
}

