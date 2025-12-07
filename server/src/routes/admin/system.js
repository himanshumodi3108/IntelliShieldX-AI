import express from "express";
import { authenticateAdmin } from "../../middleware/adminAuth.js";
import mongoose from "mongoose";

const router = express.Router();

// Get system health
router.get("/health", authenticateAdmin, async (req, res, next) => {
  try {
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
          state: mongoose.connection.readyState,
        },
        aiEngine: {
          status: "unknown",
          url: process.env.PYTHON_ENGINE_URL || "http://localhost:5000",
        },
      },
    };
    
    // Check AI engine if URL is configured
    if (process.env.PYTHON_ENGINE_URL) {
      try {
        const axios = (await import("axios")).default;
        const response = await axios.get(`${process.env.PYTHON_ENGINE_URL}/health`, {
          timeout: 5000,
        });
        health.services.aiEngine.status = response.status === 200 ? "connected" : "error";
      } catch (error) {
        health.services.aiEngine.status = "disconnected";
        health.services.aiEngine.error = error.message;
      }
    }
    
    // Overall status
    if (health.services.database.status !== "connected") {
      health.status = "degraded";
    }
    
    res.json(health);
  } catch (error) {
    next(error);
  }
});

// Get system metrics
router.get("/metrics", authenticateAdmin, async (req, res, next) => {
  try {
    const metrics = {
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      timestamp: new Date().toISOString(),
    };
    
    res.json(metrics);
  } catch (error) {
    next(error);
  }
});

export default router;


