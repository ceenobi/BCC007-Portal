import { dehydrate } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { Await, useSearchParams } from "react-router";
import { PageSection } from "~/components/provider/page-wrapper";
import DataError from "~/components/ui/data-error";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { getQueryClientRsc } from "~/lib/getQueryClient";
import { hasPermission } from "~/lib/rbac";
import { userContext } from "~/middleware/auth.middleware";
import {
  getGroupTransferReportsQuery,
  getUserTransferReportsQuery,
} from "~/queries/transfers";
import type { Route } from "./+types/route";
import ReportsSkeleton from "../../features/reports/reports-skeleton";
import TransferReportsView from "../../features/reports/transfer-reports-view";

const PERIODS = ["1w", "1m", "6m", "1y", "all"] as const;
type Period = (typeof PERIODS)[number];

const PERIOD_LABELS: Record<Period, string> = {
  "1w": "1W",
  "1m": "1M",
  "6m": "6M",
  "1y": "1Y",
  all: "All",
};

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Transfer reports - BCC007 Team transfers" },
    {
      name: "description",
      content: "Transfer reports - BCC007 Team transfers",
    },
  ];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const user = context.get(userContext);
  if (!user) {
    throw Response.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }
  const isAdmin = hasPermission(user.role, "MANAGE_TRANSFERS");
  const queryClient = getQueryClientRsc();
  const userReport = queryClient.ensureQueryData(
    getUserTransferReportsQuery(request),
  );
  const groupReport = isAdmin
    ? queryClient.ensureQueryData(getGroupTransferReportsQuery(request))
    : null;
  return {
    userReport,
    groupReport,
    isAdmin,
    dehydratedState: dehydrate(queryClient),
  };
}

export default function TransfersReports({
  loaderData,
}: Route.ComponentProps) {
  const { userReport, groupReport, isAdmin } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<"user" | "group">("user");

  const rawPeriod = searchParams.get("period") ?? "1m";
  const period = (PERIODS as readonly string[]).includes(rawPeriod)
    ? (rawPeriod as Period)
    : "1m";

  const handlePeriodChange = (value: Period) => {
    const next = new URLSearchParams(searchParams);
    if (value === "1m") {
      next.delete("period");
    } else {
      next.set("period", value);
    }
    setSearchParams(next);
  };

  const activeReport =
    view === "group" && groupReport ? groupReport : userReport;

  return (
    <PageSection index={1} className="mt-4 space-y-6 px-4 xl:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h1 className="text-xl font-semibold tracking-tight leading-tight text-foreground">
            Reports
          </h1>
          <p className="text-sm text-muted-foreground">
            Overview of transfer amounts, statuses and monthly flows.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && (
            <Tabs
              value={view}
              onValueChange={(value) =>
                setView(value === "group" ? "group" : "user")
              }
            >
              <TabsList>
                <TabsTrigger value="user">User</TabsTrigger>
                <TabsTrigger value="group">Group</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          <div className="flex w-fit items-center gap-0.75 rounded-lg bg-muted p-0.75">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handlePeriodChange(p)}
                className={`h-7 rounded-md px-2.5 text-xs font-medium transition-colors cursor-pointer ${
                  period === p
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Suspense fallback={<ReportsSkeleton />}>
        <Await resolve={activeReport} errorElement={<DataError />}>
          {(resolved) => <TransferReportsView report={resolved} />}
        </Await>
      </Suspense>
    </PageSection>
  );
}