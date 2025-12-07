import express from "express";
import { authenticateAdmin, requireSuperAdmin } from "../../middleware/adminAuth.js";
import { logAdminAction } from "../../services/adminLogService.js";
import PricingPlan from "../../models/PricingPlan.js";

const router = express.Router();

// Get all pricing plans
router.get("/", authenticateAdmin, async (req, res, next) => {
  try {
    const plans = await PricingPlan.find().sort({ displayOrder: 1, planId: 1 }).lean();
    res.json({ plans });
  } catch (error) {
    next(error);
  }
});

// Get pricing plan by ID
router.get("/:id", authenticateAdmin, async (req, res, next) => {
  try {
    const plan = await PricingPlan.findOne({ planId: req.params.id }).lean();
    if (!plan) {
      return res.status(404).json({ error: "Pricing plan not found" });
    }
    res.json({ plan });
  } catch (error) {
    next(error);
  }
});

// Create pricing plan (super-admin only)
router.post("/", authenticateAdmin, requireSuperAdmin, async (req, res, next) => {
  try {
    const {
      planId,
      name,
      description,
      price,
      currency,
      period,
      limits,
      features,
      isActive,
      displayOrder,
    } = req.body;

    if (!planId || !name || price === undefined) {
      return res.status(400).json({ error: "planId, name, and price are required" });
    }

    // Check if plan already exists
    const existingPlan = await PricingPlan.findOne({ planId });
    if (existingPlan) {
      return res.status(400).json({ error: "Pricing plan with this planId already exists" });
    }

    const plan = new PricingPlan({
      planId,
      name,
      description,
      price,
      currency: currency || "INR",
      period: period || "year",
      limits: limits || {
        documentation: 1,
        repositories: 1,
        scans: 5,
        chatMessages: 100,
      },
      features: features || [],
      isActive: isActive !== undefined ? isActive : true,
      displayOrder: displayOrder || 0,
    });

    await plan.save();

    await logAdminAction(
      req.admin.adminId,
      req.admin.email,
      "create_pricing_plan",
      "pricing_plan",
      plan._id.toString(),
      { planId, name, price },
      req
    );

    res.status(201).json({ message: "Pricing plan created successfully", plan });
  } catch (error) {
    next(error);
  }
});

// Update pricing plan (super-admin only)
router.put("/:id", authenticateAdmin, requireSuperAdmin, async (req, res, next) => {
  try {
    const plan = await PricingPlan.findOne({ planId: req.params.id });
    if (!plan) {
      return res.status(404).json({ error: "Pricing plan not found" });
    }

    const oldData = {
      name: plan.name,
      price: plan.price,
      limits: plan.limits,
    };

    // Update fields
    if (req.body.name !== undefined) plan.name = req.body.name;
    if (req.body.description !== undefined) plan.description = req.body.description;
    if (req.body.price !== undefined) plan.price = req.body.price;
    if (req.body.currency !== undefined) plan.currency = req.body.currency;
    if (req.body.period !== undefined) plan.period = req.body.period;
    if (req.body.limits !== undefined) plan.limits = { ...plan.limits, ...req.body.limits };
    if (req.body.features !== undefined) plan.features = req.body.features;
    if (req.body.isActive !== undefined) plan.isActive = req.body.isActive;
    if (req.body.displayOrder !== undefined) plan.displayOrder = req.body.displayOrder;

    await plan.save();

    // Clear pricing cache
    const { clearPricingCache } = await import("../../services/razorpayService.js");
    clearPricingCache();

    await logAdminAction(
      req.admin.adminId,
      req.admin.email,
      "update_pricing_plan",
      "pricing_plan",
      plan._id.toString(),
      {
        planId: plan.planId,
        oldData,
        newData: {
          name: plan.name,
          price: plan.price,
          limits: plan.limits,
        },
      },
      req
    );

    res.json({ message: "Pricing plan updated successfully", plan });
  } catch (error) {
    next(error);
  }
});

// Delete pricing plan (super-admin only)
router.delete("/:id", authenticateAdmin, requireSuperAdmin, async (req, res, next) => {
  try {
    const plan = await PricingPlan.findOne({ planId: req.params.id });
    if (!plan) {
      return res.status(404).json({ error: "Pricing plan not found" });
    }

    // Prevent deletion of free plan
    if (plan.planId === "free") {
      return res.status(400).json({ error: "Cannot delete the free plan" });
    }

    const planData = {
      planId: plan.planId,
      name: plan.name,
    };

    await PricingPlan.deleteOne({ planId: req.params.id });

    // Clear pricing cache
    const { clearPricingCache } = await import("../../services/razorpayService.js");
    clearPricingCache();

    await logAdminAction(
      req.admin.adminId,
      req.admin.email,
      "delete_pricing_plan",
      "pricing_plan",
      req.params.id,
      planData,
      req
    );

    res.json({ message: "Pricing plan deleted successfully" });
  } catch (error) {
    next(error);
  }
});

export default router;

