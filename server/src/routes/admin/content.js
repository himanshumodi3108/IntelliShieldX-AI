import express from "express";
import Scan from "../../models/Scan.js";
import Documentation from "../../models/Documentation.js";
import Conversation from "../../models/Conversation.js";
import { authenticateAdmin } from "../../middleware/adminAuth.js";
import { logAdminAction } from "../../services/adminLogService.js";

const router = express.Router();

// Get all scans
router.get("/scans", authenticateAdmin, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Execute queries in parallel for better performance
    const [scans, total] = await Promise.all([
      Scan.find()
        .populate("userId", "email name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Scan.countDocuments(),
    ]);
    
    res.json({
      scans,
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

// Delete scan
router.delete("/scans/:id", authenticateAdmin, async (req, res, next) => {
  try {
    const scan = await Scan.findByIdAndDelete(req.params.id);
    
    if (!scan) {
      return res.status(404).json({ error: "Scan not found" });
    }
    
    await logAdminAction(
      req.admin.adminId,
      req.admin.email,
      "delete_scan",
      "scan",
      req.params.id,
      {},
      req
    );
    
    res.json({ message: "Scan deleted successfully" });
  } catch (error) {
    next(error);
  }
});

// Get all documentation
router.get("/documentation", authenticateAdmin, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Execute queries in parallel for better performance
    const [docs, total] = await Promise.all([
      Documentation.find()
        .populate("userId", "email name")
        .populate("repositoryId", "name fullName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Documentation.countDocuments(),
    ]);
    
    res.json({
      documentation: docs,
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

// Delete documentation
router.delete("/documentation/:id", authenticateAdmin, async (req, res, next) => {
  try {
    const doc = await Documentation.findByIdAndDelete(req.params.id);
    
    if (!doc) {
      return res.status(404).json({ error: "Documentation not found" });
    }
    
    await logAdminAction(
      req.admin.adminId,
      req.admin.email,
      "delete_documentation",
      "documentation",
      req.params.id,
      {},
      req
    );
    
    res.json({ message: "Documentation deleted successfully" });
  } catch (error) {
    next(error);
  }
});

// Get all conversations
router.get("/conversations", authenticateAdmin, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Execute queries in parallel for better performance
    const [conversations, total] = await Promise.all([
      Conversation.find()
        .populate("userId", "email name")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Conversation.countDocuments(),
    ]);
    
    res.json({
      conversations,
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

// Delete conversation
router.delete("/conversations/:id", authenticateAdmin, async (req, res, next) => {
  try {
    const conversation = await Conversation.findByIdAndDelete(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    
    await logAdminAction(
      req.admin.adminId,
      req.admin.email,
      "delete_conversation",
      "conversation",
      req.params.id,
      {},
      req
    );
    
    res.json({ message: "Conversation deleted successfully" });
  } catch (error) {
    next(error);
  }
});

export default router;

