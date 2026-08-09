import { WorkflowContext } from "@upstash/workflow";
import logger from "../config/logger.js";
import type { User } from "../services/better-auth";
import { NotificationService } from "../services/notification.service.js";
import emailService from "../services/email.service";

interface EmailPayload {
  user: User;
  link: string;
}

export const sendInvitationCodeWorkflow = async (
  context: WorkflowContext<{
    user: User;
    inviteCode: string;
    link: string;
  }>,
) => {
  const payload = context.requestPayload;
  if (!payload) {
    logger.error("No requestPayload received in sendMemberInvitationWorkflow");
    return;
  }
  const { user, inviteCode, link } = payload;

  await context.run("send-invitation-email", async () => {
    try {
      await emailService.sendInviteCodeEmail({
        user,
        inviteCode,
        link,
      });
    } catch (error: any) {
      logger.error(
        `Workflow failed to send invitation email for user ${user.email}:`,
        error,
      );
      throw error;
    }
  });
};

export const sendVerifyAccountWorkflow = async (
  context: WorkflowContext<EmailPayload>,
) => {
  const payload = context.requestPayload;
  if (!payload) {
    logger.error("No requestPayload received in sendVerifyAccountWorkflow");
    return;
  }
  const { user, link } = payload;

  await context.run("send-email", async () => {
    try {
      await emailService.sendVerificationEmail({ user, link });
    } catch (error: any) {
      logger.error(
        `Workflow failed to send email for user ${user.email}:`,
        error,
      );
      throw error;
    }
  });
};

export const sendPasswordResetWorkflow = async (
  context: WorkflowContext<EmailPayload>,
) => {
  const payload = context.requestPayload;
  if (!payload) {
    logger.error("No requestPayload received in sendPasswordResetWorkflow");
    return;
  }
  const { user, link } = payload;

  await context.run("send-password-reset-email", async () => {
    try {
      await emailService.sendForgotPasswordEmail({
        user,
        link,
      });
    } catch (error: any) {
      logger.error(
        `Workflow failed to send password reset email for user ${user.email}:`,
        error,
      );
      throw error;
    }
  });
};

export const sendPasswordResetSuccessWorkflow = async (
  context: WorkflowContext<{ user: User }>,
) => {
  const payload = context.requestPayload;
  if (!payload) {
    logger.error(
      "No requestPayload received in sendPasswordResetSuccessWorkflow",
    );
    return;
  }
  const { user } = payload;

  await context.run("send-password-reset-success-email", async () => {
    try {
      await emailService.sendPasswordResetSuccessEmail({ user });
    } catch (error: any) {
      logger.error(
        `Workflow failed to send password reset success email for user ${user.email}:`,
        error,
      );
      throw error;
    }
  });
};

export const sendEventCreatedWorkflow = async (
  context: WorkflowContext<{
    user: User;
    event: {
      _id: string;
      title: string;
      detail: string;
      location: string;
      date: Date;
      time: string;
      eventType: "party" | "meeting" | "birthday" | "other";
    };
  }>,
) => {
  const payload = context.requestPayload;
  if (!payload) {
    logger.error(
      "No requestPayload received in sendEventCreatedWorkflow",
    );
    return;
  }
  const { user, event } = payload;

  await context.run("send-event-created-email", async () => {
    try {
      await emailService.sendEventCreatedEmail({ user, event });
    } catch (error: any) {
      logger.error(
        `Workflow failed to send event created email for user ${user.email}:`,
        error,
      );
      throw error;
    }
  });
};

export const sendEmailChangeConfirmationWorkflow = async (
  context: WorkflowContext<{ user: User; newEmail: string }>,
) => {
  const payload = context.requestPayload;
  if (!payload) {
    logger.error(
      "No requestPayload received in sendEmailChangeConfirmationWorkflow",
    );
    return;
  }
  const { user, newEmail } = payload;

  await context.run("send-email-change-confirmation-email", async () => {
    try {
      await emailService.sendEmailChangeConfirmationEmail({
        user,
        newEmail,
      });
    } catch (error: any) {
      logger.error(
        `Workflow failed to send email change confirmation for user ${user.email}:`,
        error,
      );
      throw error;
    }
  });
};

interface ContactMessagePayload {
  fullname: string;
  email: string;
  subject: string;
  message: string;
}

export const sendContactMessageWorkflow = async (
  context: WorkflowContext<ContactMessagePayload>,
) => {
  const payload = context.requestPayload;
  if (!payload) {
    logger.error("No requestPayload received in sendContactMessageWorkflow");
    return;
  }

  await context.run("send-contact-owner-email", async () => {
    try {
      await emailService.sendContactOwnerEmail({ data: payload });
    } catch (error: any) {
      logger.error(
        `Workflow failed to send contact message from ${payload.email}:`,
        error,
      );
      throw error;
    }
  });

  await context.run("send-contact-confirmation-email", async () => {
    try {
      await emailService.sendContactConfirmationEmail({ data: payload });
    } catch (error: any) {
      logger.error(
        `Workflow failed to send contact confirmation to ${payload.email}:`,
        error,
      );
      throw error;
    }
  });
};

export const sendDeleteAccountRequestWorkflow = async (
  context: WorkflowContext<{
    user: User;
    link: string;
  }>,
) => {
  const payload = context.requestPayload;
  if (!payload) {
    logger.error(
      "No requestPayload received in sendDeleteAccountRequestWorkflow",
    );
    return;
  }
  const { user, link } = payload;

  await context.run("send-delete-account-request-email", async () => {
    try {
      await emailService.sendDeleteAccountRequestEmail({ user, link });
    } catch (error: any) {
      logger.error(
        `Workflow failed to send delete account request email for user ${user.email}:`,
        error,
      );
      throw error;
    }
  });
};

interface BirthdayReminderPayload {
  user: {
    _id: string;
    name: string;
    email: string;
    disableEmail: boolean;
  };
  age: number;
}

/**
 * Sends a birthday reminder to a member: an email (unless they disabled email)
 * plus an in-app notification. Shared by the manual "Remind" action and the
 * scheduled daily sweep — both trigger with a deterministic workflowRunId
 * (`birthday-reminder:${userId}:${YYYY-MM-DD}`) so QStash dedupes them.
 */
export const sendBirthdayReminderWorkflow = async (
  context: WorkflowContext<BirthdayReminderPayload>,
) => {
  const payload = context.requestPayload;
  if (!payload) {
    logger.error("No requestPayload received in sendBirthdayReminderWorkflow");
    return;
  }
  const { user, age } = payload;

  if (!user.disableEmail) {
    await context.run("send-birthday-email", async () => {
      try {
        await emailService.sendBirthdayReminderEmail({
          user: { ...user } as unknown as User,
          age,
        });
      } catch (error: any) {
        logger.error(
          `Workflow failed to send birthday email for user ${user.email}:`,
          error,
        );
        throw error;
      }
    });
  }

  await context.run("send-birthday-notification", async () => {
    try {
      await NotificationService.send({
        userId: user._id,
        type: "birthday_reminder",
        title: "Happy Birthday!",
        message: `Wishing you a very happy ${age}th birthday, ${user.name}!`,
        metadata: { age },
      });
    } catch (error: any) {
      logger.error(
        `Workflow failed to send birthday notification for user ${user.email}:`,
        error,
      );
      throw error;
    }
  });
};

