import { formatMoney, formatPaymentDate } from "~/lib/utils";
import { createTicket } from "~/.server/actions/ticket";
import { getUpcomingEvents, toggleEventInterest } from "~/.server/actions/event-data";
import {
  getUpcomingBirthdays,
  sendBirthdayReminder,
} from "~/.server/actions/dashboard";
import { getUserPayments } from "~/.server/actions/payment";
import Payment from "~/.server/models/payment";
import Ticket from "~/.server/models/ticket";
import { formatGuideHits, searchGuide } from "./guide-retrieval";

export interface ChatMessageLite {
  role: "user" | "assistant";
  content: string;
}

export interface ToolExecutionContext {
  request: Request;
  userId: string;
  role: string;
  messages: ChatMessageLite[];
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  requireConfirmation?: boolean;
  execute: (
    ctx: ToolExecutionContext,
    args: Record<string, unknown>,
  ) => Promise<string>;
}

const unwrapBody = async <T>(res: Response): Promise<T | null> => {
  try {
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.body ?? null) as T | null;
  } catch {
    return null;
  }
};

const unwrapMessage = async (res: Response): Promise<string> => {
  try {
    const json = await res.json();
    return json?.message ?? "Request failed";
  } catch {
    return "Request failed";
  }
};

const CURRENT_MONTH_KEY = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const EVENT_TYPE_LABEL: Record<string, string> = {
  party: "Party",
  meeting: "Meeting",
  birthday: "Birthday",
  other: "Other",
};

export const tools: AgentTool[] = [
  {
    name: "get_upcoming_events",
    description:
      "Retrieve the list of upcoming events on the platform (title, date, time, location, type and organizer).",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    execute: async ({ request }) => {
      const events = await unwrapBody<
        Array<{
          _id: string;
          title: string;
          detail?: string;
          location?: string;
          date: Date;
          time?: string;
          eventType: string;
          organizer?: { name?: string } | null;
        }>
      >(await getUpcomingEvents(request));

      if (!events || events.length === 0) {
        return "There are no upcoming events right now.";
      }
      return events
        .map(
          (e, i) =>
            `${i + 1}. ${e.title} — ${formatPaymentDate(e.date)}${
              e.time ? ` at ${e.time}` : ""
            } (${EVENT_TYPE_LABEL[e.eventType] ?? e.eventType}) · ${
              e.location || "location TBA"
            } · organised by ${e.organizer?.name ?? "the community"}`,
        )
        .join("\n");
    },
  },
  {
    name: "mark_event_interest",
    description:
      "Toggle the user's interest in an upcoming event by its _id. Only call after the user has confirmed they want their interest to change.",
    parameters: {
      type: "object",
      properties: {
        eventId: {
          type: "string",
          description: "The _id of the event",
        },
      },
      required: ["eventId"],
      additionalProperties: false,
    },
    requireConfirmation: true,
    execute: async ({ request }, args) => {
      const eventId = String(args.eventId ?? "");
      if (!eventId) return "No event id provided.";
      const res = await toggleEventInterest(request, { eventId });
      const body = await unwrapBody<{ interested?: boolean }>(res);
      if (!body) {
        const message = await unwrapMessage(res);
        return `Could not update interest: ${message}`;
      }
      return body.interested
        ? "The member is now marked as interested in the event."
        : "Interest was removed from the event.";
    },
  },
  {
    name: "get_upcoming_birthdays",
    description:
      "Retrieve members with birthdays coming up in the next 14 days (name, days until, age they turn).",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    execute: async () => {
      const birthdays = await getUpcomingBirthdays();
      if (!birthdays || birthdays.length === 0) {
        return "No member birthdays in the next 14 days.";
      }
      return birthdays
        .filter((b): b is NonNullable<typeof b> => b !== null)
        .map(
          (b) =>
            `${b.name} — in ${b.daysUntil} day${b.daysUntil === 1 ? "" : "s"}${
              b.ageAtNext ? ` (turning ${b.ageAtNext})` : ""
            }`,
        )
        .join("\n");
    },
  },
  {
    name: "send_birthday_reminder",
    description:
      "Send a birthday reminder to a member by their user _id. Requires member-management permission. Only call after the user has confirmed.",
    parameters: {
      type: "object",
      properties: {
        userId: { type: "string", description: "The _id of the member" },
      },
      required: ["userId"],
      additionalProperties: false,
    },
    requireConfirmation: true,
    execute: async ({ request }, args) => {
      const res = await sendBirthdayReminder(request, {
        userId: String(args.userId ?? ""),
      });
      const message = await unwrapMessage(res);
      if (!res.ok) return `Could not send reminder: ${message}`;
      return message;
    },
  },
  {
    name: "get_payment_history",
    description:
      "Review the user's recent payment history (type, amount, status, date).",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Number of payments to return (default 10, max 20)",
        },
      },
      additionalProperties: false,
    },
    execute: async ({ request }, args) => {
      const limit = Math.min(Math.max(Number(args.limit) || 10, 1), 20);
      const res = await getUserPayments({
        request,
        page: 1,
        limit,
        query: undefined,
        paymentStatus: undefined,
        paymentType: undefined,
        startDate: undefined,
        endDate: undefined,
      });
      const body = await unwrapBody<{ payments: any[] }>(res);
      const payments = body?.payments ?? [];
      if (payments.length === 0) {
        return "No payments found.";
      }
      return payments
        .map(
          (p) =>
            `${formatPaymentDate(p.createdAt)} — ${String(
              p.paymentType ?? "payment",
            ).replace(/_/g, " ")} · ${formatMoney(p.amount)} · status: ${
              p.paymentStatus
            }${p.reference ? ` (${p.reference})` : ""}`,
        )
        .join("\n");
    },
  },
  {
    name: "check_monthly_payment",
    description:
      "Check whether the user has paid this month's membership dues, and report any pending payment.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    execute: async ({ userId, request }) => {
      const monthKey = CURRENT_MONTH_KEY();
      const current = await Payment.findOne({
        userId,
        paymentType: "membership_dues",
        monthKey,
      })
        .sort({ createdAt: -1 })
        .select("paymentStatus amount reference createdAt")
        .lean();

      if (current?.paymentStatus === "completed") {
        return `Paid for ${monthKey}. Payment of ${formatMoney(
          current.amount,
        )} was completed on ${formatPaymentDate(
          current.createdAt,
        )} (reference ${current.reference}).`;
      }
      if (current?.paymentStatus === "pending") {
        return `A ${monthKey} dues payment of ${formatMoney(
          current.amount,
        )} is still pending (reference ${current.reference}). The user should complete it.`;
      }
      return `No membership dues payment found for ${monthKey}. The user has not paid this month yet.`;
    },
  },
  {
    name: "create_ticket",
    description:
      "Create a support ticket with a title, description, category (account, payment, security or other) and priority (low, medium, high or critical). Only call after the user has confirmed the details.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        category: {
          type: "string",
          enum: ["account", "payment", "security", "other"],
        },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "critical"],
        },
      },
      required: ["title", "description", "category", "priority"],
      additionalProperties: false,
    },
    requireConfirmation: true,
    execute: async ({ request }, args) => {
      const res = await createTicket(request, {
        title: String(args.title ?? ""),
        description: String(args.description ?? ""),
        category: args.category as "account" | "payment" | "security" | "other",
        priority: args.priority as "low" | "medium" | "high" | "critical",
      });
      const message = await unwrapMessage(res);
      if (!res.ok) return `Could not create ticket: ${message}`;

      // Surface the generated ticket id for tracking.
      const session = await import("~/.server/services/better-auth").then((m) =>
        m.auth.api.getSession({ headers: request.headers }),
      );
      const latest = session
        ? await Ticket.findOne({ userId: session.user.id })
            .sort({ createdAt: -1 })
            .select("ticketId")
            .lean()
        : null;
      const tracking = latest ? ` (tracking id ${latest.ticketId})` : "";
      return `Ticket created successfully${tracking}.`;
    },
  },
  {
    name: "search_guide",
    description:
      "Search the support guide for step-by-step help on using the platform, then answer using the returned articles.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "What the user is asking about",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
    execute: async (_ctx, args) => {
      const query = String(args.query ?? "");
      if (!query) return "Please provide a query to search the guide.";
      return formatGuideHits(searchGuide(query, 3));
    },
  },
];

export const toolByName = (name: string): AgentTool | undefined =>
  tools.find((t) => t.name === name);

export const isSideEffectTool = (name: string): boolean =>
  Boolean(toolByName(name)?.requireConfirmation);

/**
 * Heuristic confirmation gate. Side-effecting tools only execute when the
 * user's latest message clearly expresses consent; otherwise the agent is
 * told to ask for confirmation instead of acting.
 */
export function userConfirmed(messages: ChatMessageLite[]): boolean {
  const last = [...messages].reverse().find((m) => m.role === "user");
  if (!last) return false;
  return /(^|\b)(yes|yeah|yep|yup|sure|ok|okay|confirm|proceed|go ahead|please do|do it|create it|send it|go on|fine|correct)\b/i.test(
    last.content,
  );
}

export { EVENT_TYPE_LABEL };
