import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  authenticatedMiddleware,
  cookieContext,
  guestOnlyMiddleware,
  requirePermission,
  sessionMiddleware,
  userContext,
} from "~/middleware/auth.middleware";

vi.mock("~/.server/actions/auth", () => ({
  getSession: vi.fn(),
}));

import { getSession } from "~/.server/actions/auth";

const getSessionMock = vi.mocked(getSession);

const req = (path: string, method = "GET") =>
  new Request(`http://localhost${path}`, {
    method,
    headers: { cookie: "session=abc" },
  });

const nextMock = vi.fn(async () => new Response("next-ok", { status: 200 }));

const makeContext = () => {
  const store = new Map<unknown, unknown>();
  return {
    get: (key: unknown) => store.get(key),
    set: (key: unknown, value: unknown) => store.set(key, value),
  };
};

const session = (overrides: Record<string, unknown> = {}) => ({
  user: {
    id: "u1",
    name: "Ada",
    email: "ada@example.com",
    emailVerified: true,
    isOnboarded: true,
    role: "super_admin",
    ...overrides,
  },
});

const call = (fn: unknown, args: unknown) =>
  (fn as (a: unknown, n: unknown) => Promise<Response>)(args, nextMock);

const callGuard = (guard: unknown, request: Request, context: unknown) =>
  (guard as (a: unknown, n: unknown) => Promise<Response>)({ request, context } as never, nextMock as never);

describe("guestOnlyMiddleware", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("passes through for guests", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const context = makeContext();
    const res = await call(guestOnlyMiddleware, { request: req("/auth/login"), context });
    expect(res.status).toBe(200);
    expect(getSessionMock).toHaveBeenCalled();
  });

  it("redirects authenticated users to the dashboard", async () => {
    getSessionMock.mockResolvedValue(session() as never);
    const context = makeContext();
    const res = await call(guestOnlyMiddleware, { request: req("/auth/login"), context });
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/");
  });

  it("never blocks the verify-email page", async () => {
    getSessionMock.mockResolvedValue(session() as never);
    const context = makeContext();
    const res = await call(guestOnlyMiddleware, { request: req("/auth/verify-email"), context });
    expect(res.status).toBe(200);
  });
});

describe("authenticatedMiddleware", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("redirects guests to login", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const context = makeContext();
    const res = await call(authenticatedMiddleware, { request: req("/dashboard"), context });
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/auth/login");
  });

  it("redirects unverified users to verify-email", async () => {
    getSessionMock.mockResolvedValue(session({ emailVerified: false }) as never);
    const context = makeContext();
    const res = await call(authenticatedMiddleware, { request: req("/dashboard"), context });
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/auth/verify-email");
  });

  it("allows unverified users to reach verify-email", async () => {
    getSessionMock.mockResolvedValue(session({ emailVerified: false }) as never);
    const context = makeContext();
    const res = await call(authenticatedMiddleware, { request: req("/auth/verify-email"), context });
    expect(res.status).toBe(200);
  });

  it("redirects verified but un-onboarded users to onboarding", async () => {
    getSessionMock.mockResolvedValue(session({ isOnboarded: false }) as never);
    const context = makeContext();
    const res = await call(authenticatedMiddleware, { request: req("/dashboard"), context });
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/onboarding");
  });

  it("allows verified, onboarded users and populates the context", async () => {
    getSessionMock.mockResolvedValue(session() as never);
    const context = makeContext();
    const res = await call(authenticatedMiddleware, { request: req("/dashboard"), context });
    expect(res.status).toBe(200);
    expect(context.get(userContext)).toMatchObject({ _id: "u1", role: "super_admin" });
    expect(context.get(cookieContext)).toBe("session=abc");
  });
});

describe("sessionMiddleware", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("populates context when a session exists", async () => {
    getSessionMock.mockResolvedValue(session() as never);
    const context = makeContext();
    const res = await call(sessionMiddleware, { request: req("/"), context });
    expect(res.status).toBe(200);
    expect(context.get(userContext)).toMatchObject({ _id: "u1" });
  });

  it("passes through without setting context for guests", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const context = makeContext();
    const res = await call(sessionMiddleware, { request: req("/"), context });
    expect(res.status).toBe(200);
    expect(context.get(userContext)).toBeUndefined();
  });
});

describe("requirePermission", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("throws 403 when no user is in context", async () => {
    const guard = requirePermission("MANAGE_MEMBERS");
    const context = makeContext();
    await expect(
      callGuard(guard, req("/dashboard/members"), context),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("throws 403 when the user lacks the permission", async () => {
    const guard = requirePermission("MANAGE_MEMBERS");
    const context = makeContext();
    context.set(userContext, { _id: "u1", role: "member" });
    await expect(
      callGuard(guard, req("/dashboard/members"), context),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("allows users with the permission", async () => {
    const guard = requirePermission("MANAGE_MEMBERS");
    const context = makeContext();
    context.set(userContext, { _id: "u1", role: "super_admin" });
    const res = await callGuard(guard, req("/dashboard/members"), context);
    expect(res.status).toBe(200);
  });

  it("skips the permission check for loader requests when scoped to action", async () => {
    const guard = requirePermission("MANAGE_MEMBERS", "action");
    const context = makeContext();
    context.set(userContext, { _id: "u1", role: "member" });
    const res = await callGuard(guard, req("/dashboard/members", "GET"), context);
    expect(res.status).toBe(200);
  });

  it("enforces the permission check for action requests when scoped to action", async () => {
    const guard = requirePermission("MANAGE_MEMBERS", "action");
    const context = makeContext();
    context.set(userContext, { _id: "u1", role: "member" });
    await expect(
      callGuard(guard, req("/dashboard/members", "POST"), context),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("skips the permission check for action requests when scoped to loader", async () => {
    const guard = requirePermission("MANAGE_MEMBERS", "loader");
    const context = makeContext();
    context.set(userContext, { _id: "u1", role: "member" });
    const res = await callGuard(guard, req("/dashboard/members", "POST"), context);
    expect(res.status).toBe(200);
  });
});
