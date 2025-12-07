import express from "express";
import { optionalAuthenticate } from "../middleware/auth.js";
import User from "../models/User.js";
import Conversation from "../models/Conversation.js";
import Repository from "../models/Repository.js";
import Scan from "../models/Scan.js";

const router = express.Router();

// Dashboard stats endpoint - accessible to both authenticated and unauthenticated users
router.get("/stats", optionalAuthenticate, async (req, res, next) => {
  try {
    if (!req.user) {
      // Return demo data for unauthenticated users
      const demoSeverityBreakdown = {
        critical: 3,
        high: 8,
        medium: 15,
        low: 24,
      };
      
      // Generate demo vulnerability trend (last 7 days)
      const demoTrend = [];
      const baseValues = { critical: 2, high: 6, medium: 12, low: 20 };
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const dateKey = date.toISOString().split("T")[0];
        // Add some variation to make it look realistic
        const variation = Math.random() * 0.3 + 0.85; // 85-115% variation
        demoTrend.push({
          date: dateKey,
          critical: Math.round(baseValues.critical * variation),
          high: Math.round(baseValues.high * variation),
          medium: Math.round(baseValues.medium * variation),
          low: Math.round(baseValues.low * variation),
        });
      }

      return res.json({
        totalScans: 12,
        activeVulnerabilities: 50,
        filesAnalyzed: 45,
        avgScanTime: 8,
        totalChatMessages: 23,
        connectedRepositories: 2,
        severityBreakdown: demoSeverityBreakdown,
        recentScans: [
          {
            id: "demo-1",
            name: "auth-service.js",
            type: "file",
            date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            critical: 1,
            high: 2,
            medium: 3,
            low: 1,
          },
          {
            id: "demo-2",
            name: "https://example.com/api",
            type: "url",
            date: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
            critical: 0,
            high: 1,
            medium: 4,
            low: 2,
          },
          {
            id: "demo-3",
            name: "payment-gateway.py",
            type: "file",
            date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            critical: 2,
            high: 4,
            medium: 6,
            low: 3,
          },
        ],
        vulnerabilityTrend: demoTrend,
        isDemo: true,
      });
    }

    // Get user's actual data
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get scan statistics from actual Scan model
    const totalScans = await Scan.countDocuments({
      userId: req.user.userId,
      status: "completed",
    });

    const totalChatMessages = user.usage?.chatMessages || 0;

    // Get repository count
    const repositoryCount = await Repository.countDocuments({
      userId: req.user.userId,
      isActive: true,
    });

    // Calculate severity breakdown from actual scans
    const scans = await Scan.find({
      userId: req.user.userId,
      status: "completed",
    }).select("summary filesAnalyzed scanDuration").lean();

    const severityBreakdown = scans.reduce(
      (acc, scan) => {
        acc.critical += scan.summary?.critical || 0;
        acc.high += scan.summary?.high || 0;
        acc.medium += scan.summary?.medium || 0;
        acc.low += scan.summary?.low || 0;
        return acc;
      },
      { critical: 0, high: 0, medium: 0, low: 0 }
    );

    const activeVulnerabilities =
      severityBreakdown.critical +
      severityBreakdown.high +
      severityBreakdown.medium +
      severityBreakdown.low;

    // Calculate total files analyzed
    const filesAnalyzed = scans.reduce((sum, scan) => sum + (scan.filesAnalyzed || 0), 0);

    // Calculate average scan time
    const scansWithDuration = scans.filter((s) => s.scanDuration);
    const avgScanTime =
      scansWithDuration.length > 0
        ? Math.round(
            scansWithDuration.reduce((sum, s) => sum + (s.scanDuration || 0), 0) /
              scansWithDuration.length
          )
        : 0;

    // Get recent scans
    const recentScansData = await Scan.find({
      userId: req.user.userId,
      status: "completed",
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("scanId target type summary createdAt")
      .lean();

    const recentScans = recentScansData.map((scan) => ({
      id: scan.scanId,
      name: scan.target,
      type: scan.type,
      date: scan.createdAt,
      critical: scan.summary?.critical || 0,
      high: scan.summary?.high || 0,
      medium: scan.summary?.medium || 0,
      low: scan.summary?.low || 0,
    }));

    // Generate vulnerability trend from actual scan data (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const recentScansForTrend = await Scan.find({
      userId: req.user.userId,
      status: "completed",
      createdAt: { $gte: sevenDaysAgo },
    })
      .select("createdAt summary")
      .lean();

    // Group scans by date
    const trendByDate = {};

    // Initialize all 7 days with zeros
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateKey = date.toISOString().split("T")[0];
      trendByDate[dateKey] = { critical: 0, high: 0, medium: 0, low: 0 };
    }

    // Aggregate vulnerabilities by date
    recentScansForTrend.forEach((scan) => {
      const scanDate = new Date(scan.createdAt);
      scanDate.setHours(0, 0, 0, 0);
      const dateKey = scanDate.toISOString().split("T")[0];

      if (trendByDate[dateKey]) {
        trendByDate[dateKey].critical += scan.summary?.critical || 0;
        trendByDate[dateKey].high += scan.summary?.high || 0;
        trendByDate[dateKey].medium += scan.summary?.medium || 0;
        trendByDate[dateKey].low += scan.summary?.low || 0;
      }
    });

    // Convert to array format
    const vulnerabilityTrend = Object.entries(trendByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({
        date,
        ...counts,
      }));

    res.json({
      totalScans,
      activeVulnerabilities,
      filesAnalyzed,
      avgScanTime,
      totalChatMessages,
      connectedRepositories: repositoryCount,
      severityBreakdown,
      recentScans,
      vulnerabilityTrend,
      isDemo: false,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

