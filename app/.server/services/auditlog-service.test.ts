import mongoose from "mongoose";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { AuditLogService } from "~/.server/services/auditlog-service";
import { auth } from "~/.server/services/better-auth";
import AuditLog from "~/.server/models/auditlog";
import Notification from "~/.server/models/notification";
import { clearTestDB, connectTestDB, disconnectTestDB } from "~/test/helpers/db";

vi.mock("~/.server/services/better-auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock("~/.server/config/redis", () => ({
  default: () => null,
}));

const getSessionMock = vi.mocked(auth.api.getSession);

const request = () =>
  new Request("http://localhost/api/v1/test", {
    headers: {
      "x-forwarded-for": "203.0.113.7",
      "user-agent": "test-agent/1.0",
    },
  });

describe("AuditLogService.record", () => {
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

  beforeEach(() => {
    getSessionMock.mockResolvedValue({
      user: { id: userId, name: "Ada Lovelace" },
    } as never);
  });

  it("does nothing when there is no session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    await AuditLogService.record(request(), {
      action: "TRANSFER_INITIATED",
      category: "payment",
    });
    expect(await AuditLog.countDocuments({})).toBe(0);
  });

  it("creates an audit log with request metadata extracted", async () => {
    await AuditLogService.record(request(), {
      action: "LOGIN_SUCCESS",
      category: "auth",
      description: "Signed in",
      details: { device: "mac" },
    });

    const log = await AuditLog.findOne({}).lean();
    expect(log).toBeTruthy();
    expect(log!.userId.toString()).toBe(userId);
    expect(log!.userName).toBe("Ada Lovelace");
    expect(log!.action).toBe("LOGIN_SUCCESS");
    expect(log!.category).toBe("auth");
    expect(log!.ipAddress).toBe("203.0.113.7");
    expect(log!.userAgent).toBe("test-agent/1.0");
    expect(log!.details.device).toBe("mac");
    expect(log!.status).toBe("success");
  });

  it("sends a security alert notification for high-risk actions", async () => {
    await AuditLogService.record(request(), {
      action: "SUPPORT_TICKET",
      category: "support",
      description: "Opened a support ticket",
    });

    const notif = await Notification.findOne({ type: "security_alert" }).lean();
    expect(notif).toBeTruthy();
    expect(notif!.userId.toString()).toBe(userId);
    expect(notif!.metadata.action).toBe("SUPPORT_TICKET");
  });

  it("does not send a security alert for low-risk actions", async () => {
    await AuditLogService.record(request(), {
      action: "TRANSFER_INITIATED",
      category: "payment",
    });
    expect(await Notification.countDocuments({})).toBe(0);
  });
});
