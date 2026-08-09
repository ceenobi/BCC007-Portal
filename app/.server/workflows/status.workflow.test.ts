import { describe, expect, it } from "vitest";
import { computeNextStatus } from "~/.server/workflows/status.workflow";

describe("computeNextStatus", () => {
  const at = (iso: string) => new Date(iso);
  const event = (status: "upcoming" | "ongoing" | "completed" | "cancelled", date: string) => ({
    status,
    date: at(date),
  });

  it("returns null for an upcoming event that has not started", () => {
    expect(computeNextStatus(event("upcoming", "2024-01-15T10:00:00Z"), at("2024-01-10T12:00:00Z"))).toBeNull();
  });

  it("returns null for an upcoming event on the same day before start time", () => {
    expect(computeNextStatus(event("upcoming", "2024-01-15T10:00:00Z"), at("2024-01-15T09:00:00Z"))).toBeNull();
  });

  it("marks an upcoming event ongoing once the start time is reached", () => {
    expect(computeNextStatus(event("upcoming", "2024-01-15T10:00:00Z"), at("2024-01-15T12:00:00Z"))).toBe("ongoing");
  });

  it("marks an upcoming event completed once the day has passed", () => {
    expect(computeNextStatus(event("upcoming", "2024-01-15T10:00:00Z"), at("2024-01-16T00:00:00Z"))).toBe("completed");
  });

  it("marks an ongoing event completed once the day has passed", () => {
    expect(computeNextStatus(event("ongoing", "2024-01-15T10:00:00Z"), at("2024-01-16T00:00:00Z"))).toBe("completed");
  });

  it("returns null for an ongoing event still on its day", () => {
    expect(computeNextStatus(event("ongoing", "2024-01-15T10:00:00Z"), at("2024-01-15T23:00:00Z"))).toBeNull();
  });

  it("keeps a past-day completed event completed", () => {
    expect(computeNextStatus(event("completed", "2024-01-01T10:00:00Z"), at("2024-01-20T00:00:00Z"))).toBe("completed");
  });

  it("returns null for a completed event still on its day", () => {
    expect(computeNextStatus(event("completed", "2024-01-01T10:00:00Z"), at("2024-01-01T09:00:00Z"))).toBeNull();
  });

  it("falls through to completed for cancelled events once the day passes", () => {
    expect(computeNextStatus(event("cancelled", "2024-01-15T10:00:00Z"), at("2024-01-20T00:00:00Z"))).toBe("completed");
  });
});
