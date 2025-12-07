import express from "express";
import User from "../../models/User.js";
import Scan from "../../models/Scan.js";
import Documentation from "../../models/Documentation.js";
import Conversation from "../../models/Conversation.js";
import AIModel from "../../models/AIModel.js";
import { authenticateAdmin } from "../../middleware/adminAuth.js";

const router = express.Router();

// Get overview analytics
router.get("/overview", authenticateAdmin, async (req, res, next) => {
  try {
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const thisWeek = new Date(now.setDate(now.getDate() - 7));
    const thisMonth = new Date(now.setMonth(now.getMonth() - 1));
    
    const [
      totalUsers,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      totalScans,
      scansToday,
      totalDocs,
      docsToday,
      totalConversations,
      activeModels,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: today } }),
      User.countDocuments({ createdAt: { $gte: thisWeek } }),
      User.countDocuments({ createdAt: { $gte: thisMonth } }),
      Scan.countDocuments(),
      Scan.countDocuments({ createdAt: { $gte: today } }),
      Documentation.countDocuments(),
      Documentation.countDocuments({ createdAt: { $gte: today } }),
      Conversation.countDocuments(),
      AIModel.countDocuments({ isActive: true }),
    ]);
    
    res.json({
      users: {
        total: totalUsers,
        newToday: newUsersToday,
        newThisWeek: newUsersThisWeek,
        newThisMonth: newUsersThisMonth,
      },
      scans: {
        total: totalScans,
        today: scansToday,
      },
      documentation: {
        total: totalDocs,
        today: docsToday,
      },
      conversations: {
        total: totalConversations,
      },
      models: {
        active: activeModels,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get user analytics
router.get("/users", authenticateAdmin, async (req, res, next) => {
  try {
    const period = req.query.period || "30"; // days
    const startDate = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000);
    
    // User growth over time
    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    
    // Users by plan
    const usersByPlan = await User.aggregate([
      {
        $group: {
          _id: "$plan",
          count: { $sum: 1 },
        },
      },
    ]);
    
    // Users by registration method
    const usersByMethod = await User.aggregate([
      {
        $group: {
          _id: {
            $cond: [
              { $ifNull: ["$oauthProvider", false] },
              "$oauthProvider",
              "email",
            ],
          },
          count: { $sum: 1 },
        },
      },
    ]);
    
    res.json({
      growth: userGrowth,
      byPlan: usersByPlan,
      byMethod: usersByMethod,
    });
  } catch (error) {
    next(error);
  }
});

// Get usage analytics
router.get("/usage", authenticateAdmin, async (req, res, next) => {
  try {
    const period = req.query.period || "30";
    const startDate = new Date(Date.now() - parseInt(period) * 24 * 60 * 60 * 1000);
    
    // Scans by type
    const scansByType = await Scan.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
        },
      },
    ]);
    
    // Vulnerability severity distribution
    const severityDist = await Scan.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $unwind: "$vulnerabilities",
      },
      {
        $group: {
          _id: "$vulnerabilities.severity",
          count: { $sum: 1 },
        },
      },
    ]);
    
    // Model usage
    const modelUsage = await Conversation.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $unwind: "$messages",
      },
      {
        $match: {
          "messages.role": "assistant",
          "messages.modelId": { $exists: true },
        },
      },
      {
        $group: {
          _id: "$messages.modelId",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
    
    res.json({
      scansByType,
      severityDistribution: severityDist,
      modelUsage,
    });
  } catch (error) {
    next(error);
  }
});

export default router;


