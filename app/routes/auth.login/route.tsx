import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { Link, useFetcher, useNavigate } from "react-router";
import { toast } from "sonner";
import { signInWithEmail } from "~/.server/actions/auth";
import { PageSection } from "~/components/provider/page-wrapper";
import ActionBtn from "~/components/ui/action-btn";
import { AlertBox } from "~/components/ui/alert-box";
import { FormBox } from "~/components/ui/form-box";
import { formFields } from "~/lib/constants";
import { signInSchema } from "~/lib/schema";
import type { SignInSchemaType } from "~/types";
import type { Route } from "./+types/route";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "BCC007 - Account Login" },
    { name: "description", content: `BCC007 - Account Login` },
  ];
}

export async function action({ request }: Route.ActionArgs) {
  const payload = await request.json();
  return await signInWithEmail(request, payload as SignInSchemaType);
}

export default function Login() {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const filterFields = formFields.filter((field) =>
    ["email", "password"].includes(field.name),
  );
  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm<SignInSchemaType>({
    resolver: zodResolver(signInSchema),
    mode: "onChange",
  });
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const isSubmitting = fetcher.state === "submitting";
  const actionData = fetcher.data as
    { success?: boolean; message?: string; email?: string } | undefined;

  useEffect(() => {
    if (actionData?.success === true) {
      toast.success(actionData.message);
      navigate("/dashboard", {
        replace: true,
      });
    }
  }, [actionData, navigate]);

  const onFormSubmit: SubmitHandler<SignInSchemaType> = (data) => {
    fetcher.submit(data, {
      method: "post",
      action: "/auth/login",
      encType: "application/json",
    });
  };

  return (
    <PageSection index={0} className="px-8 w-full">
      <div className="space-y-3">
        <h1 className="text-3xl font-medium sm:leading-none">Welcome back</h1>
        <h2 className="text-sm text-foreground font-medium">
          Sign in to your account
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
            errors={errors[field.name as keyof SignInSchemaType]}
            name={field.name as keyof SignInSchemaType}
            isVisible={isVisible}
            setIsVisible={setIsVisible}
          />
        ))}
        <ActionBtn
          text="Sign In"
          type="submit"
          loading={isSubmitting}
          classname="mt-1 w-full h-10 btn"
        />
      </fetcher.Form>
      <p className="mt-4 text-center text-[13px] text-muted-foreground">
        <Link
          to="/auth/forgot-password"
          className="font-normal text-mainGray dark:text-white underline hover:opacity-90"
        >
          Forgot password
        </Link>
      </p>
      <div className="flex items-center justify-center gap-2 mt-10">
        <p className="text-[13px] text-muted-foreground">
          Don't have an account?{" "}
          <Link
            to="/auth/register"
            className="font-normal text-mainBlue dark:text-white underline"
          >
            Sign Up
          </Link>
        </p>
      </div>
      <p className="mt-10 xl:mt-14 text-xs text-mainGray dark:text-muted-foreground text-center text-balance">
        By continuing, you agree to BCC007's{" "}
        <Link to="/terms" className="underline cursor-pointer">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link to="/privacy" className="underline cursor-pointer">
          Privacy Policy
        </Link>
        , and to receive periodic emails with updates.
      </p>
    </PageSection>
  );
}
