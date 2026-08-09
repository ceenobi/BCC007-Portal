import { tryCatchWrapper } from "~/lib/tryCatchWrapper";
import logger from "../config/logger";
import { auth } from "../services/better-auth";

/**
 * Marks the onboarding tour as handled by clearing the `tourPending` flag on
 * the session user. Called from the dashboard route action when the first-run
 * tour is completed or dismissed, so it does not auto-run again on the next
 * dashboard load. The Replay Tour action in the help menu is purely client-side
 * and does not touch this flag.
 */
export async function completeTour(request: Request) {
  return tryCatchWrapper(async () => {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (!session) {
      logger.error("Unauthorized");
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const sessionUpdate = await auth.api.updateUser({
      body: { tourPending: false },
      headers: request.headers,
      asResponse: true,
    });
    if (!sessionUpdate.ok) {
      logger.error(
        { status: sessionUpdate.status },
        "Failed to clear tourPending flag",
      );
      return Response.json(
        {
          success: false,
          message: "Failed to save tour state. Please try again.",
        },
        { status: 400 },
      );
    }

    return Response.json(
      { success: true, message: "Tour state saved" },
      { status: 200, headers: new Headers(sessionUpdate.headers) },
    );
  });
}
