import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import OAuthAccount from "../models/OAuthAccount.js";
import { generateAndStoreOTP, verifyOTP } from "./mfaService.js";
import { sendEmailOTP } from "./mfaService.js";

// Get JWT secret dynamically (read from env each time to ensure it's loaded)
const getJWTSecret = () => {
  return process.env.JWT_SECRET || "your-secret-key";
};
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

/**
 * Generate password reset token
 */
export const generateResetToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

/**
 * Request password reset with OTP
 */
export const requestPasswordResetOTP = async (email) => {
  const user = await User.findOne({ email });
  
  if (!user) {
    // Don't reveal if user exists for security
    return { success: true };
  }

  if (user.oauthProvider) {
    throw new Error("Cannot reset password for OAuth accounts. Please use your OAuth provider to sign in.");
  }

  const otp = generateAndStoreOTP(user._id.toString(), "password-reset");
  await sendEmailOTP(email, otp);

  return { success: true };
};

/**
 * Verify password reset OTP
 */
export const verifyPasswordResetOTP = async (email, otp) => {
  const user = await User.findOne({ email });
  
  if (!user) {
    throw new Error("Invalid OTP");
  }

  const result = verifyOTP(user._id.toString(), "password-reset", otp);
  
  if (!result.valid) {
    throw new Error(result.error || "Invalid or expired OTP");
  }

  // Generate JWT token for password reset
  const resetToken = jwt.sign(
    { userId: user._id, email: user.email, type: "password-reset" },
    getJWTSecret(),
    { expiresIn: "1h" }
  );

  return { token: resetToken };
};

/**
 * Request password reset with link
 */
export const requestPasswordResetLink = async (email) => {
  const user = await User.findOne({ email });
  
  if (!user) {
    // Don't reveal if user exists for security
    return { success: true };
  }

  // Check if user has OAuth accounts (new system) or legacy oauthProvider
  const oauthAccounts = await OAuthAccount.find({ userId: user._id, isActive: true });
  if (oauthAccounts.length > 0 || user.oauthProvider) {
    throw new Error("Cannot reset password for OAuth accounts. Please use your OAuth provider to sign in.");
  }

  // Generate reset token
  const resetToken = generateResetToken();
  const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  user.resetToken = resetToken;
  user.resetTokenExpiry = resetTokenExpiry;
  await user.save();

  // Generate JWT token for the reset link
  const jwtToken = jwt.sign(
    { userId: user._id, email: user.email, type: "password-reset", resetToken },
    getJWTSecret(),
    { expiresIn: "1h" }
  );

  const resetLink = `${FRONTEND_URL}/reset-password?token=${jwtToken}`;

  // Send email with reset link
  await sendPasswordResetEmail(email, resetLink, user.name);

  return { success: true };
};

/**
 * Validate reset token
 */
export const validateResetToken = async (token) => {
  try {
    const decoded = jwt.verify(token, getJWTSecret());
    
    if (decoded.type !== "password-reset") {
      throw new Error("Invalid token type");
    }

    const user = await User.findById(decoded.userId);
    
    if (!user) {
      throw new Error("User not found");
    }

    // If using resetToken (link method), verify it matches
    if (decoded.resetToken) {
      if (user.resetToken !== decoded.resetToken) {
        throw new Error("Invalid reset token");
      }

      if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
        throw new Error("Reset token expired");
      }
    }

    return { valid: true, userId: user._id, email: user.email };
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      throw new Error("Invalid or expired reset token");
    }
    throw error;
  }
};

/**
 * Reset password with token
 */
export const resetPasswordWithToken = async (token, newPassword) => {
  const validation = await validateResetToken(token);
  
  const user = await User.findById(validation.userId);
  
  if (!user) {
    throw new Error("User not found");
  }

  // Update password
  user.password = newPassword;
  user.resetToken = null;
  user.resetTokenExpiry = null;
  await user.save();

  return { success: true };
};

/**
 * Reset password with OTP
 */
export const resetPasswordWithOTP = async (email, otp, newPassword) => {
  const user = await User.findOne({ email });
  
  if (!user) {
    throw new Error("Invalid request");
  }

  // Verify OTP
  const result = verifyOTP(user._id.toString(), "password-reset", otp);
  
  if (!result.valid) {
    throw new Error(result.error || "Invalid or expired OTP");
  }

  // Update password
  user.password = newPassword;
  await user.save();

  return { success: true };
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (email, resetLink, name) => {
  // Import here to avoid circular dependency
  const { sendPasswordResetEmail: sendEmail } = await import("./emailService.js");
  return await sendEmail(email, name, resetLink);
};

