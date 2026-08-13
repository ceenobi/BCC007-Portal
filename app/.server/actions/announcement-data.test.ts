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
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncement,
  getAnnouncements,
  updateAnnouncement,
} from "~/.server/actions/announcement-data";
import { auth } from "~/.server/services/better-auth";
import { deleteFromCloudinary } from "~/.server/utils/cloudinary";
import { workflowClient } from "~/.server/workflows/client";
import Announcement from "~/.server/models/announcement";
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
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock("~/.server/workflows/client", () => ({
  workflowClient: { trigger: vi.fn(async () => ({})) },
}));

vi.mock("~/.server/config/redis", () => ({
  default: () => null,
}));

vi.mock("~/.server/utils/cloudinary", () => ({
  deleteFromCloudinary: vi.fn(async () => ({})),
}));

vi.mock("~/.server/utils/cache", () => ({
  fetchWithCache: vi.fn(async (_key: string, _ttl: number, fn: () => Promise<unknown>) =>
    fn(),
  ),
  invalidateCache: vi.fn(async () => {}),
}));

const request = (url = "http://localhost/api/v1/announcements") =>
  new Request(url, { headers: { "x-forwarded-for": "127.0.0.1" } });

const session = (role: string, id: string) => ({
  user: { id, name: "Ada Lovelace", email: "ada@example.com", role },
});

const getSessionMock = vi.mocked(auth.api.getSession);
const deleteCloudinaryMock = vi.mocked(deleteFromCloudinary);
const triggerMock = vi.mocked(workflowClient.trigger);

const makeUser = (id: string, role = "member") =>
  User.create({
    _id: id,
    name: "Ada Lovelace",
    email: `${id}@example.com`,
    password: "hashed",
    role,
  });

const makeAnnouncement = (
  authorId: string,
  opts: {
    title?: string;
    content?: string;
    status?: string;
    isPinned?: boolean;
    featuredImageId?: string;
    featuredImage?: string;
    publishedAt?: Date;
  } = {},
) =>
  Announcement.create({
    title: opts.title ?? "Group Announcement",
    content: opts.content ?? "A message for the whole group.",
    status: opts.status ?? "draft",
    author: authorId,
    ...(opts.isPinned !== undefined ? { isPinned: opts.isPinned } : {}),
    ...(opts.featuredImageId ? { featuredImageId: opts.featuredImageId } : {}),
    ...(opts.featuredImage ? { featuredImage: opts.featuredImage } : {}),
    ...(opts.publishedAt ? { publishedAt: opts.publishedAt } : {}),
  });

const listParams = (
  overrides: {
    page?: number;
    limit?: number;
    query?: string | undefined;
    status?: string | undefined;
  } = {},
) => ({
  request: request(),
  page: 1,
  limit: 10,
  query: undefined,
  status: undefined,
  ...overrides,
});

describe("getAnnouncements", () => {
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

  const adminId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    getSessionMock.mockResolvedValue(session("admin", adminId) as never);
  });

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await getAnnouncements(listParams());
    expect(res.status).toBe(401);
  });

  it("rejects an invalid page or limit", async () => {
    expect((await getAnnouncements(listParams({ page: 0 }))).status).toBe(400);
    expect((await getAnnouncements(listParams({ limit: 0 }))).status).toBe(400);
    expect((await getAnnouncements(listParams({ limit: 101 }))).status).toBe(400);
  });

  it("rejects an invalid status filter", async () => {
    const res = await getAnnouncements(listParams({ status: "bogus" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Invalid status filter");
  });

  it("returns paginated announcements with meta", async () => {
    await makeAnnouncement(adminId, { title: "One" });
    await makeAnnouncement(adminId, { title: "Two" });
    await makeAnnouncement(adminId, { title: "Three" });

    const res = await getAnnouncements(listParams({ page: 1, limit: 2 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.body.announcements).toHaveLength(2);
    expect(body.body.meta).toMatchObject({
      total: 3,
      currentPage: 1,
      limit: 2,
      totalPages: 2,
      hasMore: true,
    });

    const pageTwo = await getAnnouncements(listParams({ page: 2, limit: 2 }));
    const pageTwoBody = await pageTwo.json();
    expect(pageTwoBody.body.announcements).toHaveLength(1);
    expect(pageTwoBody.body.meta.hasMore).toBe(false);
  });

  it("sorts pinned announcements first", async () => {
    await makeAnnouncement(adminId, { title: "Plain" });
    await makeAnnouncement(adminId, { title: "Pinned One", isPinned: true });

    const res = await getAnnouncements(listParams());
    const body = await res.json();
    expect(body.body.announcements[0].title).toBe("Pinned One");
  });

  it("filters by status", async () => {
    await makeAnnouncement(adminId, { title: "Draft Note", status: "draft" });
    await makeAnnouncement(adminId, { title: "Live Note", status: "published" });

    const res = await getAnnouncements(listParams({ status: "published" }));
    const body = await res.json();
    expect(body.body.announcements).toHaveLength(1);
    expect(body.body.announcements[0].title).toBe("Live Note");
  });

  it("searches by title and content", async () => {
    await makeAnnouncement(adminId, { title: "Zebra Summit" });
    await makeAnnouncement(adminId, { title: "Rostrum", content: "Zebras welcome" });

    const res = await getAnnouncements(listParams({ query: "zebra" }));
    const body = await res.json();
    expect(body.body.announcements).toHaveLength(2);
  });

  it("only exposes published announcements to members", async () => {
    await makeAnnouncement(adminId, { title: "Draft Note", status: "draft" });
    await makeAnnouncement(adminId, { title: "Live Note", status: "published" });

    getSessionMock.mockResolvedValue(session("member", adminId) as never);
    const res = await getAnnouncements(listParams());
    const body = await res.json();
    expect(body.body.announcements).toHaveLength(1);
    expect(body.body.announcements[0].title).toBe("Live Note");
  });
});

describe("getAnnouncement", () => {
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

  const adminId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    getSessionMock.mockResolvedValue(session("member", adminId) as never);
  });

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await getAnnouncement(request(), {
      announcementId: new mongoose.Types.ObjectId().toString(),
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 for an invalid announcement id", async () => {
    const res = await getAnnouncement(request(), { announcementId: "not-an-id" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Announcement ID is required");
  });

  it("returns 404 for an unknown announcement", async () => {
    const res = await getAnnouncement(request(), {
      announcementId: new mongoose.Types.ObjectId().toString(),
    });
    expect(res.status).toBe(404);
  });

  it("hides non-published announcements from members", async () => {
    await makeUser(adminId);
    const announcement = await makeAnnouncement(adminId, { status: "draft" });
    const res = await getAnnouncement(request(), {
      announcementId: announcement._id.toString(),
    });
    expect(res.status).toBe(404);
  });

  it("returns a published announcement with the author populated", async () => {
    await makeUser(adminId);
    const announcement = await makeAnnouncement(adminId, {
      title: "Zebra Summit",
      status: "published",
    });
    const res = await getAnnouncement(request(), {
      announcementId: announcement._id.toString(),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.body.title).toBe("Zebra Summit");
    expect(body.body.author.name).toBe("Ada Lovelace");
  });
});

describe("createAnnouncement", () => {
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

  const adminId = new mongoose.Types.ObjectId().toString();
  const memberId = new mongoose.Types.ObjectId().toString();

  beforeEach(async () => {
    await makeUser(adminId, "admin");
    getSessionMock.mockResolvedValue(session("admin", adminId) as never);
  });

  const createPayload = (overrides: Record<string, unknown> = {}) => ({
    title: "Group Announcement",
    content: "A message for the whole group.",
    status: "draft" as const,
    isPinned: false,
    ...overrides,
  });

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await createAnnouncement(request(), createPayload() as never);
    expect(res.status).toBe(401);
  });

  it("forbids members from creating announcements", async () => {
    getSessionMock.mockResolvedValue(session("member", memberId) as never);
    const res = await createAnnouncement(request(), createPayload() as never);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.message).toContain("MANAGE_ANNOUNCEMENTS");
  });

  it("returns 400 for an invalid payload", async () => {
    const res = await createAnnouncement(
      request(),
      createPayload({ title: "AB" }) as never,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Invalid data format");
  });

  it("creates a draft announcement and records an audit log", async () => {
    const res = await createAnnouncement(request(), createPayload() as never);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.body.title).toBe("Group Announcement");
    expect(body.body.status).toBe("draft");
    expect(triggerMock).not.toHaveBeenCalled();
    expect(await AuditLog.countDocuments({ action: "CREATE_ANNOUNCEMENT" })).toBe(1);
  });

  it("sets publishedAt and broadcasts when created as published", async () => {
    const res = await createAnnouncement(
      request(),
      createPayload({ status: "published" }) as never,
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.body.status).toBe("published");
    expect(body.body.publishedAt).toBeTruthy();
    expect(triggerMock).toHaveBeenCalledTimes(1);
    const triggerArgs = triggerMock.mock.calls[0][0] as {
      workflowRunId?: string;
    };
    expect(triggerArgs.workflowRunId).toContain("announcement-created:");
  });

  it("replays idempotently when the same idempotency key is reused", async () => {
    await createAnnouncement(
      request(),
      createPayload({ idempotencyKey: "key-1" }) as never,
    );
    const res = await createAnnouncement(
      request(),
      createPayload({ idempotencyKey: "key-1" }) as never,
    );
    expect(res.status).toBe(201);
    expect(await Announcement.countDocuments()).toBe(1);
  });
});

describe("updateAnnouncement", () => {
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

  const adminId = new mongoose.Types.ObjectId().toString();
  const memberId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    getSessionMock.mockResolvedValue(session("admin", adminId) as never);
  });

  const updatePayload = (overrides: Record<string, unknown> = {}) => ({
    title: "Updated Announcement",
    content: "Updated content for the group.",
    status: "published" as const,
    isPinned: false,
    ...overrides,
  });

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await updateAnnouncement(request(), {
      announcementId: new mongoose.Types.ObjectId().toString(),
      ...updatePayload(),
    } as never);
    expect(res.status).toBe(401);
  });

  it("forbids members from updating announcements", async () => {
    getSessionMock.mockResolvedValue(session("member", memberId) as never);
    const res = await updateAnnouncement(request(), {
      announcementId: new mongoose.Types.ObjectId().toString(),
      ...updatePayload(),
    } as never);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.message).toContain("MANAGE_ANNOUNCEMENTS");
  });

  it("returns 400 for an invalid announcement id", async () => {
    const res = await updateAnnouncement(
      request(),
      { announcementId: "not-an-id", ...updatePayload() } as never,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Invalid announcement id");
  });

  it("returns 404 for an unknown announcement", async () => {
    const res = await updateAnnouncement(request(), {
      announcementId: new mongoose.Types.ObjectId().toString(),
      ...updatePayload(),
    } as never);
    expect(res.status).toBe(404);
  });

  it("updates the announcement and records an audit log", async () => {
    const announcement = await makeAnnouncement(adminId, { title: "Original" });
    const res = await updateAnnouncement(
      request(),
      { announcementId: announcement._id.toString(), ...updatePayload() } as never,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.body.title).toBe("Updated Announcement");
    expect(await AuditLog.countDocuments({ action: "UPDATE_ANNOUNCEMENT" })).toBe(1);
  });

  it("broadcasts only on a publish transition", async () => {
    const announcement = await makeAnnouncement(adminId, { status: "draft" });
    await updateAnnouncement(
      request(),
      { announcementId: announcement._id.toString(), ...updatePayload() } as never,
    );
    expect(triggerMock).toHaveBeenCalledTimes(1);

    const updated = await Announcement.findById(announcement._id).lean();
    expect(updated!.publishedAt).toBeTruthy();
  });

  it("deletes the old featured image when it is replaced", async () => {
    const announcement = await makeAnnouncement(adminId, {
      featuredImage: "https://img.example/old.jpg",
      featuredImageId: "img-old",
    });
    const res = await updateAnnouncement(
      request(),
      {
        announcementId: announcement._id.toString(),
        ...updatePayload({
          featuredImage: "https://img.example/new.jpg",
          featuredImageId: "img-new",
        }),
      } as never,
    );
    expect(res.status).toBe(200);
    expect(deleteCloudinaryMock).toHaveBeenCalledWith(["img-old"]);

    const updated = await Announcement.findById(announcement._id).lean();
    expect(updated!.featuredImageId).toBe("img-new");
  });
});

describe("deleteAnnouncement", () => {
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

  const adminId = new mongoose.Types.ObjectId().toString();
  const memberId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    getSessionMock.mockResolvedValue(session("admin", adminId) as never);
  });

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await deleteAnnouncement(request(), {
      announcementId: new mongoose.Types.ObjectId().toString(),
    });
    expect(res.status).toBe(401);
  });

  it("forbids members from deleting announcements", async () => {
    getSessionMock.mockResolvedValue(session("member", memberId) as never);
    const res = await deleteAnnouncement(request(), {
      announcementId: new mongoose.Types.ObjectId().toString(),
    });
    expect(res.status).toBe(403);
  });

  it("returns 400 for an invalid announcement id", async () => {
    const res = await deleteAnnouncement(request(), { announcementId: "not-an-id" });
    expect(res.status).toBe(400);
  });

  it("deletes idempotently when the announcement is unknown", async () => {
    const res = await deleteAnnouncement(request(), {
      announcementId: new mongoose.Types.ObjectId().toString(),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe("Announcement deleted successfully");
  });

  it("deletes the announcement, image and records an audit log", async () => {
    const announcement = await makeAnnouncement(adminId, {
      title: "Doomed Note",
      featuredImageId: "img-doom",
    });
    const res = await deleteAnnouncement(request(), {
      announcementId: announcement._id.toString(),
    });
    expect(res.status).toBe(200);

    expect(await Announcement.findById(announcement._id).lean()).toBeNull();
    expect(deleteCloudinaryMock).toHaveBeenCalledWith(["img-doom"]);
    expect(await AuditLog.countDocuments({ action: "DELETE_ANNOUNCEMENT" })).toBe(1);
  });
});
