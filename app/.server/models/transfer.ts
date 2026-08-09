import mongoose, { Document, Schema } from "mongoose";

export interface ITransfer extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  paymentId?: mongoose.Types.ObjectId;
  bankDetailsId?: mongoose.Types.ObjectId;
  recipientCode: string;
  amount: number;
  fee: number;
  currency: string;
  reference: string;
  transferCode?: string;
  idempotencyKey?: string;
  reason?: string;
  status:
    | "pending"
    | "otp"
    | "in_transit"
    | "success"
    | "failed"
    | "reversed"
    | "aborted"
    | "abandoned";
  failureReason?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const TransferSchema = new Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    paymentId: {
      type: mongoose.Types.ObjectId,
      ref: "Payment",
      required: false,
    },
    bankDetailsId: {
      type: mongoose.Types.ObjectId,
      ref: "BankDetails",
      required: false,
    },
    recipientCode: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    fee: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: "NGN",
    },
    reference: {
      type: String,
      required: true,
      unique: true,
    },
    transferCode: {
      type: String,
      required: false,
    },
    idempotencyKey: {
      type: String,
      required: false,
    },
    reason: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "otp",
        "in_transit",
        "success",
        "failed",
        "reversed",
        "aborted",
        "abandoned",
      ],
      default: "pending",
    },
    failureReason: {
      type: String,
      required: false,
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

TransferSchema.index({ userId: 1, createdAt: -1 });
TransferSchema.index({ reference: 1 });
TransferSchema.index({ status: 1 });
TransferSchema.index({ paymentId: 1 });
// Unique idempotency key: only one Transfer row may claim a given
// submission intent, preventing concurrent/duplicate initiateTransfer
// requests from sending money twice.
TransferSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

const Transfer =
  mongoose.models.Transfer ||
  mongoose.model<ITransfer>("Transfer", TransferSchema, "transfers");

export default Transfer;
