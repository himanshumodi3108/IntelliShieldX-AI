import mongoose from "mongoose";
import dotenv from "dotenv";
import AIModel from "../src/models/AIModel.js";

dotenv.config();

const models = [
  {
    modelId: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    provider: "OpenAI",
    category: "basic",
    type: "general",
    maxTokens: 16385,
    cost: { input: 0.0005, output: 0.0015 },
    speed: "fast",
    accuracy: "medium",
    enabled: true, // Enabled for authenticated free tier users
    description: "Fast and cost-effective for general queries",
  },
  {
    modelId: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "OpenAI",
    category: "standard",
    type: "general",
    maxTokens: 128000,
    cost: { input: 0.01, output: 0.03 },
    speed: "medium",
    accuracy: "high",
    enabled: true,
    description: "Balanced performance and accuracy",
  },
  {
    modelId: "gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    category: "advanced",
    type: "general",
    maxTokens: 128000,
    cost: { input: 0.005, output: 0.015 },
    speed: "fast",
    accuracy: "high",
    enabled: true,
    description: "Latest model with improved speed",
  },
  {
    modelId: "gpt-4.1-secure",
    name: "GPT-4.1 Secure",
    provider: "OpenAI",
    category: "enterprise",
    type: "security",
    maxTokens: 128000,
    cost: { input: 0.01, output: 0.03 },
    speed: "medium",
    accuracy: "high",
    enabled: true,
    description: "Security-specialized model for enterprise",
  },
  {
    modelId: "claude-3-haiku",
    name: "Claude 3 Haiku",
    provider: "Anthropic",
    category: "basic",
    type: "general",
    maxTokens: 200000,
    cost: { input: 0.00025, output: 0.00125 },
    speed: "fast",
    accuracy: "medium",
    enabled: false, // Disabled for free tier - only Groq available
    description: "Fast and efficient Claude model",
  },
  {
    modelId: "claude-3-sonnet",
    name: "Claude 3 Sonnet",
    provider: "Anthropic",
    category: "standard",
    type: "general",
    maxTokens: 200000,
    cost: { input: 0.003, output: 0.015 },
    speed: "medium",
    accuracy: "high",
    enabled: true,
    description: "Balanced Claude model",
  },
  {
    modelId: "claude-3-opus",
    name: "Claude 3 Opus",
    provider: "Anthropic",
    category: "advanced",
    type: "general",
    maxTokens: 200000,
    cost: { input: 0.015, output: 0.075 },
    speed: "slow",
    accuracy: "high",
    enabled: true,
    description: "Most capable Claude model",
  },
  {
    modelId: "mixtral-8x7b",
    name: "Llama 3.1 8B Instant",
    provider: "Groq",
    category: "basic",
    type: "general",
    maxTokens: 8192,
    cost: { input: 0.00024, output: 0.00024 },
    speed: "fast",
    accuracy: "medium",
    enabled: true,
    description: "Fast and efficient Llama model via Groq",
  },
  {
    modelId: "llama-3.3-70b",
    name: "Llama 3.3 70B Versatile",
    provider: "Groq",
    category: "standard",
    type: "general",
    maxTokens: 131072,
    cost: { input: 0.00059, output: 0.00079 },
    speed: "medium",
    accuracy: "high",
    enabled: true,
    description: "More capable Llama model with higher accuracy",
  },
  {
    modelId: "gemini-pro",
    name: "Gemini Pro",
    provider: "Google",
    category: "standard",
    type: "general",
    maxTokens: 32768,
    cost: { input: 0.0005, output: 0.0015 },
    speed: "medium",
    accuracy: "high",
    enabled: true,
    description: "Google's advanced AI model",
  },
];

async function seedModels() {
  try {
    const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/sentinelx";
    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB");

    // Clear existing models (optional - comment out if you want to keep existing)
    // await AIModel.deleteMany({});
    // console.log("🗑️  Cleared existing models");

    // Insert models
    for (const model of models) {
      await AIModel.findOneAndUpdate(
        { modelId: model.modelId },
        model,
        { upsert: true, new: true }
      );
      console.log(`✅ Seeded model: ${model.name}`);
    }

    console.log("\n🎉 Successfully seeded all models!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding models:", error);
    process.exit(1);
  }
}

seedModels();

