import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTicket, ticketActions } from "~/.server/actions/ticket";
import { auth } from "~/.server/services/better-auth";
import { workflowClient } from "~/.server/workflows/client";
import Ticket from "~/.server/models/ticket";
import User from "~/.server/models/user";
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

const request = () =>
  new Request("http://localhost/api/v1/tickets", {
    headers: { "x-forwarded-for": "127.0.0.1" },
  });

const session = (role: string, id: string, name = "Ada Lovelace") => ({
  user: { id, name, email: "ada@example.com", role },
});

const getSessionMock = vi.mocked(auth.api.getSession);
const triggerMock = vi.mocked(workflowClient.trigger);

describe("createTicket", () => {
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
  });

  const validPayload = {
    title: "Cannot login",
    description: "I reset my password but login still fails on mobile.",
    category: "account" as const,
    priority: "high" as const,
  };

  it("returns 401 when there is no session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await createTicket(request(), validPayload);
    expect(res.status).toBe(401);
  });

  it("returns 400 for an invalid payload", async () => {
    const res = await createTicket(request(), { ...validPayload, title: "AB" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Invalid dataschema");
  });

  it("creates a ticket, audit log and notification for a valid payload", async () => {
    const res = await createTicket(request(), validPayload);
    expect(res.status).toBe(201);

    const ticket = await Ticket.findOne({ userId }).lean();
    expect(ticket).toBeTruthy();
    expect(ticket!.ticketId).toMatch(/^TK-\d{4}-\d{6}$/);
    expect(ticket!.status).toBe("open");

    expect(await AuditLog.countDocuments({ action: "SUPPORT_TICKET" })).toBe(1);
    expect(await Notification.countDocuments({ type: "ticket_created" })).toBe(1);
    expect(triggerMock).toHaveBeenCalledTimes(1);
    expect(triggerMock).toHaveBeenCalledWith(
      expect.objectContaining({ url: expect.stringContaining("ticket-confirmation") }),
    );
  });

  it("replays idempotently when the idempotency key is reused", async () => {
    const payload = { ...validPayload, idempotencyKey: "tk-dup" };

    const first = await createTicket(request(), payload);
    expect(first.status).toBe(201);

    const second = await createTicket(request(), payload);
    expect(second.status).toBe(201);

    expect(await Ticket.countDocuments({ userId })).toBe(1);
  });
});

describe("ticketActions", () => {
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
  const superAdminId = new mongoose.Types.ObjectId().toString();

  const createUser = (id: string, role: string, email: string) =>
    User.create({ _id: id, name: role, email, password: "hashed", role });

  const createTicketDoc = async (opts: { userId?: string; assignedTo?: string | null } = {}) =>
    Ticket.create({
      userId: opts.userId ?? memberId,
      ticketId: "TK-0000-000001",
      title: "Cannot login",
      description: "Login keeps failing on mobile.",
      category: "account",
      priority: "high",
      status: "open",
      assignedTo: opts.assignedTo ?? null,
    });

  beforeEach(async () => {
    await createUser(memberId, "member", "member@example.com");
    await createUser(adminId, "admin", "admin@example.com");
    await createUser(superAdminId, "super_admin", "super@example.com");
  });

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await ticketActions(request(), { id: "some-id", status: "resolved" });
    expect(res.status).toBe(401);
  });

  it("returns 400 when no ticket id is provided", async () => {
    getSessionMock.mockResolvedValue(session("admin", adminId) as never);
    const res = await ticketActions(
      request(),
      { status: "resolved" } as Parameters<typeof ticketActions>[1],
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.message).toContain("Ticket Id is required");
  });

  it("forbids status changes for a member", async () => {
    getSessionMock.mockResolvedValue(session("member", memberId) as never);
    const ticket = await createTicketDoc();
    const res = await ticketActions(request(), { id: ticket._id.toString(), status: "in-progress" });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.message).toContain("permission to manage tickets");
  });

  it("forbids assignment for an admin without ASSIGN_TICKET", async () => {
    getSessionMock.mockResolvedValue(session("admin", adminId) as never);
    const ticket = await createTicketDoc();
    const res = await ticketActions(request(), { id: ticket._id.toString(), assignedTo: adminId });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.message).toContain("Only super admins can assign tickets");
  });

  it("rejects a status that requires assignment while unassigning", async () => {
    getSessionMock.mockResolvedValue(session("super_admin", superAdminId) as never);
    const ticket = await createTicketDoc();
    const res = await ticketActions(request(), { id: ticket._id.toString(), status: "resolved", assignedTo: null });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("being unassigned");
  });

  it("rejects resolving a ticket that is not assigned", async () => {
    getSessionMock.mockResolvedValue(session("admin", adminId) as never);
    const ticket = await createTicketDoc();
    const res = await ticketActions(request(), { id: ticket._id.toString(), status: "resolved" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("without being assigned to an admin");
  });

  it("returns 404 for an unknown assignee", async () => {
    getSessionMock.mockResolvedValue(session("super_admin", superAdminId) as never);
    const ticket = await createTicketDoc();
    const res = await ticketActions(request(), { id: ticket._id.toString(), assignedTo: new mongoose.Types.ObjectId().toString() });
    expect(res.status).toBe(404);
  });

  it("rejects assigning to a non-admin", async () => {
    getSessionMock.mockResolvedValue(session("super_admin", superAdminId) as never);
    const ticket = await createTicketDoc();
    const res = await ticketActions(request(), { id: ticket._id.toString(), assignedTo: memberId });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("admins and super admins");
  });

  it("returns 404 for an unknown ticket", async () => {
    getSessionMock.mockResolvedValue(session("admin", adminId) as never);
    const res = await ticketActions(request(), { id: new mongoose.Types.ObjectId().toString(), status: "resolved" });
    expect(res.status).toBe(404);
  });

  it("assigns a ticket and notifies the assignee", async () => {
    getSessionMock.mockResolvedValue(session("super_admin", superAdminId) as never);
    const ticket = await createTicketDoc();

    const res = await ticketActions(request(), { id: ticket._id.toString(), assignedTo: adminId });
    expect(res.status).toBe(200);

    const updated = await Ticket.findById(ticket._id).lean();
    expect(updated!.assignedTo?.toString()).toBe(adminId);
    expect(await Notification.countDocuments({ type: "ticket_assigned" })).toBe(1);
    expect(triggerMock).toHaveBeenCalledWith(
      expect.objectContaining({ url: expect.stringContaining("ticket-assigned") }),
    );
  });

  it("resolves an assigned ticket and notifies the owner once", async () => {
    getSessionMock.mockResolvedValue(session("admin", adminId) as never);
    const ticket = await createTicketDoc({ assignedTo: adminId });

    const first = await ticketActions(request(), { id: ticket._id.toString(), status: "resolved" });
    expect(first.status).toBe(200);

    const second = await ticketActions(request(), { id: ticket._id.toString(), status: "resolved" });
    expect(second.status).toBe(200);
    const body = await second.json();
    expect(body.message).toBe("Ticket is already in the requested state");

    expect(await Ticket.findById(ticket._id).lean()).toMatchObject({ status: "resolved" });
    expect(await Notification.countDocuments({ type: "ticket_resolved" })).toBe(1);
  });
});
