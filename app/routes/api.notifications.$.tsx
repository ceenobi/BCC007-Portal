import { auth } from "~/.server/services/better-auth";
import { NotificationService } from "~/.server/services/notification.service";
import type { Route } from "./+types/api.notifications.$";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const path = url.pathname.replace("/api/notifications", "");

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }
  const userId = session.user.id;

  // Unread count
  if (path === "/unread-count") {
    const count = await NotificationService.getUnreadCount(userId);
    return Response.json({ success: true, count });
  }

  // Fetch notifications (paginated)
  const page = Number(url.searchParams.get("page")) || 1;
  const limit = Number(url.searchParams.get("limit")) || 20;
  const result = await NotificationService.getNotifications(
    userId,
    page,
    limit,
  );
  return Response.json({ success: true, ...result });
}

export async function action({ request }: Route.ActionArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }
  const userId = session.user.id;

  const payload = await request.json();
  if (payload.intent === "mark-read") {
    await NotificationService.markAsRead(
      userId,
      payload.notificationId || undefined,
    );
    return Response.json({ success: true });
  }

  return Response.json(
    { success: false, message: "Unknown intent" },
    { status: 400 },
  );
}