import express from "express";
import jwt from "jsonwebtoken";
import AdminUser from "../../models/AdminUser.js";
import { authenticateAdmin } from "../../middleware/adminAuth.js";
import { logAdminAction } from "../../services/adminLogService.js";
import JWT_SECRET from "../../config/jwt.js";
import {
  generateAndStoreOTP,
  verifyOTP,
  setupTOTP,
  verifyTOTP,
  sendEmailOTP,
  sendSMSOTP,
  generateBackupCodes,
  verifyBackupCode,
} from "../../services/mfaService.js";

const router = express.Router();

// Admin Login
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find admin user
    const admin = await AdminUser.findOne({ email: email.toLowerCase() });
    if (!admin) {
      console.log(`Admin login attempt failed: User not found for email ${email.toLowerCase()}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check if admin is active
    if (!admin.isActive) {
      console.log(`Admin login attempt failed: Account inactive for email ${email.toLowerCase()}`);
      return res.status(401).json({ error: "Admin account is inactive" });
    }

    // Check if password has expired (for auto-generated passwords)
    if (admin.passwordExpiryTime && new Date() > admin.passwordExpiryTime) {
      console.log(`Admin login attempt failed: Password expired for email ${email.toLowerCase()}`);
      return res.status(401).json({ 
        error: "Your temporary password has expired. Please contact the system administrator for a new password." 
      });
    }

    // Verify password
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      console.log(`Admin login attempt failed: Invalid password for email ${email.toLowerCase()}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Update last login
    admin.lastLogin = new Date();
    admin.lastLoginIP = req.ip || req.connection?.remoteAddress || null;
    await admin.save();

    // Generate JWT token
    const token = jwt.sign(
      {
        adminId: admin._id.toString(),
        email: admin.email,
        role: admin.role,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Log login action
    await logAdminAction(admin._id, admin.email, "login", "admin", admin._id.toString(), {}, req);

    res.json({
      message: "Admin login successful",
      token,
      mustChangePassword: admin.mustChangePassword || false,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        permissions: admin.permissions,
        mustChangePassword: admin.mustChangePassword || false,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get Admin Profile
router.get("/profile", authenticateAdmin, async (req, res, next) => {
  try {
    const admin = await AdminUser.findById(req.admin.adminId);
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    res.json({
      id: admin._id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      permissions: admin.permissions,
      lastLogin: admin.lastLogin,
      createdAt: admin.createdAt,
      mustChangePassword: admin.mustChangePassword || false,
      mfaEnabled: admin.mfaEnabled || false,
      mfaMethod: admin.mfaMethod || null,
      phone: admin.phone || null,
    });
  } catch (error) {
    next(error);
  }
});

// Update Admin Profile
router.put("/profile", authenticateAdmin, async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    const admin = await AdminUser.findById(req.admin.adminId);
    
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    if (name) admin.name = name;
    if (phone !== undefined) admin.phone = phone;

    await admin.save();

    // Log profile update
    await logAdminAction(admin._id, admin.email, "update_profile", "admin", admin._id.toString(), {}, req);

    res.json({
      id: admin._id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      permissions: admin.permissions,
      phone: admin.phone,
      mfaEnabled: admin.mfaEnabled || false,
      mfaMethod: admin.mfaMethod || null,
    });
  } catch (error) {
    next(error);
  }
});

// Change Password
router.post("/change-password", authenticateAdmin, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: "New password is required" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters" });
    }

    const admin = await AdminUser.findById(req.admin.adminId);
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    // If mustChangePassword is true, don't require current password
    // Otherwise, verify current password
    if (!admin.mustChangePassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: "Current password is required" });
      }
      const isPasswordValid = await admin.comparePassword(currentPassword);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }
    }

    // Update password and clear mustChangePassword flag
    admin.password = newPassword;
    admin.mustChangePassword = false;
    await admin.save();

    // Log password change
    await logAdminAction(admin._id, admin.email, "change_password", "admin", admin._id.toString(), {}, req);

    res.json({ 
      message: "Password changed successfully",
      mustChangePassword: false,
    });
  } catch (error) {
    next(error);
  }
});

// MFA Routes for Admin

// Enable MFA
router.post("/mfa/enable", authenticateAdmin, async (req, res, next) => {
  try {
    const { method } = req.body;
    const admin = await AdminUser.findById(req.admin.adminId);

    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    if (!["email", "sms", "totp"].includes(method)) {
      return res.status(400).json({ error: "Invalid MFA method" });
    }

    if (method === "totp" && !admin.totpSecret) {
      return res.status(400).json({ error: "TOTP not set up. Please set up TOTP first." });
    }

    if (method === "sms" && !admin.phone) {
      return res.status(400).json({ error: "Phone number not set. Please set your phone number first." });
    }

    admin.mfaEnabled = true;
    admin.mfaMethod = method;
    await admin.save();

    // Log MFA enable
    await logAdminAction(admin._id, admin.email, "enable_mfa", "admin", admin._id.toString(), { method }, req);

    res.json({ message: "MFA enabled successfully", mfaEnabled: true, mfaMethod: method });
  } catch (error) {
    next(error);
  }
});

// Disable MFA
router.post("/mfa/disable", authenticateAdmin, async (req, res, next) => {
  try {
    const admin = await AdminUser.findById(req.admin.adminId);

    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    admin.mfaEnabled = false;
    admin.mfaMethod = null;
    admin.totpSecret = null;
    admin.totpBackupCodes = [];
    await admin.save();

    // Log MFA disable
    await logAdminAction(admin._id, admin.email, "disable_mfa", "admin", admin._id.toString(), {}, req);

    res.json({ message: "MFA disabled successfully" });
  } catch (error) {
    next(error);
  }
});

// Setup Email OTP
router.post("/mfa/setup-email", authenticateAdmin, async (req, res, next) => {
  try {
    const admin = await AdminUser.findById(req.admin.adminId);

    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    const otp = generateAndStoreOTP(admin._id.toString(), "email");
    await sendEmailOTP(admin.email, otp);

    res.json({ message: "OTP sent to email" });
  } catch (error) {
    next(error);
  }
});

// Setup SMS OTP
router.post("/mfa/setup-sms", authenticateAdmin, async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;
    const admin = await AdminUser.findById(req.admin.adminId);

    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    if (!phoneNumber) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    admin.phone = phoneNumber;
    await admin.save();

    const otp = generateAndStoreOTP(admin._id.toString(), "sms");
    await sendSMSOTP(phoneNumber, otp);

    res.json({ message: "OTP sent to phone" });
  } catch (error) {
    next(error);
  }
});

// Setup TOTP
router.post("/mfa/setup-totp", authenticateAdmin, async (req, res, next) => {
  try {
    const result = await setupTOTP(req.admin.adminId, true); // Pass true for admin
    const backupCodes = generateBackupCodes();

    const admin = await AdminUser.findById(req.admin.adminId);
    admin.totpBackupCodes = backupCodes;
    await admin.save();

    res.json({
      secret: result.secret,
      qrCode: result.qrCode,
      backupCodes, // Show to user once, they should save these
    });
  } catch (error) {
    next(error);
  }
});

// Verify TOTP
router.post("/mfa/verify-totp", authenticateAdmin, async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Verification code is required" });
    }

    await verifyTOTP(req.admin.adminId, code, true); // Pass true for admin

    // Enable MFA after successful verification
    const admin = await AdminUser.findById(req.admin.adminId);
    admin.mfaEnabled = true;
    admin.mfaMethod = "totp";
    await admin.save();

    // Log MFA enable
    await logAdminAction(admin._id, admin.email, "enable_mfa", "admin", admin._id.toString(), { method: "totp" }, req);

    res.json({ message: "TOTP verified and MFA enabled" });
  } catch (error) {
    next(error);
  }
});

export default router;

