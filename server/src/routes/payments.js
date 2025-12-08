import express from "express";
import { authenticate } from "../middleware/auth.js";
import User from "../models/User.js";
import Subscription from "../models/Subscription.js";
import {
  createOrder,
  verifyPayment,
  createRefund,
  getPaymentDetails,
  PLAN_PRICING,
  PLAN_LIMITS,
  calculateGST,
  calculateTransactionFee,
  calculateTotalWithFees,
  calculateTotalWithGST,
  getGSTEnabled,
  canCancelSubscription,
  isSubscriptionActive,
  getPlanLimits,
  getPlanPricing,
  getGSTRate,
  getTransactionFeeRate,
} from "../services/razorpayService.js";
import {
  sendWelcomeEmail,
  sendSubscriptionEmail,
  sendCancellationEmail,
  sendRefundEmail,
} from "../services/emailService.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * Create payment order for plan upgrade/purchase
 */
router.post("/create-order", async (req, res, next) => {
  try {
    const { plan } = req.body;

    if (!plan || !["standard", "pro", "enterprise"].includes(plan)) {
      return res.status(400).json({ error: "Invalid plan selected" });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Plan hierarchy for upgrade comparison
    const PLAN_HIERARCHY = {
      free: 0,
      standard: 1,
      pro: 2,
      enterprise: 3,
    };

    // Check if user already has an active subscription
    // Allow purchasing if subscription is cancelled/deactivated (limit reached) or expired
    // Allow upgrades (higher tier plans) even with active subscription
    if (user.subscriptionId) {
      const existingSubscription = await Subscription.findById(user.subscriptionId);
      if (existingSubscription && isSubscriptionActive(existingSubscription)) {
        const currentPlanLevel = PLAN_HIERARCHY[user.plan] || 0;
        const newPlanLevel = PLAN_HIERARCHY[plan] || 0;
        
        // Block if trying to purchase same or lower plan
        if (newPlanLevel <= currentPlanLevel) {
          return res.status(400).json({
            error: "You already have an active subscription",
            message: "You can only upgrade to a higher tier plan. To change to a lower tier, please cancel your current subscription first.",
            currentPlan: user.plan,
            expiresAt: existingSubscription.endDate,
          });
        }
        // Allow upgrade - continue with order creation
      } else if (existingSubscription && (existingSubscription.status === "cancelled" || existingSubscription.status === "expired")) {
        // Allow purchasing new plan if subscription is cancelled or expired
        // Continue with order creation
      }
    }

    // Get pricing from database
    const baseAmount = await getPlanPricing(plan);
    if (!baseAmount || baseAmount === 0) {
      return res.status(400).json({ error: "Invalid plan pricing or plan not found" });
    }

    // Calculate GST, transaction fee, and total amount
    const fees = await calculateTotalWithFees(baseAmount);

    // Create Razorpay order (receipt must be max 40 chars for Razorpay)
    // Use a shorter format: sub_<shortUserId>_<timestamp>
    const shortUserId = user._id.toString().substring(0, 8);
    const timestamp = Date.now().toString().slice(-8); // Last 8 digits
    const receipt = `sub_${shortUserId}_${timestamp}`;
    
    try {
      const order = await createOrder(fees.totalAmount, "INR", receipt);

      res.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID,
        baseAmount: fees.baseAmount,
        gstAmount: fees.gstAmount,
        transactionFee: fees.transactionFee,
        totalAmount: fees.totalAmount,
        gstEnabled: getGSTEnabled(),
      });
    } catch (orderError) {
      console.error("Razorpay order creation error:", orderError);
      
      // Check if it's a Razorpay API error
      if (orderError.response?.status === 502 || orderError.message?.includes("502")) {
        return res.status(503).json({
          error: "Payment gateway temporarily unavailable",
          message: "Razorpay payment service is currently experiencing issues. Please try again in a few moments.",
        });
      }
      
      throw orderError; // Re-throw to be handled by error handler
    }
  } catch (error) {
    next(error);
  }
});

/**
 * Verify payment and activate subscription
 */
router.post("/verify-payment", async (req, res, next) => {
  try {
    const { orderId, paymentId, signature, plan } = req.body;

    if (!orderId || !paymentId || !signature || !plan) {
      return res.status(400).json({ error: "Missing payment details" });
    }

    // Verify payment signature
    const isValid = verifyPayment(orderId, paymentId, signature);
    if (!isValid) {
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    // Fetch actual payment details from Razorpay to get the exact amount paid
    const planBaseAmount = await getPlanPricing(plan);
    const fees = await calculateTotalWithFees(planBaseAmount);
    let actualAmount = fees.totalAmount; // Fallback to calculated total
    let baseAmount = fees.baseAmount;
    let gstAmount = fees.gstAmount;
    let transactionFee = fees.transactionFee;
    
    try {
      const paymentDetails = await getPaymentDetails(paymentId);
      if (paymentDetails && paymentDetails.amount) {
        actualAmount = paymentDetails.amount; // Total amount in paise (including GST and fees)
        
        // Reverse calculate: total = base + gst + fee
        // If GST is enabled: total = base + (base * gstRate) + ((base + base * gstRate) * feeRate)
        // Simplifying: total = base * (1 + gstRate) * (1 + feeRate)
        // So: base = total / ((1 + gstRate) * (1 + feeRate))
        // Get GST enabled status and rates dynamically
        const isGSTEnabled = getGSTEnabled();
        const gstRate = await getGSTRate();
        const feeRate = await getTransactionFeeRate();
        const gstMultiplier = isGSTEnabled ? (1 + gstRate) : 1;
        const feeMultiplier = 1 + feeRate;
        baseAmount = Math.round(actualAmount / (gstMultiplier * feeMultiplier));
        gstAmount = isGSTEnabled ? await calculateGST(baseAmount) : 0;
        const amountAfterGST = baseAmount + gstAmount;
        transactionFee = await calculateTransactionFee(amountAfterGST);
      }
    } catch (error) {
      console.warn("Failed to fetch payment details from Razorpay, using plan pricing:", error.message);
      // Continue with calculated amounts as fallback
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Calculate subscription end date (1 year from now)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    // Create or update subscription
    let subscription;
    if (user.subscriptionId) {
      subscription = await Subscription.findById(user.subscriptionId);
      if (subscription) {
        // Update existing subscription
        subscription.plan = plan;
        subscription.status = "active";
        subscription.startDate = startDate;
        subscription.endDate = endDate;
        subscription.razorpayOrderId = orderId;
        subscription.razorpayPaymentId = paymentId;
        subscription.razorpaySignature = signature;
        // Convert from paise to rupees for database storage (divide by 100)
        subscription.amount = actualAmount / 100; // Total amount including GST and transaction fee (in rupees)
        subscription.baseAmount = baseAmount / 100; // Base amount before GST and fees (in rupees)
        subscription.gstAmount = gstAmount / 100; // GST amount (in rupees)
        subscription.transactionFee = transactionFee / 100; // Transaction fee amount (in rupees)
        subscription.currency = "INR";
        subscription.cancelledAt = null;
        subscription.refundRequested = false;
        await subscription.save();
      }
    }

    if (!subscription) {
      // Create new subscription
      subscription = new Subscription({
        userId: user._id,
        plan,
        status: "active",
        startDate,
        endDate,
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
        // Convert from paise to rupees for database storage (divide by 100)
        amount: actualAmount / 100, // Total amount including GST and transaction fee (in rupees)
        baseAmount: baseAmount / 100, // Base amount before GST and fees (in rupees)
        gstAmount: gstAmount / 100, // GST amount (in rupees)
        transactionFee: transactionFee / 100, // Transaction fee amount (in rupees)
        currency: "INR",
      });
      await subscription.save();
    }

    // Update user plan and subscription details
    const limits = await getPlanLimits(plan);
    
    // Check if this is a renewal or upgrade
    // Renewal: User had an active subscription and is renewing/upgrading
    // Upgrade: User is moving to a higher tier plan
    const hadPreviousSubscription = !!user.subscriptionId;
    const isRenewal = hadPreviousSubscription && subscription._id.toString() === user.subscriptionId.toString();
    const isUpgrade = hadPreviousSubscription && user.plan !== plan;
    const shouldResetUsage = isRenewal || isUpgrade;
    
    user.plan = plan;
    user.subscriptionId = subscription._id;
    user.subscriptionStatus = "active";
    user.subscriptionExpiresAt = endDate;
    user.usage.documentationLimit = limits.documentation;
    user.usage.scansLimit = limits.scans;
    user.usage.chatMessagesLimit = limits.chatMessages;
    
    // Reset usage counts on renewal or upgrade (fresh quota for new subscription period)
    // Note: Dashboard analysis will still show actual real data from all scans (including deleted ones)
    // This is because scans are stored separately and not deleted, only marked as deleted
    if (shouldResetUsage) {
      user.usage.scans = 0;
      user.usage.chatMessages = 0;
      user.usage.documentation = 0;
      // Reset threat intelligence daily usage counts
      if (user.usage.threatIntelligence) {
        user.usage.threatIntelligence.virusTotal = 0;
        user.usage.threatIntelligence.hybridAnalysis = 0;
        user.usage.threatIntelligence.abuseIPDB = 0;
        user.usage.threatIntelligence.lastResetDate = new Date();
      }
      // Note: repositoryCount (maxRepositories) is NOT reset - it's a lifetime maximum for price-based model
    }
    
    await user.save();

    // Send subscription confirmation email
    try {
      await sendSubscriptionEmail(
        user.email,
        user.name,
        plan,
        actualAmount / 100, // Convert to rupees
        endDate
      );
    } catch (emailError) {
      console.error("Failed to send subscription email:", emailError);
      // Don't fail the request if email fails
    }

    res.json({
      message: "Subscription activated successfully",
      subscription: {
        id: subscription._id,
        plan: subscription.plan,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get current subscription details
 */
router.get("/subscription", async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).populate("subscriptionId");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.subscriptionId) {
      return res.json({
        plan: user.plan,
        status: "free",
        subscription: null,
      });
    }

    const subscription = user.subscriptionId;
    const isActive = isSubscriptionActive(subscription);

    // Get repository count
    const Repository = (await import("../models/Repository.js")).default;
    const repositoryCount = await Repository.countDocuments({ userId: user._id, isActive: true });

    const limits = await getPlanLimits(user.plan);

    res.json({
      plan: user.plan,
      status: isActive ? "active" : subscription.status,
      subscription: {
        id: subscription._id,
        plan: subscription.plan,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        amount: subscription.amount,
        baseAmount: subscription.baseAmount,
        gstAmount: subscription.gstAmount,
        transactionFee: subscription.transactionFee,
        cancelledAt: subscription.cancelledAt,
        refundRequested: subscription.refundRequested,
        refundedAt: subscription.refundedAt,
        refundAmount: subscription.refundAmount,
        refundId: subscription.refundId,
        bankReferenceNumber: subscription.bankReferenceNumber,
        refundError: subscription.refundError,
        cancellationReason: subscription.cancellationReason,
      },
      usage: {
        ...user.usage,
        repositories: repositoryCount, // Current active count for display
        maxRepositories: user.usage.repositoryCount || 0, // Maximum ever connected (for limit checking)
        threatIntelligence: user.usage.threatIntelligence || {
          virusTotal: 0,
          hybridAnalysis: 0,
          abuseIPDB: 0,
        },
      },
      limits: {
        ...limits,
        repositories: limits.repositories || Infinity,
        threatIntelligence: limits.threatIntelligence || {
          virusTotal: 0,
          hybridAnalysis: 0,
          abuseIPDB: 0,
          malwareBazaar: false,
          urlhaus: false,
          threatFox: false,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get purchase history (all subscriptions for user)
 */
router.get("/purchase-history", async (req, res, next) => {
  try {
    const subscriptions = await Subscription.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .lean();

    const history = subscriptions.map((sub) => ({
      id: sub._id.toString(),
      plan: sub.plan,
      status: sub.status,
      startDate: sub.startDate,
      endDate: sub.endDate,
      amount: sub.amount,
      baseAmount: sub.baseAmount,
      gstAmount: sub.gstAmount,
      transactionFee: sub.transactionFee,
      cancelledAt: sub.cancelledAt,
      refundedAt: sub.refundedAt,
      refundAmount: sub.refundAmount,
      refundId: sub.refundId,
      bankReferenceNumber: sub.bankReferenceNumber,
      cancellationReason: sub.cancellationReason,
      createdAt: sub.createdAt,
    }));

    res.json({ history });
  } catch (error) {
    next(error);
  }
});

/**
 * Cancel subscription and request refund (if eligible)
 */
router.post("/cancel-subscription", async (req, res, next) => {
  try {
    const { reason } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.subscriptionId) {
      return res.status(400).json({ error: "No active subscription found" });
    }

    const subscription = await Subscription.findById(user.subscriptionId);
    if (!subscription) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    if (subscription.status !== "active") {
      return res.status(400).json({ error: "Subscription is not active" });
    }

    // Check if cancellation is allowed
    const planLimits = await getPlanLimits(subscription.plan);
    const canCancel = canCancelSubscription(
      subscription,
      {
        documentation: user.usage.documentation,
        scans: user.usage.scans,
        chatMessages: user.usage.chatMessages,
      },
      planLimits
    );

    if (!canCancel) {
      return res.status(403).json({
        error: "Cancellation not eligible",
        message: "Cancellation is only available within 14 days of purchase and if usage is less than 15%",
      });
    }

    // Save usage at cancellation
    subscription.usageAtCancellation = {
      documentation: user.usage.documentation,
      scans: user.usage.scans,
      chatMessages: user.usage.chatMessages,
    };
    subscription.cancelledAt = new Date();
    subscription.cancellationReason = reason || "User requested cancellation";
    subscription.status = "cancelled";
    subscription.refundRequested = true;

    // Process refund
    try {
      if (!subscription.razorpayPaymentId) {
        throw new Error("Payment ID not found for this subscription");
      }

      const refund = await createRefund(subscription.razorpayPaymentId);
      subscription.refundId = refund.id;
      // Convert from paise to rupees for database storage (divide by 100)
      subscription.refundAmount = refund.amount / 100;
      subscription.refundedAt = new Date();
      subscription.status = "refunded";
      // Extract bank reference number from Razorpay refund response
      // Razorpay may provide it in acquirer_data.rrn or notes
      subscription.bankReferenceNumber = refund.acquirer_data?.rrn || refund.notes?.bank_reference_number || refund.notes?.reference_number || null;
      console.log(`✅ Refund processed successfully: ${refund.id} for payment ${subscription.razorpayPaymentId}`);
      
      // Send refund confirmation email
      try {
        await sendRefundEmail(
          user.email,
          user.name,
          subscription.refundAmount,
          subscription.refundId,
          subscription.bankReferenceNumber
        );
      } catch (emailError) {
        console.error("Failed to send refund email:", emailError);
        // Don't fail the request if email fails
      }
    } catch (refundError) {
      console.error("Refund error:", refundError);
      // Mark as refund requested but failed - admin can process manually
      subscription.refundRequested = true;
      subscription.refundError = refundError.message || "Refund processing failed";
      // Continue with cancellation even if refund fails (admin can process manually)
    }

    await subscription.save();

    // Send cancellation email if refund was not processed
    if (subscription.status !== "refunded") {
      try {
        await sendCancellationEmail(
          user.email,
          user.name,
          subscription.plan,
          null, // No refund amount
          null, // No refund ID
          null  // No bank reference number
        );
      } catch (emailError) {
        console.error("Failed to send cancellation email:", emailError);
        // Don't fail the request if email fails
      }
    }

    // Downgrade user to free plan
    const freeLimits = await getPlanLimits("free");
    user.plan = "free";
    user.subscriptionStatus = "cancelled";
    user.subscriptionExpiresAt = null;
    user.usage.documentationLimit = freeLimits.documentation;
    user.usage.scansLimit = freeLimits.scans;
    user.usage.chatMessagesLimit = freeLimits.chatMessages;
    await user.save();

    res.json({
      message: subscription.status === "refunded" 
        ? "Subscription cancelled and refund processed successfully"
        : subscription.refundRequested && !subscription.refundId
        ? "Subscription cancelled. Refund processing failed and will be handled manually."
        : "Subscription cancelled successfully",
      subscription: {
        plan: subscription.plan,
        status: subscription.status,
        cancelledAt: subscription.cancelledAt,
        refunded: subscription.status === "refunded",
        refundId: subscription.refundId,
        refundRequested: subscription.refundRequested,
        refundError: subscription.refundError,
        refundAmount: subscription.refundAmount,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Check subscription expiration (cron job endpoint or manual check)
 */
router.post("/check-expiration", async (req, res, next) => {
  try {
    const now = new Date();
    const expiredSubscriptions = await Subscription.find({
      status: "active",
      endDate: { $lt: now },
    });

    for (const subscription of expiredSubscriptions) {
      subscription.status = "expired";
      await subscription.save();

      const user = await User.findById(subscription.userId);
      if (user) {
        // Downgrade to free plan
        const freeLimits = await getPlanLimits("free");
        user.plan = "free";
        user.subscriptionStatus = "expired";
        user.subscriptionExpiresAt = null;
        user.usage.documentationLimit = freeLimits.documentation;
        user.usage.scansLimit = freeLimits.scans;
        user.usage.chatMessagesLimit = freeLimits.chatMessages;
        await user.save();
      }
    }

    res.json({
      message: "Expiration check completed",
      expired: expiredSubscriptions.length,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

