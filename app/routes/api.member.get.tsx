import { getMembers } from "~/.server/actions/member";
import type { Route } from "./+types/api.member.get";

export async function loader({ request }: Route.LoaderArgs) {
	if (request.method !== "GET") {
		return Response.json({ message: "Method not allowed" }, { status: 405 });
	}

	const url = new URL(request.url);
	const page = Number(url.searchParams.get("page")) || 1;
	const limit = Number(url.searchParams.get("limit")) || 10;
	const query = url.searchParams.get("query") || undefined;

	return await getMembers({ request, page, limit, query });
}