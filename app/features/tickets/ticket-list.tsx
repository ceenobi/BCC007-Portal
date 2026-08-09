import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import Paginate from "~/components/ui/paginate";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import TableView from "~/components/ui/table-view";
import { useIsMobile } from "~/hooks/useIsMobile";
import usePaginate from "~/hooks/usePaginate";
import { ticketPriorityConfig, ticketStatusConfig } from "~/lib/constants";
import { hasPermission } from "~/lib/rbac";
import { cn, formatPaymentDate } from "~/lib/utils";
import type { TicketsQueryResult } from "~/queries/tickets";
import type { SessionUser, TicketData } from "~/types";
import AssignTicketModal from "./assign-ticket-modal";

type AdminMember = {
  _id: string;
  name: string;
  email?: string;
};

interface TicketListProps {
  tickets: TicketsQueryResult;
  user: SessionUser;
  admins: AdminMember[];
}

const statusOptions = ["open", "in-progress", "resolved", "closed"] as const;

function StatusBadge({ status }: { status: TicketData["status"] }) {
  const config = ticketStatusConfig[status] ?? ticketStatusConfig.open;
  return (
    <Badge className={cn("shrink-0 gap-1.5", config.className)}>
      <span
        className={cn("size-1.5 shrink-0 rounded-full", config.dotClassName)}
      />
      <span className="truncate">{config.label}</span>
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: TicketData["priority"] }) {
  const config =
    ticketPriorityConfig[priority] ?? ticketPriorityConfig.medium;
  return (
    <Badge className={cn("shrink-0 gap-1.5", config.className)}>
      <span
        className={cn("size-1.5 shrink-0 rounded-full", config.dotClassName)}
      />
      <span className="truncate capitalize">{config.label}</span>
    </Badge>
  );
}

function CategoryBadge({ category }: { category: TicketData["category"] }) {
  const categoryClass = {
    account:
      "border-transparent bg-sky-500/10 text-sky-600 dark:text-sky-400",
    payment:
      "border-transparent bg-violet-500/10 text-violet-600 dark:text-violet-400",
    security:
      "border-transparent bg-rose-500/10 text-rose-600 dark:text-rose-400",
    other:
      "border-transparent bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
  }[category];
  return (
    <Badge className={cn("capitalize", categoryClass)}>{category}</Badge>
  );
}

function StatusSelect({
  ticket,
  onStatusChange,
}: {
  ticket: TicketData;
  onStatusChange: (status: string, id: string) => void;
}) {
  const [value, setValue] = useState(ticket.status);
  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (v) {
          setValue(v);
          onStatusChange(v, ticket._id);
        }
      }}
    >
      <SelectTrigger
        size="sm"
        className="w-fit text-xs border capitalize focus:outline-lightBlue focus:ring-lightBlue"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {statusOptions.map((status) => (
          <SelectItem
            key={status}
            value={status}
            className="capitalize text-xs"
            disabled={status === ticket.status}
          >
            {status}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function TicketList({
  tickets,
  user,
  admins,
}: TicketListProps) {
  const fetcher = useFetcher();
  const isMobile = useIsMobile({ MOBILE_BREAKPOINT: 567 });
  const canManageStatus = hasPermission(user.role, "MANAGE_TICKETS");
  const canAssign = hasPermission(user.role, "ASSIGN_TICKET");
  const {
    handlePageChange,
    handleLimitChange,
    totalPages,
    hasMore,
    currentPage,
    limit: pageLimit,
  } = usePaginate({
    totalPages: tickets.meta?.totalPages || 1,
    hasMore: tickets.meta?.hasMore || false,
    currentPage: tickets.meta?.currentPage || 1,
  });

  const isSubmitting = fetcher.state === "submitting";

  useEffect(() => {
    if (!fetcher.data) return;
    const data = fetcher.data as { success?: boolean; message?: string };
    if (data.success) {
      toast.success(data.message || "Ticket updated successfully");
    } else {
      toast.error(data.message || "Failed to update ticket");
    }
    fetcher.reset();
  }, [fetcher.data]);

  const handleStatusChange = (status: string, id: string) => {
    fetcher.submit(
      {
        status,
        id,
        intent: "update-ticketStatus",
      },
      {
        method: "post",
        action: "/dashboard/help-center",
        encType: "application/json",
      },
    );
  };

  const columns = useMemo<ColumnDef<TicketData>[]>(
    () => [
      {
        accessorKey: "ticketId",
        header: "Ticket ID",
        cell: ({ row }) => (
          <span className="block max-w-32 truncate font-mono text-xs text-foreground">
            {row.original.ticketId}
          </span>
        ),
      },
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {row.original.title}
            </p>
            <p
              title={row.original.description}
              className="block max-w-52 truncate text-xs text-muted-foreground"
            >
              {row.original.description}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => (
          <CategoryBadge category={row.original.category} />
        ),
      },
      {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) =>
          canManageStatus ? (
            <StatusSelect
              ticket={row.original}
              onStatusChange={handleStatusChange}
            />
          ) : (
            <StatusBadge status={row.original.status} />
          ),
      },
      {
        id: "assignedTo",
        header: "Assigned To",
        cell: ({ row }) => {
          const assignee = row.original.assignedTo as
            | { name?: string }
            | null
            | undefined;
          return (
            <span className="text-muted-foreground">
              {assignee?.name ?? (
                <span className="text-muted-foreground/60">Unassigned</span>
              )}
            </span>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatPaymentDate(row.original.createdAt)}
          </span>
        ),
      },
      ...(canAssign
        ? [
            {
              id: "assign",
              header: "",
              cell: ({ row }: { row: { original: TicketData } }) => (
                <div className="flex items-center justify-end">
                  <AssignTicketModal
                    ticket={row.original}
                    admins={admins}
                  />
                </div>
              ),
            } as ColumnDef<TicketData>,
          ]
        : []),
    ],
    [canManageStatus, canAssign, admins],
  );

  if (isMobile) {
    return (
      <>
        <div className="space-y-3">
          {tickets.tickets.map((ticket, index) => (
            <Card
              key={ticket._id}
              size="sm"
              className="animate-in fade-in slide-in-from-bottom-3"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {ticket.title}
                    </p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {ticket.ticketId}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <PriorityBadge priority={ticket.priority} />
                    <StatusBadge status={ticket.status} />
                  </div>
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {ticket.description}
                </p>
                <div className="flex items-center justify-between border-t border-border/60 pt-2.5">
                  <div className="space-y-0.5">
                    <span className="block text-xs text-muted-foreground">
                      {ticket.assignedTo?.name ?? (
                        <span className="text-muted-foreground/60">
                          Unassigned
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {formatPaymentDate(ticket.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {canAssign && (
                      <AssignTicketModal ticket={ticket} admins={admins} />
                    )}
                    {canManageStatus && (
                      <StatusSelect
                        ticket={ticket}
                        onStatusChange={handleStatusChange}
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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

  return (
    <>
      <TableView columns={columns} data={tickets.tickets} />
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