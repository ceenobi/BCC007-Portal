import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { submitContactMessage } from "~/.server/actions/contact";
import { workflowClient } from "~/.server/workflows/client";
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

vi.mock("~/.server/workflows/client", () => ({
  workflowClient: { trigger: vi.fn(async () => ({})) },
}));

const request = () =>
  new Request("http://localhost/contact", {
    headers: { "x-forwarded-for": "127.0.0.1" },
  });

const triggerMock = vi.mocked(workflowClient.trigger);

const validPayload = {
  fullname: "Ada Lovelace",
  email: "ada@example.com",
  subject: "Question about dues",
  message: "How do I pay my monthly membership dues?",
};

describe("submitContactMessage", () => {
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

  it("returns 400 for an invalid payload", async () => {
    const res = await submitContactMessage(request(), {
      ...validPayload,
      message: "short",
    });
    expect(res.status).toBe(400);
    expect(triggerMock).not.toHaveBeenCalled();
  });

  it("triggers the contact-message workflow for a valid payload", async () => {
    const res = await submitContactMessage(request(), validPayload);
    expect(res.status).toBe(200);

    expect(triggerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining("contact-message"),
        body: validPayload,
      }),
    );
  });
});
