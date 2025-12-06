import mongoose from "mongoose";

const repositorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    connectedAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ConnectedAccount",
      required: true,
    },
    provider: {
      type: String,
      enum: ["github", "gitlab", "bitbucket"],
      required: true,
    },
    repositoryId: {
      type: String,
      required: true, // Provider's repository ID
    },
    name: {
      type: String,
      required: true,
    },
    fullName: {
      type: String,
      required: true, // e.g., "username/repo-name"
    },
    description: {
      type: String,
      default: null,
    },
    url: {
      type: String,
      required: true,
    },
    private: {
      type: Boolean,
      default: false,
    },
    defaultBranch: {
      type: String,
      default: "main",
    },
    language: {
      type: String,
      default: null,
    },
    lastScannedAt: {
      type: Date,
      default: null,
    },
    lastScanResult: {
      scanId: String,
      vulnerabilities: {
        critical: { type: Number, default: 0 },
        high: { type: Number, default: 0 },
        medium: { type: Number, default: 0 },
        low: { type: Number, default: 0 },
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure one repository per user
repositorySchema.index({ userId: 1, provider: 1, repositoryId: 1 }, { unique: true });

export default mongoose.model("Repository", repositorySchema);

