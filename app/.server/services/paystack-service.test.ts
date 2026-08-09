import { createHmac } from "node:crypto";
import mongoose from "mongoose";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { PaystackService } from "~/.server/services/paystack.service";
import { workflowClient } from "~/.server/workflows/client";
import Payment from "~/.server/models/payment";
import Transfer from "~/.server/models/transfer";
import User from "~/.server/models/user";
import { clearTestDB, connectTestDB, disconnectTestDB } from "~/test/helpers/db";

vi.mock("~/.server/workflows/client", () => ({
  workflowClient: { trigger: vi.fn(async () => ({})) },
}));

vi.mock("~/.server/config/redis", () => ({
  default: () => null,
}));

const triggerMock = vi.mocked(workflowClient.trigger);

describe("PaystackService.verifyWebhookSignature", () => {
  it("accepts a valid HMAC-SHA512 signature", () => {
    const payload = JSON.stringify({ event: "charge.success", data: {} });
    const hash = createHmac("sha512", "sk_test_dummy").update(payload).digest("hex");
    expect(PaystackService.verifyWebhookSignature(payload, hash)).toBe(true);
  });

  it("rejects a tampered payload", () => {
    const payload = JSON.stringify({ event: "charge.success", data: { amount: 100 } });
    const hash = createHmac("sha512", "sk_test_dummy")
      .update(JSON.stringify({ event: "charge.success", data: { amount: 999 } }))
      .digest("hex");
    expect(PaystackService.verifyWebhookSignature(payload, hash)).toBe(false);
  });
});

describe("PaystackService.handleWebhook", () => {
  beforeAll(async () => {
    await connectTestDB();
  });
  afterEach(async () => {
    await clearTestDB();
    vi.clearAllMocks();
  });
  afterAll(async () => {
    await disconnectTestDB();
  });

  const userId = new mongoose.Types.ObjectId().toString();

  beforeEach(async () => {
    await User.create({
      _id: userId,
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "hashed",
      role: "member",
    });
  });

  it("creates a completed payment from charge.success and triggers the confirmation workflow", async () => {
    const payload = {
      event: "charge.success",
      data: {
        reference: "BCC-PAY-W1",
        amount: 500000,
        customer: { customer_code: "CUS_1" },
        metadata: { userId, paymentType: "donation" },
      },
    };

    await PaystackService.handleWebhook(payload);

    const payment = await Payment.findOne({ reference: "BCC-PAY-W1" }).lean();
    expect(payment).toBeTruthy();
    expect(payment!.paymentStatus).toBe("completed");
    expect(payment!.amount).toBe(5000);
    expect(payment!.userId.toString()).toBe(userId);

    expect(triggerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining("payment-confirmation"),
        workflowRunId: "payment-confirmation:BCC-PAY-W1",
      }),
    );
  });

  it("skips the payment when charge.success is missing metadata.userId", async () => {
    await PaystackService.handleWebhook({
      event: "charge.success",
      data: { reference: "BCC-PAY-W2", amount: 100000, metadata: {} },
    });

    expect(await Payment.countDocuments({})).toBe(0);
    expect(triggerMock).not.toHaveBeenCalled();
  });

  it("does not re-trigger confirmation on webhook re-delivery", async () => {
    const payload = {
      event: "charge.success",
      data: {
        reference: "BCC-PAY-W3",
        amount: 200000,
        metadata: { userId, paymentType: "membership_dues" },
      },
    };

    await PaystackService.handleWebhook(payload);
    await PaystackService.handleWebhook(payload);

    expect(triggerMock).toHaveBeenCalledTimes(1);
    expect(await Payment.countDocuments({ reference: "BCC-PAY-W3" })).toBe(1);
  });

  it("transitions an existing pending payment to completed", async () => {
    await Payment.create({
      userId,
      paymentType: "donation",
      paymentStatus: "pending",
      amount: 0,
      reference: "BCC-PAY-W4",
    });

    await PaystackService.handleWebhook({
      event: "charge.success",
      data: {
        reference: "BCC-PAY-W4",
        amount: 300000,
        metadata: { userId, paymentType: "donation" },
      },
    });

    const payment = await Payment.findOne({ reference: "BCC-PAY-W4" }).lean();
    expect(payment!.paymentStatus).toBe("completed");
    expect(payment!.amount).toBe(3000);
  });

  it("applies the levy plan subscription fields when the plan matches", async () => {
    await PaystackService.handleWebhook({
      event: "charge.success",
      data: {
        reference: "BCC-PAY-W5",
        amount: 200000,
        plan: { plan_code: "PLN_m70z1675dnrdgeq" },
        subscription_code: "SUB_1",
        email_token: "tok_1",
        next_payment_date: "2026-09-04T00:00:00.000Z",
        metadata: { userId, paymentType: "membership_dues", isRecurring: true },
      },
    });

    const payment = await Payment.findOne({ reference: "BCC-PAY-W5" }).lean();
    expect(payment!.subscriptionType).toBe("levy_plan");
    expect(payment!.isRecurring).toBe(true);
    expect(payment!.subscriptionStatus).toBe("active");
    expect(payment!.paystackSubscriptionId).toBe("SUB_1");
  });

  it("attaches the subscription id on subscription.create", async () => {
    await Payment.create({
      userId,
      paymentType: "membership_dues",
      paymentStatus: "pending",
      isRecurring: true,
      amount: 2000,
      reference: "BCC-PAY-SUBCREATE",
      paystackCustomerId: "CUS_2",
    });

    await PaystackService.handleWebhook({
      event: "subscription.create",
      data: {
        subscription_code: "SUB_2",
        email_token: "tok_2",
        next_payment_date: "2026-09-04T00:00:00.000Z",
        customer: { customer_code: "CUS_2" },
      },
    });

    const payment = await Payment.findOne({ reference: "BCC-PAY-SUBCREATE" }).lean();
    expect(payment!.paystackSubscriptionId).toBe("SUB_2");
    expect(payment!.paystackEmailToken).toBe("tok_2");
    expect(payment!.isRecurring).toBe(true);
  });

  it("cancels a subscription on subscription.disable", async () => {
    await Payment.create({
      userId,
      paymentType: "membership_dues",
      paymentStatus: "completed",
      isRecurring: true,
      subscriptionStatus: "active",
      amount: 2000,
      reference: "BCC-PAY-SUBDISABLE",
      paystackSubscriptionId: "SUB_3",
    });

    await PaystackService.handleWebhook({
      event: "subscription.disable",
      data: { subscription_code: "SUB_3" },
    });

    const payment = await Payment.findOne({ reference: "BCC-PAY-SUBDISABLE" }).lean();
    expect(payment!.isRecurring).toBe(false);
    expect(payment!.subscriptionStatus).toBe("cancelled");
  });

  it("marks a transfer success and triggers the notification workflow", async () => {
    await Transfer.create({
      userId,
      recipientCode: "RCP_1",
      amount: 5000,
      reference: "BCC-TRF-W1",
      status: "pending",
    });

    await PaystackService.handleWebhook({
      event: "transfer.success",
      data: { reference: "BCC-TRF-W1", transfer_code: "TRF_W1" },
    });

    const transfer = await Transfer.findOne({ reference: "BCC-TRF-W1" }).lean();
    expect(transfer!.status).toBe("success");
    expect(transfer!.transferCode).toBe("TRF_W1");

    expect(triggerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining("transfer-notification"),
        workflowRunId: "transfer-notification:BCC-TRF-W1:success",
      }),
    );
  });

  it("marks a transfer failed with the failure reason", async () => {
    await Transfer.create({
      userId,
      recipientCode: "RCP_1",
      amount: 5000,
      reference: "BCC-TRF-W2",
      status: "in_transit",
    });

    await PaystackService.handleWebhook({
      event: "transfer.failed",
      data: { reference: "BCC-TRF-W2", transfer_code: "TRF_W2", failure_reason: "NUBAN invalid" },
    });

    const transfer = await Transfer.findOne({ reference: "BCC-TRF-W2" }).lean();
    expect(transfer!.status).toBe("failed");
    expect(transfer!.failureReason).toBe("NUBAN invalid");
  });

  it("marks a transfer reversed", async () => {
    await Transfer.create({
      userId,
      recipientCode: "RCP_1",
      amount: 5000,
      reference: "BCC-TRF-W3",
      status: "success",
    });

    await PaystackService.handleWebhook({
      event: "transfer.reversed",
      data: { reference: "BCC-TRF-W3", transfer_code: "TRF_W3" },
    });

    const transfer = await Transfer.findOne({ reference: "BCC-TRF-W3" }).lean();
    expect(transfer!.status).toBe("reversed");
  });

  it("is a no-op for unhandled event types", async () => {
    await expect(
      PaystackService.handleWebhook({ event: "customer.created", data: {} }),
    ).resolves.toBeUndefined();
  });
});
