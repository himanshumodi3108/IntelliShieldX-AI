import speakeasy from "speakeasy";
import QRCode from "qrcode";
import crypto from "crypto";
import User from "../models/User.js";
import AdminUser from "../models/AdminUser.js";

/**
 * Generate a 6-digit OTP
 */
export const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Store OTP in user's session/temporary storage
 * In production, use Redis or similar for OTP storage
 */
const otpStorage = new Map();

/**
 * Generate and store OTP for user
 */
export const generateAndStoreOTP = (userId, method) => {
  const otp = generateOTP();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  otpStorage.set(`${userId}-${method}`, {
    otp,
    expiresAt,
    method,
  });

  // Clean up expired OTPs
  setTimeout(() => {
    otpStorage.delete(`${userId}-${method}`);
  }, 10 * 60 * 1000);

  return otp;
};

/**
 * Verify OTP
 */
export const verifyOTP = (userId, method, code) => {
  const key = `${userId}-${method}`;
  const stored = otpStorage.get(key);

  if (!stored) {
    return { valid: false, error: "OTP not found or expired" };
  }

  if (Date.now() > stored.expiresAt) {
    otpStorage.delete(key);
    return { valid: false, error: "OTP expired" };
  }

  if (stored.otp !== code) {
    return { valid: false, error: "Invalid OTP" };
  }

  // OTP is valid, remove it
  otpStorage.delete(key);
  return { valid: true };
};

/**
 * Setup TOTP for user or admin
 */
export const setupTOTP = async (userId, isAdmin = false) => {
  const Model = isAdmin ? AdminUser : User;
  const user = await Model.findById(userId);
  if (!user) {
    throw new Error(isAdmin ? "Admin not found" : "User not found");
  }

  const secret = speakeasy.generateSecret({
    name: `IntelliShieldX (${user.email})`,
    issuer: "IntelliShieldX",
  });

  // Store secret temporarily (user needs to verify before enabling)
  user.totpSecret = secret.base32;
  await user.save();

  // Generate QR code
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

  return {
    secret: secret.base32,
    qrCode: qrCodeUrl,
  };
};

/**
 * Verify TOTP code
 */
export const verifyTOTP = async (userId, token, isAdmin = false) => {
  const Model = isAdmin ? AdminUser : User;
  const user = await Model.findById(userId);
  if (!user || !user.totpSecret) {
    throw new Error("TOTP not set up");
  }

  const verified = speakeasy.totp.verify({
    secret: user.totpSecret,
    encoding: "base32",
    token,
    window: 2, // Allow 2 time steps (60 seconds) of tolerance
  });

  if (!verified) {
    throw new Error("Invalid TOTP code");
  }

  return true;
};

/**
 * Generate backup codes for TOTP
 */
export const generateBackupCodes = () => {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    codes.push(crypto.randomBytes(4).toString("hex").toUpperCase());
  }
  return codes;
};

/**
 * Verify backup code
 */
export const verifyBackupCode = async (userId, code, isAdmin = false) => {
  const Model = isAdmin ? AdminUser : User;
  const user = await Model.findById(userId);
  if (!user || !user.totpBackupCodes || user.totpBackupCodes.length === 0) {
    return false;
  }

  const index = user.totpBackupCodes.indexOf(code.toUpperCase());
  if (index === -1) {
    return false;
  }

  // Remove used backup code
  user.totpBackupCodes.splice(index, 1);
  await user.save();

  return true;
};

/**
 * Send OTP via Email
 */
export const sendEmailOTP = async (email, otp) => {
  try {
    const { sendEmail } = await import("./emailService.js");
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .otp-box { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center; }
          .otp-code { font-size: 32px; font-weight: bold; color: #6366f1; letter-spacing: 8px; font-family: monospace; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your Verification Code</h1>
          </div>
          <div class="content">
            <p>Hi there,</p>
            <p>Your verification code for IntelliShieldX is:</p>
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
            </div>
            <div class="warning">
              <strong>⚠️ Important:</strong> This code will expire in 10 minutes. Do not share this code with anyone.
            </div>
            <p>If you didn't request this code, please ignore this email.</p>
            <p>Best regards,<br>The IntelliShieldX Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} IntelliShieldX. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await sendEmail({
      to: email,
      subject: "Your IntelliShieldX Verification Code",
      html,
    });
  } catch (error) {
    console.error("Failed to send email OTP:", error);
    // Fallback to console log if email service fails
    console.log(`OTP ${otp} for ${email} (email service unavailable)`);
    return false;
  }
};

/**
 * Send OTP via SMS (using Twilio)
 */
export const sendSMSOTP = async (phoneNumber, otp) => {
  // Check if Twilio is configured
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    throw new Error("SMS service not configured. Please set up Twilio credentials.");
  }

  try {
    // Dynamic import to avoid requiring Twilio if not configured
    const twilioModule = await import("twilio");
    const twilio = twilioModule.default;
    
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    await client.messages.create({
      body: `Your IntelliShieldX verification code is: ${otp}. This code will expire in 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });
    return true;
  } catch (error) {
    console.error("Failed to send SMS:", error);
    throw new Error("Failed to send SMS. Please check your phone number.");
  }
};

