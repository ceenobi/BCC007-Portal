import mongoose, { Document, Schema } from "mongoose";

export interface IExpense extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  category: "logistics" | "refreshments" | "venue" | "equipment" | "welfare" | "other";
  status: "pending" | "approved" | "rejected";
  transferId?: mongoose.Types.ObjectId;
  monthKey?: string;
  idempotencyKey?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "NGN",
    },
    category: {
      type: String,
      enum: ["logistics", "refreshments", "venue", "equipment", "welfare", "other"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    transferId: {
      type: mongoose.Types.ObjectId,
      ref: "Transfer",
      required: false,
    },
    monthKey: {
      type: String,
    },
    idempotencyKey: {
      type: String,
      select: false,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

ExpenseSchema.index({ userId: 1, createdAt: -1 });
ExpenseSchema.index({ status: 1, createdAt: -1 });
ExpenseSchema.index({ category: 1 });
ExpenseSchema.index({ monthKey: 1 });
ExpenseSchema.index({ transferId: 1 });
// Unique idempotency key: only one Expense row may claim a given
// submission intent, preventing duplicate expense records.
ExpenseSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

const Expense =
  mongoose.models.Expense ||
  mongoose.model<IExpense>("Expense", ExpenseSchema, "expenses");

export default Expense;
