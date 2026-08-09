import { WorkflowContext } from "@upstash/workflow";
import logger from "../config/logger";
import User from "../models/user";
import emailService from "../services/email.service";

async function getUserPayload(userId: string) {
  const user = await User.findById(userId).select("name email").lean();
  if (!user) return null;
  return { id: userId, name: user.name, email: user.email } as any;
}

export const sendTicketConfirmationWorkflow = async (
  context: WorkflowContext<{
    userId: string;
    ticketId: string;
    title: string;
    description: string;
    priority: string;
  }>,
) => {
  const payload = context.requestPayload;
  if (!payload) return;
  const user = await getUserPayload(payload.userId);
  if (!user) return;

  await context.run("send-ticket-confirmation-email", async () => {
    try {
      await emailService.sendTicketConfirmationEmail({
        user,
        ticketId: payload.ticketId,
        title: payload.title,
        description: payload.description,
        priority: payload.priority,
      });
    } catch (error: any) {
      logger.error(
        `Failed to send ticket confirmation email for user ${user.email}:`,
        error,
      );
      throw error;
    }
  });
};

export const sendSecurityNotificationWorkflow = async (
  context: WorkflowContext<{
    user: { id: string; name: string; email: string };
    action: string;
    description?: string;
    ipAddress?: string;
    userAgent?: string;
    timestamp?: string;
  }>,
) => {
  const payload = context.requestPayload;
  if (!payload) return;

  await context.run("log-security-event", async () => {
    logger.warn(
      {
        user: payload.user.email,
        action: payload.action,
        ip: payload.ipAddress,
        userAgent: payload.userAgent,
        timestamp: payload.timestamp,
      },
      `Security event: ${payload.description || payload.action}`,
    );
  });
};

export const sendTicketAssignedWorkflow = async (
  context: WorkflowContext<{
    userId: string;
    ticketId: string;
    title: string;
  }>,
) => {
  const payload = context.requestPayload;
  if (!payload) return;
  const user = await getUserPayload(payload.userId);
  if (!user) return;

  await context.run("send-ticket-assigned-email", async () => {
    try {
      await emailService.sendTicketAssignedEmail({
        user,
        ticketId: payload.ticketId,
        title: payload.title,
      });
    } catch (error: any) {
      logger.error(
        `Failed to send ticket assigned email for user ${user.email}:`,
        error,
      );
      throw error;
    }
  });
};

export const sendTicketResolvedWorkflow = async (
  context: WorkflowContext<{
    userId: string;
    ticketId: string;
    title: string;
  }>,
) => {
  const payload = context.requestPayload;
  if (!payload) return;
  const user = await getUserPayload(payload.userId);
  if (!user) return;

  await context.run("send-ticket-resolved-email", async () => {
    try {
      await emailService.sendTicketResolvedEmail({
        user,
        ticketId: payload.ticketId,
        title: payload.title,
      });
    } catch (error: any) {
      logger.error(
        `Failed to send ticket resolved email for user ${user.email}:`,
        error,
      );
      throw error;
    }
  });
};

