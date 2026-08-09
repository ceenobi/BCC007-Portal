import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { PaymentReportData } from "~/queries/payments";
import { paymentTypeConfig } from "~/lib/constants";
import { formatMoney } from "~/lib/utils";
import { ChartCard, ChartTooltipBox } from "./chart-card";

const TYPE_COLORS: Record<string, string> = {
  membership_dues: "#3b82f6",
  donation: "#10b981",
  event: "#8b5cf6",
};

function TypeTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    payload?: { count?: number };
  }>;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <ChartTooltipBox
      label={entry?.name}
      rows={[
        { name: "Revenue", value: formatMoney(entry?.value ?? 0) },
        { name: "Count", value: String(entry?.payload?.count ?? 0) },
      ]}
    />
  );
}

export default function PaymentTypeChart({
  data,
  className,
}: {
  data: PaymentReportData["typeBreakdown"];
  className?: string;
}) {
  const total = data.reduce((sum, item) => sum + item.revenue, 0);
  const chartData = data.map((item) => ({
    _id: item._id,
    name: paymentTypeConfig[item._id as keyof typeof paymentTypeConfig]?.label ?? item._id,
    value: item.revenue,
    count: item.count,
  }));

  return (
    <ChartCard
      title="Payment Types"
      description="Revenue split by payment type"
      className={className}
    >
      {chartData.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
          No payment data for this period.
        </div>
      ) : (
        <div className="flex h-64 flex-col">
          <div className="min-h-0 flex-1 text-muted-foreground">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="58%"
                  outerRadius="85%"
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={entry._id}
                      fill={TYPE_COLORS[entry._id] ?? "#94a3b8"}
                    />
                  ))}
                </Pie>
                <Tooltip content={<TypeTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 space-y-1.5">
            {chartData.map((entry) => {
              const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
              return (
                <li
                  key={entry._id}
                  className="flex items-center justify-between gap-4 text-xs"
                >
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          TYPE_COLORS[entry._id] ?? "#94a3b8",
                      }}
                    />
                    {entry.name}
                  </span>
                  <span className="font-medium text-foreground">
                    {formatMoney(entry.value)}
                    <span className="ml-2 text-muted-foreground">
                      {pct}%
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </ChartCard>
  );
}
