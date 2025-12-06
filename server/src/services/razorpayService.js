import Razorpay from "razorpay";
import crypto from "crypto";

// Initialize Razorpay only if credentials are available
let razorpay = null;
let isInitialized = false;

// Function to initialize Razorpay (called after env vars are loaded)
export function initializeRazorpay() {
  // Prevent multiple initializations
  if (isInitialized) {
    return razorpay !== null; // Return true if already initialized successfully
  }
  isInitialized = true;

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  
  if (keyId && keySecret && keyId.trim() !== "" && keySecret.trim() !== "") {
    try {
      razorpay = new Razorpay({
        key_id: keyId.trim(),
        key_secret: keySecret.trim(),
      });
      return true; // Success
    } catch (error) {
      console.error("❌ Failed to initialize Razorpay:", error.message);
      return false;
    }
  }
  return false; // Not configured
}

// Don't initialize immediately - let index.js handle it after env vars are loaded

// Get GST configuration from environment variables
// Read dynamically to ensure env vars are loaded
export const getGSTEnabled = () => {
  const gstEnabled = (process.env.GST_ENABLED || "no").toLowerCase().trim();
  return gstEnabled === "yes" || gstEnabled === "true" || gstEnabled === "1";
};

export const GST_ENABLED = getGSTEnabled();
export const GST_RATE = parseFloat(process.env.GST_RATE || "18") / 100; // Convert percentage to decimal (e.g., 18% = 0.18)

// Log GST configuration (will be called after dotenv.config() in index.js)
// Use setTimeout to ensure env vars are loaded
setTimeout(() => {
  const isEnabled = getGSTEnabled();
  if (isEnabled) {
    console.log(`✅ GST Enabled: ${(GST_RATE * 100).toFixed(0)}%`);
  } else {
    console.log("ℹ️  GST Disabled (set GST_ENABLED=yes in .env to enable)");
    console.log(`   Current GST_ENABLED value: "${process.env.GST_ENABLED || "not set"}"`);
  }
}, 100);

// Transaction fee rate (typically 2% for domestic cards, charged to customer)
export const TRANSACTION_FEE_RATE = parseFloat(process.env.TRANSACTION_FEE_RATE || "2") / 100; // Convert percentage to decimal

// Plan pricing (in paise - 1 INR = 100 paise) - Base prices before GST and fees
export const PLAN_PRICING = {
  standard: 49900, // ₹499
  pro: 99900, // ₹999
  enterprise: 499900, // ₹4,999
};

/**
 * Calculate GST amount from base price
 * @param {number} baseAmount - Base amount in paise
 * @returns {number} GST amount in paise (0 if GST is disabled)
 */
export const calculateGST = (baseAmount) => {
  // Check dynamically in case env var changed
  const isEnabled = getGSTEnabled();
  if (!isEnabled) {
    return 0;
  }
  return Math.round(baseAmount * GST_RATE);
};

/**
 * Calculate transaction fee amount
 * @param {number} amount - Amount in paise (after GST if applicable)
 * @returns {number} Transaction fee amount in paise
 */
export const calculateTransactionFee = (amount) => {
  return Math.round(amount * TRANSACTION_FEE_RATE);
};

/**
 * Calculate total amount including GST and transaction fee
 * @param {number} baseAmount - Base amount in paise
 * @returns {object} Object containing baseAmount, gstAmount, transactionFee, and totalAmount
 */
export const calculateTotalWithFees = (baseAmount) => {
  const gstAmount = calculateGST(baseAmount);
  const amountAfterGST = baseAmount + gstAmount;
  const transactionFee = calculateTransactionFee(amountAfterGST);
  const totalAmount = amountAfterGST + transactionFee;

  return {
    baseAmount,
    gstAmount,
    transactionFee,
    totalAmount,
  };
};

/**
 * Calculate total amount including GST (for backward compatibility)
 * @param {number} baseAmount - Base amount in paise
 * @returns {number} Total amount including GST in paise
 */
export const calculateTotalWithGST = (baseAmount) => {
  const fees = calculateTotalWithFees(baseAmount);
  return fees.totalAmount;
};

// Plan limits
export const PLAN_LIMITS = {
  free: {
    documentation: 1,
    repositories: 1,
    scans: 5,
    chatMessages: 100,
  },
  standard: {
    documentation: 10,
    repositories: 10,
    scans: 50,
    chatMessages: 1000,
  },
  pro: {
    documentation: 25,
    repositories: 25,
    scans: 200,
    chatMessages: 5000,
  },
  enterprise: {
    documentation: Infinity,
    repositories: Infinity,
    scans: Infinity,
    chatMessages: Infinity,
  },
};

/**
 * Create a Razorpay order
 */
export const createOrder = async (amount, currency = "INR", receipt = null) => {
  // Try to initialize if not already done
  if (!isInitialized) {
    initializeRazorpay();
  }
  
  if (!razorpay) {
    throw new Error("Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.");
  }
  try {
    // Razorpay receipt must be max 40 characters
    const receiptId = receipt || `sub_${Date.now()}`;
    const truncatedReceipt = receiptId.length > 40 ? receiptId.substring(0, 40) : receiptId;
    
    const options = {
      amount: amount, // Amount in paise
      currency: currency,
      receipt: truncatedReceipt,
      notes: {
        description: "IntelliShieldX Subscription",
      },
    };

    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    console.error("Razorpay order creation error:", error);
    
    // Preserve Razorpay error details for better error handling
    if (error.statusCode) {
      const razorpayError = new Error(error.error?.description || "Failed to create payment order");
      razorpayError.statusCode = error.statusCode;
      razorpayError.response = error;
      throw razorpayError;
    }
    
    throw new Error("Failed to create payment order");
  }
};

/**
 * Verify Razorpay payment signature
 */
export const verifyPayment = (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
  try {
    const text = `${razorpayOrderId}|${razorpayPaymentId}`;
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest("hex");

    return generatedSignature === razorpaySignature;
  } catch (error) {
    console.error("Payment verification error:", error);
    return false;
  }
};

/**
 * Create a refund
 */
export const createRefund = async (paymentId, amount = null) => {
  // Try to initialize if not already done
  if (!isInitialized) {
    initializeRazorpay();
  }
  
  if (!razorpay) {
    throw new Error("Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.");
  }

  if (!paymentId) {
    throw new Error("Payment ID is required for refund");
  }

  try {
    // First, verify the payment exists and get its details
    const payment = await razorpay.payments.fetch(paymentId);
    
    // Check if payment is already refunded
    if (payment.status === "refunded") {
      throw new Error("Payment has already been refunded");
    }

    // Check if payment is captured (only captured payments can be refunded)
    if (payment.status !== "captured") {
      throw new Error(`Payment status is "${payment.status}". Only captured payments can be refunded.`);
    }

    // Build refund options
    const options = {};
    if (amount) {
      // Validate amount doesn't exceed payment amount
      if (amount > payment.amount) {
        throw new Error(`Refund amount (${amount}) cannot exceed payment amount (${payment.amount})`);
      }
      options.amount = amount; // Amount in paise
    }

    // Create refund - payment_id should NOT be in options, it's the first parameter
    const refund = await razorpay.payments.refund(paymentId, options);
    return refund;
  } catch (error) {
    console.error("Razorpay refund error:", error);
    
    // Provide more specific error messages
    if (error.statusCode === 400) {
      if (error.error?.description) {
        throw new Error(`Refund failed: ${error.error.description}`);
      }
      throw new Error("Invalid refund request. Please check payment ID and amount.");
    } else if (error.statusCode === 404) {
      throw new Error("Payment not found. Please verify the payment ID.");
    } else if (error.message) {
      throw error; // Re-throw if it's already a formatted error
    }
    
    throw new Error("Failed to process refund. Please try again or contact support.");
  }
};

/**
 * Get payment details
 */
export const getPaymentDetails = async (paymentId) => {
  // Try to initialize if not already done
  if (!isInitialized) {
    initializeRazorpay();
  }
  
  if (!razorpay) {
    throw new Error("Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.");
  }
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    console.error("Error fetching payment details:", error);
    throw new Error("Failed to fetch payment details");
  }
};

/**
 * Check if subscription is active and not expired
 */
export const isSubscriptionActive = (subscription) => {
  if (!subscription) return false;
  if (subscription.status !== "active") return false;
  if (subscription.endDate && new Date() > new Date(subscription.endDate)) return false;
  return true;
};

/**
 * Check if user can cancel subscription (within 14 days and <15% usage)
 */
export const canCancelSubscription = (subscription, currentUsage, planLimits) => {
  if (!subscription || subscription.status !== "active") return false;
  
  // Check if within 14 days
  const daysSinceStart = Math.floor(
    (Date.now() - new Date(subscription.startDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSinceStart > 14) return false;

  // Check usage < 15%
  const usagePercentage = {
    documentation: (currentUsage.documentation / planLimits.documentation) * 100,
    scans: (currentUsage.scans / planLimits.scans) * 100,
    chatMessages: (currentUsage.chatMessages / planLimits.chatMessages) * 100,
  };

  // All usage must be < 15%
  return (
    usagePercentage.documentation < 15 &&
    usagePercentage.scans < 15 &&
    usagePercentage.chatMessages < 15
  );
};

export default razorpay;

