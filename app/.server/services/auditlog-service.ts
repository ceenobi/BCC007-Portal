import logger from "../config/logger";
import AuditLog from "../models/auditlog";
import { auth } from "./better-auth";
import { NotificationService } from "./notification.service";

interface RecordOptions {
  action: string;
  category:
    | "auth"
    | "payment"
    | "settings"
    | "security"
    | "support"
    | "events"
    | "announcements";
  description?: string;
  details?: Record<string, any>;
  status?: "success" | "failure";
}

export class AuditLogService {
  /**
   * Records an audit log entry.
   * Extracts user, vendor, and security metadata from the request automatically.
   */
  static async record(request: Request, options: RecordOptions) {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session || !session.user) {
        return;
      }

      const { user } = session;
      const ipAddress =
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown";
      const userAgent = request.headers.get("user-agent") || "unknown";

      await AuditLog.create({
        userId: user.id,
        userName: user.name,
        action: options.action,
        category: options.category,
        description: options.description,
        details: options.details || {},
        status: options.status || "success",
        ipAddress,
        userAgent,
      });

      // Notify the user for high-risk actions
      const highRiskActions = [
        "PASSWORD_CHANGE",
        "EMAIL_CHANGE",
        "ENABLE_TWO_FACTOR",
        "DISABLE_TWO_FACTOR",
        "ACCOUNT_LOCKED",
        "DELETE_ACCOUNT_REQUEST",
        "SUPPORT_TICKET",
        "SUBSCRIPTION_CHANGE",
        "BANK_DATA_CHANGE",
        "CREATE_EVENT",
      ];

      if (highRiskActions.includes(options.action)) {
        await NotificationService.send({
          userId: user.id,
          type: "security_alert",
          title: "Security Alert",
          message:
            options.description || `Security event: ${options.action}`,
          metadata: {
            action: options.action,
            ipAddress,
            userAgent,
            timestamp: new Date().toISOString(),
          },
        });
      }
    } catch (error) {
      logger.error(error, "Audit logging failed");
    }
  }
}
