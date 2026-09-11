import { useQuery } from "@tanstack/react-query";
import { useOutletContext } from "react-router";
import {
	createAnnouncement,
	deleteAnnouncement,
	updateAnnouncement,
} from "~/.server/actions/announcement-data";
import { PageSection, PageWrapper } from "~/components/provider/page-wrapper";
import NotFound from "~/components/ui/not-found";
import Search from "~/components/ui/search";
import { getQueryClient } from "~/lib/getQueryClient";
import { hasPermission } from "~/lib/rbac";
import { requirePermission } from "~/middleware/auth.middleware";
import { clientRequirePermission } from "~/middleware/client-auth";
import {
	type AnnouncementQueryResult,
	getAnnouncementsQuery,
} from "~/queries/client-announcements";
import type {
	CreateAnnouncementSchemaType,
	SessionUser,
	UpdateAnnouncementSchemaType,
} from "~/types";
import AnnouncementsList from "../../features/announcements/announcements-list";
import AnnouncementsSkeleton from "../../features/announcements/announcements-skeleton";
import CreateAnnouncement from "../../features/announcements/create-announcement";
import Filter from "../../features/announcements/filter";
import type { Route } from "./+types/route";

export const middleware = [requirePermission("MANAGE_ANNOUNCEMENTS", "action")];

export const clientMiddleware = [
	clientRequirePermission("MANAGE_ANNOUNCEMENTS", "action"),
];

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: "Announcements - Manage BCC007 Team announcements" },
		{
			name: "description",
			content: "Announcements - Manage BCC007 Team announcements",
		},
	];
}


export async function clientLoader({
	request,
}: Route.ClientLoaderArgs): Promise<{ announcements: AnnouncementQueryResult }> {
	const url = new URL(request.url);
	const queryClient = getQueryClient();
	await queryClient.prefetchQuery(getAnnouncementsQuery(url.searchParams));
	const data = queryClient.getQueryData(
		getAnnouncementsQuery(url.searchParams).queryKey,
	);
	return { announcements: data as AnnouncementQueryResult };
}

export async function action({ request }: Route.ActionArgs) {
	if (request.method !== "POST") {
		return Response.json({ message: "Method not allowed" }, { status: 405 });
	}
	let payload: Record<string, unknown>;
	try {
		payload = (await request.json()) as Record<string, unknown>;
	} catch {
		return Response.json(
			{ success: false, message: "Invalid JSON payload" },
			{ status: 400 },
		);
	}
	if (payload.intent === "create-announcement") {
		return await createAnnouncement(
			request,
			payload as unknown as CreateAnnouncementSchemaType,
		);
	}
	if (payload.intent === "update-announcement") {
		return await updateAnnouncement(
			request,
			payload as unknown as UpdateAnnouncementSchemaType & {
				announcementId?: string;
			},
		);
	}
	if (payload.intent === "delete-announcement") {
		return await deleteAnnouncement(request, {
			announcementId: payload.announcementId as string,
		});
	}
	return Response.json(
		{ success: false, message: "Invalid request" },
		{ status: 400 },
	);
}

export function HydrateFallback() {
	return (
		<PageWrapper>
			<PageSection index={0} className="space-y-8 px-4 xl:px-8">
				<div className="space-y-2">
					<h1 className="text-xl font-semibold tracking-tight leading-tight text-foreground">
						Announcements
					</h1>
					<p className="leading-snug text-sm text-mainGray dark:text-muted-foreground">
						Broadcast messages to all group members.
					</p>
				</div>
				<div className="flex justify-between items-center gap-4">
					<Search
						id="search-announcements"
						placeholder="Search announcements..."
						classname="w-fit"
					/>
					<div className="flex items-center gap-2">
						<Filter />
					</div>
				</div>
			</PageSection>
			<PageSection index={1} className="mt-4 space-y-4 px-4 xl:px-8">
				<AnnouncementsSkeleton />
			</PageSection>
		</PageWrapper>
	);
}

export default function Announcements({ loaderData }: Route.ComponentProps) {
	const { announcements } = loaderData;
	const { user } = useOutletContext() as { user: SessionUser };
	const isPermitted = hasPermission(user.role, "MANAGE_ANNOUNCEMENTS");

	return (
		<PageWrapper>
			<PageSection index={0} className="space-y-8 px-4 xl:px-8">
				<div className="space-y-2">
					<h1 className="text-xl font-semibold tracking-tight leading-tight text-foreground">
						Announcements
					</h1>
					<p className="leading-snug text-sm text-mainGray dark:text-muted-foreground">
						Broadcast messages to all group members.
					</p>
				</div>
				<div className="flex justify-between items-center gap-4">
					<Search
						id="search-announcements"
						placeholder="Search announcements..."
						classname="w-fit"
					/>
					<div className="flex items-center gap-2">
						<Filter />
						{isPermitted && <CreateAnnouncement />}
					</div>
				</div>
			</PageSection>
			<PageSection index={1} className="mt-4 space-y-4 px-4 xl:px-8">
				{announcements?.announcements.length === 0 ? (
					<NotFound
						title="No announcements found"
						message="Announcements have not been added yet. Come back later."
					/>
				) : (
					<AnnouncementsList
						announcements={announcements}
						canManage={isPermitted}
					/>
				)}
			</PageSection>
		</PageWrapper>
	);
}
