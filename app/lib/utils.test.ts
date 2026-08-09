import { describe, expect, it } from "vitest";
import {
  cn,
  escapeRegex,
  formatDate,
  formatEventDate,
  formatEventTime,
  formatMeta,
  formatMoney,
  formatPaymentDate,
  generateInviteCode,
  generateTicketId,
  getInitials,
  getTimeOfDay,
  isDateOnly,
  toEndOfDay,
  toStartOfDay,
} from "~/lib/utils";

describe("cn", () => {
  it("merges class names and drops falsy values", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });

  it("resolves tailwind conflicts with twMerge", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });
});

describe("generateInviteCode", () => {
  it("produces an 8-char code prefixed with INV", () => {
    const code = generateInviteCode();
    expect(code.startsWith("INV")).toBe(true);
    expect(code).toHaveLength(8);
    expect(code).toMatch(/^INV[A-Z0-9]{5}$/);
  });
});

describe("getTimeOfDay", () => {
  it("returns one of the known greetings", () => {
    expect(["☀️ ", "🌤️ ", "🌙 "]).toContain(getTimeOfDay());
  });
});

describe("formatMeta", () => {
  it("converts snake_case and hyphens to Title Case", () => {
    expect(formatMeta("membership_dues")).toBe("Membership Dues");
    expect(formatMeta("on-hold")).toBe("On Hold");
    expect(formatMeta("already_title")).toBe("Already Title");
  });
});

describe("formatDate / formatPaymentDate / formatEventDate", () => {
  it("formats ISO dates as en-GB day month year", () => {
    expect(formatDate("2024-01-15")).toBe("15 Jan 2024");
    expect(formatPaymentDate("2024-03-02")).toBe("02 Mar 2024");
    expect(formatEventDate("2024-12-25T10:00:00Z")).toBe("25 Dec 2024");
  });

  it("returns an em dash for invalid dates", () => {
    expect(formatEventDate("not-a-date")).toBe("—");
    expect(formatPaymentDate("not-a-date")).toBe("—");
  });
});

describe("generateTicketId", () => {
  it("matches the TK-<ts>-<rand> shape", () => {
    for (let i = 0; i < 20; i++) {
      expect(generateTicketId()).toMatch(/^TK-\d{4}-\d{6}$/);
    }
  });
});

describe("formatEventTime", () => {
  it("converts 24h time to 12h display", () => {
    expect(formatEventTime("14:30")).toBe("2:30 PM");
    expect(formatEventTime("09:05")).toBe("9:05 AM");
    expect(formatEventTime("00:00")).toBe("12:00 AM");
    expect(formatEventTime("12:15")).toBe("12:15 PM");
  });

  it("handles missing or invalid times", () => {
    expect(formatEventTime(undefined)).toBe("—");
    expect(formatEventTime("abc")).toBe("abc");
  });
});

describe("getInitials", () => {
  it("builds initials from the first two words", () => {
    expect(getInitials("John Doe")).toBe("JD");
    expect(getInitials("Ada")).toBe("A");
    expect(getInitials("  spaced   name  here  ")).toBe("SN");
  });

  it("returns empty string for empty input", () => {
    expect(getInitials("")).toBe("");
    expect(getInitials(undefined)).toBe("");
  });
});

describe("formatMoney", () => {
  it("formats NGN amounts with symbol and no decimals", () => {
    expect(formatMoney(1500)).toBe("₦1,500");
    expect(formatMoney(1234567)).toBe("₦1,234,567");
  });

  it("supports other currency displays", () => {
    expect(formatMoney(1500, "code")).toContain("NGN");
    expect(formatMoney(1500, "narrowSymbol")).toBe("₦1,500");
  });
});

describe("date helpers", () => {
  it("isDateOnly matches YYYY-MM-DD only", () => {
    expect(isDateOnly("2024-01-15")).toBe(true);
    expect(isDateOnly("2024-1-1")).toBe(false);
    expect(isDateOnly("2024-01-15T00:00:00Z")).toBe(false);
  });

  it("toStartOfDay pins date-only values to UTC midnight", () => {
    expect(toStartOfDay("2024-01-15").toISOString()).toBe("2024-01-15T00:00:00.000Z");
  });

  it("toEndOfDay pins date-only values to UTC end of day", () => {
    expect(toEndOfDay("2024-01-15").toISOString()).toBe("2024-01-15T23:59:59.999Z");
  });

  it("toStartOfDay / toEndOfDay pass through non-date-only values", () => {
    const iso = "2024-01-15T08:30:00.000Z";
    expect(toStartOfDay(iso).toISOString()).toBe(iso);
    expect(toEndOfDay(iso).toISOString()).toBe(iso);
  });
});

describe("escapeRegex", () => {
  it("escapes all regex metacharacters", () => {
    expect(escapeRegex("a.b*c?")).toBe("a\\.b\\*c\\?");
    expect(escapeRegex("[x]")).toBe("\\[x\\]");
  });

  it("leaves plain strings untouched", () => {
    expect(escapeRegex("hello world")).toBe("hello world");
  });
});
