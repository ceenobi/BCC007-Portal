import {
    RiArrowRightLine,
    RiChatSmile3Line,
    RiCloseLine,
    RiLoader2Line,
    RiRobot3Line,
    RiUserLine,
} from "@remixicon/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMatches } from "react-router";
import {
    AiChatProvider,
    useAiChat,
    type AiSuggestion,
} from "~/components/ai/chat-context";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type { SessionUser } from "~/types.d";

const BRAND_ACCENT = "bg-mainBlue text-white";
const BRAND_ACCENT_SOFT = "bg-lightBlue/10 text-mainBlue";

export function AiAssistant() {
  const matches = useMatches();

  const user = useMemo<SessionUser | null>(() => {
    for (const match of matches) {
      const data = match.loaderData as { user?: SessionUser | null } | undefined;
      if (data?.user?._id) return data.user;
    }
    return null;
  }, [matches]);

  return (
    <AiChatProvider userId={user?._id ?? null}>
      <ChatWidget />
    </AiChatProvider>
  );
}

function ChatWidget() {
  const {
    messages,
    isOpen,
    isStreaming,
    suggestions,
    toolStatus,
    error,
    toggleChat,
    closeChat,
    sendMessage,
    clearChat,
  } = useAiChat();

  const listRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, toolStatus, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeChat();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, closeChat]);

  const submit = async (content: string) => {
    if (!content.trim() || isStreaming) return;
    setDraft("");
    await sendMessage(content);
  };

  const onSend = (e: React.SubmitEvent<HTMLFormElement>) => {
    e?.preventDefault();
    void submit(draft);
  };

  return (
    <>
      <Button
        type="button"
        variant="default"
        size="icon"
        aria-label={isOpen ? "Close AI assistant" : "Open AI assistant"}
        onClick={toggleChat}
        className={cn(
          "fixed bottom-4 right-4 z-40 size-12 rounded-full shadow-lg transition-transform md:bottom-6 md:right-6",
          BRAND_ACCENT,
        )}
      >
        {isOpen ? (
          <RiCloseLine className="size-5" />
        ) : (
          <RiRobot3Line className="size-5" />
        )}
      </Button>

      {isOpen && (
        <div className="fixed bottom-20 right-4 z-40 flex h-[min(38rem,calc(100svh-7rem))] w-[min(26rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl md:bottom-24 md:right-6">
          <header className="flex items-center gap-3 border-b px-4 py-3">
            <span
              className={cn(
                "flex size-9 items-center justify-center rounded-full",
                BRAND_ACCENT_SOFT,
              )}
            >
              <RiChatSmile3Line className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-grotesk text-sm font-semibold leading-tight">
                BCC007 Assistant
              </p>
              <p className="truncate text-xs text-muted-foreground">
                Ask me anything about your account, payments or events.
              </p>
            </div>
            <Badge
              variant="secondary"
              title="This feature is in beta"
              className="rounded-full"
            >
              Beta
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Clear conversation"
              disabled={isStreaming || messages.length === 0}
              onClick={clearChat}
              className="text-muted-foreground"
            >
              <RiCloseLine className="size-4" />
            </Button>
          </header>

          <div
            ref={listRef}
            className="flex-1 space-y-3 overflow-y-auto px-3 py-4"
          >
            {messages.length === 0 && !suggestions.length && (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <span
                  className={cn(
                    "flex size-12 items-center justify-center rounded-full",
                    BRAND_ACCENT_SOFT,
                  )}
                >
                  <RiRobot3Line className="size-6" />
                </span>
                <p className="text-sm font-medium text-foreground">
                  Hi, I&apos;m your BCC007 assistant.
                </p>
                <p className="max-w-55 text-xs text-muted-foreground">
                  I can look up your profile, check payment status, find
                  events, and more — all in plain language.
                </p>
              </div>
            )}

            {messages.map((message) => {
              const isUser = message.role === "user";
              const isPending =
                message.role === "assistant" &&
                isStreaming &&
                message.id === messages[messages.length - 1]?.id;
              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex items-end gap-2",
                    isUser ? "flex-row-reverse" : "flex-row",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full text-[10px]",
                      isUser ? BRAND_ACCENT : "bg-muted text-muted-foreground",
                    )}
                  >
                    {isUser ? <RiUserLine className="size-3.5" /> : "AI"}
                  </span>
                  <div
                    className={cn(
                      "max-w-[85%] whitespace-pre-wrap wrap-break-word rounded-xl px-3 py-2 text-sm leading-relaxed",
                      isUser
                        ? "rounded-br-sm bg-primary text-primary-foreground"
                        : cn(
                            "rounded-bl-sm bg-muted text-foreground",
                            isPending && "min-h-6",
                          ),
                    )}
                  >
                    {message.content || (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <RiLoader2Line className="size-3.5 animate-spin" />
                        Thinking…
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {toolStatus && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full",
                    BRAND_ACCENT_SOFT,
                  )}
                >
                  <RiLoader2Line className="size-3 animate-spin" />
                </span>
                <span className="capitalize">{toolStatus.name}</span>
              </div>
            )}

            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}
          </div>

          {suggestions.length > 0 && messages.length === 0 && (
            <div className="flex flex-wrap gap-1.5 border-t px-3 py-2.5">
              {suggestions.map((suggestion: AiSuggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  disabled={isStreaming}
                  onClick={() => void submit(suggestion.prompt)}
                  className={cn(
                    "rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-ring hover:text-foreground disabled:opacity-50",
                  )}
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={onSend} className="flex items-end gap-2 border-t p-3">
            <textarea
              value={draft}
              rows={1}
              placeholder="Ask about your account, payments, events…"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submit(draft);
                }
              }}
              className="field-sizing-content max-h-32 min-h-9 flex-1 resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
            />
            <Button
              type="submit"
              variant="default"
              size="icon"
              aria-label="Send message"
              disabled={isStreaming || !draft.trim()}
              className={cn("size-9 shrink-0 rounded-full", BRAND_ACCENT)}
            >
              {isStreaming ? (
                <RiLoader2Line className="size-4 animate-spin" />
              ) : (
                <RiArrowRightLine className="size-4" />
              )}
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
