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
import { getDashboardData } from "~/.server/actions/dashboard";
import { auth } from "~/.server/services/better-auth";
import { PaystackService } from "~/.server/services/paystack.service";
import User from "~/.server/models/user";
import Payment from "~/.server/models/payment";
import Ticket from "~/.server/models/ticket";
import Event from "~/.server/models/event";
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

vi.mock("~/.server/services/paystack.service", () => ({
  MEMBERSHIP_DUES_AMOUNT: 2000,
  PaystackService: {
    initializePayment: vi.fn(),
    verifyPayment: vi.fn(),
    cancelSubscription: vi.fn(),
    getBalance: vi.fn(),
    generateReference: vi.fn(),
    createTransferRecipient: vi.fn(),
    initiateTransfer: vi.fn(),
    verifyTransfer: vi.fn(),
    finalizeTransfer: vi.fn(),
  },
}));

vi.mock("~/.server/utils/cloudinary", () => ({
  deleteFromCloudinary: vi.fn(async () => ({})),
}));

const request = () =>
  new Request("http://localhost/api/v1/dashboard", {
    headers: { "x-forwarded-for": "127.0.0.1" },
  });

const session = (role: string, id: string) => ({
  user: { id, name: role, email: `${role}@example.com`, role },
});

const getSessionMock = vi.mocked(auth.api.getSession);
const balanceMock = vi.mocked(PaystackService.getBalance);

const makeUser = (
  id: string,
  role = "member",
  opts: { isOnboarded?: boolean; dateOfBirth?: Date; disableBirthDate?: boolean } = {},
) =>
  User.create({
    _id: id,
    name: `Member ${id.slice(0, 4)}`,
    email: `${id}@example.com`,
    password: "hashed",
    role,
    ...(opts.isOnboarded ? { isOnboarded: true } : {}),
    ...(opts.dateOfBirth ? { dateOfBirth: opts.dateOfBirth } : {}),
    ...(opts.disableBirthDate !== undefined
      ? { disableBirthDate: opts.disableBirthDate }
      : {}),
  });

const makePayment = (
  userId: string,
  opts: { paymentType?: string; paymentStatus?: string; amount?: number; reference?: string } = {},
) =>
  Payment.create({
    userId,
    paymentType: opts.paymentType ?? "membership_dues",
    paymentStatus: opts.paymentStatus ?? "completed",
    amount: opts.amount ?? 2000,
    reference: opts.reference ?? `BCC-PAY-DASH-${Math.random().toString(36).slice(2, 8)}`,
  });

const makeTicket = (userId: string, opts: { status?: string; title?: string } = {}) =>
  Ticket.create({
    userId,
    ticketId: `TK-0000-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    title: opts.title ?? "Cannot login",
    description: "Login keeps failing on mobile.",
    category: "account",
    priority: "high",
    status: opts.status ?? "open",
  });

const makeAuditLog = (userId: string, action: string) =>
  AuditLog.create({
    userId,
    userName: `Member ${userId.slice(0, 4)}`,
    action,
    category: "settings",
    description: `${action} performed`,
  });

const makeEvent = (userId: string, opts: { title?: string; status?: string; date?: Date } = {}) =>
  Event.create({
    title: opts.title ?? "Zebra Summit",
    detail: "A networking mixer for the community.",
    location: "Lagos",
    date: opts.date ?? new Date("2030-12-25T10:00:00Z"),
    time: "10:00",
    eventType: "meeting",
    status: opts.status ?? "upcoming",
    organizer: userId,
  });

describe("getDashboardData", () => {
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
  const birthdayUserId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    balanceMock.mockResolvedValue({
      currency: "NGN",
      balance: 600000,
      available_balance: 500000,
      pending_balance: 100000,
      integration: 1,
    } as never);
  });

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await getDashboardData(request());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.message).toBe("Unauthorized");
  });

  it("returns personal-scoped sections for a member", async () => {
    getSessionMock.mockResolvedValue(session("member", memberId) as never);
    await makeUser(memberId, "member", { isOnboarded: true });
    await makeUser(birthdayUserId, "member", {
      isOnboarded: true,
      dateOfBirth: new Date(Date.now() + 3 * 86400000),
      disableBirthDate: false,
    });
    await makePayment(memberId, { paymentStatus: "completed", amount: 2000 });
    await makePayment(memberId, { paymentStatus: "pending", amount: 3000 });
    await makeTicket(memberId, { status: "open" });
    await makeAuditLog(memberId, "DASHBOARD_VIEW");
    await makeEvent(memberId, { title: "Zebra Summit" });

    const res = await getDashboardData(request());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.body).toMatchObject({
      revenueAll: expect.objectContaining({ stats: expect.any(Object) }),
      revenue1m: expect.objectContaining({ stats: expect.any(Object) }),
    });
    expect(body.body.revenueAll.stats.totalCount).toBe(2);
    expect(body.body.revenue1m.stats.totalCount).toBe(2);

    expect(body.body.upcomingEvents).toHaveLength(1);
    expect(body.body.upcomingEvents[0].title).toBe("Zebra Summit");

    expect(body.body.balance).toBeNull();
    expect(body.body.orgTickets).toBeNull();
    expect(body.body.membersCount).toBeNull();

    expect(body.body.myTickets).toEqual({
      total: 1,
      open: 1,
      inProgress: 0,
      resolved: 0,
      closed: 0,
    });

    expect(body.body.recentActivity).toHaveLength(1);
    expect(body.body.recentActivity[0].action).toBe("DASHBOARD_VIEW");

    expect(body.body.upcomingBirthdays).toHaveLength(1);
    expect(body.body.upcomingBirthdays[0].name).toBe(`Member ${birthdayUserId.slice(0, 4)}`);
    expect(balanceMock).not.toHaveBeenCalled();
  });

  it("returns group revenue but no balance for an admin", async () => {
    getSessionMock.mockResolvedValue(session("admin", adminId) as never);
    await makeUser(adminId, "admin", { isOnboarded: true });
    await makeUser(memberId, "member", { isOnboarded: true });
    await makePayment(memberId, { paymentStatus: "completed", amount: 2000 });
    await makeTicket(memberId, { status: "open" });
    await makeAuditLog(adminId, "ADMIN_VIEW");
    await makeAuditLog(memberId, "MEMBER_VIEW");

    const res = await getDashboardData(request());
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.body.revenueAll.stats.totalCount).toBe(1);
    expect(body.body.revenueAll.paymentStats.yearlyDues).toBe(2 * 12 * 2000);

    expect(body.body.balance).toBeNull();
    expect(body.body.orgTickets).toBeTruthy();
    expect(body.body.orgTickets.tickets).toHaveLength(1);
    expect(body.body.myTickets).toBeNull();
    expect(body.body.membersCount).toBe(2);
    expect(body.body.recentActivity).toHaveLength(2);
  });

  it("includes balance, group reports and all audit logs for a super_admin", async () => {
    getSessionMock.mockResolvedValue(session("super_admin", superAdminId) as never);
    await makeUser(superAdminId, "super_admin", { isOnboarded: true });
    await makeUser(memberId, "member", { isOnboarded: true });
    await makePayment(memberId, { paymentStatus: "completed", amount: 2000 });
    await makeTicket(memberId, { status: "open" });
    await makeTicket(superAdminId, { status: "resolved", title: "Payout query" });
    await makeAuditLog(superAdminId, "SUPER_VIEW");
    await makeAuditLog(memberId, "MEMBER_VIEW");
    await makeEvent(memberId, { title: "Zebra Summit" });

    const res = await getDashboardData(request());
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.body.revenueAll.stats.totalCount).toBe(1);
    expect(body.body.revenueAll.paymentStats.yearlyDues).toBe(2 * 12 * 2000);

    expect(body.body.balance).toEqual({
      total: 5000,
      pending: 1000,
      balance: 6000,
      currency: "NGN",
    });

    expect(body.body.orgTickets).toBeTruthy();
    expect(body.body.orgTickets.tickets).toHaveLength(2);
    expect(body.body.myTickets).toBeNull();
    expect(body.body.membersCount).toBe(2);
    expect(body.body.recentActivity).toHaveLength(2);
    expect(body.body.recentActivity.map((log: { action: string }) => log.action).sort()).toEqual([
      "MEMBER_VIEW",
      "SUPER_VIEW",
    ]);
    expect(body.body.upcomingEvents).toHaveLength(1);
  });
});
