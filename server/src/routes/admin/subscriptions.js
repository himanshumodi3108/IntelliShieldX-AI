import express from "express";
import Subscription from "../../models/Subscription.js";
import User from "../../models/User.js";
import { authenticateAdmin } from "../../middleware/adminAuth.js";
import { logAdminAction } from "../../services/adminLogService.js";
import { createRefund } from "../../services/razorpayService.js";

const router = express.Router();

// Get all subscriptions
router.get("/", authenticateAdmin, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const planFilter = req.query.plan || "";
    const statusFilter = req.query.status || "";
    const search = req.query.search || "";
    
    const query = {};
    
    if (planFilter) query.plan = planFilter;
    if (statusFilter) query.status = statusFilter;
    
    // Optimize query: build userId filter if search is provided
    let finalQuery = { ...query };
    if (search) {
      const users = await User.find({
        $or: [
          { email: { $regex: search, $options: "i" } },
          { name: { $regex: search, $options: "i" } },
        ],
      }).select("_id").lean();
      const userIds = users.map((u) => u._id);
      if (userIds.length > 0) {
        finalQuery.userId = { $in: userIds };
      } else {
        // No users found, return empty result
        return res.json({
          subscriptions: [],
          pagination: {
            page,
            limit,
            total: 0,
            pages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        });
      }
    }
    
    // Execute queries in parallel for better performance
    const [subscriptions, total] = await Promise.all([
      Subscription.find(finalQuery)
        .populate("userId", "email name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Subscription.countDocuments(finalQuery),
    ]);
    
    res.json({
      subscriptions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get subscription by ID
router.get("/:id", authenticateAdmin, async (req, res, next) => {
  try {
    const subscription = await Subscription.findById(req.params.id)
      .populate("userId", "email name")
      .lean();
    
    if (!subscription) {
      return res.status(404).json({ error: "Subscription not found" });
    }
    
    res.json(subscription);
  } catch (error) {
    next(error);
  }
});

// Process refund
router.post("/:id/refund", authenticateAdmin, async (req, res, next) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
      return res.status(404).json({ error: "Subscription not found" });
    }
    
    if (!subscription.razorpayPaymentId) {
      return res.status(400).json({ error: "No payment ID found for this subscription" });
    }
    
    if (subscription.refundedAt) {
      return res.status(400).json({ error: "Subscription already refunded" });
    }
    
    try {
      const refund = await createRefund(
        subscription.razorpayPaymentId,
        subscription.amount * 100, // Convert to paise
        "Admin refund"
      );
      
      subscription.status = "refunded";
      subscription.refundedAt = new Date();
      subscription.refundAmount = subscription.amount;
      subscription.refundId = refund.id;
      subscription.bankReferenceNumber = refund.acquirer_data?.rrn || null;
      await subscription.save();
      
      await logAdminAction(
        req.admin.adminId,
        req.admin.email,
        "process_refund",
        "subscription",
        subscription._id.toString(),
        { amount: subscription.amount, refundId: refund.id },
        req
      );
      
      res.json({ message: "Refund processed successfully", refund });
    } catch (refundError) {
      subscription.refundError = refundError.message;
      await subscription.save();
      
      return res.status(500).json({
        error: "Refund processing failed",
        message: refundError.message,
      });
    }
  } catch (error) {
    next(error);
  }
});

// Get revenue statistics
router.get("/analytics/revenue", authenticateAdmin, async (req, res, next) => {
  try {
    const period = req.query.period || "month"; // day, week, month, year
    
    const now = new Date();
    let startDate;
    
    switch (period) {
      case "day":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case "week":
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case "month":
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case "year":
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(now.setMonth(now.getMonth() - 1));
    }
    
    const revenue = await Subscription.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $in: ["active", "cancelled"] },
        },
      },
      {
        $group: {
          _id: "$plan",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);
    
    const totalRevenue = await Subscription.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $in: ["active", "cancelled"] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);
    
    const refunds = await Subscription.aggregate([
      {
        $match: {
          refundedAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$refundAmount" },
          count: { $sum: 1 },
        },
      },
    ]);
    
    res.json({
      revenue,
      totalRevenue: totalRevenue[0]?.total || 0,
      refunds: refunds[0] || { total: 0, count: 0 },
      period,
      startDate,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

