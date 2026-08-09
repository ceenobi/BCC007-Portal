import axios from "axios";
import { env } from "./keys";
import logger from "./logger";

interface SendEmailOptions {
  email: string;
  subject: string;
  message: string;
  attachments?: {
    filename: string;
    content: Buffer | string;
  }[];
}

/**
 * Sends an email using the Brevo (formerly Sendinblue) Transactional Email API.
 * Uses axios for the HTTP request to avoid large SDK dependencies in serverless environments.
 */
const sendEmail = async (options: SendEmailOptions): Promise<void> => {
  try {
    // Generate text fallback by removing HTML tags
    const textFallback = options.message
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim();

    // Production recipient or development test address
    let recipient = options.email;
    const payload = {
      sender: {
        name: "BCC007 Pay",
        email: env.emailUser || "charlesmutob@gmail.com",
      },
      to: [{ email: recipient }],
      subject: options.subject,
      htmlContent: options.message,
      textContent: textFallback,
      ...(options.attachments &&
        options.attachments.length > 0 && {
          attachments: options.attachments.map((att) => ({
            name: att.filename,
            content:
              typeof att.content === "string"
                ? Buffer.from(att.content).toString("base64")
                : att.content.toString("base64"),
          })),
        }),
    };

    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      payload,
      {
        headers: {
          "api-key": env.brevoApiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    );

    if (env.nodeEnv === "development") {
      logger.info(
        `Email sent successfully via Brevo! Message ID: ${response.data.messageId}`,
      );
    }
  } catch (error: any) {
    // Log the detailed error from Brevo if available
    const errorData = error.response?.data;
    logger.error(
      {
        message: error.message,
        details: errorData || "No additional details",
      },
      "Brevo email sending failed:",
    );

    // Fail silently in development to allow flow to continue
    if (env.nodeEnv === "development") {
      logger.warn("Continuing despite email failure in development mode.");
    } else {
      throw error;
    }
  }
};

export { sendEmail };
