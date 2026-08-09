import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createEvent, getUpcomingEvents, toggleEventInterest } from "~/.server/actions/event-data";
import { auth } from "~/.server/services/better-auth";
import { workflowClient } from "~/.server/workflows/client";
import Event from "~/.server/models/event";
import Notification from "~/.server/models/notification";
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

describe("toggleEventInterest", () => {
  const memberId = new mongoose.Types.ObjectId().toString();
  const adminId = new mongoose.Types.ObjectId().toString();

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

  const createEvent = (status: string) =>
    Event.create({
      title: "Quarterly Meeting",
      detail: "Review of Q3 goals.",
      location: "Lagos",
      date: new Date("2030-12-25T10:00:00Z"),
      time: "10:00",
      eventType: "meeting",
      status,
      organizer: adminId,
    });

  beforeEach(() => {
    getSessionMock.mockResolvedValue(session("member", memberId) as never);
  });

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await toggleEventInterest(request(), { eventId: new mongoose.Types.ObjectId().toString() });
    expect(res.status).toBe(401);
  });

  it("returns 400 for an invalid event id", async () => {
    const res = await toggleEventInterest(request(), { eventId: "not-an-id" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Invalid event id");
  });

  it("returns 404 for an unknown event", async () => {
    const res = await toggleEventInterest(request(), { eventId: new mongoose.Types.ObjectId().toString() });
    expect(res.status).toBe(404);
  });

  it("marks interest on an upcoming event", async () => {
    const event = await createEvent("upcoming");
    const res = await toggleEventInterest(request(), { eventId: event._id.toString() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.body.interested).toBe(true);
    expect(body.body.count).toBe(1);

    const updated = await Event.findById(event._id).lean();
    expect(
      updated!.interestedMembers.map((id: mongoose.Types.ObjectId) => id.toString()),
    ).toContain(memberId);
  });

  it("toggles interest off when already interested", async () => {
    const event = await createEvent("upcoming");
    await toggleEventInterest(request(), { eventId: event._id.toString() });

    const res = await toggleEventInterest(request(), { eventId: event._id.toString() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.body.interested).toBe(false);
    expect(body.body.count).toBe(0);
  });

  it("rejects new interest on a completed event", async () => {
    const event = await createEvent("completed");
    const res = await toggleEventInterest(request(), { eventId: event._id.toString() });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("completed or cancelled event");
  });

  it("allows removing prior interest from a completed event", async () => {
    const event = await createEvent("completed");
    event.interestedMembers = [new mongoose.Types.ObjectId(memberId)];
    await event.save();

    const res = await toggleEventInterest(request(), { eventId: event._id.toString() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.body.interested).toBe(false);
  });
});

describe("createEvent", () => {
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
    getSessionMock.mockResolvedValue(session("admin", adminId) as never);
  });

  const validPayload = {
    title: "Quarterly Meeting",
    detail: "Review of Q3 goals and milestones.",
    location: "Lagos Island",
    date: "2030-12-25",
    time: "10:00",
    eventType: "meeting" as const,
    organizer: adminId,
  };

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await createEvent(request(), validPayload);
    expect(res.status).toBe(401);
  });

  it("forbids members from creating events", async () => {
    getSessionMock.mockResolvedValue(session("member", memberId) as never);
    const res = await createEvent(request(), validPayload);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.message).toContain("MANAGE_EVENTS");
  });

  it("returns 400 for an event in the past", async () => {
    const res = await createEvent(request(), { ...validPayload, date: "2020-01-01" });
    expect(res.status).toBe(400);
  });

  it("creates an event with a parsed date and logs it", async () => {
    const res = await createEvent(request(), validPayload);
    expect(res.status).toBe(201);

    const event = await Event.findOne({ title: "Quarterly Meeting" }).lean();
    expect(event).toBeTruthy();
    expect(event!.date.toISOString()).toBe(new Date("2030-12-25T10:00:00").toISOString());
    expect(event!.status).toBe("upcoming");

    expect(await AuditLog.countDocuments({ action: "CREATE_EVENT" })).toBe(1);
    expect(vi.mocked(workflowClient.trigger)).toHaveBeenCalledWith(
      expect.objectContaining({ url: expect.stringContaining("event-created") }),
    );
  });

  it("replays idempotently when the idempotency key is reused", async () => {
    const payload = { ...validPayload, idempotencyKey: "evt-dup" };
    await createEvent(request(), payload);
    const second = await createEvent(request(), payload);
    expect(second.status).toBe(201);
    expect(await Event.countDocuments({ idempotencyKey: "evt-dup" })).toBe(1);
  });
});

describe("getUpcomingEvents", () => {
  const adminId = new mongoose.Types.ObjectId().toString();

  beforeAll(async () => {
    await connectTestDB();
  });
  afterEach(async () => {
    await clearTestDB();
  });
  afterAll(async () => {
    await disconnectTestDB();
  });

  const createEvent = (title: string, status: string, date: string) =>
    Event.create({
      title,
      detail: "Detail for the event.",
      location: "Lagos",
      date: new Date(date),
      time: "10:00",
      eventType: "meeting",
      status,
      organizer: adminId,
    });

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await getUpcomingEvents(request());
    expect(res.status).toBe(401);
  });

  it("returns only upcoming events sorted by date", async () => {
    getSessionMock.mockResolvedValue(session("member", adminId) as never);
    await createEvent("Later", "upcoming", "2030-06-01T10:00:00Z");
    await createEvent("Sooner", "upcoming", "2030-01-01T10:00:00Z");
    await createEvent("Done", "completed", "2025-01-01T10:00:00Z");

    const res = await getUpcomingEvents(request());
    expect(res.status).toBe(200);
    const body = await res.json();
    const events = body.body as Array<{ title: string }>;
    expect(events.map((e) => e.title)).toEqual(["Sooner", "Later"]);
  });
});
