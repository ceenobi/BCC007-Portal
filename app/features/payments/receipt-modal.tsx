import { RiDownload2Line, RiWallet3Line } from "@remixicon/react";
import { useState } from "react";
import { toast } from "sonner";
import type { PaymentData } from "~/types";
import { paymentStatusConfig, paymentTypeConfig } from "~/lib/constants";
import { cn, formatMoney, formatPaymentDate, receiptInvoice } from "~/lib/utils";
import ActionBtn from "~/components/ui/action-btn";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import Modal from "~/components/ui/modal";
import { Separator } from "~/components/ui/separator";

type ReceiptModalProps = {
  payment: PaymentData | null;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
};

export default function ReceiptModal({
  payment,
  isOpen,
  setIsOpen,
}: ReceiptModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const typeConfig = payment
    ? paymentTypeConfig[payment.paymentType] ?? paymentTypeConfig.membership_dues
    : null;
  const statusConfig = payment
    ? paymentStatusConfig[payment.paymentStatus] ?? paymentStatusConfig.pending
    : null;
  const canDownload = payment?.paymentStatus === "completed";

  const handleDownload = async () => {
    if (!payment || !canDownload) return;
    setIsDownloading(true);
    try {
      await receiptInvoice(payment);
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
      title="Download Payment Receipt"
      description={
        payment ? `Receipt for ${payment.reference ?? "payment"}` : "No payment selected"
      }
    >
      <Separator />
      {payment ? (
        <div className="px-2 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-md",
                  typeConfig?.className,
                )}
              >
                <RiWallet3Line className="size-4.5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {typeConfig?.label}
                </p>
                <p className="truncate font-mono text-xs text-muted-foreground">
                  {payment.reference}
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
                {formatMoney(payment.amount)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Payment Date</dt>
              <dd className="text-foreground">
                {formatPaymentDate(payment.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Member</dt>
              <dd className="truncate text-foreground">
                {payment.userId?.name || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Recurring</dt>
              <dd className="text-foreground">
                {payment.isRecurring ? "Yes" : "No"}
              </dd>
            </div>
            {payment.note && (
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">Note</dt>
                <dd className="text-foreground">{payment.note}</dd>
              </div>
            )}
          </dl>

          {!canDownload && (
            <p className="rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-600 dark:text-yellow-400">
              Receipts are only available for completed payments.
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No payment selected.</p>
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