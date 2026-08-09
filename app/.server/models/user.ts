import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  emailVerified: boolean;
  occupation: string;
  location: string;
  image: string;
  imagePublicId: string;
  phone: string;
  role: "member" | "admin" | "super_admin";
  gender: "male" | "female" | "other";
  dateOfBirth: Date;
  disableBirthDate: boolean;
  disableEmail: boolean;
  disableGender: boolean;
  isOnboarded: boolean;
  tourPending: boolean;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [50, "Name cannot be more than 50 characters"],
    },
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
    password: {
      type: String,
      required: true,
      select: false,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    occupation: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
    },
    imagePublicId: {
      type: String,
    },
    phone: {
      type: String,
      trim: true,
    },
    isOnboarded: {
      type: Boolean,
      default: false,
    },
    tourPending: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ["member", "admin", "super_admin"],
      default: "member",
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    dateOfBirth: {
      type: Date,
    },
    disableBirthDate: {
      type: Boolean,
      default: true,
    },
    disableEmail: {
      type: Boolean,
      default: false,
    },
    disableGender: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

UserSchema.index({ name: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ gender: 1 });
UserSchema.index({ location: 1 });
UserSchema.index({ phone: 1 });
UserSchema.index({ dateOfBirth: 1 });
UserSchema.index({ disableBirthDate: 1 });
UserSchema.index({ disableEmail: 1 });
UserSchema.index({ disableGender: 1 });
UserSchema.index({ isOnboarded: 1 });

const User =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema, "user");

export default User;
