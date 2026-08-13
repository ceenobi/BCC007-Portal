import type z from "zod";
import type { roles } from "./lib/constants";
import type {
  cancelSubscriptionSchema,
  createAnnouncementSchema,
  createBankAccountSchema,
  createEventSchema,
  createExpenseSchema,
  createTransferSchema,
  deleteMediaSchema,
  forgotPasswordSchema,
  initializePaymentSchema,
  onboardingSchema,
  resetPasswordSchema,
  resolveBankAccountSchema,
  sendInviteCodeSchema,
  signInSchema,
  signUpSchema,
  updateProfileSchema,
  updateEventSchema,
  updateAnnouncementSchema,
  updateExpenseSchema,
  updateUserAvatarSchema,
  uploadSchema,
  UploadSignatureSchema,
  verifyPaymentSchema,
  verifyTransferSchema,
  changePasswordSchema,
  ChangeEmailSchema,
  contactSchema,
  createTicketSchema,
  sendBirthdayReminderSchema,
} from "./lib/schema";

export type SessionUser = {
  _id: string;
  name: string;
  email: string;
  role: (typeof roles)[keyof typeof roles];
  isOnboarded: boolean;
  emailVerified: boolean;
  tourPending?: boolean;
  image?: string;
  imagePublicId?: string;
  phone?: string;
  gender?: string;
  occupation?: string;
  location?: string;
  dateOfBirth?: string;
  isSuspended?: boolean;
  createdAt?: string;
  updatedAt?: string;
  disableBirthDate?: boolean;
  disableEmail?: boolean;
  disableGender?: boolean;
  tourPending?: boolean;
};

export type SignUpSchemaType = z.infer<typeof signUpSchema>;
export type SignInSchemaType = z.infer<typeof signInSchema>;
export type SendInviteCodeSchemaType = z.infer<typeof sendInviteCodeSchema>;
export type ForgotPasswordSchemaType = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordSchemaType = z.infer<typeof resetPasswordSchema>;
export type UploadSignatureSchemaType = z.infer<typeof UploadSignatureSchema>;
export type UploadSchemaType = z.infer<typeof uploadSchema>;
export type DeleteMediaSchemaType = z.infer<typeof deleteMediaSchema>;
export type UpdateUserAvatarSchemaType = z.infer<typeof updateUserAvatarSchema>;
export type UpdateProfileSchemaType = z.infer<typeof updateProfileSchema>;
export type OnboardingSchemaType = z.infer<typeof onboardingSchema>;
export type CreateBankAccountSchemaType = z.infer<
  typeof createBankAccountSchema
>;
export type CreateEventSchemaType = z.infer<typeof createEventSchema>;
export type UpdateEventSchemaType = z.infer<typeof updateEventSchema>;
export type CreateAnnouncementSchemaType = z.infer<
  typeof createAnnouncementSchema
>;
export type UpdateAnnouncementSchemaType = z.infer<
  typeof updateAnnouncementSchema
>;
export type CreateExpenseSchemaType = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseSchemaType = z.infer<typeof updateExpenseSchema>;
export type ResolveBankAccountSchemaType = z.infer<
  typeof resolveBankAccountSchema
>;
export type InitializePaymentSchemaType = z.infer<
  typeof initializePaymentSchema
>;
export type VerifyPaymentSchemaType = z.infer<typeof verifyPaymentSchema>;
export type CancelSubscriptionSchemaType = z.infer<
  typeof cancelSubscriptionSchema
  >;
export type CreateTransferSchemaType = z.infer<typeof createTransferSchema>;
export type VerifyTransferSchemaType = z.infer<typeof verifyTransferSchema>;
export type FinalizeTransferSchemaType = z.infer<typeof finalizeTransferSchema>;
export type RetryTransferSchemaType = z.infer<typeof retryTransferSchema>;
export type ChangePasswordSchemaType = z.infer<typeof changePasswordSchema>;
export type ChangeEmailSchemaType = z.infer<typeof ChangeEmailSchema>;
export type ContactSchemaType = z.infer<typeof contactSchema>;
export type CreateTicketSchemaType = z.infer<typeof createTicketSchema>;
export type SendBirthdayReminderSchemaType = z.infer<
  typeof sendBirthdayReminderSchema
>;


export type UsePaginateProps = {
  totalPages: number;
  hasMore: boolean;
  currentPage: number;
};

export type EventData = {
  _id: string;
  title: string;
  detail: string;
  location: string;
  latitude?: number;
  longitude?: number;
  date: Date;
  time: string;
  eventType: "party" | "meeting" | "birthday" | "other";
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
  interestedMembers: SessionData[];
  checkedInMembers: SessionData[];
  capacity?: number;
  organizer: SessionData;
  featuredImage?: string;
  featuredImageId?: string | undefined;
};

export type AnnouncementData = {
  _id: string;
  title: string;
  content: string;
  author: SessionData;
  status: "draft" | "published" | "archived";
  isPinned: boolean;
  featuredImage?: string;
  featuredImageId?: string | undefined;
  publishedAt?: Date;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseData = {
  _id: string;
  userId: SessionUser;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  category:
    | "logistics"
    | "refreshments"
    | "venue"
    | "equipment"
    | "welfare"
    | "other";
  status: "pending" | "approved" | "rejected";
  transferId?: string;
  monthKey?: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
};

export type PaymentData = {
  _id: string
  userId: SessionUser
  paymentType: 'donation' | 'event' | 'membership_dues'
  event: string
  isRecurring: boolean
  recurringInterval: 'weekly' | 'monthly' | 'quarterly' | 'annually'
  nextPaymentDate: Date
  lastPaymentDate: Date
  amount: number
  paymentStatus: 'pending' | 'completed' | 'failed' | 'cancelled'
  paystackSubscriptionId: string
  paystackEmailToken: string
  paystackCustomerId: string
  subscriptionType: 'levy_plan'
  reference: string
  monthKey: string
  metadata: Record<string, any>
  note: string
  subscriptionStatus: 'active' | 'cancelled' | 'expired'
  createdAt: Date
  updatedAt: Date
}

export type BankDetails = {
  bank: string
  bankAccountName: string
  bankAccountNumber: string
  bankCode: string
  createdAt: Date
  updatedAt: Date
  userId: string
  _id: string
}

export type TransferData = {
  _id: string
  userId: string
  paymentId?: string
  bankDetailsId?: string
  recipientCode: string
  amount: number
  fee: number
  currency: string
  reference: string
  transferCode?: string
  reason?: string
  status:
    | "pending"
    | "otp"
    | "in_transit"
    | "success"
    | "failed"
    | "reversed"
    | "aborted"
    | "abandoned";
  failureReason?: string
  metadata: Record<string, any>
  createdAt: string
  updatedAt: string
}

export type AuditLogData = {
  _id: string;
  userId: string;
  userName: string;
  action: string;
  category:
    | "auth"
    | "payment"
    | "settings"
    | "security"
    | "support"
    | "events"
    | "announcements"
    | "expenses";
  details: Record<string, any>;
  status: "success" | "failure";
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
};

export type TicketData = {
  _id: string;
  userId: SessionUser;
  ticketId: string;
  title: string;
  description: string;
  category: "account" | "security" | "payment" | "other";
  priority: "low" | "medium" | "high" | "critical";
  status: "open" | "in-progress" | "resolved" | "closed";
  assignedTo: SessionUser | null;
  createdAt: Date;
  updatedAt: Date;
};

export type GlobalSearchResultType =
  | "member"
  | "event"
  | "payment"
  | "transfer"
  | "ticket"
  | "audit";

export type GlobalSearchResult = {
  id: string;
  title: string;
  subtitle: string;
  meta?: string;
  href: string;
};

export type GlobalSearchSection = {
  type: GlobalSearchResultType;
  label: string;
  viewAllHref: string;
  results: GlobalSearchResult[];
};

export type GlobalSearchResponse = {
  query: string;
  sections: GlobalSearchSection[];
};

export type HealthStatus = {
  status: "ok" | "degraded" | "down";
  timestamp: string;
  uptime: number;
  environment: string;
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
  };
  checks: {
    database: { status: "ok" | "down"; state: string };
    redis: { status: "ok" | "down"; ping: string | null };
  };
};