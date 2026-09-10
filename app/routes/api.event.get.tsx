import { getEvents } from "~/.server/actions/event-data";
import type { Route } from "./+types/api.event.get";

export async function loader({ request }: Route.LoaderArgs) {
	if (request.method !== "GET") {
		return Response.json({ message: "Method not allowed" }, { status: 405 });
	}

	const url = new URL(request.url);
	const page = Number(url.searchParams.get("page")) || 1;
	const limit = Number(url.searchParams.get("limit")) || 10;
	const query = url.searchParams.get("query") || undefined;
	const status = url.searchParams.get("status") || undefined;
	const eventType = url.searchParams.get("eventType") || undefined;
	const startDate = url.searchParams.get("startDate") || undefined;
	const endDate = url.searchParams.get("endDate") || undefined;

	return await getEvents({
		request,
		page,
		limit,
		query,
		status,
		eventType,
		startDate,
		endDate,
	});
}