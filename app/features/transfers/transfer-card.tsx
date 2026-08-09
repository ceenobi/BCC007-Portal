import { RiDownload2Line, RiSendPlaneLine } from "@remixicon/react";
import { useState } from "react";
import type { TransferData } from "~/types";
import { transferStatusConfig } from "~/lib/constants";
import { cn, formatMoney, formatPaymentDate } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import RetryTransfer from "./retry-transfer";
import TransferReceiptModal from "./transfer-receipt-modal";

type TransferCardProps = {
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

const recipientName = (userId: TransferData["userId"]) => {
  const resolved = userId as unknown as { name?: string } | string;
  return typeof resolved === "object" && resolved?.name ? resolved.name : "Member";
};

export default function TransferCard({ data }: TransferCardProps) {
  const [receiptTransfer, setReceiptTransfer] = useState<TransferData | null>(
    null,
  );
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const openReceipt = (transfer: TransferData) => {
    setReceiptTransfer(transfer);
    setIsReceiptOpen(true);
  };

  return (
    <div className="space-y-3">
      {data.map((transfer, index) => {
        const statusConfig =
          transferStatusConfig[transfer.status] ?? transferStatusConfig.pending;
        const downloadable = transfer.status === "success";
        return (
          <Card
            key={transfer._id}
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
                      statusConfig.className,
                    )}
                  >
                    <RiSendPlaneLine className="size-4.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {recipientName(transfer.userId)}
                    </p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {transfer.reference}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <StatusBadge status={transfer.status} />
                  {transfer.status === "failed" && (
                    <RetryTransfer
                      transfer={transfer}
                      size="icon-xs"
                      className="text-muted-foreground hover:text-primary"
                    />
                  )}
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    title={
                      downloadable
                        ? "Download receipt"
                        : "Receipt only available for successful transfers"
                    }
                    disabled={!downloadable}
                    onClick={() => openReceipt(transfer)}
                    className="text-muted-foreground hover:text-primary"
                  >
                    <RiDownload2Line className="size-3.5" aria-hidden="true" />
                    <span className="sr-only">Download receipt</span>
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border/60 pt-2.5">
                <div className="space-y-0.5">
                  <span className="block text-xs text-muted-foreground">
                    Sent on {formatPaymentDate(transfer.createdAt)}
                  </span>
                  {transfer.reason && (
                    <span className="block max-w-48 truncate text-xs text-muted-foreground">
                      {transfer.reason}
                    </span>
                  )}
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {formatMoney(transfer.amount)}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
      <TransferReceiptModal
        transfer={receiptTransfer}
        isOpen={isReceiptOpen}
        setIsOpen={setIsReceiptOpen}
      />
    </div>
  );
}