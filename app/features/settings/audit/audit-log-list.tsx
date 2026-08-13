import { useMemo } from "react";
import {
  RiCalendar2Line,
  RiLifebuoyLine,
  RiLockPasswordLine,
  RiMegaphoneLine,
  RiMoneyDollarCircleLine,
  RiShieldCheckLine,
  RiSettings3Line,
  RiTimeLine,
  RiWallet3Line,
} from "@remixicon/react";
import type { ColumnDef } from "@tanstack/react-table";
import TableView from "~/components/ui/table-view";
import { auditCategoryConfig, auditStatusConfig } from "~/lib/constants";
import { cn, formatDate, getInitials } from "~/lib/utils";
import type { AuditLogData } from "~/types";
import Paginate from "~/components/ui/paginate";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import { useIsMobile } from "~/hooks/useIsMobile";
import usePaginate from "~/hooks/usePaginate";
import type { UsePaginateProps } from "~/types";

const categoryIcons: Record<
  AuditLogData["category"],
  React.ComponentType<{ className?: string; size?: number | string }>
> = {
  auth: RiLockPasswordLine,
  payment: RiMoneyDollarCircleLine,
  settings: RiSettings3Line,
  security: RiShieldCheckLine,
  support: RiLifebuoyLine,
  events: RiCalendar2Line,
  announcements: RiMegaphoneLine,
  expenses: RiWallet3Line,
};

function CategoryBadge({ category }: { category: AuditLogData["category"] }) {
  const config = auditCategoryConfig[category] ?? auditCategoryConfig.auth;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        config.className,
      )}
    >
      {config.label}
    </span>
  );
}

function StatusBadge({ status }: { status: AuditLogData["status"] }) {
  const config = auditStatusConfig[status] ?? auditStatusConfig.success;
  return (
    <Badge className={cn("shrink-0 gap-1.5", config.className)}>
      <span className={cn("size-1.5 shrink-0 rounded-full", config.dotClassName)} />
      <span className="truncate">{config.label}</span>
    </Badge>
  );
}

function AuditTable({ logs }: { logs: AuditLogData[] }) {
  const columns = useMemo<ColumnDef<AuditLogData>[]>(
    () => [
      {
        accessorKey: "action",
        header: "Action",
        cell: ({ row }) => {
          const action = row.original.action;
          const description = row.original.description;
          return (
            <div className="min-w-0 space-y-0.5">
              <p className="truncate text-sm font-medium text-foreground">
                {action.replace(/_/g, " ").toLowerCase()}
              </p>
              {description && (
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => <CategoryBadge category={row.original.category} />,
      },
      {
        accessorKey: "userName",
        header: "User",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
              {getInitials(row.original.userName)}
            </span>
            <span className="truncate text-sm text-foreground">
              {row.original.userName}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "createdAt",
        header: "Date",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
    ],
    [],
  );

  return <TableView columns={columns} data={logs} />;
}

function AuditCard({ logs }: { logs: AuditLogData[] }) {
  return (
    <div className="space-y-3">
      {logs.map((log, index) => {
        const CatIcon =
          categoryIcons[log.category] ?? categoryIcons.security;
        const catConfig =
          auditCategoryConfig[log.category] ?? auditCategoryConfig.auth;
        return (
          <Card
            key={log._id}
            size="sm"
            className="animate-in fade-in slide-in-from-bottom-3"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <CardContent className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-md",
                      catConfig.className,
                    )}
                  >
                    <CatIcon className="size-4.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {log.action.replace(/_/g, " ").toLowerCase()}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {log.userName}
                    </p>
                  </div>
                </div>
                <StatusBadge status={log.status} />
              </div>

              {log.description && (
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {log.description}
                </p>
              )}

              <div className="flex items-center justify-between border-t border-border/60 pt-2.5">
                <CategoryBadge category={log.category} />
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <RiTimeLine className="size-3.5" aria-hidden="true" />
                  {formatDate(log.createdAt)}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function AuditLogList({
  logs,
  meta,
}: {
  logs: AuditLogData[];
  meta: UsePaginateProps;
}) {
  const isMobile = useIsMobile({ MOBILE_BREAKPOINT: 567 });
  const {
    handlePageChange,
    handleLimitChange,
    totalPages,
    hasMore,
    currentPage,
    limit: pageLimit,
  } = usePaginate({
    totalPages: meta?.totalPages || 1,
    hasMore: meta?.hasMore || false,
    currentPage: meta?.currentPage || 1,
  });

  return (
    <>
      {isMobile ? (
        <AuditCard logs={logs ?? []} />
      ) : (
        <AuditTable logs={logs ?? []} />
      )}
      <Paginate
        totalPages={totalPages}
        hasMore={hasMore}
        handlePageChange={handlePageChange}
        onLimitChange={handleLimitChange}
        currentPage={currentPage}
        limit={pageLimit}
      />
    </>
  );
}