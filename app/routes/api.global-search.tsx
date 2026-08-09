import { globalSearch } from "~/.server/actions/global-search";
import type { Route } from "./+types/api.global-search";

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return Response.json({ message: "Method not allowed" }, { status: 405 });
  }

  let payload: { query?: unknown };
  try {
    payload = (await request.json()) as { query?: unknown };
  } catch {
    return Response.json(
      { success: false, message: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const query = typeof payload.query === "string" ? payload.query : "";
  return await globalSearch(request, { query });
}
