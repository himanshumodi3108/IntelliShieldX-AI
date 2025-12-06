import mongoose from "mongoose";

/**
 * OAuth Account Model
 * Stores multiple OAuth provider accounts linked to a user
 */
const oauthAccountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ["google", "microsoft", "zoho", "github"],
      required: true,
    },
    providerAccountId: {
      type: String,
      required: true,
    },
    providerEmail: {
      type: String,
      default: null,
    },
    providerName: {
      type: String,
      default: null,
    },
    providerAvatar: {
      type: String,
      default: null,
    },
    accessToken: {
      type: String,
      default: null, // May not always be available
    },
    refreshToken: {
      type: String,
      default: null,
    },
    tokenExpiresAt: {
      type: Date,
      default: null,
    },
    isPrimary: {
      type: Boolean,
      default: false, // The first OAuth account used for login becomes primary
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one account per provider per user
oauthAccountSchema.index({ userId: 1, provider: 1 }, { unique: true });
// Index for finding by provider account ID
oauthAccountSchema.index({ provider: 1, providerAccountId: 1 });

export default mongoose.model("OAuthAccount", oauthAccountSchema);

