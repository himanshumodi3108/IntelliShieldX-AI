import express from "express";
import { authenticate, optionalAuthenticate } from "../middleware/auth.js";
import Conversation from "../models/Conversation.js";
import User from "../models/User.js";
import { chatService } from "../services/chatService.js";
import { modelService } from "../services/modelService.js";
import {
  getGuestIdentifier,
  checkGuestRateLimit,
  incrementGuestMessageCount,
  getGuestRemainingMessages,
} from "../services/guestRateLimitService.js";

const router = express.Router();

// Get all conversations for user (requires auth)
router.get("/conversations", authenticate, async (req, res, next) => {
  try {
    const conversations = await Conversation.find({ userId: req.user.userId })
      .sort({ updatedAt: -1 })
      .select("title createdAt updatedAt messages")
      .lean();

    const formatted = conversations.map((conv) => ({
      id: conv._id.toString(),
      title: conv.title,
      timestamp: conv.createdAt,
      messageCount: conv.messages?.length || 0,
    }));

    res.json(formatted);
  } catch (error) {
    next(error);
  }
});

// Create new conversation (requires auth)
router.post("/conversations", authenticate, async (req, res, next) => {
  try {
    const conversation = new Conversation({
      userId: req.user.userId,
      title: "New Conversation",
      messages: [],
    });
    await conversation.save();

    res.status(201).json({ id: conversation._id.toString() });
  } catch (error) {
    next(error);
  }
});

// Get conversation messages (requires auth)
router.get("/conversations/:id/messages", authenticate, async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const messages = conversation.messages.map((msg) => ({
      id: msg._id.toString(),
      role: msg.role,
      content: msg.content,
      timestamp: msg.createdAt,
    }));

    res.json(messages);
  } catch (error) {
    next(error);
  }
});

// Send message (streaming) (requires auth)
router.post("/conversations/:id/messages", authenticate, async (req, res, next) => {
  try {
    const { content, modelId } = req.body;
    const conversationId = req.params.id;

    if (!content) {
      return res.status(400).json({ error: "Message content is required" });
    }

    // Find conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      userId: req.user.userId,
    });

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // Check and increment chat message usage
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get plan limits
    const { getPlanLimits, checkAndDeactivateOnLimitReached } = await import("../services/razorpayService.js");
    const limits = await getPlanLimits(user.plan);

    // Check if limit is reached and deactivate subscription if needed
    const wasDeactivated = await checkAndDeactivateOnLimitReached(user, limits);
    
    // Refresh user data if subscription was deactivated
    if (wasDeactivated) {
      await user.populate("subscriptionId");
    }

    // Check if user has reached their chat message limit
    const chatLimit = limits.chatMessages !== Infinity ? limits.chatMessages : user.usage.chatMessagesLimit;
    if (user.usage.chatMessages >= chatLimit) {
      return res.status(403).json({ 
        error: "Chat message limit reached. Your subscription has been deactivated. Please purchase a new plan to continue.",
        subscriptionDeactivated: wasDeactivated || true,
      });
    }

    // Increment chat message count
    user.usage.chatMessages = (user.usage.chatMessages || 0) + 1;
    await user.save();

    // Add user message
    conversation.messages.push({
      role: "user",
      content,
    });
    
    // Auto-name conversation from first question if it's still "New Conversation"
    if (conversation.title === "New Conversation" && conversation.messages.length === 1) {
      // Use first 50 characters of the first message as title
      const firstQuestion = content.trim();
      conversation.title = firstQuestion.length > 50 
        ? firstQuestion.slice(0, 50) + "..." 
        : firstQuestion || "New Conversation";
    }
    
    await conversation.save();

    // Set up streaming response
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Stream AI response
    let fullResponse = "";
    await chatService.streamResponse(
      content,
      modelId || "gpt-3.5-turbo",
      req.user.plan,
      (chunk) => {
        fullResponse += chunk;
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      },
      true // isAuthenticated = true for authenticated users
    );

    // Save assistant message
    conversation.messages.push({
      role: "assistant",
      content: fullResponse,
      modelId: modelId || "gpt-3.5-turbo",
    });
    await conversation.save();

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    next(error);
  }
});

// Update conversation title (requires auth)
router.put("/conversations/:id", authenticate, async (req, res, next) => {
  try {
    const { title } = req.body;
    
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return res.status(400).json({ error: "Title is required" });
    }

    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { title: title.trim() },
      { new: true }
    );

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    res.json({ message: "Conversation updated", title: conversation.title });
  } catch (error) {
    next(error);
  }
});

// Delete conversation
router.delete("/conversations/:id", authenticate, async (req, res, next) => {
  try {
    const result = await Conversation.deleteOne({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    res.json({ message: "Conversation deleted" });
  } catch (error) {
    next(error);
  }
});

// Guest Chat Routes (no authentication required)

// Get guest rate limit status
router.get("/guest/rate-limit", async (req, res, next) => {
  try {
    const identifier = getGuestIdentifier(req);
    const status = await getGuestRemainingMessages(identifier);
    res.json(status);
  } catch (error) {
    next(error);
  }
});

// Send guest message (with rate limiting)
router.post("/guest/message", async (req, res, next) => {
  try {
    const { content, modelId } = req.body;

    if (!content) {
      return res.status(400).json({ error: "Message content is required" });
    }

    // Check rate limit
    const identifier = getGuestIdentifier(req);
    const rateLimitCheck = await checkGuestRateLimit(identifier);

    if (!rateLimitCheck.allowed) {
      return res.status(429).json({
        error: "Rate limit exceeded",
        message: `You've reached the daily limit of ${rateLimitCheck.limit} messages. Please sign in for unlimited access.`,
        remaining: 0,
        limit: rateLimitCheck.limit,
        resetIn: rateLimitCheck.resetIn,
      });
    }

    // For unauthenticated users, only allow Groq models
    // Default to mixtral-8x7b if no modelId provided or if invalid model
    let guestModelId = modelId || "mixtral-8x7b";
    
    // Validate that the model is a Groq model
    const availableModels = await modelService.getAvailableModels("free", false);
    const selectedModel = availableModels.find(m => m.id === guestModelId);
    
    if (!selectedModel || selectedModel.provider !== "Groq") {
      // Force Groq model for unauthenticated users
      const groqModel = availableModels.find(m => m.provider === "Groq");
      guestModelId = groqModel ? groqModel.id : "mixtral-8x7b";
    }

    // Set up streaming response BEFORE incrementing (in case streaming fails)
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Disable buffering for nginx

    // Increment message count
    await incrementGuestMessageCount(identifier);

    // Stream AI response
    let fullResponse = "";
    try {
      await chatService.streamResponse(
        content,
        guestModelId,
        "free", // Guests always use free plan
        (chunk) => {
          try {
            fullResponse += chunk;
            res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
          } catch (writeError) {
            console.error("Error writing chunk:", writeError);
            // Connection might be closed, stop trying to write
          }
        },
        false // isAuthenticated = false for guest users
      );

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (streamError) {
      console.error("Error during streaming:", streamError);
      // Try to send error to client if connection is still open
      try {
        res.write(`data: ${JSON.stringify({ error: "Failed to get AI response. Please try again." })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();
      } catch (e) {
        // Connection already closed
      }
    }
  } catch (error) {
    console.error("Error in guest message endpoint:", error);
    // If headers haven't been sent, send JSON error
    if (!res.headersSent) {
      return res.status(500).json({
        error: "Internal server error",
        message: error.message || "Failed to process message",
      });
    }
    // Otherwise, try to send error via SSE
    try {
      res.write(`data: ${JSON.stringify({ error: error.message || "Failed to process message" })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (e) {
      // Connection already closed
    }
  }
});


export default router;

