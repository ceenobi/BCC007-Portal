import type { WorkflowContext } from "@upstash/workflow";
import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { connectToDB } from "~/.server/config/database";
import Event from "~/.server/models/event";
import Notification from "~/.server/models/notification";
import User from "~/.server/models/user";
import { runStatusUpdatesWorkflow } from "~/.server/workflows/status.workflow";
import { clearTestDB, disconnectTestDB } from "~/test/helpers/db";

vi.mock("~/.server/config/redis", () => ({
  default: () => null,
}));

const fakeContext = {
  run: async <T>(_id: string, fn: () => Promise<T>): Promise<T> => fn(),
} as unknown as WorkflowContext;

const startOfToday = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const addDays = (base: Date, days: number) =>
  new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

describe("runStatusUpdatesWorkflow (integration)", () => {
  let organizer: mongoose.Document;
  let interested: mongoose.Document;

  beforeAll(async () => {
    await connectToDB();
  });

  afterEach(async () => {
    await clearTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  const createUser = async (email: string) =>
    User.create({ name: email.split("@")[0], email, password: "hashed" });

  beforeEach(async () => {
    organizer = await createUser("organizer@example.com");
    interested = await createUser("interested@example.com");
  });

  const makeEvent = (title: string, status: string, date: Date) =>
    Event.create({
      title,
      detail: `Detail for ${title}`,
      location: "Lagos",
      date,
      time: "10:00",
      eventType: "meeting",
      status,
      organizer: organizer._id,
      interestedMembers: [interested._id],
    });

  it("transitions events to ongoing/completed and notifies recipients", async () => {
    const eFuture = await makeEvent("Future", "upcoming", addDays(startOfToday(), 1));
    const eOngoingNow = await makeEvent("Ongoing Now", "upcoming", startOfToday());
    const ePastUpcoming = await makeEvent("Past Upcoming", "upcoming", addDays(startOfToday(), -1));
    const ePastOngoing = await makeEvent("Past Ongoing", "ongoing", addDays(startOfToday(), -1));
    const eTodayOngoing = await makeEvent("Today Ongoing", "ongoing", startOfToday());

    const summary = await runStatusUpdatesWorkflow(fakeContext);

    expect(summary.checked).toBe(5);
    expect(summary.ongoing).toBe(1);
    expect(summary.completed).toBe(2);

    const statusOf = async (id: unknown) => (await Event.findById(id).lean())?.status;
    expect(await statusOf(eFuture._id)).toBe("upcoming");
    expect(await statusOf(eOngoingNow._id)).toBe("ongoing");
    expect(await statusOf(ePastUpcoming._id)).toBe("completed");
    expect(await statusOf(ePastOngoing._id)).toBe("completed");
    expect(await statusOf(eTodayOngoing._id)).toBe("ongoing");

    // One notification per transition recipient (organizer + interested).
    expect(await Notification.countDocuments({ type: "event_ongoing" })).toBe(2);
    expect(await Notification.countDocuments({ type: "event_completed" })).toBe(4);
  });

  it("is idempotent across re-runs and sends no duplicate notifications", async () => {
    await makeEvent("Ongoing Now", "upcoming", startOfToday());
    await makeEvent("Past Upcoming", "upcoming", addDays(startOfToday(), -1));

    const first = await runStatusUpdatesWorkflow(fakeContext);
    expect(first.ongoing + first.completed).toBe(2);

    const second = await runStatusUpdatesWorkflow(fakeContext);
    expect(second.ongoing).toBe(0);
    expect(second.completed).toBe(0);

    // Notifications were only created during the first run.
    expect(await Notification.countDocuments({ type: "event_ongoing" })).toBe(2);
    expect(await Notification.countDocuments({ type: "event_completed" })).toBe(2);
  });

  it("reports checked counts even when nothing changes", async () => {
    await makeEvent("Future", "upcoming", addDays(startOfToday(), 1));
    const summary = await runStatusUpdatesWorkflow(fakeContext);
    expect(summary.checked).toBe(1);
    expect(summary.ongoing).toBe(0);
    expect(summary.completed).toBe(0);
  });
});
