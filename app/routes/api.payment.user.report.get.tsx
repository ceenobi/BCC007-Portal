import { getUserPaymentReports } from "~/.server/actions/payment";
import type { Route } from "./+types/api.payment.user.report.get";

export async function loader({ request }: Route.LoaderArgs) {
	if (request.method !== "GET") {
		return Response.json({ message: "Method not allowed" }, { status: 405 });
	}

	const url = new URL(request.url);
	const period = url.searchParams.get("period") || undefined;
	const paymentStatus = url.searchParams.get("paymentStatus") || undefined;
	const paymentType = url.searchParams.get("paymentType") || undefined;

	return await getUserPaymentReports({
		request,
		period,
		paymentStatus,
		paymentType,
	});
}