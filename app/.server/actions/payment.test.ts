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
  cancelSubscription,
  getGroupPaymentReports,
  getGroupPayments,
  getUserPaymentReports,
  getUserPayments,
  getUserSubscription,
  initializePayment,
  verifyPayment,
} from "~/.server/actions/payment";
import { auth } from "~/.server/services/better-auth";
import { PaystackService } from "~/.server/services/paystack.service";
import Payment from "~/.server/models/payment";
import User from "~/.server/models/user";
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

vi.mock("~/.server/services/paystack.service", () => ({
  MEMBERSHIP_DUES_AMOUNT: 2000,
  PaystackService: {
    initializePayment: vi.fn(),
    verifyPayment: vi.fn(),
    cancelSubscription: vi.fn(),
    getBalance: vi.fn(),
  },
}));

const request = () =>
  new Request("http://localhost/api/v1/payments", {
    headers: { "x-forwarded-for": "127.0.0.1" },
  });

const session = (role: string, id: string) => ({
  user: { id, name: role, email: `${role}@example.com`, role },
});

const getSessionMock = vi.mocked(auth.api.getSession);
const initPaymentMock = vi.mocked(PaystackService.initializePayment);
const verifyPaymentMock = vi.mocked(PaystackService.verifyPayment);
const cancelSubMock = vi.mocked(PaystackService.cancelSubscription);

const makeUser = (id: string, role = "member", opts: { onboarded?: boolean } = {}) =>
  User.create({
    _id: id,
    name: `Member ${id.slice(0, 4)}`,
    email: `${id}@example.com`,
    password: "hashed",
    role,
    ...(opts.onboarded ? { isOnboarded: true } : {}),
  });

const makePayment = (
  userId: string,
  opts: {
    paymentType?: string;
    paymentStatus?: string;
    amount?: number;
    reference?: string;
    isRecurring?: boolean;
    subscriptionStatus?: string;
    createdAt?: Date;
  } = {},
) =>
  Payment.create({
    userId,
    paymentType: opts.paymentType ?? "membership_dues",
    paymentStatus: opts.paymentStatus ?? "completed",
    amount: opts.amount ?? 5000,
    reference: opts.reference ?? `BCC-PAY-${Math.random().toString(36).slice(2, 8)}`,
    isRecurring: opts.isRecurring ?? false,
    ...(opts.subscriptionStatus ? { subscriptionStatus: opts.subscriptionStatus } : {}),
    ...(opts.createdAt ? { createdAt: opts.createdAt } : {}),
  });

describe("initializePayment", () => {
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
    initPaymentMock.mockResolvedValue({
      status: true,
      data: {
        reference: "BCC-PAY-INIT1",
        authorization_url: "https://checkout.paystack.com/x",
        status: "pending",
      },
    } as never);
  });

  const validPayload = { amount: 5000, paymentType: "donation" as const };

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await initializePayment(request(), validPayload);
    expect(res.status).toBe(401);
  });

  it("returns 400 for an amount below the minimum", async () => {
    const res = await initializePayment(request(), { amount: 500, paymentType: "donation" });
    expect(res.status).toBe(400);
  });

  it("rejects recurring payments for non-membership types", async () => {
    const res = await initializePayment(request(), {
      amount: 5000,
      paymentType: "donation",
      isRecurring: true,
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Invalid dataschema");
  });

  it("delegates to Paystack and records an audit log on success", async () => {
    const res = await initializePayment(request(), validPayload);
    expect(res.status).toBe(200);

    expect(initPaymentMock).toHaveBeenCalledWith(validPayload, session("member", userId).user);
    expect(await AuditLog.countDocuments({ action: "PAYMENT_INITIATED" })).toBe(1);
  });
});

describe("verifyPayment", () => {
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
    verifyPaymentMock.mockResolvedValue({
      status: true,
      data: { reference: "BCC-PAY-VERIFY1", amount: 5000, status: "success" },
    } as never);
  });

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await verifyPayment(request(), { reference: "BCC-PAY-VERIFY1" });
    expect(res.status).toBe(401);
  });

  it("returns 400 for an invalid payload", async () => {
    const res = await verifyPayment(request(), { reference: "" });
    expect(res.status).toBe(400);
  });

  it("delegates to Paystack and records an audit log on success", async () => {
    const res = await verifyPayment(request(), { reference: "BCC-PAY-VERIFY1" });
    expect(res.status).toBe(200);
    expect(verifyPaymentMock).toHaveBeenCalledWith(
      { reference: "BCC-PAY-VERIFY1" },
      session("member", userId).user,
    );
    expect(await AuditLog.countDocuments({ action: "PAYMENT_SUCCESS" })).toBe(1);
  });
});

describe("cancelSubscription", () => {
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
    cancelSubMock.mockResolvedValue({
      status: true,
      message: "Subscription cancelled",
      data: {},
    } as never);
  });

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await cancelSubscription(request(), { code: "SUB_x", token: "tok" });
    expect(res.status).toBe(401);
  });

  it("returns 400 when neither code/token nor reference is provided", async () => {
    const res = await cancelSubscription(request(), { code: "", token: "" });
    expect(res.status).toBe(400);
  });

  it("delegates to Paystack and records an audit log on success", async () => {
    const res = await cancelSubscription(request(), { code: "SUB_x", token: "tok" });
    expect(res.status).toBe(200);
    expect(cancelSubMock).toHaveBeenCalledWith(
      session("member", userId).user,
      "SUB_x",
      "tok",
      undefined,
    );
    expect(await AuditLog.countDocuments({ action: "SUBSCRIPTION_CHANGE" })).toBe(1);
  });
});

describe("getUserSubscription", () => {
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

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await getUserSubscription(request());
    expect(res.status).toBe(401);
  });

  it("returns null when the user has no active subscription", async () => {
    await makePayment(userId, { subscriptionStatus: "cancelled" });
    const res = await getUserSubscription(request());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.body).toBeNull();
  });

  it("returns the active recurring membership subscription", async () => {
    await makePayment(userId, {
      paymentType: "membership_dues",
      isRecurring: true,
      subscriptionStatus: "active",
      reference: "BCC-PAY-SUB1",
    });
    const res = await getUserSubscription(request());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.body.reference).toBe("BCC-PAY-SUB1");
  });
});

describe("getUserPayments", () => {
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

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await getUserPayments({ request: request(), page: 1, limit: 10, query: undefined, paymentStatus: undefined, paymentType: undefined, startDate: undefined, endDate: undefined });
    expect(res.status).toBe(401);
  });

  it("rejects an invalid page or limit", async () => {
    expect((await getUserPayments({ request: request(), page: 0, limit: 10, query: undefined, paymentStatus: undefined, paymentType: undefined, startDate: undefined, endDate: undefined })).status).toBe(400);
    expect((await getUserPayments({ request: request(), page: 1, limit: 0, query: undefined, paymentStatus: undefined, paymentType: undefined, startDate: undefined, endDate: undefined })).status).toBe(400);
    expect((await getUserPayments({ request: request(), page: 1, limit: 101, query: undefined, paymentStatus: undefined, paymentType: undefined, startDate: undefined, endDate: undefined })).status).toBe(400);
  });

  it("rejects an invalid status filter", async () => {
    const res = await getUserPayments({
      request: request(),
      page: 1,
      limit: 10,
      query: undefined,
      paymentStatus: "paid",
      paymentType: undefined,
      startDate: undefined,
      endDate: undefined,
    });
    expect(res.status).toBe(400);
  });

  it("returns only the session user's payments with pagination meta", async () => {
    const otherId = new mongoose.Types.ObjectId().toString();
    await makePayment(userId, { reference: "BCC-PAY-U1" });
    await makePayment(userId, { reference: "BCC-PAY-U2", paymentStatus: "pending" });
    await makePayment(otherId, { reference: "BCC-PAY-OTHER" });

    const res = await getUserPayments({ request: request(), page: 1, limit: 10, query: undefined, paymentStatus: undefined, paymentType: undefined, startDate: undefined, endDate: undefined });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.body.meta.total).toBe(2);
    expect(body.body.payments).toHaveLength(2);
  });
});

describe("getGroupPayments", () => {
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
    getSessionMock.mockResolvedValue(session("super_admin", adminId) as never);
  });

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await getGroupPayments({ request: request(), page: 1, limit: 10, query: undefined, paymentStatus: undefined, paymentType: undefined, startDate: undefined, endDate: undefined });
    expect(res.status).toBe(401);
  });

  it("forbids users without MANAGE_PAYMENTS", async () => {
    getSessionMock.mockResolvedValue(session("member", memberId) as never);
    const res = await getGroupPayments({ request: request(), page: 1, limit: 10, query: undefined, paymentStatus: undefined, paymentType: undefined, startDate: undefined, endDate: undefined });
    expect(res.status).toBe(403);
  });

  it("returns every payment across members", async () => {
    await makePayment(memberId, { reference: "BCC-PAY-G1" });
    await makePayment(adminId, { reference: "BCC-PAY-G2" });

    const res = await getGroupPayments({ request: request(), page: 1, limit: 10, query: undefined, paymentStatus: undefined, paymentType: undefined, startDate: undefined, endDate: undefined });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.body.meta.total).toBe(2);
  });
});

describe("getUserPaymentReports", () => {
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

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await getUserPaymentReports({ request: request(), period: undefined, paymentStatus: undefined, paymentType: undefined });
    expect(res.status).toBe(401);
  });

  it("rejects an invalid period", async () => {
    const res = await getUserPaymentReports({ request: request(), period: "2y", paymentStatus: undefined, paymentType: undefined });
    expect(res.status).toBe(400);
  });

  it("returns aggregated stats for the session user", async () => {
    await makePayment(userId, { paymentStatus: "completed", amount: 2000 });
    await makePayment(userId, { paymentStatus: "pending", amount: 3000 });

    const res = await getUserPaymentReports({ request: request(), period: "all", paymentStatus: undefined, paymentType: undefined });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.body.stats.totalRevenue).toBe(5000);
    expect(body.body.stats.completedRevenue).toBe(2000);
    expect(body.body.stats.pendingRevenue).toBe(3000);
    expect(body.body.stats.totalCount).toBe(2);
  });

  it("marks the user on track when the current month's dues are paid", async () => {
    await makePayment(userId, { paymentStatus: "completed", amount: 2000 });

    const res = await getUserPaymentReports({ request: request(), period: "all", paymentStatus: undefined, paymentType: undefined });
    const body = await res.json();
    expect(body.body.paymentStats.isUpToDate).toBe(true);
  });
});

describe("getGroupPaymentReports", () => {
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
  const secondMemberId = new mongoose.Types.ObjectId().toString();

  beforeEach(async () => {
    await makeUser(adminId, "admin", { onboarded: true });
    await makeUser(memberId, "member", { onboarded: true });
    await makeUser(secondMemberId, "member", { onboarded: true });
    getSessionMock.mockResolvedValue(session("super_admin", adminId) as never);
  });

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await getGroupPaymentReports({ request: request(), period: undefined, paymentStatus: undefined, paymentType: undefined });
    expect(res.status).toBe(401);
  });

  it("forbids users without MANAGE_PAYMENTS", async () => {
    getSessionMock.mockResolvedValue(session("member", memberId) as never);
    const res = await getGroupPaymentReports({ request: request(), period: undefined, paymentStatus: undefined, paymentType: undefined });
    expect(res.status).toBe(403);
  });

  it("rejects an invalid period", async () => {
    const res = await getGroupPaymentReports({ request: request(), period: "2y", paymentStatus: undefined, paymentType: undefined });
    expect(res.status).toBe(400);
  });

  it("computes yearly dues from the onboarded roster size", async () => {
    const res = await getGroupPaymentReports({ request: request(), period: "all", paymentStatus: undefined, paymentType: undefined });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.body.paymentStats.yearlyDues).toBe(3 * 12 * 2000);
  });

  it("flags the group behind schedule when a member has not paid this month", async () => {
    await makePayment(memberId, { paymentStatus: "completed", amount: 2000 });

    const res = await getGroupPaymentReports({ request: request(), period: "all", paymentStatus: undefined, paymentType: undefined });
    const body = await res.json();
    expect(body.body.paymentStats.isUpToDate).toBe(false);
  });

  it("flags the group on track when every onboarded member has paid this month", async () => {
    await makePayment(memberId, { paymentStatus: "completed", amount: 2000, reference: "BCC-PAY-D1" });
    await makePayment(secondMemberId, {
      paymentStatus: "completed",
      amount: 2000,
      reference: "BCC-PAY-D2",
    });
    await makePayment(adminId, { paymentStatus: "completed", amount: 2000, reference: "BCC-PAY-D3" });

    const res = await getGroupPaymentReports({ request: request(), period: "all", paymentStatus: undefined, paymentType: undefined });
    const body = await res.json();
    expect(body.body.paymentStats.isUpToDate).toBe(true);
  });
});
