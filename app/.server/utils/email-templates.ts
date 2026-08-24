import { env } from "../config/keys";
import type { IAnnouncement } from "../models/announcement";
import type { IEvent } from "../models/event";

const absoluteUrl = (path: string) =>
	path.startsWith("http") ? path : `${env.clientUrl}${path}`;

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

          :root {
            --bg: #f8fafc;
            --card: #ffffff;
            --primary: #1e1b4b;
            --primary-accent: #6366f1;
            --muted: #64748b;
            --text: #0f172a;
            --border: #e2e8f0;
            --success: #16a34a;
            --warning: #f59e0b;
          }

          body {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: var(--bg);
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }

          .wrapper {
            width: 100%;
            table-layout: fixed;
            background-color: var(--bg);
            padding: 40px 0;
          }

          .container {
            width: 100%;
            max-width: 600px;
            background-color: var(--card);
            margin: 0 auto;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.05);
            border: 1px solid var(--border);
          }

          .header {
            background: linear-gradient(135deg, var(--primary), #2563eb);
            padding: 48px 32px;
            text-align: left;
            position: relative;
          }

          .header::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: rgba(255, 255, 255, 0.2);
          }

          .logo-container {
            text-align: center;
            margin-bottom: 24px;
          }

          .logo-img {
            width: 48px;
            height: 48px;
            margin: 0 auto;
            filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
          }

          .logo-text {
            font-size: 24px;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: -0.02em;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .content {
            padding: 48px 32px;
            color: var(--text);
          }

          .title {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 20px;
            color: var(--text);
            letter-spacing: -0.02em;
          }

          .welcome-text {
            font-size: 16px;
            font-weight: 600;
            color: #4f46e5;
            margin-bottom: 16px;
          }

          .text {
            font-size: 15px;
            line-height: 1.7;
            margin-bottom: 24px;
            color: var(--muted);
          }

          .button-container {
            margin: 32px 0;
            text-align: center;
          }

          .button {
            background-color: #4f46e5;
            color: #ffffff !important;
            padding: 14px 28px;
            border-radius: 12px;
            text-decoration: none;
            font-weight: 600;
            font-size: 15px;
            display: inline-block;
            transition: background-color 0.2s;
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
          }

          .button:hover {
            background-color: #4338ca;
          }

          .expiry-text {
            font-size: 12px;
            color: var(--muted);
            margin-top: 16px;
            font-style: italic;
          }

          .divider {
            height: 1px;
            background-color: var(--border);
            margin: 32px 0;
          }

          .footer {
            padding: 32px 32px 24px;
            text-align: left;
            color: var(--muted);
            font-size: 12px;
          }

          .footer-links {
            margin-bottom: 24px;
          }

          .footer-link {
            color: #475569;
            text-decoration: none;
            margin-right: 16px;
            font-weight: 500;
            transition: color 0.2s;
          }

          .footer-link:hover {
            color: #4f46e5;
          }

          @media only screen and (max-width: 640px) {
            .wrapper {
              padding: 24px 0;
            }
            .container {
              border-radius: 16px;
            }
            .header {
              padding: 32px 24px;
            }
            .content {
              padding: 32px 24px;
            }
            .title {
              font-size: 24px;
            }
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <div class="logo-container">
                <img src="https://res.cloudinary.com/ceenobi/image/upload/e_background_removal/q_auto:best/v1785307622/bcc007portal/Gemini_Generated_Image_s6h7lfs6h7lfs6h7_pfzmnk.png" alt="BCC007 Portal" class="logo-img" style="width: 48px; height: 48px;">
                <span class="logo-text">BCC007 Portal</span>
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
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                    <tr>
                      <td align="center" bgcolor="#4f46e5" style="border-radius: 12px; background-color: #4f46e5;">
                        <a href="${absoluteUrl(actionLink)}" target="_blank" class="button" style="display: inline-block; padding: 14px 28px; font-family: 'Plus Jakarta Sans', Arial, sans-serif; font-size: 15px; font-weight: 600; color: #ffffff !important; text-decoration: none; border-radius: 12px; background-color: #4f46e5;">${actionText || "Confirm Action"}</a>
                      </td>
                    </tr>
                  </table>
                </div>
              `
									: ""
							}

              ${expiryText ? `<p class="expiry-text">${expiryText}</p>` : ""}

              <div class="divider"></div>

              <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 0;">
                If you didn't request this email, you can safely ignore it. Your account security is our priority.
              </p>
            </div>
            <div class="footer">
              <div class="footer-links">
                <a href="${absoluteUrl("/support/guide")}" class="footer-link" style="color: #475569; text-decoration: none; margin-right: 16px; font-weight: 500;">Support</a>
                <a href="${absoluteUrl("/privacy")}" class="footer-link" style="color: #475569; text-decoration: none; margin-right: 16px; font-weight: 500;">Privacy Policy</a>
                <a href="${absoluteUrl("/terms")}" class="footer-link" style="color: #475569; text-decoration: none; margin-right: 16px; font-weight: 500;">Terms of Service</a>
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
		"Member",
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

export const eventCreatedTemplate = (name: string, event: IEvent) =>
	baseLayout(
		"Event Created",
		name,
		`Your event "${event.title}" has been successfully created.<br/><br/> You can now view and manage your event on the platform.`,
	);

export const announcementTemplate = (
	name: string,
	announcement: IAnnouncement,
) =>
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

	return baseLayout("New Contact Message", "BCC007 Team", content);
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
