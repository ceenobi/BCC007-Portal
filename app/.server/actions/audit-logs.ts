import mongoose from "mongoose";
import { tryCatchWrapper } from "~/lib/tryCatchWrapper";
import logger from "../config/logger";
import AuditLog from "../models/auditlog";
import { auth } from "../services/better-auth";
import { fetchWithCache } from "../utils/cache";
import { checkRateLimit } from "../utils/rate-limit";

export async function fetchUserAuditLogs({
	request,
	page = 1,
	limit = 20,
	category,
}: {
	request: Request;
	page?: number;
	limit?: number;
	category?: string;
}) {
	return tryCatchWrapper(async () => {
		await checkRateLimit(request, "general");
		const session = await auth.api.getSession({ headers: request.headers });
		if (!session) {
			logger.error("Unauthorized");
			return Response.json(
				{ success: false, message: "Unauthorized" },
				{ status: 401 },
			);
		}
		const { id } = session.user;
		const cacheKey = `audit-logs:${id}:${category ?? "all"}:${page}`;
		const body = await fetchWithCache(cacheKey, 3600, async () => {
			const dbFilter: Record<string, unknown> = {
				userId: new mongoose.Types.ObjectId(id),
			};
			if (category && category !== "all") {
				dbFilter.category = category;
			}
			const total = await AuditLog.countDocuments(dbFilter);
			const logs = await AuditLog.find(dbFilter)
				.sort({ createdAt: -1 })
				.skip((page - 1) * limit)
				.limit(limit)
				.lean();
			return {
				logs,
				meta: {
					currentPage: Number(page),
					limit: Number(limit),
					total,
					totalPages: Math.ceil(total / limit),
					hasMore: (page - 1) * limit + logs.length < total,
				},
			};
		});
		return Response.json({
			success: true,
			message: "Audit logs fetched successfully",
			body,
		});
	});
}

export async function fetchAllAuditLogs({
	request,
	page = 1,
	limit = 20,
	category,
}: {
	request: Request;
	page?: number;
	limit?: number;
	category?: string;
}) {
	return tryCatchWrapper(async () => {
		await checkRateLimit(request, "general");
		const session = await auth.api.getSession({ headers: request.headers });
		if (!session) {
			logger.error("Unauthorized");
			return Response.json(
				{ success: false, message: "Unauthorized" },
				{ status: 401 },
			);
		}
		const cacheKey = `audit-logs:all:${category ?? "all"}:${page}`;

		const body = await fetchWithCache(cacheKey, 3600, async () => {
			const dbFilter: Record<string, unknown> = {};
			if (category && category !== "all") {
				dbFilter.category = category;
			}
			const total = await AuditLog.countDocuments(dbFilter);
			const logs = await AuditLog.find(dbFilter)
				.sort({ createdAt: -1 })
				.skip((page - 1) * limit)
				.limit(limit)
				.lean();
			return {
				logs,
				meta: {
					currentPage: Number(page),
					limit: Number(limit),
					total,
					totalPages: Math.ceil(total / limit),
					hasMore: (page - 1) * limit + logs.length < total,
				},
			};
		});
		return Response.json({
			success: true,
			message: "Audit logs fetched successfully",
			body,
		});
	});
}
