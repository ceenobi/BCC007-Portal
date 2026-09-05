import {
	RiCheckboxCircleFill,
	RiMailSendFill,
	RiSpam2Fill,
} from "@remixicon/react";
import { useFetcher, useNavigate } from "react-router";
import { resendVerifyEmail } from "~/.server/actions/auth";
import { PageSection } from "~/components/provider/page-wrapper";
import ActionBtn from "~/components/ui/action-btn";
import { AlertBox } from "~/components/ui/alert-box";
import { buildSeoMeta } from "~/lib/seo";
import { sessionMiddleware, userContext } from "~/middleware/auth.middleware";
import type { SessionUser } from "~/types";
import type { Route } from "./+types/route";
export const middleware = [sessionMiddleware];

export function meta(_args: Route.MetaArgs) {
	return [
		...buildSeoMeta({
			title: "Verify email - BCC007",
			description:
				"Complete your BCC007 registration by verifying your email address.",
			path: "/auth/verify-email",
			noindex: true,
		}),
	];
}

export async function action({ request, context }: Route.ActionArgs) {
	const url = new URL(request.url);
	const email = url.searchParams.get("email");
	const user = context.get(userContext);
	return await resendVerifyEmail(request, email ?? user?.email ?? "");
}

export async function loader({ context }: Route.LoaderArgs) {
	const user = context.get(userContext);
	if (!user) {
		throw Response.json(
			{
				success: false,
				message: "Unauthorized",
			},
			{ status: 401 },
		);
	}
	return { user };
}

export default function VerifyEmail({ loaderData }: Route.ComponentProps) {
	const { user } = loaderData as { user: SessionUser };
	const navigate = useNavigate();
	const fetcher = useFetcher();
	const isSubmitting = fetcher.state === "submitting";
	const actionData = fetcher.data as
		| { success?: boolean; message?: string }
		| undefined;

	return (
		<PageSection index={0} className="w-full max-w-130 mx-auto px-4">
			{user?.emailVerified ? (
				<div className="p-8 sm:p-12 text-center space-y-6">
					<div className="relative inline-block">
						<div className="absolute inset-0 bg-success/20 blur-2xl rounded-full animate-pulse" />
						<div className="relative w-24 h-24 bg-success/10 rounded-full flex items-center justify-center mx-auto border border-success/40">
							<RiCheckboxCircleFill className="text-success w-12 h-12" />
						</div>
					</div>

					<div className="space-y-3">
						<h1 className="text-xl font-bold tracking-tight text-foreground">
							Verification Successful!
						</h1>
						<p className="text-base text-muted-foreground">
							Welcome aboard{" "}
							<span className="font-medium text-foreground">{user?.name}</span>.
							Your account is now fully active.
						</p>
					</div>

					<div className="pt-4">
						<ActionBtn
							text="Go to Dashboard"
							type="button"
							classname="w-full sm:w-auto px-10 h-10.5 rounded-md font-medium btn"
							onClick={() => navigate("/dashboard")}
						/>
					</div>
				</div>
			) : (
				<div className="relative">
					{/* Status Banner */}
					<div className="px-4 py-3 flex items-center justify-center gap-2">
						<div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
						<span className="text-xs font-bold uppercase tracking-wider text-warning">
							Action Required
						</span>
					</div>

					<div className="p-3 sm:px-6 space-y-4 w-full">
						{/* Alert Handling */}
						<div className="min-h-6">
							{actionData && (
								<AlertBox
									showAlert={true}
									title={
										actionData.success ? "Verification Sent" : "Request Failed"
									}
									description={actionData.message || ""}
									variant={actionData?.success ? "success" : "destructive"}
								/>
							)}
						</div>

						<div className="text-center space-y-4">
							<div className="relative inline-block">
								<div className="absolute inset-0 bg-mainBlue/10 blur-xl rounded-full" />
								<div className="relative w-20 h-20 bg-mainBlue/10 rounded-3xl rotate-12 flex items-center justify-center mx-auto border border-mainBlue/40">
									<RiMailSendFill className="text-mainBlue dark:text-lightBlue w-10 h-10 -rotate-12" />
								</div>
							</div>

							<div className="space-y-2">
								<h3 className="text-2xl font-bold text-foreground">
									Verify your email
								</h3>
								<p className="text-sm text-muted-foreground leading-relaxed">
									We've sent a verification link to <br />
									<span className="font-medium text-foreground">
										{user?.email}
									</span>
								</p>
							</div>
						</div>

						<div className="bg-muted border rounded-md p-6 space-y-4">
							<div className="flex gap-4">
								<div className="shrink-0 w-10 h-10 rounded-md bg-card border border-border dark:border-mainGold flex items-center justify-center">
									<RiSpam2Fill size={20} className="text-foreground" />
								</div>
								<div className="space-y-1">
									<p className="text-sm font-semibold text-foreground">
										Can't find the email?
									</p>
									<p className="text-xs text-muted-foreground">
										Check your spam folder or try resending the link below.
									</p>
								</div>
							</div>
						</div>

						<div className="flex flex-col items-center gap-4">
							<fetcher.Form method="post" className="w-full">
								<ActionBtn
									text={
										isSubmitting ? "Sending Link…" : "Resend Verification Email"
									}
									type="submit"
									loading={isSubmitting}
									classname="w-full h-11 rounded-md font-bold btn"
								/>
							</fetcher.Form>
						</div>
					</div>
				</div>
			)}

			{/* Support footer */}
			<p className="mt-4 text-center text-sm text-muted-foreground">
				Need help?{" "}
				<a
					href="mailto:info@bcc007-group.org"
					className="font-medium text-mainBlue dark:text-lightBlue hover:underline"
				>
					Contact Support
				</a>
			</p>
		</PageSection>
	);
}
