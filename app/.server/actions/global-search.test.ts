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
import { globalSearch } from "~/.server/actions/global-search";
import { auth } from "~/.server/services/better-auth";
import { generalRatelimit } from "~/.server/config/upstash";
import User from "~/.server/models/user";
import Event from "~/.server/models/event";
import Payment from "~/.server/models/payment";
import Ticket from "~/.server/models/ticket";
import Transfer from "~/.server/models/transfer";
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

vi.mock("~/.server/config/redis", () => ({
  default: () => null,
}));

const request = () =>
  new Request("http://localhost/api/v1/search", {
    headers: { "x-forwarded-for": "127.0.0.1" },
  });

const session = (role: string, id: string) => ({
  user: { id, name: role, email: `${role}@example.com`, role },
});

const getSessionMock = vi.mocked(auth.api.getSession);
const generalLimitMock = vi.mocked(generalRatelimit.limit);

const makeUser = (id: string, name: string, role = "member") =>
  User.create({
    _id: id,
    name,
    email: `${id}@example.com`,
    password: "hashed",
    role,
  });

const makeEvent = (organizerId: string, title: string) =>
  Event.create({
    title,
    detail: "Community gathering.",
    location: "Lagos",
    date: new Date("2030-12-25T10:00:00Z"),
    time: "10:00",
    eventType: "meeting",
    status: "upcoming",
    organizer: organizerId,
  });

const makePayment = (userId: string, reference: string) =>
  Payment.create({
    userId,
    paymentType: "donation",
    paymentStatus: "completed",
    amount: 5000,
    reference,
  });

const makeTicket = (userId: string, title: string) =>
  Ticket.create({
    userId,
    ticketId: `TK-0000-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    title,
    description: "Issue report.",
    category: "account",
    priority: "high",
    status: "open",
  });

const makeTransfer = (userId: string, reference: string) =>
  Transfer.create({
    userId,
    bankDetailsId: new mongoose.Types.ObjectId(),
    recipientCode: "RCP_test001",
    amount: 5000,
    reference,
    status: "success",
  });

const makeAuditLog = (userId: string, action: string) =>
  AuditLog.create({
    userId,
    userName: `Member ${userId.slice(0, 4)}`,
    action,
    category: "settings",
    description: `${action} performed`,
  });

describe("globalSearch", () => {
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

  const zebraUserId = new mongoose.Types.ObjectId().toString();
  const otherMemberId = new mongoose.Types.ObjectId().toString();
  const superAdminId = new mongoose.Types.ObjectId().toString();

  const seedWorld = async () => {
    await makeUser(zebraUserId, "Zebra Stripe");
    await makeUser(otherMemberId, "Quiet Dove");
    await makeUser(superAdminId, "Sasha Lee", "super_admin");
    await makeEvent(zebraUserId, "Zebra Networking");
    await makeEvent(otherMemberId, "Sunset Gala");
    await makePayment(zebraUserId, "BCC-PAY-zebra-1");
    await makePayment(otherMemberId, "BCC-PAY-zebra-2");
    await makeTransfer(otherMemberId, "BCC-TRF-zebra-1");
    await makeTicket(zebraUserId, "Zebra login issue");
    await makeTicket(otherMemberId, "Zebra logout bug");
    await makeAuditLog(zebraUserId, "ZEBRA_LOGIN");
    await makeAuditLog(otherMemberId, "ZEBRA_SEARCH");
  };

  beforeEach(() => {
    getSessionMock.mockResolvedValue(session("member", zebraUserId) as never);
  });

  it("invokes the general rate limiter for the request IP", async () => {
    getSessionMock.mockResolvedValue(session("member", zebraUserId) as never);
    const res = await globalSearch(request(), { query: "dove" });
    expect(res.status).toBe(200);
    expect(generalLimitMock).toHaveBeenCalled();
  });

  it("fails open when the rate limiter errors", async () => {
    generalLimitMock.mockRejectedValueOnce(new Error("Upstash down") as never);
    const res = await globalSearch(request(), { query: "dove" });
    expect(res.status).toBe(200);
  });

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await globalSearch(request(), { query: "zebra" });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.message).toBe("Unauthorized");
  });

  it("returns empty sections for a too-short query", async () => {
    const res = await globalSearch(request(), { query: "a" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.body).toEqual({ query: "a", sections: [] });
  });

  it("scopes payments, tickets and audit logs to the member and omits transfers", async () => {
    await seedWorld();
    const res = await globalSearch(request(), { query: "zebra" });
    expect(res.status).toBe(200);
    const body = await res.json();

    const types = body.body.sections.map((section: { type: string }) => section.type);
    expect(types).toEqual(expect.arrayContaining(["member", "event", "payment", "ticket", "audit"]));
    expect(types).not.toContain("transfer");

    const paymentSection = body.body.sections.find(
      (section: { type: string }) => section.type === "payment",
    );
    expect(paymentSection.results).toHaveLength(1);
    expect(paymentSection.results[0].title).toBe("BCC-PAY-zebra-1");

    const ticketSection = body.body.sections.find(
      (section: { type: string }) => section.type === "ticket",
    );
    expect(ticketSection.results).toHaveLength(1);
    expect(ticketSection.results[0].title).toContain("Zebra login issue");

    const auditSection = body.body.sections.find(
      (section: { type: string }) => section.type === "audit",
    );
    expect(auditSection.results).toHaveLength(1);
    expect(auditSection.results[0].title).toBe("ZEBRA_LOGIN");
  });

  it("returns all sections including transfers and audit logs for a super_admin", async () => {
    await seedWorld();
    getSessionMock.mockResolvedValue(session("super_admin", superAdminId) as never);

    const res = await globalSearch(request(), { query: "zebra" });
    expect(res.status).toBe(200);
    const body = await res.json();

    const types = body.body.sections.map((section: { type: string }) => section.type);
    expect(types).toEqual(
      expect.arrayContaining(["member", "event", "payment", "transfer", "ticket", "audit"]),
    );

    const paymentSection = body.body.sections.find(
      (section: { type: string }) => section.type === "payment",
    );
    expect(paymentSection.results).toHaveLength(2);
    expect(paymentSection.results.map((r: { title: string }) => r.title).sort()).toEqual([
      "BCC-PAY-zebra-1",
      "BCC-PAY-zebra-2",
    ]);

    const transferSection = body.body.sections.find(
      (section: { type: string }) => section.type === "transfer",
    );
    expect(transferSection).toBeTruthy();
    expect(transferSection.results).toHaveLength(1);
    expect(transferSection.results[0].title).toBe("BCC-TRF-zebra-1");

    const ticketSection = body.body.sections.find(
      (section: { type: string }) => section.type === "ticket",
    );
    expect(ticketSection.results).toHaveLength(2);

    const auditSection = body.body.sections.find(
      (section: { type: string }) => section.type === "audit",
    );
    expect(auditSection.results).toHaveLength(2);
    expect(auditSection.results.map((r: { title: string }) => r.title).sort()).toEqual([
      "ZEBRA_LOGIN",
      "ZEBRA_SEARCH",
    ]);
  });
});
