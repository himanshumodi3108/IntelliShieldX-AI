import express from "express";
import { authenticateAdmin } from "../../middleware/adminAuth.js";
import { getAdminLogs } from "../../services/adminLogService.js";

const router = express.Router();

// Get admin logs
router.get("/", authenticateAdmin, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    
    const filters = {
      adminId: req.query.adminId || null,
      action: req.query.action || null,
      resource: req.query.resource || null,
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null,
    };
    
    const result = await getAdminLogs(filters, page, limit);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;


