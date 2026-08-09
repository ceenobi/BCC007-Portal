import { serveMany } from "@upstash/workflow/react-router";

export const action = async (args: any) => {
  const { createWorkflow } = await import("@upstash/workflow/react-router");
  const { workflowClient } = await import("~/.server/workflows/client");
  const {
    sendInvitationCodeWorkflow,
    sendVerifyAccountWorkflow,
    sendPasswordResetSuccessWorkflow,
    sendPasswordResetWorkflow,
    sendEventCreatedWorkflow,
    sendEmailChangeConfirmationWorkflow,
    sendContactMessageWorkflow,
    sendDeleteAccountRequestWorkflow,
    sendBirthdayReminderWorkflow,
  } = await import("~/.server/workflows/email.workflow");
  const { runStatusUpdatesWorkflow } =
    await import("~/.server/workflows/status.workflow");
  const { runBirthdayRemindersWorkflow } =
    await import("~/.server/workflows/birthday.workflow");
  const { runDashboardRefreshWorkflow } =
    await import("~/.server/workflows/dashboard.workflow");
  const { sendPaymentConfirmationWorkflow } =
    await import("~/.server/workflows/payment.workflow");
  const { runSubscriptionSyncWorkflow } =
    await import("~/.server/workflows/subscription-sync.workflow");
  const { runTransferSyncWorkflow, sendTransferNotificationWorkflow } =
    await import("~/.server/workflows/transfer.workflow");
  const {
    sendTicketAssignedWorkflow,
    sendTicketConfirmationWorkflow,
    sendTicketResolvedWorkflow,
    sendSecurityNotificationWorkflow,
  } = await import("~/.server/workflows/notification.workflow");
  const handler = serveMany(
    {
      "invitation-code": createWorkflow(sendInvitationCodeWorkflow),
      "verify-account": createWorkflow(sendVerifyAccountWorkflow),
      "password-reset": createWorkflow(sendPasswordResetWorkflow),
      "password-reset-success": createWorkflow(
        sendPasswordResetSuccessWorkflow,
      ),
      "event-created": createWorkflow(sendEventCreatedWorkflow),
      "email-change-confirmation": createWorkflow(
        sendEmailChangeConfirmationWorkflow,
      ),
      "run-status-updates": createWorkflow(runStatusUpdatesWorkflow),
      "run-birthday-reminders": createWorkflow(runBirthdayRemindersWorkflow),
      "birthday-reminder": createWorkflow(sendBirthdayReminderWorkflow),
      "run-dashboard-refresh": createWorkflow(runDashboardRefreshWorkflow),
      "payment-confirmation": createWorkflow(sendPaymentConfirmationWorkflow),
      "run-subscription-sync": createWorkflow(runSubscriptionSyncWorkflow),
      "run-transfer-sync": createWorkflow(runTransferSyncWorkflow),
      "transfer-notification": createWorkflow(sendTransferNotificationWorkflow),
      "contact-message": createWorkflow(sendContactMessageWorkflow),
      "delete-account-request": createWorkflow(
        sendDeleteAccountRequestWorkflow,
      ),
      "ticket-confirmation": createWorkflow(sendTicketConfirmationWorkflow),
      "ticket-assigned": createWorkflow(sendTicketAssignedWorkflow),
      "ticket-resolved": createWorkflow(sendTicketResolvedWorkflow),
      "security-notification": createWorkflow(sendSecurityNotificationWorkflow),
    },
    { qstashClient: workflowClient as any },
  );

  return handler(args);
};

export const loader = action;
