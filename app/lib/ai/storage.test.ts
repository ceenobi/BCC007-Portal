import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { ChatMessage } from "~/lib/ai/storage";
import {
  chatStorageKey,
  clearAiChatHistory,
  loadChat,
  saveChat,
} from "~/lib/ai/storage";

function createLocalStorageMock() {
  const store = new Map<string, string>();
  const getItem = vi.fn((key: string) => store.get(key) ?? null);
  const setItem = vi.fn((key: string, value: string) => {
    store.set(key, value);
  });
  const removeItem = vi.fn((key: string) => {
    store.delete(key);
  });
  const key = vi.fn((i: number) => Array.from(store.keys())[i] ?? null);
  return {
    getItem,
    setItem,
    removeItem,
    key,
    get length() {
      return store.size;
    },
  };
}

const msg = (role: ChatMessage["role"], content: string): ChatMessage => ({
  id: "1",
  role,
  content,
  createdAt: "t",
});

describe("ai chat storage", () => {
  let mock: ReturnType<typeof createLocalStorageMock>;

  beforeEach(() => {
    mock = createLocalStorageMock();
    vi.stubGlobal("localStorage", mock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("chatStorageKey", () => {
    it("scopes keys by user id", () => {
      expect(chatStorageKey("user-1")).toBe("bcc007:ai-chat:user-1");
      expect(chatStorageKey("user-2")).toBe("bcc007:ai-chat:user-2");
    });

    it("uses a guest bucket when no user is provided", () => {
      expect(chatStorageKey(undefined)).toBe("bcc007:ai-chat:guest");
      expect(chatStorageKey(null)).toBe("bcc007:ai-chat:guest");
    });
  });

  describe("loadChat", () => {
    it("returns empty array when nothing is stored", () => {
      expect(loadChat("user-1")).toEqual([]);
    });

    it("parses stored messages", () => {
      const messages: ChatMessage[] = [
        msg("user", "hi"),
        msg("assistant", "hello"),
      ];
      localStorage.setItem("bcc007:ai-chat:user-1", JSON.stringify(messages));
      expect(loadChat("user-1")).toEqual(messages);
    });

    it("returns empty array for corrupt JSON", () => {
      localStorage.setItem("bcc007:ai-chat:user-1", "{not-json");
      expect(loadChat("user-1")).toEqual([]);
    });

    it("returns empty array when parsed value is not an array", () => {
      localStorage.setItem("bcc007:ai-chat:user-1", JSON.stringify({ a: 1 }));
      expect(loadChat("user-1")).toEqual([]);
    });

    it("does not leak another user's history", () => {
      localStorage.setItem(
        "bcc007:ai-chat:user-1",
        JSON.stringify([msg("user", "secret")]),
      );
      expect(loadChat("user-2")).toEqual([]);
    });
  });

  describe("saveChat", () => {
    it("persists messages", () => {
      const messages: ChatMessage[] = [msg("user", "hello")];
      saveChat("user-1", messages);
      expect(
        JSON.parse(localStorage.getItem("bcc007:ai-chat:user-1")!),
      ).toEqual(messages);
    });

    it("removes the key when the history is cleared", () => {
      saveChat("user-1", [msg("user", "x")]);
      saveChat("user-1", []);
      expect(localStorage.getItem("bcc007:ai-chat:user-1")).toBeNull();
    });

    it("tolerates storage failures", () => {
      mock.setItem.mockImplementation(() => {
        throw new Error("quota exceeded");
      });
      expect(() => saveChat("user-1", [msg("user", "x")])).not.toThrow();
    });
  });

  describe("clearAiChatHistory", () => {
    it("removes every prefixed bucket", () => {
      saveChat("user-1", [msg("user", "a")]);
      saveChat("user-2", [msg("user", "b")]);
      saveChat(null, [msg("user", "c")]);
      localStorage.setItem("unrelated-key", "keep");

      clearAiChatHistory();

      expect(localStorage.getItem("bcc007:ai-chat:user-1")).toBeNull();
      expect(localStorage.getItem("bcc007:ai-chat:user-2")).toBeNull();
      expect(localStorage.getItem("bcc007:ai-chat:guest")).toBeNull();
      expect(localStorage.getItem("unrelated-key")).toBe("keep");
    });

    it("tolerates storage failures", () => {
      mock.removeItem.mockImplementation(() => {
        throw new Error("denied");
      });
      expect(() => clearAiChatHistory()).not.toThrow();
    });
  });
});
