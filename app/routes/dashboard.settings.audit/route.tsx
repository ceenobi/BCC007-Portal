import { dehydrate } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { Await, useSearchParams } from "react-router";
import { PageSection } from "~/components/provider/page-wrapper";
import DataError from "~/components/ui/data-error";
import NotFound from "~/components/ui/not-found";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { auditlogCategories } from "~/lib/constants";
import { getQueryClientRsc } from "~/lib/getQueryClient";
import { hasPermission } from "~/lib/rbac";
import { userContext } from "~/middleware/auth.middleware";
import {
    getAllAuditLogsQuery,
    getUserAuditLogsQuery,
} from "~/queries/audit-logs";
import type { Route } from "./+types/route";
import AuditLogList from "~/features/settings/audit/audit-log-list";
import AuditSkeleton from "~/features/settings/audit/audit-skeleton";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Audit Logs — BCC007" },
    {
      name: "description",
      content: "Track administrative activity and security events.",
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
  const isSuperAdmin = hasPermission(user.role, "MANAGE_ROLES");
  const queryClient = getQueryClientRsc();
  const logs = queryClient.ensureQueryData(getUserAuditLogsQuery(request));
  const groupLogs = isSuperAdmin
    ? queryClient.ensureQueryData(getAllAuditLogsQuery(request))
    : null;
  return {
    dehydratedState: dehydrate(queryClient),
    logs,
    groupLogs,
    isSuperAdmin
  };
}

export default function AuditLog({ loaderData }: Route.ComponentProps) {
  const { logs, groupLogs, isSuperAdmin } = loaderData;
  const [view, setView] = useState<"user" | "group">("user");
  const [searchParams, setSearchParams] = useSearchParams();
  const currentCategory = searchParams.get("category") || "all";
  const activeLogs =
    view === "group" && groupLogs ? groupLogs : logs;

  const handleCategoryChange = (value: string | null) => {
      const newParams = new URLSearchParams(searchParams);
      if (!value || value === "all") {
        newParams.delete("category");
      } else {
        newParams.set("category", value);
      }
      newParams.set("page", "1");
      setSearchParams(newParams);
    };

  return (
    <>
      <PageSection index={0} className="space-y-8 px-4 xl:px-8">
        <div className="space-y-2">
          <h1 className="hidden lg:block text-xl font-semibold tracking-tight leading-tight text-foreground">
            Audit Logs
          </h1>
          <p className="leading-snug text-sm text-mainGray dark:text-muted-foreground">
            View a detailed history of account activities and security events.
          </p>
        </div>
        <div className="flex flex-wrap justify-between items-center">
          {isSuperAdmin && (
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
          <Select value={currentCategory} onValueChange={handleCategoryChange}>
            <SelectTrigger className="min-w-32 text-mainGray dark:text-muted-foreground capitalize text-xs border focus:outline-lightBlue focus:ring-lightBlue">
              <SelectValue placeholder="Filter Category"/>
            </SelectTrigger>
            <SelectContent className="rounded-md bg-none">
              {auditlogCategories.map((cat) => (
                <SelectItem
                  key={cat.value}
                  value={cat.value}
                  className="text-xs capitalize"
                >
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Suspense fallback={<AuditSkeleton />}>
          <Await resolve={activeLogs} errorElement={<DataError />}>
            {(resolvedLogs) => (
              <div className="space-y-6">
                {resolvedLogs?.logs.length === 0 ? (
                  <NotFound
                    title="No Activity Logged"
                    message="Significant actions will appear here as you manage your
                  account."
                  />
                ) : (
                  <AuditLogList
                    logs={resolvedLogs.logs}
                    meta={resolvedLogs.meta}
                  />
                )}
              </div>
            )}
          </Await>

        </Suspense>
      </PageSection>
    </>
  );
}
