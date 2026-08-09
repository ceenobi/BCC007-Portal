import {
  RiCheckboxCircleLine,
  RiExchangeFundsLine,
  RiSendPlaneLine,
  RiTimeLine,
} from "@remixicon/react";
import type { TransferReportData } from "~/queries/transfers";
import { cn, formatMoney } from "~/lib/utils";
import { Card, CardContent } from "~/components/ui/card";

type TransferStatsCardsProps = {
  stats: TransferReportData["stats"];
};

export default function TransferStatsCards({
  stats,
}: TransferStatsCardsProps) {
  const cards = [
    {
      label: "Total Sent",
      value: formatMoney(stats.totalSent),
      sub: `${stats.totalCount} transfer${stats.totalCount === 1 ? "" : "s"}`,
      icon: RiSendPlaneLine,
      iconClassName:
        "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
    {
      label: "Successful",
      value: formatMoney(stats.successSent),
      sub: `${stats.successCount} successful`,
      icon: RiCheckboxCircleLine,
      iconClassName:
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Pending",
      value: formatMoney(stats.pendingSent),
      sub: `${stats.pendingCount} pending`,
      icon: RiTimeLine,
      iconClassName:
        "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    },
    {
      label: "Total Transfers",
      value: String(stats.totalCount),
      sub: `${formatMoney(stats.totalSent)} sent`,
      icon: RiExchangeFundsLine,
      iconClassName:
        "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} size="sm" className="animate-in fade-in slide-in-from-bottom-3">
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