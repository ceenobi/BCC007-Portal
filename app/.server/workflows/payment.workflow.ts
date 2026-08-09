import { WorkflowContext } from "@upstash/workflow";
import logger from "../config/logger.js";
import { connectToDB } from "../config/database.js";
import Payment from "../models/payment.js";
import { NotificationService } from "../services/notification.service";
import emailService from "../services/email.service";

interface PaymentConfirmationPayload {
  user: {
    _id: string;
    name: string;
    email: string;
  };
  amount: number;
  reference: string;
}

export const sendPaymentConfirmationWorkflow = async (
  context: WorkflowContext<PaymentConfirmationPayload>,
) => {
  const payload = context.requestPayload;
  if (!payload) {
    logger.error("No requestPayload received in sendPaymentConfirmationWorkflow");
    return;
  }
  const { user, amount, reference } = payload;

  await context.run("send-payment-confirmation", async () => {
    try {
      await connectToDB();
      const payment = await Payment.findOne({ reference }).lean();

      const paymentType = payment?.paymentType ?? "donation";
      const date = payment?.createdAt ?? new Date();

      await emailService.sendPaymentConfirmationEmail({
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
        } as any,
        data: { amount, reference, paymentType, date },
      });

      await NotificationService.send({
        userId: user._id,
        type: "payment_received",
        title: "Payment Confirmed",
        message: `Your payment of ₦${amount.toLocaleString()} has been confirmed. Reference: ${reference}`,
        metadata: { amount, reference, paymentType },
      });

      logger.info(
        `Payment confirmation sent for ${reference} to ${user.email}`,
      );
    } catch (error: any) {
      logger.error(
        `Workflow failed to send payment confirmation for user ${user.email}:`,
        error,
      );
      throw error;
    }
  });
};
