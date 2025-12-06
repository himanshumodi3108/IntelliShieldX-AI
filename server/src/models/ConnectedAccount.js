import mongoose from "mongoose";

const connectedAccountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    provider: {
      type: String,
      enum: ["github", "gitlab", "bitbucket"],
      required: true,
    },
    providerAccountId: {
      type: String,
      required: true,
    },
    accessToken: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
      default: null,
    },
    tokenExpiresAt: {
      type: Date,
      default: null,
    },
    providerUsername: {
      type: String,
      required: true,
    },
    providerEmail: {
      type: String,
      default: null,
    },
    providerAvatar: {
      type: String,
      default: null,
    },
    scopes: [String], // e.g., ["repo", "read:user"]
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one account per provider per user
connectedAccountSchema.index({ userId: 1, provider: 1 }, { unique: true });

export default mongoose.model("ConnectedAccount", connectedAccountSchema);

