import mongoose from "mongoose";

const scanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    scanId: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ["file", "url", "repository"],
      required: true,
    },
    target: {
      type: String,
      required: true, // File name, URL, or repository name
    },
    targetDetails: {
      files: [String], // For file scans
      url: String, // For URL scans
      repositoryId: mongoose.Schema.Types.ObjectId, // For repository scans
    },
    status: {
      type: String,
      enum: ["pending", "scanning", "completed", "failed"],
      default: "pending",
    },
    vulnerabilities: [
      {
        cwe: String,
        name: String,
        severity: {
          type: String,
          enum: ["critical", "high", "medium", "low"],
        },
        file: String,
        line: Number,
        description: String,
        originalCode: String, // Original vulnerable code snippet
        fixCode: String, // AI-generated secure code fix
        recommendation: String,
        owaspTop10: String, // OWASP Top 10 category (A01, A02, A03, etc.)
        complianceImpact: String, // Compliance frameworks affected (GDPR, HIPAA, PCI-DSS, SOC2, ISO27001, NIST, etc.)
      },
    ],
    summary: {
      critical: { type: Number, default: 0 },
      high: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      low: { type: Number, default: 0 },
      owaspTop10: { type: Number, default: 0 }, // Count of OWASP Top 10 vulnerabilities
    },
    aiInsights: String,
    scanDuration: Number, // in seconds
    filesAnalyzed: { type: Number, default: 0 },
    error: String,
    chatMessages: [
      {
        role: {
          type: String,
          enum: ["user", "assistant"],
          required: true,
        },
        content: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
scanSchema.index({ userId: 1, createdAt: -1 });
scanSchema.index({ userId: 1, "summary.critical": 1, "summary.high": 1 });
scanSchema.index({ createdAt: 1 }); // For trend analysis

export default mongoose.model("Scan", scanSchema);

