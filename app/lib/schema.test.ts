import { describe, expect, it } from "vitest";
import type { ZodType } from "zod";
import {
  ChangeEmailSchema,
  cancelSubscriptionSchema,
  changePasswordSchema,
  contactSchema,
  createBankAccountSchema,
  createEventSchema,
  createTicketSchema,
  createTransferSchema,
  deleteMediaSchema,
  finalizeTransferSchema,
  forgotPasswordSchema,
  initializePaymentSchema,
  onboardingSchema,
  resetPasswordSchema,
  resolveBankAccountSchema,
  retryTransferSchema,
  sendBirthdayReminderSchema,
  sendInviteCodeSchema,
  signInSchema,
  signUpSchema,
  updateEventSchema,
  updateProfileSchema,
  updateUserAvatarSchema,
  uploadSchema,
  UploadSignatureSchema,
  verifyPaymentSchema,
  verifyTransferSchema,
} from "~/lib/schema";

const validPassword = "Strong!Pass1";

const safeParse = <T>(schema: ZodType<T>, data: unknown) => schema.safeParse(data);

describe("contactSchema", () => {
  it("accepts a valid contact message", () => {
    expect(safeParse(contactSchema, {
      fullname: "Ada Lovelace",
      email: "ada@example.com",
      subject: "Payment question",
      message: "How do I pay my membership dues?",
    }).success).toBe(true);
  });

  it("rejects short name, bad email, short subject and short message", () => {
    const res = safeParse(contactSchema, {
      fullname: "Ad",
      email: "nope",
      subject: "hi",
      message: "too short",
    });
    expect(res.success).toBe(false);
    expect(res.error!.issues.map((i) => i.message)).toEqual(
      expect.arrayContaining([
        "Full name must be at least 3 characters long",
        '"Complete this field to continue"',
        "At least 3 characters is needed",
        "At least 10 characters is needed",
      ]),
    );
  });
});

describe("signUpSchema", () => {
  it("accepts a valid signup", () => {
    expect(safeParse(signUpSchema, {
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: validPassword,
      inviteCode: "INV12345",
    }).success).toBe(true);
  });

  it("rejects a weak password with per-rule messages", () => {
    const res = safeParse(signUpSchema, {
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "password", // no upper, no special, no digit... actually has none
      inviteCode: "INV12345",
    });
    expect(res.success).toBe(false);
    expect(res.error!.issues.map((i) => i.message)).toEqual(
      expect.arrayContaining([
        "Password must contain at least one uppercase letter",
        "Password must contain at least one special character",
        "Password must contain at least one number",
      ]),
    );
  });

  it("rejects a short password", () => {
    const res = safeParse(signUpSchema, {
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "A!1",
      inviteCode: "INV12345",
    });
    expect(res.success).toBe(false);
    expect(res.error!.issues[0].message).toBe(
      "Password must be at least 8 characters long",
    );
  });

  it("rejects a missing invite code", () => {
    const res = safeParse(signUpSchema, {
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: validPassword,
      inviteCode: "",
    });
    expect(res.success).toBe(false);
    expect(res.error!.issues.map((i) => i.message)).toContain(
      "Invite code is required",
    );
  });

  it("rejects an invite code longer than 8 characters", () => {
    const res = safeParse(signUpSchema, {
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: validPassword,
      inviteCode: "INV123456789",
    });
    expect(res.success).toBe(false);
    expect(res.error!.issues.map((i) => i.message)).toContain(
      "Invite code must be at most 8 characters long",
    );
  });
});

describe("signInSchema / forgotPasswordSchema", () => {
  it("accepts valid credentials", () => {
    expect(safeParse(signInSchema, { email: "ada@example.com", password: validPassword }).success).toBe(true);
  });

  it("rejects a bad email", () => {
    expect(safeParse(signInSchema, { email: "nope", password: validPassword }).success).toBe(false);
  });

  it("forgotPasswordSchema requires a valid email", () => {
    expect(safeParse(forgotPasswordSchema, { email: "ada@example.com" }).success).toBe(true);
    expect(safeParse(forgotPasswordSchema, { email: "nope" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("accepts a strong new password", () => {
    expect(safeParse(resetPasswordSchema, { newPassword: validPassword }).success).toBe(true);
  });

  it("rejects weak new passwords", () => {
    const res = safeParse(resetPasswordSchema, { newPassword: "lowercase1!" });
    expect(res.success).toBe(false);
    expect(res.error!.issues.map((i) => i.message)).toContain(
      "New password must contain at least one uppercase letter",
    );
  });
});

describe("sendInviteCodeSchema", () => {
  it("accepts a comma-separated email string and splits it", () => {
    const res = sendInviteCodeSchema.safeParse({
      email: " a@b.com , c@d.com ",
      role: "member",
    });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.email).toEqual(["a@b.com", "c@d.com"]);
  });

  it("accepts an array of emails", () => {
    const res = sendInviteCodeSchema.safeParse({
      email: ["a@b.com", "c@d.com"],
      role: "admin",
    });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.email).toHaveLength(2);
  });

  it("rejects when all emails are invalid", () => {
    const res = sendInviteCodeSchema.safeParse({
      email: "nope, also-nope",
      role: "member",
    });
    expect(res.success).toBe(false);
    expect(res.error!.issues[0].message).toBe(
      "One or more email addresses are invalid",
    );
  });

  it("rejects an empty email list", () => {
    const res = sendInviteCodeSchema.safeParse({ email: ",,", role: "member" });
    expect(res.success).toBe(false);
    expect(res.error!.issues.map((i) => i.message)).toContain(
      "Add at least one email address",
    );
  });

  it("rejects an unknown role", () => {
    const res = sendInviteCodeSchema.safeParse({ email: "a@b.com", role: "super_admin" });
    expect(res.success).toBe(false);
  });
});

describe("media schemas", () => {
  it("UploadSignatureSchema requires a folder of at least 2 chars", () => {
    expect(safeParse(UploadSignatureSchema, { folder: "photos" }).success).toBe(true);
    expect(safeParse(UploadSignatureSchema, { folder: "p" }).success).toBe(false);
  });

  it("uploadSchema requires files and folder", () => {
    expect(safeParse(uploadSchema, { files: ["a", "b"], folder: "x" }).success).toBe(true);
    expect(safeParse(uploadSchema, { files: [], folder: "x" }).success).toBe(false);
    expect(safeParse(uploadSchema, { files: ["a"] }).success).toBe(false);
  });

  it("deleteMediaSchema requires at least one public id", () => {
    expect(safeParse(deleteMediaSchema, { publicIds: ["id1"] }).success).toBe(true);
    expect(safeParse(deleteMediaSchema, { publicIds: [] }).success).toBe(false);
  });

  it("updateUserAvatarSchema allows partial avatar updates", () => {
    expect(safeParse(updateUserAvatarSchema, {}).success).toBe(true);
    expect(safeParse(updateUserAvatarSchema, { image: "url", imagePublicId: "pid" }).success).toBe(true);
  });
});

describe("updateProfileSchema", () => {
  it("accepts an empty profile update", () => {
    expect(safeParse(updateProfileSchema, {}).success).toBe(true);
  });

  it("accepts a valid phone with a leading +", () => {
    expect(safeParse(updateProfileSchema, { phone: "+2348012345678" }).success).toBe(true);
    expect(safeParse(updateProfileSchema, { phone: "" }).success).toBe(true);
  });

  it("rejects a phone without a leading +", () => {
    const res = safeParse(updateProfileSchema, { phone: "08012345678" });
    expect(res.success).toBe(false);
    expect(res.error!.issues[0].message).toBe(
      "Phone number must start with a + and contain 10-15 digits",
    );
  });

  it("rejects a phone that is too short", () => {
    expect(safeParse(updateProfileSchema, { phone: "+234" }).success).toBe(false);
  });

  it("accepts a valid gender and rejects unknown genders", () => {
    expect(safeParse(updateProfileSchema, { gender: "male" }).success).toBe(true);
    expect(safeParse(updateProfileSchema, { gender: "robot" }).success).toBe(false);
  });

  it("coerces dateOfBirth strings to dates and treats blanks as undefined", () => {
    const res = safeParse(updateProfileSchema, { dateOfBirth: "1990-05-15" });
    expect(res.success).toBe(true);
    if (res.success) expect(res.data.dateOfBirth).toBeInstanceOf(Date);
    const blank = safeParse(updateProfileSchema, { dateOfBirth: "" });
    expect(blank.success).toBe(true);
    if (blank.success) expect(blank.data.dateOfBirth).toBeUndefined();
  });

  it("coerces boolean flags", () => {
    const res = safeParse(updateProfileSchema, {
      disableBirthDate: true,
      disableEmail: "true",
      disableGender: false,
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.disableBirthDate).toBe(true);
      expect(res.data.disableGender).toBe(false);
    }
  });

  it("onboardingSchema extends with avatar fields", () => {
    const res = safeParse(onboardingSchema, { image: "x", imagePublicId: "y" });
    expect(res.success).toBe(true);
  });
});

describe("bank account schemas", () => {
  it("createBankAccountSchema accepts valid account info", () => {
    expect(safeParse(createBankAccountSchema, {
      bankAccountName: "Ada Lovelace",
      bankAccountNumber: "0123456789",
      bankCode: "011",
      bank: "First Bank",
    }).success).toBe(true);
  });

  it("createBankAccountSchema rejects a short account name", () => {
    expect(safeParse(createBankAccountSchema, {
      bankAccountName: "Ad",
      bankAccountNumber: "0123456789",
      bankCode: "011",
      bank: "First Bank",
    }).success).toBe(false);
  });

  it("resolveBankAccountSchema requires a 10-digit account number", () => {
    expect(safeParse(resolveBankAccountSchema, { accountNumber: "0123456789", bankCode: "011" }).success).toBe(true);
    expect(safeParse(resolveBankAccountSchema, { accountNumber: "012345", bankCode: "011" }).success).toBe(false);
    expect(safeParse(resolveBankAccountSchema, { accountNumber: "01234567890", bankCode: "011" }).success).toBe(false);
  });
});

describe("event schemas", () => {
  const validEvent = {
    title: "Quarterly Meeting",
    detail: "Review of Q3 goals and milestones.",
    location: "Lagos",
    date: "2030-12-25",
    time: "10:00",
    eventType: "meeting",
    organizer: "Ada Lovelace",
  };

  it("createEventSchema accepts a future event", () => {
    expect(safeParse(createEventSchema, validEvent).success).toBe(true);
  });

  it("createEventSchema rejects an event in the past", () => {
    const res = safeParse(createEventSchema, {
      ...validEvent,
      date: "2020-01-01",
    });
    expect(res.success).toBe(false);
    expect(res.error!.issues.map((i) => i.message)).toContain(
      "Event date and time cannot be in the past",
    );
  });

  it("createEventSchema rejects short title and invalid event type", () => {
    const badTitle = safeParse(createEventSchema, { ...validEvent, title: "AB" });
    expect(badTitle.success).toBe(false);
    const badType = safeParse(createEventSchema, { ...validEvent, eventType: "hangout" });
    expect(badType.success).toBe(false);
  });

  it("createEventSchema accepts blank coordinates as undefined", () => {
    const res = safeParse(createEventSchema, {
      ...validEvent,
      longitude: "",
      latitude: "6.5244",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.longitude).toBeUndefined();
      expect(res.data.latitude).toBe(6.5244);
    }
  });

  it("updateEventSchema validates date/time are parseable", () => {
    expect(safeParse(updateEventSchema, validEvent).success).toBe(true);
    const res = safeParse(updateEventSchema, { ...validEvent, date: "garbage" });
    expect(res.success).toBe(false);
    expect(res.error!.issues.map((i) => i.message)).toContain(
      "Event date and time are invalid",
    );
  });
});

describe("initializePaymentSchema", () => {
  it("accepts a membership dues payment", () => {
    expect(safeParse(initializePaymentSchema, {
      amount: 5000,
      paymentType: "membership_dues",
    }).success).toBe(true);
  });

  it("rejects amounts below the minimum", () => {
    const res = safeParse(initializePaymentSchema, { amount: 1999, paymentType: "donation" });
    expect(res.success).toBe(false);
    expect(res.error!.issues.map((i) => i.message)).toContain(
      "Minimum payment amount is 2000 Naira",
    );
  });

  it("coerces amount and recurring flags from strings", () => {
    const res = safeParse(initializePaymentSchema, {
      amount: "5000",
      paymentType: "membership_dues",
      isRecurring: "true",
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.amount).toBe(5000);
      expect(res.data.isRecurring).toBe(true);
    }
  });

  it("rejects recurring payments for non-membership types", () => {
    const res = safeParse(initializePaymentSchema, {
      amount: 5000,
      paymentType: "donation",
      isRecurring: true,
    });
    expect(res.success).toBe(false);
    expect(res.error!.issues.map((i) => i.message)).toContain(
      "Recurring payments are only supported for membership dues.",
    );
  });

  it("requires an eventId for event payments", () => {
    const res = safeParse(initializePaymentSchema, {
      amount: 5000,
      paymentType: "event",
    });
    expect(res.success).toBe(false);
    expect(res.error!.issues.map((i) => i.message)).toContain(
      "An event ID is required to pay for an event.",
    );
  });
});

describe("payment/subscription verification", () => {
  it("verifyPaymentSchema requires a reference", () => {
    expect(safeParse(verifyPaymentSchema, { reference: "ref-1" }).success).toBe(true);
    expect(safeParse(verifyPaymentSchema, {}).success).toBe(false);
  });

  it("cancelSubscriptionSchema requires a reference or a code+token pair", () => {
    expect(safeParse(cancelSubscriptionSchema, { reference: "r" }).success).toBe(true);
    expect(safeParse(cancelSubscriptionSchema, { code: "c", token: "t" }).success).toBe(true);
    expect(safeParse(cancelSubscriptionSchema, {}).success).toBe(false);
    expect(safeParse(cancelSubscriptionSchema, { code: "c" }).success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("accepts matching strong passwords", () => {
    expect(safeParse(changePasswordSchema, {
      currentPassword: validPassword,
      newPassword: validPassword,
      confirmPassword: validPassword,
    }).success).toBe(true);
  });

  it("rejects mismatched confirm password", () => {
    const res = safeParse(changePasswordSchema, {
      currentPassword: validPassword,
      newPassword: validPassword,
      confirmPassword: "Different!1",
    });
    expect(res.success).toBe(false);
    expect(res.error!.issues.map((i) => i.message)).toContain(
      "Confirm password must match new password",
    );
  });

  it("rejects a weak current password", () => {
    const res = safeParse(changePasswordSchema, {
      currentPassword: "weak",
      newPassword: validPassword,
      confirmPassword: validPassword,
    });
    expect(res.success).toBe(false);
  });
});

describe("ChangeEmailSchema", () => {
  it("accepts a valid email and rejects invalid ones", () => {
    expect(safeParse(ChangeEmailSchema, { newEmail: "ada@example.com" }).success).toBe(true);
    expect(safeParse(ChangeEmailSchema, { newEmail: "not-an-email" }).success).toBe(false);
  });
});

describe("transfer schemas", () => {
  it("createTransferSchema accepts a valid transfer", () => {
    expect(safeParse(createTransferSchema, {
      userId: "u-1",
      amount: 5000,
    }).success).toBe(true);
  });

  it("createTransferSchema rejects amounts below 100", () => {
    const res = safeParse(createTransferSchema, { userId: "u-1", amount: 99 });
    expect(res.success).toBe(false);
    expect(res.error!.issues.map((i) => i.message)).toContain(
      "Minimum transfer amount is 100 Naira",
    );
  });

  it("createTransferSchema requires a recipient", () => {
    const res = safeParse(createTransferSchema, { userId: "", amount: 5000 });
    expect(res.success).toBe(false);
    expect(res.error!.issues.map((i) => i.message)).toContain("Recipient is required");
  });

  it("createTransferSchema caps the reason length", () => {
    const res = safeParse(createTransferSchema, {
      userId: "u-1",
      amount: 5000,
      reason: "x".repeat(101),
    });
    expect(res.success).toBe(false);
    expect(res.error!.issues.map((i) => i.message)).toContain(
      "Reason cannot be longer than 100 characters",
    );
  });

  it("verifyTransferSchema and retryTransferSchema require a reference", () => {
    expect(safeParse(verifyTransferSchema, { reference: "r" }).success).toBe(true);
    expect(safeParse(verifyTransferSchema, {}).success).toBe(false);
    expect(safeParse(retryTransferSchema, { reference: "r" }).success).toBe(true);
    expect(safeParse(retryTransferSchema, {}).success).toBe(false);
  });

  it("finalizeTransferSchema requires a 6-digit OTP", () => {
    expect(safeParse(finalizeTransferSchema, { transferCode: "t", otp: "123456" }).success).toBe(true);
    expect(safeParse(finalizeTransferSchema, { transferCode: "t", otp: "12345" }).success).toBe(false);
    expect(safeParse(finalizeTransferSchema, { transferCode: "t", otp: "1234567" }).success).toBe(false);
    expect(safeParse(finalizeTransferSchema, { otp: "123456" }).success).toBe(false);
  });
});

describe("ticket schemas", () => {
  it("createTicketSchema accepts a valid ticket", () => {
    expect(safeParse(createTicketSchema, {
      title: "Cannot login",
      description: "I reset my password but the login still fails on mobile.",
      category: "account",
      priority: "high",
    }).success).toBe(true);
  });

  it("createTicketSchema rejects a short title/description", () => {
    const res = safeParse(createTicketSchema, {
      title: "AB",
      description: "too short",
      category: "account",
      priority: "high",
    });
    expect(res.success).toBe(false);
    expect(res.error!.issues.map((i) => i.message)).toEqual(
      expect.arrayContaining([
        "Ticket title must be at least 3 characters long",
        "Description must be at least 10 characters long",
      ]),
    );
  });

  it("createTicketSchema rejects unknown category and priority", () => {
    expect(safeParse(createTicketSchema, {
      title: "Cannot login",
      description: "I reset my password but the login still fails on mobile.",
      category: "billing",
      priority: "urgent",
    }).success).toBe(false);
  });
});

describe("sendBirthdayReminderSchema", () => {
  it("requires a userId", () => {
    expect(safeParse(sendBirthdayReminderSchema, { userId: "u-1" }).success).toBe(true);
    const res = safeParse(sendBirthdayReminderSchema, { userId: "" });
    expect(res.success).toBe(false);
    expect(res.error!.issues[0].message).toBe("User is required");
  });
});
