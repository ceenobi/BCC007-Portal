import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { RiDownload2Line, RiRecycleLine } from "@remixicon/react";
import type { PaymentData } from "~/types";
import { paymentStatusConfig, paymentTypeConfig } from "~/lib/constants";
import { cn, formatMoney, formatPaymentDate } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import TableView from "~/components/ui/table-view";
import ReceiptModal from "./receipt-modal";

type RenderTableProps = {
  data: PaymentData[];
};

function StatusBadge({ status }: { status: PaymentData["paymentStatus"] }) {
  const config = paymentStatusConfig[status] ?? paymentStatusConfig.pending;
  return (
    <Badge className={cn("shrink-0 gap-1.5", config.className)}>
      <span
        className={cn("size-1.5 shrink-0 rounded-full", config.dotClassName)}
      />
      <span className="truncate">{config.label}</span>
    </Badge>
  );
}

export default function RenderTable({ data }: RenderTableProps) {
  const [receiptPayment, setReceiptPayment] = useState<PaymentData | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const openReceipt = (payment: PaymentData) => {
    setReceiptPayment(payment);
    setIsReceiptOpen(true);
  };

  const columns = useMemo<ColumnDef<PaymentData>[]>(
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
        accessorKey: "paymentType",
        header: "Type",
        cell: ({ row }) => {
          const payment = row.original;
          const config =
            paymentTypeConfig[payment.paymentType] ??
            paymentTypeConfig.membership_dues;
          return (
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
                  config.className,
                )}
              >
                {config.label}
              </span>
              {payment.isRecurring && (
                <Badge variant="outline" title="Recurring payment">
                  <RiRecycleLine className="size-3" aria-hidden="true" />
                  <span className="sr-only">Recurring</span>
                </Badge>
              )}
            </div>
          );
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
        accessorKey: "paymentStatus",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge status={row.original.paymentStatus} />
        ),
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
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon-sm"
            title={
              row.original.paymentStatus === "completed"
                ? "Download receipt"
                : "Receipt only available for completed payments"
            }
            disabled={row.original.paymentStatus !== "completed"}
            onClick={() => openReceipt(row.original)}
            className="text-muted-foreground hover:text-primary"
          >
            <RiDownload2Line className="size-4" aria-hidden="true" />
            <span className="sr-only">Download receipt</span>
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <TableView columns={columns} data={data} />
      <ReceiptModal
        payment={receiptPayment}
        isOpen={isReceiptOpen}
        setIsOpen={setIsReceiptOpen}
      />
    </>
  );
}