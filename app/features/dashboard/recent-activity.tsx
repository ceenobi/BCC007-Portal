import { RiArrowRightUpLine, RiShieldCheckLine } from "@remixicon/react";
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
import { auditCategoryConfig } from "~/lib/constants";
import type { AuditLogData } from "~/types";

type RecentActivityProps = {
  logs: AuditLogData[];
  className?: string;
};

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (!Number.isFinite(seconds) || seconds < 0) return "just now";
  const units: Array<[number, string]> = [
    [60, "s"],
    [60, "m"],
    [24, "h"],
    [7, "d"],
    [30, "w"],
  ];
  let value = seconds;
  let unit = "s";
  for (const [next, label] of units) {
    if (value < next) {
      unit = label;
      break;
    }
    value = Math.floor(value / next);
    unit = label;
  }
  return `${value}${unit} ago`;
}

export default function RecentActivity({
  logs,
  className,
}: RecentActivityProps) {
  return (
    <Card className={cn("animate-in fade-in slide-in-from-bottom-3", className)}>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-sm">Recent Activity</CardTitle>
        <CardAction>
          <Link
            to="/dashboard/settings/audit"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            View all
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-1">
        {logs.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No recent activity
          </p>
        ) : (
          logs.map((log) => {
            const config = auditCategoryConfig[log.category] ?? auditCategoryConfig.auth;
            return (
              <div
                key={log._id}
                className="flex items-start gap-3 rounded-lg p-2"
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                    config.className,
                  )}
                >
                  <RiShieldCheckLine className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <p className="text-sm font-medium capitalize text-foreground">
                    {log.action.replace(/_/g, " ").toLowerCase()}
                  </p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {log.description || log.userName || "—"}
                  </p>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(log.createdAt)}
                  </span>
                  <RiArrowRightUpLine
                    className="size-3.5 text-muted-foreground/60"
                    aria-hidden="true"
                  />
                </span>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
