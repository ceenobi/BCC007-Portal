import { getUserTransferReports } from "~/.server/actions/transfer";
import type { Route } from "./+types/api.transfer.user.report.get";

export async function loader({ request }: Route.LoaderArgs) {
	if (request.method !== "GET") {
		return Response.json({ message: "Method not allowed" }, { status: 405 });
	}

	const url = new URL(request.url);
	const period = url.searchParams.get("period") || undefined;
	const transferStatus = url.searchParams.get("transferStatus") || undefined;

	return await getUserTransferReports({ request, period, transferStatus });
}