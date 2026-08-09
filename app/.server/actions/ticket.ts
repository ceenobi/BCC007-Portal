import z from "zod";
import { hasPermission } from "~/lib/rbac";
import { createTicketSchema } from "~/lib/schema";
import { tryCatchWrapper } from "~/lib/tryCatchWrapper";
import { generateTicketId } from "~/lib/utils";
import type { CreateTicketSchemaType } from "~/types";
import { env } from "../config/keys";
import logger from "../config/logger";
import Ticket from "../models/ticket";
import User from "../models/user";
import { AuditLogService } from "../services/auditlog-service";
import { auth } from "../services/better-auth";
import { NotificationService } from "../services/notification.service";
import { fetchWithCache, invalidateCache } from "../utils/cache";
import { checkRateLimit } from "../utils/rate-limit";
import { workflowClient } from "../workflows/client";

export async function createTicket(
  request: Request,
  payload: CreateTicketSchemaType,
) {
  return tryCatchWrapper(async () => {
    await checkRateLimit(request, "strict");
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (!session) {
      logger.error("Unauthorized");
      return Response.json(
        { success: false, message: "Unauthorized, session expired" },
        { status: 401 },
      );
    }
    const { id: userId } = session.user;
    const result = createTicketSchema.safeParse(payload);
    if (!result.success) {
      logger.error("Invalid profile data format");
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
    const ticket = await Ticket.create({
      ...result.data,
      userId,
      ticketId: generateTicketId(),
    }).catch(async (err: any) => {
      if (err?.code !== 11000 || !result.data.idempotencyKey) throw err;
      const existing = await Ticket.findOne({
        idempotencyKey: result.data.idempotencyKey,
      })
        .select("ticketId")
        .lean();
      if (!existing) throw err;
      isReplay = true;
      return existing;
    });
    await invalidateCache(`tickets:*`);
    await AuditLogService.record(request, {
      action: "SUPPORT_TICKET",
      category: "support",
      description: `Created ticket "${result.data.title}")`,
      details: {
        ticketId: ticket.ticketId.toString(),
      },
    });
    if (isReplay) {
      return Response.json(
        { success: true, message: "Ticket created successfully" },
        { status: 201 },
      );
    }
    // Trigger ticket confirmation email
    await workflowClient.trigger({
      url: `${env.clientUrl}/api/v1/workflow/ticket-confirmation`,
      workflowRunId: `ticket-confirmation:${ticket.ticketId}`,
      body: {
        userId,
        ticketId: ticket.ticketId,
        title: result.data.title,
        description: result.data.description || "",
        priority: result.data.priority,
      },
    });
    NotificationService.send({
      userId,
      type: "ticket_created",
      title: "Ticket Created",
      message: `Your ticket "${result.data.title}" has been created.`,
      metadata: { ticketId: ticket.ticketId },
    });
    return Response.json(
      { success: true, message: "Ticket created successfully" },
      { status: 201 },
    );
  });
}

export async function fetchTickets({
  request,
  page,
  limit,
  query,
  status,
  priority,
  category,
}: {
  request: Request;
  page: number;
  limit: number;
  query: string | undefined;
  status: "open" | "in-progress" | "resolved" | "closed" | undefined;
  priority: "low" | "medium" | "high" | "critical" | undefined;
  category: "account" | "payment" | "security" | "other" | undefined;
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
    const cacheKey = `tickets:p${page}:l${limit}:q${query ?? ""}:s${status ?? ""}:pr${priority ?? ""}:cat${category ?? ""}`;
    const body = await fetchWithCache(cacheKey, 3600, async () => {
      const dbFilter: Record<string, any> = {
        ...(status && { status }),
        ...(priority && { priority }),
        ...(category && { category }),
      };
      if (query) {
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = { $regex: escaped, $options: "i" };
        dbFilter.$or = [{ title: regex }, { ticketId: regex }];
      }
      const total = await Ticket.countDocuments(dbFilter);
      const tickets = await Ticket.find(dbFilter)
        .populate("userId", "name email phone")
        .populate("assignedTo", "name email phone")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      const matchStage: Record<string, any> = {};
      const ticketStats = await Ticket.aggregate([
        ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
        {
          $group: {
            _id: null,
            totalTickets: { $sum: 1 },
            openTickets: {
              $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] },
            },
            closedTickets: {
              $sum: { $cond: [{ $eq: ["$status", "closed"] }, 1, 0] },
            },
            inProgressTickets: {
              $sum: {
                $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0],
              },
            },
            resolvedTickets: {
              $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] },
            },
          },
        },
      ]);
      return {
        tickets,
        summary: ticketStats[0] || {},
        meta: {
          currentPage: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
          hasMore: (page - 1) * limit + tickets.length < total,
        },
      };
    });
    return Response.json({
      success: true,
      message: "Tickets fetched successfully",
      body,
    });
  });
}

export async function ticketActions(
  request: Request,
  payload: { id: string; status?: string; assignedTo?: string | null },
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
    const { role } = session.user;

    if (!payload.id) {
      logger.error("Ticket Id is required to perform action");
      return Response.json(
        { success: false, message: "Ticket Id is required to perform action" },
        { status: 401 },
      );
    }

    const STATUSES_REQUIRING_ASSIGNMENT = new Set([
      "resolved",
      "in-progress",
      "closed",
    ]);

    // Authorization: status changes require MANAGE_TICKETS; assignment and
    // unassignment require ASSIGN_TICKET (super_admin only).
    if (payload.status && !hasPermission(role, "MANAGE_TICKETS")) {
      logger.error("Unauthorized: user lacks MANAGE_TICKETS");
      return Response.json(
        {
          success: false,
          message:
            "Unauthorized: You do not have permission to manage tickets",
        },
        { status: 403 },
      );
    }
    if (payload.assignedTo !== undefined && !hasPermission(role, "ASSIGN_TICKET")) {
      logger.error("Unauthorized: user lacks ASSIGN_TICKET");
      return Response.json(
        {
          success: false,
          message: "Unauthorized: Only super admins can assign tickets",
        },
        { status: 403 },
      );
    }

    // A status that requires assignment cannot be combined with an explicit
    // unassign in the same request (would null the assignee mid-transition).
    if (
      payload.status &&
      STATUSES_REQUIRING_ASSIGNMENT.has(payload.status) &&
      payload.assignedTo === null
    ) {
      return Response.json(
        {
          success: false,
          message: `Ticket cannot be set to "${payload.status}" while being unassigned`,
        },
        { status: 400 },
      );
    }

    // Validate assignee existence and permissions (independent of ticket state)
    if (payload.assignedTo) {
      const assignee = await User.findById(payload.assignedTo)
        .select("role")
        .lean();
      if (!assignee) {
        logger.error("Assignee not found");
        return Response.json(
          { success: false, message: "Assignee not found" },
          { status: 404 },
        );
      }
      if (assignee.role !== "admin" && assignee.role !== "super_admin") {
        logger.error("Tickets can only be assigned to admins and super admins");
        return Response.json(
          {
            success: false,
            message: "Tickets can only be assigned to admins and super admins",
          },
          { status: 400 },
        );
      }
    }

      // Build atomic filter to prevent race conditions
      const filter: Record<string, any> = { _id: payload.id };

      // No-op exclusions: only transition when the value actually changes so
      // repeated idempotent requests never re-trigger workflows/notifications.
      if (payload.status) filter.status = { $ne: payload.status };
      if (payload.assignedTo !== undefined)
        filter.assignedTo = { $ne: payload.assignedTo };

      // If the status requires assignment, ensure the ticket is assigned atomically
      if (
        payload.status &&
        STATUSES_REQUIRING_ASSIGNMENT.has(payload.status) &&
        !payload.assignedTo
      ) {
        filter.assignedTo = { $ne: null };
      }

      // If assigning, prevent overwriting an existing assignment atomically
      if (payload.assignedTo) {
        filter.$or = [
          { assignedTo: { $exists: false } },
          { assignedTo: null },
          { assignedTo: payload.assignedTo },
        ];
      }

      const updateFields: Record<string, any> = {};
      if (payload.status) updateFields.status = payload.status;
      if (payload.assignedTo !== undefined)
        updateFields.assignedTo = payload.assignedTo;

      const updatedTicket = await Ticket.findOneAndUpdate(filter, updateFields, {
        returnDocument: "after",
        runValidators: true,
      })
        .populate("userId", "name email phone")
        .populate("assignedTo", "name email phone")
        .lean();

      if (!updatedTicket) {
        // Determine the reason based on what was attempted
        const ticket = await Ticket.findById(payload.id)
          .select("assignedTo status")
          .lean();
        if (!ticket) {
          return Response.json(
            { success: false, message: "Ticket not found" },
            { status: 404 },
          );
        }

        const currentAssignedTo = ticket.assignedTo
          ? ticket.assignedTo.toString()
          : null;
        const statusOk =
          !payload.status || ticket.status === payload.status;
        const assignmentOk =
          payload.assignedTo === undefined ||
          currentAssignedTo === (payload.assignedTo ?? null);

        // Idempotent repeat — the ticket already reflects the requested change.
        if (statusOk && assignmentOk) {
          return Response.json(
            {
              success: true,
              message: "Ticket is already in the requested state",
            },
            { status: 200 },
          );
        }
        if (
          payload.status &&
          STATUSES_REQUIRING_ASSIGNMENT.has(payload.status) &&
          !ticket.assignedTo
        ) {
          return Response.json(
            {
              success: false,
              message: `Ticket cannot be set to "${payload.status}" without being assigned to an admin`,
            },
            { status: 400 },
          );
        }
        if (payload.assignedTo && currentAssignedTo !== payload.assignedTo) {
          return Response.json(
            {
              success: false,
              message: "Ticket is already assigned to another admin",
            },
            { status: 403 },
          );
        }
        return Response.json(
          { success: false, message: "Operation failed, please try again" },
          { status: 400 },
        );
      }

      await invalidateCache(`tickets:*`);

      // Notifications
      if (updatedTicket.assignedTo && payload.assignedTo) {
        await workflowClient.trigger({
          url: `${env.clientUrl}/api/v1/workflow/ticket-assigned`,
          workflowRunId: `ticket-assigned:${updatedTicket.ticketId}:${updatedTicket.assignedTo._id.toString()}`,
          body: {
            userId: updatedTicket.assignedTo._id.toString(),
            ticketId: updatedTicket.ticketId,
            title: updatedTicket.title,
          },
        });
        NotificationService.send({
          userId: updatedTicket.assignedTo._id.toString(),
          type: "ticket_assigned",
          title: "Ticket Assigned",
          message: `Ticket "${updatedTicket.title}" has been assigned to you.`,
          metadata: { ticketId: updatedTicket.ticketId },
        });
      }
      if (updatedTicket.status === "resolved") {
        await workflowClient.trigger({
          url: `${env.clientUrl}/api/v1/workflow/ticket-resolved`,
          workflowRunId: `ticket-resolved:${updatedTicket.ticketId}`,
          body: {
            userId: updatedTicket.userId._id.toString(),
            ticketId: updatedTicket.ticketId,
            title: updatedTicket.title,
          },
        });
        NotificationService.send({
          userId: updatedTicket.userId._id.toString(),
          type: "ticket_resolved",
          title: "Ticket Resolved",
          message: `Your ticket "${updatedTicket.title}" has been resolved.`,
          metadata: { ticketId: updatedTicket.ticketId },
        });
      }
    return Response.json(
      { success: true, message: "Ticket updated successfully" },
      { status: 200 },
    );
  });
}
