import mongoose, { Document, Schema } from "mongoose";

export interface IAnnouncement extends Document {
  title: string;
  content: string;
  author: mongoose.Types.ObjectId;
  status: "draft" | "published" | "archived";
  isPinned: boolean;
  featuredImage?: string;
  featuredImageId?: string | undefined;
  publishedAt?: Date;
  idempotencyKey?: string;
}
const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    featuredImage: {
      type: String,
    },
    featuredImageId: {
      type: String,
    },
    publishedAt: {
      type: Date,
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

AnnouncementSchema.index({ title: "text", content: "text" });
AnnouncementSchema.index({ status: 1, createdAt: -1 });
AnnouncementSchema.index({ isPinned: 1, status: 1 });
AnnouncementSchema.index({ author: 1 });
AnnouncementSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

const Announcement =
  mongoose.models.Announcement ||
  mongoose.model<IAnnouncement>(
    "Announcement",
    AnnouncementSchema,
    "announcement",
  );

export default Announcement;
