import { describe, expect, it } from "vitest";
import { helpdeskKnowledgeBase } from "~/lib/guide";

describe("helpdeskKnowledgeBase integrity", () => {
  it("has at least 15 articles", () => {
    expect(helpdeskKnowledgeBase.length).toBeGreaterThanOrEqual(15);
  });

  it("uses unique article ids", () => {
    const ids = helpdeskKnowledgeBase.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every article has required fields populated", () => {
    for (const article of helpdeskKnowledgeBase) {
      expect(article.title.trim().length, `${article.id} title`).toBeGreaterThan(0);
      expect(article.category.trim().length, `${article.id} category`).toBeGreaterThan(0);
      expect(article.icon.trim().length, `${article.id} icon`).toBeGreaterThan(0);
      expect(article.content.trim().length, `${article.id} content`).toBeGreaterThan(0);
      expect(Array.isArray(article.keywords)).toBe(true);
      expect(article.keywords.length, `${article.id} keywords`).toBeGreaterThan(0);
    }
  });

  it("every article has at least one keyword", () => {
    for (const article of helpdeskKnowledgeBase) {
      expect(article.keywords.length, article.id).toBeGreaterThan(0);
    }
  });

  it("has the expected anchor articles", () => {
    const ids = helpdeskKnowledgeBase.map((a) => a.id);
    for (const expected of [
      "account-registration",
      "onboarding",
      "dashboard-overview",
      "create-manage-events",
      "payments-overview",
      "transfers-overview",
      "help-center",
      "subscription",
    ]) {
      expect(ids).toContain(expected);
    }
  });

  it("keywords are non-empty strings", () => {
    for (const article of helpdeskKnowledgeBase) {
      for (const keyword of article.keywords) {
        expect(typeof keyword).toBe("string");
        expect(keyword.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
