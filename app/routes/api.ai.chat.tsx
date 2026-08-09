import { runAgent, type AgentEvent } from "~/.server/ai/agent";
import { getUpcomingBirthdays } from "~/.server/actions/dashboard";
import { getUpcomingEvents } from "~/.server/actions/event-data";
import Payment from "~/.server/models/payment";
import { auth } from "~/.server/services/better-auth";
import { checkRateLimit } from "~/.server/utils/rate-limit";
import type { Route } from "./+types/api.ai.chat";

const CURRENT_MONTH_KEY = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export interface AiSuggestion {
  id: string;
  label: string;
  prompt: string;
}

const unwrapBody = async <T,>(
  res: Response,
): Promise<T | null> => {
  try {
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.body ?? null) as T | null;
  } catch {
    return null;
  }
};

/**
 * Lightweight proactive context: when the authenticated user opens the chat we
 * surface a few dismissible suggestion chips computed from live data — unpaid
 * monthly dues, birthdays in the next week, upcoming events.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ suggestions: [] });
  }
  const userId = session.user.id;

  const suggestions: AiSuggestion[] = [];

  try {
    const monthKey = CURRENT_MONTH_KEY();
    const paid = await Payment.exists({
      userId,
      paymentType: "membership_dues",
      monthKey,
      paymentStatus: "completed",
    });
    if (!paid) {
      suggestions.push({
        id: "dues",
        label: "Check your monthly dues",
        prompt: "Did I pay my membership dues this month?",
      });
    }
  } catch {}

  try {
    const birthdays = await getUpcomingBirthdays();
    if (birthdays.some((b) => b !== null && b.daysUntil <= 7)) {
      suggestions.push({
        id: "birthdays",
        label: "Birthdays in the next week",
        prompt: "Who has birthdays coming up?",
      });
    }
  } catch {}

  try {
    const events = await unwrapBody<
      Array<{ _id: string; title: string }>
    >(await getUpcomingEvents(request));
    if (events && events.length > 0) {
      suggestions.push({
        id: "events",
        label: "See upcoming events",
        prompt: "What events are coming up?",
      });
    }
  } catch {}

  return Response.json({ suggestions: suggestions.slice(0, 3) });
}

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return Response.json({ message: "Method not allowed" }, { status: 405 });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  await checkRateLimit(request, "strict");

  let payload: { messages?: unknown };
  try {
    payload = (await request.json()) as { messages?: unknown };
  } catch {
    return Response.json(
      { success: false, message: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const messages = Array.isArray(payload.messages)
    ? payload.messages.filter(
        (m: unknown) =>
          typeof m === "object" &&
          m !== null &&
          (m as { role?: unknown }).role &&
          typeof (m as { content?: unknown }).content === "string",
      )
    : [];
  if (messages.length === 0) {
    return Response.json(
      { success: false, message: "No messages provided" },
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: AgentEvent) => {
        controller.enqueue(
          encoder.encode(
            `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`,
          ),
        );
      };
      try {
        await runAgent(
          {
            request,
            messages,
            userId: session?.user.id ?? "",
            role: session?.user.role ?? "guest",
            userName: session?.user.name ?? "there",
            isAuthenticated: Boolean(session),
          },
          emit,
        );
      } catch (error) {
        emit({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "The AI assistant is unavailable.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
