import express from "express";
import { authenticate, optionalAuthenticate } from "../middleware/auth.js";
import AIModel from "../models/AIModel.js";
import { modelService } from "../services/modelService.js";

const router = express.Router();

// Get available models for user's plan (optional auth - allows guests)
router.get("/available", optionalAuthenticate, async (req, res, next) => {
  try {
    // Default to "free" plan if user is not authenticated
    const userPlan = req.user?.plan || "free";
    const isAuthenticated = !!req.user;
    const models = await modelService.getAvailableModels(userPlan, isAuthenticated);
    res.json(models);
  } catch (error) {
    next(error);
  }
});

// Get all models (admin only - for future implementation)
router.get("/", authenticate, async (req, res, next) => {
  try {
    const models = await AIModel.find({ enabled: true }).lean();
    res.json(models);
  } catch (error) {
    next(error);
  }
});

export default router;

