import mongoose from "mongoose";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { NotificationService } from "~/.server/services/notification.service";
import Notification from "~/.server/models/notification";
import { clearTestDB, connectTestDB, disconnectTestDB } from "~/test/helpers/db";

vi.mock("~/.server/config/redis", () => ({
  default: () => null,
}));

describe("NotificationService", () => {
  beforeAll(async () => {
    await connectTestDB();
  });
  afterEach(async () => {
    await clearTestDB();
    vi.clearAllMocks();
  });
  afterAll(async () => {
    await disconnectTestDB();
  });

  const userId = new mongoose.Types.ObjectId().toString();

  it("creates a notification with the provided fields", async () => {
    await NotificationService.send({
      userId,
      type: "ticket_assigned",
      title: "Ticket assigned",
      message: "You were assigned a ticket",
      metadata: { ticketId: "TK-0001" },
    });

    const notif = await Notification.findOne({ type: "ticket_assigned" }).lean();
    expect(notif).toBeTruthy();
    expect(notif!.userId.toString()).toBe(userId);
    expect(notif!.title).toBe("Ticket assigned");
    expect(notif!.metadata.ticketId).toBe("TK-0001");
    expect(notif!.read).toBe(false);
  });

  it("counts unread notifications", async () => {
    await Notification.create({ userId, type: "account_login", title: "a", message: "m" });
    await Notification.create({ userId, type: "account_login", title: "b", message: "m" });
    await Notification.create({
      userId,
      type: "account_login",
      title: "c",
      message: "m",
      read: true,
    });

    expect(await NotificationService.getUnreadCount(userId)).toBe(2);
  });

  it("returns paginated notifications newest first", async () => {
    await Notification.create({ userId, type: "account_login", title: "first", message: "m" });
    await Notification.create({ userId, type: "account_login", title: "second", message: "m" });
    await Notification.create({ userId, type: "account_login", title: "third", message: "m" });

    const page = await NotificationService.getNotifications(userId, 1, 2);
    expect(page.notifications).toHaveLength(2);
    expect(page.meta.total).toBe(3);
    expect(page.meta.hasMore).toBe(true);
    expect(page.notifications[0].title).toBe("third");
  });

  it("marks a single notification as read", async () => {
    const first = await Notification.create({ userId, type: "account_login", title: "a", message: "m" });
    await Notification.create({ userId, type: "account_login", title: "b", message: "m" });

    await NotificationService.markAsRead(userId, first._id.toString());

    expect((await Notification.findById(first._id).lean())!.read).toBe(true);
    expect(await NotificationService.getUnreadCount(userId)).toBe(1);
  });

  it("marks all notifications as read when no id is given", async () => {
    await Notification.create({ userId, type: "account_login", title: "a", message: "m" });
    await Notification.create({ userId, type: "account_login", title: "b", message: "m" });

    await NotificationService.markAsRead(userId);

    expect(await NotificationService.getUnreadCount(userId)).toBe(0);
  });
});
