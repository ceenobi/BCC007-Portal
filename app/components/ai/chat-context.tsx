import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { loadChat, saveChat, type ChatMessage } from "~/lib/ai/storage";

export interface AiSuggestion {
  id: string;
  label: string;
  prompt: string;
}

interface ToolStatus {
  name: string;
  status: "running" | "done" | "awaiting-confirmation" | "error";
}

interface AiChatContextValue {
  messages: ChatMessage[];
  isOpen: boolean;
  isStreaming: boolean;
  suggestions: AiSuggestion[];
  toolStatus: ToolStatus | null;
  error: string | null;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
  retry: () => void;
}

const AiChatContext = createContext<AiChatContextValue | null>(null);

export function useAiChat(): AiChatContextValue {
  const context = useContext(AiChatContext);
  if (!context) throw new Error("useAiChat must be used within <AiChatProvider>");
  return context;
}

const MAX_SENT_MESSAGES = 40;

function parseSse(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  handlers: Record<string, (data: unknown) => void>,
) {
  const decoder = new TextDecoder();
  let buffer = "";

  return (async () => {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let separator: number;
      while ((separator = buffer.indexOf("\n\n")) !== -1) {
        const raw = buffer.slice(0, separator);
        buffer = buffer.slice(separator + 2);
        let event = "message";
        let data = "";
        for (const line of raw.split("\n")) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:")) data += line.slice(5).trim();
        }
        if (data) {
          try {
            handlers[event]?.(JSON.parse(data));
          } catch {
            // Ignore malformed event.
          }
        }
      }
    }
  })();
}

export function AiChatProvider({
  children,
  userId,
}: {
  children: ReactNode;
  userId: string | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    loadChat(userId),
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [toolStatus, setToolStatus] = useState<ToolStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const messagesRef = useRef<ChatMessage[]>(messages);
  const abortRef = useRef<AbortController | null>(null);

  const commit = useCallback(
    (next: ChatMessage[], persist = false) => {
      // Always hand React a fresh array reference so streaming deltas re-render.
      const snapshot = [...next];
      messagesRef.current = snapshot;
      setMessages(snapshot);
      if (persist) saveChat(userId, snapshot);
    },
    [userId],
  );

  // Reset conversation + fetch proactive suggestions when the signed-in user changes.
  useEffect(() => {
    const initial = loadChat(userId);
    setMessages(initial);
    messagesRef.current = initial;
    setError(null);
    setToolStatus(null);

    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/ai/chat", { signal: controller.signal });
        const data = (await res.json()) as { suggestions?: AiSuggestion[] };
        setSuggestions(data?.suggestions ?? []);
      } catch {
        setSuggestions([]);
      }
    })();
    return () => controller.abort();
  }, [userId]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const openChat = useCallback(() => {
    setIsOpen(true);
    setSuggestions([]);
  }, []);
  const closeChat = useCallback(() => setIsOpen(false), []);
  const toggleChat = useCallback(() => setIsOpen((v) => !v), []);

  const clearChat = useCallback(() => {
    abortRef.current?.abort();
    commit([], true);
    setToolStatus(null);
    setError(null);
  }, [commit]);

  const sendMessage = useCallback(
    async (raw: string) => {
      const content = raw.trim();
      if (!content || isStreaming) return;

      const history = [...messagesRef.current];
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      };
      history.push(userMsg);
      commit(history, true);

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
      };
      history.push(assistantMsg);
      commit(history);

      setError(null);
      setToolStatus(null);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current?.abort();
      abortRef.current = controller;

      const toSend = history.slice(-MAX_SENT_MESSAGES).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const finalize = (persist = false) => {
        commit(history, persist);
        setIsStreaming(false);
        setToolStatus(null);
      };

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: toSend }),
          signal: controller.signal,
        });
        if (!res.ok) {
          let message = "The AI assistant is unavailable. Please try again.";
          try {
            const errBody = (await res.json()) as {
              message?: string;
              body?: { message?: string };
            };
            message = errBody?.message ?? errBody?.body?.message ?? message;
          } catch {
            // Fall back to the generic message.
          }
          setError(message);
          finalize(true);
          return;
        }
        if (!res.body) throw new Error("No response stream available");

        await parseSse(res.body.getReader(), {
          text: (data) => {
            const delta = (data as { delta?: string })?.delta ?? "";
            if (!delta) return;
            assistantMsg.content += delta;
            commit(history);
          },
          tool: (data) => {
            const t = data as Partial<ToolStatus>;
            if (t.name) {
              setToolStatus({ name: t.name, status: t.status ?? "running" });
            }
          },
          done: () => finalize(true),
          error: (data) => {
            const message =
              (data as { message?: string })?.message ??
              "The AI assistant hit an error. Please try again.";
            setError(message);
            finalize(true);
          },
        });
        // Stream ended without a terminal event (e.g. connection closed).
        if (isStreaming) finalize(true);
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        setError("Could not reach the AI assistant. Please try again.");
        finalize(true);
      }
    },
    [commit, isStreaming],
  );

  const retry = useCallback(() => {
    const last = [...messagesRef.current].reverse().find((m) => m.role === "user");
    if (!last) return;
    void sendMessage(last.content);
  }, [sendMessage]);

  const value = useMemo<AiChatContextValue>(
    () => ({
      messages,
      isOpen,
      isStreaming,
      suggestions,
      toolStatus,
      error,
      openChat,
      closeChat,
      toggleChat,
      sendMessage,
      clearChat,
      retry,
    }),
    [
      messages,
      isOpen,
      isStreaming,
      suggestions,
      toolStatus,
      error,
      openChat,
      closeChat,
      toggleChat,
      sendMessage,
      clearChat,
      retry,
    ],
  );

  return (
    <AiChatContext.Provider value={value}>{children}</AiChatContext.Provider>
  );
}
