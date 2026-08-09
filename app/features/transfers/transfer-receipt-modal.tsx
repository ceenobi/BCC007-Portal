import { RiDownload2Line, RiSendPlaneLine } from "@remixicon/react";
import { useState } from "react";
import { toast } from "sonner";
import type { TransferData } from "~/types";
import { transferStatusConfig } from "~/lib/constants";
import { cn, formatMoney, formatPaymentDate, transferReceiptInvoice } from "~/lib/utils";
import ActionBtn from "~/components/ui/action-btn";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import Modal from "~/components/ui/modal";
import { Separator } from "~/components/ui/separator";

type TransferReceiptModalProps = {
  transfer: TransferData | null;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
};

const recipientName = (userId: TransferData["userId"]) => {
  const resolved = userId as unknown as { name?: string } | string;
  return typeof resolved === "object" && resolved?.name
    ? resolved.name
    : "Member";
};

export default function TransferReceiptModal({
  transfer,
  isOpen,
  setIsOpen,
}: TransferReceiptModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const statusConfig = transfer
    ? transferStatusConfig[transfer.status] ?? transferStatusConfig.pending
    : null;
  const canDownload = transfer?.status === "success";

  const handleDownload = async () => {
    if (!transfer || !canDownload) return;
    setIsDownloading(true);
    try {
      await transferReceiptInvoice(transfer);
    } catch (error) {
      toast.error("Failed to generate receipt. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      title="Transfer Receipt"
      description={
        transfer
          ? `Receipt for ${transfer.reference ?? "transfer"}`
          : "No transfer selected"
      }
    >
      <Separator />
      {transfer ? (
        <div className="px-2 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-md",
                  statusConfig?.className,
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
            {statusConfig && (
              <Badge className={cn("shrink-0 gap-1.5", statusConfig.className)}>
                <span
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    statusConfig.dotClassName,
                  )}
                />
                <span className="truncate">{statusConfig.label}</span>
              </Badge>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Amount</dt>
              <dd className="font-semibold text-foreground">
                {formatMoney(transfer.amount)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Fee</dt>
              <dd className="text-foreground">
                {formatMoney(transfer.fee ?? 0)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Transfer Date</dt>
              <dd className="text-foreground">
                {formatPaymentDate(transfer.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Currency</dt>
              <dd className="text-foreground">{transfer.currency ?? "NGN"}</dd>
            </div>
            {transfer.transferCode && (
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">Transfer Code</dt>
                <dd className="truncate font-mono text-foreground">
                  {transfer.transferCode}
                </dd>
              </div>
            )}
            {transfer.reason && (
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">Reason</dt>
                <dd className="text-foreground">{transfer.reason}</dd>
              </div>
            )}
          </dl>

          {!canDownload && (
            <p className="rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-600 dark:text-yellow-400">
              Receipts are only available for successful transfers.
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No transfer selected.</p>
      )}
      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(false)}
        >
          Close
        </Button>
        <ActionBtn
          type="button"
          text={
            <>
              Download Receipt
              <RiDownload2Line size={14} />
            </>
          }
          size="sm"
          onClick={handleDownload}
          loading={isDownloading}
          disabled={!canDownload}
          classname="btn"
        />
      </div>
    </Modal>
  );
}