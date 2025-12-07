import nodemailer from "nodemailer";

// Create reusable transporter
let transporter = null;

const initializeEmailService = (silent = false) => {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || "587");
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  // Support both EMAIL_FROM and FROM_EMAIL for backward compatibility
  // Prioritize EMAIL_FROM over SMTP_USER to avoid using the SMTP account email
  const fromEmail = process.env.EMAIL_FROM || process.env.FROM_EMAIL || "noreply@intellishieldx.ai";
  const fromName = process.env.EMAIL_FROM_NAME || "IntelliShieldX";
  // Support SMTP_SECURE if provided, otherwise use port-based detection
  const smtpSecure = process.env.SMTP_SECURE 
    ? process.env.SMTP_SECURE.toLowerCase() === "true" || process.env.SMTP_SECURE === "1"
    : smtpPort === 465;

  if (!smtpHost || !smtpUser || !smtpPass) {
    if (!silent) {
      console.warn("⚠️  Email service not configured. Email notifications will be disabled.");
      console.warn("   Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and EMAIL_FROM in .env");
      console.warn(`   Current values: SMTP_HOST=${smtpHost ? "set" : "missing"}, SMTP_USER=${smtpUser ? "set" : "missing"}, SMTP_PASS=${smtpPass ? "set" : "missing"}`);
    }
    return false;
  }

  try {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    if (!silent) {
      console.log(`✅ Email service initialized (${smtpHost}:${smtpPort}, from: ${fromName} <${fromEmail}>)`);
    }
    return true;
  } catch (error) {
    if (!silent) {
      console.error("❌ Failed to initialize email service:", error.message);
    }
    return false;
  }
};

// Initialize on module load silently (will be re-initialized after dotenv.config() in index.js)
let isEmailConfigured = initializeEmailService(true); // Silent initial check

// Wrapper to update isEmailConfigured when re-initializing (with logging)
const reinitializeEmailService = () => {
  const result = initializeEmailService(false); // Show logs on re-initialization
  isEmailConfigured = result;
  return result;
};

/**
 * Send email
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  if (!isEmailConfigured || !transporter) {
    console.warn(`Email not sent to ${to}: Email service not configured`);
    return false;
  }

  // Support both EMAIL_FROM and FROM_EMAIL for backward compatibility
  // Prioritize EMAIL_FROM over SMTP_USER to avoid using the SMTP account email
  const fromEmail = process.env.EMAIL_FROM || process.env.FROM_EMAIL || "noreply@intellishieldx.ai";
  const fromName = process.env.EMAIL_FROM_NAME || "IntelliShieldX";

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ""), // Strip HTML for text version
    });

    console.log(`✅ Email sent to ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
    return false;
  }
};

/**
 * Send welcome email to new user
 */
export const sendWelcomeEmail = async (email, name) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to IntelliShieldX! 🎉</h1>
        </div>
        <div class="content">
          <p>Hi ${name},</p>
          <p>Thank you for joining IntelliShieldX! We're excited to have you on board.</p>
          <p>Your account has been successfully created. You can now:</p>
          <ul>
            <li>Start scanning your code for security vulnerabilities</li>
            <li>Get AI-powered remediation suggestions</li>
            <li>Generate comprehensive security reports</li>
            <li>Connect your GitHub repositories for automated scanning</li>
          </ul>
          <p style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/dashboard" class="button">Get Started</a>
          </p>
          <p>If you have any questions, feel free to reach out to our support team.</p>
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
    subject: "Welcome to IntelliShieldX! 🎉",
    html,
  });
};

/**
 * Send subscription confirmation email
 */
export const sendSubscriptionEmail = async (email, name, plan, amount, endDate) => {
  const planNames = {
    standard: "Standard",
    pro: "Pro",
    enterprise: "Enterprise",
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-row:last-child { border-bottom: none; }
        .button { display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Subscription Activated! ✅</h1>
        </div>
        <div class="content">
          <p>Hi ${name},</p>
          <p>Your subscription to the <strong>${planNames[plan] || plan}</strong> plan has been successfully activated!</p>
          <div class="details">
            <div class="detail-row">
              <span><strong>Plan:</strong></span>
              <span>${planNames[plan] || plan}</span>
            </div>
            <div class="detail-row">
              <span><strong>Amount Paid:</strong></span>
              <span>₹${amount.toLocaleString()}</span>
            </div>
            <div class="detail-row">
              <span><strong>Valid Until:</strong></span>
              <span>${new Date(endDate).toLocaleDateString()}</span>
            </div>
          </div>
          <p style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/profile?tab=subscription" class="button">View Subscription</a>
          </p>
          <p>Thank you for choosing IntelliShieldX!</p>
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
    subject: `Subscription Activated - ${planNames[plan] || plan} Plan`,
    html,
  });
};

/**
 * Send subscription cancellation email
 */
export const sendCancellationEmail = async (email, name, plan, refundAmount, refundId, bankReferenceNumber) => {
  const planNames = {
    standard: "Standard",
    pro: "Pro",
    enterprise: "Enterprise",
  };

  const refundSection = refundAmount ? `
    <div class="details">
      <h3>Refund Details</h3>
      <div class="detail-row">
        <span><strong>Refund Amount:</strong></span>
        <span>₹${refundAmount.toLocaleString()}</span>
      </div>
      ${refundId ? `
      <div class="detail-row">
        <span><strong>Refund ID:</strong></span>
        <span>${refundId}</span>
      </div>
      ` : ""}
      ${bankReferenceNumber ? `
      <div class="detail-row">
        <span><strong>Bank Reference Number:</strong></span>
        <span><strong>${bankReferenceNumber}</strong></span>
      </div>
      ` : ""}
      <p style="margin-top: 15px; color: #666; font-size: 14px;">
        ${bankReferenceNumber ? 
          `Please keep this bank reference number for your records. The refund will be processed to your original payment method within 5-7 business days.` :
          `Your refund will be processed to your original payment method within 5-7 business days.`
        }
      </p>
    </div>
  ` : "";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-row:last-child { border-bottom: none; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Subscription Cancelled</h1>
        </div>
        <div class="content">
          <p>Hi ${name},</p>
          <p>Your subscription to the <strong>${planNames[plan] || plan}</strong> plan has been cancelled.</p>
          ${refundSection}
          <p>We're sorry to see you go. If you have any feedback, please don't hesitate to reach out to us.</p>
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
    subject: "Subscription Cancelled - IntelliShieldX",
    html,
  });
};

/**
 * Generate a random password
 */
const generateRandomPassword = (length = 12) => {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  // Ensure at least one lowercase, one uppercase, one number, and one special character
  password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
  password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
  password += "0123456789"[Math.floor(Math.random() * 10)];
  password += "!@#$%^&*"[Math.floor(Math.random() * 8)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Shuffle the password
  return password.split("").sort(() => Math.random() - 0.5).join("");
};

/**
 * Send admin account creation email
 */
export const sendAdminCreationEmail = async (email, name, role, adminPanelUrl, generatedPassword, passwordExpiryHours = 24) => {
  const roleNames = {
    admin: "Admin",
    super_admin: "Super Admin",
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-row:last-child { border-bottom: none; }
        .button { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Admin Account Created</h1>
        </div>
        <div class="content">
          <p>Hi ${name},</p>
          <p>An admin account has been created for you on IntelliShieldX.</p>
          <div class="details">
            <h3>Account Details</h3>
            <div class="detail-row">
              <span><strong>Email:</strong></span>
              <span>${email}</span>
            </div>
            <div class="detail-row">
              <span><strong>Role:</strong></span>
              <span>${roleNames[role] || role}</span>
            </div>
          </div>
          ${generatedPassword ? `
          <div class="details" style="background: #fef3c7; border-left: 4px solid #f59e0b;">
            <h3 style="color: #92400e; margin-top: 0;">Your Temporary Password</h3>
            <p style="color: #92400e; margin-bottom: 10px;"><strong>⚠️ Important:</strong> Select the password below to reveal it. This password will expire in ${passwordExpiryHours} hours.</p>
            <div style="background: #000000; padding: 15px; border-radius: 5px; border: 2px solid #f59e0b;">
              <p style="font-size: 18px; font-weight: bold; color: #000000; font-family: monospace; text-align: center; letter-spacing: 2px; margin: 0; padding: 10px; user-select: all; -webkit-user-select: all; -moz-user-select: all; -ms-user-select: all; background: #000000;">
                ${generatedPassword}
              </p>
              <p style="font-size: 12px; color: #92400e; text-align: center; margin-top: 8px; margin-bottom: 0;">
                Select the text above to reveal password (valid for ${passwordExpiryHours} hours)
              </p>
            </div>
            <p style="color: #92400e; margin-top: 10px; margin-bottom: 0;"><strong>⚠️ Security Note:</strong> This password will expire in ${passwordExpiryHours} hours. Please change it immediately after your first login.</p>
          </div>
          ` : ""}
          <div class="warning">
            <p><strong>Important:</strong> Please log in to the admin panel and change your password immediately after your first login.</p>
          </div>
          <p>You can access the admin panel using the link below:</p>
          <div style="text-align: center;">
            <a href="${adminPanelUrl}" class="button">Access Admin Panel</a>
          </div>
          <p>If you have any questions or need assistance, please contact the system administrator.</p>
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
    subject: "Admin Account Created - IntelliShieldX",
    html,
  });
};

/**
 * Send plan change notification email
 */
export const sendPlanChangeEmail = async (email, name, oldPlan, newPlan, isUpgrade) => {
  const planNames = {
    free: "Free",
    standard: "Standard",
    pro: "Pro",
    enterprise: "Enterprise",
  };

  const changeType = isUpgrade ? "Upgraded" : "Changed";
  const headerColor = isUpgrade 
    ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" 
    : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${headerColor}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-row:last-child { border-bottom: none; }
        .plan-badge { display: inline-block; padding: 5px 15px; border-radius: 20px; font-weight: bold; }
        .old-plan { background: #e5e7eb; color: #6b7280; }
        .new-plan { background: ${isUpgrade ? "#d1fae5" : "#e0e7ff"}; color: ${isUpgrade ? "#065f46" : "#3730a3"}; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Plan ${changeType}</h1>
        </div>
        <div class="content">
          <p>Hi ${name},</p>
          <p>Your subscription plan has been ${changeType.toLowerCase()} by an administrator.</p>
          <div class="details">
            <h3>Plan Change Details</h3>
            <div class="detail-row">
              <span><strong>Previous Plan:</strong></span>
              <span class="plan-badge old-plan">${planNames[oldPlan] || oldPlan}</span>
            </div>
            <div class="detail-row">
              <span><strong>New Plan:</strong></span>
              <span class="plan-badge new-plan">${planNames[newPlan] || newPlan}</span>
            </div>
          </div>
          ${isUpgrade ? `
          <p><strong>Congratulations!</strong> You now have access to additional features and higher limits with your new plan.</p>
          <p>You can view your updated plan details and usage statistics in your profile settings.</p>
          ` : `
          <p>Your plan has been updated. Please check your profile to see the new limits and features available to you.</p>
          `}
          <p>If you have any questions about this change, please contact our support team.</p>
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
    subject: `Plan ${changeType} - IntelliShieldX`,
    html,
  });
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (email, name, resetLink) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 24px; background: #6366f1; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Reset Your Password</h1>
        </div>
        <div class="content">
          <p>Hi ${name},</p>
          <p>You requested to reset your password for your IntelliShieldX account.</p>
          <p style="text-align: center;">
            <a href="${resetLink}" class="button">Reset Password</a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #6366f1;">${resetLink}</p>
          <div class="warning">
            <strong>⚠️ Important:</strong> This link will expire in 1 hour. If you didn't request this password reset, please ignore this email.
          </div>
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
    subject: "Reset Your IntelliShieldX Password",
    html,
  });
};

/**
 * Send refund processed email
 */
export const sendRefundEmail = async (email, name, refundAmount, refundId, bankReferenceNumber) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-row:last-child { border-bottom: none; }
        .highlight { background: #d1fae5; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Refund Processed ✅</h1>
        </div>
        <div class="content">
          <p>Hi ${name},</p>
          <p>Your refund has been successfully processed!</p>
          <div class="details">
            <div class="detail-row">
              <span><strong>Refund Amount:</strong></span>
              <span>₹${refundAmount.toLocaleString()}</span>
            </div>
            ${refundId ? `
            <div class="detail-row">
              <span><strong>Refund ID:</strong></span>
              <span>${refundId}</span>
            </div>
            ` : ""}
            ${bankReferenceNumber ? `
            <div class="detail-row">
              <span><strong>Bank Reference Number:</strong></span>
              <span><strong style="color: #059669; font-size: 16px;">${bankReferenceNumber}</strong></span>
            </div>
            ` : ""}
          </div>
          ${bankReferenceNumber ? `
          <div class="highlight">
            <strong>📌 Important:</strong> Please save your bank reference number <strong>${bankReferenceNumber}</strong> for your records. 
            The refund will be credited to your original payment method within 5-7 business days.
          </div>
          ` : `
          <p>The refund will be credited to your original payment method within 5-7 business days.</p>
          `}
          <p>If you have any questions, please contact our support team.</p>
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
    subject: "Refund Processed - IntelliShieldX",
    html,
  });
};

export { initializeEmailService, reinitializeEmailService };

