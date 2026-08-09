import mongoose from "mongoose";
import z from "zod";
import { createEventSchema, updateEventSchema } from "~/lib/schema";
import { tryCatchWrapper } from "~/lib/tryCatchWrapper";
import type {
    CreateEventSchemaType,
    UpdateEventSchemaType,
} from "~/types";
import { env } from "../config/keys";
import logger from "../config/logger";
import Event from "../models/event";
import User from "../models/user";
import { AuditLogService } from "../services/auditlog-service";
import { auth } from "../services/better-auth";
import { NotificationService } from "../services/notification.service";
import { fetchWithCache, invalidateCache } from "../utils/cache";
import { deleteFromCloudinary } from "../utils/cloudinary";
import { checkRateLimit } from "../utils/rate-limit";
import { workflowClient } from "../workflows/client";
import { hasPermission } from "~/lib/rbac";

const EVENT_STATUSES = [
  "upcoming",
  "ongoing",
  "completed",
  "cancelled",
] as const;
const EVENT_TYPES = ["party", "meeting", "birthday", "other"] as const;

const isDateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const toStartOfDay = (value: string) =>
  isDateOnly(value) ? new Date(`${value}T00:00:00.000Z`) : new Date(value);
const toEndOfDay = (value: string) =>
  isDateOnly(value) ? new Date(`${value}T23:59:59.999Z`) : new Date(value);

export async function createEvent(
  request: Request,
  payload: CreateEventSchemaType,
) {
  return tryCatchWrapper(async () => {
    await checkRateLimit(request, "strict");
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
    if (!hasPermission(session.user.role, "MANAGE_EVENTS")) {
      logger.error("Forbidden");
      return Response.json(
        {
          success: false,
          message:
            "Access denied. Requires 'MANAGE_EVENTS' permission.",
        },
        { status: 403 },
      );
    }
    const result = createEventSchema.safeParse(payload);
    if (!result.success) {
      logger.error("Invalid data format");
      return Response.json(
        {
          success: false,
          message: "Invalid dataschema",
          errors: z.treeifyError(result.error),
        },
        { status: 400 },
      );
    }
    let isReplay = false;
    const event = await Event.create({
      ...result.data,
      date: new Date(`${result.data.date}T${result.data.time}`),
    }).catch(async (err: any) => {
      if (err?.code === 11000 && result.data.idempotencyKey) {
        const existing = await Event.findOne({
          idempotencyKey: result.data.idempotencyKey,
        })
          .select("_id title")
          .lean();
        if (existing) {
          isReplay = true;
          return existing;
        }
      }
      if (result.data.featuredImageId) {
        deleteFromCloudinary([result.data.featuredImageId]).catch((e) =>
          logger.error("Failed to clean up orphaned event image:", e),
        );
      }
      throw err;
    });
    if (isReplay) {
      return Response.json(
        { success: true, message: "Event created" },
        { status: 201 },
      );
    }
    await invalidateCache(`events:*`);
    await AuditLogService.record(request, {
      action: "CREATE_EVENT",
      category: "events",
      description: `Created event "${event.title}"`,
      details: {
        eventId: event._id.toString(),
        title: event.title,
        date: event.date,
      },
    });

    const getUser = await User.findById(event.organizer)
      .lean()
      .select("name email");
    await workflowClient
      .trigger({
        url: `${env.clientUrl}/api/v1/workflow/event-created`,
        workflowRunId: `event-created:${event._id.toString()}`,
        body: {
          user: getUser,
          event: {
            _id: event._id.toString(),
            title: event.title,
            detail: event.detail,
            location: event.location,
            date: event.date,
            time: event.time,
            eventType: event.eventType,
          },
        },
      })
      .catch((err: any) =>
        logger.error("Failed to trigger event-created notification:", err),
      );
    return Response.json(
      { success: true, message: "Event created", body: event },
      { status: 201 },
    );
  });
}

export async function getEvents({
  request,
  page,
  limit,
  query,
  status,
  eventType,
  startDate,
  endDate,
}: {
  request: Request;
  page: number;
  limit: number;
  query: string | undefined;
  status: string | undefined;
  eventType: string | undefined;
  startDate: string | undefined;
  endDate: string | undefined;
}) {
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
    if (!Number.isInteger(page) || page < 1) {
      logger.error("Invalid page");
      return Response.json(
        { success: false, message: "Invalid page" },
        { status: 400 },
      );
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      logger.error("Invalid limit");
      return Response.json(
        { success: false, message: "Invalid limit" },
        { status: 400 },
      );
    }
    if (status && !(EVENT_STATUSES as readonly string[]).includes(status)) {
      logger.error("Invalid status filter");
      return Response.json(
        { success: false, message: "Invalid status filter" },
        { status: 400 },
      );
    }
    if (eventType && !(EVENT_TYPES as readonly string[]).includes(eventType)) {
      logger.error("Invalid event type filter");
      return Response.json(
        { success: false, message: "Invalid event type filter" },
        { status: 400 },
      );
    }
    const start = startDate ? toStartOfDay(startDate) : null;
    const end = endDate ? toEndOfDay(endDate) : null;
    if (start && Number.isNaN(start.getTime())) {
      logger.error("Invalid start date");
      return Response.json(
        { success: false, message: "Invalid start date" },
        { status: 400 },
      );
    }
    if (end && Number.isNaN(end.getTime())) {
      logger.error("Invalid end date");
      return Response.json(
        { success: false, message: "Invalid end date" },
        { status: 400 },
      );
    }
    const cacheKey = `events:p${page}:l${limit}:q${query ?? ""}:status${status ?? ""}:eventType${eventType ?? ""}:startDate${startDate ?? ""}:endDate${endDate ?? ""}`;
    const body = await fetchWithCache(cacheKey, 3600, async () => {
      const dateFilter: Record<string, Date> = {};
      if (start) dateFilter.$gte = start;
      if (end) dateFilter.$lte = end;

      const matchStage: Record<string, any> = {};

      if (Object.keys(dateFilter).length > 0) {
        matchStage.date = dateFilter;
      }
      if (status) matchStage.status = status;
      if (eventType) matchStage.eventType = eventType;
      if (query) {
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const getUser = await User.find({
          $or: [{ name: { $regex: escaped, $options: "i" } }],
        }).select("_id");
        const userIds = getUser.map((user) => user._id);
        matchStage.$or = [
          { title: { $regex: escaped, $options: "i" } },
          { organizer: { $in: userIds } },
        ];
        if (mongoose.Types.ObjectId.isValid(query)) {
          matchStage.$or.push({ _id: query });
        }
      }
      const events = await Event.find(matchStage)
        .populate("organizer", "name email image")
        .populate("interestedMembers", "name email image")
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean();

      const total = await Event.countDocuments(matchStage);
      return {
        events,
        meta: {
          currentPage: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
          hasMore: (page - 1) * limit + events.length < total,
        },
      };
    });
    return Response.json({
      success: true,
      message: "Events fetched successfully",
      body,
    });
  });
}

export async function getEvent(request: Request, payload: { eventId: string }) {
  return tryCatchWrapper(async () => {
    await checkRateLimit(request, "general");
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return Response.json(
        { success: false, message: "Unauthorized, session expired" },
        { status: 401 },
      );
    }
    const eventId = payload.eventId as string;
    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return Response.json(
        { success: false, message: "Event ID is required" },
        { status: 400 },
      );
    }
    const cacheKey = `event:${eventId}`;
    const body = await fetchWithCache(cacheKey, 3600, async () => {
      const getEvent = await Event.findById(eventId)
        .populate({
          path: "organizer",
          select: "name image",
        })
        .populate("interestedMembers", "name email image")
        .lean();
      return getEvent ?? null;
    });
    if (!body) {
      return Response.json(
        { success: false, message: "Event not found" },
        { status: 404 },
      );
    }
    return Response.json({
      success: true,
      message: "Event fetched successfully",
      body,
    });
  });
}

export async function updateEvent(
  request: Request,
  payload: UpdateEventSchemaType,
  eventId: string,
) {
  return tryCatchWrapper(async () => {
    await checkRateLimit(request, "strict");
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      logger.error("Unauthorized");
      return Response.json(
        { success: false, message: "Unauthorized, session expired" },
        { status: 401 },
      );
    }
    if (!hasPermission(session.user.role, "MANAGE_EVENTS")) {
      logger.error("Forbidden");
      return Response.json(
        {
          success: false,
          message:
            "Access denied. Requires 'MANAGE_EVENTS' permission.",
        },
        { status: 403 },
      );
    }
    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      logger.error("Invalid event id");
      return Response.json(
        { success: false, message: "Invalid event id" },
        { status: 400 },
      );
    }
    const result = updateEventSchema.safeParse(payload);
    if (!result.success) {
      logger.error("Invalid data format");
      return Response.json(
        {
          success: false,
          message: "Invalid data format",
          errors: z.treeifyError(result.error),
        },
        { status: 400 },
      );
    }
    const existingEvent = await Event.findById(eventId).lean();
    if (!existingEvent) {
      logger.error("Event not found");
      return Response.json(
        { success: false, message: "Event not found" },
        { status: 404 },
      );
    }
    const setData: Record<string, unknown> = {
      ...result.data,
      date: new Date(`${result.data.date}T${result.data.time}`),
    };
    delete setData.featuredImage;
    delete setData.featuredImageId;

    const unsetData: Record<string, 1> = {};
    const newImageId = result.data.featuredImageId;
    if (newImageId) {
      setData.featuredImage = result.data.featuredImage;
      setData.featuredImageId = newImageId;
    } else if (newImageId === "") {
      unsetData.featuredImage = 1;
      unsetData.featuredImageId = 1;
    }
    if (result.data.latitude === undefined) unsetData.latitude = 1;
    else setData.latitude = result.data.latitude;
    if (result.data.longitude === undefined) unsetData.longitude = 1;
    else setData.longitude = result.data.longitude;

    const update: Record<string, unknown> = { $set: setData };
    if (Object.keys(unsetData).length > 0) update.$unset = unsetData;

    const updatedEvent = await Event.findByIdAndUpdate(eventId, update, {
      returnDocument: "after",
    })
      .populate({ path: "organizer", select: "name image" })
      .lean();

    await invalidateCache("events:*");
    await invalidateCache(`event:${eventId}`);

    const oldImageId = existingEvent.featuredImageId;
    const imageRemoved = newImageId === "";
    const imageReplaced =
      Boolean(newImageId) && Boolean(oldImageId) && oldImageId !== newImageId;
    if (oldImageId && (imageRemoved || imageReplaced)) {
      deleteFromCloudinary([oldImageId]).catch((err) =>
        logger.error("Failed to delete old featured image:", err),
      );
    }

    await AuditLogService.record(request, {
      action: "UPDATE_EVENT",
      category: "events",
      description: `Updated event "${existingEvent.title}"`,
      details: {
        eventId,
        title: existingEvent.title,
        date: setData.date,
      },
    });

    return Response.json(
      {
        success: true,
        message: "Event updated successfully",
        body: updatedEvent,
      },
      { status: 200 },
    );
  });
}

export async function deleteEvent(request: Request, payload: { eventId: string }) {
  return tryCatchWrapper(async () => {
    await checkRateLimit(request, "strict");
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      logger.error("Unauthorized");
      return Response.json(
        { success: false, message: "Unauthorized, session expired" },
        { status: 401 },
      );
    }
    if (!hasPermission(session.user.role, "MANAGE_EVENTS")) {
      logger.error("Forbidden");
      return Response.json(
        {
          success: false,
          message:
            "Access denied. Requires 'MANAGE_EVENTS' permission.",
        },
        { status: 403 },
      );
    }
    const eventId = payload.eventId as string;
    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      logger.error("Invalid event id");
      return Response.json(
        { success: false, message: "Event ID is required" },
        { status: 400 },
      );
    }
    const event = await Event.findById(eventId)
      .select("title featuredImageId")
      .lean();
    if (!event) {
      // Idempotent: a repeated delete of the same event (e.g. double-click)
      // should not surface as an error once the first request succeeded.
      return Response.json(
        { success: true, message: "Event deleted successfully" },
        { status: 200 },
      );
    }

    await Event.findByIdAndDelete(eventId);

    if (event.featuredImageId) {
      deleteFromCloudinary([event.featuredImageId]).catch((err) =>
        logger.error("Failed to delete event featured image:", err),
      );
    }

    await invalidateCache("events:*");
    await invalidateCache(`event:${eventId}`);

    await AuditLogService.record(request, {
      action: "DELETE_EVENT",
      category: "events",
      description: `Deleted event "${event.title}"`,
      details: {
        eventId,
        title: event.title,
      },
    });

    return Response.json(
      { success: true, message: "Event deleted successfully" },
      { status: 200 },
    );
  });
}

export async function toggleEventInterest(
  request: Request,
  payload: { eventId: string },
) {
  return tryCatchWrapper(async () => {
    await checkRateLimit(request, "strict");
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      logger.error("Unauthorized");
      return Response.json(
        { success: false, message: "Unauthorized, session expired" },
        { status: 401 },
      );
    }
    const userId = session.user.id;
    if (!payload.eventId || !mongoose.Types.ObjectId.isValid(payload.eventId)) {
      return Response.json(
        { success: false, message: "Invalid event id" },
        { status: 400 },
      );
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return Response.json(
        { success: false, message: "Invalid session user" },
        { status: 400 },
      );
    }

    const current = await Event.findById(payload.eventId)
      .select("status interestedMembers")
      .lean();
    if (!current) {
      return Response.json(
        { success: false, message: "Event not found" },
        { status: 404 },
      );
    }

    const isOpen =
      current.status === "upcoming" || current.status === "ongoing";
    const currentlyInterested = (current.interestedMembers ?? []).some(
      (id: unknown) => String(id) === userId,
    );

    // A user cannot indicate interest in a completed or cancelled event, but
    // may still remove an interest they previously expressed.
    if (!isOpen && !currentlyInterested) {
      return Response.json(
        {
          success: false,
          message:
            "You cannot indicate interest in a completed or cancelled event",
        },
        { status: 400 },
      );
    }

    let updated: { _id: unknown; interestedMembers: unknown[] } | null;
    let interested: boolean;
    if (isOpen) {
      // Atomic toggle: try to add the user to interestedMembers; if the user
      // is already present the update matches nothing, so the second branch
      // pulls.
      updated = await Event.findOneAndUpdate(
        { _id: payload.eventId, interestedMembers: { $ne: userId } },
        { $addToSet: { interestedMembers: userId } },
        { new: true, projection: { interestedMembers: 1 } },
      ).lean();
      interested = Boolean(updated);
      if (!updated) {
        updated = await Event.findOneAndUpdate(
          { _id: payload.eventId, interestedMembers: userId },
          { $pull: { interestedMembers: userId } },
          { new: true, projection: { interestedMembers: 1 } },
        ).lean();
        interested = false;
      }
    } else {
      updated = await Event.findOneAndUpdate(
        { _id: payload.eventId, interestedMembers: userId },
        { $pull: { interestedMembers: userId } },
        { new: true, projection: { interestedMembers: 1 } },
      ).lean();
      interested = false;
    }
    if (!updated) {
      return Response.json(
        { success: false, message: "Event not found" },
        { status: 404 },
      );
    }

    await invalidateCache(`event:${payload.eventId}`);
    await invalidateCache("events:*");

    return Response.json(
      {
        success: true,
        message: interested ? "Marked as interested" : "Interest removed",
        body: {
          interested,
          count: updated.interestedMembers?.length ?? 0,
        },
      },
      { status: 200 },
    );
  });
}

export async function cancelEvent(
  request: Request,
  payload: { eventId: string },
) {
  return tryCatchWrapper(async () => {
    await checkRateLimit(request, "strict");
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      logger.error("Unauthorized");
      return Response.json(
        { success: false, message: "Unauthorized, session expired" },
        { status: 401 },
      );
    }
    if (!hasPermission(session.user.role, "MANAGE_EVENTS")) {
      logger.error("Forbidden");
      return Response.json(
        {
          success: false,
          message: "Access denied. Requires 'MANAGE_EVENTS' permission.",
        },
        { status: 403 },
      );
    }
    if (!payload.eventId || !mongoose.Types.ObjectId.isValid(payload.eventId)) {
      logger.error("Invalid event id");
      return Response.json(
        { success: false, message: "Invalid event id" },
        { status: 400 },
      );
    }

    // Atomic: only an upcoming/ongoing event can transition to cancelled, so a
    // concurrent cancel/status-sweep can't double-apply side effects.
    const updated = await Event.findOneAndUpdate(
      { _id: payload.eventId, status: { $in: ["upcoming", "ongoing"] } },
      { $set: { status: "cancelled" } },
      { returnDocument: "after" },
    )
      .populate("organizer", "name image")
      .populate("interestedMembers", "name email image")
      .lean();

    if (!updated) {
      const existing = await Event.findById(payload.eventId)
        .select("status title")
        .lean();
      if (!existing) {
        return Response.json(
          { success: false, message: "Event not found" },
          { status: 404 },
        );
      }
      if (existing.status === "cancelled") {
        return Response.json(
          { success: true, message: "Event already cancelled" },
          { status: 200 },
        );
      }
      return Response.json(
        {
          success: false,
          message: "Only upcoming or ongoing events can be cancelled",
        },
        { status: 400 },
      );
    }

    await invalidateCache("events:*");
    await invalidateCache(`event:${payload.eventId}`);

    await AuditLogService.record(request, {
      action: "CANCEL_EVENT",
      category: "events",
      description: `Cancelled event "${updated.title}"`,
      details: {
        eventId: payload.eventId,
        title: updated.title,
      },
    });

    await notifyEventStatusChange(updated, "cancelled");

    return Response.json(
      { success: true, message: "Event cancelled", body: updated },
      { status: 200 },
    );
  });
}

async function notifyEventStatusChange(
  event: {
    _id: unknown;
    title: string;
    organizer?: { _id: unknown } | null;
    interestedMembers?: Array<{ _id: unknown } | unknown>;
  },
  status: "ongoing" | "completed" | "cancelled",
) {
  const recipients = new Set<string>();
  const orgId = event.organizer?._id ?? event.organizer;
  if (orgId) recipients.add(orgId.toString());
  for (const member of event.interestedMembers ?? []) {
    const id = (member as { _id?: unknown })?._id ?? member;
    if (id) recipients.add(id.toString());
  }

  const labels: Record<typeof status, { type: string; title: string; message: string }> = {
    ongoing: {
      type: "event_ongoing",
      title: "Event Ongoing",
      message: `The event "${event.title}" is now ongoing.`,
    },
    completed: {
      type: "event_completed",
      title: "Event Completed",
      message: `The event "${event.title}" has been completed.`,
    },
    cancelled: {
      type: "event_cancelled",
      title: "Event Cancelled",
      message: `The event "${event.title}" has been cancelled.`,
    },
  };
  const label = labels[status];

  await Promise.allSettled(
    [...recipients].map((userId) =>
      NotificationService.send({
        userId,
        type: label.type as any,
        title: label.title,
        message: label.message,
        metadata: { eventId: String(event._id) },
      }),
    ),
  );
}

export async function getUpcomingEvents(request: Request) {
  return tryCatchWrapper(async () => {
    await checkRateLimit(request, "general");
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return Response.json(
        { success: false, message: "Unauthorized, session expired" },
        { status: 401 },
      );
    }
    const cacheKey = `events:upcoming`;
    const body = await fetchWithCache(cacheKey, 4600, async () => {
      const getEvents = await Event.find({ status: "upcoming" })
        .populate({
          path: "organizer",
          select: "name image",
        })
        .sort({ date: 1 })
        .limit(50)
        .lean();
      return getEvents ?? null;
    });
    if (!body) {
      return Response.json(
        { success: false, message: "Events not found" },
        { status: 404 },
      );
    }
    return Response.json({
      success: true,
      message: "Upcoming events fetched successfully",
      body,
    });
  });
}
