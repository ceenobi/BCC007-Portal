export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

const KEY_PREFIX = "bcc007:ai-chat";

export function chatStorageKey(userId?: string | null): string {
  return userId ? `${KEY_PREFIX}:${userId}` : `${KEY_PREFIX}:guest`;
}

export function loadChat(userId?: string | null): ChatMessage[] {
  try {
    const raw = localStorage.getItem(chatStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveChat(
  userId: string | null | undefined,
  messages: ChatMessage[],
): void {
  try {
    if (messages.length === 0) {
      localStorage.removeItem(chatStorageKey(userId));
    } else {
      localStorage.setItem(chatStorageKey(userId), JSON.stringify(messages));
    }
  } catch {
    // Storage unavailable (private mode / quota) — chat still works in-memory.
  }
}

/**
 * Clears every AI chat history bucket. Called on logout so a shared device
 * never hands the next signed-in member a previous member's conversation.
 */
export function clearAiChatHistory(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(KEY_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Ignore storage failures.
  }
}
