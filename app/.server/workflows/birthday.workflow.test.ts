import { describe, expect, it } from "vitest";
import { getAgeAtDate } from "~/.server/workflows/birthday.workflow";

const currentYear = new Date().getUTCFullYear();

describe("getAgeAtDate", () => {
  // Note: getUTCMonth() is 0-indexed, so May is month 4.
  it("returns the full age on the birthday month/day", () => {
    const birth = new Date("1990-05-15T00:00:00Z");
    expect(getAgeAtDate(birth, 4, 15)).toBe(currentYear - 1990);
  });

  it("subtracts one before the birthday has been reached in the year", () => {
    const birth = new Date("1990-12-15T00:00:00Z");
    expect(getAgeAtDate(birth, 4, 15)).toBe(currentYear - 1990 - 1);
  });

  it("handles a birthday later in the same month", () => {
    const birth = new Date("1990-05-31T00:00:00Z");
    expect(getAgeAtDate(birth, 4, 15)).toBe(currentYear - 1990 - 1);
  });

  it("handles an exact-birthday month with an earlier day", () => {
    const birth = new Date("1990-05-10T00:00:00Z");
    expect(getAgeAtDate(birth, 4, 15)).toBe(currentYear - 1990);
  });
});
