import express from "express";
import { authenticate } from "../middleware/auth.js";
import ConnectedAccount from "../models/ConnectedAccount.js";
import Repository from "../models/Repository.js";
import User from "../models/User.js";
import Scan from "../models/Scan.js";
import {
  getGitHubRepositories,
  getConnectedGitHubAccount,
  getRepositoryContents,
  getRepositoryFileContent,
} from "../services/githubService.js";
import axios from "axios";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Repository limits based on plan
const REPOSITORY_LIMITS = {
  free: 1,
  standard: 10,
  pro: 25,
  enterprise: Infinity,
};

const DELETION_LIMITS = {
  free: 3,
  standard: Infinity,
  pro: Infinity,
  enterprise: Infinity,
};

/**
 * Connect GitHub account (for repository access)
 */
router.post("/connect/github", async (req, res, next) => {
  try {
    const { accessToken, providerAccountId, providerUsername, providerEmail, providerAvatar } = req.body;

    if (!accessToken || !providerAccountId || !providerUsername) {
      return res.status(400).json({ error: "Missing required GitHub account information" });
    }

    // Check if account is already connected
    const existing = await ConnectedAccount.findOne({
      userId: req.user.userId,
      provider: "github",
    });

    if (existing) {
      // Update existing connection
      existing.accessToken = accessToken;
      existing.providerAccountId = providerAccountId;
      existing.providerUsername = providerUsername;
      existing.providerEmail = providerEmail || existing.providerEmail;
      existing.providerAvatar = providerAvatar || existing.providerAvatar;
      existing.isActive = true;
      existing.scopes = ["repo", "read:user"];
      await existing.save();

      return res.json({
        message: "GitHub account reconnected successfully",
        account: {
          id: existing._id,
          provider: existing.provider,
          username: existing.providerUsername,
          email: existing.providerEmail,
        },
      });
    }

    // Create new connection
    const connectedAccount = new ConnectedAccount({
      userId: req.user.userId,
      provider: "github",
      providerAccountId,
      accessToken,
      providerUsername,
      providerEmail,
      providerAvatar,
      scopes: ["repo", "read:user"],
      isActive: true,
    });

    await connectedAccount.save();

    res.json({
      message: "GitHub account connected successfully",
      account: {
        id: connectedAccount._id,
        provider: connectedAccount.provider,
        username: connectedAccount.providerUsername,
        email: connectedAccount.providerEmail,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Disconnect GitHub account
 */
router.delete("/connect/github", async (req, res, next) => {
  try {
    const account = await ConnectedAccount.findOne({
      userId: req.user.userId,
      provider: "github",
    });

    if (!account) {
      return res.status(404).json({ error: "GitHub account not connected" });
    }

    // Delete all repositories associated with this account
    await Repository.deleteMany({
      userId: req.user.userId,
      connectedAccountId: account._id,
    });

    // Deactivate the account
    account.isActive = false;
    await account.save();

    res.json({ message: "GitHub account disconnected successfully" });
  } catch (error) {
    next(error);
  }
});

/**
 * Get connected accounts
 */
router.get("/accounts", async (req, res, next) => {
  try {
    const accounts = await ConnectedAccount.find({
      userId: req.user.userId,
      isActive: true,
    }).select("-accessToken -refreshToken");

    res.json(accounts);
  } catch (error) {
    next(error);
  }
});

/**
 * Get available repositories from GitHub
 */
router.get("/github/repositories", async (req, res, next) => {
  try {
    const account = await getConnectedGitHubAccount(req.user.userId);

    if (!account) {
      return res.status(404).json({ error: "GitHub account not connected" });
    }

    const repositories = await getGitHubRepositories(account.accessToken);
    res.json(repositories);
  } catch (error) {
    next(error);
  }
});

/**
 * Connect a repository
 */
router.post("/connect", async (req, res, next) => {
  try {
    const { provider, repositoryId, name, fullName, description, url, private: isPrivate, defaultBranch, language } = req.body;

    if (!provider || !repositoryId || !name || !fullName || !url) {
      return res.status(400).json({ error: "Missing required repository information" });
    }

    // Get user's current plan
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check repository limit
    const limit = REPOSITORY_LIMITS[user.plan] || 1;
    const currentCount = await Repository.countDocuments({
      userId: req.user.userId,
      isActive: true,
    });

    if (currentCount >= limit) {
      return res.status(403).json({
        error: `Repository limit reached. Your ${user.plan} plan allows ${limit === Infinity ? "unlimited" : limit} ${limit === 1 ? "repository" : "repositories"}.`,
      });
    }

    // Get connected account for this provider
    const account = await ConnectedAccount.findOne({
      userId: req.user.userId,
      provider,
      isActive: true,
    });

    if (!account) {
      return res.status(404).json({ error: `${provider} account not connected` });
    }

    // Check if repository is already connected
    const existing = await Repository.findOne({
      userId: req.user.userId,
      provider,
      repositoryId,
    });

    if (existing) {
      if (existing.isActive) {
        return res.status(400).json({ error: "Repository is already connected" });
      } else {
        // Reactivate existing repository
        existing.isActive = true;
        await existing.save();
        return res.json({
          message: "Repository reconnected successfully",
          repository: existing,
        });
      }
    }

    // Create new repository connection
    const repository = new Repository({
      userId: req.user.userId,
      connectedAccountId: account._id,
      provider,
      repositoryId,
      name,
      fullName,
      description,
      url,
      private: isPrivate,
      defaultBranch: defaultBranch || "main",
      language,
      isActive: true,
    });

    await repository.save();

    res.status(201).json({
      message: "Repository connected successfully",
      repository,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get user's connected repositories
 */
router.get("/", async (req, res, next) => {
  try {
    const repositories = await Repository.find({
      userId: req.user.userId,
      isActive: true,
    })
      .populate("connectedAccountId", "provider providerUsername")
      .sort({ createdAt: -1 });

    res.json(repositories);
  } catch (error) {
    next(error);
  }
});

/**
 * Sync repository with latest commits from GitHub
 */
router.post("/:id/sync", async (req, res, next) => {
  try {
    const repository = await Repository.findOne({
      _id: req.params.id,
      userId: req.user.userId,
      isActive: true,
    }).populate("connectedAccountId");

    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    if (!repository.connectedAccountId || !repository.connectedAccountId.accessToken) {
      return res.status(400).json({ error: "Repository account connection is invalid" });
    }

    // Fetch latest repository info from GitHub
    const { getGitHubRepositories } = await import("../services/githubService.js");
    const githubRepos = await getGitHubRepositories(repository.connectedAccountId.accessToken);
    const githubRepo = githubRepos.find((r) => r.id === repository.repositoryId);

    if (!githubRepo) {
      return res.status(404).json({ error: "Repository not found on GitHub" });
    }

    // Update repository with latest info
    repository.name = githubRepo.name;
    repository.fullName = githubRepo.fullName;
    repository.description = githubRepo.description || repository.description;
    repository.url = githubRepo.url;
    repository.private = githubRepo.private;
    repository.defaultBranch = githubRepo.defaultBranch || repository.defaultBranch;
    repository.language = githubRepo.language || repository.language;
    repository.updatedAt = new Date();

    await repository.save();

    res.json({
      message: "Repository synced successfully",
      repository,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete a repository connection
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const repository = await Repository.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    // Get user's plan
    const user = await User.findById(req.user.userId);
    const deletionLimit = DELETION_LIMITS[user.plan] || 3;

    // Check deletion limit for free users
    if (user.plan === "free" && user.repositoryDeletionCount >= deletionLimit) {
      return res.status(403).json({
        error: `You have reached the deletion limit of ${deletionLimit} for the free plan. Upgrade to Standard or higher to remove this limit.`,
      });
    }

    // Deactivate repository
    repository.isActive = false;
    await repository.save();

    // Increment deletion count for free users
    if (user.plan === "free") {
      user.repositoryDeletionCount = (user.repositoryDeletionCount || 0) + 1;
      await user.save();
    }

    res.json({ message: "Repository disconnected successfully" });
  } catch (error) {
    next(error);
  }
});

/**
 * Recursively fetch repository files (code files only)
 */
export async function fetchRepositoryFiles(accessToken, owner, repo, path = "", maxFiles = 50) {
  const files = [];
  const codeExtensions = [
    ".js", ".jsx", ".ts", ".tsx", ".py", ".java", ".cpp", ".c", ".cs", ".php",
    ".rb", ".go", ".rs", ".swift", ".kt", ".scala", ".sh", ".bash", ".ps1",
    ".sql", ".html", ".css", ".scss", ".sass", ".less", ".vue", ".svelte",
    ".json", ".xml", ".yaml", ".yml", ".toml", ".ini", ".conf", ".config",
  ];

  try {
    const contents = await getRepositoryContents(accessToken, owner, repo, path);

    for (const item of contents) {
      if (files.length >= maxFiles) break;

      if (item.type === "file") {
        // Check if it's a code file
        const isCodeFile = codeExtensions.some((ext) => item.name.toLowerCase().endsWith(ext));
        if (isCodeFile && item.size > 0 && item.size < 1000000) {
          // Skip files larger than 1MB
          try {
            const fileContent = await getRepositoryFileContent(accessToken, owner, repo, item.path);
            if (fileContent && fileContent.content) {
              files.push({
                name: item.path,
                content: fileContent.content,
                size: fileContent.size,
              });
            }
          } catch (error) {
            console.error(`Error fetching file ${item.path}:`, error.message);
            // Continue with other files
          }
        }
      } else if (item.type === "dir" && files.length < maxFiles) {
        // Skip common non-code directories
        const skipDirs = ["node_modules", ".git", "dist", "build", "vendor", "__pycache__", ".next", ".nuxt"];
        if (!skipDirs.includes(item.name)) {
          const subFiles = await fetchRepositoryFiles(accessToken, owner, repo, item.path, maxFiles - files.length);
          files.push(...subFiles);
        }
      }
    }
  } catch (error) {
    console.error(`Error fetching directory ${path}:`, error.message);
  }

  return files;
}

/**
 * Scan a repository
 */
router.post("/:id/scan", async (req, res, next) => {
  try {
    const repository = await Repository.findOne({
      _id: req.params.id,
      userId: req.user.userId,
      isActive: true,
    }).populate("connectedAccountId");

    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    if (!repository.connectedAccountId || !repository.connectedAccountId.accessToken) {
      return res.status(400).json({ error: "Repository account connection is invalid" });
    }

    const scanId = `scan_${Date.now()}`;
    const scanStartTime = Date.now();

    // Parse repository owner and name from fullName (e.g., "username/repo-name")
    const [owner, repoName] = repository.fullName.split("/");
    if (!owner || !repoName) {
      return res.status(400).json({ error: "Invalid repository format" });
    }

    // Create initial scan record with pending status
    const scan = new Scan({
      userId: req.user.userId,
      scanId,
      type: "repository",
      target: repository.fullName,
      targetDetails: {
        repositoryId: repository._id,
      },
      status: "scanning",
      vulnerabilities: [],
      summary: { critical: 0, high: 0, medium: 0, low: 0 },
      filesAnalyzed: 0,
    });
    await scan.save();

    // Update repository status
    repository.lastScannedAt = new Date();
    await repository.save();

    // Fetch repository files
    let fileContents = [];
    try {
      fileContents = await fetchRepositoryFiles(
        repository.connectedAccountId.accessToken,
        owner,
        repoName,
        "",
        50 // Limit to 50 files for performance
      );

      if (fileContents.length === 0) {
        scan.status = "completed";
        scan.filesAnalyzed = 0;
        await scan.save();

        return res.json({
          scanId,
          message: "Repository scan completed - no code files found",
          repositoryId: repository._id,
          vulnerabilities: [],
          summary: { critical: 0, high: 0, medium: 0, low: 0 },
          filesAnalyzed: 0,
        });
      }
    } catch (fetchError) {
      console.error("Error fetching repository files:", fetchError);
      scan.status = "failed";
      scan.error = "Failed to fetch repository files";
      await scan.save();

      return res.status(500).json({
        error: "Failed to fetch repository files",
        message: fetchError.message,
      });
    }

    // Call Python AI engine for security analysis
    const PYTHON_ENGINE_URL = process.env.PYTHON_ENGINE_URL || "http://localhost:5000";

    try {
      const aiResponse = await axios.post(
        `${PYTHON_ENGINE_URL}/api/analyze/security`,
        {
          files: fileContents,
          scanId,
        },
        {
          timeout: 300000, // 5 minutes timeout for repository analysis
        }
      );

      const scanDuration = Math.round((Date.now() - scanStartTime) / 1000);
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

      // Update scan record
      scan.status = "completed";
      scan.vulnerabilities = sanitizedVulnerabilities;
      scan.summary = summary;
      scan.aiInsights = aiResponse.data.aiInsights || null;
      scan.scanDuration = scanDuration;
      scan.filesAnalyzed = fileContents.length;
      await scan.save();

      // Update repository with scan results
      repository.lastScannedAt = new Date();
      repository.lastScanResult = {
        scanId,
        vulnerabilities: summary,
      };
      await repository.save();

      // Update user scan count
      await User.findByIdAndUpdate(req.user.userId, {
        $inc: { "usage.scans": 1 },
      });

      res.json({
        scanId,
        message: "Repository scan completed successfully",
        repositoryId: repository._id,
        vulnerabilities,
        summary,
        aiInsights: aiResponse.data.aiInsights || null,
        filesAnalyzed: fileContents.length,
        scanDuration,
      });
    } catch (aiError) {
      // If AI engine is not available, save scan with error status
      console.error("AI engine error:", aiError.message);
      scan.status = "failed";
      scan.error = "AI analysis service is not available";
      scan.filesAnalyzed = fileContents.length;
      await scan.save();

      if (aiError.code === "ECONNREFUSED" || aiError.response?.status >= 500) {
        return res.status(503).json({
          error: "AI analysis service is not available",
          message: "Please ensure the Python AI engine is running",
          scanId,
        });
      } else {
        throw aiError;
      }
    }
  } catch (error) {
    next(error);
  }
});

export default router;

