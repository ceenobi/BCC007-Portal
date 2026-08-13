const baseLayout = (
  title: string,
  name: string,
  content: string,
  actionLink?: string,
  actionText?: string,
  expiryText?: string,
) => `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <title>${title} - BCC007 Portal</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

          body {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f8fafc;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }

          .wrapper {
            width: 100%;
            table-layout: fixed;
            background-color: #f8fafc;
            padding: 48px 0;
          }

          .container {
            width: 100%;
            max-width: 600px;
            background-color: #ffffff;
            margin: 0 auto;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
            border: 1px solid #e2e8f0;
          }

          .header {
            background-color: #ffffff;
            padding: 40px 40px 20px;
            text-align: left;
            border-bottom: 1px solid #f1f5f9;
          }

          .logo-text {
            font-size: 20px;
            font-weight: 800;
            color: #1e1b4b;
            letter-spacing: -0.02em;
            display: flex;
            align-items: center;
          }

          .content {
            padding: 40px;
            color: #334155;
          }

          .title {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 24px;
            color: #0f172a;
            letter-spacing: -0.02em;
          }

          .welcome-text {
            font-size: 16px;
            font-weight: 600;
            color: #6366f1;
            margin-bottom: 12px;
          }

          .text {
            font-size: 15px;
            line-height: 1.6;
            margin-bottom: 32px;
            color: #475569;
          }

          .button-container {
            margin: 32px 0;
          }

          .button {
            background-color: #6366f1;
            color: #ffffff !important;
            padding: 12px 24px;
            border-radius: 10px;
            text-decoration: none;
            font-weight: 600;
            font-size: 15px;
            display: inline-block;
            transition: background-color 0.2s;
          }

          .expiry-text {
            font-size: 13px;
            color: #94a3b8;
            margin-top: 16px;
            font-style: italic;
          }

          .divider {
            height: 1px;
            background-color: #f1f5f9;
            margin: 40px 0;
          }

          .footer {
            padding: 0 40px 40px;
            text-align: left;
            color: #94a3b8;
            font-size: 12px;
          }

          .footer-links {
            margin-bottom: 20px;
          }

          .footer-link {
            color: #64748b;
            text-decoration: none;
            margin-right: 16px;
            font-weight: 500;
          }

          .footer-link:hover {
            color: #6366f1;
          }

          @media only screen and (max-width: 640px) {
            .wrapper {
              padding: 20px 0;
            }
            .container {
              border-radius: 0;
              border-left: none;
              border-right: none;
            }
            .content, .header, .footer {
              padding-left: 24px;
              padding-right: 24px;
            }
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <div class="logo-text">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18" style="color: #6366f1; margin-right: 8px; vertical-align: middle;"><path d="M5.23379 7.72989C6.65303 5.48625 9.15342 4 12.0002 4C14.847 4 17.3474 5.48625 18.7667 7.72989L20.4569 6.66071C18.6865 3.86199 15.5612 2 12.0002 2C8.43928 2 5.31393 3.86199 3.54356 6.66071L5.23379 7.72989ZM12.0002 20C9.15342 20 6.65303 18.5138 5.23379 16.2701L3.54356 17.3393C5.31393 20.138 8.43928 22 12.0002 22C15.5612 22 18.6865 20.138 20.4569 17.3393L18.7667 16.2701C17.3474 18.5138 14.847 20 12.0002 20ZM12 12C13.6569 12 15 10.6569 15 9C15 7.34315 13.6569 6 12 6C10.3431 6 9 7.34315 9 9C9 10.6569 10.3431 12 12 12ZM12 13C14.2091 13 16 14.7909 16 17H8C8 14.7909 9.79086 13 12 13ZM6 12C6 13.6569 4.65685 15 3 15C1.34315 15 0 13.6569 0 12C0 10.3431 1.34315 9 3 9C4.65685 9 6 10.3431 6 12ZM21 15C22.6569 15 24 13.6569 24 12C24 10.3431 22.6569 9 21 9C19.3431 9 18 10.3431 18 12C18 13.6569 19.3431 15 21 15Z"></path></svg>
                BCC007 Portal
              </div>
            </div>
            <div class="content">
              <h1 class="title">${title}</h1>
              <p class="welcome-text">Hello ${name},</p>
              <div class="text">${content}</div>

              ${
                actionLink
                  ? `
                <div class="button-container">
                  <a href="${actionLink}" class="button">${actionText || "Confirm Action"}</a>
                </div>
              `
                  : ""
              }

              ${expiryText ? `<p class="expiry-text">${expiryText}</p>` : ""}

              <div class="divider"></div>

              <p style="font-size: 13px; color: #94a3b8; line-height: 1.5; margin: 0;">
                If you didn't request this email, you can safely ignore it. Your account security is our priority.
              </p>
            </div>
            <div class="footer">
              <div class="footer-links">
                <a href="/support/guide" class="footer-link">Support</a>
                <a href="/privacy" class="footer-link">Privacy Policy</a>
                <a href="/terms" class="footer-link">Terms of Service</a>
              </div>
              <p style="margin-bottom: 8px;">© ${new Date().getFullYear()} BCC007 Portal. All rights reserved.</p>
              <p>Crafting unique experiences for BCC007 students.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

export const verifyAccountTemplate = (name: string, link: string) =>
  baseLayout(
    "Verify Your Email",
    name,
    "Welcome to BCC007 Portal! We're thrilled to have you join our platform. To ensure the security of your account, please verify your email address to complete your registration.",
    link,
    "Verify Email Address",
    "This link will expire in 15 minutes for your security.",
  );

export const InvitationCodeTemplate = (code: string, link: string) =>
  baseLayout(
    "Platform Invite",
    "Hello",
    `You have been invited to join the BCC007 Alumni Platform. Use the code below during your registration process.<br/><br/>
     <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0;">
       <span style="font-family: monospace; font-size: 24px; font-weight: 700; color: #0f172a; letter-spacing: 4px;">${code}</span>
     </div>
     Click the button below to get started. Code expires after 24 hours.`,
    link,
    "Join Platform",
  );

export const forgotPasswordTemplate = (
  name: string,
  resetPasswordLink: string,
) =>
  baseLayout(
    "Reset Password",
    name,
    "We received a request to reset your password. If this was you, please use the button below to proceed with your reset.",
    resetPasswordLink,
    "Reset Password",
    "This link will expire in 15 minutes for your security.",
  );

export const passwordResetSuccessTemplate = (name: string) =>
  baseLayout(
    "Password Reset Successful",
    name,
    "Your password has been successfully reset. You can now log in using your new credentials.<br/><br/>If you did not request this change, please contact our support team immediately.",
  );

export const eventCreatedTemplate = (name: string, event: any) =>
  baseLayout(
    "Event Created",
    name,
    `Your event "${event.title}" has been successfully created.<br/><br/> You can now view and manage your event on the platform.`,
  );

export const announcementTemplate = (name: string, announcement: any) =>
  baseLayout(
    "New Announcement",
    name,
    `${announcement.title}<br/><br/>${announcement.content.replace(/\n/g, "<br/>")}`,
    "/dashboard/announcements",
    "View Announcement",
  );

export const paymentConfirmationTemplate = (
  name: string,
  data: {
    amount: number;
    reference: string;
    paymentType: string;
    date: Date;
  },
) => {
  const formattedAmount = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
  }).format(data.amount);
  const paymentTypeLabel = data.paymentType.replace(/_/g, " ").toUpperCase();
  const formattedDate = data.date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const receiptContent = `
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 24px 0;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 16px; gap: 8px">
        <span style="font-size: 14px; color: #64748b;">Payment Type</span>
        <span style="font-size: 14px; font-weight: 600; color: #0f172a;">${paymentTypeLabel}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 16px; gap: 8px">
        <span style="font-size: 14px; color: #64748b;">Amount</span>
        <span style="font-size: 18px; font-weight: 700; color: #0f172a;">${formattedAmount}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 16px; gap: 8px">
        <span style="font-size: 14px; color: #64748b;">Reference</span>
        <span style="font-size: 14px; font-weight: 600; color: #0f172a; font-family: monospace;">${data.reference}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 16px; gap: 8px">
        <span style="font-size: 14px; color: #64748b;">Date</span>
        <span style="font-size: 14px; font-weight: 600; color: #0f172a;">${formattedDate}</span>
      </div>
      <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center;">
        <span style="display: inline-block; background-color: #dcfce7; color: #166534; font-size: 13px; font-weight: 600; padding: 6px 12px; border-radius: 6px;">✓ Payment Confirmed</span>
      </div>
    </div>
    Your payment has been received and confirmed successfully. Thank you for your support — every contribution helps the BCC007 community.
  `;

  return baseLayout(
    "Payment Confirmed",
    name,
    receiptContent,
    "/dashboard/payments",
    "View Payments",
  );
};

export const emailChangeConfirmationTemplate = (
  name: string,
  newEmail: string,
) =>
  baseLayout(
    "Email Change Requested",
    name,
    `We received a request to change the email address on your BCC007 account to <strong>${newEmail}</strong>.<br/><br/>If this was you, no further action is needed — your email will be updated once the change is verified.<br/><br/>If you did not request this change, please contact our support team immediately to secure your account.`,
  );

export const transferNotificationTemplate = (
  name: string,
  data: {
    amount: number;
    reference: string;
    date: Date;
    status: string;
  },
) => {
  const formattedAmount = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
  }).format(data.amount);
  const formattedDate = data.date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const isSuccess = data.status === "success";
  const badgeBg = isSuccess ? "#dcfce7" : "#fee2e2";
  const badgeColor = isSuccess ? "#166534" : "#991b1b";
  const badgeText = isSuccess ? "✓ Transfer Completed" : "Transfer Update";

  const content = `
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 24px 0;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 16px; gap: 8px">
        <span style="font-size: 14px; color: #64748b;">Amount</span>
        <span style="font-size: 18px; font-weight: 700; color: #0f172a;">${formattedAmount}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 16px; gap: 8px">
        <span style="font-size: 14px; color: #64748b;">Reference</span>
        <span style="font-size: 14px; font-weight: 600; color: #0f172a; font-family: monospace;">${data.reference}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 16px; gap: 8px">
        <span style="font-size: 14px; color: #64748b;">Date</span>
        <span style="font-size: 14px; font-weight: 600; color: #0f172a;">${formattedDate}</span>
      </div>
      <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center;">
        <span style="display: inline-block; background-color: ${badgeBg}; color: ${badgeColor}; font-size: 13px; font-weight: 600; padding: 6px 12px; border-radius: 6px;">${badgeText}</span>
      </div>
    </div>
    ${
      isSuccess
        ? "Your transfer has been processed and sent to your bank account successfully."
        : "There was an issue processing your transfer. Please check your bank account or contact support."
    }
  `;

  return baseLayout(
    isSuccess ? "Transfer Received" : "Transfer Update",
    name,
    content,
    "/dashboard/settings/account",
    "View Account",
  );
};

export const contactOwnerTemplate = (data: {
  fullname: string;
  email: string;
  subject: string;
  message: string;
}) => {
  const content = `
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 16px; gap: 8px">
        <span style="font-size: 14px; color: #64748b;">From</span>
        <span style="font-size: 14px; font-weight: 600; color: #0f172a;">${data.fullname}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 16px; gap: 8px">
        <span style="font-size: 14px; color: #64748b;">Email</span>
        <span style="font-size: 14px; font-weight: 600; color: #0f172a;">${data.email}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 16px; gap: 8px">
        <span style="font-size: 14px; color: #64748b;">Subject</span>
        <span style="font-size: 14px; font-weight: 600; color: #0f172a;">${data.subject}</span>
      </div>
      <div style="border-top: 1px solid #e2e8f0; padding-top: 16px;">
        <p style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0; white-space: pre-line;">${data.message}</p>
      </div>
    </div>
  `;

  return baseLayout(
    "New Contact Message",
    "BCC007 Team",
    content,
  );
};

export const contactConfirmationTemplate = (data: {
  fullname: string;
  subject: string;
}) => {
  const content = `Thank you for reaching out regarding "<strong>${data.subject}</strong>".<br/><br/>We have received your message and our team will get back to you as soon as possible.<br/><br/>If you have any additional details to share, simply reply to this email or visit our contact page.`;

  return baseLayout(
    "We've Received Your Message",
    data.fullname,
    content,
    "/contact",
    "Contact Us",
  );
};

export const ticketConfirmationTemplate = (
  name: string,
  ticketId: string,
  title: string,
  description: string,
  priority: string,
) =>
  baseLayout(
    "Support Ticket Confirmation",
    name,
    `Your support ticket has been created successfully. Here's a summary of your request:<br/><br/>
     <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; margin: 24px 0; text-align: left;">
       <p style="margin: 4px 0;"><strong>Ticket ID:</strong> ${ticketId}</p>
       <p style="margin: 4px 0;"><strong>Title:</strong> ${title}</p>
       <p style="margin: 4px 0;"><strong>Priority:</strong> ${priority}</p>
       <p style="margin: 4px 0;"><strong>Description:</strong> ${description}</p>
     </div>
     Our support team will review your ticket and get back to you as soon as possible. You can track the status of your ticket in the Help Desk section.`,
  );

export const ticketAssignedTemplate = (
  name: string,
  ticketId: string,
  title: string,
) =>
  baseLayout(
    "Ticket Assigned",
    name,
    `A support ticket has been assigned to you. Here's the details:<br/><br/>
     <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; margin: 24px 0; text-align: left;">
       <p style="margin: 4px 0;"><strong>Ticket ID:</strong> ${ticketId}</p>
       <p style="margin: 4px 0;"><strong>Title:</strong> ${title}</p>
     </div>
     Please review and take the appropriate action.`,
  );

export const ticketResolvedTemplate = (
  name: string,
  ticketId: string,
  title: string,
) =>
  baseLayout(
    "Ticket Resolved",
    name,
    `Your support ticket has been marked as resolved. Here's a summary:<br/><br/>
     <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; margin: 24px 0; text-align: left;">
       <p style="margin: 4px 0;"><strong>Ticket ID:</strong> ${ticketId}</p>
       <p style="margin: 4px 0;"><strong>Title:</strong> ${title}</p>
     </div>
     If you have any further questions, please create a new ticket.`,
  );

export const deleteAccountRequestTemplate = (name: string, link: string) =>
  baseLayout(
    "Delete Account Request",
    name,
    "We received a request to delete your account. If this was you, please use the button below to proceed with your deletion.",
    link,
    "Delete Account",
    "This link will expire in 15 minutes for your security.",
  );

export const birthdayReminderTemplate = (name: string, age: number) =>
  baseLayout(
    "Happy Birthday",
    name,
    `Today is your special day, <strong>${name}</strong>!<br/><br/>
     On behalf of the entire BCC007 community, we want to wish you a very happy ${age}th birthday and a year filled with joy, health, and success.<br/><br/>
     We're grateful to have you as part of the family — thank you for all you contribute to our community.<br/><br/>
     Enjoy your day to the fullest!`,
    "/dashboard",
    "Visit Dashboard",
  );