import logger from "../config/logger";
import getRedisClient from "../config/redis";
import Notification from "../models/notification";

type NotificationType =
  | "ticket_assigned"
  | "ticket_resolved"
  | "ticket_created"
  | "account_login"
  | "account_locked"
  | "password_changed"
  | "session_revoked"
  | "profile_updated"
  | "role_updated"
  | "account_deleted"
  | "announcement"
  | "payment_received"
  | "transfer_received"
  | "security_alert"
  | "email_change_request"
  | "event_ongoing"
  | "event_completed"
  | "event_cancelled"
  | "event_interest"
  | "birthday_reminder";

interface SendOptions {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

export class NotificationService {
  /**
   * Create a notification and publish it for real-time delivery.
   * Fire-and-forget — never throws, always logs on error.
   */
  static async send(options: SendOptions): Promise<void> {
    try {
      const notification = await Notification.create({
        userId: options.userId,
        type: options.type,
        title: options.title,
        message: options.message,
        metadata: options.metadata || {},
      });

      // Publish to Redis for SSE delivery
      const redis = getRedisClient();
      if (redis) {
        await redis
          .publish(
            `notif:${options.userId}`,
            JSON.stringify({
              _id: notification._id.toString(),
              type: options.type,
              title: options.title,
              message: options.message,
              metadata: options.metadata || {},
              read: false,
              createdAt: notification.createdAt.toISOString(),
            }),
          )
          .catch((err) =>
            logger.error(
              { err },
              `Redis publish failed for user ${options.userId}`,
            ),
          );
      }
    } catch (error) {
      logger.error(error, "Failed to send notification");
    }
  }

  /**
   * Get unread notification count for a user.
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      return await Notification.countDocuments({ userId, read: false });
    } catch (error) {
      logger.error(error, "Failed to get unread count");
      return 0;
    }
  }

  /**
   * Get paginated notifications for a user.
   */
  static async getNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    try {
      const total = await Notification.countDocuments({ userId });
      const notifications = await Notification.find({ userId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      return {
        notifications,
        meta: {
          currentPage: page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: (page - 1) * limit + notifications.length < total,
        },
      };
    } catch (error) {
      logger.error(error, "Failed to get notifications");
      return {
        notifications: [],
        meta: {
          currentPage: 1,
          limit,
          total: 0,
          totalPages: 0,
          hasMore: false,
        },
      };
    }
  }

  /**
   * Mark a single notification or all notifications as read.
   */
  static async markAsRead(
    userId: string,
    notificationId?: string,
  ): Promise<void> {
    try {
      const filter: Record<string, any> = { userId };
      if (notificationId) {
        filter._id = notificationId;
      }
      await Notification.updateMany(filter, { $set: { read: true } });
    } catch (error) {
      logger.error(error, "Failed to mark notifications as read");
    }
  }
}
