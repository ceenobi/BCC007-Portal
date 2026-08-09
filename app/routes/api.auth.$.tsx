import { auth } from "~/.server/services/better-auth";
import type { Route } from "./+types/api.auth.$";

export async function action({ request }: Route.ActionArgs) {
  return auth.handler(request);
}

export async function loader({ request }: Route.LoaderArgs) {
  return auth.handler(request);
}