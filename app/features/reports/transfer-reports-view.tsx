import type { TransferReportData } from "~/queries/transfers";
import TransferMonthlyFlowsChart from "./transfer-monthly-flows-chart";
import TransferStatsCards from "./transfer-stats-cards";
import TransferStatusChart from "./transfer-status-chart";
import TransferTrendChart from "./transfer-trend-chart";

export default function TransferReportsView({
  report,
}: {
  report: TransferReportData;
}) {
  return (
    <div className="space-y-6">
      <TransferStatsCards stats={report.stats} />

      <div className="grid gap-4 lg:grid-cols-12">
        <TransferTrendChart
          data={report.trends}
          className="lg:col-span-8"
        />
        <TransferStatusChart
          data={report.statusBreakdown}
          className="lg:col-span-4"
        />
      </div>

      <TransferMonthlyFlowsChart
        data={report.monthlyBreakdown}
        summary={report.monthlySummary}
      />
    </div>
  );
}