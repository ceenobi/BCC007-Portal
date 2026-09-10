import { getMembersForSelect } from "~/.server/actions/member";
import type { Route } from "./+types/api.member.select";

export async function loader({ request }: Route.LoaderArgs) {
	if (request.method !== "GET") {
		return Response.json({ message: "Method not allowed" }, { status: 405 });
	}

	return await getMembersForSelect(request);
}