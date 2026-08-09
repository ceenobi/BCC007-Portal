import mongoose, { Document, Schema } from "mongoose";

export interface IAuditLog extends Document {
  userId: mongoose.Types.ObjectId;
  userName: string;
  action: string;
  category: "auth" | "payment" | "settings" | "security" | "support";
  details: Record<string, any>;
  status: "success" | "failure";
  description: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    action: { type: String, required: true },
    category: {
      type: String,
      enum: ["auth", "payment", "settings", "security", "support", "events"],
      required: true,
    },
    description: { type: String },
    details: { type: Object, default: {} },
    status: { type: String, enum: ["success", "failure"], default: "success" },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true },
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ category: 1 });
AuditLogSchema.index({ userId: 1 });

const AuditLog =
  mongoose.models.AuditLog ||
  mongoose.model<IAuditLog>("AuditLog", AuditLogSchema, "auditlogs");

export default AuditLog;
