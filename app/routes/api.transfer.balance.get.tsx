import { getAvailableBalance } from "~/.server/actions/transfer";
import type { Route } from "./+types/api.transfer.balance.get";

export async function loader({ request }: Route.LoaderArgs) {
	if (request.method !== "GET") {
		return Response.json({ message: "Method not allowed" }, { status: 405 });
	}

	return await getAvailableBalance(request);
}