import mongoose, { Document, Schema } from "mongoose";

export interface ITicket extends Document {
  userId: mongoose.Types.ObjectId;
  ticketId: string;
  title: string;
  description: string;
  category: "account" | "security" | "payment" | "other";
  priority: "low" | "medium" | "high" | "critical";
  status: "open" | "in-progress" | "resolved" | "closed";
  assignedTo: mongoose.Types.ObjectId | null;
  idempotencyKey?: string;
}

const TicketSchema = new Schema<ITicket>(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    ticketId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true, maxlength: 1000 },
    category: {
      type: String,
      enum: ["account", "security", "payment", "other"],
      required: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
    },
    status: {
      type: String,
      enum: ["open", "in-progress", "resolved", "closed"],
      default: "open",
    },
    assignedTo: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      default: null,
    },
    idempotencyKey: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

TicketSchema.index({ userId: 1 });
TicketSchema.index({ status: 1, updatedAt: 1 });
TicketSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

const Ticket =
  mongoose.models.Ticket ||
  mongoose.model<ITicket>("Ticket", TicketSchema, "tickets");
export default Ticket;