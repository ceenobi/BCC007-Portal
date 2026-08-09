import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import User from "~/.server/models/user";
import Event from "~/.server/models/event";
import Payment from "~/.server/models/payment";
import Transfer from "~/.server/models/transfer";
import Ticket from "~/.server/models/ticket";
import Notification from "~/.server/models/notification";
import InviteCode from "~/.server/models/invitecode";
import { clearTestDB, connectTestDB, disconnectTestDB } from "./helpers/db";

const oid = () => new mongoose.Types.ObjectId();

const expectValidationError = (promise: Promise<unknown>) =>
  expect(promise).rejects.toMatchObject({ name: "ValidationError" });

const expectDuplicateKey = (promise: Promise<unknown>) =>
  expect(promise).rejects.toMatchObject({ code: 11000 });

describe("User model", () => {
  beforeAll(async () => {
    await connectTestDB();
  });
  afterEach(async () => {
    await clearTestDB();
  });
  afterAll(async () => {
    await disconnectTestDB();
  });

  it("applies defaults on create", async () => {
    const user = await User.create({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "hashed-password",
    });
    expect(user.role).toBe("member");
    expect(user.isOnboarded).toBe(false);
    expect(user.disableBirthDate).toBe(true);
    expect(user.disableEmail).toBe(false);
    expect(user.emailVerified).toBe(false);
  });

  it("rejects an invalid email", async () => {
    await expectValidationError(
      User.create({ name: "Ada", email: "not-an-email", password: "x" }),
    );
  });

  it("enforces a unique email", async () => {
    await User.create({ name: "Ada", email: "ada@example.com", password: "x" });
    await expectDuplicateKey(
      User.create({ name: "Bob", email: "ada@example.com", password: "y" }),
    );
  });

  it("trims whitespace from names and emails", async () => {
    const user = await User.create({
      name: "  Ada Lovelace  ",
      email: "  ada@example.com  ",
      password: "x",
    });
    expect(user.name).toBe("Ada Lovelace");
    expect(user.email).toBe("ada@example.com");
  });

  it("hides the password field by default", async () => {
    await User.create({ name: "Ada", email: "ada@example.com", password: "secret" });
    const found = await User.findOne({ email: "ada@example.com" }).lean();
    expect(found?.password).toBeUndefined();
    const explicit = await User.findOne({ email: "ada@example.com" })
      .select("+password")
      .lean();
    expect(explicit?.password).toBe("secret");
  });

  it("rejects names longer than 50 characters", async () => {
    await expectValidationError(
      User.create({ name: "x".repeat(51), email: "ada@example.com", password: "x" }),
    );
  });
});

describe("Event model", () => {
  beforeAll(async () => {
    await connectTestDB();
  });
  afterEach(async () => {
    await clearTestDB();
  });
  afterAll(async () => {
    await disconnectTestDB();
  });

  const baseEvent = {
    title: "Quarterly Meeting",
    detail: "Review of Q3 goals.",
    location: "Lagos",
    date: new Date("2030-12-25T10:00:00Z"),
    time: "10:00",
    eventType: "meeting",
    organizer: oid(),
  };

  it("defaults to upcoming status", async () => {
    const event = await Event.create(baseEvent);
    expect(event.status).toBe("upcoming");
    expect(event.interestedMembers).toEqual([]);
  });

  it("rejects an invalid status or event type", async () => {
    await expectValidationError(
      Event.create({ ...baseEvent, status: "sometime" }),
    );
    await expectValidationError(
      Event.create({ ...baseEvent, eventType: "hangout" }),
    );
  });

  it("requires title, detail, location, date and time", async () => {
    await expectValidationError(Event.create({ ...baseEvent, title: undefined }));
    await expectValidationError(Event.create({ ...baseEvent, date: undefined }));
  });

  it("enforces a unique, sparse idempotency key", async () => {
    await Event.create({ ...baseEvent, idempotencyKey: "evt-1" });
    await expectDuplicateKey(
      Event.create({ ...baseEvent, title: "Another", idempotencyKey: "evt-1" }),
    );
    // Documents without a key do not collide.
    await Event.create({ ...baseEvent, title: "No key 1" });
    await Event.create({ ...baseEvent, title: "No key 2" });
  });
});

describe("Payment model", () => {
  beforeAll(async () => {
    await connectTestDB();
  });
  afterEach(async () => {
    await clearTestDB();
  });
  afterAll(async () => {
    await disconnectTestDB();
  });

  const userId = oid();

  it("defaults paymentStatus to pending", async () => {
    const payment = await Payment.create({
      userId,
      paymentType: "donation",
      reference: "ref-1",
      amount: 5000,
    });
    expect(payment.paymentStatus).toBe("pending");
    expect(payment.isRecurring).toBe(false);
  });

  it("rejects an invalid payment type", async () => {
    await expectValidationError(
      Payment.create({ userId, paymentType: "lottery", reference: "ref-2" }),
    );
  });

  it("enforces a unique reference", async () => {
    await Payment.create({ userId, paymentType: "donation", reference: "ref-x" });
    await expectDuplicateKey(
      Payment.create({ userId, paymentType: "donation", reference: "ref-x" }),
    );
  });

  it("prevents duplicate membership dues per user per month", async () => {
    const dues = {
      userId,
      paymentType: "membership_dues" as const,
      monthKey: "2026-08",
      reference: "dues-1",
      amount: 5000,
    };
    await Payment.create(dues);
    await expectDuplicateKey(
      Payment.create({ ...dues, reference: "dues-2" }),
    );
  });

  it("allows multiple donations sharing the same monthKey", async () => {
    await Payment.create({ userId, paymentType: "donation", reference: "d1", monthKey: "2026-08" });
    await Payment.create({ userId, paymentType: "donation", reference: "d2", monthKey: "2026-08" });
  });

  it("rejects a note longer than 50 characters", async () => {
    await expectValidationError(
      Payment.create({
        userId,
        paymentType: "donation",
        reference: "ref-n",
        note: "n".repeat(51),
      }),
    );
  });
});

describe("Transfer model", () => {
  beforeAll(async () => {
    await connectTestDB();
  });
  afterEach(async () => {
    await clearTestDB();
  });
  afterAll(async () => {
    await disconnectTestDB();
  });

  const userId = oid();

  it("defaults status, currency and fee", async () => {
    const transfer = await Transfer.create({
      userId,
      recipientCode: "RCP_abc",
      reference: "tr-1",
      amount: 10000,
    });
    expect(transfer.status).toBe("pending");
    expect(transfer.currency).toBe("NGN");
    expect(transfer.fee).toBe(0);
  });

  it("enforces a unique reference", async () => {
    await Transfer.create({ userId, recipientCode: "RCP_a", reference: "tr-x", amount: 1 });
    await expectDuplicateKey(
      Transfer.create({ userId, recipientCode: "RCP_b", reference: "tr-x", amount: 2 }),
    );
  });

  it("rejects an invalid status", async () => {
    await expectValidationError(
      Transfer.create({
        userId,
        recipientCode: "RCP_c",
        reference: "tr-bad",
        amount: 1,
        status: "completed-again",
      }),
    );
  });

  it("enforces a unique, sparse idempotency key", async () => {
    await Transfer.create({ userId, recipientCode: "RCP_1", reference: "t1", amount: 1, idempotencyKey: "k1" });
    await expectDuplicateKey(
      Transfer.create({ userId, recipientCode: "RCP_2", reference: "t2", amount: 2, idempotencyKey: "k1" }),
    );
    await Transfer.create({ userId, recipientCode: "RCP_3", reference: "t3", amount: 3 });
    await Transfer.create({ userId, recipientCode: "RCP_4", reference: "t4", amount: 4 });
  });
});

describe("Ticket model", () => {
  beforeAll(async () => {
    await connectTestDB();
  });
  afterEach(async () => {
    await clearTestDB();
  });
  afterAll(async () => {
    await disconnectTestDB();
  });

  const userId = oid();

  it("defaults to open status", async () => {
    const ticket = await Ticket.create({
      userId,
      ticketId: "TK-1234-000001",
      title: "Cannot login",
      description: "Login keeps failing.",
      category: "account",
      priority: "high",
    });
    expect(ticket.status).toBe("open");
    expect(ticket.assignedTo).toBeNull();
  });

  it("rejects an unknown category or priority", async () => {
    await expectValidationError(
      Ticket.create({
        userId,
        ticketId: "TK-1",
        title: "T",
        description: "Some description that is long enough.",
        category: "billing",
        priority: "high",
      }),
    );
  });

  it("rejects a description longer than 1000 characters", async () => {
    await expectValidationError(
      Ticket.create({
        userId,
        ticketId: "TK-2",
        title: "Title",
        description: "x".repeat(1001),
        category: "account",
        priority: "low",
      }),
    );
  });

  it("enforces a unique, sparse idempotency key", async () => {
    await Ticket.create({ userId, ticketId: "TK-3", title: "T", description: "desc".repeat(5), category: "other", priority: "low", idempotencyKey: "tk-1" });
    await expectDuplicateKey(
      Ticket.create({ userId, ticketId: "TK-4", title: "T", description: "desc".repeat(5), category: "other", priority: "low", idempotencyKey: "tk-1" }),
    );
  });
});

describe("Notification model", () => {
  beforeAll(async () => {
    await connectTestDB();
  });
  afterEach(async () => {
    await clearTestDB();
  });
  afterAll(async () => {
    await disconnectTestDB();
  });

  it("defaults read to false and metadata to an object", async () => {
    const notification = await Notification.create({
      userId: oid(),
      type: "ticket_created",
      title: "Ticket created",
      message: "Your ticket was created.",
    });
    expect(notification.read).toBe(false);
    expect(notification.metadata).toEqual({});
  });

  it("rejects an unknown notification type", async () => {
    await expectValidationError(
      Notification.create({
        userId: oid(),
        type: "something_new",
        title: "T",
        message: "M",
      }),
    );
  });

  it("persists metadata", async () => {
    const notification = await Notification.create({
      userId: oid(),
      type: "event_interest",
      title: "Interest",
      message: "You're marked interested.",
      metadata: { eventId: "evt-1" },
    });
    expect(notification.metadata.eventId).toBe("evt-1");
  });
});

describe("InviteCode model", () => {
  beforeAll(async () => {
    await connectTestDB();
  });
  afterEach(async () => {
    await clearTestDB();
  });
  afterAll(async () => {
    await disconnectTestDB();
  });

  it("stores a valid invite code", async () => {
    const code = await InviteCode.create({
      email: "invite@example.com",
      inviteCode: "INV12345",
      role: "member",
      expiresAt: new Date("2099-01-01T00:00:00Z"),
    });
    expect(code.role).toBe("member");
  });

  it("rejects an invalid email or role", async () => {
    await expectValidationError(
      InviteCode.create({ email: "nope", inviteCode: "INV1", role: "member", expiresAt: new Date() }),
    );
    await expectValidationError(
      InviteCode.create({ email: "a@b.com", inviteCode: "INV2", role: "super_admin", expiresAt: new Date() }),
    );
  });

  it("enforces unique email and unique invite code", async () => {
    const base = { role: "member" as const, expiresAt: new Date("2099-01-01T00:00:00Z") };
    await InviteCode.create({ ...base, email: "a@b.com", inviteCode: "CODEA" });
    await expectDuplicateKey(InviteCode.create({ ...base, email: "a@b.com", inviteCode: "CODEB" }));
    await expectDuplicateKey(InviteCode.create({ ...base, email: "c@d.com", inviteCode: "CODEA" }));
  });
});
