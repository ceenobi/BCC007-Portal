import { RiDeleteBin3Line, RiErrorWarningLine } from "@remixicon/react";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import ActionBtn from "~/components/ui/action-btn";
import { Button } from "~/components/ui/button";
import Modal from "~/components/ui/modal";
import { Separator } from "~/components/ui/separator";
import type { ExpenseData } from "~/types";

export default function DeleteExpense({ expense }: { expense: ExpenseData }) {
  const [isOpen, setIsOpen] = useState(false);
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === "submitting";

  const actionData = fetcher.data as
    | { success?: boolean; message?: string }
    | undefined;

  useEffect(() => {
    if (actionData?.success) {
      toast.success(actionData.message || "Expense deleted successfully");
    } else if (actionData && !actionData.success) {
      toast.error(actionData.message || "Something went wrong");
    }
  }, [actionData]);

  const confirmDelete = () => {
    fetcher.submit(
      {
        intent: "delete-expense",
        expenseId: expense._id,
      },
      {
        method: "post",
        encType: "application/json",
        action: "/dashboard/expenses",
      },
    );
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        aria-label="Delete expense"
        className="gap-1.5 text-destructive hover:bg-destructive/10"
      >
        <RiDeleteBin3Line className="size-4" />
      </Button>
      <Modal
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        title="Delete expense"
        description={`Permanently delete "${expense.title}"? This cannot be undone.`}
      >
        <Separator />
        <div className="space-y-4 p-2">
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <RiErrorWarningLine size={16} className="mt-0.5 shrink-0" />
            <span>
              The expense record will be permanently removed from the treasury.
            </span>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <ActionBtn
              type="button"
              onClick={confirmDelete}
              variant="destructive"
              size="sm"
              text="Delete Expense"
              loading={isSubmitting}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}