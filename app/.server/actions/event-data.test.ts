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
  cancelEvent,
  deleteEvent,
  getEvent,
  getEvents,
  toggleEventCheckIn,
  toggleEventInterest,
  updateEvent,
} from "~/.server/actions/event-data";
import { auth } from "~/.server/services/better-auth";
import { deleteFromCloudinary } from "~/.server/utils/cloudinary";
import Event from "~/.server/models/event";
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

const request = (url = "http://localhost/api/v1/events") =>
  new Request(url, { headers: { "x-forwarded-for": "127.0.0.1" } });

const session = (role: string, id: string) => ({
  user: { id, name: "Ada Lovelace", email: "ada@example.com", role },
});

const getSessionMock = vi.mocked(auth.api.getSession);
const deleteCloudinaryMock = vi.mocked(deleteFromCloudinary);

const makeUser = (id: string, role = "member") =>
  User.create({
    _id: id,
    name: "Ada Lovelace",
    email: `${id}@example.com`,
    password: "hashed",
    role,
  });

const makeEvent = (
  organizerId: string,
  opts: {
    title?: string;
    detail?: string;
    location?: string;
    date?: Date;
    time?: string;
    eventType?: string;
    status?: string;
    interestedMembers?: string[];
    checkedInMembers?: string[];
    capacity?: number;
    featuredImageId?: string;
    featuredImage?: string;
  } = {},
) =>
  Event.create({
    title: opts.title ?? "Quarterly Meeting",
    detail: opts.detail ?? "Review of Q3 goals.",
    location: opts.location ?? "Lagos",
    date: opts.date ?? new Date("2030-12-25T10:00:00Z"),
    time: opts.time ?? "10:00",
    eventType: opts.eventType ?? "meeting",
    status: opts.status ?? "upcoming",
    organizer: organizerId,
    ...(opts.interestedMembers ? { interestedMembers: opts.interestedMembers } : {}),
    ...(opts.checkedInMembers ? { checkedInMembers: opts.checkedInMembers } : {}),
    ...(opts.capacity ? { capacity: opts.capacity } : {}),
    ...(opts.featuredImageId ? { featuredImageId: opts.featuredImageId } : {}),
    ...(opts.featuredImage ? { featuredImage: opts.featuredImage } : {}),
  });

const listParams = (
  overrides: {
    page?: number;
    limit?: number;
    query?: string | undefined;
    status?: string | undefined;
    eventType?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
  } = {},
) => ({
  request: request(),
  page: 1,
  limit: 10,
  query: undefined,
  status: undefined,
  eventType: undefined,
  startDate: undefined,
  endDate: undefined,
  ...overrides,
});

describe("getEvents", () => {
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
    const res = await getEvents(listParams());
    expect(res.status).toBe(401);
  });

  it("rejects an invalid page or limit", async () => {
    expect((await getEvents(listParams({ page: 0 }))).status).toBe(400);
    expect((await getEvents(listParams({ limit: 0 }))).status).toBe(400);
    expect((await getEvents(listParams({ limit: 101 }))).status).toBe(400);
  });

  it("rejects an invalid status filter", async () => {
    const res = await getEvents(listParams({ status: "archived" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Invalid status filter");
  });

  it("rejects an invalid event type filter", async () => {
    const res = await getEvents(listParams({ eventType: "hangout" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Invalid event type filter");
  });

  it("rejects an unparseable start date", async () => {
    const res = await getEvents(listParams({ startDate: "garbage" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Invalid start date");
  });

  it("returns paginated events with meta", async () => {
    await makeEvent(adminId, { title: "Event One" });
    await makeEvent(adminId, { title: "Event Two" });
    await makeEvent(adminId, { title: "Event Three" });

    const res = await getEvents(listParams({ page: 1, limit: 2 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.body.events).toHaveLength(2);
    expect(body.body.meta).toMatchObject({
      total: 3,
      currentPage: 1,
      limit: 2,
      totalPages: 2,
      hasMore: true,
    });

    const pageTwo = await getEvents(listParams({ page: 2, limit: 2 }));
    const pageTwoBody = await pageTwo.json();
    expect(pageTwoBody.body.events).toHaveLength(1);
    expect(pageTwoBody.body.meta.hasMore).toBe(false);
  });

  it("filters by status", async () => {
    await makeEvent(adminId, { title: "Upcoming Gala", status: "upcoming" });
    await makeEvent(adminId, { title: "Done Gala", status: "completed" });

    const res = await getEvents(listParams({ status: "completed" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.body.events).toHaveLength(1);
    expect(body.body.events[0].title).toBe("Done Gala");
  });

  it("searches by title", async () => {
    await makeEvent(adminId, { title: "Zebra Summit" });
    await makeEvent(adminId, { title: "Sunset Gala" });

    const res = await getEvents(listParams({ query: "zebra" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.body.events).toHaveLength(1);
    expect(body.body.events[0].title).toBe("Zebra Summit");
  });

  it("filters by date range", async () => {
    await makeEvent(adminId, { title: "Mid Year", date: new Date("2030-06-01T10:00:00Z") });
    await makeEvent(adminId, { title: "Next Year", date: new Date("2031-06-01T10:00:00Z") });

    const res = await getEvents(
      listParams({ startDate: "2030-01-01", endDate: "2030-12-31" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.body.events).toHaveLength(1);
    expect(body.body.events[0].title).toBe("Mid Year");
  });
});

describe("getEvent", () => {
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
    const res = await getEvent(request(), { eventId: new mongoose.Types.ObjectId().toString() });
    expect(res.status).toBe(401);
  });

  it("returns 400 for an invalid event id", async () => {
    const res = await getEvent(request(), { eventId: "not-an-id" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Event ID is required");
  });

  it("returns 404 for an unknown event", async () => {
    const res = await getEvent(request(), { eventId: new mongoose.Types.ObjectId().toString() });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.message).toBe("Event not found");
  });

  it("returns the event with the organizer populated", async () => {
    await makeUser(adminId);
    const event = await makeEvent(adminId, { title: "Zebra Summit" });
    const res = await getEvent(request(), { eventId: event._id.toString() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.body.title).toBe("Zebra Summit");
    expect(body.body.organizer.name).toBe("Ada Lovelace");
  });
});

describe("updateEvent", () => {
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
    title: "Updated Meeting",
    detail: "Updated details for the meeting.",
    location: "Lagos Island",
    date: "2030-12-25",
    time: "11:00",
    eventType: "meeting" as const,
    organizer: adminId,
    ...overrides,
  });

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await updateEvent(
      request(),
      updatePayload(),
      new mongoose.Types.ObjectId().toString(),
    );
    expect(res.status).toBe(401);
  });

  it("forbids members from updating events", async () => {
    getSessionMock.mockResolvedValue(session("member", memberId) as never);
    const res = await updateEvent(
      request(),
      updatePayload(),
      new mongoose.Types.ObjectId().toString(),
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.message).toContain("MANAGE_EVENTS");
  });

  it("returns 400 for an invalid event id", async () => {
    const res = await updateEvent(request(), updatePayload(), "not-an-id");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Invalid event id");
  });

  it("returns 400 for an invalid payload", async () => {
    const res = await updateEvent(
      request(),
      updatePayload({ title: "AB" }) as never,
      new mongoose.Types.ObjectId().toString(),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Invalid data format");
  });

  it("returns 404 for an unknown event", async () => {
    const res = await updateEvent(
      request(),
      updatePayload(),
      new mongoose.Types.ObjectId().toString(),
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.message).toBe("Event not found");
  });

  it("updates the event and records an audit log", async () => {
    const event = await makeEvent(adminId, { title: "Original Meeting" });
    const res = await updateEvent(request(), updatePayload(), event._id.toString());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.body.title).toBe("Updated Meeting");
    expect(body.body.date).toBe(new Date("2030-12-25T11:00:00").toISOString());

    const updated = await Event.findById(event._id).lean();
    expect(updated!.title).toBe("Updated Meeting");
    expect(await AuditLog.countDocuments({ action: "UPDATE_EVENT" })).toBe(1);
  });

  it("deletes the old featured image when it is replaced", async () => {
    const event = await makeEvent(adminId, {
      title: "Original Meeting",
      featuredImage: "https://img.example/old.jpg",
      featuredImageId: "img-old",
    });
    const res = await updateEvent(
      request(),
      updatePayload({ featuredImage: "https://img.example/new.jpg", featuredImageId: "img-new" }),
      event._id.toString(),
    );
    expect(res.status).toBe(200);
    expect(deleteCloudinaryMock).toHaveBeenCalledWith(["img-old"]);

    const updated = await Event.findById(event._id).lean();
    expect(updated!.featuredImageId).toBe("img-new");
  });
});

describe("deleteEvent", () => {
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
    const res = await deleteEvent(request(), {
      eventId: new mongoose.Types.ObjectId().toString(),
    });
    expect(res.status).toBe(401);
  });

  it("forbids members from deleting events", async () => {
    getSessionMock.mockResolvedValue(session("member", memberId) as never);
    const res = await deleteEvent(request(), {
      eventId: new mongoose.Types.ObjectId().toString(),
    });
    expect(res.status).toBe(403);
  });

  it("returns 400 for an invalid event id", async () => {
    const res = await deleteEvent(request(), { eventId: "not-an-id" });
    expect(res.status).toBe(400);
  });

  it("deletes idempotently when the event is unknown", async () => {
    const res = await deleteEvent(request(), {
      eventId: new mongoose.Types.ObjectId().toString(),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe("Event deleted successfully");
  });

  it("deletes the event, image and records an audit log", async () => {
    const event = await makeEvent(adminId, {
      title: "Doomed Gala",
      featuredImageId: "img-doom",
    });
    const res = await deleteEvent(request(), { eventId: event._id.toString() });
    expect(res.status).toBe(200);

    expect(await Event.findById(event._id).lean()).toBeNull();
    expect(deleteCloudinaryMock).toHaveBeenCalledWith(["img-doom"]);
    expect(await AuditLog.countDocuments({ action: "DELETE_EVENT" })).toBe(1);
  });
});

describe("cancelEvent", () => {
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
    await makeUser(memberId, "member");
    getSessionMock.mockResolvedValue(session("admin", adminId) as never);
  });

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await cancelEvent(request(), {
      eventId: new mongoose.Types.ObjectId().toString(),
    });
    expect(res.status).toBe(401);
  });

  it("forbids members from cancelling events", async () => {
    getSessionMock.mockResolvedValue(session("member", memberId) as never);
    const res = await cancelEvent(request(), {
      eventId: new mongoose.Types.ObjectId().toString(),
    });
    expect(res.status).toBe(403);
  });

  it("returns 400 for an invalid event id", async () => {
    const res = await cancelEvent(request(), { eventId: "not-an-id" });
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown event", async () => {
    const res = await cancelEvent(request(), {
      eventId: new mongoose.Types.ObjectId().toString(),
    });
    expect(res.status).toBe(404);
  });

  it("refuses to cancel a completed event", async () => {
    const event = await makeEvent(adminId, { status: "completed" });
    const res = await cancelEvent(request(), { eventId: event._id.toString() });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("Only upcoming or ongoing events can be cancelled");
  });

  it("cancels an upcoming event, logs it and notifies interested members", async () => {
    const event = await makeEvent(adminId, {
      title: "Zebra Summit",
      status: "upcoming",
      interestedMembers: [memberId],
    });
    const res = await cancelEvent(request(), { eventId: event._id.toString() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe("Event cancelled");

    const updated = await Event.findById(event._id).lean();
    expect(updated!.status).toBe("cancelled");

    expect(await AuditLog.countDocuments({ action: "CANCEL_EVENT" })).toBe(1);
    expect(await Notification.countDocuments({ type: "event_cancelled" })).toBe(2);
  });

  it("is idempotent when the event is already cancelled", async () => {
    const event = await makeEvent(adminId, { status: "cancelled" });
    const res = await cancelEvent(request(), { eventId: event._id.toString() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe("Event already cancelled");
    expect(await AuditLog.countDocuments({ action: "CANCEL_EVENT" })).toBe(0);
  });
});

describe("toggleEventInterest", () => {
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
    await makeUser(memberId, "member");
    getSessionMock.mockResolvedValue(session("member", memberId) as never);
  });

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await toggleEventInterest(request(), {
      eventId: new mongoose.Types.ObjectId().toString(),
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 for an invalid event id", async () => {
    const res = await toggleEventInterest(request(), { eventId: "not-an-id" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Invalid event id");
  });

  it("returns 404 for an unknown event", async () => {
    const res = await toggleEventInterest(request(), {
      eventId: new mongoose.Types.ObjectId().toString(),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.message).toBe("Event not found");
  });

  it("marks the user as interested and returns the count", async () => {
    const event = await makeEvent(adminId, {
      interestedMembers: [adminId],
    });
    const res = await toggleEventInterest(request(), {
      eventId: event._id.toString(),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.body).toMatchObject({ interested: true, count: 2 });

    const updated = await Event.findById(event._id).lean();
    expect(updated!.interestedMembers.map(String)).toContain(memberId);
  });

  it("removes interest when already interested", async () => {
    const event = await makeEvent(adminId, {
      interestedMembers: [memberId],
    });
    const res = await toggleEventInterest(request(), {
      eventId: event._id.toString(),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.body).toMatchObject({ interested: false, count: 0 });

    const updated = await Event.findById(event._id).lean();
    expect(updated!.interestedMembers.map(String)).not.toContain(memberId);
  });

  it("rejects a new interest when the event is at full capacity", async () => {
    const event = await makeEvent(adminId, {
      capacity: 1,
      interestedMembers: [adminId],
    });
    const res = await toggleEventInterest(request(), {
      eventId: event._id.toString(),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("This event is at full capacity");
  });

  it("allows removing interest even when the event is at full capacity", async () => {
    const event = await makeEvent(adminId, {
      capacity: 1,
      interestedMembers: [adminId, memberId],
    });
    const res = await toggleEventInterest(request(), {
      eventId: event._id.toString(),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.body).toMatchObject({ interested: false, count: 1 });
  });

  it("rejects interest in a completed event unless already interested", async () => {
    const event = await makeEvent(adminId, { status: "completed" });
    const res = await toggleEventInterest(request(), {
      eventId: event._id.toString(),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("completed or cancelled");
  });
});

describe("toggleEventCheckIn", () => {
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
    await makeUser(memberId, "member");
    getSessionMock.mockResolvedValue(session("admin", adminId) as never);
  });

  const checkInParams = (eventId: string) => ({
    eventId,
    memberId,
  });

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await toggleEventCheckIn(
      request(),
      checkInParams(new mongoose.Types.ObjectId().toString()),
    );
    expect(res.status).toBe(401);
  });

  it("forbids members from managing check-ins", async () => {
    getSessionMock.mockResolvedValue(session("member", memberId) as never);
    const res = await toggleEventCheckIn(
      request(),
      checkInParams(new mongoose.Types.ObjectId().toString()),
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.message).toContain("MANAGE_EVENTS");
  });

  it("returns 400 for an invalid event id", async () => {
    const res = await toggleEventCheckIn(request(), {
      eventId: "not-an-id",
      memberId,
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Invalid event id");
  });

  it("returns 400 for an invalid member id", async () => {
    const res = await toggleEventCheckIn(request(), {
      eventId: new mongoose.Types.ObjectId().toString(),
      memberId: "not-an-id",
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Invalid member id");
  });

  it("returns 404 for an unknown event", async () => {
    const res = await toggleEventCheckIn(
      request(),
      checkInParams(new mongoose.Types.ObjectId().toString()),
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.message).toBe("Event not found");
  });

  it("rejects checking in a member who is not interested", async () => {
    const event = await makeEvent(adminId);
    const res = await toggleEventCheckIn(
      request(),
      checkInParams(event._id.toString()),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Member is not interested in this event");
  });

  it("checks in an interested member and records an audit log", async () => {
    const event = await makeEvent(adminId, {
      interestedMembers: [memberId],
    });
    const res = await toggleEventCheckIn(
      request(),
      checkInParams(event._id.toString()),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.body).toMatchObject({ checkedIn: true, count: 1 });

    const updated = await Event.findById(event._id).lean();
    expect(updated!.checkedInMembers.map(String)).toContain(memberId);
    expect(
      await AuditLog.countDocuments({ action: "EVENT_CHECK_IN" }),
    ).toBe(1);
  });

  it("removes a check-in when toggled again", async () => {
    const event = await makeEvent(adminId, {
      interestedMembers: [memberId],
      checkedInMembers: [memberId],
    });
    const res = await toggleEventCheckIn(
      request(),
      checkInParams(event._id.toString()),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.body).toMatchObject({ checkedIn: false, count: 0 });

    const updated = await Event.findById(event._id).lean();
    expect(updated!.checkedInMembers.map(String)).not.toContain(memberId);
  });
});
