import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TransferReportData } from "~/queries/transfers";
import { formatMoney } from "~/lib/utils";
import { ChartCard, ChartTooltipBox } from "./chart-card";

const TREND_COLOR = "#3b82f6";

const compactMoney = (value: number) =>
  `₦${new Intl.NumberFormat("en-NG", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value ?? 0)}`;

const formatTick = (value: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T00:00:00`);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      });
    }
  }
  if (/^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString("en-GB", { month: "short" });
  }
  return value;
};

function TrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <ChartTooltipBox
      label={label ? formatTick(label) : undefined}
      rows={[
        { name: "Amount", value: formatMoney(payload[0]?.value ?? 0) },
      ]}
    />
  );
}

export default function TransferTrendChart({
  data,
  className,
}: {
  data: TransferReportData["trends"];
  className?: string;
}) {
  return (
    <ChartCard
      title="Amount Sent"
      description="Transfer amount over the selected period"
      className={className}
    >
      {data.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
          No transfer data for this period.
        </div>
      ) : (
        <div className="h-64 text-muted-foreground">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
            >
              <defs>
                <linearGradient id="transferTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={TREND_COLOR} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={TREND_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="currentColor"
                strokeOpacity={0.15}
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickFormatter={formatTick}
                tick={{ fill: "currentColor", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                tickFormatter={(v: number) => compactMoney(v)}
                tick={{ fill: "currentColor", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip content={<TrendTooltip />} cursor={{ stroke: "currentColor", strokeOpacity: 0.2 }} />
              <Area
                type="monotone"
                dataKey="sent"
                stroke={TREND_COLOR}
                strokeWidth={2}
                fill="url(#transferTrendFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}