import { describe, expect, it } from "vitest";
import type { ChatMessageLite } from "~/.server/ai/tools";
import {
  EVENT_TYPE_LABEL,
  isSideEffectTool,
  toolByName,
  tools,
  userConfirmed,
} from "~/.server/ai/tools";

describe("tool registry", () => {
  it("exposes every tool with a name and execute fn", () => {
    for (const tool of tools) {
      expect(tool.name.length).toBeGreaterThan(0);
      expect(typeof tool.execute).toBe("function");
      expect(typeof tool.description).toBe("string");
    }
  });

  it("resolves tools by name", () => {
    expect(toolByName("search_guide")?.name).toBe("search_guide");
    expect(toolByName("create_ticket")?.name).toBe("create_ticket");
    expect(toolByName("does_not_exist")).toBeUndefined();
  });

  it("marks side-effecting tools as requiring confirmation", () => {
    expect(isSideEffectTool("create_ticket")).toBe(true);
    expect(isSideEffectTool("mark_event_interest")).toBe(true);
    expect(isSideEffectTool("send_birthday_reminder")).toBe(true);
    expect(isSideEffectTool("get_upcoming_events")).toBe(false);
    expect(isSideEffectTool("search_guide")).toBe(false);
  });

  it("defines the expected event type labels", () => {
    expect(EVENT_TYPE_LABEL).toMatchObject({
      party: "Party",
      meeting: "Meeting",
      birthday: "Birthday",
      other: "Other",
    });
  });
});

describe("search_guide tool execute", () => {
  it("returns guide content for a known query", async () => {
    const tool = toolByName("search_guide")!;
    const out = await tool.execute({} as never, { query: "forgot password" });
    expect(out).toContain("Create Your Account");
  });

  it("asks for a query when none is provided", async () => {
    const tool = toolByName("search_guide")!;
    const out = await tool.execute({} as never, {});
    expect(out).toContain("Please provide a query");
  });
});

describe("userConfirmed", () => {
  it("returns false when there are no user messages", () => {
    expect(userConfirmed([])).toBe(false);
    expect(userConfirmed([{ role: "assistant", content: "hi" }])).toBe(false);
  });

  it("returns true for explicit consent in the latest user message", () => {
    const confirmed = [
      "yes",
      "yeah go ahead",
      "ok please create it",
      "sure, proceed",
      "please do",
      "confirmed, send it",
    ];
    for (const content of confirmed) {
      expect(userConfirmed([{ role: "user", content }]), content).toBe(true);
    }
  });

  it("returns false when the latest user message is not consent", () => {
    const notConfirmed = [
      "what does that do?",
      "can you explain first",
      "tell me more",
      "maybe later",
    ];
    for (const content of notConfirmed) {
      expect(userConfirmed([{ role: "user", content }]), content).toBe(false);
    }
  });

  it("only inspects the last user message", () => {
    const messages: ChatMessageLite[] = [
      { role: "user", content: "yes" },
      { role: "assistant", content: "ok doing it now" },
      { role: "user", content: "wait, actually tell me more" },
    ];
    expect(userConfirmed(messages)).toBe(false);
  });
});
