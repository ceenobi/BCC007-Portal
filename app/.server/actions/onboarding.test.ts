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
import { completeOnboardingProfile } from "~/.server/actions/onboarding";
import { auth } from "~/.server/services/better-auth";
import AuditLog from "~/.server/models/auditlog";
import Notification from "~/.server/models/notification";
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
  auth: { api: { getSession: vi.fn(), updateUser: vi.fn() } },
}));

vi.mock("~/.server/config/redis", () => ({
  default: () => null,
}));

const request = () =>
  new Request("http://localhost/api/v1/onboarding", {
    headers: { "x-forwarded-for": "127.0.0.1" },
  });

const session = (role: string, id: string) => ({
  user: { id, name: "Ada Lovelace", email: "ada@example.com", role },
});

const getSessionMock = vi.mocked(auth.api.getSession);
const updateUserMock = vi.mocked(auth.api.updateUser);

describe("completeOnboardingProfile", () => {
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
    updateUserMock.mockResolvedValue(
      new Response("ok", { status: 200, headers: { "x-profile": "1" } }) as never,
    );
  });

  const validPayload = {
    name: "Ada Lovelace",
    phone: "+2348012345678",
    gender: "female" as const,
    occupation: "Engineer",
    location: "Lagos",
  };

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await completeOnboardingProfile(request(), validPayload);
    expect(res.status).toBe(401);
  });

  it("returns 400 for an invalid payload", async () => {
    const res = await completeOnboardingProfile(request(), {
      ...validPayload,
      phone: "08012345678",
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Invalid dataschema");
  });

  it("updates the user profile, logs it and sends a notification on success", async () => {
    const res = await completeOnboardingProfile(request(), validPayload);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe("Profile updated successfully");
    expect(res.headers.get("x-profile")).toBe("1");

    expect(updateUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          name: "Ada Lovelace",
          phone: "+2348012345678",
          gender: "female",
          occupation: "Engineer",
          location: "Lagos",
        }),
        asResponse: true,
      }),
    );
    expect(await AuditLog.countDocuments({ action: "PROFILE_UPDATE" })).toBe(1);
    expect(await Notification.countDocuments({ type: "profile_updated" })).toBe(1);
  });

  it("returns the upstream response when the profile update fails", async () => {
    updateUserMock.mockResolvedValue(
      new Response(JSON.stringify({ success: false, message: "Update failed" }), {
        status: 400,
      }) as never,
    );
    const res = await completeOnboardingProfile(request(), validPayload);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Update failed");
    expect(await AuditLog.countDocuments({ action: "PROFILE_UPDATE" })).toBe(0);
    expect(await Notification.countDocuments({ type: "profile_updated" })).toBe(0);
  });
});
