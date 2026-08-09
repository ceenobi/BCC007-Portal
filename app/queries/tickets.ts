import { fetchTickets } from "~/.server/actions/ticket";
import type { TicketData, UsePaginateProps } from "~/types";

export type TicketsQueryResult = {
  tickets: TicketData[];
  summary: {
    totalTickets?: number;
    openTickets: number;
    inProgressTickets: number;
    resolvedTickets: number;
    closedTickets?: number;
  };
  meta: UsePaginateProps;
};

export const getTicketsQuery = (request: Request) => {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page")) || 1;
  const limit = Number(url.searchParams.get("limit")) || 20;
  const query = url.searchParams.get("query") || undefined;
  const status = url.searchParams.get("status") as
    | "open"
    | "in-progress"
    | "resolved"
    | "closed"
    | undefined;
  const priority = url.searchParams.get("priority") as
    | "low"
    | "medium"
    | "high"
    | "critical"
    | undefined;
  const category = url.searchParams.get("category") as
    | "account"
    | "payment"
    | "security"
    | "other"
    | undefined;

  return {
    queryKey: ["tickets", page, limit, query, status, priority, category],
    queryFn: async () => {
      const response = await fetchTickets({
        request,
        page,
        limit,
        query,
        status,
        priority,
        category,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch tickets");
      }
      const data = await response.json();
      return data.body as TicketsQueryResult;
    },
  };
};