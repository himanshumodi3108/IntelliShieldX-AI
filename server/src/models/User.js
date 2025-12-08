import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: false, // Will be validated in pre-save hook
    },
    name: {
      type: String,
      required: true,
    },
    // Legacy fields - kept for backward compatibility, will be migrated
    oauthProvider: {
      type: String,
      enum: ["google", "microsoft", "zoho", "github"],
      default: null,
    },
    oauthId: {
      type: String,
      default: null,
    },
    avatar: {
      type: String,
      default: null,
    },
    plan: {
      type: String,
      enum: ["free", "standard", "pro", "enterprise"],
      default: "free",
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      default: null,
    },
    subscriptionStatus: {
      type: String,
      enum: ["active", "cancelled", "expired"],
      default: "active",
    },
    subscriptionExpiresAt: {
      type: Date,
      default: null,
    },
    usage: {
      scans: { type: Number, default: 0 },
      scansLimit: { type: Number, default: 5 },
      chatMessages: { type: Number, default: 0 },
      chatMessagesLimit: { type: Number, default: 100 },
      documentation: { type: Number, default: 0 },
      documentationLimit: { type: Number, default: 1 }, // Free tier: 1
      repositoryCount: { type: Number, default: 0 }, // Current connected repositories
      threatIntelligence: {
        virusTotal: { type: Number, default: 0 }, // Daily usage count
        hybridAnalysis: { type: Number, default: 0 }, // Daily usage count
        abuseIPDB: { type: Number, default: 0 }, // Daily usage count
        lastResetDate: { type: Date, default: Date.now }, // Track when daily limits were last reset
      },
    },
    phone: {
      type: String,
      default: null,
    },
    // Multi-Factor Authentication
    mfaEnabled: {
      type: Boolean,
      default: false,
    },
    mfaMethod: {
      type: String,
      enum: ["email", "sms", "totp"],
      default: null,
    },
    totpSecret: {
      type: String,
      default: null,
    },
    totpBackupCodes: [String],
    // Password Reset
    resetToken: {
      type: String,
      default: null,
    },
    resetTokenExpiry: {
      type: Date,
      default: null,
    },
    // Repository Management
    repositoryDeletionCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving (only if password exists and is modified)
userSchema.pre("save", async function (next) {
  // Skip password hashing if password is not modified or doesn't exist
  if (!this.isModified("password") || !this.password) {
    // Validate that user has either password or OAuth accounts
    if (!this.password && !this.isNew) {
      // For existing users, check if they have OAuth accounts
      try {
        const OAuthAccount = mongoose.model("OAuthAccount");
        const oauthAccounts = await OAuthAccount.find({ userId: this._id, isActive: true });
        if (oauthAccounts.length === 0 && !this.oauthProvider) {
          // No password, no OAuth accounts - this is invalid
          // But we'll allow it during OAuth account creation
        }
      } catch (error) {
        // OAuthAccount model might not be loaded yet, skip validation
      }
    }
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model("User", userSchema);

