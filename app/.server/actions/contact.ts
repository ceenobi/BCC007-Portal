import z from "zod";
import { contactSchema } from "~/lib/schema";
import { tryCatchWrapper } from "~/lib/tryCatchWrapper";
import type { ContactSchemaType } from "~/types";
import { env } from "../config/keys";
import logger from "../config/logger";
import { checkRateLimit } from "../utils/rate-limit";
import { workflowClient } from "../workflows/client";

export async function submitContactMessage(
  request: Request,
  payload: ContactSchemaType,
) {
  return tryCatchWrapper(async () => {
    await checkRateLimit(request, "general");

    const result = contactSchema.safeParse(payload);
    if (!result.success) {
      logger.error({ result }, "Invalid contact form data");
      return Response.json(
        {
          success: false,
          message: "Invalid form data",
          errors: z.treeifyError(result.error),
        },
        { status: 400 },
      );
    }

    const { fullname, email, subject, message } = result.data;

    await workflowClient.trigger({
      url: `${env.clientUrl}/api/v1/workflow/contact-message`,
      body: {
        fullname,
        email,
        subject,
        message,
      },
    });

    return Response.json(
      {
        success: true,
        message: "Message sent successfully. We'll get back to you shortly.",
      },
      { status: 200 },
    );
  });
}
