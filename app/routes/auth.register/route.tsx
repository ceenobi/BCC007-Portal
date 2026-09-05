import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { Link, useFetcher, useSearchParams } from "react-router";
import { toast } from "sonner";
import { signUpWithEmail } from "~/.server/actions/auth";
import { PageSection } from "~/components/provider/page-wrapper";
import ActionBtn from "~/components/ui/action-btn";
import { AlertBox } from "~/components/ui/alert-box";
import { FormBox } from "~/components/ui/form-box";
import { formFields } from "~/lib/constants";
import { signUpSchema } from "~/lib/schema";
import { buildSeoMeta } from "~/lib/seo";
import type { SignUpSchemaType } from "~/types";
import type { Route } from "./+types/route";

export function meta(_args: Route.MetaArgs) {
	return [
		...buildSeoMeta({
			title: "Create Account - BCC007",
			description:
				"Create your BCC007 account to join the alumni community and manage payments, transfers and events.",
			path: "/auth/register",
			noindex: true,
		}),
	];
}

export async function action({ request }: Route.ActionArgs) {
	const payload = await request.json();
	return await signUpWithEmail(request, payload as SignUpSchemaType);
}

export default function Register() {
	const [isVisible, setIsVisible] = useState<boolean>(false);
	const filterFields = formFields.filter((field) =>
		["name", "email", "password", "inviteCode"].includes(field.name),
	);
	const [searchParams] = useSearchParams();
	const role = searchParams.get("role");
	const inviteCodeFromUrl =
		searchParams.get("inviteCode")?.toUpperCase().trim() ?? "";

	const {
		handleSubmit,
		register,
		reset,
		formState: { errors, submitCount },
	} = useForm<SignUpSchemaType>({
		resolver: zodResolver(signUpSchema),
		mode: "onChange",
		defaultValues: {
			inviteCode: inviteCodeFromUrl,
		},
	});
	const fetcher = useFetcher();
	const isSubmitting = fetcher.state === "submitting";
	const actionData = fetcher.data as
		| { success?: boolean; message?: string; email?: string }
		| undefined;

	useEffect(() => {
		if (actionData?.success === true) {
			toast.success(actionData.message);
			reset({
				inviteCode: "",
			});
			// navigate(`/auth/verify-email?email=${actionData.email}`, {
			// 	replace: true,
			// 	state: {
			// 		email: actionData.email,
			// 	},
			// });
		}
	}, [actionData, reset]);

	const onFormSubmit: SubmitHandler<SignUpSchemaType> = (data) => {
		fetcher.submit(data, {
			method: "post",
			action: `/auth/register?role=${role}`,
			encType: "application/json",
		});
	};

	return (
		<PageSection index={0}>
			<div className="space-y-3">
				<h1 className="text-3xl font-medium sm:leading-none">Get started</h1>
				<h2 className="text-sm text-foreground font-medium">
					Create a new account
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
						errors={errors[field.name as keyof SignUpSchemaType]}
						name={field.name as keyof SignUpSchemaType}
						isVisible={isVisible}
						setIsVisible={setIsVisible}
					/>
				))}
				<ActionBtn
					text="Register"
					type="submit"
					loading={isSubmitting}
					classname="mt-1 w-full h-10 btn"
				/>
				<p className="mt-2 text-center text-xs text-muted-foreground">
					InviteCode is unique and valid for a single registration session only.
				</p>
			</fetcher.Form>
			<div className="flex items-center justify-center gap-2 mt-7">
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
			<p className="mt-7 xl:mt-14 text-xs text-mainGray dark:text-muted-foreground text-center text-balance">
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
