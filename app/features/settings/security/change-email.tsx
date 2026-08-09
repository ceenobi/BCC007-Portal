import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import ActionBtn from "~/components/ui/action-btn";
import { Card, CardContent } from "~/components/ui/card";
import { FormBox } from "~/components/ui/form-box";
import { formFields } from "~/lib/constants";
import { ChangeEmailSchema } from "~/lib/schema";
import type { ChangeEmailSchemaType } from "~/types";

export default function ChangeEmail() {
  const fetcher = useFetcher();
  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm<ChangeEmailSchemaType>({
    resolver: zodResolver(ChangeEmailSchema),
    mode: "onChange",
  });
  const filterFields = formFields.filter((field) =>
    ["newEmail"].includes(field.name),
  );

  const actionData = fetcher.data as
    { success?: boolean; message?: string; body?: any } | undefined;

  useEffect(() => {
    if (actionData?.success) {
      toast.success(actionData.message);
      fetcher.reset();
    }
  }, [actionData, fetcher]);

  const onFormSubmit = (data: ChangeEmailSchemaType) => {
    const formData = {
      ...data,
      intent: "change-email",
    };
    fetcher.submit(formData, {
      method: "post",
      action: "/dashboard/settings/security",
      encType: "application/json",
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold leading-snug text-mainBlack dark:text-white">
        Change Email
      </h2>
      <Card className="dark:bg-lightGray">
        <CardContent>
          <fetcher.Form
            onSubmit={handleSubmit(onFormSubmit)}
            className="w-full max-w-xl space-y-4"
          >
            <div>          
            {filterFields.map((field) => (
              <FormBox
                key={field.name}
                label={field.label}
                type={field.type}
                placeholder={field.placeholder}
                id={field.name}
                register={register}
                errors={errors[field.name as keyof ChangeEmailSchemaType]}
                name={field.name as keyof ChangeEmailSchemaType}
              />
            ))}
            <p className="text-xs text-mainGray dark:text-muted-foreground">
              You will receive an email with a link to verify your new email
              address.
            </p>
            </div>
            <ActionBtn
              text="Update"
              type="submit"
              size="sm"
              disabled={fetcher.state !== "idle"}
              loading={fetcher.state !== "idle"}
              classname="btn"
            />
          </fetcher.Form>
        </CardContent>
      </Card>
    </div>
  );
}
