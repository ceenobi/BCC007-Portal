import {
  RiCheckboxCircleLine,
  RiGroupLine,
  RiTicket2Line,
  RiWallet3Line,
} from "@remixicon/react";
import type { PaymentReportData } from "~/queries/payments";
import type { MyTicketSummary } from "~/queries/dashboard";
import { cn, formatMoney } from "~/lib/utils";
import { Card, CardContent } from "~/components/ui/card";

type RevenueStatsCardsProps = {
  revenue1m: PaymentReportData | null;
  revenueAll: PaymentReportData | null;
  membersCount: number | null;
  myTickets: MyTicketSummary | null;
};

export default function RevenueStatsCards({
  revenue1m,
  revenueAll,
  membersCount,
  myTickets,
}: RevenueStatsCardsProps) {
  const revenue30d = revenue1m?.stats;
  const revenueTotal = revenueAll?.stats;

  const cards = [
    {
      label: "Revenue (30 days)",
      value: revenue30d ? formatMoney(revenue30d.totalRevenue) : "—",
      sub: revenue30d
        ? `${revenue30d.totalCount} payment${revenue30d.totalCount === 1 ? "" : "s"}`
        : "No data yet",
      icon: RiWallet3Line,
      iconClassName: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
    {
      label: "Total Revenue",
      value: revenueTotal ? formatMoney(revenueTotal.totalRevenue) : "—",
      sub: revenueTotal
        ? `${revenueTotal.completedCount} completed`
        : "No data yet",
      icon: RiCheckboxCircleLine,
      iconClassName: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Members",
      value: membersCount != null ? String(membersCount) : "—",
      sub: membersCount != null ? "onboarded members" : "View only",
      icon: RiGroupLine,
      iconClassName: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    },
    {
      label: "My Tickets",
      value: myTickets ? String(myTickets.total) : "—",
      sub: myTickets ? `${myTickets.open} open · ${myTickets.inProgress} in progress` : "No data yet",
      icon: RiTicket2Line,
      iconClassName: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card
          key={card.label}
          size="sm"
          className="animate-in fade-in slide-in-from-bottom-3"
        >
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-muted-foreground">
                {card.label}
              </span>
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-md",
                  card.iconClassName,
                )}
              >
                <card.icon className="size-4" aria-hidden="true" />
              </span>
            </div>
            <div className="space-y-0.5">
              <p className="text-2xl font-semibold tracking-tight text-foreground">
                {card.value}
              </p>
              <p className="text-xs text-muted-foreground">{card.sub}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
