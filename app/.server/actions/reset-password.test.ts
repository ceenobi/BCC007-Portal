import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetPasswordRequest } from "~/.server/actions/auth";
import { auth } from "~/.server/services/better-auth";
import { AuditLogService } from "~/.server/services/auditlog-service";
import User from "~/.server/models/user";

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
  auth: {
    api: {
      resetPassword: vi.fn(),
    },
  },
}));

vi.mock("~/.server/workflows/client", () => ({
  workflowClient: { trigger: vi.fn(async () => ({})) },
}));

vi.mock("~/.server/config/redis", () => ({
  default: () => null,
}));

vi.mock("~/.server/services/auditlog-service", () => ({
  AuditLogService: { record: vi.fn(async () => ({})) },
}));

vi.mock("~/.server/models/user", () => ({
  default: { updateOne: vi.fn().mockResolvedValue({}) },
}));

const resetPasswordMock = vi.mocked(auth.api.resetPassword) as unknown as {
  mockResolvedValue: (v: unknown) => void;
  mockReset: () => void;
  mock: { calls: unknown[][] };
};
const auditRecordMock = vi.mocked(AuditLogService.record);

const request = (token: string) =>
  new Request(`http://localhost/auth/reset-password?token=${token}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "127.0.0.1",
    },
    body: JSON.stringify({ newPassword: "NewSecure123!" }),
  });

beforeEach(() => {
  resetPasswordMock.mockReset();
  auditRecordMock.mockReset();
});

describe("resetPasswordRequest", () => {
  it("returns a success envelope when the password is reset", async () => {
    resetPasswordMock.mockResolvedValue(
      new Response(JSON.stringify({ status: true }), { status: 200 }),
    );

    const res = await resetPasswordRequest(request("valid-token"), {
      newPassword: "NewSecure123!",
    });

    expect(res).toBeInstanceOf(Response);
    const body = await (res as Response).json();
    expect(body.success).toBe(true);
    // React Router diverts non-2xx action responses into the error channel,
    // so every outcome the UI must read via fetcher.data ships with a 2xx.
    expect((res as Response).status).toBe(200);
    expect(auditRecordMock).toHaveBeenCalled();
  });

  it("wraps better-auth failures in a 200 envelope so they reach fetcher.data", async () => {
    // Regression: returning the raw 400 Response sent it to the router's
    // error channel — actionData stayed undefined and the UI went silent.
    resetPasswordMock.mockResolvedValue(
      new Response(
        JSON.stringify({ message: "Invalid token", code: "INVALID_TOKEN" }),
        { status: 400 },
      ),
    );

    const res = await resetPasswordRequest(request("expired-token"), {
      newPassword: "NewSecure123!",
    });

    const data = await (res as Response).json();
    expect((res as Response).status).toBe(200);
    expect(data.success).toBe(false);
    expect(data.message).toBe("Invalid token");
    expect(auditRecordMock).not.toHaveBeenCalled();
  });

  it("falls back to a generic message when the error body is not JSON", async () => {
    resetPasswordMock.mockResolvedValue(
      new Response("not json", { status: 500 }),
    );

    const res = await resetPasswordRequest(request("any"), {
      newPassword: "NewSecure123!",
    });

    const data = await (res as Response).json();
    expect(data.success).toBe(false);
    expect(data.message).toContain("Failed to reset password");
  });

  it("rejects a missing token without hitting better-auth", async () => {
    const res = await resetPasswordRequest(
      new Request("http://localhost/auth/reset-password", {
        method: "POST",
        headers: { "x-forwarded-for": "127.0.0.1" },
        body: JSON.stringify({ newPassword: "NewSecure123!" }),
      }),
      { newPassword: "NewSecure123!" },
    );

    const data = await (res as Response).json();
    expect(data.success).toBe(false);
    expect(data.message).toBe("Token is required");
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });
});
