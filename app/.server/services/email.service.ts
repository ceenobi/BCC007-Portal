import { sendEmail } from "../config/email";
import { env } from "../config/keys";
import type { User } from "../services/better-auth";
import {
  forgotPasswordTemplate,
  InvitationCodeTemplate,
  passwordResetSuccessTemplate,
  verifyAccountTemplate,
  eventCreatedTemplate,
  paymentConfirmationTemplate,
  emailChangeConfirmationTemplate,
  transferNotificationTemplate,
  contactOwnerTemplate,
  contactConfirmationTemplate,
  ticketConfirmationTemplate,
  ticketAssignedTemplate,
  ticketResolvedTemplate,
  deleteAccountRequestTemplate,
  birthdayReminderTemplate,
} from "../utils/email-templates";

const emailService = {
  sendVerificationEmail: async ({
    user,
    link,
  }: {
    user: User;
    link: string;
  }) => {
    const htmlBody = verifyAccountTemplate(user.name, link);
    await sendEmail({
      email: user.email,
      subject: "Verify your account",
      message: htmlBody,
    });
  },
  sendInviteCodeEmail: async ({
    user,
    inviteCode,
    link,
  }: {
    user: User;
    inviteCode: string;
    link: string;
  }) => {
    const htmlBody = InvitationCodeTemplate(inviteCode, link);
    await sendEmail({
      email: user.email,
      subject: "Invitation Code",
      message: htmlBody,
    });
  },
  sendForgotPasswordEmail: async ({
    user,
    link,
  }: {
    user: User;
    link: string;
  }) => {
    const htmlBody = forgotPasswordTemplate(user.name, link);
    await sendEmail({
      email: user.email,
      subject: "Forgot your password",
      message: htmlBody,
    });
  },
  sendPasswordResetSuccessEmail: async ({ user }: { user: User }) => {
    const htmlBody = passwordResetSuccessTemplate(user.name);
    await sendEmail({
      email: user.email,
      subject: "Password reset successful",
      message: htmlBody,
    });
  },
  sendEventCreatedEmail: async ({
    user,
    event,
  }: {
    user: User;
    event: any;
  }) => {
    const htmlBody = eventCreatedTemplate(user.name, event);
    await sendEmail({
      email: user.email,
      subject: "Event Created",
      message: htmlBody,
    });
  },
  sendPaymentConfirmationEmail: async ({
    user,
    data,
  }: {
    user: User;
    data: {
      amount: number;
      reference: string;
      paymentType: string;
      date: Date;
    };
  }) => {
    const htmlBody = paymentConfirmationTemplate(user.name, data);
    await sendEmail({
      email: user.email,
      subject: "Payment Confirmed",
      message: htmlBody,
    });
  },
  sendEmailChangeConfirmationEmail: async ({
    user,
    newEmail,
  }: {
    user: User;
    newEmail: string;
  }) => {
    const htmlBody = emailChangeConfirmationTemplate(user.name, newEmail);
    await sendEmail({
      email: user.email,
      subject: "Email Change Requested",
      message: htmlBody,
    });
  },
  sendTransferNotificationEmail: async ({
    user,
    data,
  }: {
    user: User;
    data: {
      amount: number;
      reference: string;
      date: Date;
      status: string;
    };
  }) => {
    const htmlBody = transferNotificationTemplate(user.name, data);
    await sendEmail({
      email: user.email,
      subject:
        data.status === "success" ? "Transfer Received" : "Transfer Update",
      message: htmlBody,
    });
  },
  sendContactOwnerEmail: async ({
    data,
  }: {
    data: {
      fullname: string;
      email: string;
      subject: string;
      message: string;
    };
  }) => {
    const htmlBody = contactOwnerTemplate(data);
    await sendEmail({
      email: env.emailUser || "charlesmutob@gmail.com",
      subject: `New Contact Message: ${data.subject}`,
      message: htmlBody,
    });
  },
  sendContactConfirmationEmail: async ({
    data,
  }: {
    data: {
      fullname: string;
      email: string;
      subject: string;
      message: string;
    };
  }) => {
    const htmlBody = contactConfirmationTemplate(data);
    await sendEmail({
      email: data.email,
      subject: "We've received your message",
      message: htmlBody,
    });
  },
  sendTicketConfirmationEmail: async ({
    user,
    ticketId,
    title,
    description,
    priority,
  }: {
    user: User;
    ticketId: string;
    title: string;
    description: string;
    priority: string;
  }) => {
    const htmlBody = ticketConfirmationTemplate(
      user.name,
      ticketId,
      title,
      description,
      priority,
    );
    await sendEmail({
      email: user.email,
      subject: `Ticket Confirmation - ${ticketId}`,
      message: htmlBody,
    });
  },
  sendTicketAssignedEmail: async ({
    user,
    ticketId,
    title,
  }: {
    user: User;
    ticketId: string;
    title: string;
  }) => {
    const htmlBody = ticketAssignedTemplate(user.name, ticketId, title);
    await sendEmail({
      email: user.email,
      subject: `Ticket Assigned - ${ticketId}`,
      message: htmlBody,
    });
  },
  sendTicketResolvedEmail: async ({
    user,
    ticketId,
    title,
  }: {
    user: User;
    ticketId: string;
    title: string;
  }) => {
    const htmlBody = ticketResolvedTemplate(user.name, ticketId, title);
    await sendEmail({
      email: user.email,
      subject: `Ticket Resolved - ${ticketId}`,
      message: htmlBody,
    });
  },
  sendDeleteAccountRequestEmail: async ({
    user,
    link,
  }: {
    user: User;
    link: string;
  }) => {
    const htmlBody = deleteAccountRequestTemplate(user.name, link);
    await sendEmail({
      email: user.email,
      subject: "Delete Account Request",
      message: htmlBody,
    });
  },
  sendBirthdayReminderEmail: async ({
    user,
    age,
  }: {
    user: User;
    age: number;
  }) => {
    const htmlBody = birthdayReminderTemplate(user.name, age);
    await sendEmail({
      email: user.email,
      subject: `Happy Birthday, ${user.name}!`,
      message: htmlBody,
    });
  },

};

export default emailService;
