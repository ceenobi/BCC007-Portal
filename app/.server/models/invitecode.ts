import mongoose, { Document, Schema } from "mongoose";

export interface ICode extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  role: "member" | "admin";
  inviteCode?: string;
  expiresAt?: Date;
}

const InviteCodeSchema = new Schema<ICode>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "Please provide a valid email address",
      ],
    },
    inviteCode: {
      type: String,
      trim: true,
      required: true,
      unique: true,
    },
    role: {
      type: String,
      enum: ["member", "admin"],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

InviteCodeSchema.index({ expiresAt: 1, cohort: 1 });

const InviteCode =
  mongoose.models.InviteCode ||
  mongoose.model<ICode>("InviteCode", InviteCodeSchema, "inviteCode");

export default InviteCode;
