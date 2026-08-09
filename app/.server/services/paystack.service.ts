import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "../config/keys";
import logger from "../config/logger";
import { getPaystack } from "../config/paystack";
import Payment from "../models/payment";
import Transfer from "../models/transfer";
import UserModel from "../models/user";
import type { User as AuthUser } from "../services/better-auth";
import { fetchWithCache, invalidateCache } from "../utils/cache";
import { workflowClient } from "../workflows/client";

export interface PaystackBank {
  name: string;
  slug: string;
  code: string;
  longcode: string;
  gateway: string | null;
  pay_with_bank: boolean;
  pay_with_bank_transfer: boolean;
  active: boolean;
  is_deleted: boolean;
  country: string;
  currency: string;
  type: string;
  id: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaystackResolvedAccount {
  account_number: string;
  account_name: string;
}

export type PaymentType = "donation" | "event" | "membership_dues";

export interface InitializePaymentData {
  amount: number;
  paymentType: PaymentType;
  isRecurring?: boolean;
  eventId?: string;
  note?: string;
}

export interface VerifyPaymentData {
  reference: string;
}

export interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    reference: string;
    access_code: string;
  };
}

export interface PaystackSubscriptionResponse {
  status: boolean;
  message: string;
  data: {
    id: string;
    customer: string;
    plan: string;
    amount: number;
    status: string;
    next_payment_date?: string;
    created_at: string;
  };
}

export interface PaystackTransferRecipientResponse {
  status: boolean;
  message: string;
  data: {
    recipient_code: string;
    type: string;
    name: string;
    currency: string;
    details: {
      account_number: string;
      account_name: string;
      bank_code: string;
      bank_name: string;
    };
  };
}

export interface PaystackBalanceEntry {
  currency: string;
  balance: number;
  available_balance: number;
  pending_balance: number;
  integration: number;
}

export interface PaystackBalanceResponse {
  status: boolean;
  message: string;
  data: PaystackBalanceEntry[];
}

export interface PaystackTransferInitiateResponse {
  status: boolean;
  message: string;
  data: {
    reference: string;
    transfer_code: string;
    amount: number;
    currency: string;
    recipient: string;
    status: string;
    reason?: string;
    failures?: Record<string, any> | null;
    transferred_at?: string;
    created_at: string;
  };
}

export interface PaystackTransferVerifyResponse {
  status: boolean;
  message: string;
  data: {
    reference: string;
    transfer_code: string;
    amount: number;
    currency: string;
    recipient: string;
    status: string;
    reason?: string;
    failure_reason?: string | null;
    transferred_at?: string;
    created_at: string;
  };
}

export interface PaystackTransferFinalizeResponse {
  status: boolean;
  message: string;
  data: {
    reference: string;
    transfer_code: string;
    amount: number;
    currency: string;
    recipient: string;
    status: string;
    reason?: string;
    failures?: Record<string, any> | null;
    transferred_at?: string;
    created_at: string;
  };
}

export const PAYSTACK_PLANS = {
  levy_plan: "PLN_m70z1675dnrdgeq",
} as const;

export type PaystackPlan = keyof typeof PAYSTACK_PLANS;

export const MEMBERSHIP_DUES_AMOUNT = 2000;
const MEMBERSHIP_LOCK_TTL_MS = 30 * 60 * 1000;
const MAX_NOTE_LENGTH = 50;

export class PaystackService {
  /**
   * Fetches the list of supported banks from Paystack.
   * Accepts optional query filters such as country, currency, type, and pay_with_bank_transfer.
   * Cached in Redis for 24 hours since the bank list rarely changes.
   */
  static async getBanks(
    params: {
      country?: string;
      currency?: string;
      type?: string;
      pay_with_bank_transfer?: boolean;
      pay_with_bank?: boolean;
    } = {},
  ): Promise<PaystackBank[]> {
    const query = { country: "nigeria", ...params };
    const cacheKey = `paystack:banks:${query.country}:${query.currency ?? "NGN"}`;

    return fetchWithCache<PaystackBank[]>(cacheKey, 86400, async () => {
      const { data } = await getPaystack().get("/bank", { params: query });
      return data.data as PaystackBank[];
    });
  }

  /**
   * Fetches the Paystack balance for the integration account.
   * Returns amounts in kobo; callers convert to Naira when needed.
   */
  static async getBalance(
    currency: string = "NGN",
  ): Promise<PaystackBalanceEntry | null> {
    try {
      const { data } = await getPaystack().get("/balance");
      const entry = (data.data as PaystackBalanceEntry[]).find(
        (b) => b.currency === currency,
      );
      return entry ?? null;
    } catch (error: any) {
      logger.error(
        {
          message: error.message,
          details: error.response?.data || "No additional details",
        },
        "Paystack fetch balance failed:",
      );
      throw new Error(
        error.response?.data?.message || "Failed to fetch balance",
      );
    }
  }

  /**
   * Resolves an account number against a bank code to confirm the account name.
   */
  static async resolveAccountNumber(params: {
    account_number: string;
    bank_code: string;
  }): Promise<PaystackResolvedAccount> {
    try {
      const { data } = await getPaystack().get("/bank/resolve", { params });
      return data.data as PaystackResolvedAccount;
    } catch (error: any) {
      logger.error(
        {
          message: error.message,
          details: error.response?.data || "No additional details",
        },
        "Paystack resolve account number failed:",
      );
      throw error;
    }
  }

  /**
   * Generates a unique, human-readable transaction reference.
   * Compact form `${prefix}-${base36-seconds}-${hex-random}` so the full
   * reference stays ≤ 20 chars (e.g. `BCC-TRF-K0XYZ-3A2F`).
   */
  static generateReference(prefix = "BCC"): string {
    const time = Math.floor(Date.now() / 1000)
      .toString(36)
      .toUpperCase();
    const rand = randomBytes(2).toString("hex").toUpperCase();
    return `${prefix}-${time}-${rand}`;
  }

  /**
   * Creates (or reuses) a Paystack transfer recipient for a bank account.
   * The recipient code is required before money can be sent.
   */
  static async createTransferRecipient(params: {
    name: string;
    account_number: string;
    bank_code: string;
    currency?: string;
  }): Promise<PaystackTransferRecipientResponse> {
    try {
      const { data } = await getPaystack().post("/transferrecipient", {
        type: "nuban",
        name: params.name,
        account_number: params.account_number,
        bank_code: params.bank_code,
        currency: params.currency || "NGN",
      });
      return data as PaystackTransferRecipientResponse;
    } catch (error: any) {
      logger.error(
        {
          message: error.message,
          details: error.response?.data || "No additional details",
        },
        "Paystack create transfer recipient failed:",
      );
      throw new Error(
        error.response?.data?.message || "Failed to create transfer recipient",
      );
    }
  }

  /**
   * Initiates a transfer from the Paystack balance to a recipient.
   * Amount is expected in Naira and converted to kobo before sending.
   */
  static async initiateTransfer(params: {
    recipient: string;
    amount: number;
    reason?: string;
    reference: string;
  }): Promise<PaystackTransferInitiateResponse> {
    try {
      const amountInKobo = Math.round(params.amount * 100);
      const { data } = await getPaystack().post("/transfer", {
        source: "balance",
        recipient: params.recipient,
        amount: amountInKobo,
        reason: params.reason,
        reference: params.reference,
      });
      return data as PaystackTransferInitiateResponse;
    } catch (error: any) {
      logger.error(
        {
          message: error.message,
          details: error.response?.data || "No additional details",
        },
        "Paystack initiate transfer failed:",
      );
      throw new Error(
        error.response?.data?.message || "Failed to initiate transfer",
      );
    }
  }

  /**
   * Verifies the status of a transfer by its reference.
   */
  static async verifyTransfer(
    reference: string,
  ): Promise<PaystackTransferVerifyResponse> {
    try {
      const { data } = await getPaystack().get(
        `/transfer/verify/${reference}`,
      );
      return data as PaystackTransferVerifyResponse;
    } catch (error: any) {
      logger.error(
        {
          message: error.message,
          details: error.response?.data || "No additional details",
        },
        "Paystack verify transfer failed:",
      );
      throw new Error(
        error.response?.data?.message || "Failed to verify transfer",
      );
    }
  }

  /**
   * Finalizes a transfer that is awaiting OTP approval.
   * Required only when the Paystack dashboard has "Confirm transfers before
   * sending" enabled, which makes `initiateTransfer` return `status: "otp"`.
   */
  static async finalizeTransfer(
    transferCode: string,
    otp: string,
  ): Promise<PaystackTransferFinalizeResponse> {
    try {
      const { data } = await getPaystack().post("/transfer/finalize_transfer", {
        transfer_code: transferCode,
        otp,
      });
      return data as PaystackTransferFinalizeResponse;
    } catch (error: any) {
      logger.error(
        {
          message: error.message,
          details: error.response?.data || "No additional details",
        },
        "Paystack finalize transfer failed:",
      );
      throw new Error(
        error.response?.data?.message || "Failed to finalize transfer",
      );
    }
  }

  /**
   * Initializes a one-time or recurring payment with Paystack.
   *
   * Membership dues are locked to `MEMBERSHIP_DUES_AMOUNT` and guarded by an
   * atomic per-user/per-month lock (unique compound index on the Payment
   * model) so two concurrent requests cannot double-charge the same month.
   *
   * Edge cases handled:
   * - Invalid paymentType / missing eventId for event payments.
   * - `isRecurring` is only allowed for membership dues.
   * - Amounts below the NGN 2,000 floor are rejected.
   * - Concurrent membership dues → duplicate-key race is resolved atomically.
   * - A stale pending lock (>30 min, abandoned checkout) is recycled.
   * - If Paystack initialization fails, the freshly-created lock row is
   *   removed so the user can retry immediately.
   */
  static async initializePayment(
    data: InitializePaymentData,
    user: AuthUser,
  ): Promise<PaystackInitializeResponse> {
    const reference = this.generateReference();

    if (data.note && data.note.length > MAX_NOTE_LENGTH) {
      throw new Error(
        `Note cannot exceed ${MAX_NOTE_LENGTH} characters.`,
      );
    }

    let amount = data.amount;
    let membershipLockId: string | null = null;

    if (data.paymentType === "membership_dues") {
      amount = MEMBERSHIP_DUES_AMOUNT;

      // Atomic lock: the unique compound index on { userId, paymentType, monthKey }
      // prevents two requests from creating a lock for the same month.
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      try {
        const lock = await Payment.create({
          userId: user.id,
          paymentType: "membership_dues",
          paymentStatus: "pending",
          monthKey,
          reference,
          paystackCustomerId: "",
          createdAt: now,
        });
        membershipLockId = lock._id.toString();
      } catch (err: any) {
        if (err.code !== 11000) throw err;

        // Duplicate key — a lock already exists for this month
        const existing = await Payment.findOne({
          userId: user.id,
          paymentType: "membership_dues",
          monthKey,
        });

        if (!existing) throw err;

        if (existing.paymentStatus === "completed") {
          throw new Error(
            "You have already paid your membership dues for this month.",
          );
        }

        const staleCutoff = new Date(Date.now() - MEMBERSHIP_LOCK_TTL_MS);
        if (existing.createdAt < staleCutoff) {
          // Recycle the abandoned lock with the new reference.
          const recycled = await Payment.findOneAndUpdate(
            { _id: existing._id },
            { reference, createdAt: new Date() },
            { returnDocument: "after" },
          );
          membershipLockId = recycled?._id.toString() ?? null;
        } else {
          throw new Error(
            "A payment is already being processed for this month.",
          );
        }
      }
    } else {
      if (data.isRecurring) {
        throw new Error(
          "Recurring payments are only supported for membership dues.",
        );
      }
      if (data.paymentType === "event" && !data.eventId) {
        throw new Error("An event ID is required to pay for an event.");
      }
      if (!Number.isFinite(amount) || amount < MEMBERSHIP_DUES_AMOUNT) {
        throw new Error("Minimum payment amount is 2000 Naira.");
      }
    }

    const isRecurring = data.isRecurring === true;

    try {
      const amountInKobo = Math.round(amount) * 100;
      const response = await getPaystack().post("/transaction/initialize", {
        email: user.email,
        amount: amountInKobo,
        reference,
        ...(isRecurring ? { plan: PAYSTACK_PLANS.levy_plan } : {}),
        metadata: {
          userId: user.id,
          paymentType: data.paymentType,
          isRecurring,
          eventId: data.eventId,
          note: data.note,
          ...(isRecurring ? { subscriptionStatus: "active" } : {}),
        },
        callback_url: `${env.clientUrl}/payments/verify`,
      });
      return response.data as PaystackInitializeResponse;
    } catch (error: any) {
      // The Paystack call never went through, so the lock we created is
      // stale. Remove it so the user can retry immediately.
      if (membershipLockId) {
        await Payment.deleteOne({ _id: membershipLockId }).catch(() => undefined);
      }
      logger.error(
        {
          message: error.message,
          details: error.response?.data || "No additional details",
        },
        "Failed to initialize Paystack payment:",
      );
      throw new Error(
        error.response?.data?.message || error.message || "Failed to initialize payment",
      );
    }
  }

  /**
   * Verifies a payment reference against Paystack and records the result.
   *
   * Idempotent: if the payment is already `completed` (e.g. the charge.success
   * webhook arrived first), it returns early and never re-triggers the payment
   * confirmation workflow.
   */
  static async verifyPayment(
    data: VerifyPaymentData,
    user: AuthUser,
  ): Promise<{ status: boolean; message: string; data: any }> {
    if (!data.reference) {
      throw new Error("Payment reference is required.");
    }

    const response = await getPaystack().get(
      `/transaction/verify/${data.reference}`,
    );

    if (!response.data?.status || response.data.data?.status !== "success") {
      throw new Error(
        `Payment verification failed: ${response.data?.data?.status ?? "unknown"}`,
      );
    }

    const tx = response.data.data;
    const metadata = tx.metadata || {};

    if (!metadata.userId) {
      throw new Error(
        "Payment metadata is missing the user ID. Cannot record payment.",
      );
    }

    const paymentUpdate: Record<string, any> = {
      userId: metadata.userId,
      paymentType: metadata.paymentType || "donation",
      amount: tx.amount / 100,
      paymentStatus: "completed",
      reference: tx.reference,
      paystackCustomerId: tx.customer?.customer_code || "",
      isRecurring: metadata.isRecurring || false,
      note: metadata.note,
      lastPaymentDate: new Date(),
      metadata,
    };

    if (metadata.eventId) {
      paymentUpdate.event = metadata.eventId;
    }

    if (metadata.isRecurring) {
      paymentUpdate.subscriptionStatus = "active";
    }

    if (tx.plan_object?.plan_code === PAYSTACK_PLANS.levy_plan) {
      paymentUpdate.subscriptionType = "levy_plan";
    }

    // Capture subscription details if available in the transaction.
    // Paystack nests subscription info under tx.subscription for plan-based transactions.
    const subscriptionCode =
      tx.subscription?.subscription_code || tx.subscription_code || null;
    const emailToken = tx.subscription?.email_token || null;

    if (subscriptionCode) {
      paymentUpdate.paystackSubscriptionId = subscriptionCode;
      if (emailToken) {
        paymentUpdate.paystackEmailToken = emailToken;
      }
      logger.info(
        `Captured subscription code: ${subscriptionCode} from verification`,
      );
    } else if (paymentUpdate.isRecurring) {
      logger.warn(
        `Recurring payment verified for ${tx.reference} but no subscription code found in verify response. Waiting for subscription.create webhook.`,
      );
    }

    // Atomic claim: only the caller that transitions a non-completed payment to
    // completed triggers the confirmation workflow. Concurrent verifies and
    // webhook deliveries for the same reference therefore produce at most one
    // confirmation run.
    const claimed = await this._claimCompletedPayment(
      tx.reference,
      paymentUpdate,
    );

    if (!claimed) {
      const existing = await Payment.findOne({
        reference: tx.reference,
      }).lean();
      logger.info(`Payment ${tx.reference} already verified; skipping.`);
      return {
        status: true,
        message: "Payment already verified",
        data: existing ?? paymentUpdate,
      };
    }

    const payment = await Payment.findOne({ reference: tx.reference }).lean();

    await this._triggerPaymentConfirmation(
      metadata.userId,
      tx.amount / 100,
      tx.reference,
    );
    await invalidateCache(`payments:user:${user.id}:*`);
    await invalidateCache("balance:available");

    return {
      status: true,
      message: "Payment verified and recorded",
      data: payment,
    };
  }

  /**
   * Cancels a subscription.
   * Falls back to fetching the subscription from Paystack when the local
   * record is missing code/token (legacy records from before the fix).
   */
  static async cancelSubscription(
    user: AuthUser,
    subscriptionCode: string,
    emailToken: string,
    reference?: string,
  ): Promise<any> {
    try {
      let code = subscriptionCode;
      let token = emailToken;

      if (!code || !token) {
        if (!reference) {
          throw new Error(
            "Cannot cancel subscription: missing subscription code/token and no payment reference to look up.",
          );
        }

        logger.warn(
          `cancelSubscription called with missing code/token for reference ${reference}. Fetching from Paystack...`,
        );

        // 1. Verify the transaction to get the customer ID
        const txRes = await getPaystack().get(
          `/transaction/verify/${reference}`,
        );
        const tx = txRes.data?.data;
        const customerCode = tx?.customer?.customer_code;
        const customerId = tx?.customer?.id;

        if (!customerId) {
          throw new Error("Could not determine customer ID from transaction");
        }

        // 2. List subscriptions for that customer using their numeric ID
        const subRes = await getPaystack().get(`/subscription`, {
          params: { customer: customerId },
        });

        const activeSub = (subRes.data?.data as any[])?.find(
          (s: any) => s.status === "active",
        );

        if (!activeSub) {
          logger.warn(
            `No active subscription found for customer ${customerCode}. Marking as cancelled locally to heal the state.`,
          );

          await Payment.updateMany(
            { reference },
            {
              $set: {
                subscriptionStatus: "cancelled",
                isRecurring: false,
              },
            },
          );

          return {
            status: true,
            message:
              "Subscription successfully cancelled (no active remote subscription found)",
          };
        }

        code = activeSub.subscription_code;
        token = activeSub.email_token;

        // Save these back so future cancel attempts don't need the fallback
        await Payment.updateMany(
          { reference },
          {
            $set: {
              paystackSubscriptionId: code,
              paystackEmailToken: token,
            },
          },
        );
        logger.info(`Backfilled subscription code/token for reference ${reference}`);
      }

      const response = await getPaystack().post("/subscription/disable", {
        code,
        token,
      });

      if (response.data && response.data.status === false) {
        throw new Error(
          response.data.message || "Paystack failed to cancel the subscription",
        );
      }

      // Mark as cancelled in DB
      await Payment.updateMany(
        { paystackSubscriptionId: code },
        { $set: { subscriptionStatus: "cancelled", isRecurring: false } },
      );
      await Promise.all([
        invalidateCache(`payments:user:${user.id}:*`),
        invalidateCache(`payments:group:*`),
      ]);
      return response.data;
    } catch (error: any) {
      logger.error(
        {
          message: error.message,
          details: error.response?.data || "No additional details",
        },
        "Failed to cancel subscription:",
      );
      throw new Error(
        error.response?.data?.message || "Failed to cancel subscription",
      );
    }
  }

  /**
   * Verifies a Paystack webhook signature using a timing-safe comparison.
   */
  static verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
  ): boolean {
    const secret = env.paystackSecretKey;
    if (!secret) {
      throw new Error("Paystack secret key not configured");
    }

    const hash = createHmac("sha512", secret).update(payload).digest();
    const expected = Buffer.from(signature, "hex");

    if (hash.length !== expected.length) {
      return false;
    }
    return timingSafeEqual(hash, expected);
  }

  /**
   * Handles Paystack webhook events.
   */
  static async handleWebhook(event: any): Promise<void> {
    const { event: eventType, data } = event;

    try {
      switch (eventType) {
        case "subscription.create":
          logger.info(
            `Webhook subscription.create: ${data.subscription_code} for customer ${data.customer?.customer_code}`,
          );
          await Payment.findOneAndUpdate(
            {
              $or: [
                { paystackSubscriptionId: data.subscription_code },
                {
                  paystackCustomerId: data.customer?.customer_code,
                  paymentType: "membership_dues",
                  isRecurring: true,
                  paystackSubscriptionId: { $in: [null, "", undefined] },
                },
              ],
            },
            {
              $set: {
                paystackSubscriptionId: data.subscription_code,
                paystackEmailToken: data.email_token,
                isRecurring: true,
                nextPaymentDate: new Date(data.next_payment_date),
              },
            },
            { sort: { createdAt: -1 } },
          );
          break;

        case "charge.success": {
          logger.info(
            `Webhook charge.success: ${data.reference} (${data.amount})`,
          );

          const metadata = data.metadata || {};

          if (!metadata.userId) {
            logger.warn(
              `charge.success for ${data.reference} is missing metadata.userId; skipping upsert.`,
            );
            break;
          }

          const chargeUpdate: Record<string, any> = {
            userId: metadata.userId,
            paymentType: metadata.paymentType || "donation",
            paymentStatus: "completed",
            lastPaymentDate: new Date(),
            reference: data.reference,
            amount: data.amount / 100,
            paystackCustomerId: data.customer?.customer_code || "",
            isRecurring: metadata.isRecurring || false,
            metadata,
          };

          if (metadata.eventId) {
            chargeUpdate.event = metadata.eventId;
          }

          if (data.subscription_code) {
            chargeUpdate.paystackSubscriptionId = data.subscription_code;
            if (data.next_payment_date) {
              chargeUpdate.nextPaymentDate = new Date(data.next_payment_date);
            }
            if (data.email_token) {
              chargeUpdate.paystackEmailToken = data.email_token;
            }
          }

          if (data.plan?.plan_code === PAYSTACK_PLANS.levy_plan) {
            chargeUpdate.subscriptionType = "levy_plan";
            chargeUpdate.isRecurring = true;
            chargeUpdate.subscriptionStatus = "active";
          }

          // Atomic claim: only the first delivery that transitions a
          // non-completed payment to completed triggers the confirmation
          // workflow. Paystack re-delivers webhooks on non-2xx responses, so
          // retries (and a race with the user's own verifyPayment) are
          // guaranteed to produce at most one confirmation run.
          const claimed = await this._claimCompletedPayment(
            data.reference,
            chargeUpdate,
          );

          if (claimed) {
            const payment = await Payment.findOne({
              reference: data.reference,
            }).lean();
            if (payment) {
              await this._triggerPaymentConfirmation(
                payment.userId.toString(),
                data.amount / 100,
                data.reference,
              );
              await invalidateCache(
                `payments:user:${payment.userId.toString()}:*`,
              );
              await invalidateCache("balance:available");
            }
          } else {
            logger.info(
              `Webhook charge.success for ${data.reference} already recorded; skipping confirmation.`,
            );
          }
          break;
        }

        case "subscription.disable":
          logger.info(
            `Webhook subscription.disable: ${data.subscription_code}`,
          );
          await Payment.findOneAndUpdate(
            { paystackSubscriptionId: data.subscription_code },
            {
              isRecurring: false,
              subscriptionStatus: "cancelled",
            },
          );
          break;

        case "transfer.success": {
          logger.info(`Webhook transfer.success: ${data.reference}`);
          const transfer = await Transfer.findOneAndUpdate(
            { reference: data.reference },
            {
              $set: {
                transferCode: data.transfer_code,
                status: "success",
                failureReason: null,
              },
            },
            { returnDocument: "after" },
          );
          if (transfer) {
            await invalidateCache(`transfers:user:${transfer.userId.toString()}:*`);
          }
          await this._triggerTransferNotification(data.reference, "success");
          break;
        }

        case "transfer.failed": {
          logger.info(`Webhook transfer.failed: ${data.reference}`);
          const transfer = await Transfer.findOneAndUpdate(
            { reference: data.reference },
            {
              $set: {
                transferCode: data.transfer_code,
                status: "failed",
                failureReason:
                  data.failure_reason || "Transfer failed",
              },
            },
            { returnDocument: "after" },
          );
          if (transfer) {
            await invalidateCache(`transfers:user:${transfer.userId.toString()}:*`);
          }
          await this._triggerTransferNotification(data.reference, "failed");
          break;
        }

        case "transfer.reversed": {
          logger.info(`Webhook transfer.reversed: ${data.reference}`);
          const transfer = await Transfer.findOneAndUpdate(
            { reference: data.reference },
            {
              $set: {
                transferCode: data.transfer_code,
                status: "reversed",
                failureReason:
                  data.failure_reason || "Transfer reversed",
              },
            },
            { returnDocument: "after" },
          );
          if (transfer) {
            await invalidateCache(`transfers:user:${transfer.userId.toString()}:*`);
          }
          await this._triggerTransferNotification(data.reference, "reversed");
          break;
        }

        default:
          logger.info("Unhandled webhook event:", eventType);
      }
    } catch (error) {
      logger.error(error, "Error handling webhook:");
      throw error;
    }
  }

  /**
   * Creates a customer in Paystack.
   */
  static async createCustomer(
    email: string,
    userId: string,
    name: string,
  ): Promise<any> {
    try {
      const response = await getPaystack().post("/customer", {
        email,
        metadata: {
          userId,
          name,
        },
      });
      return response.data;
    } catch (error: any) {
      logger.error(
        {
          message: error.message,
          details: error.response?.data || "No additional details",
        },
        "Failed to create Paystack customer:",
      );
      throw new Error(
        error.response?.data?.message || "Failed to create customer",
      );
    }
  }

  /**
   * Atomically claims a payment for completion.
   *
   * Uses a conditional `updateOne` with `upsert` so only one concurrent caller
   * (verifyPayment or the charge.success webhook) can transition a
   * non-completed payment to `completed`. Returns `true` only for the caller
   * that performed the transition — that caller is the sole trigger of the
   * payment confirmation workflow. All others receive `false` and must skip.
   */
  private static async _claimCompletedPayment(
    reference: string,
    paymentUpdate: Record<string, any>,
  ): Promise<boolean> {
    try {
      const result = await Payment.updateOne(
        { reference, paymentStatus: { $ne: "completed" } },
        { $set: paymentUpdate },
        { upsert: true },
      );
      return result.modifiedCount > 0 || result.upsertedCount > 0;
    } catch (error: any) {
      // A document with this reference already exists (e.g. it is already
      // completed by a concurrent verify/webhook) and the upsert collided with
      // the unique reference index. Nothing for us to claim.
      if (error?.code !== 11000) throw error;
      return false;
    }
  }

  /**
   * Helper to trigger the payment confirmation workflow for a completed payment.
   */
  private static async _triggerPaymentConfirmation(
    userId: string,
    amount: number,
    reference: string,
  ): Promise<void> {
    try {
      const user = await UserModel.findById(userId).lean();
      if (!user) {
        logger.error(
          `User ${userId} not found for payment confirmation workflow.`,
        );
        return;
      }

      await workflowClient.trigger({
        url: `${env.clientUrl}/api/v1/workflow/payment-confirmation`,
        // Deterministic run id deduplicates concurrent/replayed triggers for
        // the same reference at the QStash level (belt-and-braces on top of
        // the atomic _claimCompletedPayment guard).
        workflowRunId: `payment-confirmation:${reference}`,
        body: {
          user,
          amount,
          reference,
        },
      });
      logger.info(`Triggered payment confirmation workflow for ${reference}`);
    } catch (error: any) {
      logger.error(
        `Failed to trigger payment confirmation workflow for ${reference}:`,
        error.message || error,
      );
    }
  }

  /**
   * Helper to trigger the transfer notification workflow for a resolved transfer.
   */
  private static async _triggerTransferNotification(
    reference: string,
    status: "success" | "failed" | "reversed",
  ): Promise<void> {
    try {
      await workflowClient.trigger({
        url: `${env.clientUrl}/api/v1/workflow/transfer-notification`,
        // Deterministic run id deduplicates webhook re-deliveries for the same
        // reference + status at the QStash level, while still allowing separate
        // notifications for distinct transitions (e.g. success then reversed).
        workflowRunId: `transfer-notification:${reference}:${status}`,
        body: {
          reference,
          status,
        },
      });
      logger.info(`Triggered transfer notification workflow for ${reference}`);
    } catch (error: any) {
      logger.error(
        `Failed to trigger transfer notification workflow for ${reference}:`,
        error.message || error,
      );
    }
  }
}
