import { hasPermission } from "~/lib/rbac";
import { tryCatchWrapper } from "~/lib/tryCatchWrapper";
import { escapeRegex } from "~/lib/utils";
import type {
  GlobalSearchResponse,
  GlobalSearchResult,
  GlobalSearchResultType,
  GlobalSearchSection,
} from "~/types";
import logger from "../config/logger";
import AuditLog from "../models/auditlog";
import Event from "../models/event";
import Payment from "../models/payment";
import Ticket from "../models/ticket";
import Transfer from "../models/transfer";
import User from "../models/user";
import { auth } from "../services/better-auth";
import { fetchWithCache } from "../utils/cache";
import { checkRateLimit } from "../utils/rate-limit";

const RESULTS_PER_TYPE = 5;

const SECTION_META: Record<
  GlobalSearchResultType,
  { label: string; viewAllHref: (query: string) => string }
> = {
  member: {
    label: "Members",
    viewAllHref: (query) => `/dashboard/members?query=${encodeURIComponent(query)}`,
  },
  event: {
    label: "Events",
    viewAllHref: (query) => `/dashboard/events?query=${encodeURIComponent(query)}`,
  },
  payment: {
    label: "Payments",
    viewAllHref: (query) => `/dashboard/payments?query=${encodeURIComponent(query)}`,
  },
  transfer: {
    label: "Transfers",
    viewAllHref: (query) => `/dashboard/transfers?query=${encodeURIComponent(query)}`,
  },
  ticket: {
    label: "Tickets",
    viewAllHref: (query) => `/dashboard/help-center?query=${encodeURIComponent(query)}`,
  },
  audit: {
    label: "Activity",
    viewAllHref: () => "/dashboard/settings/audit",
  },
};

function toSection(
  type: GlobalSearchResultType,
  query: string,
  results: GlobalSearchResult[],
): GlobalSearchSection | null {
  if (results.length === 0) return null;
  return {
    type,
    label: SECTION_META[type].label,
    viewAllHref: SECTION_META[type].viewAllHref(query),
    results,
  };
}

export async function globalSearch(
  request: Request,
  payload: { query: string },
) {
  return tryCatchWrapper(async () => {
    await checkRateLimit(request, "general");
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (!session) {
      logger.error("Unauthorized");
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }
    const query = (payload?.query ?? "").trim();
    if (query.length < 2) {
      return Response.json({
        success: true,
        message: "Query too short",
        body: { query, sections: [] } satisfies GlobalSearchResponse,
      });
    }

    const { id: userId } = session.user;
    const role = session.user.role;
    const cacheKey = `global-search:${role}:${userId}:${query.toLowerCase()}`;

    const body = await fetchWithCache<GlobalSearchResponse>(cacheKey, 60, () =>
      buildSections({ query, role, userId }),
    );

    return Response.json({
      success: true,
      message: "Search completed",
      body,
    });
  });
}

async function buildSections({
  query,
  role,
  userId,
}: {
  query: string;
  role: string;
  userId: string;
}): Promise<GlobalSearchResponse> {
  const escaped = escapeRegex(query);
  const regex = { $regex: escaped, $options: "i" } as const;

  const memberIds = await User.find({ name: regex })
    .select("_id")
    .lean()
    .then((users) => users.map((user) => user._id));

  const sections = await Promise.all([
    buildMembersSection({ regex, query }),
    buildEventsSection({ regex, memberIds, query }),
    buildPaymentsSection({ regex, memberIds, role, userId, query }),
    buildTransfersSection({ regex, memberIds, role, query }),
    buildTicketsSection({ regex, role, userId, query }),
    buildAuditSection({ regex, role, userId, query }),
  ]);

  return {
    query,
    sections: sections.filter((section): section is GlobalSearchSection => section !== null),
  };
}

async function buildMembersSection({
  regex,
  query,
}: {
  regex: { $regex: string; $options: string };
  query: string;
}): Promise<GlobalSearchSection | null> {
  const members = await User.find({ $or: [{ name: regex }, { email: regex }] })
    .select("_id name email role")
    .sort({ createdAt: -1 })
    .limit(RESULTS_PER_TYPE)
    .lean();
  return toSection(
    "member",
    query,
    members.map((member) => ({
      id: member._id.toString(),
      title: member.name,
      subtitle: member.email,
      meta: member.role,
      href: `/dashboard/members?query=${encodeURIComponent(member.name)}`,
    })),
  );
}

async function buildEventsSection({
  regex,
  memberIds,
  query,
}: {
  regex: { $regex: string; $options: string };
  memberIds: unknown[];
  query: string;
}): Promise<GlobalSearchSection | null> {
  const events = await Event.find({
    $or: [
      { title: regex },
      { location: regex },
      { detail: regex },
      { organizer: { $in: memberIds } },
    ],
  })
    .populate("organizer", "name image")
    .select("_id title location status date organizer")
    .sort({ date: -1 })
    .limit(RESULTS_PER_TYPE)
    .lean();
  return toSection(
    "event",
    query,
    events.map((event: any) => ({
      id: event._id.toString(),
      title: event.title,
      subtitle: event.location,
      meta: event.status,
      href: `/dashboard/events/${event._id.toString()}`,
    })),
  );
}

async function buildPaymentsSection({
  regex,
  memberIds,
  role,
  userId,
  query,
}: {
  regex: { $regex: string; $options: string };
  memberIds: unknown[];
  role: string;
  userId: string;
  query: string;
}): Promise<GlobalSearchSection | null> {
  const canViewGroup = hasPermission(role, "MANAGE_PAYMENTS");
  const matchStage: Record<string, any> = canViewGroup
    ? {}
    : { userId };
  matchStage.$or = [
    { reference: regex },
    { note: regex },
    ...(canViewGroup && memberIds.length > 0
      ? [{ userId: { $in: memberIds } }]
      : []),
  ];

  const payments = await Payment.find(matchStage)
    .populate("userId", "name email image")
    .select("_id reference amount paymentStatus paymentType note userId")
    .sort({ createdAt: -1 })
    .limit(RESULTS_PER_TYPE)
    .lean();
  return toSection(
    "payment",
    query,
    payments.map((payment: any) => ({
      id: payment._id.toString(),
      title: payment.reference,
      subtitle: `${payment.userId?.name ?? "Member"} · ₦${payment.amount} · ${payment.paymentType.replace("_", " ")}`,
      meta: payment.paymentStatus,
      href: `/dashboard/payments/${payment._id.toString()}`,
    })),
  );
}

async function buildTransfersSection({
  regex,
  memberIds,
  role,
  query,
}: {
  regex: { $regex: string; $options: string };
  memberIds: unknown[];
  role: string;
  query: string;
}): Promise<GlobalSearchSection | null> {
  if (!hasPermission(role, "MANAGE_TRANSFERS")) return null;
  const matchStage: Record<string, any> = {
    $or: [
      { reference: regex },
      { reason: regex },
      ...(memberIds.length > 0 ? [{ userId: { $in: memberIds } }] : []),
    ],
  };
  const transfers = await Transfer.find(matchStage)
    .populate("userId", "name email image")
    .select("_id reference amount status reason userId")
    .sort({ createdAt: -1 })
    .limit(RESULTS_PER_TYPE)
    .lean();
  return toSection(
    "transfer",
    query,
    transfers.map((transfer: any) => ({
      id: transfer._id.toString(),
      title: transfer.reference,
      subtitle: `${transfer.userId?.name ?? "Member"} · ₦${transfer.amount}`,
      meta: transfer.status,
      href: `/dashboard/transfers/${transfer._id.toString()}`,
    })),
  );
}

async function buildTicketsSection({
  regex,
  role,
  userId,
  query,
}: {
  regex: { $regex: string; $options: string };
  role: string;
  userId: string;
  query: string;
}): Promise<GlobalSearchSection | null> {
  const canViewAll = hasPermission(role, "MANAGE_TICKETS");
  const matchStage: Record<string, any> = canViewAll ? {} : { userId };
  matchStage.$or = [{ title: regex }, { ticketId: regex }, { description: regex }];

  const tickets = await Ticket.find(matchStage)
    .populate("userId", "name email image")
    .select("_id title ticketId status category description userId")
    .sort({ createdAt: -1 })
    .limit(RESULTS_PER_TYPE)
    .lean();
  return toSection(
    "ticket",
    query,
    tickets.map((ticket: any) => ({
      id: ticket._id.toString(),
      title: `${ticket.ticketId} · ${ticket.title}`,
      subtitle: `${ticket.userId?.name ?? "Member"} · ${ticket.category}`,
      meta: ticket.status,
      href: `/dashboard/help-center?query=${encodeURIComponent(ticket.ticketId)}`,
    })),
  );
}

async function buildAuditSection({
  regex,
  role,
  userId,
  query,
}: {
  regex: { $regex: string; $options: string };
  role: string;
  userId: string;
  query: string;
}): Promise<GlobalSearchSection | null> {
  const canViewAll = hasPermission(role, "MANAGE_ROLES");
  const matchStage: Record<string, any> = canViewAll ? {} : { userId };
  matchStage.$or = [{ action: regex }, { description: regex }, { userName: regex }];

  const logs = await AuditLog.find(matchStage)
    .select("_id action description category status userName")
    .sort({ createdAt: -1 })
    .limit(RESULTS_PER_TYPE)
    .lean();
  return toSection(
    "audit",
    query,
    logs.map((log: any) => ({
      id: log._id.toString(),
      title: log.action,
      subtitle: log.description || log.userName,
      meta: log.category,
      href: "/dashboard/settings/audit",
    })),
  );
}
