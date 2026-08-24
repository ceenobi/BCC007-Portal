import { dehydrate } from "@tanstack/react-query";
import { Suspense } from "react";
import { Await, useOutletContext } from "react-router";
import { getAdminsForAssign } from "~/.server/actions/member";
import { createTicket, ticketActions } from "~/.server/actions/ticket";
import { PageSection, PageWrapper } from "~/components/provider/page-wrapper";
import DataError from "~/components/ui/data-error";
import NotFound from "~/components/ui/not-found";
import CreateTicket from "~/features/tickets/create-ticket";
import Filter from "~/features/tickets/filter";
import StatsCard from "~/features/tickets/stats-card";
import TicketList from "~/features/tickets/ticket-list";
import TicketSkeleton from "~/features/tickets/ticket-skeleton";
import { getQueryClientRsc } from "~/lib/getQueryClient";
import { getTicketsQuery } from "~/queries/tickets";
import type { SessionUser } from "~/types";
import type { Route } from "./+types/route";

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: "View and manage issues regarding your account" },
		{ name: "description", content: "Help Desk! - Contact support" },
	];
}

export async function loader({ request }: Route.LoaderArgs) {
	const adminsRes = await getAdminsForAssign(request);
	const adminsData = await adminsRes.json().catch(() => ({}));
	const queryClient = getQueryClientRsc();
	const tickets = queryClient.ensureQueryData(getTicketsQuery(request));
	return {
		dehydratedState: dehydrate(queryClient),
		tickets,
		admins: adminsData.success ? adminsData.body : [],
	};
}

export async function action({ request }: Route.ActionArgs) {
	const payload = await request.json();
	if (payload.intent === "create-ticket") {
		return await createTicket(request, payload);
	}
	if (payload.intent === "assign-ticket") {
		return await ticketActions(request, payload);
	}
	if (payload.intent === "update-ticketStatus") {
		return await ticketActions(request, payload);
	}
}

export default function HelpCenter({ loaderData }: Route.ComponentProps) {
	const { tickets, admins } = loaderData;
	const { user } = useOutletContext() as { user: SessionUser };
	return (
		<PageWrapper>
			<PageSection index={0} className="space-y-8 px-4 xl:px-8">
				<div className="space-y-2">
					<h1 className="text-xl font-semibold tracking-tight leading-tight text-foreground">
						Help Center
					</h1>
					<p className="leading-snug text-sm text-mainGray dark:text-muted-foreground">
						Get assistance with account issues, submit tickets, and access
						support resources
					</p>
				</div>
				<div className="flex justify-between items-center gap-4">
					<Filter />
					<CreateTicket />
				</div>
			</PageSection>
			<PageSection index={1} className="mt-4 space-y-4 px-4 xl:px-8">
				<Suspense fallback={<TicketSkeleton />}>
					<Await resolve={tickets} errorElement={<DataError />}>
						{(resolvedTickets) => (
							<div className="space-y-8">
								<StatsCard summary={resolvedTickets.summary} />
								{resolvedTickets?.tickets.length === 0 ? (
									<NotFound
										title="No tickets found"
										message="No tickets have been submitted yet. Come back later."
									/>
								) : (
									<TicketList
										tickets={resolvedTickets}
										user={user}
										admins={admins}
									/>
								)}
							</div>
						)}
					</Await>
				</Suspense>
			</PageSection>
		</PageWrapper>
	);
}
