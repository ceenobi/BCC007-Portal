import { zodResolver } from "@hookform/resolvers/zod";
import {
  RiAddFill,
  RiErrorWarningLine,
} from "@remixicon/react";
import { useEffect, useState } from "react";
import { useForm, type FieldError } from "react-hook-form";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import z from "zod";import ActionBtn from "~/components/ui/action-btn";
import { Button } from "~/components/ui/button";
import { FormBox } from "~/components/ui/form-box";
import Modal from "~/components/ui/modal";
import { Separator } from "~/components/ui/separator";
import { expenseCategory } from "~/lib/constants";
import { createExpenseSchema } from "~/lib/schema";
import type { CreateExpenseSchemaType } from "~/types";

const categoryOptions = expenseCategory.map((c) => ({
  id: c.value,
  name: c.label,
}));

export default function CreateExpense() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  // Stable per submission intent so a double-click or retried request for the
  // same intent is deduplicated server-side (never creates duplicate
  // expenses).
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() =>
    crypto.randomUUID(),
  );
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === "submitting";
  const {
    handleSubmit,
    register,
    control,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof createExpenseSchema>, any, CreateExpenseSchemaType>({
    resolver: zodResolver(createExpenseSchema),
    mode: "onChange",
  });

  const actionData = fetcher.data as
    | { success?: boolean; message?: string }
    | undefined;

  const rootError = errors.root as
    | { message?: string }
    | Array<{ message?: string }>
    | undefined;
  const rootErrorMessage =
    (Array.isArray(rootError) ? rootError[0]?.message : rootError?.message) ??
    (errors as Record<string, { message?: string } | undefined>)[""]?.message;

  useEffect(() => {
    if (actionData?.success) {
      toast.success(actionData.message || "Expense created successfully");
      fetcher.reset();
      reset();
      setIsOpen(false);
      setIdempotencyKey(crypto.randomUUID());
    } else if (actionData && !actionData.success) {
      toast.error(actionData.message || "Something went wrong");
    }
  }, [actionData]);

  const onFormSubmit = (data: CreateExpenseSchemaType) => {
    const payload = {
      intent: "create-expense",
      ...data,
      idempotencyKey,
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
        className="tracking-tight btn"
        onClick={() => setIsOpen(true)}
      >
        <RiAddFill />
        Create Expense
      </Button>
      <Modal
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        title="Create Expense"
        description="Record a treasury expense"
      >
        <Separator />
        <div className="px-2 max-h-[60vh] overflow-y-auto">
          <fetcher.Form
            onSubmit={handleSubmit(onFormSubmit)}
            className="mt-6 space-y-4"
            id="create-expense-form"
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
          </fetcher.Form>
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
            form="create-expense-form"
            text="Create Expense"
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
