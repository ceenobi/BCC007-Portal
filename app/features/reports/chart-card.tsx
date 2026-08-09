import type { ReactNode } from "react";
import { cn } from "~/lib/utils";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export function ChartCard({
  title,
  description,
  children,
  className,
  action,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <Card
      className={cn("animate-in fade-in slide-in-from-bottom-3", className)}
    >
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
        {description && (
          <CardDescription className="text-xs">{description}</CardDescription>
        )}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function ChartTooltipBox({
  label,
  rows,
}: {
  label?: string;
  rows: Array<{ name: string; value: string; color?: string }>;
}) {
  return (
    <div className="rounded-lg bg-popover p-3 text-xs shadow-md ring-1 ring-border">
      {label && (
        <p className="mb-1.5 font-medium text-foreground">{label}</p>
      )}
      <div className="space-y-1">
        {rows.map((row) => (
          <div
            key={row.name}
            className="flex items-center justify-between gap-6"
          >
            <span className="flex items-center gap-1.5 text-muted-foreground">
              {row.color && (
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: row.color }}
                />
              )}
              {row.name}
            </span>
            <span className="font-semibold text-foreground">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
