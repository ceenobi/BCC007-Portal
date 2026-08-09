import { getHealthStatus } from "~/.server/utils/health";
import type { Route } from "./+types/api.health";

export async function loader({}: Route.LoaderArgs) {
  const body = await getHealthStatus();
  const httpStatus = body.status === "down" ? 503 : 200;
  return Response.json(body, { status: httpStatus });
}
