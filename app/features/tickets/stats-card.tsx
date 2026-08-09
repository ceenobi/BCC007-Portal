import {
  RiCheckboxCircleLine,
  RiListCheck3,
  RiRecordCircleLine,
  RiTicket2Line,
} from "@remixicon/react";
import { Card, CardContent } from "~/components/ui/card";
import { cn } from "~/lib/utils";
import type { TicketsQueryResult } from "~/queries/tickets";

type StatsCardProps = {
  summary: TicketsQueryResult["summary"];
};

export default function StatsCard({ summary }: StatsCardProps) {
  const cards = [
    {
      label: "Total Tickets",
      value: summary.totalTickets ?? 0,
      icon: RiTicket2Line,
      iconClassName:
        "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    },
    {
      label: "Open",
      value: summary.openTickets ?? 0,
      icon: RiRecordCircleLine,
      iconClassName: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
    {
      label: "In Progress",
      value: summary.inProgressTickets ?? 0,
      icon: RiListCheck3,
      iconClassName:
        "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    },
    {
      label: "Resolved",
      value: summary.resolvedTickets ?? 0,
      icon: RiCheckboxCircleLine,
      iconClassName:
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
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
              <p className="text-xs text-muted-foreground">
                {card.value === 1 ? "ticket" : "tickets"}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}