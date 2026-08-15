import {
  RiArrowRightLine,
  RiCheckLine,
  RiCloseLine,
  RiCpuLine,
  RiDatabase2Line,
  RiErrorWarningLine,
  RiGlobalLine,
  RiHeartPulseLine,
  RiRefreshLine,
  RiServerLine,
  RiTimeLine,
} from "@remixicon/react";
import { dehydrate, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { getHealthStatus } from "~/.server/utils/health";
import { Button } from "~/components/ui/button";
import { useWaveAnimation } from "~/hooks/usePageAnimation";
import { getQueryClientRsc } from "~/lib/getQueryClient";
import { buildSeoMeta } from "~/lib/seo";
import { cn } from "~/lib/utils";
import { sessionMiddleware, userContext } from "~/middleware/auth.middleware";
import { getHealthQuery } from "~/queries/health";
import type { HealthStatus } from "~/types";
import type { Route } from "./+types/health";

export const middleware = [sessionMiddleware];

export function meta({}: Route.MetaArgs) {
  return [
    ...buildSeoMeta({
      title: "System Status - BCC007",
      description: "Live health status of the BCC007 Portal server.",
      path: "/health",
      noindex: true,
    }),
  ];
}

export async function loader({ context }: Route.LoaderArgs) {
  const user = context.get(userContext);
  const queryClient = getQueryClientRsc();
  const health = await getHealthStatus();
  queryClient.setQueryData(["health"], health);
  return {
    health,
    dehydratedState: dehydrate(queryClient),
    user,
  };
}

const statusTheme: Record<
  HealthStatus["status"],
  { label: string; text: string; dot: string; soft: string; ring: string }
> = {
  ok: {
    label: "Operational",
    text: "text-success",
    dot: "bg-success",
    soft: "bg-success/10 text-success",
    ring: "ring-success/20",
  },
  degraded: {
    label: "Degraded",
    text: "text-warning",
    dot: "bg-warning",
    soft: "bg-warning/10 text-warning",
    ring: "ring-warning/20",
  },
  down: {
    label: "Down",
    text: "text-destructive",
    dot: "bg-destructive",
    soft: "bg-destructive/10 text-destructive",
    ring: "ring-destructive/20",
  },
};

const checkStatusTheme: Record<
  "ok" | "down",
  { label: string; soft: string; dot: string; Icon: typeof RiCheckLine }
> = {
  ok: {
    label: "Operational",
    soft: "bg-success/10 text-success",
    dot: "bg-success",
    Icon: RiCheckLine,
  },
  down: {
    label: "Unavailable",
    soft: "bg-destructive/10 text-destructive",
    dot: "bg-destructive",
    Icon: RiCloseLine,
  },
};

const formatUptime = (seconds: number) => {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const formatTimestamp = (iso: string) => {
  const date = new Date(iso);
  return `${date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })} · ${date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

function MemoryBar({
  label,
  used,
  total,
}: {
  label: string;
  used: number;
  total: number;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">
          {used} MB / {total} MB
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct > 85
              ? "bg-destructive"
              : pct > 60
                ? "bg-warning"
                : "bg-success",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function HealthPage({ loaderData }: Route.ComponentProps) {
  const queryClient = useQueryClient();
  const { data, isFetching, refetch } = useQuery(getHealthQuery());
  const health = data ?? loaderData.health;
  const user = loaderData.user;
  const animation = useWaveAnimation({
    threshold: 0,
    rootMargin: "0px",
    staggerDelay: 80,
  });

  console.log(user)

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["health"] });
    void refetch();
  };

  return (
    <main className="relative flex min-h-dvh flex-col bg-white dark:bg-bgDark">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff14_1px,transparent_1px),linear-gradient(to_bottom,#ffffff14_1px,transparent_1px)] bg-size-[6rem_4rem]"
      />

      <div
        ref={animation.containerRef}
        className="relative z-10 mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14"
      >
        {/* Header */}
        <header
          className={cn(
            "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
            animation.getItemClassName(),
          )}
          style={animation.getItemStyle(0)}
        >
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-mainBlue/10 dark:bg-darkBlue/10">
              <RiHeartPulseLine className="text-lightBlue dark:text-darkBlue" />
            </div>
            <div>
              <h1 className="font-heading text-lg font-semibold tracking-tight text-mainDark dark:text-white">
                System Status
              </h1>
              <p className="text-xs text-muted-foreground">
                BCC007 Portal · server health overview
              </p>
            </div>
          </div>
          {health && (
            <span
              className={cn(
                "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1",
                statusTheme[health.status].soft,
                statusTheme[health.status].ring,
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  statusTheme[health.status].dot,
                )}
              />
              {statusTheme[health.status].label}
            </span>
          )}
        </header>

        {/* Overall status */}
        {health && (
          <div
            className={animation.getItemClassName("mt-6")}
            style={animation.getItemStyle(1)}
          >
            <section className="rounded-2xl bg-card p-6 ring-1 ring-foreground/10 sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <span
                    className={cn(
                      "flex size-14 shrink-0 items-center justify-center rounded-2xl",
                      statusTheme[health.status].soft,
                    )}
                  >
                    {health.status === "ok" ? (
                      <RiCheckLine className="size-7" />
                    ) : (
                      <RiErrorWarningLine className="size-7" />
                    )}
                  </span>
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight text-mainDark dark:text-white">
                      {health.status === "ok"
                        ? "All systems operational"
                        : health.status === "degraded"
                          ? "Some systems degraded"
                          : "System unavailable"}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Database: {health.checks.database.state} · Redis:{" "}
                      {health.checks.redis.ping ?? "no response"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <RiTimeLine className="size-3.5" />
                    Up {formatUptime(health.uptime)}
                  </span>
                  <span className="hidden sm:inline">·</span>
                  <span>Checked {formatTimestamp(health.timestamp)}</span>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Checks */}
        {health && (
          <div
            className={animation.getItemClassName(
              "mt-4 grid gap-4 sm:grid-cols-2",
            )}
            style={animation.getItemStyle(2)}
          >
            <CheckCard
              title="Database"
              description="MongoDB connection"
              Icon={RiDatabase2Line}
              status={health.checks.database.status}
              detail={health.checks.database.state}
            />
            <CheckCard
              title="Redis"
              description="Upstash cache + rate limiting"
              Icon={RiServerLine}
              status={health.checks.redis.status}
              detail={health.checks.redis.ping ?? "no response"}
            />
          </div>
        )}

        {/* System */}
        {health && (
          <div
            className={animation.getItemClassName("mt-4")}
            style={animation.getItemStyle(3)}
          >
            <section className="rounded-2xl bg-card p-6 ring-1 ring-foreground/10">
              <div className="flex items-center gap-2">
                <RiCpuLine className="text-muted-foreground" />
                <h3 className="font-heading text-sm font-medium text-mainDark dark:text-white">
                  System
                </h3>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <RiGlobalLine className="size-3.5" />
                      Environment
                    </span>
                    <span className="font-medium capitalize">
                      {health.environment}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <RiTimeLine className="size-3.5" />
                      Uptime
                    </span>
                    <span className="font-medium">
                      {formatUptime(health.uptime)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Process</span>
                    <span className="font-medium">
                      RSS {health.memory.rss} MB
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <MemoryBar
                    label="Heap usage"
                    used={health.memory.heapUsed}
                    total={health.memory.heapTotal}
                  />
                  <MemoryBar
                    label="Resident set size"
                    used={health.memory.rss}
                    total={Math.max(health.memory.rss, 1024)}
                  />
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Footer */}
        <footer
          className={cn(
            "mt-8 flex flex-col items-center justify-between gap-3 border-t pt-6 sm:flex-row",
            animation.getItemClassName(),
          )}
          style={animation.getItemStyle(4)}
        >
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            {isFetching ? (
              <>
                <span className="size-3 animate-spin rounded-full border-2 border-lightBlue border-t-transparent" />
                Refreshing…
              </>
            ) : (
              <RiHeartPulseLine className="size-3.5 text-success" />
            )}
            Auto-refreshes every 30 seconds
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RiRefreshLine className={cn(isFetching && "animate-spin")} />
              Refresh
            </Button>
            <Link to={user ? `/dashboard` : "/"}>
              <Button
                variant="ghost"
                size="sm"
                className="inline-flex items-center gap-1"
              >
                Back to home <RiArrowRightLine />
              </Button>
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}

function CheckCard({
  title,
  description,
  Icon,
  status,
  detail,
}: {
  title: string;
  description: string;
  Icon: typeof RiDatabase2Line;
  status: "ok" | "down";
  detail: string;
}) {
  const theme = checkStatusTheme[status];
  return (
    <section className="rounded-2xl bg-card p-6 ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex size-10 items-center justify-center rounded-xl",
              theme.soft,
            )}
          >
            <Icon className="size-5" />
          </span>
          <div>
            <h3 className="font-heading text-sm font-medium text-mainDark dark:text-white">
              {title}
            </h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            theme.soft,
          )}
        >
          <span className={cn("size-1.5 rounded-full", theme.dot)} />
          {theme.label}
        </span>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        <span className="font-medium capitalize text-foreground">{detail}</span>{" "}
        · as of now
      </p>
    </section>
  );
}
