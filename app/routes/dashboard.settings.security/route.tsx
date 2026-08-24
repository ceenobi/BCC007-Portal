import { useOutletContext } from "react-router";
import {
	changeEmailRequest,
	listUserSessions,
	requestDeleteAccount,
	revokeUserSession,
} from "~/.server/actions/auth";
import { auth } from "~/.server/services/better-auth";
import { PageSection } from "~/components/provider/page-wrapper";
import ChangeEmail from "~/features/settings/security/change-email";
import DeleteAccount from "~/features/settings/security/delete-account";
import Sessions from "~/features/settings/security/sessions";
import type { SessionUser } from "~/types";
import type { Route } from "./+types/route";

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: "Security Settings | BCC007" },
		{
			name: "description",
			content: "Manage your security settings and session management.",
		},
	];
}

export async function action({ request }: Route.ActionArgs) {
	const payload = await request.json();
	if (payload.intent === "change-email") {
		return await changeEmailRequest(request, payload);
	}
	if (payload.intent === "revoke-session") {
		return await revokeUserSession(request, { token: payload.token });
	}
	if (payload.intent === "delete-account") {
		return await requestDeleteAccount(request);
	}
}

export async function loader({ request }: Route.LoaderArgs) {
	const [sessionsResponse, currentSessionResponse] = await Promise.all([
		listUserSessions(request),
		auth.api.getSession({ headers: request.headers, asResponse: true }),
	]);

	const sessionsData = await sessionsResponse.json();
	const currentSession = await currentSessionResponse.json();

	return {
		sessions: sessionsData.success ? sessionsData.body : [],
		currentSessionId: currentSession?.session?.id,
	};
}

export default function Security({ loaderData }: Route.ComponentProps) {
	const { sessions, currentSessionId } = loaderData;
	const { user } = useOutletContext() as { user: SessionUser };
	return (
		<PageSection index={1} className="space-y-6 px-4 xl:px-8">
			<div className="space-y-0.5">
				<h1 className="hidden lg:block text-xl font-semibold tracking-tight leading-tight text-foreground">
					Security
				</h1>
				<p className="text-sm text-mainGray dark:text-muted-foreground">
					Your security settings, change email, manage sessions and revoke
					access.
				</p>
			</div>
			<ChangeEmail />
			<Sessions sessions={sessions} currentSessionId={currentSessionId} />
			<DeleteAccount user={user} />
		</PageSection>
	);
}
