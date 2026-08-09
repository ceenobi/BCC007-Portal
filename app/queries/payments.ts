import {
  getGroupPaymentReports,
  getGroupPayments,
  getUserPaymentReports,
  getUserPayments,
} from "~/.server/actions/payment";
import type { PaymentData, UsePaginateProps } from "~/types";

export type PaymentQueryResult = {
  payments: PaymentData[];
  meta: UsePaginateProps;
};

export type PaymentStats = {
  yearlyDues: number;
  totalPaidThisYear: number;
  monthsPaid: number;
  expectedMonths: number;
  paidMonths: string[];
  paymentPercentage: number;
  isUpToDate: boolean;
  cycleStart: string | null;
  cycleEnd: string | null;
  lastMonthlyDuesPaid: string | null;
};

export type PaymentReportData = {
  stats: {
    totalRevenue: number;
    totalCount: number;
    completedRevenue: number;
    completedCount: number;
    pendingRevenue: number;
    pendingCount: number;
  };
  typeBreakdown: Array<{
    _id: string;
    revenue: number;
    count: number;
  }>;
  trends: Array<{
    date: string;
    revenue: number;
    count: number;
  }>;
  monthlyBreakdown: Array<{
    _id: string;
    month: string;
    total: number;
    count: number;
  }>;
  monthlySummary: {
    year: number;
    total: number;
  };
  paymentStats: PaymentStats;
};

export const getUserPaymentsQuery = (request: Request) => {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page")) || 1;
  const limit = Number(url.searchParams.get("limit")) || 10;
  const query = url.searchParams.get("query") || undefined;
  const paymentStatus = url.searchParams.get("paymentStatus") || undefined;
  const paymentType = url.searchParams.get("paymentType") || undefined;
  const startDate = url.searchParams.get("startDate") || undefined;
  const endDate = url.searchParams.get("endDate") || undefined;
  return {
    queryKey: [
      "payments_user",
      page,
      limit,
      query,
      paymentStatus,
      paymentType,
      startDate,
      endDate,
    ],
    queryFn: async () => {
      const response = await getUserPayments({
        request,
        page,
        limit,
        query,
        paymentStatus,
        paymentType,
        startDate,
        endDate,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch payments");
      }
      const data = await response.json();
      return data.body as PaymentQueryResult;
    },
  };
};

export const getGroupPaymentsQuery = (request: Request) => {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page")) || 1;
  const limit = Number(url.searchParams.get("limit")) || 10;
  const query = url.searchParams.get("query") || undefined;
  const paymentStatus = url.searchParams.get("paymentStatus") || undefined;
  const paymentType = url.searchParams.get("paymentType") || undefined;
  const startDate = url.searchParams.get("startDate") || undefined;
  const endDate = url.searchParams.get("endDate") || undefined;
  return {
    queryKey: [
      "payments_group",
      page,
      limit,
      query,
      paymentStatus,
      paymentType,
      startDate,
      endDate,
    ],
    queryFn: async () => {
      const response = await getGroupPayments({
        request,
        page,
        limit,
        query,
        paymentStatus,
        paymentType,
        startDate,
        endDate,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch payments");
      }
      const data = await response.json();
      return data.body as PaymentQueryResult;
    },
  };
};

export const getUserPaymentReportsQuery = (request: Request) => {
  const url = new URL(request.url);
  const period = url.searchParams.get("period") || undefined;
  const paymentStatus = url.searchParams.get("paymentStatus") || undefined;
  const paymentType = url.searchParams.get("paymentType") || undefined;
  return {
    queryKey: [
      "payments_user_reports",
      period,
      paymentStatus,
      paymentType,
    ],
    queryFn: async () => {
      const response = await getUserPaymentReports({
        request,
        period,
        paymentStatus,
        paymentType,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch reports");
      }
      const data = await response.json();
      return data.body as PaymentReportData;
    },
  };
};

export const getGroupPaymentReportsQuery = (request: Request) => {
  const url = new URL(request.url);
  const period = url.searchParams.get("period") || undefined;
  const paymentStatus = url.searchParams.get("paymentStatus") || undefined;
  const paymentType = url.searchParams.get("paymentType") || undefined;
  return {
    queryKey: [
      "payments_group_reports",
      period,
      paymentStatus,
      paymentType,
    ],
    queryFn: async () => {
      const response = await getGroupPaymentReports({
        request,
        period,
        paymentStatus,
        paymentType,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch reports");
      }
      const data = await response.json();
      return data.body as PaymentReportData;
    },
  };
};
