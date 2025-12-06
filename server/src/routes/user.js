import express from "express";
import { authenticate } from "../middleware/auth.js";
import User from "../models/User.js";
import OAuthAccount from "../models/OAuthAccount.js";
import {
  generateAndStoreOTP,
  verifyOTP,
  setupTOTP,
  verifyTOTP,
  sendEmailOTP,
  sendSMSOTP,
  generateBackupCodes,
} from "../services/mfaService.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get user plan
router.get("/plan", async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select("plan").lean();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user.plan);
  } catch (error) {
    next(error);
  }
});

// Get user profile
router.get("/profile", async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId)
      .select("-password -totpSecret")
      .lean();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Get OAuth accounts
    const oauthAccounts = await OAuthAccount.find({ 
      userId: req.user.userId, 
      isActive: true 
    }).select("-accessToken -refreshToken").lean();
    
    res.json({
      ...user,
      oauthAccounts: oauthAccounts || [],
    });
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.put("/profile", async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;

    await user.save();

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      plan: user.plan,
    });
  } catch (error) {
    next(error);
  }
});

// MFA Routes

// Enable MFA
router.post("/mfa/enable", async (req, res, next) => {
  try {
    const { method } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!["email", "sms", "totp"].includes(method)) {
      return res.status(400).json({ error: "Invalid MFA method" });
    }

    if (method === "totp" && !user.totpSecret) {
      return res.status(400).json({ error: "TOTP not set up. Please set up TOTP first." });
    }

    user.mfaEnabled = true;
    user.mfaMethod = method;
    await user.save();

    res.json({ message: "MFA enabled successfully", mfaEnabled: true, mfaMethod: method });
  } catch (error) {
    next(error);
  }
});

// Disable MFA
router.post("/mfa/disable", async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.mfaEnabled = false;
    user.mfaMethod = null;
    user.totpSecret = null;
    user.totpBackupCodes = [];
    await user.save();

    res.json({ message: "MFA disabled successfully" });
  } catch (error) {
    next(error);
  }
});

// Setup Email OTP
router.post("/mfa/setup-email", async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const otp = generateAndStoreOTP(user._id.toString(), "email");
    await sendEmailOTP(user.email, otp);

    res.json({ message: "OTP sent to email" });
  } catch (error) {
    next(error);
  }
});

// Setup SMS OTP
router.post("/mfa/setup-sms", async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!phoneNumber) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    user.phone = phoneNumber;
    await user.save();

    const otp = generateAndStoreOTP(user._id.toString(), "sms");
    await sendSMSOTP(phoneNumber, otp);

    res.json({ message: "OTP sent to phone" });
  } catch (error) {
    next(error);
  }
});

// Setup TOTP
router.post("/mfa/setup-totp", async (req, res, next) => {
  try {
    const result = await setupTOTP(req.user.userId);
    const backupCodes = generateBackupCodes();

    const user = await User.findById(req.user.userId);
    user.totpBackupCodes = backupCodes;
    await user.save();

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
router.post("/mfa/verify-totp", async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Verification code is required" });
    }

    await verifyTOTP(req.user.userId, code);

    // Enable MFA after successful verification
    const user = await User.findById(req.user.userId);
    user.mfaEnabled = true;
    user.mfaMethod = "totp";
    await user.save();

    res.json({ message: "TOTP verified and MFA enabled" });
  } catch (error) {
    next(error);
  }
});

// OAuth Account Management Routes

// Get user's OAuth accounts
router.get("/oauth-accounts", async (req, res, next) => {
  try {
    const oauthAccounts = await OAuthAccount.find({ 
      userId: req.user.userId, 
      isActive: true 
    }).select("-accessToken -refreshToken").lean();
    
    res.json(oauthAccounts);
  } catch (error) {
    next(error);
  }
});

// Disconnect OAuth account
router.delete("/oauth-accounts/:provider", async (req, res, next) => {
  try {
    const { provider } = req.params;
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Find the OAuth account
    const oauthAccount = await OAuthAccount.findOne({
      userId: req.user.userId,
      provider: provider,
      isActive: true,
    });

    if (!oauthAccount) {
      return res.status(404).json({ error: "OAuth account not found" });
    }

    // Check if this is the last OAuth account and user has no password
    const allOAuthAccounts = await OAuthAccount.find({ 
      userId: req.user.userId, 
      isActive: true 
    });
    
    if (allOAuthAccounts.length === 1 && !user.password) {
      return res.status(400).json({ 
        error: "Cannot disconnect last OAuth account. Please set a password first or connect another account." 
      });
    }

    // Deactivate the OAuth account
    oauthAccount.isActive = false;
    await oauthAccount.save();

    // If this was the primary account, set another one as primary
    if (oauthAccount.isPrimary) {
      const remainingAccounts = await OAuthAccount.find({ 
        userId: req.user.userId, 
        isActive: true 
      });
      if (remainingAccounts.length > 0) {
        remainingAccounts[0].isPrimary = true;
        await remainingAccounts[0].save();
      }
    }

    res.json({ message: "OAuth account disconnected successfully" });
  } catch (error) {
    next(error);
  }
});

export default router;

