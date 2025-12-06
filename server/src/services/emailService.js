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

