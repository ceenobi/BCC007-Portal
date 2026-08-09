import {
  RiCloseCircleLine,
  RiProgress5Line,
  RiTicket2Line,
  RiTimeLine,
} from "@remixicon/react";
import { Link } from "react-router";
import { cn } from "~/lib/utils";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { buttonVariants } from "~/components/ui/button";
import type { MyTicketSummary, OrgTicketSummary } from "~/queries/dashboard";

type TicketSummaryCardProps = {
  orgTickets: {
    tickets: { _id: string }[];
    summary: Partial<OrgTicketSummary>;
  } | null;
  myTickets: MyTicketSummary | null;
  className?: string;
};

function TicketRows({
  title,
  summary,
  totalLabel,
}: {
  title: string;
  summary: Partial<OrgTicketSummary>;
  totalLabel: string;
}) {
  const rows = [
    {
      label: "Open",
      value: summary.openTickets ?? 0,
      icon: RiTimeLine,
      className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
    {
      label: "In progress",
      value: summary.inProgressTickets ?? 0,
      icon: RiProgress5Line,
      className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    {
      label: "Closed",
      value: summary.closedTickets ?? 0,
      icon: RiCloseCircleLine,
      className: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
    },
  ];

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <div className="grid grid-cols-3 gap-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="space-y-1.5 rounded-lg bg-muted/40 p-2.5"
          >
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-md",
                row.className,
              )}
            >
              <row.icon className="size-3.5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-base font-semibold leading-tight tracking-tight text-foreground">
                {row.value}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {row.label}
              </p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{totalLabel}</p>
    </div>
  );
}

export default function TicketSummaryCard({
  orgTickets,
  myTickets,
  className,
}: TicketSummaryCardProps) {
  return (
    <Card
      className={cn("animate-in fade-in slide-in-from-bottom-3", className)}
    >
      <CardHeader>
        <CardTitle className="text-sm">Support Tickets</CardTitle>
        <CardAction>
          <Link
            to="/dashboard/help-center"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <RiTicket2Line className="size-3.5" aria-hidden="true" />
            View
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-5">
        {orgTickets && (
          <TicketRows
            title="Organization"
            summary={orgTickets.summary}
            totalLabel={`${orgTickets.summary.totalTickets ?? 0} total tickets`}
          />
        )}
        {myTickets && (
          <TicketRows
            title="My tickets"
            summary={{
              totalTickets: myTickets.total,
              openTickets: myTickets.open,
              inProgressTickets: myTickets.inProgress,
              resolvedTickets: myTickets.resolved,
              closedTickets: myTickets.closed,
            }}
            totalLabel={`${myTickets.total} total · ${myTickets.resolved} resolved`}
          />
        )}
      </CardContent>
    </Card>
  );
}
