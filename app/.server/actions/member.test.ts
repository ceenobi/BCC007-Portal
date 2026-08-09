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
  getAdminsForAssign,
  getMembers,
  getMembersForSelect,
} from "~/.server/actions/member";
import { auth } from "~/.server/services/better-auth";
import User from "~/.server/models/user";
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
  new Request("http://localhost/api/v1/members", {
    headers: { "x-forwarded-for": "127.0.0.1" },
  });

const session = (role: string, id: string) => ({
  user: { id, name: role, email: `${role}@example.com`, role },
});

const getSessionMock = vi.mocked(auth.api.getSession);

describe("member list actions", () => {
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

  const memberId = new mongoose.Types.ObjectId().toString();
  const adminId = new mongoose.Types.ObjectId().toString();

  beforeEach(async () => {
    await User.create({
      _id: memberId,
      name: "Ada",
      email: "ada@example.com",
      password: "hashed",
      role: "member",
      isOnboarded: true,
    });
    await User.create({
      _id: adminId,
      name: "Grace",
      email: "grace@example.com",
      password: "hashed",
      role: "admin",
      isOnboarded: true,
    });
    await User.create({
      _id: new mongoose.Types.ObjectId().toString(),
      name: "NotOnboarded",
      email: "no@example.com",
      password: "hashed",
      role: "member",
      isOnboarded: false,
    });
    getSessionMock.mockResolvedValue(session("admin", adminId) as never);
  });

  it("getMembersForSelect returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await getMembersForSelect(request());
    expect(res.status).toBe(401);
  });

  it("getMembersForSelect returns only onboarded members", async () => {
    const res = await getMembersForSelect(request());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.body).toHaveLength(2);
    expect(body.body.map((m: any) => m.name).sort()).toEqual(["Ada", "Grace"]);
  });

  it("getAdminsForAssign returns only onboarded admins", async () => {
    const res = await getAdminsForAssign(request());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.body).toHaveLength(1);
    expect(body.body[0].name).toBe("Grace");
  });

  it("getMembers returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await getMembers({
      request: request(),
      page: 1,
      limit: 10,
      query: undefined,
    });
    expect(res.status).toBe(401);
  });

  it("getMembers paginates and filters by query", async () => {
    const all = await getMembers({ request: request(), page: 1, limit: 10, query: undefined });
    expect(all.status).toBe(200);
    const body = await all.json();
    expect(body.body.meta.total).toBe(3);

    const filtered = await getMembers({ request: request(), page: 1, limit: 10, query: "Ada" });
    const filteredBody = await filtered.json();
    expect(filteredBody.body.meta.total).toBe(1);
    expect(filteredBody.body.members[0].name).toBe("Ada");
  });
});
