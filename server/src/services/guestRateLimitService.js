import GuestRateLimit from "../models/GuestRateLimit.js";

const DAILY_LIMIT = 10;

/**
 * Get identifier from request (IP address + User-Agent hash)
 */
export const getGuestIdentifier = (req) => {
  // Get IP address (considering proxies)
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.headers["x-real-ip"] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    "unknown";

  // Get User-Agent for additional fingerprinting
  const userAgent = req.headers["user-agent"] || "";

  // Create a simple hash of IP + User-Agent
  // In production, you might want to use a more sophisticated fingerprinting
  const identifier = `${ip}-${userAgent.substring(0, 50)}`;

  return identifier;
};

/**
 * Check if guest can send a message
 */
export const checkGuestRateLimit = async (identifier) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Find or create rate limit record
    let rateLimit = await GuestRateLimit.findOne({ identifier });

    if (!rateLimit) {
      // First time user
      rateLimit = new GuestRateLimit({
        identifier,
        messageCount: 0,
        lastResetDate: today,
      });
      await rateLimit.save();
      return { allowed: true, remaining: DAILY_LIMIT };
    }

    // Check if we need to reset (new day)
    const lastReset = new Date(rateLimit.lastResetDate);
    if (lastReset < today) {
      // Reset for new day
      rateLimit.messageCount = 0;
      rateLimit.lastResetDate = today;
      await rateLimit.save();
      return { allowed: true, remaining: DAILY_LIMIT };
    }

    // Check if limit exceeded
    if (rateLimit.messageCount >= DAILY_LIMIT) {
      // Calculate time until reset (midnight)
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const hoursUntilReset = (tomorrow - now) / (1000 * 60 * 60);

      return {
        allowed: false,
        remaining: 0,
        limit: DAILY_LIMIT,
        resetIn: hoursUntilReset,
      };
    }

    return {
      allowed: true,
      remaining: DAILY_LIMIT - rateLimit.messageCount,
      limit: DAILY_LIMIT,
    };
  } catch (error) {
    console.error("Error checking guest rate limit:", error);
    // If database error, allow the request (fail open)
    return { allowed: true, remaining: DAILY_LIMIT };
  }
};

/**
 * Increment message count for guest
 */
export const incrementGuestMessageCount = async (identifier) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const rateLimit = await GuestRateLimit.findOne({ identifier });

    if (!rateLimit) {
      const newRateLimit = new GuestRateLimit({
        identifier,
        messageCount: 1,
        lastResetDate: today,
        lastMessageAt: now,
      });
      await newRateLimit.save();
      return;
    }

    // Reset if new day
    const lastReset = new Date(rateLimit.lastResetDate);
    if (lastReset < today) {
      rateLimit.messageCount = 1;
      rateLimit.lastResetDate = today;
    } else {
      rateLimit.messageCount += 1;
    }

    rateLimit.lastMessageAt = now;
    await rateLimit.save();
  } catch (error) {
    console.error("Error incrementing guest message count:", error);
    // Fail silently - don't block the request if rate limit tracking fails
  }
};

/**
 * Get remaining messages for guest
 */
export const getGuestRemainingMessages = async (identifier) => {
  try {
    const rateLimit = await GuestRateLimit.findOne({ identifier });

    if (!rateLimit) {
      return { remaining: DAILY_LIMIT, limit: DAILY_LIMIT };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastReset = new Date(rateLimit.lastResetDate);

    // If new day, reset
    if (lastReset < today) {
      return { remaining: DAILY_LIMIT, limit: DAILY_LIMIT };
    }

    return {
      remaining: Math.max(0, DAILY_LIMIT - rateLimit.messageCount),
      limit: DAILY_LIMIT,
    };
  } catch (error) {
    console.error("Error getting guest remaining messages:", error);
    // Return default if database error
    return { remaining: DAILY_LIMIT, limit: DAILY_LIMIT };
  }
};

