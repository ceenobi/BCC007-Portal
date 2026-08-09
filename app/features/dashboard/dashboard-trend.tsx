import { useState } from "react";
import type { PaymentReportData } from "~/queries/payments";
import RevenueTrendChart from "../reports/revenue-trend-chart";

type DashboardTrendProps = {
  revenue1m: PaymentReportData | null;
  revenueAll: PaymentReportData | null;
  className?: string;
};

const PERIODS = ["1m", "all"] as const;
type Period = (typeof PERIODS)[number];

export default function DashboardTrend({
  revenue1m,
  revenueAll,
  className,
}: DashboardTrendProps) {
  const [period, setPeriod] = useState<Period>("1m");

  const report = period === "1m" ? revenue1m : revenueAll;
  const data = report?.trends ?? [];

  return (
    <RevenueTrendChart
      data={data}
      className={className}
      headerAction={
        <div className="flex w-fit items-center gap-0.5 rounded-lg bg-muted p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`h-6 cursor-pointer rounded-md px-2 text-xs font-medium transition-colors ${
                period === p
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p === "1m" ? "30 days" : "All time"}
            </button>
          ))}
        </div>
      }
    />
  );
}
