import mongoose, { Document, Schema } from "mongoose";

export interface IBankDetails extends Document {
  _id: mongoose.Types.ObjectId;
  bankAccountNumber: string;
  bankAccountName: string;
  bankCode: string;
  bank: string;
  userId: mongoose.Types.ObjectId;
}

const BankSchema = new Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    bankAccountNumber: {
      type: String,
      required: true,
    },
    bankAccountName: {
      type: String,
      required: true,
    },
    bankCode: {
      type: String,
      required: true,
    },
    bank: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);
BankSchema.index({ userId: 1 });

const BankDetails = mongoose.models.BankDetails || mongoose.model<IBankDetails>("BankDetails", BankSchema);


export default BankDetails;
