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
      limits: limits ? {
        documentation: limits.documentation ?? 1,
        repositories: limits.repositories ?? 1,
        scans: limits.scans ?? 5,
        chatMessages: limits.chatMessages ?? 100,
        threatIntelligence: {
          virusTotal: limits.threatIntelligence?.virusTotal ? {
            enabled: typeof limits.threatIntelligence.virusTotal === 'object' 
              ? (limits.threatIntelligence.virusTotal.enabled ?? false)
              : (limits.threatIntelligence.virusTotal > 0),
            limit: typeof limits.threatIntelligence.virusTotal === 'object'
              ? (limits.threatIntelligence.virusTotal.limit ?? 0)
              : (limits.threatIntelligence.virusTotal ?? 0),
          } : { enabled: false, limit: 0 },
          hybridAnalysis: limits.threatIntelligence?.hybridAnalysis ? {
            enabled: typeof limits.threatIntelligence.hybridAnalysis === 'object'
              ? (limits.threatIntelligence.hybridAnalysis.enabled ?? false)
              : (limits.threatIntelligence.hybridAnalysis > 0),
            limit: typeof limits.threatIntelligence.hybridAnalysis === 'object'
              ? (limits.threatIntelligence.hybridAnalysis.limit ?? 0)
              : (limits.threatIntelligence.hybridAnalysis ?? 0),
          } : { enabled: false, limit: 0 },
          abuseIPDB: limits.threatIntelligence?.abuseIPDB || limits.threatIntelligence?.abuseIpDb ? (() => {
            const abuseIPDBValue = limits.threatIntelligence.abuseIPDB || limits.threatIntelligence.abuseIpDb;
            return {
              enabled: typeof abuseIPDBValue === 'object'
                ? (abuseIPDBValue.enabled ?? false)
                : (abuseIPDBValue > 0),
              limit: typeof abuseIPDBValue === 'object'
                ? (abuseIPDBValue.limit ?? 0)
                : (abuseIPDBValue ?? 0),
            };
          })() : { enabled: false, limit: 0 },
          malwareBazaar: limits.threatIntelligence?.malwareBazaar ? {
            enabled: typeof limits.threatIntelligence.malwareBazaar === 'object'
              ? (limits.threatIntelligence.malwareBazaar.enabled ?? false)
              : (limits.threatIntelligence.malwareBazaar === true),
          } : { enabled: false },
          urlhaus: limits.threatIntelligence?.urlhaus ? {
            enabled: typeof limits.threatIntelligence.urlhaus === 'object'
              ? (limits.threatIntelligence.urlhaus.enabled ?? false)
              : (limits.threatIntelligence.urlhaus === true),
          } : { enabled: false },
          threatFox: limits.threatIntelligence?.threatFox ? {
            enabled: typeof limits.threatIntelligence.threatFox === 'object'
              ? (limits.threatIntelligence.threatFox.enabled ?? false)
              : (limits.threatIntelligence.threatFox === true),
          } : { enabled: false },
        },
      } : {
        documentation: 1,
        repositories: 1,
        scans: 5,
        chatMessages: 100,
        threatIntelligence: {
          virusTotal: { enabled: false, limit: 0 },
          hybridAnalysis: { enabled: false, limit: 0 },
          abuseIPDB: { enabled: false, limit: 0 },
          malwareBazaar: { enabled: false },
          urlhaus: { enabled: false },
          threatFox: { enabled: false },
        },
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
    
    // Update limits with proper nested object merging
    if (req.body.limits !== undefined) {
      // Merge top-level limit fields
      if (req.body.limits.documentation !== undefined) plan.limits.documentation = req.body.limits.documentation;
      if (req.body.limits.repositories !== undefined) plan.limits.repositories = req.body.limits.repositories;
      if (req.body.limits.scans !== undefined) plan.limits.scans = req.body.limits.scans;
      if (req.body.limits.chatMessages !== undefined) plan.limits.chatMessages = req.body.limits.chatMessages;
      
      // Merge threatIntelligence nested object properly
      if (req.body.limits.threatIntelligence !== undefined) {
        // Ensure threatIntelligence object exists
        if (!plan.limits.threatIntelligence) {
          plan.limits.threatIntelligence = {
            virusTotal: { enabled: false, limit: 0 },
            hybridAnalysis: { enabled: false, limit: 0 },
            abuseIPDB: { enabled: false, limit: 0 },
            malwareBazaar: { enabled: false },
            urlhaus: { enabled: false },
            threatFox: { enabled: false },
          };
        }

        // Update VirusTotal
        if (req.body.limits.threatIntelligence.virusTotal !== undefined) {
          if (typeof req.body.limits.threatIntelligence.virusTotal === 'object') {
            if (req.body.limits.threatIntelligence.virusTotal.enabled !== undefined) {
              plan.limits.threatIntelligence.virusTotal.enabled = req.body.limits.threatIntelligence.virusTotal.enabled;
            }
            if (req.body.limits.threatIntelligence.virusTotal.limit !== undefined) {
              plan.limits.threatIntelligence.virusTotal.limit = req.body.limits.threatIntelligence.virusTotal.limit;
            }
          } else {
            // Backward compatibility: convert old format to new
            plan.limits.threatIntelligence.virusTotal = {
              enabled: req.body.limits.threatIntelligence.virusTotal > 0,
              limit: req.body.limits.threatIntelligence.virusTotal,
            };
          }
        }

        // Update Hybrid Analysis
        if (req.body.limits.threatIntelligence.hybridAnalysis !== undefined) {
          if (typeof req.body.limits.threatIntelligence.hybridAnalysis === 'object') {
            if (req.body.limits.threatIntelligence.hybridAnalysis.enabled !== undefined) {
              plan.limits.threatIntelligence.hybridAnalysis.enabled = req.body.limits.threatIntelligence.hybridAnalysis.enabled;
            }
            if (req.body.limits.threatIntelligence.hybridAnalysis.limit !== undefined) {
              plan.limits.threatIntelligence.hybridAnalysis.limit = req.body.limits.threatIntelligence.hybridAnalysis.limit;
            }
          } else {
            plan.limits.threatIntelligence.hybridAnalysis = {
              enabled: req.body.limits.threatIntelligence.hybridAnalysis > 0,
              limit: req.body.limits.threatIntelligence.hybridAnalysis,
            };
          }
        }

        // Update AbuseIPDB
        if (req.body.limits.threatIntelligence.abuseIPDB !== undefined || req.body.limits.threatIntelligence.abuseIpDb !== undefined) {
          const abuseIPDB = req.body.limits.threatIntelligence.abuseIPDB || req.body.limits.threatIntelligence.abuseIpDb;
          if (typeof abuseIPDB === 'object') {
            if (abuseIPDB.enabled !== undefined) {
              plan.limits.threatIntelligence.abuseIPDB.enabled = abuseIPDB.enabled;
            }
            if (abuseIPDB.limit !== undefined) {
              plan.limits.threatIntelligence.abuseIPDB.limit = abuseIPDB.limit;
            }
          } else {
            plan.limits.threatIntelligence.abuseIPDB = {
              enabled: abuseIPDB > 0,
              limit: abuseIPDB,
            };
          }
        }

        // Update MalwareBazaar
        if (req.body.limits.threatIntelligence.malwareBazaar !== undefined) {
          if (typeof req.body.limits.threatIntelligence.malwareBazaar === 'object') {
            if (req.body.limits.threatIntelligence.malwareBazaar.enabled !== undefined) {
              plan.limits.threatIntelligence.malwareBazaar.enabled = req.body.limits.threatIntelligence.malwareBazaar.enabled;
            }
          } else {
            plan.limits.threatIntelligence.malwareBazaar = {
              enabled: req.body.limits.threatIntelligence.malwareBazaar === true,
            };
          }
        }

        // Update URLhaus
        if (req.body.limits.threatIntelligence.urlhaus !== undefined) {
          if (typeof req.body.limits.threatIntelligence.urlhaus === 'object') {
            if (req.body.limits.threatIntelligence.urlhaus.enabled !== undefined) {
              plan.limits.threatIntelligence.urlhaus.enabled = req.body.limits.threatIntelligence.urlhaus.enabled;
            }
          } else {
            plan.limits.threatIntelligence.urlhaus = {
              enabled: req.body.limits.threatIntelligence.urlhaus === true,
            };
          }
        }

        // Update ThreatFox
        if (req.body.limits.threatIntelligence.threatFox !== undefined) {
          if (typeof req.body.limits.threatIntelligence.threatFox === 'object') {
            if (req.body.limits.threatIntelligence.threatFox.enabled !== undefined) {
              plan.limits.threatIntelligence.threatFox.enabled = req.body.limits.threatIntelligence.threatFox.enabled;
            }
          } else {
            plan.limits.threatIntelligence.threatFox = {
              enabled: req.body.limits.threatIntelligence.threatFox === true,
            };
          }
        }
      }
    }
    
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

