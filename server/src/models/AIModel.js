import mongoose from "mongoose";

const aiModelSchema = new mongoose.Schema(
  {
    modelId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    provider: {
      type: String,
      required: true,
      enum: ["OpenAI", "Groq", "Anthropic", "Google", "AWS", "Local", "Custom"],
    },
    category: {
      type: String,
      enum: ["basic", "standard", "advanced", "enterprise"],
      required: true,
    },
    type: {
      type: String,
      enum: ["general", "security", "code", "analysis"],
      default: "general",
    },
    maxTokens: {
      type: Number,
      required: true,
    },
    cost: {
      input: { type: Number, default: 0 },
      output: { type: Number, default: 0 },
    },
    speed: {
      type: String,
      enum: ["fast", "medium", "slow"],
      default: "medium",
    },
    accuracy: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium",
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    description: String,
    config: {
      apiKey: String,
      endpoint: String,
      temperature: { type: Number, default: 0.7 },
      maxTokens: Number,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("AIModel", aiModelSchema);

