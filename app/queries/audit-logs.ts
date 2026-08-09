import { fetchUserAuditLogs, fetchAllAuditLogs } from "~/.server/actions/audit-logs";
import type { AuditLogData, UsePaginateProps } from "~/types";

export type AuditLogsQueryResult = {
  logs: AuditLogData[];
  meta: UsePaginateProps;
};

export const getUserAuditLogsQuery = (request: Request) => {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page")) || 1;
  const limit = Number(url.searchParams.get("limit")) || 20;
  const category = url.searchParams.get("category") || "all";
  return {
    queryKey: ["auditLogs", page, limit, category],
    queryFn: async () => {
      const response = await fetchUserAuditLogs({
        request,
        page,
        limit,
        category,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch audit logs");
      }
      const data = await response.json();
      return data.body as AuditLogsQueryResult;
    },
  };
};

export const getAllAuditLogsQuery = (request: Request) => {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page")) || 1;
  const limit = Number(url.searchParams.get("limit")) || 20;
  const category = url.searchParams.get("category") || "all";
  return {
    queryKey: ["auditLogs-general", page, limit, category],
    queryFn: async () => {
      const response = await fetchAllAuditLogs({
        request,
        page,
        limit,
        category,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch audit logs");
      }
      const data = await response.json();
      return data.body as AuditLogsQueryResult;
    },
  };
};