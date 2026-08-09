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

interface UpdateProfileProps {
  activeForm: "profile-form" | "password-form" | "privacy-form" | "bank-form" | undefined;
  setActiveForm: (
    form: "profile-form" | "password-form" | "privacy-form" | "bank-form" | undefined,
  ) => void;
  user: SessionUser;
}

export default function UpdateProfile({
  activeForm,
  setActiveForm,
  user,
}: UpdateProfileProps) {
  const fetcher = useFetcher({ key: activeForm });
  const profileForm = useForm<
    z.input<typeof updateProfileSchema>,
    any,
    UpdateProfileSchemaType
  >({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: user?.name,
      phone: user?.phone,
      gender: (user?.gender as "male" | "female" | "other") || "",
      occupation: user.occupation,
      location: user.location,
      dateOfBirth: (user.dateOfBirth
        ? new Date(user.dateOfBirth).toISOString().split("T")[0]
        : "") as any,
    },
    mode: "onChange",
  });

  const filterProfileFields = formFields.filter((field) =>
    [
      "name",
      "phone",
      "gender",
      "occupation",
      "location",
      "dateOfBirth",
    ].includes(field.name),
  );

  const actionData = fetcher.data as
    { success?: boolean; message?: string; body?: any } | undefined;

  useEffect(() => {
    if (actionData?.success && activeForm === "profile-form") {
      toast.success(actionData.message);
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
        Profile Details
      </h2>
      <Card
        onClick={() => setActiveForm("profile-form")}
        onKeyDown={(e) => e.key === "Enter" && setActiveForm("profile-form")}
        role="button"
        tabIndex={0}
        className={cn("dark:bg-lightGray", activeForm === "profile-form" && "border border-mainBlue")}
      >
        <CardContent>
          <fetcher.Form
            id="profile-form"
            onSubmit={profileForm.handleSubmit(onFormSubmit)}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              {filterProfileFields.map((field) => (
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
