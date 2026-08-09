import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import type { FieldError } from "react-hook-form";
import { useForm } from "react-hook-form";
import { useFetcher } from "react-router";
import { toast } from "sonner";
import { z } from "zod";
import { Card, CardContent } from "~/components/ui/card";
import { FormBox } from "~/components/ui/form-box";
import { formFields } from "~/lib/constants";
import { updateProfileSchema } from "~/lib/schema";
import { cn } from "~/lib/utils";
import type { SessionUser, UpdateProfileSchemaType } from "~/types";

interface UpdatePrivacyProps {
  activeForm: "profile-form" | "password-form" | "privacy-form" | "bank-form" | undefined;
  setActiveForm: (
    form: "profile-form" | "password-form" | "privacy-form" | "bank-form" | undefined,
  ) => void;
  user: SessionUser;
}

export default function Privacy({
  activeForm,
  setActiveForm,
  user,
}: UpdatePrivacyProps) {
  const fetcher = useFetcher({ key: activeForm });
  const profileForm = useForm<
    z.input<typeof updateProfileSchema>,
    any,
    UpdateProfileSchemaType
  >({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      disableBirthDate: user.disableBirthDate,
      disableEmail: user.disableEmail,
      disableGender: user.disableGender,
    },
    mode: "onChange",
  });

  const filterPrivacyFields = formFields.filter((field) =>
    ["disableBirthDate", "disableEmail", "disableGender"].includes(field.name),
  );

  const actionData = fetcher.data as
    { success?: boolean; message?: string; body?: any } | undefined;

  useEffect(() => {
    if (actionData?.success && activeForm === "privacy-form") {
      toast.success("Privacy settings updated successfully");
      setActiveForm(undefined);
      fetcher.reset();
    }
  }, [actionData, activeForm, fetcher]);

  const onFormSubmit = (data: UpdateProfileSchemaType) => {
    const formData = {
      ...data,
      dateOfBirth: data.dateOfBirth
        ? new Date(data.dateOfBirth).toISOString().split("T")[0]
        : "",
      intent: "update-profile",
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
        Privacy
      </h2>
      <Card
        onClick={() => setActiveForm("privacy-form")}
        onKeyDown={(e) => e.key === "Enter" && setActiveForm("privacy-form")}
        role="button"
        tabIndex={0}
        className={cn(
          "dark:bg-lightGray",
          activeForm === "privacy-form" && "border border-mainBlue",
        )}
      >
        <CardContent>
          <fetcher.Form
            id="privacy-form"
            onSubmit={profileForm.handleSubmit(onFormSubmit)}
          >
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              {filterPrivacyFields.map((field) => (
                <FormBox
                  key={field.name}
                  label={field.label}
                  type={field.type}
                  placeholder={field.placeholder}
                  id={field.name}
                  register={profileForm.register}
                  control={profileForm.control}
                  errors={
                    profileForm.formState.errors[
                      field.name as keyof UpdateProfileSchemaType
                    ] as FieldError | undefined
                  }
                  name={field.name as keyof UpdateProfileSchemaType}
                  options={field.options}
                  classname={field.type === "select" ? "py-6" : undefined}
                />
              ))}
            </div>
          </fetcher.Form>
        </CardContent>
      </Card>
    </div>
  );
}
