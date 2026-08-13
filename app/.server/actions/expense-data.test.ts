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
  createExpense,
  deleteExpense,
  getExpense,
  getExpenses,
  updateExpense,
} from "~/.server/actions/expense-data";
import { auth } from "~/.server/services/better-auth";
import AuditLog from "~/.server/models/auditlog";
import Expense from "~/.server/models/expense";
import User from "~/.server/models/user";
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

const request = (url = "http://localhost/api/v1/expenses") =>
  new Request(url, { headers: { "x-forwarded-for": "127.0.0.1" } });

const session = (role: string, id: string) => ({
  user: { id, name: "Ada Lovelace", email: "ada@example.com", role },
});

const getSessionMock = vi.mocked(auth.api.getSession);

const makeUser = (id: string, role = "member") =>
  User.create({
    _id: id,
    name: "Ada Lovelace",
    email: `${id}@example.com`,
    password: "hashed",
    role,
  });

const makeExpense = (
  userId: string,
  opts: {
    title?: string;
    description?: string;
    amount?: number;
    category?: string;
    status?: string;
    transferId?: string;
  } = {},
) =>
  Expense.create({
    userId,
    title: opts.title ?? "Venue Rental",
    description: opts.description,
    amount: opts.amount ?? 50000,
    category: opts.category ?? "venue",
    status: opts.status ?? "pending",
    ...(opts.transferId ? { transferId: opts.transferId } : {}),
  });

const listParams = (
  overrides: {
    page?: number;
    limit?: number;
    query?: string | undefined;
    status?: string | undefined;
    category?: string | undefined;
  } = {},
) => ({
  request: request(),
  page: 1,
  limit: 10,
  query: undefined,
  status: undefined,
  category: undefined,
  ...overrides,
});

describe("getExpenses", () => {
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
    getSessionMock.mockResolvedValue(session("admin", adminId) as never);
  });

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await getExpenses(listParams());
    expect(res.status).toBe(401);
  });

  it("rejects an invalid page or limit", async () => {
    expect((await getExpenses(listParams({ page: 0 }))).status).toBe(400);
    expect((await getExpenses(listParams({ limit: 0 }))).status).toBe(400);
    expect((await getExpenses(listParams({ limit: 101 }))).status).toBe(400);
  });

  it("rejects an invalid status filter", async () => {
    const res = await getExpenses(listParams({ status: "cancelled" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Invalid status filter");
  });

  it("rejects an invalid category filter", async () => {
    const res = await getExpenses(listParams({ category: "travel" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Invalid category filter");
  });

  it("returns paginated expenses with meta", async () => {
    await makeExpense(adminId, { title: "Expense One" });
    await makeExpense(adminId, { title: "Expense Two" });
    await makeExpense(adminId, { title: "Expense Three" });

    const res = await getExpenses(listParams({ page: 1, limit: 2 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.body.expenses).toHaveLength(2);
    expect(body.body.meta.total).toBe(3);
    expect(body.body.meta.totalPages).toBe(2);
    expect(body.body.meta.hasMore).toBe(true);
  });

  it("filters by status", async () => {
    await makeExpense(adminId, { title: "Approved", status: "approved" });
    await makeExpense(adminId, { title: "Pending", status: "pending" });
    const res = await getExpenses(listParams({ status: "approved" }));
    const body = await res.json();
    expect(body.body.expenses).toHaveLength(1);
    expect(body.body.expenses[0].title).toBe("Approved");
  });

  it("filters by category", async () => {
    await makeExpense(adminId, { title: "Venue", category: "venue" });
    await makeExpense(adminId, { title: "Food", category: "refreshments" });
    const res = await getExpenses(listParams({ category: "venue" }));
    const body = await res.json();
    expect(body.body.expenses).toHaveLength(1);
    expect(body.body.expenses[0].title).toBe("Venue");
  });

  it("searches by title query", async () => {
    await makeExpense(adminId, { title: "Generator Fuel" });
    await makeExpense(adminId, { title: "Water Supply" });
    const res = await getExpenses(listParams({ query: "fuel" }));
    const body = await res.json();
    expect(body.body.expenses).toHaveLength(1);
    expect(body.body.expenses[0].title).toBe("Generator Fuel");
  });
});

describe("getExpense", () => {
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
    getSessionMock.mockResolvedValue(session("admin", adminId) as never);
  });

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await getExpense(request(), {
      expenseId: new mongoose.Types.ObjectId().toString(),
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 for an invalid expense id", async () => {
    const res = await getExpense(request(), { expenseId: "not-an-id" });
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown expense", async () => {
    const res = await getExpense(request(), {
      expenseId: new mongoose.Types.ObjectId().toString(),
    });
    expect(res.status).toBe(404);
  });

  it("returns a single expense", async () => {
    await makeUser(adminId);
    const expense = await makeExpense(adminId, { title: "Venue Rental" });
    const res = await getExpense(request(), {
      expenseId: expense._id.toString(),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.body.title).toBe("Venue Rental");
    expect(body.body.userId._id.toString()).toBe(adminId);
  });
});

describe("createExpense", () => {
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

  beforeEach(() => {
    getSessionMock.mockResolvedValue(session("admin", adminId) as never);
  });

  const payload = (overrides: Record<string, unknown> = {}) => ({
    title: "Venue Rental",
    description: "Hall rental for Q3 meetup",
    amount: 50000,
    category: "venue" as const,
    ...overrides,
  });

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await createExpense(request(), payload());
    expect(res.status).toBe(401);
  });

  it("forbids members from creating expenses", async () => {
    getSessionMock.mockResolvedValue(session("member", memberId) as never);
    const res = await createExpense(request(), payload());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.message).toContain("MANAGE_PAYMENTS");
  });

  it("returns 400 for an invalid payload", async () => {
    const res = await createExpense(request(), payload({ amount: 0 }) as never);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Invalid data format");
  });

  it("creates an expense, links it to the recorder, and records an audit log", async () => {
    const res = await createExpense(request(), payload());
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.body.title).toBe("Venue Rental");
    expect(body.body.userId.toString()).toBe(adminId);
    expect(body.body.status).toBe("pending");
    expect(body.body.monthKey).toMatch(/^\d{4}-\d{2}$/);

    const created = await Expense.findById(body.body._id).lean();
    expect(created).toBeTruthy();
    expect(await AuditLog.countDocuments({ action: "CREATE_EXPENSE" })).toBe(1);
  });

  it("deduplicates a replay with the same idempotency key", async () => {
    const first = await createExpense(
      request(),
      payload({ idempotencyKey: "key-1" }),
    );
    expect(first.status).toBe(201);
    const second = await createExpense(
      request(),
      payload({ idempotencyKey: "key-1" }),
    );
    expect(second.status).toBe(201);
    expect(await Expense.countDocuments({})).toBe(1);
    expect(await AuditLog.countDocuments({ action: "CREATE_EXPENSE" })).toBe(1);
  });

  it("stores a transferId when provided", async () => {
    const transferId = new mongoose.Types.ObjectId().toString();
    const res = await createExpense(request(), payload({ transferId }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.body.transferId.toString()).toBe(transferId);
  });
});

describe("updateExpense", () => {
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

  beforeEach(() => {
    getSessionMock.mockResolvedValue(session("admin", adminId) as never);
  });

  const updatePayload = (overrides: Record<string, unknown> = {}) => ({
    title: "Updated Venue",
    amount: 60000,
    category: "venue" as const,
    status: "approved" as const,
    ...overrides,
  });

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await updateExpense(request(), {
      ...updatePayload(),
      expenseId: new mongoose.Types.ObjectId().toString(),
    });
    expect(res.status).toBe(401);
  });

  it("forbids members from updating expenses", async () => {
    getSessionMock.mockResolvedValue(session("member", memberId) as never);
    const res = await updateExpense(request(), {
      ...updatePayload(),
      expenseId: new mongoose.Types.ObjectId().toString(),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.message).toContain("MANAGE_PAYMENTS");
  });

  it("returns 400 for an invalid expense id", async () => {
    const res = await updateExpense(request(), {
      ...updatePayload(),
      expenseId: "not-an-id",
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Invalid expense id");
  });

  it("returns 400 for an invalid payload", async () => {
    const res = await updateExpense(request(), {
      ...updatePayload({ title: "AB" }),
      expenseId: new mongoose.Types.ObjectId().toString(),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toBe("Invalid data format");
  });

  it("returns 404 for an unknown expense", async () => {
    const res = await updateExpense(request(), {
      ...updatePayload(),
      expenseId: new mongoose.Types.ObjectId().toString(),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.message).toBe("Expense not found");
  });

  it("updates the expense and records an audit log", async () => {
    const expense = await makeExpense(adminId, { title: "Venue Rental" });
    const res = await updateExpense(request(), {
      ...updatePayload(),
      expenseId: expense._id.toString(),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.body.title).toBe("Updated Venue");
    expect(body.body.status).toBe("approved");

    const updated = await Expense.findById(expense._id).lean();
    expect(updated!.amount).toBe(60000);
    expect(await AuditLog.countDocuments({ action: "UPDATE_EXPENSE" })).toBe(1);
  });
});

describe("deleteExpense", () => {
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

  beforeEach(() => {
    getSessionMock.mockResolvedValue(session("admin", adminId) as never);
  });

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await deleteExpense(request(), {
      expenseId: new mongoose.Types.ObjectId().toString(),
    });
    expect(res.status).toBe(401);
  });

  it("forbids members from deleting expenses", async () => {
    getSessionMock.mockResolvedValue(session("member", memberId) as never);
    const res = await deleteExpense(request(), {
      expenseId: new mongoose.Types.ObjectId().toString(),
    });
    expect(res.status).toBe(403);
  });

  it("returns 400 for an invalid expense id", async () => {
    const res = await deleteExpense(request(), { expenseId: "not-an-id" });
    expect(res.status).toBe(400);
  });

  it("returns 200 even when the expense does not exist", async () => {
    const res = await deleteExpense(request(), {
      expenseId: new mongoose.Types.ObjectId().toString(),
    });
    expect(res.status).toBe(200);
  });

  it("deletes the expense and records an audit log", async () => {
    const expense = await makeExpense(adminId, { title: "Venue Rental" });
    const res = await deleteExpense(request(), {
      expenseId: expense._id.toString(),
    });
    expect(res.status).toBe(200);

    expect(await Expense.findById(expense._id)).toBeNull();
    expect(await AuditLog.countDocuments({ action: "DELETE_EXPENSE" })).toBe(1);
  });
});
