import { zodResolver } from "@hookform/resolvers/zod";
import { RiEditLine, RiErrorWarningLine } from "@remixicon/react";
import { useEffect, useState } from "react";
import { useForm, type FieldError } from "react-hook-form";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import z from "zod";
import ActionBtn from "~/components/ui/action-btn";
import { Button } from "~/components/ui/button";
import { FormBox } from "~/components/ui/form-box";
import Modal from "~/components/ui/modal";
import { Separator } from "~/components/ui/separator";
import { expenseCategory, expenseStatus } from "~/lib/constants";
import { updateExpenseSchema } from "~/lib/schema";
import type { ExpenseData, UpdateExpenseSchemaType } from "~/types";

const categoryOptions = expenseCategory.map((c) => ({
  id: c.value,
  name: c.label,
}));

const statusOptions = expenseStatus.map((s) => ({
  id: s.value,
  name: s.label,
}));

export default function EditExpense({ expense }: { expense: ExpenseData }) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === "submitting";

  const defaultValues = {
    title: expense.title,
    description: expense.description ?? "",
    amount: expense.amount,
    category: expense.category,
    status: expense.status,
  };

  const {
    handleSubmit,
    register,
    control,
    reset,
    formState: { errors },
  } = useForm<
    z.input<typeof updateExpenseSchema>,
    any,
    UpdateExpenseSchemaType
  >({
    resolver: zodResolver(updateExpenseSchema),
    mode: "onChange",
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expense._id]);

  const actionData = fetcher.data as
    { success?: boolean; message?: string } | undefined;

  const rootError = errors.root as
    { message?: string } | Array<{ message?: string }> | undefined;
  const rootErrorMessage =
    (Array.isArray(rootError) ? rootError[0]?.message : rootError?.message) ??
    (errors as Record<string, { message?: string } | undefined>)[""]?.message;

  useEffect(() => {
    if (actionData?.success) {
      toast.success(actionData.message || "Expense updated successfully");
      setIsOpen(false);
    } else if (actionData && !actionData.success) {
      toast.error(actionData.message || "Something went wrong");
    }
  }, [actionData]);

  const onFormSubmit = (data: UpdateExpenseSchemaType) => {
    const payload: Record<string, unknown> = {
      intent: "update-expense",
      expenseId: expense._id,
      ...data,
    };
    fetcher.submit(payload as any, {
      method: "post",
      encType: "application/json",
      action: "/dashboard/expenses",
    });
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setIsOpen(true)}
        aria-label={`Edit expense: ${expense.title}`}
        className="gap-1"
      >
        <RiEditLine className="size-4" />
      </Button>
      <Modal
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        title={`Edit Expense - ${expense.title}`}
        description="Edit the expense details"
      >
        <Separator />
        <div className="px-2 max-h-[60vh] overflow-y-auto">
          <form
            onSubmit={handleSubmit(onFormSubmit)}
            className="mt-6 space-y-4"
            id="edit-expense-form"
          >
            {rootErrorMessage && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <RiErrorWarningLine size={16} className="mt-0.5 shrink-0" />
                <span>{rootErrorMessage}</span>
              </div>
            )}
            <FormBox
              label="Title"
              type="text"
              placeholder="Expense title"
              id="title"
              register={register}
              errors={errors.title}
              name="title"
            />
            <FormBox
              label="Description"
              type="textarea"
              placeholder="Describe the expense (optional)"
              id="description"
              register={register}
              errors={errors.description}
              name="description"
              classname="[&_textarea]:min-h-24"
            />
            <FormBox
              label="Amount (₦)"
              type="number"
              placeholder="0"
              id="amount"
              register={register}
              errors={errors.amount as FieldError | undefined}
              name="amount"
              registerOptions={{ valueAsNumber: true }}
            />
            <FormBox
              label="Category"
              type="select"
              placeholder="Select category"
              id="category"
              register={register}
              errors={errors.category}
              name="category"
              control={control}
              inputType="select"
              options={categoryOptions}
            />
            <FormBox
              label="Status"
              type="radio"
              placeholder="Select status"
              id="status"
              register={register}
              errors={errors.status}
              name="status"
              control={control}
              options={statusOptions}
            />
          </form>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <ActionBtn
            form="edit-expense-form"
            text="Save Changes"
            type="submit"
            size="sm"
            loading={isSubmitting}
            classname="btn"
          />
        </div>
      </Modal>
    </>
  );
}
