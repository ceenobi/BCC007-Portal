import { getEvent } from "~/.server/actions/event-data";
import type { Route } from "./+types/api.event.detail";

export async function loader({ request }: Route.LoaderArgs) {
	if (request.method !== "GET") {
		return Response.json({ message: "Method not allowed" }, { status: 405 });
	}

	const eventId = new URL(request.url).searchParams.get("eventId");
	if (!eventId) {
		return Response.json(
			{ success: false, message: "eventId query parameter is required" },
			{ status: 400 },
		);
	}

	return await getEvent(request, { eventId });
}