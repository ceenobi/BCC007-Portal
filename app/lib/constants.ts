import type { RemixiconComponentType } from "@remixicon/react";
import {
  RiCake3Line,
  RiCalendarEventLine,
  RiCashLine,
  RiDashboardLine,
  RiGroupLine,
  RiMegaphoneLine,
  RiRefundLine,
  RiSettings3Line,
  RiSparkling2Line,
  RiTeamLine,
  RiWallet3Line,
} from "@remixicon/react";
import type {
  AnnouncementData,
  AuditLogData,
  EventData,
  ExpenseData,
  PaymentData,
  SessionUser,
  TicketData,
  TransferData,
} from "~/types";

export type SidebarLinkItem = {
  name: string;
  href: string;
  icon: RemixiconComponentType;
};

export type SidebarLinkGroup = {
  id: string;
  title: string;
  children: SidebarLinkItem[];
};

export type SidebarNavItem = SidebarLinkGroup | SidebarLinkItem;

export const formFields = [
  {
    name: "name",
    label: "Full Name",
    type: "text",
    placeholder: "Enter full name",
  },
  {
    name: "email",
    label: "Email Address",
    type: "email",
    placeholder: "Enter email address",
  },
  {
    name: "password",
    label: "Password",
    type: "password",
    placeholder: "Enter password",
  },
  {
    name: "inviteCode",
    label: "Invite Code",
    type: "text",
    placeholder: "Enter invite code",
  },
  {
    name: "newEmail",
    label: "New Email",
    type: "email",
    placeholder: "Your new email",
  },
  {
    name: "phone",
    label: "Phone",
    type: "tel",
    placeholder: "+234(phone-number)",
  },
  {
    name: "currentPassword",
    label: "Current Password",
    type: "password",
    placeholder: "Your current password",
  },
  {
    name: "newPassword",
    label: "New Password",
    type: "password",
    placeholder: "Enter your new password",
  },
  {
    name: "confirmPassword",
    label: "Confirm New Password",
    type: "password",
    placeholder: "Confirm your new password",
  },
  {
    name: "occupation",
    label: "Occupation",
    type: "text",
    placeholder: "Enter occupation",
  },
  {
    name: "location",
    label: "Location",
    type: "text",
    placeholder: "Enter location",
  },
  {
    name: "title",
    label: "Project Title",
    type: "text",
    placeholder: "Enter project title",
  },
  {
    name: "description",
    label: "Description",
    type: "textarea",
    placeholder: "Give a brief description",
  },
  {
    name: "status",
    label: "Status",
    type: "select",
    placeholder: "Select status",
    options: [
      { id: "upcoming", name: "Upcoming" },
      { id: "active", name: "Active" },
      { id: "completed", name: "Completed" },
      { id: "on-hold", name: "On Hold" },
    ],
  },
  {
    name: "dateOfBirth",
    label: "Date of Birth",
    type: "date",
    placeholder: "Select date of birth",
  },
  {
    name: "startDate",
    label: "Start Date",
    type: "date",
    placeholder: "Select start date",
  },
  {
    name: "endDate",
    label: "End Date",
    type: "date",
    placeholder: "Select end date",
  },
  {
    name: "gender",
    label: "Gender",
    type: "select",
    placeholder: "Select gender",
    options: [
      { id: "male", name: "Male" },
      { id: "female", name: "Female" },
      { id: "other", name: "Other" },
    ],
  },
  {
    name: "role",
    label: "Role",
    type: "radio",
    placeholder: "Select role",
    options: [
      {
        id: "member",
        name: "member",
        description: "Default role for team members",
      },
      {
        id: "admin",
        name: "admin",
        description: "Administrator role with priviledged access",
      },
    ],
  },
  {
    name: "disableBirthDate",
    label: "Disable Birth Date",
    type: "switch",
    placeholder: "Prevent birth date from being displayed",
  },
  {
    name: "disableGender",
    label: "Disable Gender",
    type: "switch",
    placeholder: "Prevent gender from being displayed",
  },
  {
    name: "disableEmail",
    label: "Newsletter",
    type: "switch",
    placeholder: "Prevent getting newsletter emails",
  },
];

export const roles = {
  member: "member",
  admin: "admin",
  super_admin: "super_admin",
} as const;

export type Role = (typeof roles)[keyof typeof roles];

export const permissions = {
  MANAGE_MEMBERS: [roles.admin, roles.super_admin],
  MANAGE_PAYMENTS: [roles.admin, roles.super_admin],
  MANAGE_EVENTS: [roles.admin, roles.super_admin],
  MANAGE_ANNOUNCEMENTS: [roles.admin, roles.super_admin],
  VIEW_REPORTS: [roles.admin, roles.super_admin],
  MANAGE_SETTINGS: [roles.super_admin, roles.admin, roles.member],
  MANAGE_SESSIONS: [roles.super_admin],
  MANAGE_ROLES: [roles.super_admin],
  MANAGE_TRANSFERS: [roles.super_admin],
  VIEW_TRANSFERS: [roles.admin, roles.super_admin],
  VIEW_PAYMENTS: [roles.member, roles.admin, roles.super_admin],
  CREATE_TICKET: [roles.member, roles.member],
  MANAGE_TICKETS: [roles.super_admin, roles.admin],
  ASSIGN_TICKET: [roles.super_admin],
  MANAGE_INTEGRATIONS: [roles.admin, roles.super_admin],
} as const;

export type Permission = keyof typeof permissions;

export const eventStatus = [
  { value: "upcoming", label: "Upcoming" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const eventTypes = [
  { id: "party", name: "Party" },
  { id: "meeting", name: "Meeting" },
  { id: "birthday", name: "Birthday" },
  { id: "other", name: "Other" },
] as const;

export const announcementStatus = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
] as const;

export const paymentStatus = [
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const paymentTypes = [
  { id: "donation", name: "Donation" },
  { id: "event", name: "Event" },
  { id: "membership_dues", name: "Membership Dues" },
] as const;

export const transferStatus = [
  { value: "pending", label: "Pending" },
  { value: "otp", label: "OTP" },
  { value: "in_transit", label: "In Transit" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
  { value: "reversed", label: "Reversed" },
  { value: "aborted", label: "Aborted" },
  { value: "abandoned", label: "Abandoned" },
] as const;

export const expenseCategory = [
  { value: "logistics", label: "Logistics" },
  { value: "refreshments", label: "Refreshments" },
  { value: "venue", label: "Venue" },
  { value: "equipment", label: "Equipment" },
  { value: "welfare", label: "Welfare" },
  { value: "other", label: "Other" },
] as const;

export const expenseStatus = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
] as const;

export const sideBarLinks: SidebarLinkGroup[] = [
  {
    id: "home",
    title: "Main",
    children: [
      {
        name: "Dashboard",
        href: "/dashboard",
        icon: RiDashboardLine,
      },
      {
        name: "Members",
        href: "/dashboard/members",
        icon: RiGroupLine,
      },
      {
        name: "Events",
        href: "/dashboard/events",
        icon: RiCalendarEventLine,
      },
      {
        name: "Announcements",
        href: "/dashboard/announcements",
        icon: RiMegaphoneLine,
      },
    ],
  },
  {
    id: "finance",
    title: "Finance",
    children: [
      {
        name: "Payments",
        href: "/dashboard/payments",
        icon: RiCashLine,
      },
      {
        name: "Transfers",
        href: "/dashboard/transfers",
        icon: RiRefundLine,
      },
      {
        name: "Expenses",
        href: "/dashboard/expenses",
        icon: RiWallet3Line,
      },
    ],
  },
  {
    id: "settings",
    title: "Settings",
    children: [
      {
        name: "Settings",
        href: "/dashboard/settings",
        icon: RiSettings3Line,
      },
    ],
  },
];

export const typeConfig: Record<
  EventData["eventType"],
  {
    label: string;
    Icon: React.ComponentType<{ className?: string; size?: number | string }>;
  }
> = {
  party: { label: "Party", Icon: RiSparkling2Line },
  meeting: { label: "Meeting", Icon: RiTeamLine },
  birthday: { label: "Birthday", Icon: RiCake3Line },
  other: { label: "Other", Icon: RiCalendarEventLine },
};

export const paymentStatusConfig: Record<
  PaymentData["paymentStatus"],
  { label: string; className: string; dotClassName: string }
> = {
  pending: {
    label: "Pending",
    className:
      "border-transparent bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    dotClassName: "bg-yellow-500",
  },
  completed: {
    label: "Completed",
    className:
      "border-transparent bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    dotClassName: "bg-emerald-500",
  },
  failed: {
    label: "Failed",
    className: "border-transparent bg-destructive/10 text-destructive",
    dotClassName: "bg-destructive",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "border-transparent bg-zinc-500/10 text-zinc-500 dark:text-zinc-400",
    dotClassName: "bg-zinc-500",
  },
};

export const paymentTypeConfig: Record<
  PaymentData["paymentType"],
  { label: string; className: string }
> = {
  membership_dues: {
    label: "Membership Dues",
    className:
      "border-transparent bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  donation: {
    label: "Donation",
    className:
      "border-transparent bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  event: {
    label: "Event",
    className:
      "border-transparent bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
};

export const statusConfig: Record<
  EventData["status"],
  { label: string; className: string; dotClassName: string }
> = {
  upcoming: {
    label: "Upcoming",
    className:
      "border-transparent bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    dotClassName: "bg-yellow-500",
  },
  ongoing: {
    label: "Ongoing",
    className:
      "border-transparent bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    dotClassName: "bg-emerald-500",
  },
  completed: {
    label: "Completed",
    className:
      "border-transparent bg-blue-500/10 text-blue-600 dark:text-blue-400",
    dotClassName: "bg-blue-500",
  },
  cancelled: {
    label: "Cancelled",
    className: "border-transparent bg-destructive/10 text-destructive",
    dotClassName: "bg-destructive",
  },
};

export const announcementStatusConfig: Record<
  AnnouncementData["status"],
  { label: string; className: string; dotClassName: string }
> = {
  draft: {
    label: "Draft",
    className:
      "border-transparent bg-gray-500/10 text-gray-600 dark:text-gray-400",
    dotClassName: "bg-gray-500",
  },
  published: {
    label: "Published",
    className:
      "border-transparent bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    dotClassName: "bg-emerald-500",
  },
  archived: {
    label: "Archived",
    className: "border-transparent bg-destructive/10 text-destructive",
    dotClassName: "bg-destructive",
  },
};

export const transferStatusConfig: Record<
  TransferData["status"],
  { label: string; className: string; dotClassName: string }
> = {
  pending: {
    label: "Pending",
    className:
      "border-transparent bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    dotClassName: "bg-yellow-500",
  },
  otp: {
    label: "Awaiting OTP",
    className:
      "border-transparent bg-amber-500/10 text-amber-600 dark:text-amber-400",
    dotClassName: "bg-amber-500",
  },
  in_transit: {
    label: "In Transit",
    className:
      "border-transparent bg-blue-500/10 text-blue-600 dark:text-blue-400",
    dotClassName: "bg-blue-500",
  },
  success: {
    label: "Successful",
    className:
      "border-transparent bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    dotClassName: "bg-emerald-500",
  },
  failed: {
    label: "Failed",
    className: "border-transparent bg-destructive/10 text-destructive",
    dotClassName: "bg-destructive",
  },
  reversed: {
    label: "Reversed",
    className:
      "border-transparent bg-purple-500/10 text-purple-600 dark:text-purple-400",
    dotClassName: "bg-purple-500",
  },
  aborted: {
    label: "Aborted",
    className:
      "border-transparent bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
    dotClassName: "bg-zinc-500",
  },
  abandoned: {
    label: "Abandoned",
    className:
      "border-transparent bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
    dotClassName: "bg-zinc-500",
  },
};

export const expenseStatusConfig: Record<
  ExpenseData["status"],
  { label: string; className: string; dotClassName: string }
> = {
  pending: {
    label: "Pending",
    className:
      "border-transparent bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    dotClassName: "bg-yellow-500",
  },
  approved: {
    label: "Approved",
    className:
      "border-transparent bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    dotClassName: "bg-emerald-500",
  },
  rejected: {
    label: "Rejected",
    className: "border-transparent bg-destructive/10 text-destructive",
    dotClassName: "bg-destructive",
  },
};

export const expenseCategoryConfig: Record<
  ExpenseData["category"],
  { label: string; className: string; dotClassName: string }
> = {
  logistics: {
    label: "Logistics",
    className:
      "border-transparent bg-blue-500/10 text-blue-600 dark:text-blue-400",
    dotClassName: "bg-blue-500",
  },
  refreshments: {
    label: "Refreshments",
    className:
      "border-transparent bg-orange-500/10 text-orange-600 dark:text-orange-400",
    dotClassName: "bg-orange-500",
  },
  venue: {
    label: "Venue",
    className:
      "border-transparent bg-purple-500/10 text-purple-600 dark:text-purple-400",
    dotClassName: "bg-purple-500",
  },
  equipment: {
    label: "Equipment",
    className:
      "border-transparent bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    dotClassName: "bg-cyan-500",
  },
  welfare: {
    label: "Welfare",
    className:
      "border-transparent bg-pink-500/10 text-pink-600 dark:text-pink-400",
    dotClassName: "bg-pink-500",
  },
  other: {
    label: "Other",
    className:
      "border-transparent bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
    dotClassName: "bg-zinc-500",
  },
};

export const auditCategoryConfig: Record<
  AuditLogData["category"],
  { label: string; className: string }
> = {
  auth: {
    label: "Authentication",
    className:
      "border-transparent bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  payment: {
    label: "Payment",
    className:
      "border-transparent bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  settings: {
    label: "Settings",
    className:
      "border-transparent bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
  },
  security: {
    label: "Security",
    className:
      "border-transparent bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  support: {
    label: "Support",
    className:
      "border-transparent bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
  events: {
    label: "Events",
    className:
      "border-transparent bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
  announcements: {
    label: "Announcements",
    className:
      "border-transparent bg-pink-500/10 text-pink-600 dark:text-pink-400",
  },
  expenses: {
    label: "Expenses",
    className:
      "border-transparent bg-teal-500/10 text-teal-600 dark:text-teal-400",
  },
};

export const auditStatusConfig: Record<
  AuditLogData["status"],
  { label: string; className: string; dotClassName: string }
> = {
  success: {
    label: "Success",
    className:
      "border-transparent bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    dotClassName: "bg-emerald-500",
  },
  failure: {
    label: "Failure",
    className: "border-transparent bg-destructive/10 text-destructive",
    dotClassName: "bg-destructive",
  },
};

export const canModifyRole = (
  sessionUser: SessionUser,
  targetRole: string,
  targetUser: { _id: string; role: "admin" | "member" | "super_admin" },
) => {
  // No one can modify super_admin users (except for specific cases handled below)
  if (targetUser.role === "super_admin") {
    // Super admins can modify other super admins (for demotion), but not themselves
    return (
      sessionUser.role === "super_admin" && sessionUser._id !== targetUser._id
    );
  }
  // Regular users can't modify any roles
  if (sessionUser.role === "member") {
    return false;
  }
  // Admins can modify user and admin roles (but not super_admin, handled above)
  if (sessionUser.role === "admin") {
    return ["member", "admin"].includes(targetRole);
  }

  // Super admins can modify any role (except downgrading themselves)
  if (sessionUser.role === "super_admin") {
    return true;
  }
  return false;
};

export const auditlogCategories = [
  { label: "All Activities", value: "all" },
  { label: "Authentication", value: "auth" },
  { label: "Payments", value: "payment" },
  { label: "Support", value: "support" },
  { label: "Security", value: "security" },
  { label: "Settings", value: "settings" },
  { label: "Events", value: "events" },
  { label: "Announcements", value: "announcements" },
  { label: "Expenses", value: "expenses" },
];

export const ticketPriority = [
  { id: "low", name: "low" },
  { id: "medium", name: "medium" },
  { id: "high", name: "high" },
  { id: "critical", name: "critical" },
];

export const ticketCategory = [
  { id: "account", name: "Account" },
  { id: "payment", name: "Payment" },
  { id: "security", name: "security" },
  { id: "other", name: "other" },
];

export const ticketFields = [
  {
    name: "title",
    label: "Title",
    type: "text",
    placeholder: "Title (Keep it simple and short)",
  },
  {
    name: "description",
    label: "Description",
    type: "textarea",
    placeholder: "Description (Detail the issue)",
  },
  {
    name: "category",
    label: "Category",
    type: "select",
    placeholder: "Category",
    options: ticketCategory,
  },
  {
    name: "priority",
    label: "Priority",
    type: "select",
    placeholder: "Priority",
    options: ticketPriority,
  },
];

export const ticketStatusConfig: Record<
  TicketData["status"],
  { label: string; className: string; dotClassName: string }
> = {
  open: {
    label: "Open",
    className:
      "border-transparent bg-blue-500/10 text-blue-600 dark:text-blue-400",
    dotClassName: "bg-blue-500",
  },
  "in-progress": {
    label: "In Progress",
    className:
      "border-transparent bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    dotClassName: "bg-yellow-500",
  },
  resolved: {
    label: "Resolved",
    className:
      "border-transparent bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    dotClassName: "bg-emerald-500",
  },
  closed: {
    label: "Closed",
    className:
      "border-transparent bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
    dotClassName: "bg-zinc-500",
  },
};

export const ticketPriorityConfig: Record<
  TicketData["priority"],
  { label: string; className: string; dotClassName: string }
> = {
  low: {
    label: "Low",
    className:
      "border-transparent bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
    dotClassName: "bg-zinc-500",
  },
  medium: {
    label: "Medium",
    className:
      "border-transparent bg-blue-500/10 text-blue-600 dark:text-blue-400",
    dotClassName: "bg-blue-500",
  },
  high: {
    label: "High",
    className:
      "border-transparent bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    dotClassName: "bg-yellow-500",
  },
  critical: {
    label: "Critical",
    className: "border-transparent bg-destructive/10 text-destructive",
    dotClassName: "bg-destructive",
  },
};

