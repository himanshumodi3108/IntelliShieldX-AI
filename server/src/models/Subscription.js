import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    plan: {
      type: String,
      enum: ["free", "standard", "pro", "enterprise"],
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "cancelled", "expired", "refunded"],
      default: "active",
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true, // 1 year from start date
    },
    // Razorpay details
    razorpayOrderId: {
      type: String,
      default: null,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
    },
    razorpaySignature: {
      type: String,
      default: null,
    },
    amount: {
      type: Number,
      required: true,
    },
    baseAmount: {
      type: Number,
      default: null,
    },
    gstAmount: {
      type: Number,
      default: null,
    },
    transactionFee: {
      type: Number,
      default: null,
    },
    currency: {
      type: String,
      default: "INR",
    },
    // Cancellation details
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      default: null,
    },
    refundRequested: {
      type: Boolean,
      default: false,
    },
    refundedAt: {
      type: Date,
      default: null,
    },
    refundAmount: {
      type: Number,
      default: null,
    },
    refundId: {
      type: String,
      default: null,
    },
    bankReferenceNumber: {
      type: String,
      default: null,
    },
    refundError: {
      type: String,
      default: null,
    },
    // Usage tracking
    usageAtCancellation: {
      documentation: { type: Number, default: 0 },
      scans: { type: Number, default: 0 },
      chatMessages: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ endDate: 1 });

export default mongoose.model("Subscription", subscriptionSchema);

