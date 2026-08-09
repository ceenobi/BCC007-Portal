import { RiLoader2Line, RiRestartLine } from "@remixicon/react";
import { useEffect } from "react";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import type { TransferData } from "~/types";

type RetryTransferProps = {
  transfer: TransferData;
  size?: "icon-xs" | "icon-sm";
  className?: string;
};

export default function RetryTransfer({
  transfer,
  size = "icon-sm",
  className,
}: RetryTransferProps) {
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === "submitting";

  useEffect(() => {
    if (!fetcher.data) return;
    const data = fetcher.data as { success?: boolean; message?: string };
    if (data.success) {
      toast.success(data.message || "Transfer retried successfully");
      fetcher.reset();
    } else if (!data.success) {
      toast.error(data.message || "Failed to retry transfer");
    }
  }, [fetcher.data]);

  const onRetry = () => {
    fetcher.submit(
      { intent: "retry-transfer", reference: transfer.reference } as any,
      {
        method: "post",
        encType: "application/json",
        action: "/dashboard/transfers",
      },
    );
  };

  return (
    <Button
      variant="ghost"
      size={size}
      title="Retry this transfer"
      disabled={isSubmitting}
      onClick={onRetry}
      className={className ?? "text-muted-foreground hover:text-primary"}
    >
      {isSubmitting ? (
        <RiLoader2Line className="animate-spin" aria-hidden="true" />
      ) : (
        <RiRestartLine aria-hidden="true" />
      )}
      <span className="sr-only">Retry transfer</span>
    </Button>
  );
}