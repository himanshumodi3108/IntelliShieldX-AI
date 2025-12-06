import AIModel from "../models/AIModel.js";

const planAccess = {
  free: ["basic"],
  standard: ["basic", "standard"],
  pro: ["basic", "standard", "advanced"],
  enterprise: ["basic", "standard", "advanced", "enterprise"],
};

class ModelService {
  async getAvailableModels(userPlan, isAuthenticated = true) {
    const allowedCategories = planAccess[userPlan] || ["basic"];
    
    // For free tier unauthenticated users, only allow Groq models
    // For free tier authenticated users, allow Groq and OpenAI
    let providerFilter = {};
    if (userPlan === "free" && !isAuthenticated) {
      providerFilter = { provider: "Groq" };
    } else if (userPlan === "free" && isAuthenticated) {
      // Authenticated free tier: allow Groq and OpenAI
      providerFilter = { provider: { $in: ["Groq", "OpenAI"] } };
    }
    
    const models = await AIModel.find({
      enabled: true,
      category: { $in: allowedCategories },
      ...providerFilter,
    }).lean();

    let availableModels = models.map((model) => ({
      id: model.modelId,
      name: model.name,
      provider: model.provider,
      category: model.category,
      maxTokens: model.maxTokens,
      speed: model.speed,
      accuracy: model.accuracy,
      cost: model.cost,
      enabled: model.enabled,
      available: true,
      description: model.description,
    }));

    // For unauthenticated users, only return 1 model (the first Groq model)
    if (!isAuthenticated) {
      const groqModel = availableModels.find(m => m.provider === "Groq");
      if (groqModel) {
        return [groqModel];
      }
      // If no Groq model, return first available model
      return availableModels.slice(0, 1);
    }

    return availableModels;
  }

  async getModelById(modelId) {
    return AIModel.findOne({ modelId, enabled: true }).lean();
  }
}

export const modelService = new ModelService();

