import express from "express";
import User from "../../models/User.js";
import Subscription from "../../models/Subscription.js";
import Scan from "../../models/Scan.js";
import Documentation from "../../models/Documentation.js";
import { authenticateAdmin } from "../../middleware/adminAuth.js";

const router = express.Router();

// Get revenue report
router.get("/revenue", authenticateAdmin, async (req, res, next) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
    
    const revenue = await Subscription.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $in: ["active", "cancelled"] },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    
    const byPlan = await Subscription.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
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
    
    res.json({
      period: { startDate, endDate },
      daily: revenue,
      byPlan,
    });
  } catch (error) {
    next(error);
  }
});

// Get user growth report
router.get("/users", authenticateAdmin, async (req, res, next) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
    
    const growth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
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
    
    res.json({
      period: { startDate, endDate },
      growth,
    });
  } catch (error) {
    next(error);
  }
});

// Get usage report
router.get("/usage", authenticateAdmin, async (req, res, next) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
    
    const scans = await Scan.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
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
    
    const docs = await Documentation.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
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
    
    res.json({
      period: { startDate, endDate },
      scans,
      documentation: docs,
    });
  } catch (error) {
    next(error);
  }
});

export default router;




