// Load environment variables FIRST before any other imports
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { connectDB } from "./config/database.js";
import { errorHandler } from "./middleware/errorHandler.js";

// Routes
import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";
import modelRoutes from "./routes/models.js";
import scanRoutes from "./routes/scan.js";
import userRoutes from "./routes/user.js";
import repositoryRoutes from "./routes/repositories.js";
import dashboardRoutes from "./routes/dashboard.js";
import documentationRoutes from "./routes/documentation.js";
import paymentRoutes from "./routes/payments.js";
import { initializeRazorpay } from "./services/razorpayService.js";
import { reinitializeEmailService } from "./services/emailService.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy to get real IP address (important for rate limiting)
app.set("trust proxy", true);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/models", modelRoutes);
app.use("/api/scan", scanRoutes);
app.use("/api/user", userRoutes);
app.use("/api/repositories", repositoryRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/documentation", documentationRoutes);
app.use("/api/payments", paymentRoutes);

// Error handling
app.use(errorHandler);

// Connect to database and start server
connectDB()
  .then(() => {
    // Verify JWT_SECRET is loaded
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "your-secret-key") {
      console.warn("⚠️  WARNING: JWT_SECRET is not set or using default value. This may cause authentication issues!");
      console.warn("   Please set JWT_SECRET in your .env file.");
    } else {
      console.log("✅ JWT_SECRET is configured");
    }

    // Initialize Razorpay after everything is loaded
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const hasRazorpayKey = keyId && keyId.trim() !== "";
    const hasRazorpaySecret = keySecret && keySecret.trim() !== "";
    
    if (hasRazorpayKey && hasRazorpaySecret) {
      const initialized = initializeRazorpay();
      if (initialized) {
        console.log("✅ Razorpay payment gateway initialized");
      }
    } else {
      console.warn("⚠️  Razorpay credentials not configured. Payment features will be disabled.");
      if (!hasRazorpayKey) console.warn("   - RAZORPAY_KEY_ID is missing or empty");
      if (!hasRazorpaySecret) console.warn("   - RAZORPAY_KEY_SECRET is missing or empty");
      console.warn("   Set these in your .env file in the server directory to enable payments");
    }

    // Initialize email service (re-initialize after env vars are loaded)
    const emailInitialized = reinitializeEmailService();
    if (!emailInitialized) {
      console.warn("⚠️  Email service initialization failed. Check your SMTP configuration in .env");
    }

    app.listen(PORT, () => {
      console.log(`🚀 IntelliShieldX Backend running on port ${PORT}`);
      console.log(`📡 API available at http://localhost:${PORT}/api`);
    });
  })
  .catch((error) => {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  });

export default app;

