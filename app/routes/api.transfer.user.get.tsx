import { getUserTransfers } from "~/.server/actions/transfer";
import type { Route } from "./+types/api.transfer.user.get";

export async function loader({ request }: Route.LoaderArgs) {
	if (request.method !== "GET") {
		return Response.json({ message: "Method not allowed" }, { status: 405 });
	}

	const url = new URL(request.url);
	const page = Number(url.searchParams.get("page")) || 1;
	const limit = Number(url.searchParams.get("limit")) || 10;
	const transferStatus = url.searchParams.get("transferStatus") || undefined;
	const startDate = url.searchParams.get("startDate") || undefined;
	const endDate = url.searchParams.get("endDate") || undefined;

	return await getUserTransfers({
		request,
		page,
		limit,
		transferStatus,
		startDate,
		endDate,
	});
}