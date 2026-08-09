import {
  RiArrowRightUpLine,
  RiCalendarCheckLine,
  RiExchangeFundsLine,
  RiGroupLine,
  RiLineChartLine,
  RiWallet3Line,
} from "@remixicon/react";
import { Link } from "react-router";
import { cn } from "~/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

const actions = [
  {
    label: "Make payment",
    to: "/dashboard/payments",
    icon: RiWallet3Line,
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    label: "Send transfer",
    to: "/dashboard/transfers",
    icon: RiExchangeFundsLine,
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    label: "View events",
    to: "/dashboard/events",
    icon: RiCalendarCheckLine,
    className: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
  {
    label: "Members",
    to: "/dashboard/members",
    icon: RiGroupLine,
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  {
    label: "Reports",
    to: "/dashboard/payments/reports",
    icon: RiLineChartLine,
    className: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
];

export default function QuickActions({ className }: { className?: string }) {
  return (
    <Card
      data-tour="quick-actions"
      className={cn("animate-in fade-in slide-in-from-bottom-3", className)}
    >
      <CardHeader>
        <CardTitle className="text-sm">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {actions.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="group flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 transition-colors hover:bg-muted/60"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-md",
                    action.className,
                  )}
                >
                  <action.icon className="size-4" aria-hidden="true" />
                </span>
                <span className="truncate text-sm font-medium text-foreground">
                  {action.label}
                </span>
              </span>
              <RiArrowRightUpLine
                className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
