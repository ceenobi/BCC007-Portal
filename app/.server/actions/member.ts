import { tryCatchWrapper } from "~/lib/tryCatchWrapper";
import logger from "../config/logger";
import User from "../models/user";
import { auth } from "../services/better-auth";
import { fetchWithCache } from "../utils/cache";
import { checkRateLimit } from "../utils/rate-limit";

export async function getMembersForSelect(request: Request) {
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
    const cacheKey = `members:select`;
    const body = await fetchWithCache(cacheKey, 3600, async () => {
      return await User.find({ isOnboarded: true })
        .lean()
        .select("_id name")
        .sort({ name: 1 });
    });
    return Response.json({
      success: true,
      message: "Members fetched successfully",
      body
    });
  });
}

export async function getAdminsForAssign(request: Request) {
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
    const cacheKey = `members:admins:select`;
    const body = await fetchWithCache(cacheKey, 3600, async () => {
      return await User.find({ isOnboarded: true, role: "admin" })
        .lean()
        .select("_id name email")
        .sort({ name: 1 });
    });
    return Response.json({
      success: true,
      message: "Admins fetched successfully",
      body,
    });
  });
}

export async function getMembers({
  request,
  page,
  limit,
  query,
}: {
  request: Request;
  page: number;
  limit: number;
  query: string | undefined;
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
    const cacheKey = `members:p${page}:l${limit}:q${query ?? ""}`;
    const body = await fetchWithCache(cacheKey, 3600, async () => {
      const dbFilter: Record<string, any> = {};
      if (query) {
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = { $regex: escaped, $options: "i" };
        dbFilter.$or = [{ name: regex }];
      }
      const total = await User.countDocuments(dbFilter);
      const members = await User.find(dbFilter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
      return {
        members,
        meta: {
          currentPage: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
          hasMore: (page - 1) * limit + members.length < total,
        },
      };
    });
    return Response.json({
      success: true,
      message: "Members fetched successfully",
      body,
    });
  });
}
