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
  getUserBankAccount,
  resolveBankAccount,
  saveBankAccount,
} from "~/.server/actions/bank-data";
import { auth } from "~/.server/services/better-auth";
import { PaystackService } from "~/.server/services/paystack.service";
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
  auth: { api: { getSession: vi.fn(), updateUser: vi.fn() } },
}));

vi.mock("~/.server/config/redis", () => ({
  default: () => null,
}));

vi.mock("~/.server/services/paystack.service", () => ({
  MEMBERSHIP_DUES_AMOUNT: 2000,
  PaystackService: {
    resolveAccountNumber: vi.fn(),
  },
}));

const request = () =>
  new Request("http://localhost/api/v1/bank-data", {
    headers: { "x-forwarded-for": "127.0.0.1" },
  });

const session = (role: string, id: string) => ({
  user: { id, name: "Ada Lovelace", email: "ada@example.com", role },
});

const getSessionMock = vi.mocked(auth.api.getSession);
const updateUserMock = vi.mocked(auth.api.updateUser);
const resolveAccountMock = vi.mocked(PaystackService.resolveAccountNumber);

const validPayload = {
  bankAccountName: "Ada Lovelace",
  bankAccountNumber: "0123456789",
  bankCode: "058",
  bank: "GTBank",
};

describe("saveBankAccount", () => {
  const userId = new mongoose.Types.ObjectId().toString();

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
    getSessionMock.mockResolvedValue(session("member", userId) as never);
    resolveAccountMock.mockResolvedValue({
      account_number: "0123456789",
      account_name: "Ada Lovelace",
    } as never);
    updateUserMock.mockResolvedValue(
      new Response("ok", { status: 200, headers: { "x-onboarded": "1" } }) as never,
    );
  });

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await saveBankAccount(request(), validPayload);
    expect(res.status).toBe(401);
  });

  it("returns 400 for an invalid payload", async () => {
    const res = await saveBankAccount(request(), {
      ...validPayload,
      bankAccountNumber: "012345678901",
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Invalid dataschema");
  });

  it("returns 400 when Paystack cannot resolve the account", async () => {
    resolveAccountMock.mockRejectedValue(new Error("Invalid NUBAN") as never);
    const res = await saveBankAccount(request(), validPayload);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("Could not verify account details");
    expect(await BankDetails.countDocuments({ userId })).toBe(0);
  });

  it("creates bank details, marks onboarding complete and returns 201 with refreshed headers", async () => {
    const res = await saveBankAccount(request(), validPayload);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.message).toBe("Bank details added successfully");
    expect(body.body.bankAccountName).toBe("Ada Lovelace");
    expect(res.headers.get("x-onboarded")).toBe("1");

    const bank = await BankDetails.findOne({ userId }).lean();
    expect(bank).toBeTruthy();
    expect(bank!.bankAccountNumber).toBe("0123456789");
    expect(bank!.bankAccountName).toBe("Ada Lovelace");

    expect(updateUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { isOnboarded: true, tourPending: true },
        asResponse: true,
      }),
    );
    expect(await AuditLog.countDocuments({ action: "BANK_DATA_CHANGE" })).toBe(1);
  });

  it("rolls back the bank details when marking onboarding fails", async () => {
    updateUserMock.mockResolvedValue(
      new Response(JSON.stringify({ success: false }), { status: 400 }) as never,
    );
    const res = await saveBankAccount(request(), validPayload);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Failed to complete onboarding. Please try again.");
    expect(await BankDetails.countDocuments({ userId })).toBe(0);
  });

  it("updates existing bank details without re-marking onboarding", async () => {
    await BankDetails.create({
      userId,
      bankAccountNumber: "0123456789",
      bankAccountName: "Old Name",
      bankCode: "058",
      bank: "GTBank",
    });
    resolveAccountMock.mockResolvedValue({
      account_number: "0123456789",
      account_name: "Resolved New Name",
    } as never);

    const res = await saveBankAccount(request(), validPayload);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe("Bank details updated successfully");
    expect(body.body.bankAccountName).toBe("Resolved New Name");

    const bank = await BankDetails.findOne({ userId }).lean();
    expect(bank!.bankAccountName).toBe("Resolved New Name");
    expect(updateUserMock).not.toHaveBeenCalled();
  });
});

describe("resolveBankAccount", () => {
  const userId = new mongoose.Types.ObjectId().toString();

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
    getSessionMock.mockResolvedValue(session("member", userId) as never);
    resolveAccountMock.mockResolvedValue({
      account_number: "0123456789",
      account_name: "Ada Lovelace",
    } as never);
  });

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await resolveBankAccount(request(), {
      accountNumber: "0123456789",
      bankCode: "058",
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 for an invalid payload", async () => {
    const res = await resolveBankAccount(request(), {
      accountNumber: "01234",
      bankCode: "058",
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Invalid dataschema");
  });

  it("returns 400 when Paystack cannot verify the account", async () => {
    resolveAccountMock.mockRejectedValue(new Error("Account not found") as never);
    const res = await resolveBankAccount(request(), {
      accountNumber: "0123456789",
      bankCode: "058",
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("Could not verify account");
  });

  it("returns the resolved account name", async () => {
    const res = await resolveBankAccount(request(), {
      accountNumber: "0123456789",
      bankCode: "058",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.body.accountName).toBe("Ada Lovelace");
  });
});

describe("getUserBankAccount", () => {
  const userId = new mongoose.Types.ObjectId().toString();

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
    getSessionMock.mockResolvedValue(session("member", userId) as never);
  });

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await getUserBankAccount(request());
    expect(res.status).toBe(401);
  });

  it("returns 404 when the user has no bank details", async () => {
    const res = await getUserBankAccount(request());
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.message).toBe("No bank data found");
  });

  it("returns the user's bank details", async () => {
    await BankDetails.create({
      userId,
      bankAccountNumber: "0123456789",
      bankAccountName: "Ada Lovelace",
      bankCode: "058",
      bank: "GTBank",
    });
    const res = await getUserBankAccount(request());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.body.bankAccountNumber).toBe("0123456789");
    expect(body.body.bankAccountName).toBe("Ada Lovelace");
  });
});
