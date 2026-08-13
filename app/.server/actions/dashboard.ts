import mongoose from "mongoose";
import z from "zod";
import { hasPermission } from "~/lib/rbac";
import { sendBirthdayReminderSchema } from "~/lib/schema";
import { tryCatchWrapper } from "~/lib/tryCatchWrapper";
import { env } from "../config/keys";
import logger from "../config/logger";
import Announcement from "../models/announcement";
import Notification from "../models/notification";
import Ticket from "../models/ticket";
import User from "../models/user";
import { AuditLogService } from "../services/auditlog-service";
import { auth } from "../services/better-auth";
import { checkRateLimit } from "../utils/rate-limit";
import { fetchWithCache } from "../utils/cache";
import { workflowClient } from "../workflows/client";
import { fetchAllAuditLogs, fetchUserAuditLogs } from "./audit-logs";
import { getUpcomingEvents } from "./event-data";
import {
  getGroupPaymentReports,
  getUserPaymentReports,
} from "./payment";
import { fetchTickets } from "./ticket";
import { getAvailableBalance } from "./transfer";

const UPCOMING_BIRTHDAY_WINDOW_DAYS = 14;
const UPCOMING_BIRTHDAYS_LIMIT = 7;

const startOfTodayUTC = (now: Date = new Date()) =>
  Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

const isLeapYear = (year: number) =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

/**
 * Computes the next upcoming birthday for a member, honoring the Feb 29 →
 * Feb 28 convention in non-leap years. Returns the target Date (UTC), days
 * until it occurs, and the age the member turns.
 */
function computeNextBirthday(dateOfBirth: Date, now: Date = new Date()) {
  const birth = new Date(dateOfBirth);
  const birthMonth = birth.getUTCMonth();
  let birthDay = birth.getUTCDate();
  const isLeapDay = birthMonth === 1 && birthDay === 29;

  const dayInYear = (year: number) =>
    isLeapDay && !isLeapYear(year) ? 28 : birthDay;

  let year = now.getUTCFullYear();
  let next = new Date(Date.UTC(year, birthMonth, dayInYear(year)));
  if (next.getTime() < startOfTodayUTC(now)) {
    year += 1;
    next = new Date(Date.UTC(year, birthMonth, dayInYear(year)));
  }

  const daysUntil = Math.round(
    (next.getTime() - startOfTodayUTC(now)) / 86400000,
  );
  return {
    nextBirthday: next.toISOString(),
    daysUntil,
    ageAtNext: year - birth.getUTCFullYear(),
  };
}

export function getUpcomingBirthdays() {
  return User.find({
    isOnboarded: true,
    dateOfBirth: { $ne: null },
    disableBirthDate: false,
  })
    .select("_id name image dateOfBirth")
    .lean()
    .then((docs) =>
      docs
        .map((doc) => {
          const birth = new Date(doc.dateOfBirth);
          if (Number.isNaN(birth.getTime())) return null;
          return {
            _id: doc._id.toString(),
            name: doc.name,
            image: doc.image,
            ...computeNextBirthday(birth),
          };
        })
        .filter(
          (b) =>
            b !== null &&
            b.daysUntil >= 0 &&
            b.daysUntil <= UPCOMING_BIRTHDAY_WINDOW_DAYS,
        )
        .sort((a, b) => a!.daysUntil - b!.daysUntil)
        .slice(0, UPCOMING_BIRTHDAYS_LIMIT),
    );
}

const unwrap = async <T>(res: Response): Promise<T | null> => {
  try {
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.body ?? null) as T | null;
  } catch (error) {
    logger.error(error, "Dashboard sub-fetch failed");
    return null;
  }
};

export async function getDashboardData(request: Request) {
  return tryCatchWrapper(async () => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      logger.error("Unauthorized");
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }
    const { id: userId, role } = session.user;

    const isPayAdmin = hasPermission(role, "MANAGE_PAYMENTS");
    const isTransferAdmin = hasPermission(role, "MANAGE_TRANSFERS");
    const isMemberAdmin = hasPermission(role, "MANAGE_MEMBERS");
    const isSupportAdmin = hasPermission(role, "MANAGE_TICKETS");
    const isAdmin = role === "admin" || role === "super_admin";

    const [userPayments1m, userPaymentsAll, groupPayments1m, groupPaymentsAll, upcomingEvents, balance, orgTickets, membersCount, activityLogs, birthdays, latestAnnouncement] =
      await Promise.all([
        getUserPaymentReports({
          request,
          period: "1m",
          paymentStatus: undefined,
          paymentType: undefined,
        }).then((res) => unwrap<any>(res)),
        getUserPaymentReports({
          request,
          period: "all",
          paymentStatus: undefined,
          paymentType: undefined,
        }).then((res) => unwrap<any>(res)),
        isPayAdmin
          ? getGroupPaymentReports({
              request,
              period: "1m",
              paymentStatus: undefined,
              paymentType: undefined,
            }).then((res) => unwrap<any>(res))
          : Promise.resolve(null),
        isPayAdmin
          ? getGroupPaymentReports({
              request,
              period: "all",
              paymentStatus: undefined,
              paymentType: undefined,
            }).then((res) => unwrap<any>(res))
          : Promise.resolve(null),
        getUpcomingEvents(request).then((res) => unwrap<any[]>(res)),
        isTransferAdmin
          ? getAvailableBalance(request).then((res) => unwrap<any>(res))
          : Promise.resolve(null),
        isSupportAdmin
          ? fetchTickets({
              request,
              page: 1,
              limit: 5,
              query: undefined,
              status: undefined,
              priority: undefined,
              category: undefined,
            }).then((res) => unwrap<any>(res))
          : Promise.resolve(null),
        isMemberAdmin
          ? User.countDocuments({ isOnboarded: true })
          : Promise.resolve(0),
        isAdmin
          ? fetchAllAuditLogs({ request, page: 1, limit: 8 }).then((res) =>
              unwrap<any>(res),
            )
          : fetchUserAuditLogs({ request, page: 1, limit: 8 }).then((res) =>
              unwrap<any>(res),
            ),
        getUpcomingBirthdays(),
        fetchWithCache("dashboard:latest-announcement", 300, async () =>
          Announcement.findOne({ status: "published" })
            .sort({ publishedAt: -1, createdAt: -1 })
            .select("title content status isPinned featuredImage featuredImageId publishedAt createdAt")
            .lean(),
        ),
      ]);

    // Member's own support snapshot (avoids exposing org-wide ticket data to
    // members through the under-scoped fetchTickets action).
    let myTickets = null;
    if (!isSupportAdmin) {
      const [stats] = await Ticket.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: null,
            totalTickets: { $sum: 1 },
            openTickets: { $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] } },
            inProgressTickets: {
              $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] },
            },
            resolvedTickets: {
              $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] },
            },
            closedTickets: {
              $sum: { $cond: [{ $eq: ["$status", "closed"] }, 1, 0] },
            },
          },
        },
      ]);
      myTickets = {
        total: stats?.totalTickets ?? 0,
        open: stats?.openTickets ?? 0,
        inProgress: stats?.inProgressTickets ?? 0,
        resolved: stats?.resolvedTickets ?? 0,
        closed: stats?.closedTickets ?? 0,
      };
    }

    const body = {
      // Revenue scope: group reports for payment admins, personal otherwise.
      revenue1m: groupPayments1m ?? userPayments1m,
      revenueAll: groupPaymentsAll ?? userPaymentsAll,
      upcomingEvents: (upcomingEvents ?? []).slice(0, 5),
      balance,
      orgTickets,
      myTickets,
      membersCount: isMemberAdmin ? membersCount : null,
      recentActivity: activityLogs?.logs ?? [],
      upcomingBirthdays: birthdays ?? [],
      latestAnnouncement: latestAnnouncement ?? null,
    };

    return Response.json({
      success: true,
      message: "Dashboard data fetched successfully",
      body,
    });
  });
}

export async function sendBirthdayReminder(
  request: Request,
  payload: unknown,
) {
  return tryCatchWrapper(async () => {
    await checkRateLimit(request, "strict");
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      logger.error("Unauthorized");
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }
    if (!hasPermission(session.user.role, "MANAGE_MEMBERS")) {
      logger.error("Forbidden");
      return Response.json(
        { success: false, message: "Forbidden" },
        { status: 403 },
      );
    }

    const result = sendBirthdayReminderSchema.safeParse(payload);
    if (!result.success) {
      return Response.json(
        {
          success: false,
          message: "Invalid data",
          errors: z.treeifyError(result.error),
        },
        { status: 400 },
      );
    }
    const { userId } = result.data;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return Response.json(
        { success: false, message: "Invalid user id" },
        { status: 400 },
      );
    }

    const user = await User.findById(userId)
      .select("name email image dateOfBirth disableBirthDate disableEmail")
      .lean();
    if (!user) {
      return Response.json(
        { success: false, message: "Member not found" },
        { status: 404 },
      );
    }
    if (!user.dateOfBirth || user.disableBirthDate) {
      return Response.json(
        {
          success: false,
          message: "This member's birthday is not visible",
        },
        { status: 400 },
      );
    }

    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const alreadyNotified = await Notification.exists({
      userId,
      type: "birthday_reminder",
      createdAt: { $gte: startOfDay },
    });
    if (alreadyNotified) {
      return Response.json(
        {
          success: false,
          message: "Birthday reminder already sent to this member today",
        },
        { status: 400 },
      );
    }

    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const { ageAtNext } = computeNextBirthday(new Date(user.dateOfBirth), now);

    // Deterministic workflowRunId makes a manual Remind and the scheduled
    // sweep mutually exclusive — QStash dedupes the second one.
    const res = (await workflowClient.trigger({
      url: `${env.clientUrl}/api/v1/workflow/birthday-reminder`,
      workflowRunId: `birthday-reminder:${userId}:${todayKey}`,
      body: {
        user: {
          _id: userId,
          name: user.name,
          email: user.email,
          disableEmail: user.disableEmail,
        },
        age: ageAtNext,
      },
    })) as { workflowRunId: string; deduplicated?: boolean };

    if (res?.deduplicated) {
      return Response.json(
        {
          success: false,
          message: "Birthday reminder already sent to this member today",
        },
        { status: 400 },
      );
    }

    await AuditLogService.record(request, {
      action: "BIRTHDAY_REMINDER",
      category: "settings",
      description: `Sent a birthday reminder to ${user.name}`,
      details: { userId },
    });

    return Response.json({
      success: true,
      message: "Birthday reminder sent",
      body: { userId, age: ageAtNext },
    });
  });
}
