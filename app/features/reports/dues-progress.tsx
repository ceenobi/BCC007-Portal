import {
  RiCalendar2Line,
  RiCalendarCheckLine,
  RiCheckboxCircleLine,
  RiCoinsLine,
  RiHistoryLine,
} from "@remixicon/react";
import type { PaymentStats } from "~/queries/payments";
import { cn, formatMoney, formatPaymentDate } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { ChartCard } from "./chart-card";

const PAID_COLOR = "#10b981";
const UNPAID_CLASS =
  "bg-muted/70";

const monthKeyToLabel = (key: string) => {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("en-GB", { month: "short" });
};

const monthKeysBetween = (start: string | null, end: string | null) => {
  const keys: string[] = [];
  if (!start || !end) return keys;
  const [sy, sm] = start.slice(0, 7).split("-").map(Number);
  const [ey, em] = end.slice(0, 7).split("-").map(Number);
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    keys.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    if (keys.length > 24) break;
  }
  return keys;
};

export default function DuesProgress({ stats }: { stats: PaymentStats }) {
  const {
    yearlyDues,
    totalPaidThisYear,
    monthsPaid,
    expectedMonths,
    paidMonths,
    paymentPercentage,
    isUpToDate,
    cycleStart,
    cycleEnd,
    lastMonthlyDuesPaid,
  } = stats;

  const paidKeys = new Set(paidMonths ?? []);
  const monthKeys = monthKeysBetween(cycleStart, cycleEnd);
  const hasDues = monthsPaid > 0 || Boolean(lastMonthlyDuesPaid);
  const paidTargetPct = yearlyDues > 0
    ? Math.min(100, Math.round((totalPaidThisYear / yearlyDues) * 100))
    : 0;

  return (
    <ChartCard
      title="Membership Dues"
      description="Rolling 12-month coverage of membership dues"
    >
      {!hasDues ? (
        <div className="flex h-40 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
          No membership dues payments yet. Your 12-month cycle starts when you
          make your first payment.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-tight text-foreground">
                {paymentPercentage}%
              </span>
              <span className="text-sm text-muted-foreground">
                of 12 months covered
              </span>
            </div>
            <Badge
              className={
                isUpToDate
                  ? "border-transparent bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-transparent bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
              }
            >
              <RiCheckboxCircleLine className="size-3.5" aria-hidden="true" />
              {isUpToDate ? "On track" : "Behind schedule"}
            </Badge>
          </div>

          <div className="grid grid-cols-12 items-end gap-1.5">
            {monthKeys.map((key) => {
              const paid = paidKeys.has(key);
              return (
                <div key={key} className="flex flex-col items-center gap-1">
                  <span
                    title={`${monthKeyToLabel(key)} ${key.slice(0, 4)} - ${
                      paid ? "Paid" : "Not paid"
                    }`}
                    className={cn(
                      "h-9 w-full rounded-md transition-colors",
                      paid ? "" : UNPAID_CLASS,
                    )}
                    style={paid ? { backgroundColor: PAID_COLOR } : undefined}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {monthKeyToLabel(key)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card size="sm">
              <CardContent className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <RiCoinsLine className="size-3.5" aria-hidden="true" />
                  Total Paid
                </div>
                <p className="text-xl font-semibold tracking-tight text-foreground">
                  {formatMoney(totalPaidThisYear)}
                </p>
                <p className="text-xs text-muted-foreground">
                  of {formatMoney(yearlyDues)} target
                </p>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${paidTargetPct}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardContent className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <RiCalendar2Line className="size-3.5" aria-hidden="true" />
                  Months Covered
                </div>
                <p className="text-xl font-semibold tracking-tight text-foreground">
                  {monthsPaid}
                  <span className="text-sm font-medium text-muted-foreground">
                    {" "}
                    / {expectedMonths}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  months with completed dues
                </p>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardContent className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <RiCalendarCheckLine className="size-3.5" aria-hidden="true" />
                  Current Cycle
                </div>
                <p className="text-base font-semibold tracking-tight text-foreground">
                  {formatPaymentDate(cycleStart ?? "")}
                  <span className="mx-1 text-muted-foreground">→</span>
                  {formatPaymentDate(cycleEnd ?? "")}
                </p>
                <p className="text-xs text-muted-foreground">
                  rolling 12-month window
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-between border-t border-border/60 pt-3">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <RiHistoryLine className="size-3.5" aria-hidden="true" />
              Last membership payment:
              <span className="font-medium text-foreground">
                {lastMonthlyDuesPaid
                  ? formatPaymentDate(lastMonthlyDuesPaid)
                  : "—"}
              </span>
            </span>
          </div>
        </div>
      )}
    </ChartCard>
  );
}
