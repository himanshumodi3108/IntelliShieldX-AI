import express from "express";
import { authenticate } from "../middleware/auth.js";
import multer from "multer";
import axios from "axios";
import fs from "fs/promises";
import path from "path";
import Scan from "../models/Scan.js";
import User from "../models/User.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// All routes require authentication
router.use(authenticate);

const PYTHON_ENGINE_URL = process.env.PYTHON_ENGINE_URL || "http://localhost:5000";

// Upload files for scanning
router.post("/upload", upload.array("files"), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    // Check scan limits and deactivate subscription if needed
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const { getPlanLimits, checkAndDeactivateOnLimitReached } = await import("../services/razorpayService.js");
    const limits = await getPlanLimits(user.plan);
    
    // Check if limit is reached and deactivate subscription if needed
    const wasDeactivated = await checkAndDeactivateOnLimitReached(user, limits);
    
    // Refresh user data if subscription was deactivated
    if (wasDeactivated) {
      await user.populate("subscriptionId");
      const newLimits = await getPlanLimits(user.plan);
      Object.assign(limits, newLimits);
    }

    // Check if scan limit is reached
    const scanLimit = limits.scans !== Infinity ? limits.scans : user.usage.scansLimit;
    if ((user.usage.scans || 0) >= scanLimit) {
      return res.status(403).json({
        error: "Scan limit reached",
        message: `You have reached your scan limit (${scanLimit}). ${wasDeactivated ? "Your subscription has been deactivated. Please purchase a new plan to continue." : "Please upgrade your plan to continue."}`,
        subscriptionDeactivated: wasDeactivated,
      });
    }

    const scanId = "scan_" + Date.now();
    const scanStartTime = Date.now();
    const files = req.files.map((f) => ({
      name: f.originalname || f.filename || "unknown",
      originalname: f.originalname || f.filename || "unknown",
      path: f.path,
      size: f.size || 0,
    }));

    // Ensure we have at least one valid file
    if (files.length === 0 || !files[0].originalname) {
      return res.status(400).json({ error: "Invalid file upload" });
    }

    // Read file contents and send to AI engine for analysis
    const fileContents = await Promise.all(
      files.map(async (file) => {
        const content = await fs.readFile(file.path, "utf-8").catch(() => "");
        return {
          name: file.name,
          content: content,
          size: file.size,
        };
      })
    );

    // Call Python AI engine for security analysis
    try {
      const aiResponse = await axios.post(
        `${PYTHON_ENGINE_URL}/api/analyze/security`,
        {
          files: fileContents,
          scanId,
        },
        {
          timeout: 120000, // 2 minutes timeout for AI analysis
        }
      );

      const scanDuration = Math.round((Date.now() - scanStartTime) / 1000); // in seconds
      const vulnerabilities = aiResponse.data.vulnerabilities || [];
      
      // Validate and sanitize vulnerabilities before saving
      const sanitizedVulnerabilities = vulnerabilities.map((vuln) => {
        // Ensure line is a number or undefined/null
        let line = vuln.line;
        if (line !== undefined && line !== null) {
          // Try to parse as number
          const parsedLine = typeof line === "string" ? parseInt(line, 10) : Number(line);
          line = isNaN(parsedLine) ? undefined : parsedLine;
        } else {
          line = undefined;
        }
        
        return {
          ...vuln,
          line: line, // Will be undefined if not a valid number
        };
      });
      
      // Calculate OWASP Top 10 count
      const owaspTop10Count = sanitizedVulnerabilities.filter(
        (v) => v.owaspTop10 && v.owaspTop10 !== "N/A" && v.owaspTop10.startsWith("A")
      ).length;
      
      const summary = aiResponse.data.summary || { critical: 0, high: 0, medium: 0, low: 0 };
      summary.owaspTop10 = owaspTop10Count;

      // Determine target name before cleanup - ensure it's always a valid string
      const targetName = files.length === 1 
        ? (files[0].originalname || files[0].name || "file") 
        : `${files.length} files`;

      // Save scan to database
      const scan = new Scan({
        userId: req.user.userId,
        scanId,
        type: "file",
        target: targetName,
        targetDetails: {
          files: files.map((f) => f.originalname || f.name || "unknown"),
        },
        status: "completed",
        vulnerabilities: sanitizedVulnerabilities,
        summary,
        aiInsights: aiResponse.data.aiInsights || null,
        scanDuration,
        filesAnalyzed: files.length,
      });

      await scan.save();

      // Clean up uploaded files after successful save
      await Promise.all(files.map((f) => fs.unlink(f.path).catch(() => {})));

      // Update user scan count
      await User.findByIdAndUpdate(req.user.userId, {
        $inc: { "usage.scans": 1 },
      });

      res.json({
        scanId,
        message: "Files analyzed successfully",
        files: files.map((f) => f.name),
        vulnerabilities,
        summary,
        aiInsights: aiResponse.data.aiInsights || null,
      });
    } catch (aiError) {
      // Determine target name before cleanup - ensure it's always a valid string
      const targetName = files.length === 1 
        ? (files[0].originalname || files[0].name || "file") 
        : `${files.length} files`;

      // If AI engine is not available, return basic response
      if (aiError.code === "ECONNREFUSED" || aiError.response?.status >= 500) {
        console.error("AI engine not available:", aiError.message);
        // Save scan with error status
        const scan = new Scan({
          userId: req.user.userId,
          scanId,
          type: "file",
          target: targetName,
          targetDetails: {
            files: files.map((f) => f.originalname || f.name || "unknown"),
          },
          status: "failed",
          vulnerabilities: [],
          summary: { critical: 0, high: 0, medium: 0, low: 0 },
          error: "AI analysis service is not available",
          filesAnalyzed: files.length,
        });
        await scan.save();

        // Clean up uploaded files after saving error scan
        await Promise.all(files.map((f) => fs.unlink(f.path).catch(() => {})));

        res.json({
          scanId,
          message: "Files uploaded, but AI analysis is temporarily unavailable",
          files: files.map((f) => f.name),
          vulnerabilities: [],
          summary: { critical: 0, high: 0, medium: 0, low: 0 },
          aiInsights: null,
          warning: "AI analysis service is not available. Please ensure the Python AI engine is running.",
        });
      } else {
        throw aiError;
      }
    }
  } catch (error) {
    next(error);
  }
});

// Scan URL
router.post("/url", async (req, res, next) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: "Invalid URL format" });
    }

    const scanId = "scan_" + Date.now();
    const scanStartTime = Date.now();

    // Call Python AI engine for URL security analysis
    try {
      const aiResponse = await axios.post(
        `${PYTHON_ENGINE_URL}/api/analyze/url`,
        {
          url,
          scanId,
        },
        {
          timeout: 60000, // 1 minute timeout for URL analysis
        }
      );

      const scanDuration = Math.round((Date.now() - scanStartTime) / 1000); // in seconds
      const vulnerabilities = aiResponse.data.vulnerabilities || [];
      
      // Validate and sanitize vulnerabilities before saving
      const sanitizedVulnerabilities = vulnerabilities.map((vuln) => {
        // Ensure line is a number or undefined/null
        let line = vuln.line;
        if (line !== undefined && line !== null) {
          // Try to parse as number
          const parsedLine = typeof line === "string" ? parseInt(line, 10) : Number(line);
          line = isNaN(parsedLine) ? undefined : parsedLine;
        } else {
          line = undefined;
        }
        
        return {
          ...vuln,
          line: line, // Will be undefined if not a valid number
        };
      });
      
      // Calculate OWASP Top 10 count
      const owaspTop10Count = sanitizedVulnerabilities.filter(
        (v) => v.owaspTop10 && v.owaspTop10 !== "N/A" && v.owaspTop10.startsWith("A")
      ).length;
      
      const summary = aiResponse.data.summary || { critical: 0, high: 0, medium: 0, low: 0 };
      summary.owaspTop10 = owaspTop10Count;

      // Save scan to database
      const scan = new Scan({
        userId: req.user.userId,
        scanId,
        type: "url",
        target: url,
        targetDetails: {
          url,
        },
        status: "completed",
        vulnerabilities: sanitizedVulnerabilities,
        summary,
        aiInsights: aiResponse.data.aiInsights || null,
        scanDuration,
        filesAnalyzed: 0,
      });

      await scan.save();

      // Update user scan count
      await User.findByIdAndUpdate(req.user.userId, {
        $inc: { "usage.scans": 1 },
      });

      res.json({
        scanId,
        url,
        message: "URL analyzed successfully",
        vulnerabilities,
        summary,
        aiInsights: aiResponse.data.aiInsights || null,
        securityChecks: aiResponse.data.securityChecks || {},
      });
    } catch (aiError) {
      // If AI engine is not available, return basic response
      if (aiError.code === "ECONNREFUSED" || aiError.response?.status >= 500) {
        console.error("AI engine not available:", aiError.message);
        // Save scan with error status
        const scan = new Scan({
          userId: req.user.userId,
          scanId,
          type: "url",
          target: url,
          targetDetails: {
            url,
          },
          status: "failed",
          vulnerabilities: [],
          summary: { critical: 0, high: 0, medium: 0, low: 0 },
          error: "AI analysis service is not available",
          filesAnalyzed: 0,
        });
        await scan.save();

        res.json({
          scanId,
          url,
          message: "URL scan initiated, but AI analysis is temporarily unavailable",
          vulnerabilities: [],
          summary: { critical: 0, high: 0, medium: 0, low: 0 },
          aiInsights: null,
          securityChecks: {},
          warning: "AI analysis service is not available. Please ensure the Python AI engine is running.",
        });
      } else {
        throw aiError;
      }
    }
  } catch (error) {
    next(error);
  }
});

// Get all scans for user (scan history)
router.get("/", authenticate, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const type = req.query.type; // Optional filter by type: file, url, repository

    // Build query
    const query = {
      userId: req.user.userId,
    };

    if (type && ["file", "url", "repository"].includes(type)) {
      query.type = type;
    }

    if (search) {
      query.$or = [
        { target: { $regex: search, $options: "i" } },
        { scanId: { $regex: search, $options: "i" } },
      ];
    }

    // Get scans with pagination
    const scans = await Scan.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("scanId type target status summary createdAt scanDuration filesAnalyzed")
      .lean();

    const total = await Scan.countDocuments(query);

    // Format scans for response
    const formattedScans = scans.map((scan) => ({
      id: scan.scanId,
      type: scan.type,
      name: scan.target,
      date: scan.createdAt,
      status: scan.status,
      critical: scan.summary?.critical || 0,
      high: scan.summary?.high || 0,
      medium: scan.summary?.medium || 0,
      low: scan.summary?.low || 0,
      scanDuration: scan.scanDuration,
      filesAnalyzed: scan.filesAnalyzed || 0,
    }));

    res.json({
      scans: formattedScans,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get scan results by scanId
router.get("/:id", authenticate, async (req, res, next) => {
  try {
    const scan = await Scan.findOne({
      scanId: req.params.id,
      userId: req.user.userId,
    }).lean();

    if (!scan) {
      return res.status(404).json({ error: "Scan not found" });
    }

    res.json({
      scanId: scan.scanId,
      type: scan.type,
      target: scan.target,
      targetDetails: scan.targetDetails,
      status: scan.status,
      vulnerabilities: scan.vulnerabilities || [],
      summary: scan.summary || { critical: 0, high: 0, medium: 0, low: 0, owaspTop10: 0 },
      aiInsights: scan.aiInsights,
      scanDuration: scan.scanDuration,
      filesAnalyzed: scan.filesAnalyzed,
      createdAt: scan.createdAt,
      error: scan.error,
      chatMessages: scan.chatMessages || [],
    });
  } catch (error) {
    next(error);
  }
});

// Get scan chat messages
router.get("/:id/chat", authenticate, async (req, res, next) => {
  try {
    const scan = await Scan.findOne({
      scanId: req.params.id,
      userId: req.user.userId,
    }).select("chatMessages").lean();

    if (!scan) {
      return res.status(404).json({ error: "Scan not found" });
    }

    res.json({
      messages: scan.chatMessages || [],
    });
  } catch (error) {
    next(error);
  }
});

// Add chat message to scan
router.post("/:id/chat", authenticate, async (req, res, next) => {
  try {
    const { role, content } = req.body;

    if (!role || !content) {
      return res.status(400).json({ error: "Role and content are required" });
    }

    if (!["user", "assistant"].includes(role)) {
      return res.status(400).json({ error: "Invalid role. Must be 'user' or 'assistant'" });
    }

    const scan = await Scan.findOne({
      scanId: req.params.id,
      userId: req.user.userId,
    });

    if (!scan) {
      return res.status(404).json({ error: "Scan not found" });
    }

    scan.chatMessages.push({
      role,
      content,
      timestamp: new Date(),
    });

    await scan.save();

    res.json({
      message: "Chat message added successfully",
      messageId: scan.chatMessages[scan.chatMessages.length - 1]._id,
    });
  } catch (error) {
    next(error);
  }
});

// Update chat message in scan (for editing)
router.put("/:id/chat/:messageId", authenticate, async (req, res, next) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }

    const scan = await Scan.findOne({
      scanId: req.params.id,
      userId: req.user.userId,
    });

    if (!scan) {
      return res.status(404).json({ error: "Scan not found" });
    }

    const message = scan.chatMessages.id(req.params.messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Only allow editing user messages
    if (message.role !== "user") {
      return res.status(400).json({ error: "Only user messages can be edited" });
    }

    message.content = content;
    await scan.save();

    res.json({
      message: "Chat message updated successfully",
    });
  } catch (error) {
    next(error);
  }
});

// Delete chat messages from scan (for canceling/clearing)
router.delete("/:id/chat", authenticate, async (req, res, next) => {
  try {
    const { messageIds } = req.body; // Array of message IDs to delete

    const scan = await Scan.findOne({
      scanId: req.params.id,
      userId: req.user.userId,
    });

    if (!scan) {
      return res.status(404).json({ error: "Scan not found" });
    }

    if (messageIds && Array.isArray(messageIds)) {
      // Delete specific messages
      scan.chatMessages = scan.chatMessages.filter(
        (msg) => !messageIds.includes(msg._id.toString())
      );
    } else {
      // Delete all messages
      scan.chatMessages = [];
    }

    await scan.save();

    res.json({
      message: "Chat messages deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

// Delete a scan
router.delete("/:id", authenticate, async (req, res, next) => {
  try {
    const scan = await Scan.findOneAndDelete({
      scanId: req.params.id,
      userId: req.user.userId,
    });

    if (!scan) {
      return res.status(404).json({ error: "Scan not found" });
    }

    res.json({ message: "Scan deleted successfully" });
  } catch (error) {
    next(error);
  }
});

export default router;

