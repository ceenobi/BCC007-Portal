import type { PaymentReportData } from "~/queries/payments";
import DuesProgress from "./dues-progress";
import MonthlyFlowsChart from "./monthly-flows-chart";
import PaymentTypeChart from "./payment-type-chart";
import RevenueTrendChart from "./revenue-trend-chart";
import StatsCards from "./stats-cards";

export default function ReportsView({ report }: { report: PaymentReportData }) {
  return (
    <div className="space-y-6">
      <StatsCards stats={report.stats} />

      <div className="grid gap-4 lg:grid-cols-12">
        <RevenueTrendChart
          data={report.trends}
          className="lg:col-span-8"
        />
        <PaymentTypeChart
          data={report.typeBreakdown}
          className="lg:col-span-4"
        />
      </div>

      <MonthlyFlowsChart
        data={report.monthlyBreakdown}
        summary={report.monthlySummary}
      />

      <DuesProgress stats={report.paymentStats} />
    </div>
  );
}
