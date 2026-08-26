import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useFetcher } from "react-router";
import { toast } from "sonner";
import type { z } from "zod";
import { forgotPasswordRequest } from "~/.server/actions/auth";
import { PageSection } from "~/components/provider/page-wrapper";
import ActionBtn from "~/components/ui/action-btn";
import { AlertBox } from "~/components/ui/alert-box";
import { FormBox } from "~/components/ui/form-box";
import { formFields } from "~/lib/constants";
import { forgotPasswordSchema } from "~/lib/schema";
import { buildSeoMeta } from "~/lib/seo";
import type { Route } from "./+types/route";

type ForgotPasswordSchemaType = z.infer<typeof forgotPasswordSchema>;

export function meta(_args: Route.MetaArgs) {
	return [
		...buildSeoMeta({
			title: "Recover account - BCC007",
			description:
				"Recover access to your BCC007 account. We'll send a reset link to your registered email address.",
			path: "/auth/forgot-password",
			noindex: true,
		}),
	];
}

export async function action({ request }: Route.ActionArgs) {
	const payload = await request.json();
	return await forgotPasswordRequest(request, payload);
}

export default function ForgotPassword() {
	const filterFields = formFields.filter((field) =>
		["email"].includes(field.name),
	);
	const {
		handleSubmit,
		register,
		reset,
		formState: { errors, submitCount },
	} = useForm<ForgotPasswordSchemaType>({
		resolver: zodResolver(forgotPasswordSchema),
	});
	const fetcher = useFetcher();
	const isSubmitting = fetcher.state === "submitting";

	const actionData = fetcher.data as
		| { success?: boolean; message?: string }
		| undefined;

	useEffect(() => {
		if (actionData?.success === true) {
			toast.success(actionData.message);
			reset({
				email: "",
			});
		}
	}, [actionData, reset]);

	const onFormSubmit = (data: ForgotPasswordSchemaType) => {
		fetcher.submit(data, {
			method: "post",
			action: "/auth/forgot-password",
			encType: "application/json",
		});
	};

	return (
		<PageSection index={0}>
			<div className="space-y-3">
				<h1 className="text-3xl font-medium sm:leading-none">
					Forgot password
				</h1>
				<h2 className="text-sm text-foreground font-medium">
					Let's help you get back into your account. Enter your email below to
					receive a reset link.
				</h2>
			</div>
			<fetcher.Form
				onSubmit={handleSubmit(onFormSubmit)}
				className="mt-6 xl:mt-10 space-y-2"
			>
				<AlertBox
					showAlert={!!(actionData && !actionData?.success)}
					resetKey={submitCount}
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
						errors={errors[field.name as keyof ForgotPasswordSchemaType]}
						name={field.name as keyof ForgotPasswordSchemaType}
					/>
				))}
				<ActionBtn
					text="Get Reset Link"
					type="submit"
					loading={isSubmitting}
					classname="mt-1 w-full h-10 btn"
				/>
			</fetcher.Form>
			<div className="flex items-center justify-center gap-2 mt-10">
				<p className="text-[13px] text-muted-foreground">
					Have an account?{" "}
					<Link
						to="/auth/login"
						className="font-normal text-mainBlue dark:text-white underline"
					>
						Sign In
					</Link>
				</p>
			</div>
		</PageSection>
	);
}
