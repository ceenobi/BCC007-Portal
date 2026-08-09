import { zodResolver } from "@hookform/resolvers/zod";
import { RiAddFill } from "@remixicon/react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useFetcher, useSearchParams } from "react-router";
import { toast } from "sonner";
import ActionBtn from "~/components/ui/action-btn";
import { AlertBox } from "~/components/ui/alert-box";
import { Button } from "~/components/ui/button";
import { FormBox } from "~/components/ui/form-box";
import Modal from "~/components/ui/modal";
import { Separator } from "~/components/ui/separator";
import { ticketFields } from "~/lib/constants";
import { createTicketSchema } from "~/lib/schema";
import type { CreateTicketSchemaType } from "~/types";

export default function CreateTicket() {
  const [searchParams] = useSearchParams();
  const isCreateTicket = searchParams.get("create") === "true";
  const [isOpen, setIsOpen] = useState<boolean>(false);
  // Stable per submission intent so a double-click or retried request for the
  // same intent is deduplicated server-side (never creates duplicate tickets).
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() =>
    crypto.randomUUID(),
  );
  const form = useForm({
    resolver: zodResolver(createTicketSchema),
    mode: "onChange",
  });
  const fetcher = useFetcher();
  const filterFields = ticketFields.filter((field) =>
    ["title", "description", "category", "priority"].includes(field.name),
  );
  const isSubmitting = fetcher.state === "submitting";
  const actionData = fetcher.data as
    { success?: boolean; message?: string } | undefined;

  const resetModal = () => {
    form.reset();
    setIdempotencyKey(crypto.randomUUID());
  };
  
  useEffect(() => {
    if (isCreateTicket) {
      setIsOpen(true);
    }
  }, [isCreateTicket]);

  useEffect(() => {
    if (actionData?.success) {
      toast.success(actionData.message || "Ticket created successfully");
      resetModal();
      setIsOpen(false);
    }
  }, [actionData, form]);

  useEffect(() => {
    if (isOpen) {
      fetcher.data = undefined;
    }
  }, [isOpen]);

  const onFormSubmit = (data: CreateTicketSchemaType) => {
    fetcher.submit(
      { ...data, intent: "create-ticket", idempotencyKey },
      {
        method: "post",
        action: "/dashboard/help-center",
        encType: "application/json",
      },
    );
  };

  return (
    <>
      <Button
        size="sm"
        className="tracking-tight btn"
        onClick={() => setIsOpen(true)}
      >
        <RiAddFill />
        Create Ticket
      </Button>
      <Modal
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        title="Create Ticket"
        description="Have an issue? create a support ticket"
      >
        <Separator />
        <div className="px-2 max-h-[60vh] overflow-y-auto">
          <fetcher.Form
            onSubmit={form.handleSubmit(onFormSubmit)}
            className="mt-6 space-y-4"
            id="create-ticket"
          >
            <AlertBox
              showAlert={!!(actionData && !actionData?.success)}
              title="Error"
              description={
                actionData?.message || "An error occurred. Please try again."
              }
              variant="destructive"
            />
            {filterFields.map((field) => (
              <FormBox
                key={field.name}
                label={field.label}
                type={field.type}
                placeholder={field.placeholder}
                id={field.name}
                register={form.register}
                errors={
                  form.formState.errors[
                    field.name as keyof CreateTicketSchemaType
                  ]
                }
                control={form.control}
                name={field.name as keyof CreateTicketSchemaType}
                options={(field as any).options}
                classname="w-full"
              />
            ))}
          </fetcher.Form>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setIsOpen(false);
              form.reset();
            }}
          >
            Cancel
          </Button>
          <ActionBtn
            form="create-ticket"
            text="Create Ticket"
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
