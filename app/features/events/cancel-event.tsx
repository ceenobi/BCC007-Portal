import { RiCloseCircleLine, RiErrorWarningLine } from "@remixicon/react";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import ActionBtn from "~/components/ui/action-btn";
import { Button } from "~/components/ui/button";
import Modal from "~/components/ui/modal";
import { Separator } from "~/components/ui/separator";
import type { EventData } from "~/types";

export default function CancelEvent({ event }: { event: EventData }) {
  const [isOpen, setIsOpen] = useState(false);
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === "submitting";

  const actionData = fetcher.data as
    | { success?: boolean; message?: string }
    | undefined;

  useEffect(() => {
    if (actionData?.success) {
      toast.success(actionData.message || "Event cancelled");
      setIsOpen(false);
    } else if (actionData && !actionData.success) {
      toast.error(actionData.message || "Something went wrong");
    }
  }, [actionData]);

  const confirmCancel = () => {
    fetcher.submit(
      { intent: "cancel-event", eventId: event._id },
      {
        method: "post",
        encType: "application/json",
        action: `/dashboard/events/${event._id}`,
      },
    );
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        aria-label="Cancel event"
        className="gap-1.5 text-destructive hover:bg-destructive/10"
      >
        <RiCloseCircleLine className="size-4" />
      </Button>
      <Modal
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        title="Cancel event"
        description={`Cancel "${event.title}"?`}
      >
        <Separator />
        <div className="space-y-4 p-2">
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <RiErrorWarningLine size={16} className="mt-0.5 shrink-0" />
            <span>
              The event will be marked as cancelled and attendees will be
              notified. This cannot be undone.
            </span>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              Keep Event
            </Button>
            <ActionBtn
              type="button"
              onClick={confirmCancel}
              variant="destructive"
              size="sm"
              text="Cancel Event"
              loading={isSubmitting}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
