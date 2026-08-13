import mongoose, { Document, Schema } from "mongoose";

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type:
    | "submission_graded"
    | "stage_completed"
    | "stage_failed"
    | "project_started"
    | "project_completed"
    | "task_overdue"
    | "ticket_assigned"
    | "ticket_resolved"
    | "ticket_created"
    | "account_login"
    | "account_locked"
    | "password_changed"
    | "session_revoked"
    | "profile_updated"
    | "cohort_assigned"
    | "role_updated"
    | "account_deleted"
    | "payment_received"
    | "security_alert"
    | "birthday_reminder"
    | "announcement";
  title: string;
  message: string;
  metadata: Record<string, any>;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "submission_graded",
        "stage_completed",
        "stage_failed",
        "project_started",
        "project_completed",
        "task_overdue",
        "ticket_assigned",
        "ticket_resolved",
        "ticket_created",
        "account_login",
        "account_locked",
        "password_changed",
        "session_revoked",
        "profile_updated",
        "cohort_assigned",
        "role_updated",
        "account_deleted",
        "payment_received",
        "security_alert",
        "event_ongoing",
        "event_completed",
        "event_cancelled",
        "event_interest",
        "birthday_reminder",
        "announcement",
      ],
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    metadata: { type: Object, default: {} },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

const Notification =
  mongoose.models.Notification ||
  mongoose.model<INotification>(
    "Notification",
    NotificationSchema,
    "notifications",
  );

export default Notification;
