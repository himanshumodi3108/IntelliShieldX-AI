import mongoose from "mongoose";

const guestRateLimitSchema = new mongoose.Schema(
  {
    identifier: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    messageCount: {
      type: Number,
      default: 0,
    },
    lastResetDate: {
      type: Date,
      default: Date.now,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for cleanup of old records
guestRateLimitSchema.index({ lastResetDate: 1 }, { expireAfterSeconds: 86400 * 7 }); // Auto-delete after 7 days

export default mongoose.model("GuestRateLimit", guestRateLimitSchema);

