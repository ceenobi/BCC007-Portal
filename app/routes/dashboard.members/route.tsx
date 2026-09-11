import { useOutletContext } from "react-router";
import { sendInviteCode, updateMemberRole } from "~/.server/actions/auth";
import { PageSection, PageWrapper } from "~/components/provider/page-wrapper";
import NotFound from "~/components/ui/not-found";
import Search from "~/components/ui/search";
import { MembersSkeleton } from "~/components/ui/skeleton-ui";
import { hasPermission } from "~/lib/rbac";
import { requirePermission } from "~/middleware/auth.middleware";
import {
	clientAuthenticatedMiddleware,
	clientRequirePermission,
} from "~/middleware/client-auth";
import type { MembersQueryResult } from "~/queries/members";
import type { SendInviteCodeSchemaType, SessionUser } from "~/types";
import InviteMember from "../../features/members/invite-member";
import MembersList from "../../features/members/members-list";
import type { Route } from "./+types/route";

export const middleware = [requirePermission("MANAGE_MEMBERS", "action")];

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: "Members - Manage BCC007 Pay members" },
		{
			name: "description",
			content: "Members - Manage BCC007 Pay members",
		},
	];
}


export const clientMiddleware = [
	clientAuthenticatedMiddleware,
	clientRequirePermission("MANAGE_MEMBERS", "action"),
];

export async function clientLoader({
	request,
}: Route.ClientLoaderArgs): Promise<{ members: MembersQueryResult }> {
	const url = new URL(request.url);
	const response = await fetch(
		`/api/member/get?${url.searchParams.toString()}`,
		{
			headers: { Accept: "application/json" },
		},
	);
	if (!response.ok) {
		throw new Response("Failed to load members", {
			status: response.status,
		});
	}
	const data = await response.json();
	return { members: data.body as MembersQueryResult };
}

export async function action({ request }: Route.ActionArgs) {
	const payload = await request.json();
	if (payload.intent === "update-role") {
		return await updateMemberRole(request, payload);
	} else {
		return await sendInviteCode(request, payload as SendInviteCodeSchemaType);
	}
}

export function HydrateFallback() {
	return (
		<PageWrapper>
			<PageSection index={0} className="space-y-8 px-4 xl:px-8">
				<div className="space-y-2">
					<h1 className="text-xl font-semibold tracking-tight leading-tight text-foreground">
						Members
					</h1>
					<p className="leading-snug text-sm text-mainGray dark:text-muted-foreground">
						Current members and their roles.
					</p>
				</div>
				<div className="flex justify-between items-center gap-4">
					<Search
						id="search-members"
						placeholder="Search members..."
						classname="w-fit"
					/>
				</div>
			</PageSection>
			<PageSection index={1} className="mt-4 space-y-4 px-4 xl:px-8">
				<MembersSkeleton />
			</PageSection>
		</PageWrapper>
	);
}

export default function Members({ loaderData }: Route.ComponentProps) {
	const { members } = loaderData;
	const { user } = useOutletContext() as { user: SessionUser };
	const isPermitted = hasPermission(user.role, "MANAGE_MEMBERS");

	return (
		<PageWrapper>
			<PageSection index={0} className="space-y-8 px-4 xl:px-8">
				<div className="space-y-2">
					<h1 className="text-xl font-semibold tracking-tight leading-tight text-foreground">
						Members
					</h1>
					<p className="leading-snug text-sm text-mainGray dark:text-muted-foreground">
						Current members and their roles.
					</p>
				</div>
				<div className="flex justify-between items-center gap-4">
					<Search
						id="search-members"
						placeholder="Search members..."
						classname="w-fit"
					/>
					{isPermitted && <InviteMember />}
				</div>
			</PageSection>
			<PageSection index={1} className="mt-4 space-y-4 px-4 xl:px-8">
				{members?.members.length === 0 ? (
					<NotFound
						title="No members found"
						message="Members have not been added yet. Come back later."
					/>
				) : (
					<MembersList members={members} />
				)}
			</PageSection>
		</PageWrapper>
	);
}
