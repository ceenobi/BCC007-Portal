import type { DashboardData } from "~/queries/dashboard";
import BalanceCard from "./balance-card";
import DashboardTrend from "./dashboard-trend";
import QuickActions from "./quick-actions";
import RecentActivity from "./recent-activity";
import RevenueStatsCards from "./revenue-stats-cards";
import TicketSummaryCard from "./ticket-summary";
import UpcomingBirthdays from "./upcoming-birthdays";
import UpcomingEvents from "./upcoming-events";

export default function DashboardView({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-6">
      <RevenueStatsCards
        revenue1m={data.revenue1m}
        revenueAll={data.revenueAll}
        membersCount={data.membersCount}
        myTickets={data.myTickets}
      />

      <div className="grid gap-4 lg:grid-cols-12">
        <DashboardTrend
          revenue1m={data.revenue1m}
          revenueAll={data.revenueAll}
          className="lg:col-span-8"
        />
        <BalanceCard balance={data.balance} className="lg:col-span-4" />
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <TicketSummaryCard
          orgTickets={data.orgTickets}
          myTickets={data.myTickets}
          className="lg:col-span-7"
        />
        <QuickActions className="lg:col-span-5" />
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <UpcomingEvents events={data.upcomingEvents} className="lg:col-span-7" />
        <div className="space-y-4 lg:col-span-5">
          <RecentActivity logs={data.recentActivity} />
          <UpcomingBirthdays birthdays={data.upcomingBirthdays} />
        </div>
      </div>
    </div>
  );
}
