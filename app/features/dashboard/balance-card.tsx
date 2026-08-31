import { RiBankLine, RiTimeLine, RiWallet3Line } from "@remixicon/react";
import { Link } from "react-router";
import { cn, formatMoney } from "~/lib/utils";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { buttonVariants } from "~/components/ui/button";

type BalanceCardProps = {
  balance: {
    total: number;
    pending: number;
    balance: number;
    currency: string;
  } | null;
  className?: string;
};

export default function BalanceCard({ balance, className }: BalanceCardProps) {
  const rows = [
    {
      label: "Available balance",
      value: formatMoney(balance?.balance ?? 0),
      icon: RiWallet3Line,
      iconClassName: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Pending",
      value: formatMoney(balance?.pending ?? 0),
      icon: RiTimeLine,
      iconClassName: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    },
    {
      label: "Total",
      value: formatMoney(balance?.total ?? 0),
      icon: RiBankLine,
      iconClassName: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
  ];

  return (
    <Card className={cn("animate-in fade-in slide-in-from-bottom-3", className)}>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-sm">Organization Balance</CardTitle>
        <CardAction>
          <Link
            to="/dashboard/transfers"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Transfers
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 p-3"
          >
            <span className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground">
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-md",
                  row.iconClassName,
                )}
              >
                <row.icon className="size-4" aria-hidden="true" />
              </span>
              {row.label}
            </span>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              {row.value}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
