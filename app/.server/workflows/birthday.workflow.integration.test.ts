import type { WorkflowContext } from "@upstash/workflow";
import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { connectToDB } from "~/.server/config/database";
import User from "~/.server/models/user";
import { workflowClient } from "~/.server/workflows/client";
import { runBirthdayRemindersWorkflow } from "~/.server/workflows/birthday.workflow";
import { clearTestDB, disconnectTestDB } from "~/test/helpers/db";

vi.mock("~/.server/config/redis", () => ({
  default: () => null,
}));

const fakeContext = {
  run: async <T>(_id: string, fn: () => Promise<T>): Promise<T> => fn(),
} as unknown as WorkflowContext;

const today = new Date();
const todayKey = today.toISOString().slice(0, 10);

const birthdayOn = (year: number, month: number, day: number) =>
  new Date(Date.UTC(year, month, day, 12, 0, 0));

const todayBirthday = (year: number) =>
  birthdayOn(year, today.getUTCMonth(), today.getUTCDate());

describe("runBirthdayRemindersWorkflow (integration)", () => {
  let triggerSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(async () => {
    await connectToDB();
  });

  afterEach(async () => {
    await clearTestDB();
    triggerSpy.mockReset();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(() => {
    triggerSpy = vi
      .spyOn(workflowClient, "trigger")
      .mockResolvedValue({ workflowRunId: "run-1", deduplicated: false } as never);
  });

  const createMember = (overrides: Partial<Record<string, unknown>> = {}) =>
    User.create({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "hashed",
      isOnboarded: true,
      disableBirthDate: false,
      disableEmail: false,
      dateOfBirth: todayBirthday(1990),
      ...overrides,
    });

  it("triggers a reminder for an opted-in member whose birthday is today", async () => {
    const member = await createMember();

    const summary = await runBirthdayRemindersWorkflow(fakeContext);

    expect(summary.checked).toBe(1);
    expect(summary.reminded).toBe(1);
    expect(summary.deduplicated).toBe(0);
    expect(triggerSpy).toHaveBeenCalledTimes(1);
    const call = triggerSpy.mock.calls[0][0];
    expect(call.workflowRunId).toBe(`birthday-reminder:${member._id.toString()}:${todayKey}`);
    expect(call.body.user._id).toBe(member._id.toString());
    expect(call.body.age).toBe(new Date().getUTCFullYear() - 1990);
  });

  it("skips members whose birthday is not today", async () => {
    await createMember({ dateOfBirth: birthdayOn(1990, 0, 1) });
    const summary = await runBirthdayRemindersWorkflow(fakeContext);
    expect(summary.checked).toBe(0);
    expect(summary.reminded).toBe(0);
    expect(triggerSpy).not.toHaveBeenCalled();
  });

  it("skips members who are not onboarded", async () => {
    await createMember({ isOnboarded: false });
    const summary = await runBirthdayRemindersWorkflow(fakeContext);
    expect(summary.checked).toBe(0);
    expect(triggerSpy).not.toHaveBeenCalled();
  });

  it("skips members who opted out of birthday display", async () => {
    await createMember({ disableBirthDate: true });
    const summary = await runBirthdayRemindersWorkflow(fakeContext);
    expect(summary.checked).toBe(0);
    expect(triggerSpy).not.toHaveBeenCalled();
  });

  it("skips members with a missing date of birth", async () => {
    await createMember({ dateOfBirth: null });
    const summary = await runBirthdayRemindersWorkflow(fakeContext);
    expect(summary.checked).toBe(0);
    expect(triggerSpy).not.toHaveBeenCalled();
  });

  it("still triggers reminders for members who opted out of newsletter email", async () => {
    await createMember({ disableEmail: true });
    const summary = await runBirthdayRemindersWorkflow(fakeContext);
    expect(summary.reminded).toBe(1);
  });

  it("counts deduplicated runs from QStash", async () => {
    triggerSpy.mockResolvedValue({
      workflowRunId: "dup",
      deduplicated: true,
    } as never);
    await createMember();
    const summary = await runBirthdayRemindersWorkflow(fakeContext);
    expect(summary.reminded).toBe(0);
    expect(summary.deduplicated).toBe(1);
  });

  it("keeps going when a trigger fails", async () => {
    triggerSpy.mockRejectedValue(new Error("qstash down"));
    await createMember();
    await createMember({ email: "second@example.com" });
    const summary = await runBirthdayRemindersWorkflow(fakeContext);
    expect(summary.checked).toBe(2);
    expect(summary.reminded).toBe(0);
    expect(summary.deduplicated).toBe(0);
  });
});
