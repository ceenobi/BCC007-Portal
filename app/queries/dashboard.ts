import { getDashboardData } from "~/.server/actions/dashboard";
import type { AuditLogData, EventData, TicketData } from "~/types";
import type { PaymentReportData } from "./payments";

export type UpcomingBirthday = {
  _id: string;
  name: string;
  image?: string;
  nextBirthday: string;
  daysUntil: number;
  ageAtNext: number;
};

export type MyTicketSummary = {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
};

export type OrgTicketSummary = {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
};

export type DashboardData = {
  revenue1m: PaymentReportData | null;
  revenueAll: PaymentReportData | null;
  upcomingEvents: EventData[];
  balance: {
    total: number;
    pending: number;
    balance: number;
    currency: string;
  } | null;
  orgTickets: {
    tickets: TicketData[];
    summary: Partial<OrgTicketSummary>;
  } | null;
  myTickets: MyTicketSummary | null;
  membersCount: number | null;
  recentActivity: AuditLogData[];
  upcomingBirthdays: UpcomingBirthday[];
};

export const getDashboardQuery = (request: Request) => ({
  queryKey: ["dashboard"],
  queryFn: async () => {
    const response = await getDashboardData(request);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to fetch dashboard");
    }
    const data = await response.json();
    return data.body as DashboardData;
  },
});
