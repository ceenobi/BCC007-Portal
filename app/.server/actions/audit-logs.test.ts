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
import {
  fetchAllAuditLogs,
  fetchUserAuditLogs,
} from "~/.server/actions/audit-logs";
import { auth } from "~/.server/services/better-auth";
import AuditLog from "~/.server/models/auditlog";
import { clearTestDB, connectTestDB, disconnectTestDB } from "~/test/helpers/db";

vi.mock("~/.server/config/upstash", () => ({
  redis: {},
  createRatelimit: () => ({ limit: vi.fn() }),
  generalRatelimit: {
    limit: vi.fn(async () => ({
      success: true,
      limit: 100,
      remaining: 99,
      reset: Date.now() + 60_000,
      pending: Promise.resolve(),
    })),
  },
  strictRatelimit: {
    limit: vi.fn(async () => ({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60_000,
      pending: Promise.resolve(),
    })),
  },
}));

vi.mock("~/.server/services/better-auth", () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock("~/.server/config/redis", () => ({
  default: () => null,
}));

const request = () =>
  new Request("http://localhost/api/v1/audit-logs", {
    headers: { "x-forwarded-for": "127.0.0.1" },
  });

const session = (role: string, id: string) => ({
  user: { id, name: "Ada Lovelace", email: "ada@example.com", role },
});

const getSessionMock = vi.mocked(auth.api.getSession);

const makeAuditLog = (userId: string, action: string, category = "security") =>
  AuditLog.create({
    userId,
    userName: "Ada Lovelace",
    action,
    category,
    details: {},
    status: "success",
    description: `${action} performed`,
  });

describe("fetchUserAuditLogs", () => {
  const userId = new mongoose.Types.ObjectId().toString();

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

  beforeEach(() => {
    getSessionMock.mockResolvedValue(session("member", userId) as never);
  });

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await fetchUserAuditLogs({
      request: request(),
      page: 1,
      limit: 10,
      category: undefined,
    });
    expect(res.status).toBe(401);
  });

  it("returns only the session user's logs with pagination meta", async () => {
    const otherId = new mongoose.Types.ObjectId().toString();
    await makeAuditLog(userId, "PROFILE_UPDATE");
    await makeAuditLog(userId, "PASSWORD_CHANGE");
    await makeAuditLog(otherId, "LOGIN_SUCCESS");

    const res = await fetchUserAuditLogs({
      request: request(),
      page: 1,
      limit: 10,
      category: undefined,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.body.meta.total).toBe(2);
    expect(body.body.logs).toHaveLength(2);
    expect(body.body.meta.totalPages).toBe(1);
    expect(body.body.meta.hasMore).toBe(false);
  });

  it("filters the logs by category", async () => {
    await makeAuditLog(userId, "PROFILE_UPDATE", "security");
    await makeAuditLog(userId, "PAYMENT_INITIATED", "payment");

    const res = await fetchUserAuditLogs({
      request: request(),
      page: 1,
      limit: 10,
      category: "payment",
    });
    const body = await res.json();
    expect(body.body.meta.total).toBe(1);
    expect(body.body.logs[0].action).toBe("PAYMENT_INITIATED");
  });

  it("paginates the results", async () => {
    for (let i = 0; i < 5; i++) {
      await makeAuditLog(userId, `ACTION_${i}`);
    }

    const page1 = await fetchUserAuditLogs({
      request: request(),
      page: 1,
      limit: 2,
      category: undefined,
    });
    const body1 = await page1.json();
    expect(body1.body.logs).toHaveLength(2);
    expect(body1.body.meta.total).toBe(5);
    expect(body1.body.meta.totalPages).toBe(3);
    expect(body1.body.meta.hasMore).toBe(true);

    const page3 = await fetchUserAuditLogs({
      request: request(),
      page: 3,
      limit: 2,
      category: undefined,
    });
    const body3 = await page3.json();
    expect(body3.body.logs).toHaveLength(1);
    expect(body3.body.meta.hasMore).toBe(false);
  });
});

describe("fetchAllAuditLogs", () => {
  const adminId = new mongoose.Types.ObjectId().toString();
  const memberId = new mongoose.Types.ObjectId().toString();

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

  beforeEach(() => {
    getSessionMock.mockResolvedValue(session("super_admin", adminId) as never);
  });

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await fetchAllAuditLogs({
      request: request(),
      page: 1,
      limit: 10,
      category: undefined,
    });
    expect(res.status).toBe(401);
  });

  it("returns logs across all users with pagination meta", async () => {
    await makeAuditLog(adminId, "ROLE_CHANGE");
    await makeAuditLog(memberId, "PROFILE_UPDATE");

    const res = await fetchAllAuditLogs({
      request: request(),
      page: 1,
      limit: 10,
      category: undefined,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.body.meta.total).toBe(2);
    expect(body.body.logs).toHaveLength(2);
  });

  it("filters by category", async () => {
    await makeAuditLog(memberId, "PROFILE_UPDATE", "security");
    await makeAuditLog(memberId, "TRANSFER_INITIATED", "payment");

    const res = await fetchAllAuditLogs({
      request: request(),
      page: 1,
      limit: 10,
      category: "payment",
    });
    const body = await res.json();
    expect(body.body.meta.total).toBe(1);
    expect(body.body.logs[0].action).toBe("TRANSFER_INITIATED");
  });
});
