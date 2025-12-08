import express from "express";
import { authenticateAdmin, requireSuperAdmin } from "../../middleware/adminAuth.js";
import { logAdminAction } from "../../services/adminLogService.js";
import Settings from "../../models/Settings.js";

const router = express.Router();

// Helper function to get settings from DB or fallback to env
const getSettings = async () => {
  try {
    const dbSettings = await Settings.find().lean();
    const settingsMap = {};
    
    dbSettings.forEach((setting) => {
      if (!settingsMap[setting.category]) {
        settingsMap[setting.category] = {};
      }
      settingsMap[setting.category][setting.key] = setting.value;
    });

    // Merge with env-based settings (env takes precedence for sensitive data)
    return {
      general: {
        siteName: settingsMap.general?.siteName || process.env.SITE_NAME || "IntelliShieldX",
        frontendUrl: settingsMap.general?.frontendUrl || process.env.FRONTEND_URL || "http://localhost:5173",
        backendUrl: settingsMap.general?.backendUrl || process.env.BACKEND_URL || "http://localhost:3001",
      },
      oauth: {
        google: {
          enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
          clientId: process.env.GOOGLE_CLIENT_ID ? "***configured***" : null,
        },
        microsoft: {
          enabled: !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET),
          clientId: process.env.MICROSOFT_CLIENT_ID ? "***configured***" : null,
        },
        zoho: {
          enabled: !!(process.env.ZOHO_CLIENT_ID && process.env.ZOHO_CLIENT_SECRET),
          clientId: process.env.ZOHO_CLIENT_ID ? "***configured***" : null,
        },
        github: {
          enabled: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
          clientId: process.env.GITHUB_CLIENT_ID ? "***configured***" : null,
        },
      },
      payments: {
        razorpay: {
          enabled: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
          keyId: process.env.RAZORPAY_KEY_ID ? "***configured***" : null,
        },
        gst: {
          enabled: settingsMap.payments?.gstEnabled !== undefined 
            ? settingsMap.payments.gstEnabled 
            : process.env.GST_ENABLED === "yes",
          rate: settingsMap.payments?.gstRate || parseFloat(process.env.GST_RATE) || 18,
        },
        transactionFee: {
          rate: settingsMap.payments?.transactionFeeRate || parseFloat(process.env.TRANSACTION_FEE_RATE) || 2,
        },
      },
      email: {
        enabled: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
        from: settingsMap.email?.from || process.env.EMAIL_FROM || process.env.FROM_EMAIL || "noreply@intellishieldx.ai",
        fromName: settingsMap.email?.fromName || process.env.EMAIL_FROM_NAME || "IntelliShieldX",
        smtpHost: process.env.SMTP_HOST ? "***configured***" : null,
        smtpPort: process.env.SMTP_PORT || 587,
      },
      features: {
        maintenanceMode: settingsMap.features?.maintenanceMode || false,
        registrationEnabled: settingsMap.features?.registrationEnabled !== undefined 
          ? settingsMap.features.registrationEnabled 
          : true,
        guestChatLimit: settingsMap.features?.guestChatLimit || 2,
      },
      threatIntelligence: {
        virusTotal: {
          enabled: settingsMap.threatIntelligence?.virusTotalEnabled !== undefined
            ? settingsMap.threatIntelligence.virusTotalEnabled
            : !!(process.env.VIRUSTOTAL_API_KEY && process.env.VIRUSTOTAL_API_KEY.trim() !== ""),
          configured: !!(process.env.VIRUSTOTAL_API_KEY && process.env.VIRUSTOTAL_API_KEY.trim() !== ""),
        },
        malwareBazaar: {
          enabled: settingsMap.threatIntelligence?.malwareBazaarEnabled !== undefined
            ? settingsMap.threatIntelligence.malwareBazaarEnabled
            : true, // Always available, works without key
          configured: !!(process.env.MALWAREBAZAAR_API_KEY && process.env.MALWAREBAZAAR_API_KEY.trim() !== ""),
        },
        urlhaus: {
          enabled: settingsMap.threatIntelligence?.urlhausEnabled !== undefined
            ? settingsMap.threatIntelligence.urlhausEnabled
            : true, // Always available, no key required
          configured: true,
        },
        hybridAnalysis: {
          enabled: settingsMap.threatIntelligence?.hybridAnalysisEnabled !== undefined
            ? settingsMap.threatIntelligence.hybridAnalysisEnabled
            : !!(process.env.HYBRID_ANALYSIS_API_KEY && process.env.HYBRID_ANALYSIS_API_KEY.trim() !== ""),
          configured: !!(process.env.HYBRID_ANALYSIS_API_KEY && process.env.HYBRID_ANALYSIS_API_KEY.trim() !== ""),
        },
        abuseIPDB: {
          enabled: settingsMap.threatIntelligence?.abuseIPDBEnabled !== undefined
            ? settingsMap.threatIntelligence.abuseIPDBEnabled
            : !!(process.env.ABUSEIPDB_API_KEY && process.env.ABUSEIPDB_API_KEY.trim() !== ""),
          configured: !!(process.env.ABUSEIPDB_API_KEY && process.env.ABUSEIPDB_API_KEY.trim() !== ""),
        },
        threatFox: {
          enabled: settingsMap.threatIntelligence?.threatFoxEnabled !== undefined
            ? settingsMap.threatIntelligence.threatFoxEnabled
            : true, // Always available, no key required
          configured: true,
        },
      },
    };
  } catch (error) {
    console.error("Error loading settings:", error);
    // Return default settings on error
    return {
      general: {
        siteName: "IntelliShieldX",
        frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
        backendUrl: process.env.BACKEND_URL || "http://localhost:3001",
      },
      oauth: {},
      payments: {
        gst: { enabled: false, rate: 18 },
        transactionFee: { rate: 2 },
      },
      email: {
        enabled: false,
        from: "noreply@intellishieldx.ai",
        fromName: "IntelliShieldX",
      },
      features: {
        maintenanceMode: false,
        registrationEnabled: true,
        guestChatLimit: 2,
      },
      threatIntelligence: {
        virusTotal: {
          enabled: !!(process.env.VIRUSTOTAL_API_KEY && process.env.VIRUSTOTAL_API_KEY.trim() !== ""),
          configured: !!(process.env.VIRUSTOTAL_API_KEY && process.env.VIRUSTOTAL_API_KEY.trim() !== ""),
        },
        malwareBazaar: {
          enabled: true,
          configured: !!(process.env.MALWAREBAZAAR_API_KEY && process.env.MALWAREBAZAAR_API_KEY.trim() !== ""),
        },
        urlhaus: {
          enabled: true,
          configured: true,
        },
        hybridAnalysis: {
          enabled: !!(process.env.HYBRID_ANALYSIS_API_KEY && process.env.HYBRID_ANALYSIS_API_KEY.trim() !== ""),
          configured: !!(process.env.HYBRID_ANALYSIS_API_KEY && process.env.HYBRID_ANALYSIS_API_KEY.trim() !== ""),
        },
        abuseIPDB: {
          enabled: !!(process.env.ABUSEIPDB_API_KEY && process.env.ABUSEIPDB_API_KEY.trim() !== ""),
          configured: !!(process.env.ABUSEIPDB_API_KEY && process.env.ABUSEIPDB_API_KEY.trim() !== ""),
        },
        threatFox: {
          enabled: true,
          configured: true,
        },
      },
    };
  }
};

// Get settings (read-only for all admins)
router.get("/", authenticateAdmin, async (req, res, next) => {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

// Update settings (super-admin only)
router.put("/", authenticateAdmin, requireSuperAdmin, async (req, res, next) => {
  try {
    const updates = req.body;
    const updatedSettings = [];

    // Update each setting
    for (const [category, categorySettings] of Object.entries(updates)) {
      if (typeof categorySettings !== "object" || categorySettings === null) continue;

      for (const [key, value] of Object.entries(categorySettings)) {
        // Skip sensitive OAuth/payment credentials (must be set via env)
        if (
          (category === "oauth" && (key === "clientId" || key === "clientSecret")) ||
          (category === "payments" && (key === "keyId" || key === "keySecret"))
        ) {
          continue;
        }

        // Update or create setting
        const setting = await Settings.findOneAndUpdate(
          { category, key },
          { 
            category, 
            key, 
            value,
            isEditable: true,
          },
          { upsert: true, new: true }
        );

        updatedSettings.push({ category, key, value: setting.value });
      }
    }

    // Log action
    await logAdminAction(
      req.admin.adminId,
      req.admin.email,
      "update_settings",
      "settings",
      null,
      { updatedSettings },
      req
    );

    // Return updated settings
    const settings = await getSettings();
    res.json({
      message: "Settings updated successfully",
      settings,
    });
  } catch (error) {
    next(error);
  }
});

// Update specific setting category
router.put("/:category", authenticateAdmin, requireSuperAdmin, async (req, res, next) => {
  try {
    const { category } = req.params;
    const updates = req.body;

    const updatedSettings = [];

    for (const [key, value] of Object.entries(updates)) {
      // Skip sensitive credentials
      if (key === "clientId" || key === "clientSecret" || key === "keyId" || key === "keySecret") {
        continue;
      }

    // Handle nested objects (e.g., gst: { enabled: true, rate: 18 })
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        const settingKey = `${key}${nestedKey.charAt(0).toUpperCase() + nestedKey.slice(1)}`;
        const setting = await Settings.findOneAndUpdate(
          { category, key: settingKey },
          { 
            category, 
            key: settingKey, 
            value: nestedValue,
            isEditable: true,
          },
          { upsert: true, new: true }
        );
        updatedSettings.push({ category, key: settingKey, value: setting.value });
      }
    } else {
      // Handle simple values
      const setting = await Settings.findOneAndUpdate(
        { category, key },
        { 
          category, 
          key, 
          value,
          isEditable: true,
        },
        { upsert: true, new: true }
      );
      updatedSettings.push({ category, key, value: setting.value });
    }
    
    // Clear pricing plan cache when payment settings change
    if (category === "payments") {
      // Clear cache in razorpayService
      const { clearPricingCache } = await import("../../services/razorpayService.js");
      if (clearPricingCache) {
        clearPricingCache();
      }
    }
    }

    await logAdminAction(
      req.admin.adminId,
      req.admin.email,
      "update_settings",
      "settings",
      category,
      { updatedSettings },
      req
    );

    const settings = await getSettings();
    res.json({
      message: "Settings updated successfully",
      settings,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

