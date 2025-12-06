import express from "express";
import { authenticate } from "../middleware/auth.js";
import Documentation from "../models/Documentation.js";
import Repository from "../models/Repository.js";
import User from "../models/User.js";
import { getConnectedGitHubAccount } from "../services/githubService.js";
import { fetchRepositoryFiles } from "./repositories.js";
import { getRepositoryFileContent } from "../services/githubService.js";
import { PLAN_LIMITS, isSubscriptionActive } from "../services/razorpayService.js";
import Subscription from "../models/Subscription.js";
import axios from "axios";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

const PYTHON_ENGINE_URL = process.env.PYTHON_ENGINE_URL || "http://localhost:5000";

// Middleware to check documentation limits
const checkDocumentationLimit = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check subscription status
    let subscription = null;
    if (user.subscriptionId) {
      subscription = await Subscription.findById(user.subscriptionId);
      if (subscription && !isSubscriptionActive(subscription)) {
        // Subscription expired, downgrade to free
        const freeLimits = PLAN_LIMITS.free;
        user.plan = "free";
        user.subscriptionStatus = "expired";
        user.subscriptionExpiresAt = null;
        user.usage.documentationLimit = freeLimits.documentation;
        await user.save();
      }
    }

    const limits = PLAN_LIMITS[user.plan] || PLAN_LIMITS.free;
    const currentUsage = user.usage.documentation || 0;
    const limit = limits.documentation;

    // Check if limit is reached
    if (limit !== Infinity && currentUsage >= limit) {
      return res.status(403).json({
        error: "Documentation limit reached",
        message: `You have reached your documentation generation limit (${limit}). ${user.plan === "free" ? "Upgrade your plan to generate more documentation." : "Your subscription may have expired or you've reached your plan limit."}`,
        currentUsage,
        limit,
        plan: user.plan,
      });
    }

    req.userPlan = user.plan;
    req.userUsage = user.usage;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Generate documentation for a repository
 */
router.post("/:repositoryId/generate", checkDocumentationLimit, async (req, res, next) => {
  try {
    const { repositoryId } = req.params;

    // Find repository
    const repository = await Repository.findOne({
      _id: repositoryId,
      userId: req.user.userId,
      isActive: true,
    }).populate("connectedAccountId");

    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const account = repository.connectedAccountId;
    if (!account || !account.isActive) {
      return res.status(404).json({ error: "Connected account not found or inactive" });
    }

    // Fetch repository files
    const [owner, repo] = repository.fullName.split("/");
    const files = await fetchRepositoryFiles(
      account.accessToken,
      owner,
      repo,
      "",
      100 // Limit to 100 files for documentation
    );

    // Determine language from file extension
    const getLanguageFromPath = (path) => {
      if (!path) return "unknown";
      const ext = path.split(".").pop()?.toLowerCase();
      const langMap = {
        js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
        py: "python", java: "java", cpp: "cpp", c: "c", cs: "csharp",
        php: "php", rb: "ruby", go: "go", rs: "rust", swift: "swift",
        kt: "kotlin", html: "html", css: "css", scss: "scss", json: "json",
        xml: "xml", yaml: "yaml", yml: "yaml",
      };
      return langMap[ext] || "unknown";
    };

    // Prepare files for AI analysis
    const fileContents = files.map((file) => ({
      path: file.name || file.path || "unknown",
      content: file.content || "",
      language: getLanguageFromPath(file.name || file.path),
    }));

    // Call Python AI engine for documentation generation
    try {
      const aiResponse = await axios.post(
        `${PYTHON_ENGINE_URL}/api/analyze/documentation`,
        { 
          files: fileContents,
          userPlan: req.userPlan || "free",
          isAuthenticated: true, // This route requires authentication
        },
        {
          timeout: 180000, // 3 minutes timeout
        }
      );

      const docData = aiResponse.data;
      
      // Extract model metadata if present
      const modelMetadata = docData._metadata || {};
      delete docData._metadata; // Remove from data before saving

      // Validate and transform documentation data
      const validateAndTransformDocData = (data) => {
        const transformed = { ...data };

        // Transform schemas
        if (transformed.schemas && Array.isArray(transformed.schemas)) {
          transformed.schemas = transformed.schemas.map((schema) => {
            const newSchema = { ...schema };

            // Normalize type values
            if (newSchema.type) {
              const typeMap = {
                "abstract class": "class",
                "abstract": "class",
                "model": "model",
                "interface": "interface",
                "type": "type",
                "class": "class",
                "enum": "enum",
              };
              newSchema.type = typeMap[newSchema.type?.toLowerCase()] || "model";
            } else {
              newSchema.type = "model"; // Default
            }

            // Parse properties if it's a string or if it's an array with string elements
            if (typeof newSchema.properties === "string" || (Array.isArray(newSchema.properties) && newSchema.properties.length > 0 && typeof newSchema.properties[0] === "string")) {
              try {
                // If it's an array with a string element, extract the string
                let originalString = typeof newSchema.properties === "string" 
                  ? newSchema.properties 
                  : newSchema.properties[0];
                
                let cleaned = originalString.trim();
                
                // Check for JavaScript string concatenation patterns (more comprehensive)
                const hasStringConcat = cleaned.includes("' +") || cleaned.includes("' +\n") || 
                                       cleaned.includes("\\n' +") || cleaned.includes("' + '") ||
                                       cleaned.match(/['"]\s*\+\s*['"]/) || cleaned.includes("+ '") ||
                                       cleaned.includes("' +\\n") || cleaned.includes("\\n' + '") ||
                                       cleaned.match(/\[\\n'/) || cleaned.match(/'\]/);
                
                if (hasStringConcat) {
                  // This is JavaScript string concatenation code - reconstruct the array
                  // More aggressive cleaning to handle all patterns
                  cleaned = cleaned
                    // Remove string concatenation patterns (handle various formats)
                    .replace(/\[\\n' \+\n' /g, "[")
                    .replace(/\\n' \+\n' /g, "\n")
                    .replace(/'\\n'/g, "\\n")
                    .replace(/' \+ '/g, "")
                    .replace(/' \+/g, "")
                    .replace(/\+ '/g, "")
                    .replace(/\\n'/g, "\\n")
                    .replace(/'\]/g, "]")
                    // Remove template literal backticks if any
                    .replace(/`/g, "")
                    // Remove any remaining quote concatenation patterns
                    .replace(/'\s*\+\s*'/g, "")
                    .replace(/'\s*\+/g, "")
                    .replace(/\+/g, "")
                    // Clean up escaped newlines
                    .replace(/\\n/g, "\n")
                    // Clean up extra whitespace
                    .trim();
                  
                  // Extract array content between first [ and last ]
                  const firstBracket = cleaned.indexOf("[");
                  const lastBracket = cleaned.lastIndexOf("]");
                  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
                    cleaned = cleaned.substring(firstBracket, lastBracket + 1);
                  }
                }
                
                // Try to parse as JSON first
                try {
                  const parsed = JSON.parse(cleaned);
                  if (Array.isArray(parsed)) {
                    newSchema.properties = parsed;
                  } else {
                    throw new Error("Parsed result is not an array");
                  }
                } catch (e) {
                  // If JSON parsing fails, try to extract and parse the array
                  try {
                    // If it still doesn't start with [, try to find the array in the string
                    if (!cleaned.startsWith("[")) {
                      const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
                      if (arrayMatch) {
                        cleaned = arrayMatch[0];
                      }
                    }
                    
                    // Only attempt to parse if it looks like an array literal
                    if (cleaned.startsWith("[") && cleaned.endsWith("]")) {
                      // Convert JavaScript object literal to JSON
                      let jsonLike = cleaned;
                      
                      // Step 1: Replace template literals (backticks) with regular strings
                      jsonLike = jsonLike.replace(/`([^`]*)`/g, '"$1"');
                      
                      // Step 2: Replace unquoted keys with quoted keys (e.g., name: -> "name":)
                      jsonLike = jsonLike.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)(\s*:)/g, '$1"$2"$3');
                      
                      // Step 3: Replace single-quoted strings with double-quoted strings
                      jsonLike = jsonLike.replace(/'([^'\\]*(\\.[^'\\]*)*)'/g, (match, content) => {
                        const escaped = content.replace(/\\'/g, "'").replace(/"/g, '\\"');
                        return `"${escaped}"`;
                      });
                      
                      // Step 4: Replace undefined with null
                      jsonLike = jsonLike.replace(/:\s*undefined\b/g, ': null');
                      
                      // Step 5: Remove trailing commas
                      jsonLike = jsonLike.replace(/,\s*}/g, "}");
                      jsonLike = jsonLike.replace(/,\s*]/g, "]");
                      
                      // Step 6: Try to parse
                      const parsed = JSON.parse(jsonLike);
                      if (Array.isArray(parsed)) {
                        newSchema.properties = parsed;
                      } else {
                        console.warn(`Parsed result for schema ${newSchema.name} is not an array, setting to empty array.`);
                        newSchema.properties = [];
                      }
                    } else {
                      console.warn(`Properties for schema ${newSchema.name} doesn't look like an array (starts with: ${cleaned.substring(0, 50)}), setting to empty array.`);
                      newSchema.properties = [];
                    }
                  } catch (e2) {
                    console.warn(`Failed to parse properties for schema ${newSchema.name}, setting to empty array. Error: ${e2.message}`);
                    console.warn(`Original value (first 500 chars): ${originalString.substring(0, 500)}...`);
                    newSchema.properties = [];
                  }
                }
              } catch (outerError) {
                // Fallback: if anything goes wrong, set to empty array
                console.error(`Error parsing properties for schema ${newSchema.name}:`, outerError);
                newSchema.properties = [];
              }
            }
            
            // Final safety check: ensure properties is an array of objects, not strings
            if (typeof newSchema.properties === "string") {
              console.error(`❌ CRITICAL: Schema ${newSchema.name} properties is still a string after all transformations! Setting to empty array.`);
              newSchema.properties = [];
            } else if (Array.isArray(newSchema.properties) && newSchema.properties.length > 0) {
              // Check if any element is a string (JavaScript code) instead of an object
              const hasStringElements = newSchema.properties.some(item => typeof item === "string");
              if (hasStringElements) {
                console.warn(`⚠️  Schema ${newSchema.name} properties array contains string elements (JavaScript code). Attempting to parse...`);
                // Try to parse the first string element
                const firstString = newSchema.properties.find(item => typeof item === "string");
                if (firstString) {
                  // Re-run the parsing logic on this string
                  try {
                    let cleaned = firstString.trim();
                    // Apply the same cleaning logic as above
                    const hasStringConcat = cleaned.includes("' +") || cleaned.includes("' +\n") || 
                                           cleaned.includes("\\n' +") || cleaned.includes("' + '") ||
                                           cleaned.match(/['"]\s*\+\s*['"]/) || cleaned.includes("+ '");
                    
                    if (hasStringConcat) {
                      cleaned = cleaned
                        .replace(/\[\\n' \+\n' /g, "[")
                        .replace(/\\n' \+\n' /g, "\n")
                        .replace(/'\\n'/g, "\\n")
                        .replace(/' \+ '/g, "")
                        .replace(/' \+/g, "")
                        .replace(/\+ '/g, "")
                        .replace(/\\n'/g, "\\n")
                        .replace(/'\]/g, "]")
                        .replace(/`/g, "")
                        .replace(/'\s*\+\s*'/g, "")
                        .replace(/'\s*\+/g, "")
                        .replace(/\+/g, "")
                        .replace(/\\n/g, "\n")
                        .trim();
                      
                      const firstBracket = cleaned.indexOf("[");
                      const lastBracket = cleaned.lastIndexOf("]");
                      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
                        cleaned = cleaned.substring(firstBracket, lastBracket + 1);
                      }
                    }
                    
                    // Try to parse
                    try {
                      const parsed = JSON.parse(cleaned);
                      if (Array.isArray(parsed)) {
                        newSchema.properties = parsed;
                      } else {
                        newSchema.properties = [];
                      }
                    } catch (e) {
                      // If still fails, set to empty array
                      console.warn(`Failed to parse string element in properties array for schema ${newSchema.name}, setting to empty array.`);
                      newSchema.properties = [];
                    }
                  } catch (e) {
                    console.warn(`Error parsing string element in properties array for schema ${newSchema.name}, setting to empty array.`);
                    newSchema.properties = [];
                  }
                } else {
                  // If we can't find a string to parse, just filter out strings
                  newSchema.properties = newSchema.properties.filter(item => typeof item === "object" && item !== null);
                }
              }
            }

            // Ensure properties is an array
            if (!Array.isArray(newSchema.properties)) {
              newSchema.properties = [];
            }

            // Validate each property
            newSchema.properties = newSchema.properties.map((prop) => {
              if (typeof prop === "string") {
                // Try to parse string property
                try {
                  prop = JSON.parse(prop);
                } catch (e) {
                  // If it's a string, create a basic property object
                  prop = {
                    name: prop,
                    type: "string",
                    required: false,
                    description: "",
                  };
                }
              }
              return {
                name: prop.name || "",
                type: prop.type || "string",
                required: prop.required !== undefined ? prop.required : false,
                description: prop.description || "",
                defaultValue: prop.defaultValue,
              };
            });

            return newSchema;
          });
        }

        // Transform API endpoints
        if (transformed.apiEndpoints && Array.isArray(transformed.apiEndpoints)) {
          transformed.apiEndpoints = transformed.apiEndpoints.map((endpoint) => {
            const newEndpoint = { ...endpoint };

            // Parse parameters if it's a string
            if (typeof newEndpoint.parameters === "string") {
              try {
                newEndpoint.parameters = JSON.parse(newEndpoint.parameters);
              } catch (e) {
                try {
                  const cleaned = newEndpoint.parameters.trim();
                  if (cleaned.startsWith("[") && cleaned.endsWith("]")) {
                    // Replace single quotes with double quotes for JSON compatibility
                    const jsonLike = cleaned
                      .replace(/'/g, '"')
                      .replace(/(\w+):/g, '"$1":') // Add quotes to keys
                      .replace(/,\s*}/g, "}") // Remove trailing commas
                      .replace(/,\s*]/g, "]"); // Remove trailing commas
                    newEndpoint.parameters = JSON.parse(jsonLike);
                  } else {
                    newEndpoint.parameters = [];
                  }
                } catch (e2) {
                  console.warn(`Failed to parse parameters for endpoint ${newEndpoint.method} ${newEndpoint.path}, setting to empty array.`);
                  newEndpoint.parameters = [];
                }
              }
            }

            // Ensure parameters is an array
            if (!Array.isArray(newEndpoint.parameters)) {
              newEndpoint.parameters = [];
            }

            // Validate each parameter
            newEndpoint.parameters = newEndpoint.parameters.map((param) => {
              if (typeof param === "string") {
                try {
                  param = JSON.parse(param);
                } catch (e) {
                  param = {
                    name: param,
                    type: "string",
                    required: false,
                    description: "",
                    location: "query",
                  };
                }
              }
              return {
                name: param.name || "",
                type: param.type || "string",
                required: param.required !== undefined ? param.required : false,
                description: param.description || "",
                location: param.location || "query",
              };
            });

            return newEndpoint;
          });
        }

        return transformed;
      };

      // Apply validation and transformation
      const validatedDocData = validateAndTransformDocData(docData);
      
      // Debug: Log transformation results
      if (validatedDocData.schemas && Array.isArray(validatedDocData.schemas)) {
        validatedDocData.schemas.forEach((schema, idx) => {
          if (typeof schema.properties === "string") {
            console.warn(`⚠️  Schema ${idx} (${schema.name}) still has string properties after transformation!`);
            console.warn(`First 200 chars: ${schema.properties.substring(0, 200)}...`);
            // Force to empty array if still a string
            schema.properties = [];
          } else if (!Array.isArray(schema.properties)) {
            console.warn(`⚠️  Schema ${idx} (${schema.name}) properties is not an array: ${typeof schema.properties}`);
            schema.properties = [];
          }
        });
      }

      // Check if documentation already exists
      let existingDoc = await Documentation.findOne({
        userId: req.user.userId,
        repositoryId: repository._id,
      });

      let isNewDocumentation = false;
      let documentation;

      if (existingDoc) {
        // Update existing documentation (doesn't count as new usage)
        documentation = existingDoc;
        documentation.overview = validatedDocData.overview || documentation.overview;
        documentation.fileStructure = validatedDocData.fileStructure || documentation.fileStructure;
        documentation.detailedExplanations = validatedDocData.detailedExplanations || documentation.detailedExplanations;
        documentation.codeFlowAnalysis = validatedDocData.codeFlowAnalysis || documentation.codeFlowAnalysis;
        documentation.architectureDescription = validatedDocData.architectureDescription || documentation.architectureDescription;
        documentation.apiEndpoints = validatedDocData.apiEndpoints || [];
        documentation.schemas = validatedDocData.schemas || [];
        documentation.projectStructure = validatedDocData.projectStructure || {};
        documentation.dependencies = validatedDocData.dependencies || [];
        documentation.lastUpdatedAt = new Date();
        // Update model metadata
        if (modelMetadata.generatedBy) {
          documentation.generatedBy = modelMetadata.generatedBy;
          documentation.modelName = modelMetadata.modelName;
          documentation.provider = modelMetadata.provider;
        }
        
        // Try to save, but handle validation errors gracefully
        try {
          await documentation.save();
        } catch (validationError) {
          // If validation fails, try to fix the schemas and save again
          if (validationError.name === "ValidationError" && validationError.errors) {
            console.warn("⚠️  Validation error during update, attempting to fix schemas...");
            
            // Fix any problematic schemas by setting properties to empty array
            if (documentation.schemas && Array.isArray(documentation.schemas)) {
              documentation.schemas = documentation.schemas.map((schema) => {
                // If properties is still a string or array with string elements, set to empty array
                if (typeof schema.properties === "string" || 
                    (Array.isArray(schema.properties) && schema.properties.some(item => typeof item === "string"))) {
                  console.warn(`⚠️  Fixing schema ${schema.name}: setting properties to empty array`);
                  return { ...schema, properties: [] };
                }
                return schema;
              });
            }
            
            // Try to save again
            try {
              await documentation.save();
              console.log("✅ Successfully updated documentation after fixing validation errors");
            } catch (retryError) {
              console.error("❌ Failed to update documentation even after fixing:", retryError);
              // If it still fails, save with empty schemas
              documentation.schemas = [];
              await documentation.save();
              console.log("✅ Updated documentation with empty schemas as fallback");
            }
          } else {
            // Re-throw if it's not a validation error
            throw validationError;
          }
        }
      } else {
        // Create new documentation (counts as new usage)
        isNewDocumentation = true;
        documentation = new Documentation({
          userId: req.user.userId,
          repositoryId: repository._id,
          overview: validatedDocData.overview,
          fileStructure: validatedDocData.fileStructure || null,
          detailedExplanations: validatedDocData.detailedExplanations || null,
          codeFlowAnalysis: validatedDocData.codeFlowAnalysis || null,
          architectureDescription: validatedDocData.architectureDescription || null,
          apiEndpoints: validatedDocData.apiEndpoints || [],
          schemas: validatedDocData.schemas || [],
          projectStructure: validatedDocData.projectStructure || {},
          dependencies: validatedDocData.dependencies || [],
          generatedBy: modelMetadata.generatedBy || null,
          modelName: modelMetadata.modelName || null,
          provider: modelMetadata.provider || null,
        });
        
        // Try to save, but handle validation errors gracefully
        try {
          await documentation.save();
        } catch (validationError) {
          // If validation fails, try to fix the schemas and save again
          if (validationError.name === "ValidationError" && validationError.errors) {
            console.warn("⚠️  Validation error during save, attempting to fix schemas...");
            
            // Fix any problematic schemas by setting properties to empty array
            if (documentation.schemas && Array.isArray(documentation.schemas)) {
              documentation.schemas = documentation.schemas.map((schema) => {
                // If properties is still a string or array with string elements, set to empty array
                if (typeof schema.properties === "string" || 
                    (Array.isArray(schema.properties) && schema.properties.some(item => typeof item === "string"))) {
                  console.warn(`⚠️  Fixing schema ${schema.name}: setting properties to empty array`);
                  return { ...schema, properties: [] };
                }
                return schema;
              });
            }
            
            // Try to save again
            try {
              await documentation.save();
              console.log("✅ Successfully saved documentation after fixing validation errors");
            } catch (retryError) {
              console.error("❌ Failed to save documentation even after fixing:", retryError);
              // If it still fails, save with empty schemas
              documentation.schemas = [];
              await documentation.save();
              console.log("✅ Saved documentation with empty schemas as fallback");
            }
          } else {
            // Re-throw if it's not a validation error
            throw validationError;
          }
        }

        // Increment documentation usage count
        const user = await User.findById(req.user.userId);
        if (user) {
          user.usage.documentation = (user.usage.documentation || 0) + 1;
          await user.save();
        }
      }

      // Get updated user data for usage info
      const user = await User.findById(req.user.userId);

      res.json({
        message: "Documentation generated successfully",
        documentation: {
          id: documentation._id,
          overview: documentation.overview,
          fileStructure: documentation.fileStructure,
          detailedExplanations: documentation.detailedExplanations,
          codeFlowAnalysis: documentation.codeFlowAnalysis,
          architectureDescription: documentation.architectureDescription,
          apiEndpoints: documentation.apiEndpoints,
          schemas: documentation.schemas,
          projectStructure: documentation.projectStructure,
          dependencies: documentation.dependencies,
          generatedAt: documentation.generatedAt,
          lastUpdatedAt: documentation.lastUpdatedAt,
          generatedBy: documentation.generatedBy || modelMetadata.generatedBy || null,
          modelName: documentation.modelName || modelMetadata.modelName || null,
          provider: documentation.provider || modelMetadata.provider || null,
        },
        usage: {
          current: user.usage.documentation,
          limit: user.usage.documentationLimit,
        },
      });
    } catch (aiError) {
      console.error("Error in documentation generation:", aiError);
      
      // Check if it's a validation error (should have been handled already, but just in case)
      if (aiError.name === "ValidationError") {
        console.error("Documentation validation failed:", aiError);
        return res.status(400).json({
          error: "Documentation validation failed",
          message: "The generated documentation contains invalid data. Some schema properties may be missing.",
          details: aiError.message || "Validation error occurred while saving documentation.",
        });
      }
      
      // Handle different types of errors
      if (aiError.code === "ECONNREFUSED" || aiError.code === "ETIMEDOUT") {
        return res.status(503).json({
          error: "Documentation generation service unavailable",
          message: "The AI engine is not running. Please ensure the Python AI engine is started on port 5000.",
          details: `Cannot connect to ${PYTHON_ENGINE_URL}. Make sure the AI engine is running: cd model && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt && python app.py`,
        });
      }
      
      if (aiError.response) {
        return res.status(503).json({
          error: "Documentation generation service unavailable",
          message: aiError.response.data?.error || aiError.message,
          details: aiError.response.data?.details || "The AI engine returned an error response.",
        });
      }
      
      // Handle other errors (network, timeout, etc.)
      return res.status(503).json({
        error: "Documentation generation service unavailable",
        message: aiError.message || "Failed to connect to the AI engine",
        details: `Error connecting to ${PYTHON_ENGINE_URL}. Please check if the AI engine is running.`,
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * Get documentation for a repository
 */
router.get("/:repositoryId", async (req, res, next) => {
  try {
    const { repositoryId } = req.params;

    // Verify repository belongs to user
    const repository = await Repository.findOne({
      _id: repositoryId,
      userId: req.user.userId,
      isActive: true,
    });

    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    // Find documentation
    const documentation = await Documentation.findOne({
      userId: req.user.userId,
      repositoryId: repository._id,
    });

    // Return null instead of 404 - documentation not found is a valid state (not yet generated)
    if (!documentation) {
      return res.json(null);
    }

    res.json({
      id: documentation._id,
      overview: documentation.overview,
      fileStructure: documentation.fileStructure,
      detailedExplanations: documentation.detailedExplanations,
      codeFlowAnalysis: documentation.codeFlowAnalysis,
      architectureDescription: documentation.architectureDescription,
      apiEndpoints: documentation.apiEndpoints,
      schemas: documentation.schemas,
      projectStructure: documentation.projectStructure,
      dependencies: documentation.dependencies,
      generatedAt: documentation.generatedAt,
      lastUpdatedAt: documentation.lastUpdatedAt,
      generatedBy: documentation.generatedBy || null,
      modelName: documentation.modelName || null,
      provider: documentation.provider || null,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get documentation chat messages
 */
router.get("/:repositoryId/chat", async (req, res, next) => {
  try {
    const { repositoryId } = req.params;

    const repository = await Repository.findOne({
      _id: repositoryId,
      userId: req.user.userId,
      isActive: true,
    });

    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const documentation = await Documentation.findOne({
      userId: req.user.userId,
      repositoryId: repository._id,
    });

    if (!documentation) {
      return res.json({ messages: [] });
    }

    res.json({
      messages: documentation.chatMessages || [],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Add chat message to documentation
 */
router.post("/:repositoryId/chat", async (req, res, next) => {
  try {
    const { repositoryId } = req.params;
    const { role, content } = req.body;

    if (!role || !content) {
      return res.status(400).json({ error: "Role and content are required" });
    }

    if (!["user", "assistant"].includes(role)) {
      return res.status(400).json({ error: "Invalid role. Must be 'user' or 'assistant'" });
    }

    const repository = await Repository.findOne({
      _id: repositoryId,
      userId: req.user.userId,
      isActive: true,
    });

    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    let documentation = await Documentation.findOne({
      userId: req.user.userId,
      repositoryId: repository._id,
    });

    if (!documentation) {
      return res.status(404).json({ error: "Documentation not found. Please generate it first." });
    }

    documentation.chatMessages.push({
      role,
      content,
      timestamp: new Date(),
    });

    await documentation.save();

    res.json({
      message: "Chat message added successfully",
      messageId: documentation.chatMessages[documentation.chatMessages.length - 1]._id,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Stream chat response for documentation Q&A
 */
router.post("/:repositoryId/chat/stream", async (req, res, next) => {
  try {
    const { repositoryId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const repository = await Repository.findOne({
      _id: repositoryId,
      userId: req.user.userId,
      isActive: true,
    });

    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const documentation = await Documentation.findOne({
      userId: req.user.userId,
      repositoryId: repository._id,
    });

    if (!documentation) {
      return res.status(404).json({ error: "Documentation not found. Please generate it first." });
    }

    // Build repository context for AI
    const repoContext = `
Repository: ${repository.fullName}
Overview: ${documentation.overview || "No overview available"}

API Endpoints (${documentation.apiEndpoints.length}):
${documentation.apiEndpoints.slice(0, 10).map((ep) => `${ep.method} ${ep.path} - ${ep.description || ""}`).join("\n")}

Schemas (${documentation.schemas.length}):
${documentation.schemas.slice(0, 10).map((s) => `${s.name} (${s.type}) - ${s.description || ""}`).join("\n")}
`;

    // Set up SSE streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    // Save user message
    documentation.chatMessages.push({
      role: "user",
      content: message,
      timestamp: new Date(),
    });
    await documentation.save();

    try {
      // Call Python AI engine for streaming chat
      const aiResponse = await axios.post(
        `${PYTHON_ENGINE_URL}/api/chat/documentation`,
        {
          message,
          repoContext,
          userPlan: req.userPlan || "free",
          isAuthenticated: true, // This route requires authentication
        },
        {
          responseType: "stream",
          timeout: 120000,
        }
      );

      let fullResponse = "";
      let isSaving = false; // Flag to prevent parallel saves

      aiResponse.data.on("data", (chunk) => {
        const lines = chunk.toString().split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              // Don't save here - let the "end" event handle it to avoid parallel saves
              res.write("data: [DONE]\n\n");
              res.end();
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullResponse += parsed.content;
                res.write(`data: ${JSON.stringify({ content: parsed.content })}\n\n`);
              } else if (parsed.error) {
                res.write(`data: ${JSON.stringify({ error: parsed.error })}\n\n`);
                res.end();
                return;
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      });

      aiResponse.data.on("end", async () => {
        if (fullResponse && !isSaving) {
          isSaving = true;
          try {
            // Save assistant message (only once)
            documentation.chatMessages.push({
              role: "assistant",
              content: fullResponse,
              timestamp: new Date(),
            });
            await documentation.save();
          } catch (error) {
            console.error("Error saving documentation chat message:", error);
          }
        }
        if (!res.headersSent) {
          res.write("data: [DONE]\n\n");
          res.end();
        }
      });

      aiResponse.data.on("error", (error) => {
        console.error("Stream error:", error);
        res.write(`data: ${JSON.stringify({ error: "Stream error occurred" })}\n\n`);
        res.end();
      });
    } catch (aiError) {
      console.error("AI engine error:", aiError);
      res.write(`data: ${JSON.stringify({ error: "AI service unavailable" })}\n\n`);
      res.end();
    }
  } catch (error) {
    next(error);
  }
});

export default router;

