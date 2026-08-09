import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("~/.server/utils/health", () => ({
  getHealthStatus: vi.fn(),
}));

vi.mock("~/.server/services/better-auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock("~/.server/actions/global-search", () => ({
  globalSearch: vi.fn(),
}));

vi.mock("~/.server/actions/bank-data", () => ({
  resolveBankAccount: vi.fn(),
}));

vi.mock("~/.server/services/notification.service", () => ({
  NotificationService: {
    getUnreadCount: vi.fn(),
    getNotifications: vi.fn(),
    markAsRead: vi.fn(),
  },
}));

vi.mock("~/.server/services/paystack.service", () => ({
  PaystackService: {
    verifyWebhookSignature: vi.fn(),
    handleWebhook: vi.fn(),
  },
}));

import { loader as healthLoader } from "~/routes/api.health";
import { action as globalSearchAction } from "~/routes/api.global-search";
import { action as resolveAction } from "~/routes/api.banks.resolve";
import {
  action as notificationsAction,
  loader as notificationsLoader,
} from "~/routes/api.notifications.$";
import { action as webhookAction } from "~/routes/api.paystack.webhook";
import { getHealthStatus } from "~/.server/utils/health";
import { globalSearch } from "~/.server/actions/global-search";
import { resolveBankAccount } from "~/.server/actions/bank-data";
import { auth } from "~/.server/services/better-auth";
import { NotificationService } from "~/.server/services/notification.service";
import { PaystackService } from "~/.server/services/paystack.service";

const getSessionMock = vi.mocked(auth.api.getSession);
const getHealthStatusMock = vi.mocked(getHealthStatus);
const globalSearchMock = vi.mocked(globalSearch);
const resolveBankAccountMock = vi.mocked(resolveBankAccount);

const session = () => ({ user: { id: "u1", name: "Ada", email: "ada@example.com" } });

const post = (url: string, body?: unknown) =>
  new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

describe("GET /api/health (api.health loader)", () => {
  afterEach(() => vi.clearAllMocks());

  it("returns 200 when health is ok", async () => {
    getHealthStatusMock.mockResolvedValue({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: 1,
      environment: "test",
      memory: { rss: 1, heapUsed: 1, heapTotal: 1 },
      checks: { database: { status: "ok", state: "connected" }, redis: { status: "ok", ping: "PONG" } },
    } as never);
    const res = await healthLoader({ request: new Request("http://localhost/api/health") } as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
  });

  it("returns 503 when health is down", async () => {
    getHealthStatusMock.mockResolvedValue({
      status: "down",
      timestamp: new Date().toISOString(),
      uptime: 1,
      environment: "test",
      memory: { rss: 1, heapUsed: 1, heapTotal: 1 },
      checks: { database: { status: "down", state: "disconnected" }, redis: { status: "down", ping: null } },
    } as never);
    const res = await healthLoader({ request: new Request("http://localhost/api/health") } as never);
    expect(res.status).toBe(503);
  });
});

describe("POST /api/global-search (api.global-search action)", () => {
  afterEach(() => vi.clearAllMocks());

  it("rejects non-POST methods with 405", async () => {
    const res = await globalSearchAction({
      request: new Request("http://localhost/api/global-search", { method: "GET" }),
    } as never);
    expect(res.status).toBe(405);
  });

  it("rejects invalid JSON with 400", async () => {
    const res = await globalSearchAction({
      request: new Request("http://localhost/api/global-search", {
        method: "POST",
        body: "not-json",
      }),
    } as never);
    expect(res.status).toBe(400);
  });

  it("delegates the query to globalSearch", async () => {
    globalSearchMock.mockResolvedValue(Response.json({ success: true, body: { query: "ada", sections: [] } }));
    const res = await globalSearchAction({
      request: post("http://localhost/api/global-search", { query: "ada" }),
    } as never);
    expect(res.status).toBe(200);
    expect(globalSearchMock).toHaveBeenCalledWith(
      expect.any(Request),
      { query: "ada" },
    );
  });
});

describe("POST /api/banks/resolve (api.banks.resolve action)", () => {
  afterEach(() => vi.clearAllMocks());

  it("rejects non-POST methods with 405", async () => {
    const res = await resolveAction({ request: new Request("http://localhost/api/banks/resolve") } as never);
    expect(res.status).toBe(405);
  });

  it("rejects an invalid account number with 400", async () => {
    const res = await resolveAction({
      request: post("http://localhost/api/banks/resolve", {
        accountNumber: "123",
        bankCode: "",
      }),
    } as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("delegates a valid payload to resolveBankAccount", async () => {
    resolveBankAccountMock.mockResolvedValue(
      Response.json({ success: true, body: { accountName: "Ada" } }),
    );
    const res = await resolveAction({
      request: post("http://localhost/api/banks/resolve", {
        accountNumber: "0123456789",
        bankCode: "044",
      }),
    } as never);
    expect(res.status).toBe(200);
    expect(resolveBankAccountMock).toHaveBeenCalled();
  });
});

describe("GET /api/notifications/* (api.notifications.$ loader)", () => {
  afterEach(() => vi.clearAllMocks());

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await notificationsLoader({
      request: new Request("http://localhost/api/notifications"),
    } as never);
    expect(res.status).toBe(401);
  });

  it("returns the unread count for /unread-count", async () => {
    getSessionMock.mockResolvedValue(session() as never);
    vi.mocked(NotificationService.getUnreadCount).mockResolvedValue(3);
    const res = await notificationsLoader({
      request: new Request("http://localhost/api/notifications/unread-count"),
    } as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(3);
  });

  it("fetches paginated notifications with default page and limit", async () => {
    getSessionMock.mockResolvedValue(session() as never);
    vi.mocked(NotificationService.getNotifications).mockResolvedValue({
      notifications: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    } as never);
    const res = await notificationsLoader({
      request: new Request("http://localhost/api/notifications"),
    } as never);
    expect(res.status).toBe(200);
    expect(NotificationService.getNotifications).toHaveBeenCalledWith("u1", 1, 20);
  });
});

describe("POST /api/notifications (api.notifications.$ action)", () => {
  afterEach(() => vi.clearAllMocks());

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await notificationsAction({
      request: post("http://localhost/api/notifications", { intent: "mark-read" }),
    } as never);
    expect(res.status).toBe(401);
  });

  it("marks a notification as read", async () => {
    getSessionMock.mockResolvedValue(session() as never);
    vi.mocked(NotificationService.markAsRead).mockResolvedValue(undefined);
    const res = await notificationsAction({
      request: post("http://localhost/api/notifications", {
        intent: "mark-read",
        notificationId: "n1",
      }),
    } as never);
    expect(res.status).toBe(200);
    expect(NotificationService.markAsRead).toHaveBeenCalledWith("u1", "n1");
  });

  it("rejects an unknown intent with 400", async () => {
    getSessionMock.mockResolvedValue(session() as never);
    const res = await notificationsAction({
      request: post("http://localhost/api/notifications", { intent: "delete-all" }),
    } as never);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/paystack/webhook (api.paystack.webhook action)", () => {
  afterEach(() => vi.clearAllMocks());

  it("rejects non-POST methods with 405", async () => {
    const res = await webhookAction({
      request: new Request("http://localhost/api/paystack/webhook"),
    } as never);
    expect(res.status).toBe(405);
  });

  it("rejects a missing signature with 400", async () => {
    const res = await webhookAction({
      request: post("http://localhost/api/paystack/webhook", { event: "charge.success" }),
    } as never);
    expect(res.status).toBe(400);
  });

  it("rejects an invalid signature with 401", async () => {
    PaystackService.verifyWebhookSignature = vi.fn(() => false);
    const req = new Request("http://localhost/api/paystack/webhook", {
      method: "POST",
      headers: { "x-paystack-signature": "sig" },
      body: JSON.stringify({ event: "x" }),
    });
    const res = await webhookAction({ request: req } as never);
    expect(res.status).toBe(401);
  });

  it("returns 200 and handles the event when the signature is valid", async () => {
    PaystackService.verifyWebhookSignature = vi.fn(() => true);
    PaystackService.handleWebhook = vi.fn(async () => undefined);
    const req = new Request("http://localhost/api/paystack/webhook", {
      method: "POST",
      headers: { "x-paystack-signature": "sig" },
      body: JSON.stringify({ event: "charge.success", data: { id: 1 } }),
    });
    const res = await webhookAction({ request: req } as never);
    expect(res.status).toBe(200);
    expect(PaystackService.handleWebhook).toHaveBeenCalled();
  });
});
