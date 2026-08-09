import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PaymentReportData } from "~/queries/payments";
import { formatMoney } from "~/lib/utils";
import { ChartCard, ChartTooltipBox } from "./chart-card";

const FLOW_COLOR = "#3b82f6";

const compactMoney = (value: number) =>
  `₦${new Intl.NumberFormat("en-NG", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value ?? 0)}`;

const monthShort = (key: string) => {
  if (/^\d{4}-\d{2}$/.test(key)) {
    const [year, month] = key.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString("en-GB", { month: "short" });
  }
  return key;
};

function FlowTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; payload?: { count?: number } }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <ChartTooltipBox
      label={label ? monthShort(String(label)) : undefined}
      rows={[
        { name: "Revenue", value: formatMoney(payload[0]?.value ?? 0) },
        { name: "Count", value: String(payload[0]?.payload?.count ?? 0) },
      ]}
    />
  );
}

export default function MonthlyFlowsChart({
  data,
  summary,
}: {
  data: PaymentReportData["monthlyBreakdown"];
  summary: PaymentReportData["monthlySummary"];
}) {
  return (
    <ChartCard
      title={`Payment Flows (${summary.year})`}
      description={`${formatMoney(summary.total)} collected across ${data.length} month${data.length === 1 ? "" : "s"}`}
    >
      {data.every((m) => m.total === 0 && m.count === 0) ? (
        <div className="flex h-64 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
          No payment flows for this period.
        </div>
      ) : (
        <div className="h-64 text-muted-foreground">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
            >
              <CartesianGrid
                stroke="currentColor"
                strokeOpacity={0.15}
                vertical={false}
              />
              <XAxis
                dataKey="_id"
                tickFormatter={monthShort}
                tick={{ fill: "currentColor", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                minTickGap={12}
              />
              <YAxis
                tickFormatter={(v: number) => compactMoney(v)}
                tick={{ fill: "currentColor", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip
                content={<FlowTooltip />}
                cursor={{ fill: "currentColor", fillOpacity: 0.06 }}
              />
              <Bar
                dataKey="total"
                fill={FLOW_COLOR}
                radius={[4, 4, 0, 0]}
                maxBarSize={36}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
