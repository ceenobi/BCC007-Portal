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
  changeEmailRequest,
  updateAvatarRequest,
  updateMemberRole,
  updateProfileRequest,
} from "~/.server/actions/auth";
import { auth } from "~/.server/services/better-auth";
import { workflowClient } from "~/.server/workflows/client";
import User from "~/.server/models/user";
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
  auth: {
    api: {
      getSession: vi.fn(),
      updateUser: vi.fn(),
      changeEmail: vi.fn(),
    },
  },
}));

vi.mock("~/.server/workflows/client", () => ({
  workflowClient: { trigger: vi.fn(async () => ({})) },
}));

vi.mock("~/.server/config/redis", () => ({
  default: () => null,
}));

const request = () =>
  new Request("http://localhost/api/v1/auth", {
    headers: { "x-forwarded-for": "127.0.0.1" },
  });

const session = (role: string, id: string) => ({
  user: { id, name: "Ada Lovelace", email: "ada@example.com", role },
});

const getSessionMock = vi.mocked(auth.api.getSession);
const updateUserMock = vi.mocked(auth.api.updateUser);
const changeEmailMock = vi.mocked(auth.api.changeEmail);
const triggerMock = vi.mocked(workflowClient.trigger);

describe("updateProfileRequest", () => {
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

  beforeEach(async () => {
    await User.create({
      _id: userId,
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "hashed",
      role: "member",
      phone: "+12345678901",
      disableBirthDate: true,
    });
    getSessionMock.mockResolvedValue(session("member", userId) as never);
    updateUserMock.mockResolvedValue(
      new Response(null, { status: 200 }) as never,
    );
  });

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await updateProfileRequest(request(), {});
    expect(res.status).toBe(401);
  });

  it("returns 400 for an invalid phone number", async () => {
    const res = await updateProfileRequest(request(), { phone: "12345" });
    expect(res.status).toBe(400);
  });

  it("falls back to stored DB values for unsubmitted fields", async () => {
    const res = await updateProfileRequest(request(), { name: "Ada" });
    expect(res.status).toBe(200);

    expect(updateUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          name: "Ada",
          phone: "+12345678901",
          disableBirthDate: true,
          disableEmail: false,
          disableGender: false,
        }),
      }),
    );
  });

  it("records an audit log and notification on success", async () => {
    const res = await updateProfileRequest(request(), { name: "Ada" });
    expect(res.status).toBe(200);
    expect(await AuditLog.countDocuments({ action: "PROFILE_UPDATE" })).toBe(1);
    expect(await Notification.countDocuments({ type: "profile_updated" })).toBe(1);
  });
});

describe("updateAvatarRequest", () => {
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
    getSessionMock.mockResolvedValue(session("member", userId) as never);
    updateUserMock.mockResolvedValue(
      new Response(null, { status: 200 }) as never,
    );
  });

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await updateAvatarRequest(request(), { image: "https://img" });
    expect(res.status).toBe(401);
  });

  it("allows clearing the avatar with an empty image string", async () => {
    const res = await updateAvatarRequest(request(), { image: "" });
    expect(res.status).toBe(200);
    expect(updateUserMock).toHaveBeenCalledWith(
      expect.objectContaining({ body: { image: "", imagePublicId: undefined } }),
    );
  });

  it("updates the user image through better-auth", async () => {
    const res = await updateAvatarRequest(request(), {
      image: "https://img.cloud",
      imagePublicId: "avatars/abc",
    });
    expect(res.status).toBe(200);
    expect(updateUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { image: "https://img.cloud", imagePublicId: "avatars/abc" },
      }),
    );
  });
});

describe("changeEmailRequest", () => {
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
    getSessionMock.mockResolvedValue(session("member", userId) as never);
    changeEmailMock.mockResolvedValue(
      new Response(null, { status: 200 }) as never,
    );
  });

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await changeEmailRequest(request(), { newEmail: "new@example.com" });
    expect(res.status).toBe(401);
  });

  it("returns 400 for an invalid email", async () => {
    const res = await changeEmailRequest(request(), { newEmail: "not-an-email" });
    expect(res.status).toBe(400);
  });

  it("delegates to better-auth, triggers the confirmation workflow and audits", async () => {
    const res = await changeEmailRequest(request(), { newEmail: "new@example.com" });
    expect(res.status).toBe(200);

    expect(changeEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        body: {
          newEmail: "new@example.com",
          callbackURL: expect.stringContaining("/auth/verify-email"),
        },
      }),
    );
    expect(triggerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining("email-change-confirmation"),
      }),
    );
    expect(await AuditLog.countDocuments({ action: "EMAIL_CHANGE" })).toBe(1);
  });
});

describe("updateMemberRole", () => {
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

  const superAdminId = new mongoose.Types.ObjectId().toString();
  const memberId = new mongoose.Types.ObjectId().toString();
  const targetId = new mongoose.Types.ObjectId().toString();

  beforeEach(async () => {
    await User.create({
      _id: superAdminId,
      name: "Super",
      email: "super@example.com",
      password: "hashed",
      role: "super_admin",
    });
    await User.create({
      _id: memberId,
      name: "Member",
      email: "member@example.com",
      password: "hashed",
      role: "member",
    });
    await User.create({
      _id: targetId,
      name: "Target",
      email: "target@example.com",
      password: "hashed",
      role: "member",
    });
    getSessionMock.mockResolvedValue(session("super_admin", superAdminId) as never);
  });

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await updateMemberRole(request(), { role: "admin", id: targetId });
    expect(res.status).toBe(401);
  });

  it("forbids users without MANAGE_ROLES", async () => {
    getSessionMock.mockResolvedValue(session("member", memberId) as never);
    const res = await updateMemberRole(request(), { role: "admin", id: targetId });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.message).toContain("insufficient permissions");
  });

  it("returns 400 when the target member does not exist", async () => {
    const res = await updateMemberRole(request(), {
      role: "admin",
      id: new mongoose.Types.ObjectId().toString(),
    });
    expect(res.status).toBe(400);
  });

  it("updates the role and records an audit log and notification", async () => {
    const res = await updateMemberRole(request(), { role: "admin", id: targetId });
    expect(res.status).toBe(200);

    const updated = await User.findById(targetId).lean();
    expect(updated!.role).toBe("admin");
    expect(await AuditLog.countDocuments({ action: "UPDATE_ROLE" })).toBe(1);
    expect(await Notification.countDocuments({ type: "role_updated" })).toBe(1);
  });
});
