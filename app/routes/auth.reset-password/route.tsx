import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useFetcher, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import type { z } from "zod";
import { resetPasswordRequest } from "~/.server/actions/auth";
import { PageSection } from "~/components/provider/page-wrapper";
import ActionBtn from "~/components/ui/action-btn";
import { AlertBox } from "~/components/ui/alert-box";
import { FormBox } from "~/components/ui/form-box";
import { formFields } from "~/lib/constants";
import { resetPasswordSchema } from "~/lib/schema";
import { buildSeoMeta } from "~/lib/seo";
import type { Route } from "./+types/route";
type ResetPasswordSchemaType = z.infer<typeof resetPasswordSchema>;

export function meta({}: Route.MetaArgs) {
  return [
    ...buildSeoMeta({
      title: "Reset password - BCC007",
      description:
        "Set a new password for your BCC007 account and regain secure access to the alumni platform.",
      path: "/auth/reset-password",
      noindex: true,
    }),
  ];
}

export async function action({ request }: Route.ActionArgs) {
  const payload = await request.json();
  return await resetPasswordRequest(request, payload);
}

export default function ResetPassword() {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const filterFields = formFields.filter((field) =>
    ["newPassword"].includes(field.name),
  );
  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm<ResetPasswordSchemaType>({
    resolver: zodResolver(resetPasswordSchema),
  });
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const isSubmitting = fetcher.state === "submitting";

  const actionData = fetcher.data as
    { success?: boolean; message?: string } | undefined;

  useEffect(() => {
    if (actionData?.success === true) {
      toast.success(actionData.message);
      navigate("/auth/login", { replace: true });
    }
  }, [actionData, navigate]);

  const onFormSubmit = (data: ResetPasswordSchemaType) => {
    if (!token) {
      toast.error("Token not provided", {
        id: "passwordReset",
      });
      return;
    }
    fetcher.submit(data, {
      method: "post",
      action: `/auth/reset-password?token=${token}`,
      encType: "application/json",
    });
  };

  return (
    <PageSection index={0} className="px-8 w-full">
      <div className="space-y-3">
        <h1 className="text-3xl font-medium sm:leading-none">Reset password</h1>
        <h2 className="text-sm text-foreground font-medium">
          Enter your new password below
        </h2>
      </div>
      <fetcher.Form
        onSubmit={handleSubmit(onFormSubmit)}
        className="mt-6 xl:mt-10 space-y-2"
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
            register={register}
            errors={errors[field.name as keyof ResetPasswordSchemaType]}
            name={field.name as keyof ResetPasswordSchemaType}
            isVisible={isVisible}
            setIsVisible={setIsVisible}
          />
        ))}
        <ActionBtn
          text="Reset"
          type="submit"
          loading={isSubmitting}
          classname="mt-1 w-full h-10 btn"
        />
      </fetcher.Form>
    </PageSection>
  );
}
