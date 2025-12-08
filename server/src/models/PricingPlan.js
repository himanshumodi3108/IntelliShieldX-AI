import mongoose from "mongoose";

const pricingPlanSchema = new mongoose.Schema(
  {
    planId: {
      type: String,
      required: true,
      unique: true,
      enum: ["free", "standard", "pro", "enterprise"],
      index: true, // This creates the index, so we don't need the separate index() call
    },
    name: {
      type: String,
      required: true,
    },
    description: String,
    price: {
      type: Number,
      required: true,
      default: 0, // Price in rupees (will be converted to paise when needed)
    },
    currency: {
      type: String,
      default: "INR",
    },
    period: {
      type: String,
      default: "year",
      enum: ["month", "year"],
    },
    limits: {
      documentation: {
        type: Number,
        default: 1,
      },
      repositories: {
        type: Number,
        default: 1,
      },
      scans: {
        type: Number,
        default: 5,
      },
      chatMessages: {
        type: Number,
        default: 100,
      },
      threatIntelligence: {
        virusTotal: {
          enabled: {
            type: Boolean,
            default: false, // Service enabled for this plan
          },
          limit: {
            type: Number,
            default: 0, // Daily limit (0 = disabled, -1 = unlimited)
          },
        },
        hybridAnalysis: {
          enabled: {
            type: Boolean,
            default: false,
          },
          limit: {
            type: Number,
            default: 0,
          },
        },
        abuseIPDB: {
          enabled: {
            type: Boolean,
            default: false,
          },
          limit: {
            type: Number,
            default: 0,
          },
        },
        malwareBazaar: {
          enabled: {
            type: Boolean,
            default: false, // Free unlimited service
          },
        },
        urlhaus: {
          enabled: {
            type: Boolean,
            default: false, // Free unlimited service
          },
        },
        threatFox: {
          enabled: {
            type: Boolean,
            default: false, // Free unlimited service
          },
        },
      },
    },
    features: [String],
    isActive: {
      type: Boolean,
      default: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries (planId index is already created by unique: true)
pricingPlanSchema.index({ isActive: 1, displayOrder: 1 });

export default mongoose.model("PricingPlan", pricingPlanSchema);

