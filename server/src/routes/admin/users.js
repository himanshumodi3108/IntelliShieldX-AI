import express from "express";
import User from "../../models/User.js";
import Scan from "../../models/Scan.js";
import Documentation from "../../models/Documentation.js";
import Conversation from "../../models/Conversation.js";
import AdminUser from "../../models/AdminUser.js";
import { authenticateAdmin, requireSuperAdmin } from "../../middleware/adminAuth.js";
import { logAdminAction } from "../../services/adminLogService.js";

const router = express.Router();

// Create admin user (super-admin only)
router.post("/admins", authenticateAdmin, requireSuperAdmin, async (req, res, next) => {
  try {
    const { email, password, name, role, permissions, passwordExpiryHours } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: "Email and name are required" });
    }

    if (role && !["admin", "super_admin"].includes(role)) {
      return res.status(400).json({ error: "Invalid role. Must be 'admin' or 'super_admin'" });
    }

    // Check if admin user already exists
    const existingAdmin = await AdminUser.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      return res.status(400).json({ error: "Admin user with this email already exists" });
    }

    // Generate random password if not provided
    let generatedPassword = null;
    let finalPassword = password;
    
    if (!password) {
      // Generate a secure random password
      const crypto = await import("crypto");
      const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
      generatedPassword = "";
      // Ensure at least one lowercase, one uppercase, one number, and one special character
      generatedPassword += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
      generatedPassword += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
      generatedPassword += "0123456789"[Math.floor(Math.random() * 10)];
      generatedPassword += "!@#$%^&*"[Math.floor(Math.random() * 8)];
      
      // Fill the rest randomly
      for (let i = generatedPassword.length; i < 12; i++) {
        generatedPassword += charset[Math.floor(Math.random() * charset.length)];
      }
      
      // Shuffle the password
      generatedPassword = generatedPassword.split("").sort(() => Math.random() - 0.5).join("");
      finalPassword = generatedPassword;
    }

    // Calculate password expiry time (default 24 hours, configurable by super-admin)
    const expiryHours = passwordExpiryHours || 24;
    const passwordExpiryTime = new Date();
    passwordExpiryTime.setHours(passwordExpiryTime.getHours() + expiryHours);

    const admin = new AdminUser({
      email: email.toLowerCase(),
      password: finalPassword, // Will be hashed by pre-save hook
      name,
      role: role || "admin",
      permissions: permissions || [],
      isActive: true,
      mustChangePassword: true, // Require password change on first login
      passwordExpiryTime: generatedPassword ? passwordExpiryTime : null, // Set expiry only for auto-generated passwords
    });

    await admin.save();

    // Send admin creation email with generated password
    try {
      const { sendAdminCreationEmail } = await import("../../services/emailService.js");
      const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
      const adminPanelUrl = `${FRONTEND_URL}/admin/login`;
      await sendAdminCreationEmail(admin.email, admin.name, admin.role, adminPanelUrl, generatedPassword, expiryHours);
    } catch (emailError) {
      console.error("Failed to send admin creation email:", emailError);
      // Don't fail the request if email fails
    }

    await logAdminAction(
      req.admin.adminId,
      req.admin.email,
      "create_admin_user",
      "admin_user",
      admin._id.toString(),
      { email: admin.email, name: admin.name, role: admin.role },
      req
    );

    res.status(201).json({
      message: "Admin user created successfully",
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        permissions: admin.permissions,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get all users with pagination, search, and filters
router.get("/", authenticateAdmin, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const search = req.query.search || "";
    const planFilter = req.query.plan || "";
    const statusFilter = req.query.status || "";
    
    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
      ];
    }
    
    if (planFilter) {
      query.plan = planFilter;
    }
    
    if (statusFilter) {
      query.subscriptionStatus = statusFilter;
    }
    
    // Get users with optimized query (using lean() for better performance)
    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Get total count (optimized with parallel execution)
    const [total, stats] = await Promise.all([
      User.countDocuments(query),
      // Only fetch stats on first page to optimize performance
      page === 1 ? Promise.all([
        User.countDocuments(),
        User.aggregate([
          { $group: { _id: "$plan", count: { $sum: 1 } } },
        ]),
        User.aggregate([
          { $group: { _id: "$subscriptionStatus", count: { $sum: 1 } } },
        ]),
        User.countDocuments({
          createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        }),
        User.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        }),
        User.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        }),
      ]).then(([total, byPlan, byStatus, newToday, newThisWeek, newThisMonth]) => ({
        total,
        byPlan,
        byStatus,
        newToday,
        newThisWeek,
        newThisMonth,
      })) : null,
    ]);
    
    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
      stats: stats || undefined, // Only include stats on first page
    });
  } catch (error) {
    next(error);
  }
});

// Get user by ID
router.get("/:id", authenticateAdmin, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-password").lean();
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Get user statistics
    const scansCount = await Scan.countDocuments({ userId: user._id });
    const docsCount = await Documentation.countDocuments({ userId: user._id });
    const conversationsCount = await Conversation.countDocuments({ userId: user._id });
    
    // Get recent scans
    const recentScans = await Scan.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("target type createdAt")
      .lean();
    
    res.json({
      ...user,
      id: user._id.toString(), // Ensure id is available for frontend
      stats: {
        scans: scansCount,
        documentation: docsCount,
        conversations: conversationsCount,
      },
      recentScans,
    });
  } catch (error) {
    next(error);
  }
});

// Update user
router.put("/:id", authenticateAdmin, async (req, res, next) => {
  try {
    const { name, email, plan, subscriptionStatus } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const oldData = {
      name: user.name,
      email: user.email,
      plan: user.plan,
      subscriptionStatus: user.subscriptionStatus,
    };
    
    if (name) user.name = name;
    if (email) user.email = email.toLowerCase();
    if (plan) user.plan = plan;
    if (subscriptionStatus) user.subscriptionStatus = subscriptionStatus;
    
    await user.save();
    
    // Log action
    await logAdminAction(
      req.admin.adminId,
      req.admin.email,
      "update_user",
      "user",
      user._id.toString(),
      { old: oldData, new: { name: user.name, email: user.email, plan: user.plan, subscriptionStatus: user.subscriptionStatus } },
      req
    );
    
    res.json({ message: "User updated successfully", user });
  } catch (error) {
    next(error);
  }
});

// Suspend user
router.post("/:id/suspend", authenticateAdmin, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    user.subscriptionStatus = "cancelled";
    await user.save();
    
    await logAdminAction(
      req.admin.adminId,
      req.admin.email,
      "suspend_user",
      "user",
      user._id.toString(),
      { reason: req.body.reason || "Admin action" },
      req
    );
    
    res.json({ message: "User suspended successfully" });
  } catch (error) {
    next(error);
  }
});

// Activate user
router.post("/:id/activate", authenticateAdmin, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    user.subscriptionStatus = "active";
    await user.save();
    
    await logAdminAction(
      req.admin.adminId,
      req.admin.email,
      "activate_user",
      "user",
      user._id.toString(),
      {},
      req
    );
    
    res.json({ message: "User activated successfully" });
  } catch (error) {
    next(error);
  }
});

// Change user plan
router.post("/:id/change-plan", authenticateAdmin, async (req, res, next) => {
  try {
    const { plan } = req.body;
    
    if (!plan || !["free", "standard", "pro", "enterprise"].includes(plan)) {
      return res.status(400).json({ error: "Invalid plan" });
    }
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const oldPlan = user.plan;
    const isUpgrade = ["free", "standard", "pro", "enterprise"].indexOf(plan) > ["free", "standard", "pro", "enterprise"].indexOf(oldPlan);
    
    user.plan = plan;
    await user.save();
    
    // Send plan change email
    try {
      const { sendPlanChangeEmail } = await import("../../services/emailService.js");
      await sendPlanChangeEmail(user.email, user.name, oldPlan, plan, isUpgrade);
    } catch (emailError) {
      console.error("Failed to send plan change email:", emailError);
      // Don't fail the request if email fails
    }
    
    await logAdminAction(
      req.admin.adminId,
      req.admin.email,
      "change_user_plan",
      "user",
      user._id.toString(),
      { oldPlan, newPlan: plan },
      req
    );
    
    res.json({ message: "User plan updated successfully", user });
  } catch (error) {
    next(error);
  }
});

// Delete user
router.delete("/:id", authenticateAdmin, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    await logAdminAction(
      req.admin.adminId,
      req.admin.email,
      "delete_user",
      "user",
      user._id.toString(),
      { email: user.email },
      req
    );
    
    await User.findByIdAndDelete(req.params.id);
    
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    next(error);
  }
});

export default router;

