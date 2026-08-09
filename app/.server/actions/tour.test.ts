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
import { completeTour } from "~/.server/actions/tour";
import { auth } from "~/.server/services/better-auth";
import { clearTestDB, connectTestDB, disconnectTestDB } from "~/test/helpers/db";

vi.mock("~/.server/services/better-auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
      updateUser: vi.fn(),
    },
  },
}));

const request = () =>
  new Request("http://localhost/api/v1/tour", {
    headers: { "x-forwarded-for": "127.0.0.1" },
  });

const getSessionMock = vi.mocked(auth.api.getSession);
const updateUserMock = vi.mocked(auth.api.updateUser);

describe("completeTour", () => {
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
    getSessionMock.mockResolvedValue({
      user: { id: userId, name: "Ada", email: "ada@example.com", role: "member" },
    } as never);
    updateUserMock.mockResolvedValue(
      new Response(null, {
        status: 200,
        headers: { "Set-Cookie": "session=refreshed" },
      }) as never,
    );
  });

  it("returns 401 without a session", async () => {
    getSessionMock.mockResolvedValue(null as never);
    const res = await completeTour(request());
    expect(res.status).toBe(401);
  });

  it("clears the tourPending flag and returns the refreshed cookies", async () => {
    const res = await completeTour(request());
    expect(res.status).toBe(200);

    expect(updateUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { tourPending: false },
        asResponse: true,
      }),
    );
    expect(res.headers.get("Set-Cookie")).toBe("session=refreshed");
  });

  it("returns 400 when better-auth fails to update the user", async () => {
    updateUserMock.mockResolvedValue(
      new Response(null, { status: 500 }) as never,
    );
    const res = await completeTour(request());
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("Failed to save tour state");
  });
});
