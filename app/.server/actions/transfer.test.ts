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
  finalizeTransfer,
  initiateTransfer,
  retryTransfer,
  verifyTransfer,
} from "~/.server/actions/transfer";
import { auth } from "~/.server/services/better-auth";
import { PaystackService } from "~/.server/services/paystack.service";
import Transfer from "~/.server/models/transfer";
import User from "~/.server/models/user";
import BankDetails from "~/.server/models/bank";
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

vi.mock("~/.server/services/paystack.service", () => {
  let refCounter = 0;
  return {
    PaystackService: {
      createTransferRecipient: vi.fn(),
      generateReference: vi.fn(
        () => `BCC-TRF-T${String(++refCounter).padStart(4, "0")}`,
      ),
      initiateTransfer: vi.fn(),
      verifyTransfer: vi.fn(),
      finalizeTransfer: vi.fn(),
      getBalance: vi.fn(),
    },
  };
});

const request = () =>
  new Request("http://localhost/api/v1/transfers", {
    headers: { "x-forwarded-for": "127.0.0.1" },
  });

const session = (role: string, id: string) => ({
  user: { id, name: role, email: `${role}@example.com`, role },
});

const getSessionMock = vi.mocked(auth.api.getSession);
const initiateMock = vi.mocked(PaystackService.initiateTransfer);
const verifyMock = vi.mocked(PaystackService.verifyTransfer);
const finalizeMock = vi.mocked(PaystackService.finalizeTransfer);
const createRecipientMock = vi.mocked(PaystackService.createTransferRecipient);

const makeUser = (id: string, role = "member") =>
  User.create({
    _id: id,
    name: "Ada Lovelace",
    email: `${id}@example.com`,
    password: "hashed",
    role,
  });

const makeBank = (userId: string) =>
  BankDetails.create({
    userId,
    bankAccountNumber: "0123456789",
    bankAccountName: "Ada Lovelace",
    bankCode: "058",
    bank: "GTBank",
  });

const makeTransfer = (
  opts: {
    userId?: string;
    reference?: string;
    transferCode?: string;
    status?: string;
    metadata?: Record<string, any>;
  } = {},
) =>
  Transfer.create({
    userId: opts.userId ?? new mongoose.Types.ObjectId().toString(),
    bankDetailsId: new mongoose.Types.ObjectId(),
    recipientCode: "RCP_test001",
    amount: 5000,
    reference: opts.reference ?? "BCC-TRF-ORIG",
    transferCode: opts.transferCode ?? "TRF_orig1",
    status: opts.status ?? "pending",
    metadata: opts.metadata ?? {},
  });

describe("initiateTransfer", () => {
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
  const recipientId = new mongoose.Types.ObjectId().toString();

  beforeEach(async () => {
    await makeUser(adminId, "admin");
    await makeUser(memberId, "member");
    await makeUser(recipientId, "member");
    await makeBank(recipientId);
    getSessionMock.mockResolvedValue(session("super_admin", adminId) as never);
    createRecipientMock.mockResolvedValue({
      status: true,
      data: { recipient_code: "RCP_test001" },
    } as never);
    initiateMock.mockResolvedValue({
      status: true,
      data: { status: "in_transit", transfer_code: "TRF_abc123" },
    } as never);
  });

  const validPayload = {
    userId: recipientId,
    amount: 5000,
    reason: "Payout",
  };

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await initiateTransfer(request(), validPayload);
    expect(res.status).toBe(401);
  });

  it("forbids users without MANAGE_TRANSFERS", async () => {
    getSessionMock.mockResolvedValue(session("member", memberId) as never);
    const res = await initiateTransfer(request(), validPayload);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.message).toContain("MANAGE_TRANSFERS");
  });

  it("returns 400 for an invalid payload", async () => {
    const res = await initiateTransfer(request(), { ...validPayload, amount: 50 });
    expect(res.status).toBe(400);
  });

  it("returns 404 when the recipient user does not exist", async () => {
    const res = await initiateTransfer(request(), {
      ...validPayload,
      userId: new mongoose.Types.ObjectId().toString(),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.message).toBe("Recipient user not found");
  });

  it("returns 400 when the recipient has no saved bank account", async () => {
    await BankDetails.deleteMany({});
    const res = await initiateTransfer(request(), validPayload);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("no saved bank account");
  });

  it("creates a recipient, transfer row and audit log on success", async () => {
    const res = await initiateTransfer(request(), validPayload);
    expect(res.status).toBe(201);

    const transfer = await Transfer.findOne({ userId: recipientId }).lean();
    expect(transfer).toBeTruthy();
    expect(transfer!.recipientCode).toBe("RCP_test001");
    expect(transfer!.status).toBe("in_transit");
    expect(transfer!.transferCode).toBe("TRF_abc123");
    expect(transfer!.metadata.initiatedBy).toBe(adminId);

    expect(createRecipientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        account_number: "0123456789",
        bank_code: "058",
      }),
    );
    expect(await AuditLog.countDocuments({ action: "TRANSFER_INITIATED" })).toBe(1);
  });

  it("reuses an existing recipient code instead of creating a new one", async () => {
    const first = await initiateTransfer(request(), validPayload);
    expect(first.status).toBe(201);

    const second = await initiateTransfer(request(), {
      ...validPayload,
      idempotencyKey: "tx-reuse-recipient",
    });
    expect(second.status).toBe(201);

    expect(createRecipientMock).toHaveBeenCalledTimes(1);
    expect(await Transfer.countDocuments({ userId: recipientId })).toBe(2);
  });

  it("maps the Paystack otp status onto the local row", async () => {
    initiateMock.mockResolvedValue({
      status: true,
      data: { status: "otp", transfer_code: "TRF_otp1" },
    } as never);
    const res = await initiateTransfer(request(), validPayload);
    expect(res.status).toBe(201);
    const transfer = await Transfer.findOne({ userId: recipientId }).lean();
    expect(transfer!.status).toBe("otp");
  });

  it("deletes the pending row when Paystack rejects initiation", async () => {
    initiateMock.mockResolvedValue({ status: false, data: null } as never);
    const res = await initiateTransfer(request(), validPayload);
    expect(res.status).toBe(400);
    expect(await Transfer.countDocuments({})).toBe(0);
  });

  it("deletes the pending row when Paystack throws", async () => {
    initiateMock.mockRejectedValue(new Error("Paystack down") as never);
    const res = await initiateTransfer(request(), validPayload);
    expect(res.status).toBe(500);
    expect(await Transfer.countDocuments({})).toBe(0);
  });

  it("replays idempotently when the idempotency key is reused", async () => {
    const payload = { ...validPayload, idempotencyKey: "tx-dup" };

    const first = await initiateTransfer(request(), payload);
    expect(first.status).toBe(201);

    const second = await initiateTransfer(request(), payload);
    expect(second.status).toBe(201);
    const body = await second.json();
    expect(body.message).toBe("Transfer already initiated");

    expect(await Transfer.countDocuments({ userId: recipientId })).toBe(1);
    expect(initiateMock).toHaveBeenCalledTimes(1);
  });
});

describe("verifyTransfer", () => {
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
    getSessionMock.mockResolvedValue(session("super_admin", adminId) as never);
    verifyMock.mockResolvedValue({
      status: true,
      data: { status: "success", transfer_code: "TRF_orig1", failure_reason: null },
    } as never);
  });

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await verifyTransfer(request(), { reference: "BCC-TRF-ORIG" });
    expect(res.status).toBe(401);
  });

  it("returns 400 for an invalid payload", async () => {
    const res = await verifyTransfer(request(), { reference: "" });
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown reference", async () => {
    const res = await verifyTransfer(request(), { reference: "BCC-TRF-MISSING" });
    expect(res.status).toBe(404);
  });

  it("syncs the local status from Paystack", async () => {
    await makeTransfer({ userId: adminId });
    const res = await verifyTransfer(request(), { reference: "BCC-TRF-ORIG" });
    expect(res.status).toBe(200);

    const transfer = await Transfer.findOne({ reference: "BCC-TRF-ORIG" }).lean();
    expect(transfer!.status).toBe("success");
  });
});

describe("finalizeTransfer", () => {
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
    finalizeMock.mockResolvedValue({
      status: true,
      data: { status: "in_transit", transfer_code: "TRF_otp1" },
    } as never);
  });

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await finalizeTransfer(request(), {
      transferCode: "TRF_otp1",
      otp: "123456",
    });
    expect(res.status).toBe(401);
  });

  it("forbids users without MANAGE_TRANSFERS", async () => {
    getSessionMock.mockResolvedValue(session("member", memberId) as never);
    const res = await finalizeTransfer(request(), {
      transferCode: "TRF_otp1",
      otp: "123456",
    });
    expect(res.status).toBe(403);
  });

  it("returns 400 for an invalid OTP", async () => {
    const res = await finalizeTransfer(request(), {
      transferCode: "TRF_otp1",
      otp: "12345",
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown transfer code", async () => {
    const res = await finalizeTransfer(request(), {
      transferCode: "TRF_missing",
      otp: "123456",
    });
    expect(res.status).toBe(404);
  });

  it("rejects a transfer that is not awaiting OTP", async () => {
    await makeTransfer({ status: "pending", transferCode: "TRF_pend1" });
    const res = await finalizeTransfer(request(), {
      transferCode: "TRF_pend1",
      otp: "123456",
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("not awaiting OTP");
  });

  it("finalizes an otp transfer and releases the claim", async () => {
    await makeTransfer({ status: "otp", transferCode: "TRF_otp1" });
    const res = await finalizeTransfer(request(), {
      transferCode: "TRF_otp1",
      otp: "123456",
    });
    expect(res.status).toBe(200);

    const transfer = await Transfer.findOne({ transferCode: "TRF_otp1" }).lean();
    expect(transfer!.status).toBe("in_transit");
    expect(transfer!.metadata.finalizing).toBeUndefined();
    expect(finalizeMock).toHaveBeenCalledWith("TRF_otp1", "123456");
    expect(await AuditLog.countDocuments({ action: "TRANSFER_FINALIZED" })).toBe(1);
  });

  it("returns 409 when another request already holds the finalize claim", async () => {
    await makeTransfer({
      status: "otp",
      transferCode: "TRF_otp1",
      metadata: { finalizing: { at: new Date(), by: "someone-else" } },
    });
    const res = await finalizeTransfer(request(), {
      transferCode: "TRF_otp1",
      otp: "123456",
    });
    expect(res.status).toBe(409);
    expect(finalizeMock).not.toHaveBeenCalled();
  });
});

describe("retryTransfer", () => {
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
  const recipientId = new mongoose.Types.ObjectId().toString();

  beforeEach(async () => {
    await makeUser(adminId, "admin");
    await makeUser(memberId, "member");
    await makeUser(recipientId, "member");
    getSessionMock.mockResolvedValue(session("super_admin", adminId) as never);
    verifyMock.mockResolvedValue({
      status: true,
      data: { status: "failed", transfer_code: "TRF_fail1", failure_reason: "NUBAN invalid" },
    } as never);
    initiateMock.mockResolvedValue({
      status: true,
      data: { status: "in_transit", transfer_code: "TRF_retry1" },
    } as never);
  });

  const failedTransfer = () =>
    makeTransfer({
      userId: recipientId,
      status: "failed",
      reference: "BCC-TRF-FAILED",
      transferCode: "TRF_fail1",
    });

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await retryTransfer(request(), { reference: "BCC-TRF-FAILED" });
    expect(res.status).toBe(401);
  });

  it("forbids users without MANAGE_TRANSFERS", async () => {
    getSessionMock.mockResolvedValue(session("member", memberId) as never);
    const res = await retryTransfer(request(), { reference: "BCC-TRF-FAILED" });
    expect(res.status).toBe(403);
  });

  it("returns 404 for an unknown reference", async () => {
    const res = await retryTransfer(request(), { reference: "BCC-TRF-MISSING" });
    expect(res.status).toBe(404);
  });

  it("refuses to retry a transfer that is not failed locally", async () => {
    await makeTransfer({ userId: recipientId, status: "success", reference: "BCC-TRF-OK" });
    const res = await retryTransfer(request(), { reference: "BCC-TRF-OK" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("Only failed transfers can be retried");
  });

  it("refuses a second retry of the same original", async () => {
    await makeTransfer({
      userId: recipientId,
      status: "failed",
      reference: "BCC-TRF-FAILED",
      metadata: { retriedTo: "BCC-TRF-RETRYED" },
    });
    const res = await retryTransfer(request(), { reference: "BCC-TRF-FAILED" });
    expect(res.status).toBe(409);
    expect(initiateMock).not.toHaveBeenCalled();
  });

  it("returns 409 when another request already holds the retry claim", async () => {
    await makeTransfer({
      userId: recipientId,
      status: "failed",
      reference: "BCC-TRF-FAILED",
      metadata: { retrying: { at: new Date(), by: "someone-else" } },
    });
    const res = await retryTransfer(request(), { reference: "BCC-TRF-FAILED" });
    expect(res.status).toBe(409);
    expect(initiateMock).not.toHaveBeenCalled();
  });

  it("refuses to retry when Paystack is still processing", async () => {
    await failedTransfer();
    verifyMock.mockResolvedValue({
      status: true,
      data: { status: "in_transit", transfer_code: "TRF_fail1" },
    } as never);
    const res = await retryTransfer(request(), { reference: "BCC-TRF-FAILED" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("still processing");
    expect(initiateMock).not.toHaveBeenCalled();
  });

  it("creates a new transfer row and links it to the original", async () => {
    await failedTransfer();
    const res = await retryTransfer(request(), { reference: "BCC-TRF-FAILED" });
    expect(res.status).toBe(201);

    const original = await Transfer.findOne({ reference: "BCC-TRF-FAILED" }).lean();
    expect(original!.metadata.retriedTo).toBeTruthy();
    expect(original!.metadata.retrying).toBeUndefined();

    const retried = await Transfer.findOne({
      reference: original!.metadata.retriedTo,
    }).lean();
    expect(retried).toBeTruthy();
    expect(retried!.metadata.retriedFrom).toBe("BCC-TRF-FAILED");
    expect(retried!.amount).toBe(5000);
    expect(retried!.recipientCode).toBe("RCP_test001");

    expect(await AuditLog.countDocuments({ action: "TRANSFER_RETRIED" })).toBe(1);
  });
});
