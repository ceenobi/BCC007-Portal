import { z } from "zod";

export const contactSchema = z.object({
  fullname: z.string().min(3, {
    message: "Full name must be at least 3 characters long",
  }),
  email: z.email({
    message: '"Complete this field to continue"',
  }),
  subject: z
    .string({
      message: "Subject is required",
    })
    .min(3, {
      message: "At least 3 characters is needed",
    })
    .max(50, {
      message: "Subject cannot be greater than 50 characters",
    }),
  message: z
    .string({
      message: "Complete this field to continue",
    })
    .min(10, {
      message: "At least 10 characters is needed",
    }),
});

export const signUpSchema = z.object({
  name: z.string().min(3, {
    message: "Full name must be at least 3 characters long",
  }),
  email: z.email({ message: "Complete this field to continue" }),
  password: z
    .string()
    .min(8, {
      message: "Password must be at least 8 characters long",
    })
    .regex(/[A-Z]/, {
      message: "Password must contain at least one uppercase letter",
    })
    .regex(/[a-z]/, {
      message: "Password must contain at least one lowercase letter",
    })
    .regex(/[!@#$%^&*(),.?":{}|<>]/, {
      message: "Password must contain at least one special character",
    })
    .regex(/\d/, {
      message: "Password must contain at least one number",
    }),
  inviteCode: z
    .string()
    .min(1, "Invite code is required")
    .max(8, "Invite code must be at most 8 characters long"),
});

export const signInSchema = z.object({
  email: z.email({ message: "Complete this field to continue" }),
  password: z
    .string()
    .min(8, {
      message: "Password must be at least 8 characters long",
    })
    .regex(/[A-Z]/, {
      message: "Password must contain at least one uppercase letter",
    })
    .regex(/[a-z]/, {
      message: "Password must contain at least one lowercase letter",
    })
    .regex(/[!@#$%^&*(),.?":{}|<>]/, {
      message: "Password must contain at least one special character",
    })
    .regex(/\d/, {
      message: "Password must contain at least one number",
    }),
});

export const forgotPasswordSchema = z.object({
  email: z.email({ message: "Complete this field to continue" }),
});

export const resetPasswordSchema = z.object({
  newPassword: z
    .string({
      message: "New password is required",
    })
    .min(8, {
      message: "New password must be at least 8 characters long",
    })
    .regex(/[A-Z]/, {
      message: "New password must contain at least one uppercase letter",
    })
    .regex(/[a-z]/, {
      message: "New password must contain at least one lowercase letter",
    })
    .regex(/[!@#$%^&*(),.?":{}|<>]/, {
      message: "New password must contain at least one special character",
    })
    .regex(/\d/, {
      message: "New password must contain at least one number",
    }),
});

export const sendInviteCodeSchema = z.object({
  email: z
    .union([z.string(), z.array(z.string())])
    .transform((value) =>
      Array.isArray(value)
        ? value
        : value
            .split(",")
            .map((email) => email.trim())
            .filter(Boolean),
    )
    .pipe(
      z
        .array(z.email({ message: "One or more email addresses are invalid" }))
        .min(1, "Add at least one email address"),
    ),
  role: z.enum(["member", "admin"]),
});

export const UploadSignatureSchema = z.object({
  folder: z.string().min(2, {
    message: "Folder name is required and should be at least 2 characters long",
  }),
});

export const uploadSchema = z.object({
  files: z.array(z.string()).min(1, {
    message: "At least one file is required",
  }),
  folder: z.string().min(1, {
    message: "Folder is required",
  }),
});

export const deleteMediaSchema = z.object({
  publicIds: z.array(z.string()).min(1, {
    message: "At least one public ID is required",
  }),
});

export const updateUserAvatarSchema = z.object({
  image: z.string().optional(),
  imagePublicId: z.string().optional(),
});

export const updateProfileSchema = z.object({
  name: z
    .string({ message: "Full name is required" })
    .min(3, { message: "Full name must be at least 3 characters long" })
    .optional(),
  phone: z
    .string({ message: "Phone is required" })
    .refine((num) => /^\+\d{10,15}$/.test(num), {
      message: "Phone number must start with a + and contain 10-15 digits",
    })
    .optional()
    .or(z.literal("")),
  gender: z.enum(["male", "female", "other"]).optional(),
  occupation: z.string().optional(),
  location: z.string().optional(),
  dateOfBirth: z.preprocess(
    (value) =>
      typeof value !== "string" || value.trim() === "" ? undefined : value,
    z.coerce.date().optional(),
  ),
  disableBirthDate: z.coerce.boolean().optional(),
  disableEmail: z.coerce.boolean().optional(),
  disableGender: z.coerce.boolean().optional(),
});

export const onboardingSchema = updateProfileSchema.extend({
  image: z.string().optional(),
  imagePublicId: z.string().optional(),
});

export const createBankAccountSchema = z.object({
  bankAccountName: z.string().min(3, {
    message: "Your bank account name must be at least 3 characters long",
  }),
  bankAccountNumber: z.string().max(10, {
    message: "Your bank account number must be at most 10 characters long",
  }),
  bankCode: z.string(),
  bank: z.string(),
});

export const resolveBankAccountSchema = z.object({
  accountNumber: z
    .string({ message: "Account number is required" })
    .min(10, { message: "Account number must be 10 digits" })
    .max(10, { message: "Account number must be 10 digits" }),
  bankCode: z
    .string({ message: "Bank is required" })
    .min(1, { message: "Bank is required" }),
});

const eventFields = {
  title: z.string().min(3, {
    message: "Title must be at least 3 characters long",
  }),
  detail: z
    .string()
    .min(3, {
      message: "Detail must be at least 3 characters long",
    })
    .max(1000, {
      message: "Detail must be at most 1000 characters long",
    }),
  location: z.string().min(3, {
    message: "Location must be at least 3 characters long",
  }),
  date: z.string().min(3, {
    message: "Date must be at least 3 characters long",
  }),
  time: z.string().min(3, {
    message: "Time must be at least 3 characters long",
  }),
  eventType: z.enum(["party", "meeting", "birthday", "other"]),
  organizer: z.string().min(3, {
    message: "Organizer must be at least 3 characters long",
  }),
  featuredImage: z.string().optional(),
  featuredImageId: z.string().optional(),
  longitude: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.coerce.number().optional(),
  ),
  latitude: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.coerce.number().optional(),
  ),
  capacity: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.coerce.number().int().positive().optional(),
  ),
} satisfies z.ZodRawShape;

export const createEventSchema = z
  .object({
    ...eventFields,
    idempotencyKey: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.date && data.time) {
        const date = new Date(`${data.date}T${data.time}`);
        if (isNaN(date.getTime())) return false;
        return date.getTime() >= Date.now();
      }
      return true;
    },
    {
      message: "Event date and time cannot be in the past",
    },
  );

export const updateEventSchema = z.object(eventFields).refine(
  (data) => {
    if (!data.date || !data.time) return true;
    return !isNaN(new Date(`${data.date}T${data.time}`).getTime());
  },
  {
    message: "Event date and time are invalid",
  },
);

const announcementFields = {
  title: z.string().min(3, {
    message: "Title must be at least 3 characters long",
  }),
  content: z
    .string()
    .min(3, {
      message: "Content must be at least 3 characters long",
    })
    .max(2000, {
      message: "Content must be at most 2000 characters long",
    }),
  isPinned: z.boolean().optional(),
  featuredImage: z.string().optional(),
  featuredImageId: z.string().optional(),
} satisfies z.ZodRawShape;

export const createAnnouncementSchema = z.object({
  ...announcementFields,
  status: z.enum(["draft", "published"]).optional(),
  idempotencyKey: z.string().optional(),
});

export const updateAnnouncementSchema = z.object({
  ...announcementFields,
  status: z.enum(["draft", "published", "archived"]).optional(),
});

export const initializePaymentSchema = z
  .object({
    amount: z.coerce.number().min(2000, "Minimum payment amount is 2000 Naira"),
    paymentType: z.enum(["donation", "event", "membership_dues"]),
    isRecurring: z
      .preprocess(
        (val) => (val === "true" ? true : val === "false" ? false : val),
        z.boolean(),
      )
      .optional(),
    eventId: z.string().optional(),
    note: z
      .string()
      .max(50, "Note is too long")
      .refine(
        (value) => value.trim().length === 0 || value.trim().length >= 5,
        { message: "Note is too short" },
      )
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.isRecurring && data.paymentType !== "membership_dues") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["isRecurring"],
        message: "Recurring payments are only supported for membership dues.",
      });
    }
    if (data.paymentType === "event" && !data.eventId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["eventId"],
        message: "An event ID is required to pay for an event.",
      });
    }
  });

export const verifyPaymentSchema = z.object({
  reference: z.string().min(1, "Payment reference is required"),
});

export const cancelSubscriptionSchema = z
  .object({
    code: z.string().optional().default(""),
    token: z.string().optional().default(""),
    reference: z.string().optional(),
  })
  .refine(
    (data) => Boolean(data.reference) || Boolean(data.code && data.token),
    {
      message: "Provide a subscription code/token or a payment reference.",
    },
  );

export const changePasswordSchema = z
  .object({
    newPassword: z
      .string({
        message: "New password is required",
      })
      .min(8, {
        message: "New password must be at least 8 characters long",
      })
      .regex(/[A-Z]/, {
        message: "New password must contain at least one uppercase letter",
      })
      .regex(/[a-z]/, {
        message: "New password must contain at least one lowercase letter",
      })
      .regex(/[!@#$%^&*(),.?":{}|<>]/, {
        message: "New password must contain at least one special character",
      })
      .regex(/\d/, {
        message: "New password must contain at least one number",
      }),
    confirmPassword: z
      .string({
        message: "Confirm password is required",
      })
      .min(8, {
        message: "Confirm password must be at least 8 characters long",
      })
      .regex(/[A-Z]/, {
        message: "Confirm password must contain at least one uppercase letter",
      })
      .regex(/[a-z]/, {
        message: "Confirm password must contain at least one lowercase letter",
      })
      .regex(/[!@#$%^&*(),.?":{}|<>]/, {
        message: "Confirm password must contain at least one special character",
      })
      .regex(/\d/, {
        message: "Confirm password must contain at least one number",
      }),
    currentPassword: z
      .string({
        message: "Current password is required",
      })
      .min(8, {
        message: "Current password must be at least 8 characters long",
      })
      .regex(/[A-Z]/, {
        message: "Current password must contain at least one uppercase letter",
      })
      .regex(/[a-z]/, {
        message: "Current password must contain at least one lowercase letter",
      })
      .regex(/[!@#$%^&*(),.?":{}|<>]/, {
        message: "Current password must contain at least one special character",
      })
      .regex(/\d/, {
        message: "Current password must contain at least one number",
      }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Confirm password must match new password",
    path: ["confirmPassword"],
  });

export const ChangeEmailSchema = z.object({
  newEmail: z.email({
    message: "Please enter a valid email address",
  }),
});

export const createTransferSchema = z.object({
  userId: z.string().min(1, "Recipient is required"),
  amount: z.coerce
    .number({
      message: "Amount is required",
    })
    .min(100, "Minimum transfer amount is 100 Naira"),
  reason: z
    .string()
    .max(100, "Reason cannot be longer than 100 characters")
    .optional(),
  // Client-generated once per submission intent; reused on retry so the server
  // can deduplicate concurrent/duplicate requests (double-click, timeouts).
  idempotencyKey: z.string().min(1).optional(),
});

export const verifyTransferSchema = z.object({
  reference: z.string().min(1, "Transfer reference is required"),
});

export const retryTransferSchema = z.object({
  reference: z.string().min(1, "Transfer reference is required"),
});

export const finalizeTransferSchema = z.object({
  transferCode: z.string().min(1, "Transfer code is required"),
  otp: z
    .string()
    .min(6, "OTP must be at least 6 digits")
    .max(6, "OTP must be exactly 6 digits"),
});

export const createTicketSchema = z.object({
  title: z.string().min(3, {
    message: "Ticket title must be at least 3 characters long",
  }),
  description: z
    .string()
    .min(10, {
      message: "Description must be at least 10 characters long",
    })
    .max(1000, {
      message: "Description must be at most 1000 characters long",
    }),
  category: z.enum(["account", "security", "payment", "other"]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  idempotencyKey: z.string().optional(),
});

export const sendBirthdayReminderSchema = z.object({
  userId: z.string().min(1, { message: "User is required" }),
});
