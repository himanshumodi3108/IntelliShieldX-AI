import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["general", "oauth", "payments", "email", "features", "threatIntelligence"],
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    description: String,
    isEditable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
settingsSchema.index({ category: 1, key: 1 });

export default mongoose.model("Settings", settingsSchema);


