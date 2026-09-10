import { getUpcomingEvents } from "~/.server/actions/event-data";
import type { Route } from "./+types/api.event.upcoming.get";

export async function loader({ request }: Route.LoaderArgs) {
	if (request.method !== "GET") {
		return Response.json({ message: "Method not allowed" }, { status: 405 });
	}

	return await getUpcomingEvents(request);
}