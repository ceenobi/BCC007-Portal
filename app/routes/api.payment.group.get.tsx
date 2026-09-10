import { getGroupPayments } from "~/.server/actions/payment";
import type { Route } from "./+types/api.payment.group.get";

export async function loader({ request }: Route.LoaderArgs) {
	if (request.method !== "GET") {
		return Response.json({ message: "Method not allowed" }, { status: 405 });
	}

	const url = new URL(request.url);
	const page = Number(url.searchParams.get("page")) || 1;
	const limit = Number(url.searchParams.get("limit")) || 10;
	const query = url.searchParams.get("query") || undefined;
	const paymentStatus = url.searchParams.get("paymentStatus") || undefined;
	const paymentType = url.searchParams.get("paymentType") || undefined;
	const startDate = url.searchParams.get("startDate") || undefined;
	const endDate = url.searchParams.get("endDate") || undefined;

	return await getGroupPayments({
		request,
		page,
		limit,
		query,
		paymentStatus,
		paymentType,
		startDate,
		endDate,
	});
}