import { Outlet, useLocation, useOutletContext } from "react-router";
import { createEvent } from "~/.server/actions/event-data";
import { PageSection, PageWrapper } from "~/components/provider/page-wrapper";
import NotFound from "~/components/ui/not-found";
import Search from "~/components/ui/search";
import { hasPermission } from "~/lib/rbac";
import { requirePermission } from "~/middleware/auth.middleware";
import {
	clientAuthenticatedMiddleware,
	clientRequirePermission,
} from "~/middleware/client-auth";
import type { EventQueryResult } from "~/queries/events";
import type { CreateEventSchemaType, SessionUser } from "~/types";

type MemberForSelect = {
	_id: string;
	name: string;
	email: string;
	image?: string;
};
import CreateEvent from "../../features/events/create-event";
import EventsList from "../../features/events/events-list";
import EventsSkeleton from "../../features/events/events-skeleton";
import Filter from "../../features/events/filter";
import type { Route } from "./+types/route";

export const middleware = [requirePermission("MANAGE_EVENTS", "action")];

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: "Events - Manage BCC007 Team events" },
		{
			name: "description",
			content: "Events - Manage BCC007 Team events",
		},
	];
}


export const clientMiddleware = [
	clientAuthenticatedMiddleware,
	clientRequirePermission("MANAGE_EVENTS", "action"),
];

export async function clientLoader({
	request,
}: Route.ClientLoaderArgs): Promise<{
	members: MemberForSelect[];
	events: EventQueryResult;
}> {
	const url = new URL(request.url);
	const [eventsRes, membersRes] = await Promise.all([
		fetch(`/api/event/get?${url.searchParams.toString()}`, {
			headers: { Accept: "application/json" },
		}),
		fetch("/api/member/select", {
			headers: { Accept: "application/json" },
		}),
	]);
	if (!eventsRes.ok) {
		throw new Response("Failed to load events", {
			status: eventsRes.status,
		});
	}
	const eventData = await eventsRes.json();
	const memberData = await membersRes.json().catch(() => ({}));
	const rawMembers = (await memberData.body) as MemberForSelect[];
	const members = rawMembers.map((m) => ({
		...m,
		image: m.image ?? undefined,
	}));
	return {
		members,
		events: eventData.body as EventQueryResult,
	};
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
	if (payload.intent === "create-event") {
		return await createEvent(
			request,
			payload as unknown as CreateEventSchemaType,
		);
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
						Events
					</h1>
					<p className="leading-snug text-sm text-mainGray dark:text-muted-foreground">
						See past, upcoming and ongoing events.
					</p>
				</div>
				<div className="flex justify-between items-center gap-4">
					<Search
						id="search-events"
						placeholder="Search events..."
						classname="w-fit"
					/>
					<div className="flex items-center gap-2">
						<Filter />
					</div>
				</div>
			</PageSection>
			<PageSection index={1} className="mt-4 space-y-4 px-4 xl:px-8">
				<EventsSkeleton />
			</PageSection>
		</PageWrapper>
	);
}

export default function Events({ loaderData }: Route.ComponentProps) {
	const { members, events } = loaderData;
	const { user } = useOutletContext() as { user: SessionUser };
	const location = useLocation();
	const isPermitted = hasPermission(user.role, "MANAGE_EVENTS");
	const currentPage = location.pathname === "/dashboard/events";

	return (
		<PageWrapper>
			{currentPage ? (
				<>
					<PageSection index={0} className="space-y-8 px-4 xl:px-8">
						<div className="space-y-2">
							<h1 className="text-xl font-semibold tracking-tight leading-tight text-foreground">
								Events
							</h1>
							<p className="leading-snug text-sm text-mainGray dark:text-muted-foreground">
								See past, upcoming and ongoing events.
							</p>
						</div>
						<div className="flex justify-between items-center gap-4">
							<Search
								id="search-events"
								placeholder="Search events..."
								classname="w-fit"
							/>
							<div className="flex items-center gap-2">
								<Filter />
								{isPermitted && <CreateEvent members={members} />}
							</div>
						</div>
					</PageSection>
					<PageSection index={1} className="mt-4 space-y-4 px-4 xl:px-8">
						{events?.events.length === 0 ? (
							<NotFound
								title="No events found"
								message="Events have not been added yet. Come back later."
							/>
						) : (
							<EventsList events={events} />
						)}
					</PageSection>
				</>
			) : (
				<Outlet context={{ isPermitted }} />
			)}
		</PageWrapper>
	);
}
