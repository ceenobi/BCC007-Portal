import mongoose, { Document, Schema } from "mongoose";

export interface IEvent extends Document {
  title: string;
  detail: string;
  location: string;
  latitude: number;
  longitude: number;
  date: Date;
  time: string;
  eventType: "party" | "meeting" | "birthday" | "other";
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
  interestedMembers: mongoose.Types.ObjectId[];
  organizer: mongoose.Types.ObjectId;
  featuredImage?: string;
  featuredImageId?: string | undefined;
  idempotencyKey?: string;
}
const EventSchema = new Schema<IEvent>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    detail: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    eventType: {
      type: String,
      enum: ["party", "meeting", "birthday", "other"],
    },
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
    status: {
      type: String,
      enum: ["upcoming", "ongoing", "completed", "cancelled"],
      default: "upcoming",
    },
    interestedMembers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    organizer: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    featuredImage: {
      type: String,
    },
    featuredImageId: {
      type: String,
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

EventSchema.index({ title: "text", location: "text", organizer: "text" });
EventSchema.index({ date: 1 });
EventSchema.index({ organizer: 1 });
EventSchema.index({ eventType: 1 });
EventSchema.index({ status: 1 });
EventSchema.index({ interestedMembers: 1 });
EventSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

const Event =
  mongoose.models.Event ||
  mongoose.model<IEvent>("Event", EventSchema, "event");

export default Event;
