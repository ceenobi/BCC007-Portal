import { describe, expect, it, vi } from "vitest";
import { tryCatchWrapper } from "~/lib/tryCatchWrapper";

describe("tryCatchWrapper", () => {
  it("returns the operation result on success", async () => {
    const result = await tryCatchWrapper(async () => ({ ok: true }));
    expect(result).toEqual({ ok: true });
  });

  it("returns a 500 JSON error with the thrown message on failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const res = await tryCatchWrapper(async () => {
      throw new Error("boom");
    });
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      success: false,
      message: "boom",
      body: null,
    });
    vi.restoreAllMocks();
  });

  it("uses error.message over the provided default message", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const res = await tryCatchWrapper(
      async () => {
        throw new Error("raw");
      },
      "a friendly default",
    );
    const body = await res.json();
    expect(body.message).toBe("raw");
    vi.restoreAllMocks();
  });

  it("falls back to the provided default when error has no message", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const res = await tryCatchWrapper(
      async () => {
        throw new Error();
      },
      "a friendly default",
    );
    const body = await res.json();
    expect(body.message).toBe("a friendly default");
    vi.restoreAllMocks();
  });

  it("uses the generic default message when none provided and no error message", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const res = await tryCatchWrapper(async () => {
      throw new Error();
    });
    const body = await res.json();
    expect(body.message).toBe("An unexpected error occurred");
    vi.restoreAllMocks();
  });

  it("sets a JSON content-type header on errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const res = await tryCatchWrapper(async () => {
      throw new Error("x");
    });
    expect(res.headers.get("content-type")).toContain("application/json");
    vi.restoreAllMocks();
  });

  it("falls back to default when thrown value is not an Error with message", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const res = await tryCatchWrapper(
      async () => {
        throw { code: 42 };
      },
      "a friendly default",
    );
    const body = await res.json();
    expect(body.message).toBe("a friendly default");
    vi.restoreAllMocks();
  });
});
