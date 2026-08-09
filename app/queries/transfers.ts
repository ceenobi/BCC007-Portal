import {
  getAllTransfers,
  getGroupTransferReports,
  getUserTransferReports,
  getUserTransfers,
} from "~/.server/actions/transfer";
import type { TransferData, UsePaginateProps } from "~/types";

export type TransferQueryResult = {
  transfers: TransferData[];
  meta: UsePaginateProps;
};

export type TransferReportData = {
  stats: {
    totalSent: number;
    totalCount: number;
    successSent: number;
    successCount: number;
    pendingSent: number;
    pendingCount: number;
  };
  statusBreakdown: Array<{
    _id: string;
    sent: number;
    count: number;
  }>;
  trends: Array<{
    date: string;
    sent: number;
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
};

export const getUserTransfersQuery = (request: Request) => {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page")) || 1;
  const limit = Number(url.searchParams.get("limit")) || 10;
  const transferStatus = url.searchParams.get("transferStatus") || undefined;
  const startDate = url.searchParams.get("startDate") || undefined;
  const endDate = url.searchParams.get("endDate") || undefined;
  return {
    queryKey: [
      "transfers_user",
      page,
      limit,
      transferStatus,
      startDate,
      endDate,
    ],
    queryFn: async () => {
      const response = await getUserTransfers({
        request,
        page,
        limit,
        transferStatus,
        startDate,
        endDate,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch transfers");
      }
      const data = await response.json();
      return data.body as TransferQueryResult;
    },
  };
};


export const getGroupTransfersQuery = (request: Request) => {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page")) || 1;
  const limit = Number(url.searchParams.get("limit")) || 10;
  const query = url.searchParams.get("query") || undefined;
  const transferStatus = url.searchParams.get("transferStatus") || undefined;
  const startDate = url.searchParams.get("startDate") || undefined;
  const endDate = url.searchParams.get("endDate") || undefined;
  return {
    queryKey: [
      "transfers_group",
      page,
      limit,
      query,
      transferStatus,
      startDate,
      endDate,
    ],
    queryFn: async () => {
      const response = await getAllTransfers({
        request,
        page,
        limit,
        query,
        transferStatus,
        startDate,
        endDate,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch transfers");
      }
      const data = await response.json();
      return data.body as TransferQueryResult;
    },
  };
};

export const getUserTransferReportsQuery = (request: Request) => {
  const url = new URL(request.url);
  const period = url.searchParams.get("period") || undefined;
  const transferStatus = url.searchParams.get("transferStatus") || undefined;
  return {
    queryKey: [
      "transfers_user_reports",
      period,
      transferStatus,
    ],
    queryFn: async () => {
      const response = await getUserTransferReports({
        request,
        period,
        transferStatus,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch reports");
      }
      const data = await response.json();
      return data.body as TransferReportData;
    },
  };
};

export const getGroupTransferReportsQuery = (request: Request) => {
  const url = new URL(request.url);
  const period = url.searchParams.get("period") || undefined;
  const transferStatus = url.searchParams.get("transferStatus") || undefined;
  return {
    queryKey: [
      "transfers_group_reports",
      period,
      transferStatus,
    ],
    queryFn: async () => {
      const response = await getGroupTransferReports({
        request,
        period,
        transferStatus,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch reports");
      }
      const data = await response.json();
      return data.body as TransferReportData;
    },
  };
};
