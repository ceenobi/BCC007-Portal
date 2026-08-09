import {
  RiDownload2Line,
  RiRecycleLine,
  RiWallet3Line,
} from "@remixicon/react";
import { useState } from "react";
import type { PaymentData } from "~/types";
import { paymentStatusConfig, paymentTypeConfig } from "~/lib/constants";
import { cn, formatMoney, formatPaymentDate } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import ReceiptModal from "./receipt-modal";

type PaymentCardProps = {
  data: PaymentData[];
};

function StatusBadge({ status }: { status: PaymentData["paymentStatus"] }) {
  const config = paymentStatusConfig[status] ?? paymentStatusConfig.pending;
  return (
    <Badge className={cn("shrink-0 gap-1.5", config.className)}>
      <span className={cn("size-1.5 shrink-0 rounded-full", config.dotClassName)} />
      <span className="truncate">{config.label}</span>
    </Badge>
  );
}

export default function PaymentCard({ data }: PaymentCardProps) {
  const [receiptPayment, setReceiptPayment] = useState<PaymentData | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const openReceipt = (payment: PaymentData) => {
    setReceiptPayment(payment);
    setIsReceiptOpen(true);
  };

  return (
    <div className="space-y-3">
      {data.map((payment, index) => {
        const typeConfig =
          paymentTypeConfig[payment.paymentType] ??
          paymentTypeConfig.membership_dues;
        return (
          <Card
            key={payment._id}
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
                      typeConfig.className,
                    )}
                  >
                    <RiWallet3Line className="size-4.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {typeConfig.label}
                    </p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {payment.reference}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <StatusBadge status={payment.paymentStatus} />
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    title={
                      payment.paymentStatus === "completed"
                        ? "Download receipt"
                        : "Receipt only available for completed payments"
                    }
                    disabled={payment.paymentStatus !== "completed"}
                    onClick={() => openReceipt(payment)}
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
                    Paid on {formatPaymentDate(payment.createdAt)}
                  </span>
                  {payment.isRecurring && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <RiRecycleLine className="size-3.5" aria-hidden="true" />
                      Recurring
                    </span>
                  )}
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {formatMoney(payment.amount)}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
      <ReceiptModal
        payment={receiptPayment}
        isOpen={isReceiptOpen}
        setIsOpen={setIsReceiptOpen}
      />
    </div>
  );
}