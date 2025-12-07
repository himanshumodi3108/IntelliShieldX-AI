import express from "express";
import authRoutes from "./auth.js";
import usersRoutes from "./users.js";
import subscriptionsRoutes from "./subscriptions.js";
import analyticsRoutes from "./analytics.js";
import modelsRoutes from "./models.js";
import contentRoutes from "./content.js";
import systemRoutes from "./system.js";
import settingsRoutes from "./settings.js";
import reportsRoutes from "./reports.js";
import logsRoutes from "./logs.js";
import pricingRoutes from "./pricing.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/subscriptions", subscriptionsRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/models", modelsRoutes);
router.use("/content", contentRoutes);
router.use("/system", systemRoutes);
router.use("/settings", settingsRoutes);
router.use("/reports", reportsRoutes);
router.use("/logs", logsRoutes);
router.use("/pricing", pricingRoutes);

export default router;

