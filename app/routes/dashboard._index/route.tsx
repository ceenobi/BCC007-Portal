import { dehydrate } from "@tanstack/react-query";
import { Suspense } from "react";
import { Await } from "react-router";
import { PageSection, PageWrapper } from "~/components/provider/page-wrapper";
import DataError from "~/components/ui/data-error";
import { getQueryClientRsc } from "~/lib/getQueryClient";
import { userContext } from "~/middleware/auth.middleware";
import { getDashboardQuery } from "~/queries/dashboard";
import DashboardSkeleton from "../../features/dashboard/dashboard-skeleton";
import DashboardView from "../../features/dashboard/dashboard-view";
import type { Route } from "./+types/route";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Dashboard - BCC007 Team payments" },
    {
      name: "description",
      content: "Overview of your organization at a glance",
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

  const queryClient = getQueryClientRsc();
  const dashboard = queryClient.ensureQueryData(getDashboardQuery(request));

  return {
    dashboard,
    user,
    dehydratedState: dehydrate(queryClient),
  };
}

export default function DashboardIndex({ loaderData }: Route.ComponentProps) {
  const { dashboard, user } = loaderData;

  return (
    <PageWrapper>
      <PageSection index={0} className="space-y-8 px-4 xl:px-8">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight leading-tight text-foreground">
            Welcome back, {user.name}
          </h1>
          <p className="leading-snug text-sm text-mainGray dark:text-muted-foreground">
            Here's what's happening in your organization.
          </p>
        </div>

        <Suspense fallback={<DashboardSkeleton />}>
          <Await resolve={dashboard} errorElement={<DataError />}>
            {(resolved) => <DashboardView data={resolved} />}
          </Await>
        </Suspense>
      </PageSection>
    </PageWrapper>
  );
}
