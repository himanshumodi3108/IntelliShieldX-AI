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
      enum: ["file", "url", "repository", "ip"],
      required: true,
    },
    target: {
      type: String,
      required: true, // File name, URL, repository name, or IP address
    },
    targetDetails: {
      files: [String], // For file scans
      url: String, // For URL scans
      repositoryId: mongoose.Schema.Types.ObjectId, // For repository scans
      ip: String, // For IP scans
    },
    status: {
      type: String,
      enum: ["pending", "scanning", "completed", "failed"],
      default: "pending",
    },
    deleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
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
    threatIntelligenceInsights: String, // AI-generated insights for threat intelligence analysis
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
    // Threat Intelligence Results
    threatIntelligence: {
      // File Hashes
      hashes: {
        md5: String,
        sha1: String,
        sha256: String,
      },
      // VirusTotal Results
      virusTotal: {
        scanned: { type: Boolean, default: false },
        found: { type: Boolean, default: false },
        positives: Number,
        total: Number,
        detectionRate: Number,
        scanDate: Date,
        permalink: String,
        engines: mongoose.Schema.Types.Mixed,
        status: { type: String, enum: ["malicious", "suspicious", "clean", "unknown"] },
        tags: [String], // Threat categories/tags from VirusTotal
        typeDescription: String, // File type description (e.g., "PE32 executable")
        meaningfulName: String, // Meaningful file name
        error: String,
      },
      // MalwareBazaar Results
      malwareBazaar: {
        scanned: { type: Boolean, default: false },
        found: { type: Boolean, default: false },
        malwareType: String, // Alias for fileType (backward compatibility)
        fileType: String, // File type (e.g., "exe", "elf", "jar")
        fileTypeMime: String, // MIME type (e.g., "application/x-dosexec")
        signature: String, // Malware signature/family name
        malwareFamily: String, // Computed malware family (signature or tag)
        firstSeen: Date,
        lastSeen: Date,
        fileSize: Number,
        tags: [String],
        threatLevel: { type: String, enum: ["critical", "high", "medium", "low"] },
        error: String,
      },
      // URLhaus Results
      urlhaus: {
        scanned: { type: Boolean, default: false },
        found: { type: Boolean, default: false },
        status: { type: String, enum: ["malicious", "suspicious", "clean", "unknown"] },
        threat: String,
        tags: [String],
        dateAdded: Date,
        urlStatus: String,
        threatLevel: { type: String, enum: ["critical", "high", "medium", "low"] },
        error: String,
      },
      // Hybrid Analysis Results
      hybridAnalysis: {
        scanned: { type: Boolean, default: false },
        found: { type: Boolean, default: false },
        threatScore: Number,
        verdict: String,
        malwareFamily: String,
        submitName: String,
        analysisStartTime: Date,
        environmentId: Number,
        environmentDescription: String,
        threatLevel: { type: String, enum: ["critical", "high", "medium", "low"] },
        error: String,
      },
      // AbuseIPDB Results
      abuseIPDB: {
        scanned: { type: Boolean, default: false },
        ip: String,
        abuseConfidence: Number,
        usageType: String,
        isp: String,
        countryCode: String,
        isWhitelisted: Boolean,
        totalReports: Number,
        status: { type: String, enum: ["malicious", "suspicious", "clean", "unknown"] },
        threatLevel: { type: String, enum: ["critical", "high", "medium", "low"] },
        error: String,
      },
      // ThreatFox Results
      threatFox: {
        scanned: { type: Boolean, default: false },
        found: { type: Boolean, default: false },
        ioc: String,
        iocType: String,
        threatType: String,
        malware: String,
        malwareFamily: String,
        firstSeen: Date,
        lastSeen: Date,
        reporter: String,
        confidenceLevel: Number,
        tags: [String],
        threatLevel: { type: String, enum: ["critical", "high", "medium", "low"] },
        error: String,
      },
    },
    // Overall Security Assessment
    overallSecurity: {
      status: { type: String, enum: ["critical", "high", "medium", "low", "safe"], default: "safe" },
      score: { type: Number, default: 100, min: 0, max: 100 },
      summary: String,
      // Support both string (backward compatibility) and object formats
      // Objects can have: title, type, severity, symptoms, removalSteps, prevention, description, impact, malwareFamily, etc.
      recommendations: [mongoose.Schema.Types.Mixed],
    },
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

