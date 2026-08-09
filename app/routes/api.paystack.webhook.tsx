import { PaystackService } from "~/.server/services/paystack.service";
import type { Route } from "./+types/api.paystack.webhook";

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return Response.json({ message: "Method not allowed" }, { status: 405 });
  }

  const signature = request.headers.get("x-paystack-signature");
  if (!signature) {
    return Response.json(
      { success: false, message: "Missing Paystack signature" },
      { status: 400 },
    );
  }

  const rawBody = await request.text();
  if (!PaystackService.verifyWebhookSignature(rawBody, signature)) {
    return Response.json(
      { success: false, message: "Invalid Paystack signature" },
      { status: 401 },
    );
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return Response.json(
      { success: false, message: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  try {
    await PaystackService.handleWebhook(event);
    return Response.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return Response.json(
      {
        success: false,
        message: error?.message || "Failed to handle webhook",
      },
      { status: 500 },
    );
  }
}

export const loader = async () =>
  Response.json({ success: false, message: "Method not allowed" }, { status: 405 });
