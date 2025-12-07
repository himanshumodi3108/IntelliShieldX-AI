import express from "express";
import AIModel from "../../models/AIModel.js";
import { authenticateAdmin } from "../../middleware/adminAuth.js";
import { logAdminAction } from "../../services/adminLogService.js";

const router = express.Router();

// Helper function to check if a provider is integrated
// Based on model/llm/model_manager.py - only Groq and Google are currently integrated
const isProviderIntegrated = (provider) => {
  const integratedProviders = ["Groq", "Google"];
  return integratedProviders.includes(provider);
};

// Get all models
router.get("/", authenticateAdmin, async (req, res, next) => {
  try {
    const models = await AIModel.find().sort({ category: 1, name: 1 }).lean();
    
    // Add integration status to each model
    const modelsWithIntegration = models.map((model) => ({
      ...model,
      integrated: isProviderIntegrated(model.provider),
    }));
    
    res.json({ models: modelsWithIntegration });
  } catch (error) {
    next(error);
  }
});

// Get model by ID
router.get("/:id", authenticateAdmin, async (req, res, next) => {
  try {
    const model = await AIModel.findById(req.params.id).lean();
    if (!model) {
      return res.status(404).json({ error: "Model not found" });
    }
    
    // Add integration status
    const modelWithIntegration = {
      ...model,
      integrated: isProviderIntegrated(model.provider),
    };
    
    res.json({ model: modelWithIntegration });
  } catch (error) {
    next(error);
  }
});

// Create model
router.post("/", authenticateAdmin, async (req, res, next) => {
  try {
    const model = new AIModel(req.body);
    await model.save();
    
    await logAdminAction(
      req.admin.adminId,
      req.admin.email,
      "create_model",
      "model",
      model._id.toString(),
      { name: model.name },
      req
    );
    
    res.status(201).json({ message: "Model created successfully", model });
  } catch (error) {
    next(error);
  }
});

// Update model
router.put("/:id", authenticateAdmin, async (req, res, next) => {
  try {
    const model = await AIModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!model) {
      return res.status(404).json({ error: "Model not found" });
    }
    
    await logAdminAction(
      req.admin.adminId,
      req.admin.email,
      "update_model",
      "model",
      model._id.toString(),
      { changes: req.body },
      req
    );
    
    res.json({ message: "Model updated successfully", model });
  } catch (error) {
    next(error);
  }
});

// Delete model
router.delete("/:id", authenticateAdmin, async (req, res, next) => {
  try {
    const model = await AIModel.findByIdAndDelete(req.params.id);
    
    if (!model) {
      return res.status(404).json({ error: "Model not found" });
    }
    
    await logAdminAction(
      req.admin.adminId,
      req.admin.email,
      "delete_model",
      "model",
      req.params.id,
      { name: model.name },
      req
    );
    
    res.json({ message: "Model deleted successfully" });
  } catch (error) {
    next(error);
  }
});

export default router;


