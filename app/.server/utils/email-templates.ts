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
          /* App theme — app/app.css */
          :root {
            --bg: #f3f4f6;
            --card: #ffffff;
            --ink: #030303;
            --bgDark: #131413;
            --mainBlue: #0c2c4a;
            --lightBlue: #3b82f6;
            --muted: #696969;
            --lightGray: #181a18;
            --border: #e5e7eb;
            --border-strong: #e2e8f0;
            --text: #0f172a;
            --subtle: #64748b;
            --success: #16a34a;
            --warning: #d97706;
            --brandOrange: #ff4d00;
          }
          body {
            font-family: 'Inter Variable', Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background-color: var(--bg);
            margin: 0; padding: 0;
            -webkit-font-smoothing: antialiased;
            -webkit-text-size-adjust: 100%;
          }
          .wrapper {
            width: 100%;
            background-color: var(--bg);
            padding: 16px 12px;
          }
          .container {
            width: 100%;
            max-width: 520px;
            background-color: var(--card);
            margin: 0 auto;
            border-radius: 14px;
            overflow: hidden;
            border: 1px solid var(--border);
            box-shadow: 0 4px 16px rgba(3,3,3,0.06), 0 1px 4px rgba(3,3,3,0.04);
          }
          /* compact header — minimal gap to content — hardcoded hex for email clients (no CSS vars) */
          .header {
            background-color: #0c2c4a;
            background: linear-gradient(135deg, #030303 0%, #0c2c4a 55%, #3b82f6 100%);
            padding: 14px 20px 12px;
            text-align: center;
          }
          .logo-row {
            margin: 0 auto;
            text-align: center;
          }
          .logo-img {
            width: 28px; height: 28px;
            border-radius: 999px;
            display: inline-block;
            vertical-align: middle;
          }
          .logo-text {
            font-size: 13px;
            font-weight: 800;
            letter-spacing: -0.02em;
            color: #ffffff !important;
            line-height: 1;
            vertical-align: middle;
            mso-line-height-rule: exactly;
          }
          .logo-sub {
            font-size: 10px;
            font-weight: 500;
            color: #cbd5e1;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            margin-top: 4px;
          }
          .content {
            padding: 18px 20px 14px;
            color: var(--text);
          }
          .eyebrow {
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: var(--lightBlue);
            margin: 0 0 6px;
          }
          .title {
            font-size: 18px;
            font-weight: 750;
            line-height: 1.25;
            margin: 0 0 8px;
            color: var(--ink);
            letter-spacing: -0.02em;
          }
          .welcome-text {
            font-size: 12.5px;
            font-weight: 600;
            color: var(--text);
            margin: 0 0 10px;
          }
          .text {
            font-size: 13px;
            line-height: 1.65;
            color: var(--subtle);
            margin: 0;
          }
          .text p { margin: 0 0 8px; }
          .text p:last-child { margin-bottom: 0; }
          .button-container { margin: 16px 0 6px; text-align: center; }
          .button {
            background-color: var(--mainBlue);
            color: #ffffff !important;
            padding: 10px 20px;
            border-radius: 9px;
            text-decoration: none;
            font-weight: 700;
            font-size: 13px;
            line-height: 1;
            display: inline-block;
            border: 1px solid rgba(255,255,255,0.08);
          }
          .button:hover { background-color: #0a2440; }
          .expiry-text {
            font-size: 11px;
            color: var(--muted);
            margin: 10px 0 0;
            text-align: center;
            background: #f8fafc;
            border: 1px dashed var(--border);
            border-radius: 8px;
            padding: 7px 10px;
          }
          .divider {
            height: 1px;
            background: var(--border);
            margin: 14px 0 12px;
          }
          .footnote {
            font-size: 11px;
            line-height: 1.55;
            color: var(--subtle);
            margin: 0;
          }
          .footer {
            padding: 12px 20px 14px;
            background: #fcfcfc;
            border-top: 1px solid var(--border);
            text-align: center;
          }
          .footer-links { margin: 0 0 8px; }
          .footer-link {
            color: var(--muted);
            text-decoration: none;
            margin: 0 8px;
            font-size: 11px;
            font-weight: 600;
          }
          .footer-link:hover { color: var(--mainBlue); }
          .footer-copy {
            font-size: 10.5px;
            line-height: 1.5;
            color: #94a3b8;
            margin: 0;
          }
          /* receipt / card blocks — lean */
          .card {
            background: #f8fafc;
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 14px;
            margin: 12px 0;
          }
          .row {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            padding: 7px 0;
            border-bottom: 1px solid #eef2f7;
            align-items: center;
          }
          .row:last-child { border-bottom: 0; padding-bottom: 0; }
          .row:first-child { padding-top: 0; }
          .label { font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--subtle); }
          .value { font-size: 12.5px; font-weight: 650; color: var(--ink); text-align: right; }
          .badge {
            display: inline-block;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.02em;
            padding: 5px 10px;
            border-radius: 999px;
          }
          @media only screen and (max-width: 480px) {
            .wrapper { padding: 10px 8px; }
            .container { border-radius: 12px; }
            .header { padding: 12px 16px 10px; }
            .content { padding: 14px 16px 12px; }
            .footer { padding: 10px 16px 12px; }
            .title { font-size: 17px; }
            .text { font-size: 12.5px; }
            .button { width: 100%; box-sizing: border-box; text-align: center; }
            .card { padding: 12px; }
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <!-- header table for Outlook/Gmail — bgcolor fallback ensures contrast -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; border-collapse:collapse;">
              <tr>
                <td class="header" align="center" bgcolor="#0c2c4a" style="background-color:#0c2c4a; background:linear-gradient(135deg,#030303 0%,#0c2c4a 55%,#3b82f6 100%); padding:14px 20px 12px; text-align:center;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto; border-collapse:collapse;">
                    <tr>
                      <td align="center" style="text-align:center; font-size:0;">
                        <img src="https://res.cloudinary.com/ceenobi/image/upload/e_background_removal/q_auto:best/v1785307622/bcc007portal/Gemini_Generated_Image_s6h7lfs6h7lfs6h7_pfzmnk.png" alt="BCC007" width="28" height="28" style="width:28px; height:28px; border-radius:999px; border-radius:50%; display:inline-block; vertical-align:middle;" />
                        <span style="display:inline-block; vertical-align:middle; font-family:Inter,Arial,sans-serif; font-size:13px; font-weight:800; letter-spacing:-0.02em; color:#ffffff !important; line-height:1; margin-left:8px; mso-line-height-rule:exactly;">BCC007 Portal</span>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="font-family:Inter,Arial,sans-serif; font-size:10px; font-weight:500; color:#cbd5e1; letter-spacing:0.06em; text-transform:uppercase; padding-top:4px;">Alumni &amp; Student Platform</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
            <div class="content">
              <p class="eyebrow">${title}</p>
              <h1 class="title">${title}</h1>
              <p class="welcome-text">Hello ${name},</p>
              <div class="text">${content}</div>
              ${
								actionLink
									? `
                <div class="button-container">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto;">
                    <tr>
                      <td align="center" bgcolor="#0c2c4a" style="border-radius:9px;background-color:#0c2c4a;">
                        <a href="${absoluteUrl(actionLink)}" target="_blank" class="button" style="display:inline-block;padding:10px 20px;font-family:Inter,Arial,sans-serif;font-size:13px;font-weight:700;color:#ffffff !important;text-decoration:none;border-radius:9px;background-color:#0c2c4a;">${actionText || "Confirm Action"} →</a>
                      </td>
                    </tr>
                  </table>
                </div>`
									: ""
							}
              ${expiryText ? `<p class="expiry-text">⏱ ${expiryText}</p>` : ""}
              <div class="divider"></div>
              <p class="footnote">If you didn't request this email, you can safely ignore it. Your account security is our priority.</p>
            </div>
            <div class="footer">
              <div class="footer-links">
                <a href="${absoluteUrl("/support/guide")}" class="footer-link">Support</a>
                <a href="${absoluteUrl("/privacy")}" class="footer-link">Privacy</a>
                <a href="${absoluteUrl("/terms")}" class="footer-link">Terms</a>
              </div>
              <p class="footer-copy">© ${new Date().getFullYear()} BCC007 Portal · Crafting unique experiences for BCC007 students.</p>
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
		`You have been invited to join the BCC007 Alumni Platform. Use the code below during registration.<div class="card" style="text-align:center; padding:14px;">
       <div style="font-size:10px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#64748b; margin-bottom:6px;">Invitation Code</div>
       <div style="font-family:ui-monospace, SFMono-Regular, Menlo, monospace; font-size:22px; font-weight:800; color:#030303; letter-spacing:4px;">${code}</div>
       <div style="font-size:11px; color:#94a3b8; margin-top:6px;">Expires in 24 hours</div>
     </div>`,
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
    <div class="card">
      <div class="row"><span class="label">Payment Type</span><span class="value">${paymentTypeLabel}</span></div>
      <div class="row"><span class="label">Amount</span><span class="value" style="font-size:15px; color:#0c2c4a;">${formattedAmount}</span></div>
      <div class="row"><span class="label">Reference</span><span class="value" style="font-family:ui-monospace,monospace; font-size:11.5px;">${data.reference}</span></div>
      <div class="row"><span class="label">Date</span><span class="value">${formattedDate}</span></div>
      <div style="text-align:center; margin-top:10px;"><span class="badge" style="background:#dcfce7; color:#166534;">✓ Payment Confirmed</span></div>
    </div>
    <p style="margin:0; font-size:12.5px; color:#64748b; line-height:1.6;">Your payment has been received and confirmed. Thank you for supporting the BCC007 community.</p>
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
    <div class="card">
      <div class="row"><span class="label">Amount</span><span class="value" style="font-size:15px; color:#0c2c4a;">${formattedAmount}</span></div>
      <div class="row"><span class="label">Reference</span><span class="value" style="font-family:ui-monospace,monospace; font-size:11.5px;">${data.reference}</span></div>
      <div class="row"><span class="label">Date</span><span class="value">${formattedDate}</span></div>
      <div style="text-align:center; margin-top:10px;"><span class="badge" style="background:${badgeBg}; color:${badgeColor};">${badgeText}</span></div>
    </div>
    <p style="margin:0; font-size:12.5px; color:#64748b; line-height:1.6;">${
			isSuccess
				? "Your transfer has been processed and sent to your bank account successfully."
				: "There was an issue processing your transfer. Please check your bank account or contact support."
		}</p>
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
    <div class="card" style="padding:12px 14px;">
      <div class="row"><span class="label">From</span><span class="value">${data.fullname}</span></div>
      <div class="row"><span class="label">Email</span><span class="value" style="font-size:12px;">${data.email}</span></div>
      <div class="row"><span class="label">Subject</span><span class="value">${data.subject}</span></div>
      <div style="margin-top:10px; padding-top:10px; border-top:1px solid #eef2f7;">
        <p style="font-size:13px; color:#334155; line-height:1.65; margin:0; white-space:pre-line;">${data.message}</p>
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
		`Your support ticket has been created successfully.
     <div class="card">
       <div class="row"><span class="label">Ticket ID</span><span class="value" style="font-family:ui-monospace,monospace; font-size:11.5px;">${ticketId}</span></div>
       <div class="row"><span class="label">Title</span><span class="value" style="font-size:12px;">${title}</span></div>
       <div class="row"><span class="label">Priority</span><span class="value"><span class="badge" style="background:#fef3c7; color:#92400e; font-size:10px; padding:3px 7px;">${priority}</span></span></div>
       <div style="margin-top:10px; padding-top:10px; border-top:1px solid #eef2f7;"><p style="margin:0; font-size:12.5px; color:#334155; line-height:1.6;">${description}</p></div>
     </div>
     <p style="margin:0; font-size:12.5px; color:#64748b; line-height:1.6;">Our support team will review your ticket and get back to you as soon as possible. Track status in Help Desk.</p>`,
	);

export const ticketAssignedTemplate = (
	name: string,
	ticketId: string,
	title: string,
) =>
	baseLayout(
		"Ticket Assigned",
		name,
		`A support ticket has been assigned to you.
     <div class="card">
       <div class="row"><span class="label">Ticket ID</span><span class="value" style="font-family:ui-monospace,monospace; font-size:11.5px;">${ticketId}</span></div>
       <div class="row"><span class="label">Title</span><span class="value" style="font-size:12px;">${title}</span></div>
     </div>
     <p style="margin:0; font-size:12.5px; color:#64748b;">Please review and take the appropriate action.</p>`,
	);

export const ticketResolvedTemplate = (
	name: string,
	ticketId: string,
	title: string,
) =>
	baseLayout(
		"Ticket Resolved",
		name,
		`Your support ticket has been marked as resolved.
     <div class="card">
       <div class="row"><span class="label">Ticket ID</span><span class="value" style="font-family:ui-monospace,monospace; font-size:11.5px;">${ticketId}</span></div>
       <div class="row"><span class="label">Title</span><span class="value" style="font-size:12px;">${title}</span></div>
       <div style="text-align:center; margin-top:10px;"><span class="badge" style="background:#dcfce7; color:#166534;">✓ Resolved</span></div>
     </div>
     <p style="margin:0; font-size:12.5px; color:#64748b;">If you have further questions, please create a new ticket.</p>`,
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
