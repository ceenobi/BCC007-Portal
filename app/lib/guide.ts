export type KnowledgeBaseArticle = {
  id: string;
  title: string;
  category: string;
  icon: string;
  content: string;
  keywords: string[];
};

export const helpdeskKnowledgeBase: KnowledgeBaseArticle[] = [
  {
    id: "account-registration",
    title: "Create Your Account",
    category: "Getting Started",
    icon: "RiUserAddLine",
    keywords: [
      "sign up",
      "register",
      "create account",
      "verify email",
      "login",
      "sign in",
      "forgot password",
      "reset password",
    ],
    content: `
## Creating an account

Before you can use BC007 Portal you need an account. Go to the sign-up page, enter your full name, email address and a strong password, then submit.

## Verify your email

- You will receive a verification link in your inbox.
- Open the link to confirm your email address — some features stay locked until your email is verified.
- The link is valid for a limited time; if it expires, request a new one from the verification page.

## Signing in

- Use the email and password you registered with on the sign-in page.
- Make sure your email is verified — you may be prompted to verify again if you signed in before verifying.

## Lost your password?

- Click "Forgot password" on the sign-in page.
- Enter your email and you will receive a password reset link.
- Follow the link, choose a new password and confirm it.
- After resetting, sign in with your new password.
`,
  },
  {
    id: "onboarding",
    title: "Complete Your Onboarding",
    category: "Getting Started",
    icon: "RiUserSettingsLine",
    keywords: [
      "onboarding",
      "profile",
      "date of birth",
      "avatar",
      "bank details",
      "bank account",
      "account name",
      "first login",
    ],
    content: `
## First login setup

After your account is verified, you will be taken through a two-stage onboarding flow. You cannot access the dashboard until both stages are complete.

## Stage 1 — Profile details

- Provide your phone number, gender, occupation, location and date of birth.
- You can upload a profile avatar (optional) — it will be shown across the app.
- Click continue to move to the next stage.

## Stage 2 — Bank details

- Enter your bank account number and select your bank.
- The account name is verified automatically against your bank before saving.
- The verified name is stored, so you cannot type a fake account name.

## After onboarding

- Once complete, you are marked as onboarded and taken to the dashboard.
- You can update these details later under **Settings → Account**.
`,
  },
  {
    id: "dashboard-overview",
    title: "Dashboard Overview",
    category: "Dashboard",
    icon: "RiDashboardLine",
    keywords: [
      "dashboard",
      "overview",
      "welcome",
      "revenue",
      "balance",
      "tickets",
      "quick actions",
      "activity",
      "birthdays",
      "events",
    ],
    content: `
## The home screen

The dashboard gives you a snapshot of everything happening in the group.

## What you will see

- **Revenue (30 days) and Total Revenue** — payment totals over the last month and all time.
- **Members** — how many people have onboarded (visible to member admins).
- **My Tickets** — your open and in-progress support tickets.

## Charts and widgets

- **Revenue Trends** — a chart of payment revenue. Use the **30 days / All time** toggle in the corner to change the window.
- **Organization Balance** — available, pending and total balance from the transfer wallet, with a shortcut to Transfers.

## Lower section

- **Support Tickets** — organization-wide ticket counts (for support admins) and your personal ticket counts.
- **Quick Actions** — one-click links to payments, transfers, events, members and reports.
- **Upcoming Events** — the next five events with their dates and locations.
- **Recent Activity** — your latest security and account events.
- **Upcoming Birthdays** — members with birthdays in the next 14 days.

## Tip

Click any widget title or "View/All" button to jump straight to the full page.
`,
  },
  {
    id: "members-overview",
    title: "Members & Roles",
    category: "Members",
    icon: "RiGroupLine",
    keywords: [
      "members",
      "roles",
      "admin",
      "member",
      "super admin",
      "permissions",
      "search",
      "filter",
      "modify role",
    ],
    content: `
## The members directory

The Members page lists everyone in the group. You can search and filter the list to find specific people.

## Roles explained

- **Member** — standard access: makes payments, views events, raises support tickets.
- **Admin** — can manage payments, transfers, members and tickets depending on the specific permission.
- **Super Admin** — full control, including managing other admins.

## Changing a role

- Admins can upgrade or downgrade other members using the role menu on each row.
- You cannot change your own role.
- Super admin accounts can only be modified by other super admins.

## Searching

Use the search box to find members by name or email, and the filters to narrow by role or onboarding status.
`,
  },
  {
    id: "invite-members",
    title: "Inviting Members",
    category: "Members",
    icon: "RiUserAddFill",
    keywords: [
      "invite",
      "invitation",
      "invite code",
      "add member",
      "email invite",
      "sign up link",
    ],
    content: `
## How invitations work

To grow the group, use the **Invite Member** button on the Members page.

## What happens

1. You enter the new member's details to generate an invitation.
2. The invite carries a unique code the new member redeems during sign-up.
3. The invited person registers with the code and completes onboarding before joining the group.

## After they accept

- The new member appears in the Members list once onboarded.
- They get standard member access until an admin changes their role.

## Troubleshooting

- If an invite code is lost, generate a fresh invitation.
- Only members with member-management permissions can send invites.
`,
  },
  {
    id: "birthday-reminders",
    title: "Birthday Reminders",
    category: "Members",
    icon: "RiCake3Line",
    keywords: [
      "birthday",
      "reminder",
      "remind",
      "birth date",
      "celebration",
      "age",
      "notify",
    ],
    content: `
## How birthdays work

The dashboard shows members with birthdays in the next **14 days**. Members can choose to hide their birth date in their privacy settings — hidden birthdays never appear.

## Sending a reminder

- Admins can send a birthday reminder to a member from the members page or the dashboard widget.
- Each member can only receive **one reminder per day** — a second attempt is blocked.
- Reminders are also sent automatically on the member's birthday by a scheduled sweep.

## Leap-day members (Feb 29)

- A member born on February 29 is celebrated on **February 28** in non-leap years, so they are never skipped.
- The age shown is the age they turn on the actual birthday.

## Why nothing appears

If no birthdays show, either nobody has a birthday in the window, or every member in that window has disabled their birth date.
`,
  },
  {
    id: "events-overview",
    title: "Events",
    category: "Events",
    icon: "RiCalendarEventLine",
    keywords: [
      "events",
      "list",
      "meeting",
      "party",
      "birthday",
      "other",
      "filter",
      "location",
      "organizer",
    ],
    content: `
## The events page

The Events page lists all group events, newest and nearest first. Click any event to open its detail page.

## Event types

- **Meeting** — official group gatherings.
- **Party** — social celebrations.
- **Birthday** — member birthday celebrations.
- **Other** — anything else.

## Event details

Each event card shows the type, date and time, location, a short description, the organizer, and how many members are interested.

## Filtering

Use the filters to narrow events by type and status, and search for a specific title. Results are paginated — use the pagination controls at the bottom.
`,
  },
  {
    id: "create-manage-events",
    title: "Create & Manage Events",
    category: "Events",
    icon: "RiCalendarCheckLine",
    keywords: [
      "create event",
      "edit event",
      "delete event",
      "cancel event",
      "featured image",
      "location",
      "organizer",
      "date",
      "time",
    ],
    content: `
## Creating an event

Click **Create Event** on the Events page and fill in:

1. **Title** — a clear, short name for the event.
2. **Type** — meeting, party, birthday or other.
3. **Date and time** — pick the start date and time.
4. **Location** — choose a venue or provide a location description (address or map coordinates).
5. **Featured image** (optional) — a cover image shown on the event card.
6. **Details** — a description members will see.

## Editing

Open the event and use **Edit** to change any detail. Past events stay editable so you can fix mistakes, but a valid date is always required.

## Deleting

- Use the delete option on the event to remove it permanently.
- Double-tapping delete is safe — deleting an already-deleted event just succeeds.

## Cancelling

- Cancel an upcoming or ongoing event with the **Cancel Event** action.
- Everyone interested (and the organizer) is notified automatically.

## Featured images

- Images upload to Cloudinary when you save.
- If you remove or cancel before saving, the uploaded file is cleaned up automatically.
`,
  },
  {
    id: "event-statuses",
    title: "Event Statuses & Interest",
    category: "Events",
    icon: "RiCheckboxCircleLine",
    keywords: [
      "status",
      "upcoming",
      "ongoing",
      "completed",
      "cancelled",
      "interested",
      "notifications",
      "rsvp",
    ],
    content: `
## Event lifecycle

Every event moves through statuses:

1. **Upcoming** — the event is in the future and open for interest.
2. **Ongoing** — the event has started.
3. **Completed** — the event has finished.
4. **Cancelled** — the event will not happen.

Statuses are updated automatically as dates pass — you do not need to change them manually.

## Marking interest

- On an event page, click **Interested** to let the organizer know you plan to attend.
- Click it again to remove your interest.
- The interest count on the card updates immediately.
- You cannot add interest to a completed or cancelled event, but you can still remove an existing one.

## Notifications

- When an event changes to ongoing or completed, the organizer and everyone interested receive a notification.
- When an event is cancelled, the same group is notified.
`,
  },
  {
    id: "payments-overview",
    title: "Making Payments",
    category: "Payments",
    icon: "RiWallet3Line",
    keywords: [
      "pay",
      "payment",
      "membership dues",
      "donation",
      "event payment",
      "one-time",
      "recurring",
      "amount",
      "monthly",
    ],
    content: `
## Payment types

From the Payments page click **Make Payment** and choose what you are paying for:

- **Membership Dues** — the monthly levy (default **₦2,000**), already filled in for you.
- **Donation** — a voluntary contribution to the group.
- **Event Payment** — payment towards an upcoming event.

## One-time or recurring

- **One-time** — a single payment now.
- **Recurring** — set up an automatic monthly payment for membership dues.

## Completing a payment

1. Pick the payment type.
2. Confirm or edit the amount (dues are pre-filled).
3. Submit and complete the checkout.
4. You will see the payment on your list with a status.

## After paying

- Completed payments generate a receipt you can download.
- Your dues progress on the reports page reflects paid months.
`,
  },
  {
    id: "payment-statuses-receipts",
    title: "Payment Statuses & Receipts",
    category: "Payments",
    icon: "RiReceiptLine",
    keywords: [
      "status",
      "pending",
      "completed",
      "failed",
      "receipt",
      "invoice",
      "download",
      "history",
    ],
    content: `
## Understanding statuses

Each payment shows one of three states:

- **Pending** — the payment is processing. Wait a few moments and refresh.
- **Completed** — the money was received. Your receipt is available.
- **Failed** — the payment did not go through. Check your details and try again.

## Receipts & invoices

- Completed payments can be viewed as a receipt from the payment card or row.
- The receipt shows the amount, date, payment type and reference.
- Use it for your own records or group reimbursement.

## Payment history

The Payments page keeps a full history of everything you have paid, with filters for status and type. Group admins can also see group-wide payment records.
`,
  },
  {
    id: "group-payments",
    title: "Group Payments",
    category: "Payments",
    icon: "RiTeamLine",
    keywords: [
      "group",
      "group payments",
      "all members",
      "admin",
      "overview",
      "records",
    ],
    content: `
## What group payments show

Members with payment-management permissions can view payments across the whole group, not just their own.

## What you can do

- See every member's payment records in one list.
- Filter by payment status and type.
- Track who is up to date with their dues.

## Opening group payments

Use the **Group** toggle on the Payments page (it appears only if you have the payment-management permission). The view switches between your personal payments and the group-wide ledger.

## Privacy note

Group payment records are only visible to authorized admins. Regular members only ever see their own payments.
`,
  },
  {
    id: "payment-reports",
    title: "Payment Reports",
    category: "Payments",
    icon: "RiLineChartLine",
    keywords: [
      "reports",
      "revenue",
      "trends",
      "dues progress",
      "monthly",
      "statistics",
      "payment types",
      "period",
    ],
    content: `
## The reports page

Under **Payments → Reports** you get a full picture of revenue and dues.

## Report sections

- **Stats cards** — total revenue, completed, pending and transaction counts.
- **Revenue Trend** — an area chart of revenue over time with period toggles (**1W, 1M, 6M, 1Y, All**).
- **Payment Type Breakdown** — how revenue splits across payment types.
- **Monthly Flows** — a month-by-month comparison.
- **Dues Progress** — your personal membership status: months paid, payment percentage and whether you are up to date.

## User vs Group reports

- **User** — your own payment activity (everyone).
- **Group** — the whole group's activity (payment admins only).

## Tip

Use the period toggle to zoom into a week, month, six months, year, or all-time revenue.
`,
  },
  {
    id: "transfers-overview",
    title: "Initiating Transfers",
    category: "Transfers",
    icon: "RiExchangeFundsLine",
    keywords: [
      "transfer",
      "send money",
      "recipient",
      "bank",
      "amount",
      "OTP",
      "confirm",
      "withdraw",
    ],
    content: `
## How transfers work

The Transfers page lets the group move money from the organization wallet to a bank account.

## Steps to send money

1. Click **Initiate Transfer**.
2. **Select the recipient** — pick a member or enter the bank account details (account number and bank).
3. **Enter the amount** and any description.
4. **Confirm with OTP** — you will be asked for a one-time passcode to authorize the transfer.

## Why OTP?

The OTP is a security step that prevents unauthorized money movement. Always confirm the amount and recipient before approving.

## After the transfer

- The transfer appears in your list with a status (pending → completed or failed).
- Completed transfers have a receipt with the fee applied.

## Notes

- Transfers are permission-gated — only members with transfer permissions can send money.
- Always double-check the recipient's account details before confirming.
`,
  },
  {
    id: "transfer-reports",
    title: "Transfer Reports",
    category: "Transfers",
    icon: "RiFundsLine",
    keywords: [
      "transfer reports",
      "sent",
      "received",
      "trend",
      "status",
      "monthly",
      "fees",
      "analytics",
    ],
    content: `
## The transfers reports page

Under **Transfers → Reports** you can analyze the group's money movement.

## Report sections

- **Stats cards** — total transferred, fees and counts.
- **Transfer Trend** — an area chart of amounts over time with period toggles.
- **Status breakdown** — how transfers split across statuses (pending, completed, failed).
- **Monthly Flows** — month-by-month comparisons of money sent.

## Who can see it

Transfer reports are available to members with transfer-management permissions, matching the rest of the Transfers section.

## Tip

Use the period toggle to compare short- and long-term trends, and watch the status breakdown for anything stuck pending.
`,
  },
  {
    id: "help-center",
    title: "Help Center & Tickets",
    category: "Help Center",
    icon: "RiCustomerService2Line",
    keywords: [
      "help center",
      "ticket",
      "support",
      "issue",
      "category",
      "priority",
      "status",
      "assign",
      "report problem",
    ],
    content: `
## Getting help

The Help Center is where you report issues or ask questions. Open **Help Center** and click **Create Ticket**.

## Filling in a ticket

- **Title** — a short summary of the issue.
- **Category** — account, security, payment or other.
- **Priority** — low, medium, high or critical.
- **Description** — the details a support agent needs to help you.

## Ticket lifecycle

Each ticket moves through statuses:

1. **Open** — your ticket is submitted and waiting.
2. **In progress** — a support agent is working on it.
3. **Resolved** — a solution has been provided.
4. **Closed** — the ticket is finished.

## Assignment (support admins)

Support admins can assign tickets to themselves or other agents. A ticket that requires a specific agent stays unassigned until someone with **assign** permission takes it.

## What to include

Always include the affected feature, what you expected, and what happened instead. For payment issues, mention the payment reference if you have one.
`,
  },
  {
    id: "account-settings",
    title: "Profile & Account Settings",
    category: "Settings",
    icon: "RiUserSettingsLine",
    keywords: [
      "profile",
      "account",
      "avatar",
      "photo",
      "update profile",
      "bank info",
      "privacy",
      "phone",
      "gender",
      "occupation",
      "location",
    ],
    content: `
## Where to manage your profile

Go to **Settings → Account** to manage your personal details.

## What you can edit

- **Profile** — name, phone, gender, occupation, location and date of birth.
- **Avatar** — upload a new profile photo; it appears across the app.
- **Password** — change your password (verify your current password first).
- **Bank information** — review the bank account used for payments; account names are verified automatically.
- **Privacy** — control visibility of your birth date, gender and email.

## Privacy toggles

- Turning off your **birth date** hides it from the birthdays widget and reminders.
- Turning off your **gender** hides it from your profile.
- Turning off **email notifications** stops reminder emails.

## Saving changes

Most changes save instantly and reflect everywhere immediately. Verify the current password when changing security-sensitive fields.
`,
  },
  {
    id: "security-settings",
    title: "Security",
    category: "Settings",
    icon: "RiShieldCheckLine",
    keywords: [
      "security",
      "password",
      "change email",
      "sessions",
      "log out",
      "delete account",
      "revoke",
      "device",
    ],
    content: `
## The Security settings page

Under **Settings → Security** you manage everything that protects your account.

## Password

- Change your password by entering your current password, then the new one twice.
- Use a strong, unique password you do not use elsewhere.

## Change email

- Request an email change — the new email must be verified before it takes effect.

## Sessions

- See every device currently signed in to your account.
- Revoke any session you no longer recognize to log that device out instantly.
- The session you are currently using is marked clearly.

## Delete account

- You can request account deletion from the same page.
- Deleting removes your profile and access. This is a destructive action — confirm carefully.
- If you change your mind, use the confirmation link while it is still valid.

## Good practice

- Review your sessions regularly.
- If you see a session you do not recognize, revoke it and change your password.
`,
  },
  {
    id: "subscription",
    title: "Membership Subscription",
    category: "Settings",
    icon: "RiLoopLeftLine",
    keywords: [
      "subscription",
      "membership dues",
      "recurring",
      "cancel",
      "plan",
      "monthly",
      "billing",
    ],
    content: `
## About subscriptions

Membership dues can be set up as a recurring monthly subscription so you never miss a payment.

## Managing your subscription

Open **Settings → Subscription** to see:

- Your current plan — the monthly membership dues plan.
- Your subscription status and payment cadence.
- The option to **cancel** your membership subscription at any time.

## How it works

- While subscribed, the monthly dues amount is charged automatically.
- If you cancel, the automatic charge stops — future dues you owe will need to be paid manually from the Payments page.

## Notes

- Cancelling does not delete your account or payment history.
- If you re-subscribe, the automatic billing resumes.
`,
  },
  {
    id: "audit-logs",
    title: "Audit Logs",
    category: "Settings",
    icon: "RiFileHistoryLine",
    keywords: [
      "audit",
      "logs",
      "activity",
      "history",
      "auth",
      "payment",
      "settings",
      "security",
      "support",
      "track",
    ],
    content: `
## What audit logs are

Audit logs are a record of important actions taken on the platform — who did what and when.

## Categories

- **Authentication** — logins, logouts, password changes.
- **Payment** — payments initiated and completed.
- **Settings** — profile and configuration changes.
- **Security** — security-related actions such as email changes.
- **Support** — support actions such as sending reminders.

## Viewing logs

Open **Settings → Audit Logs**. Each entry shows:

- The **action** performed (e.g. "birthday reminder").
- A **description** of what happened.
- The **status** — success or failure.
- The **time** it occurred.

## Who sees what

- Admins can see organization-wide audit activity.
- Regular members see their own activity.

## Why it matters

If something looks wrong (an unexpected sign-in or payment), the audit log is the first place to check.
`,
  },
];
