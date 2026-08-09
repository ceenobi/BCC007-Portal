import { describe, expect, it } from "vitest";
import { formatGuideHits, searchGuide } from "~/.server/ai/guide-retrieval";

describe("searchGuide", () => {
  it("ranks the account-registration article first for a forgotten-password query", () => {
    const hits = searchGuide("forgot password reset");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].id).toBe("account-registration");
  });

  it("ranks invite-members first for an invite query", () => {
    const hits = searchGuide("invite new members");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].id).toBe("invite-members");
  });

  it("returns nothing for gibberish or empty queries", () => {
    expect(searchGuide("zzzqqqx")).toEqual([]);
    expect(searchGuide("")).toEqual([]);
    expect(searchGuide("   ")).toEqual([]);
  });

  it("respects the limit", () => {
    const hits = searchGuide("payment", 2);
    expect(hits.length).toBeLessThanOrEqual(2);
  });

  it("scores title/keyword matches above content-only matches", () => {
    const hits = searchGuide("transfer");
    const top = hits[0];
    expect(top.score).toBeGreaterThan(0);
    expect(hits[0].score).toBeGreaterThanOrEqual(hits[hits.length - 1].score);
  });

  it("sorts results by descending score", () => {
    const hits = searchGuide("event status");
    for (let i = 1; i < hits.length; i++) {
      expect(hits[i - 1].score).toBeGreaterThanOrEqual(hits[i].score);
    }
  });

  it("returns well-formed hit objects", () => {
    const [hit] = searchGuide("onboarding", 1);
    expect(hit).toMatchObject({
      id: expect.any(String),
      title: expect.any(String),
      category: expect.any(String),
      content: expect.any(String),
      score: expect.any(Number),
    });
  });
});

describe("formatGuideHits", () => {
  it("returns a fallback message with no hits", () => {
    expect(formatGuideHits([])).toContain("No matching guide articles");
  });

  it("formats hits with numbered headings and content", () => {
    const [hit] = searchGuide("invite members", 1);
    const block = formatGuideHits([hit]);
    expect(block).toContain("[1]");
    expect(block).toContain(hit.title);
    expect(block).toContain(hit.category);
    expect(block).toContain(hit.content.slice(0, 20));
  });
});
