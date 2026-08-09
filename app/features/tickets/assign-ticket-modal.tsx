import { RiUserAddLine, RiUserSharedLine } from "@remixicon/react";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import ActionBtn from "~/components/ui/action-btn";
import { AlertBox } from "~/components/ui/alert-box";
import { Button } from "~/components/ui/button";
import Modal from "~/components/ui/modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import type { TicketData } from "~/types";

type AdminMember = {
  _id: string;
  name: string;
  email?: string;
};

type AssignTicketModalProps = {
  ticket: TicketData;
  admins: AdminMember[];
};

export default function AssignTicketModal({
  ticket,
  admins,
}: AssignTicketModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(
    ticket.assignedTo?._id ?? null,
  );
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === "submitting";
  const actionData = fetcher.data as
    | { success?: boolean; message?: string }
    | undefined;

  useEffect(() => {
    if (isOpen) {
      setSelected(ticket.assignedTo?._id ?? null);
      fetcher.data = undefined;
    }
  }, [isOpen, ticket.assignedTo]);

  useEffect(() => {
    if (!actionData) return;
    if (actionData.success) {
      toast.success(actionData.message || "Ticket assigned successfully");
      setIsOpen(false);
    } else {
      toast.error(actionData.message || "Failed to assign ticket");
    }
    fetcher.reset();
  }, [actionData]);

  const handleAssign = () => {
    fetcher.submit(
      {
        intent: "assign-ticket",
        id: ticket._id,
        assignedTo: selected,
      },
      {
        method: "post",
        action: "/dashboard/help-center",
        encType: "application/json",
      },
    );
  };

  const handleUnassign = () => {
    fetcher.submit(
      {
        intent: "assign-ticket",
        id: ticket._id,
        assignedTo: null,
      },
      {
        method: "post",
        action: "/dashboard/help-center",
        encType: "application/json",
      },
    );
  };

  const hasAssignment = !!ticket.assignedTo;

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        title={hasAssignment ? "Change assignee" : "Assign to an admin"}
        onClick={() => setIsOpen(true)}
        className="text-muted-foreground hover:text-primary"
      >
        {hasAssignment ? (
          <RiUserSharedLine aria-hidden="true" />
        ) : (
          <RiUserAddLine aria-hidden="true" />
        )}
        <span className="sr-only">
          {hasAssignment ? "Change assignee" : "Assign to an admin"}
        </span>
      </Button>
      <Modal
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        title="Assign Ticket"
        description={`Assign "${ticket.title}" to an admin`}
      >
        <Separator />
        <div className="px-2 space-y-4">
          <AlertBox
            showAlert={!!(actionData && !actionData?.success)}
            title="Error"
            description={
              actionData?.message || "An error occurred. Please try again."
            }
            variant="destructive"
          />
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted-foreground">
              Assignee
            </label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="w-full border focus:outline-lightBlue focus:ring-lightBlue">
                <SelectValue placeholder="Select an admin">
                  {admins.find((admin) => admin._id === selected)?.name ??
                    "Select an admin"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {admins.map((admin) => (
                  <SelectItem key={admin._id} value={admin._id}>
                    {admin.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Only admins can be assigned to a ticket.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          {hasAssignment && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isSubmitting}
              onClick={handleUnassign}
            >
              Unassign
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <ActionBtn
            text="Assign"
            type="button"
            size="sm"
            loading={isSubmitting}
            disabled={!selected || selected === ticket.assignedTo?._id}
            onClick={handleAssign}
            classname="btn"
          />
        </div>
      </Modal>
    </>
  );
}