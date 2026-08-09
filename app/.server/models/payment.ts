import mongoose, { Document, Schema } from 'mongoose'

interface IPayment extends Document {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  paymentType: 'donation' | 'event' | 'membership_dues'
  event: mongoose.Types.ObjectId
  isRecurring: boolean
  recurringInterval: 'weekly' | 'monthly' | 'quarterly' | 'annually'
  nextPaymentDate: Date
  lastPaymentDate: Date
  amount: number
  paymentStatus: 'pending' | 'completed' | 'failed' | 'cancelled'
  paystackSubscriptionId: string
  paystackEmailToken: string
  paystackCustomerId: string
  subscriptionType: 'levy_plan'
  reference: string
  monthKey: string
  metadata: Record<string, any>
  note: string
  subscriptionStatus: 'active' | 'cancelled' | 'expired'
  createdAt: Date
  updatedAt: Date
}

const PaymentSchema = new Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    paymentType: {
      type: String,
      enum: ['donation', 'event', 'membership_dues'],
      required: true,
    },
    event: {
      type: mongoose.Types.ObjectId,
      ref: 'Event',
    },
    isRecurring: { type: Boolean, default: false },
    recurringInterval: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly', 'annually'],
    },
    nextPaymentDate: { type: Date },
    lastPaymentDate: { type: Date },
    amount: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },
    paystackSubscriptionId: {
      type: String,
      required: false,
    },
    paystackEmailToken: {
      type: String,
      required: false,
    },
    paystackCustomerId: {
      type: String,
      required: false,
    },
    subscriptionType: {
      type: String,
      enum: ['levy_plan'],
    },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'cancelled', 'expired'],
    },
    reference: {
      type: String,
      required: true,
      unique: true,
    },
    monthKey: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    note: {
      type: String,
      maxLength: 50,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

// Unique compound index to prevent duplicate membership dues per user per month
// Uses partial filter so it only applies to membership_dues records
PaymentSchema.index(
  { userId: 1, paymentType: 1, monthKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      paymentType: 'membership_dues',
      monthKey: { $exists: true },
    },
  }
)

PaymentSchema.index({
  userId: 1,
  reference: 1,
  paymentStatus: 1,
  paymentType: 1,
})
PaymentSchema.index({ paymentStatus: 1, lastPaymentDate: 1 })
PaymentSchema.index({ subscriptionStatus: 1, isRecurring: 1, createdAt: 1 })
PaymentSchema.index({ paymentType: 1, paymentStatus: 1, lastPaymentDate: 1 })

const Payment = mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema)

export default Payment