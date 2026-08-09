import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { RiDownload2Line } from "@remixicon/react";
import type { TransferData } from "~/types";
import { transferStatusConfig } from "~/lib/constants";
import { cn, formatMoney, formatPaymentDate } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import TableView from "~/components/ui/table-view";
import RetryTransfer from "./retry-transfer";
import TransferReceiptModal from "./transfer-receipt-modal";

type RenderTableProps = {
  data: TransferData[];
};

function StatusBadge({ status }: { status: TransferData["status"] }) {
  const config = transferStatusConfig[status] ?? transferStatusConfig.pending;
  return (
    <Badge className={cn("shrink-0 gap-1.5", config.className)}>
      <span className={cn("size-1.5 shrink-0 rounded-full", config.dotClassName)} />
      <span className="truncate">{config.label}</span>
    </Badge>
  );
}

export default function RenderTable({ data }: RenderTableProps) {
  const [receiptTransfer, setReceiptTransfer] = useState<TransferData | null>(
    null,
  );
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const openReceipt = (transfer: TransferData) => {
    setReceiptTransfer(transfer);
    setIsReceiptOpen(true);
  };

  const columns = useMemo<ColumnDef<TransferData>[]>(
    () => [
      {
        accessorKey: "reference",
        header: "Reference",
        cell: ({ row }) => {
          const reference = row.original.reference;
          return (
            <span
              title={reference}
              className="block max-w-44 truncate font-mono text-xs text-foreground"
            >
              {reference}
            </span>
          );
        },
      },
      {
        id: "recipient",
        header: "Recipient",
        cell: ({ row }) => {
          const userId = row.original.userId as unknown as
            | { name?: string; email?: string }
            | string;
          const name =
            typeof userId === "object" && userId?.name ? userId.name : "Member";
          return <span className="text-foreground">{name}</span>;
        },
      },
      {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }) => (
          <span className="font-medium text-foreground">
            {formatMoney(row.original.amount)}
          </span>
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
          <span className="text-muted-foreground">
            {formatPaymentDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: "reason",
        header: "Reason",
        cell: ({ row }) => {
          const reason = row.original.reason;
          return (
            <span
              title={reason}
              className="block max-w-40 truncate text-muted-foreground"
            >
              {reason || "—"}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const transfer = row.original;
          const downloadable = transfer.status === "success";
          return (
            <div className="flex items-center justify-end gap-0.5">
              {transfer.status === "failed" && (
                <RetryTransfer
                  transfer={transfer}
                  size="icon-sm"
                  className="text-muted-foreground hover:text-primary"
                />
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                title={
                  downloadable
                    ? "Download receipt"
                    : "Receipt only available for successful transfers"
                }
                disabled={!downloadable}
                onClick={() => openReceipt(transfer)}
                className="text-muted-foreground hover:text-primary"
              >
                <RiDownload2Line className="size-4" aria-hidden="true" />
                <span className="sr-only">Download receipt</span>
              </Button>
            </div>
          );
        },
      },
    ],
    [],
  );

  return (
    <>
      <TableView columns={columns} data={data} />
      <TransferReceiptModal
        transfer={receiptTransfer}
        isOpen={isReceiptOpen}
        setIsOpen={setIsReceiptOpen}
      />
    </>
  );
}