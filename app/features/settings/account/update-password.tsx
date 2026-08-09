import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm, type FieldError } from "react-hook-form";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import { Card, CardContent } from "~/components/ui/card";
import { FormBox } from "~/components/ui/form-box";
import { formFields } from "~/lib/constants";
import { changePasswordSchema } from "~/lib/schema";
import { cn } from "~/lib/utils";
import type { ChangePasswordSchemaType, SessionUser } from "~/types";

interface UpdatePasswordProps {
  activeForm: "profile-form" | "password-form" | "privacy-form" | "bank-form" | undefined;
  setActiveForm: (
    form: "profile-form" | "password-form" | "privacy-form" | "bank-form" | undefined,
  ) => void;
  user: SessionUser;
}

export default function UpdatePassword({
  activeForm,
  setActiveForm,
  user,
}: UpdatePasswordProps) {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const fetcher = useFetcher({ key: activeForm });
  const passwordForm = useForm<ChangePasswordSchemaType>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  const filterPasswordFields = formFields.filter((field) =>
    ["currentPassword", "newPassword", "confirmPassword"].includes(field.name),
  );

  const actionData = fetcher.data as
    { success?: boolean; message?: string; body?: any } | undefined;

  useEffect(() => {
    if (actionData?.success && activeForm === "password-form") {
      toast.success(actionData.message);
      setActiveForm(undefined);
      fetcher.reset();
    }
  }, [actionData, activeForm, fetcher]);

  const onFormSubmit = (data: ChangePasswordSchemaType) => {
    const formData = {
      ...data,
      intent: "update-password",
    };
    fetcher.submit(formData, {
      method: "post",
      action: "/dashboard/settings",
      encType: "application/json",
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold leading-snug text-mainBlack dark:text-white">
        Update password
      </h2>
      <Card
        onClick={() => setActiveForm("password-form")}
        onKeyDown={(e) => e.key === "Enter" && setActiveForm("password-form")}
        role="button"
        tabIndex={0}
        className={cn(
          "dark:bg-lightGray",
          activeForm === "password-form" && "border border-mainBlue",
        )}
      >
        <CardContent>
          <fetcher.Form
            id="password-form"
            onSubmit={passwordForm.handleSubmit(onFormSubmit)}
          >
            <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              {filterPasswordFields.map((field) => (
                <FormBox
                  key={field.name}
                  label={field.label}
                  type={field.type}
                  placeholder={field.placeholder}
                  id={field.name}
                  register={passwordForm.register}
                  control={passwordForm.control}
                  errors={
                    passwordForm.formState.errors[
                      field.name as keyof ChangePasswordSchemaType
                    ] as FieldError | undefined
                  }
                  name={field.name as keyof ChangePasswordSchemaType}
                  isVisible={isVisible}
                  setIsVisible={setIsVisible}
                />
              ))}
            </div>
            <p className="mt-1 text-[11px] font-medium text-muted-foreground">
              Updating your password will log you out of all your sessions.
            </p>
          </fetcher.Form>
        </CardContent>
      </Card>
    </div>
  );
}
