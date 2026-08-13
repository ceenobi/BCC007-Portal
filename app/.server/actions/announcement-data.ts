import mongoose from "mongoose";
import z from "zod";
import { hasPermission } from "~/lib/rbac";
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
} from "~/lib/schema";
import { tryCatchWrapper } from "~/lib/tryCatchWrapper";
import type {
  CreateAnnouncementSchemaType,
  UpdateAnnouncementSchemaType,
} from "~/types";
import { env } from "../config/keys";
import logger from "../config/logger";
import Announcement from "../models/announcement";
import { AuditLogService } from "../services/auditlog-service";
import { auth } from "../services/better-auth";
import { fetchWithCache, invalidateCache } from "../utils/cache";
import { deleteFromCloudinary } from "../utils/cloudinary";
import { checkRateLimit } from "../utils/rate-limit";
import { workflowClient } from "../workflows/client";

const ANNOUNCEMENT_STATUSES = ["draft", "published", "archived"] as const;

export async function createAnnouncement(
  request: Request,
  payload: CreateAnnouncementSchemaType,
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
    if (!hasPermission(session.user.role, "MANAGE_ANNOUNCEMENTS")) {
      logger.error("Forbidden");
      return Response.json(
        {
          success: false,
          message:
            "Access denied. Requires 'MANAGE_ANNOUNCEMENTS' permission.",
        },
        { status: 403 },
      );
    }
    const result = createAnnouncementSchema.safeParse(payload);
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
    const { idempotencyKey, ...data } = result.data;
    let isReplay = false;
    const announcement = await Announcement.create({
      ...data,
      author: session.user.id,
      ...(data.status === "published" ? { publishedAt: new Date() } : {}),
      ...(idempotencyKey ? { idempotencyKey } : {}),
    }).catch(async (err: any) => {
      if (err?.code === 11000 && idempotencyKey) {
        const existing = await Announcement.findOne({ idempotencyKey })
          .select("_id title")
          .lean();
        if (existing) {
          isReplay = true;
          return existing;
        }
      }
      if (data.featuredImageId) {
        deleteFromCloudinary([data.featuredImageId]).catch((e) =>
          logger.error("Failed to clean up orphaned announcement image:", e),
        );
      }
      throw err;
    });
    if (isReplay) {
      return Response.json(
        { success: true, message: "Announcement created" },
        { status: 201 },
      );
    }
    await invalidateCache("announcements:*");
    await invalidateCache("dashboard:latest-announcement");

    await AuditLogService.record(request, {
      action: "CREATE_ANNOUNCEMENT",
      category: "announcements",
      description: `Created announcement "${announcement.title}"`,
      details: {
        announcementId: announcement._id.toString(),
        title: announcement.title,
        status: announcement.status,
      },
    });

    if (announcement.status === "published") {
      await triggerAnnouncementBroadcast(announcement);
    }

    return Response.json(
      { success: true, message: "Announcement created", body: announcement },
      { status: 201 },
    );
  });
}

export async function getAnnouncements({
  request,
  page,
  limit,
  query,
  status,
}: {
  request: Request;
  page: number;
  limit: number;
  query: string | undefined;
  status: string | undefined;
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
    if (
      status &&
      !(ANNOUNCEMENT_STATUSES as readonly string[]).includes(status)
    ) {
      logger.error("Invalid status filter");
      return Response.json(
        { success: false, message: "Invalid status filter" },
        { status: 400 },
      );
    }
    const canManage = hasPermission(
      session.user.role,
      "MANAGE_ANNOUNCEMENTS",
    );
    const cacheKey = `announcements:p${page}:l${limit}:q${query ?? ""}:status${status ?? ""}:manage${canManage}`;
    const body = await fetchWithCache(cacheKey, 300, async () => {
      const matchStage: Record<string, any> = {};
      // Members only ever see published announcements; admins see everything
      // (or a specific status when filtering).
      matchStage.status = canManage
        ? status ?? { $in: ["draft", "published", "archived"] }
        : "published";
      if (query) {
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        matchStage.$or = [
          { title: { $regex: escaped, $options: "i" } },
          { content: { $regex: escaped, $options: "i" } },
        ];
        if (mongoose.Types.ObjectId.isValid(query)) {
          matchStage.$or.push({ _id: query });
        }
      }
      const announcements = await Announcement.find(matchStage)
        .populate("author", "name email image")
        .sort({ isPinned: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      const total = await Announcement.countDocuments(matchStage);
      return {
        announcements,
        meta: {
          currentPage: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
          hasMore: (page - 1) * limit + announcements.length < total,
        },
      };
    });
    return Response.json({
      success: true,
      message: "Announcements fetched successfully",
      body,
    });
  });
}

export async function getAnnouncement(
  request: Request,
  payload: { announcementId: string },
) {
  return tryCatchWrapper(async () => {
    await checkRateLimit(request, "general");
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return Response.json(
        { success: false, message: "Unauthorized, session expired" },
        { status: 401 },
      );
    }
    const announcementId = payload.announcementId as string;
    if (!announcementId || !mongoose.Types.ObjectId.isValid(announcementId)) {
      return Response.json(
        { success: false, message: "Announcement ID is required" },
        { status: 400 },
      );
    }
    const cacheKey = `announcement:${announcementId}`;
    const body = await fetchWithCache(cacheKey, 300, async () => {
      const found = await Announcement.findById(announcementId)
        .populate({ path: "author", select: "name email image" })
        .lean();
      return found ?? null;
    });
    if (!body) {
      return Response.json(
        { success: false, message: "Announcement not found" },
        { status: 404 },
      );
    }
    const canManage = hasPermission(session.user.role, "MANAGE_ANNOUNCEMENTS");
    if (body.status !== "published" && !canManage) {
      return Response.json(
        { success: false, message: "Announcement not found" },
        { status: 404 },
      );
    }
    return Response.json({
      success: true,
      message: "Announcement fetched successfully",
      body,
    });
  });
}

export async function updateAnnouncement(
  request: Request,
  payload: UpdateAnnouncementSchemaType & { announcementId?: string },
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
    if (!hasPermission(session.user.role, "MANAGE_ANNOUNCEMENTS")) {
      logger.error("Forbidden");
      return Response.json(
        {
          success: false,
          message:
            "Access denied. Requires 'MANAGE_ANNOUNCEMENTS' permission.",
        },
        { status: 403 },
      );
    }
    const announcementId = payload.announcementId as string | undefined;
    if (!announcementId || !mongoose.Types.ObjectId.isValid(announcementId)) {
      logger.error("Invalid announcement id");
      return Response.json(
        { success: false, message: "Invalid announcement id" },
        { status: 400 },
      );
    }
    const { announcementId: _id, ...rest } = payload;
    const result = updateAnnouncementSchema.safeParse(rest);
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
    const existing = await Announcement.findById(announcementId).lean();
    if (!existing) {
      logger.error("Announcement not found");
      return Response.json(
        { success: false, message: "Announcement not found" },
        { status: 404 },
      );
    }
    const setData: Record<string, unknown> = { ...result.data };
    delete setData.featuredImage;
    delete setData.featuredImageId;
    delete setData.status;

    const unsetData: Record<string, 1> = {};
    const newImageId = result.data.featuredImageId;
    if (newImageId) {
      setData.featuredImage = result.data.featuredImage;
      setData.featuredImageId = newImageId;
    } else if (newImageId === "") {
      unsetData.featuredImage = 1;
      unsetData.featuredImageId = 1;
    }

    const newStatus = result.data.status;
    const wasPublished = existing.status === "published";
    if (newStatus) {
      setData.status = newStatus;
      if (newStatus === "published" && !wasPublished) {
        setData.publishedAt = new Date();
      }
      if (newStatus !== "published") {
        unsetData.publishedAt = 1;
      }
    }

    const update: Record<string, unknown> = { $set: setData };
    if (Object.keys(unsetData).length > 0) update.$unset = unsetData;

    const updated = await Announcement.findByIdAndUpdate(announcementId, update, {
      returnDocument: "after",
    })
      .populate({ path: "author", select: "name image" })
      .lean();

    await invalidateCache("announcements:*");
    await invalidateCache(`announcement:${announcementId}`);
    await invalidateCache("dashboard:latest-announcement");

    const oldImageId = existing.featuredImageId;
    const imageRemoved = newImageId === "";
    const imageReplaced =
      Boolean(newImageId) && Boolean(oldImageId) && oldImageId !== newImageId;
    if (oldImageId && (imageRemoved || imageReplaced)) {
      deleteFromCloudinary([oldImageId]).catch((err) =>
        logger.error("Failed to delete old announcement image:", err),
      );
    }

    await AuditLogService.record(request, {
      action: "UPDATE_ANNOUNCEMENT",
      category: "announcements",
      description: `Updated announcement "${existing.title}"`,
      details: {
        announcementId,
        title: existing.title,
        status: newStatus ?? existing.status,
      },
    });

    // A publish (or re-publish after archive) broadcasts to all members.
    if (newStatus === "published" && !wasPublished) {
      await triggerAnnouncementBroadcast(updated);
    }

    return Response.json(
      {
        success: true,
        message: "Announcement updated successfully",
        body: updated,
      },
      { status: 200 },
    );
  });
}

export async function deleteAnnouncement(
  request: Request,
  payload: { announcementId: string },
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
    if (!hasPermission(session.user.role, "MANAGE_ANNOUNCEMENTS")) {
      logger.error("Forbidden");
      return Response.json(
        {
          success: false,
          message:
            "Access denied. Requires 'MANAGE_ANNOUNCEMENTS' permission.",
        },
        { status: 403 },
      );
    }
    const announcementId = payload.announcementId as string;
    if (!announcementId || !mongoose.Types.ObjectId.isValid(announcementId)) {
      logger.error("Invalid announcement id");
      return Response.json(
        { success: false, message: "Announcement ID is required" },
        { status: 400 },
      );
    }
    const announcement = await Announcement.findById(announcementId)
      .select("title featuredImageId")
      .lean();
    if (!announcement) {
      return Response.json(
        { success: true, message: "Announcement deleted successfully" },
        { status: 200 },
      );
    }

    await Announcement.findByIdAndDelete(announcementId);

    if (announcement.featuredImageId) {
      deleteFromCloudinary([announcement.featuredImageId]).catch((err) =>
        logger.error("Failed to delete announcement featured image:", err),
      );
    }

    await invalidateCache("announcements:*");
    await invalidateCache(`announcement:${announcementId}`);
    await invalidateCache("dashboard:latest-announcement");

    await AuditLogService.record(request, {
      action: "DELETE_ANNOUNCEMENT",
      category: "announcements",
      description: `Deleted announcement "${announcement.title}"`,
      details: {
        announcementId,
        title: announcement.title,
      },
    });

    return Response.json(
      { success: true, message: "Announcement deleted successfully" },
      { status: 200 },
    );
  });
}

async function triggerAnnouncementBroadcast(announcement: {
  _id: string | mongoose.Types.ObjectId;
  title: string;
  content: string;
}) {
  await workflowClient
    .trigger({
      url: `${env.clientUrl}/api/v1/workflow/announcement-created`,
      workflowRunId: `announcement-created:${announcement._id.toString()}`,
      body: {
        announcement: {
          _id: announcement._id.toString(),
          title: announcement.title,
          content: announcement.content,
        },
      },
    })
    .catch((err: any) =>
      logger.error("Failed to trigger announcement-created workflow:", err),
    );
}
