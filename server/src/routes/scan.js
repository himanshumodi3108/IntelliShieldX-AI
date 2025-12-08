import express from "express";
import { authenticate } from "../middleware/auth.js";
import multer from "multer";
import axios from "axios";
import fs from "fs/promises";
import path from "path";
import Scan from "../models/Scan.js";
import User from "../models/User.js";
import { unifiedThreatIntelligenceService } from "../services/unifiedThreatIntelligenceService.js";
import { zipExtractor } from "../utils/zipExtractor.js";

const router = express.Router();

// Configure multer with security limits
// Note: multer parses FormData and puts files in req.files and other fields in req.body
// Important: When using upload.any(), multer will parse both files and fields
// Fields will be available in req.body as strings (for text fields) or arrays (for multiple values)
const upload = multer({ 
  dest: "uploads/",
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
    files: 10, // Max 10 files per upload
    fieldSize: 10 * 1024 * 1024, // 10MB max field size (for JSON passwords)
    fields: 20, // Max number of non-file fields
  },
  // Security: Only allow specific file types (can be adjusted based on needs)
  fileFilter: (req, file, cb) => {
    // Allow all file types for threat intelligence scanning
    // Files are never executed, only read for analysis
    cb(null, true);
  },
});

// All routes require authentication
router.use(authenticate);

const PYTHON_ENGINE_URL = process.env.PYTHON_ENGINE_URL || "http://localhost:5000";

// Upload files for scanning
// Use upload.any() to handle all fields and files
// Note: When using upload.any(), multer should parse both files and text fields
// Files go to req.files, text fields go to req.body
router.post("/upload", upload.any(), async (req, res, next) => {
  // Declare variables in function scope so they're accessible in catch block
  let extractPath = null;
  let files = [];
  let uploadedFiles = [];
  
  try {
    // Get files from req.files array (filter by fieldname 'files')
    // When using upload.any(), all files are in req.files array
    uploadedFiles = req.files ? req.files.filter(f => f.fieldname === "files") : [];
    
    // Debug: Log all fields from multer (commented out for production)
    // console.log(`[File Upload] req.files count:`, req.files?.length || 0);
    // console.log(`[File Upload] req.files (all):`, req.files?.map(f => ({ fieldname: f.fieldname, originalname: f.originalname })));
    // console.log(`[File Upload] req.files['files'] count:`, uploadedFiles.length);
    // console.log(`[File Upload] req.files['files']:`, uploadedFiles.map(f => ({ fieldname: f.fieldname, originalname: f.originalname })));
    // console.log(`[File Upload] req.body keys:`, Object.keys(req.body || {}));
    // console.log(`[File Upload] req.body:`, req.body);
    // console.log(`[File Upload] req.headers['content-type']:`, req.headers['content-type']);
    
    // Additional debugging: Check if multer parsed any fields at all
    // if (req.files && req.files.length > 0) {
    //   console.log(`[File Upload] All fieldnames in req.files:`, req.files.map(f => f.fieldname));
    // }
    
    if (!uploadedFiles || uploadedFiles.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    // Parse passwords from request body (if provided)
    // Format: { passwords: { "filename1": "password1", "filename2": "password2" } }
    // Note: multer parses FormData fields into req.body as strings
    // WORKAROUND: Sometimes multer doesn't populate req.body with fields when using upload.any()
    // We'll check multiple sources: req.body, req.query, and also check if field was sent as a file
    let passwords = {};
    try {
      // First, check req.body (standard location for multer-parsed fields)
      if (req.body && req.body.passwords) {
        // console.log(`[File Upload] Found passwords field in req.body`);
        // console.log(`[File Upload] req.body.passwords type:`, typeof req.body.passwords);
        // console.log(`[File Upload] req.body.passwords value:`, req.body.passwords);
        
        // Handle both string (JSON) and object formats
        if (typeof req.body.passwords === "string") {
          try {
            passwords = JSON.parse(req.body.passwords);
            // console.log(`[File Upload] ✓ Successfully parsed passwords JSON from req.body`);
          } catch (parseError) {
            console.warn(`[File Upload] Failed to parse passwords JSON:`, parseError);
            // console.warn(`[File Upload] Raw passwords string:`, req.body.passwords);
            passwords = {};
          }
        } else if (typeof req.body.passwords === "object") {
          passwords = req.body.passwords;
          // console.log(`[File Upload] Passwords already an object in req.body`);
        }
      } else {
        // WORKAROUND: Check if passwords field was mistakenly parsed as a file
        // This can happen if multer misidentifies the field
        const passwordFile = req.files?.find(f => f.fieldname === "passwords");
        if (passwordFile && passwordFile.buffer) {
          // console.log(`[File Upload] Found passwords field as a file (buffer), attempting to parse...`);
          try {
            const passwordString = passwordFile.buffer.toString('utf8');
            passwords = JSON.parse(passwordString);
            // console.log(`[File Upload] ✓ Successfully parsed passwords from file buffer`);
          } catch (parseError) {
            console.warn(`[File Upload] Failed to parse passwords from file buffer:`, parseError);
          }
        } else {
          // Log detailed information for debugging (commented out for production)
          // console.warn(`[File Upload] No passwords field found in req.body`);
          // console.warn(`[File Upload] Available req.body keys:`, Object.keys(req.body || {}));
          // console.warn(`[File Upload] Full req.body content:`, JSON.stringify(req.body, null, 2));
          // console.warn(`[File Upload] All req.files fieldnames:`, req.files?.map(f => f.fieldname) || []);
          // console.warn(`[File Upload] ⚠️  Multer may not be parsing FormData text fields correctly.`);
          // console.warn(`[File Upload] ⚠️  Please verify the frontend is sending the 'passwords' field in FormData.`);
        }
      }
    } catch (parseError) {
      console.warn(`[File Upload] Failed to parse passwords from request:`, parseError);
    }

    // Attach passwords to files array for easier access
    // Passwords are keyed by filename (originalname or name)
    // console.log(`[File Upload] Parsed passwords object:`, passwords);
    // console.log(`[File Upload] Password keys:`, Object.keys(passwords));
    // console.log(`[File Upload] Uploaded files:`, uploadedFiles.map(f => ({ originalname: f.originalname, name: f.name, filename: f.filename })));
    
    files = uploadedFiles.map((file) => {
      // Try multiple key variations to match password
      // Frontend sends passwords keyed by File.name (the original filename)
      const password = passwords[file.originalname] || 
                       passwords[file.name] || 
                       passwords[file.filename] ||
                       null;
      
      // if (password) {
      //   console.log(`[File Upload] ✓ Password found for file: "${file.originalname || file.name}" (password length: ${password.length})`);
      // } else {
      //   console.log(`[File Upload] ✗ No password found for file: "${file.originalname || file.name}" (checked keys: ${file.originalname}, ${file.name}, ${file.filename})`);
      // }
      
      return {
        ...file,
        password: password,
      };
    });

    // Security: Validate file sizes (additional check beyond multer limits)
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    const MAX_TOTAL_SIZE = 500 * 1024 * 1024; // 500MB total for all files
    
    let totalSize = 0;
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        // Clean up uploaded files
        await Promise.all(files.map((f) => fs.unlink(f.path).catch(() => {})));
        return res.status(400).json({ 
          error: "File size exceeds limit",
          message: `File "${file.originalname}" exceeds the maximum size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
        });
      }
      totalSize += file.size;
    }

    if (totalSize > MAX_TOTAL_SIZE) {
      // Clean up uploaded files
      await Promise.all(files.map((f) => fs.unlink(f.path).catch(() => {})));
      return res.status(400).json({ 
        error: "Total file size exceeds limit",
        message: `Total size of all files (${(totalSize / (1024 * 1024)).toFixed(2)}MB) exceeds the maximum of ${MAX_TOTAL_SIZE / (1024 * 1024)}MB`
      });
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

    // Ensure we have at least one valid file
    if (files.length === 0 || !files[0].originalname) {
      return res.status(400).json({ error: "Invalid file upload" });
    }

    // Helper function to check if a file is a text/code file
    const isTextFile = (filename) => {
      if (!filename || typeof filename !== 'string') {
        return false; // Not a text file if filename is invalid
      }
      const textExtensions = [
        ".js", ".jsx", ".ts", ".tsx", ".py", ".java", ".cpp", ".c", ".cs", ".php",
        ".rb", ".go", ".rs", ".swift", ".kt", ".scala", ".sh", ".bash", ".ps1",
        ".sql", ".html", ".css", ".scss", ".sass", ".less", ".vue", ".svelte",
        ".json", ".xml", ".yaml", ".yml", ".toml", ".ini", ".conf", ".config",
        ".md", ".txt", ".log", ".csv", ".tsv",
      ];
      const ext = path.extname(filename).toLowerCase();
      return textExtensions.includes(ext);
    };

    // Check if first file is a ZIP archive (by extension)
    const hasZipExtension = files.length > 0 && zipExtractor.isZipFile(files[0].originalname);
    let isZip = false;
    let extractedFiles = null;
    // extractPath is already declared in function scope above
    let filesToScan = files; // Default to original files
    let filesToCleanup = []; // Track files/directories to clean up

    // Log user plan for debugging
    console.log(`[Scan ID: ${scanId}] User plan: "${user.plan}"`);

    // If file has .zip extension, verify it's actually a ZIP file
    if (hasZipExtension) {
      console.log(`[Scan ID: ${scanId}] File has .zip extension: "${files[0].originalname}". Verifying...`);
      
      try {
        // Verify it's actually a ZIP file by checking file signature
        isZip = await zipExtractor.verifyZipFile(files[0].path);
        
        if (!isZip) {
          console.log(`[Scan ID: ${scanId}] File "${files[0].originalname}" has .zip extension but is not a valid ZIP file. Treating as regular file.`);
        } else {
          console.log(`[Scan ID: ${scanId}] ZIP file verified: "${files[0].originalname}". Extracting...`);
          
          let zipPassword = files[0].password || null;
          // Trim password to remove any whitespace that might have been accidentally added
          if (zipPassword) {
            zipPassword = zipPassword.trim();
            console.log(`[Scan ID: ${scanId}] ZIP password check - files[0].password: ${files[0].password ? "***" : "null"}, zipPassword: ${zipPassword ? "***" : "null"}`);
            console.log(`[Scan ID: ${scanId}] Using provided password for ZIP extraction (length: ${zipPassword.length}, trimmed: ${zipPassword !== files[0].password})`);
            // Log first and last character codes for debugging (without revealing password)
            if (zipPassword.length > 0) {
              console.log(`[Scan ID: ${scanId}] Password first char code: ${zipPassword.charCodeAt(0)}, last char code: ${zipPassword.charCodeAt(zipPassword.length - 1)}`);
            }
          } else {
            console.log(`[Scan ID: ${scanId}] No password provided for ZIP file`);
          }
          
          const extractionResult = await zipExtractor.extractZip(files[0].path, zipPassword);
          extractedFiles = extractionResult.files;
          extractPath = extractionResult.extractPath;
          filesToCleanup.push(extractPath); // Track for cleanup
          
          if (extractedFiles.length === 0) {
            console.warn(`[Scan ID: ${scanId}] ZIP extracted but no files found inside.`);
            // Clean up and return error
            await zipExtractor.cleanup(extractPath);
            await Promise.all(files.map((f) => fs.unlink(f.path).catch(() => {})));
            return res.status(400).json({
              error: "ZIP extraction failed",
              message: "ZIP file is empty or contains no extractable files",
            });
          }
          
          console.log(`[Scan ID: ${scanId}] ZIP extracted successfully. Found ${extractedFiles.length} file(s) inside.`);
          
          // Convert extracted files to scan format
          filesToScan = extractedFiles.map((extractedFile, index) => {
            // Ensure name is always a string
            const fileName = extractedFile.name || `extracted_file_${index}`;
            return {
              name: fileName,
              originalname: fileName,
              path: extractedFile.path,
              size: extractedFile.size,
              buffer: extractedFile.buffer, // Store buffer for hash generation
              isExtracted: true,
              fromZip: files[0].originalname,
            };
          });
          
          console.log(`[Scan ID: ${scanId}] Extracted files:`, filesToScan.map(f => f.name).join(", "));
        }
      } catch (extractError) {
        console.error(`[Scan ID: ${scanId}] ZIP extraction failed:`, extractError.message);
        console.error(`[Scan ID: ${scanId}] ZIP extraction error details:`, extractError);
        
        const errorMessage = extractError.message || "Unknown error during ZIP extraction";
        const isPasswordError = errorMessage.toLowerCase().includes("password") || 
                                errorMessage.toLowerCase().includes("wrong password") ||
                                errorMessage.toLowerCase().includes("incorrect password");
        
        // If password-protected and no password provided, allow scanning the ZIP itself
        // Also check if password was wrong (provided but incorrect)
        const hasPassword = files[0].password && files[0].password.trim() !== "";
        if (isPasswordError && !hasPassword) {
          console.log(`[Scan ID: ${scanId}] ZIP is password-protected but no password provided. Scanning ZIP file itself instead.`);
          // Continue with ZIP file as-is (don't extract)
          isZip = false; // Treat as regular file for scanning
          filesToScan = files; // Use original files
        } else if (isPasswordError && hasPassword) {
          // Password was provided but incorrect
          console.error(`[Scan ID: ${scanId}] ZIP extraction failed: Incorrect password provided`);
          await Promise.all(files.map((f) => fs.unlink(f.path).catch(() => {})));
          return res.status(400).json({
            error: "ZIP extraction failed",
            message: "Incorrect password provided for password-protected ZIP file",
            requiresPassword: false,
            incorrectPassword: true,
          });
        } else {
          // For other errors, return error
          await Promise.all(files.map((f) => fs.unlink(f.path).catch(() => {})));
          return res.status(400).json({
            error: "ZIP extraction failed",
            message: errorMessage,
            requiresPassword: isPasswordError && !files[0].password,
            details: process.env.NODE_ENV === "development" ? (extractError.stack || extractError.toString()) : undefined,
          });
        }
      }
    }

    // SECURITY: Pre-scan with VirusTotal before reading file contents
    // For ZIP files, scan the extracted files; for regular files, scan the file itself
    let virusTotalPreScanResult = null;
    let malwareDetected = false;
    let malwareWarning = null;
    let firstFileBuffer = null; // Store buffer for reuse in threat intelligence scan
    let threatIntelligenceResults = null; // Will store combined results for all files

    try {
      const { virusTotalService } = await import("../services/virusTotalService.js");
      const { hashService } = await import("../services/hashService.js");
      
      // For ZIP files, scan each extracted file; for regular files, scan the file itself
      if (filesToScan.length > 0) {
        const allThreatResults = [];
        const allMalwareWarnings = [];
        
        // Scan each file (extracted files from ZIP or original files)
        for (let i = 0; i < filesToScan.length; i++) {
          const fileToScan = filesToScan[i];
          
          // Get file buffer (either from extracted file or read from disk)
          let fileBuffer;
          if (fileToScan.buffer) {
            fileBuffer = fileToScan.buffer;
          } else {
            fileBuffer = await fs.readFile(fileToScan.path);
          }
          
          // Store first file buffer for later use
          if (i === 0) {
            firstFileBuffer = fileBuffer;
          }
          
          // Log file info for debugging
          console.log(`[Scan ID: ${scanId}] Scanning file ${i + 1}/${filesToScan.length}: name="${fileToScan.originalname}", size=${fileBuffer.length} bytes`);
          
          // Generate hashes from the raw binary buffer
          const hashes = await hashService.generateAllHashes(fileBuffer);
          
          // Log full hashes for debugging (to compare with VirusTotal)
          console.log(`[Scan ID: ${scanId}] Generated hashes for "${fileToScan.originalname}" - MD5: ${hashes.md5}, SHA1: ${hashes.sha1}, SHA256: ${hashes.sha256}`);
          
          // Pre-scan with VirusTotal using hash (fast, doesn't require file upload)
          if (virusTotalService.isEnabled()) {
            try {
              console.log(`[Scan ID: ${scanId}] Querying VirusTotal with SHA256: ${hashes.sha256} for file "${fileToScan.originalname}"`);
              const vtResult = await virusTotalService.scanHash(hashes.sha256, scanId);
              
              if (vtResult.scanned && vtResult.found) {
                const positives = vtResult.positives || 0;
                const status = vtResult.status || "unknown";
                
                // Check if malware is detected
                if (positives > 0) {
                  malwareDetected = true;
                  const warning = {
                    file: fileToScan.originalname,
                    positives,
                    total: vtResult.total || 0,
                    detectionRate: vtResult.detectionRate || 0,
                    status,
                    permalink: vtResult.permalink,
                    message: `⚠️ WARNING: File "${fileToScan.originalname}" was detected as ${status} by ${positives} antivirus engine(s) on VirusTotal.`,
                    fromZip: fileToScan.fromZip || null,
                  };
                  allMalwareWarnings.push(warning);
                  
                  // Log security warning
                  console.warn(`[SECURITY] Malware detected in file: ${fileToScan.originalname}${fileToScan.fromZip ? ` (from ZIP: ${fileToScan.fromZip})` : ""}`, {
                    positives,
                    status,
                    userId: req.user.userId,
                    scanId,
                  });
                }
                
                allThreatResults.push({
                  fileName: fileToScan.originalname,
                  hashes: hashes,
                  virusTotal: vtResult,
                });
              }
            } catch (vtError) {
              console.warn(`[Scan ID: ${scanId}] VirusTotal pre-scan failed for "${fileToScan.originalname}":`, vtError.message);
            }
          }
          
          // Perform full threat intelligence scan on this file
          try {
            const fileThreatResults = await unifiedThreatIntelligenceService.scanFile(
              fileToScan.path,
              fileBuffer,
              user.plan,
              null, // No password needed for extracted files
              scanId
            );
            
            // Store results with file name for reference
            if (!threatIntelligenceResults) {
              threatIntelligenceResults = {
                files: [],
                combined: {
                  virusTotal: { scanned: false },
                  malwareBazaar: { scanned: false },
                  hybridAnalysis: { scanned: false },
                  threatFox: { scanned: false },
                },
              };
            }
            
            threatIntelligenceResults.files.push({
              fileName: fileToScan.originalname,
              hashes: fileThreatResults.hashes,
              threatIntelligence: fileThreatResults,
            });
          } catch (threatError) {
            console.error(`[Scan ID: ${scanId}] Threat intelligence scan failed for "${fileToScan.originalname}":`, threatError.message);
          }
        }
        
        // Set primary malware warning (from first detected file)
        if (allMalwareWarnings.length > 0) {
          malwareWarning = {
            ...allMalwareWarnings[0],
            totalFiles: filesToScan.length,
            detectedFiles: allMalwareWarnings.length,
            allWarnings: allMalwareWarnings,
            message: `${allMalwareWarnings.length} file(s) detected as malicious. ${allMalwareWarnings[0].message}`,
          };
        }
        
        // Use first file's VirusTotal result as primary (for backward compatibility)
        if (allThreatResults.length > 0) {
          virusTotalPreScanResult = allThreatResults[0].virusTotal;
        }
      }
    } catch (preScanError) {
      // If pre-scan setup fails, log but continue (don't block the scan)
      console.warn(`[Scan ID: ${scanId}] File pre-scan setup failed:`, preScanError.message);
    }

    // Read file contents - handle both text and binary files
    // For ZIP files, read extracted files; for regular files, read original files
    // Note: We proceed with reading even if malware is detected (for security analysis purposes)
    const fileContents = await Promise.all(
      filesToScan.map(async (file) => {
        // Ensure we have a valid filename for isTextFile check
        const filename = file.name || file.originalname || "";
        const isText = isTextFile(filename);
        if (isText) {
          // Try to read as text for AI analysis
          // Use buffer if available (from extracted files), otherwise read from disk
          let content = "";
          if (file.buffer) {
            try {
              content = file.buffer.toString("utf-8");
            } catch (error) {
              // If buffer can't be converted to UTF-8, it's binary
              content = "";
            }
          } else {
            content = await fs.readFile(file.path, "utf-8").catch(() => "");
          }
          return {
            name: file.name,
            content: content,
            size: file.size,
            isText: true,
            fromZip: file.fromZip || null,
          };
        } else {
          // Binary file - no text content for AI analysis
          return {
            name: file.name,
            content: "",
            size: file.size,
            isText: false,
            fromZip: file.fromZip || null,
          };
        }
      })
    );

    // Filter text files for AI analysis
    const textFiles = fileContents.filter(f => f.isText && f.content);

    // Call Python AI engine for security analysis (only for text/code files)
    let aiResponse = { data: { vulnerabilities: [], summary: {}, aiInsights: null } };
    let scanDuration = 0;
    let sanitizedVulnerabilities = [];
    let summary = { critical: 0, high: 0, medium: 0, low: 0 };

    if (textFiles.length > 0) {
      try {
        aiResponse = await axios.post(
          `${PYTHON_ENGINE_URL}/api/analyze/security`,
          {
            files: textFiles,
            scanId,
          },
          {
            timeout: 120000, // 2 minutes timeout for AI analysis
          }
        );

        scanDuration = Math.round((Date.now() - scanStartTime) / 1000); // in seconds
        const vulnerabilities = aiResponse.data.vulnerabilities || [];
        
        // Validate and sanitize vulnerabilities before saving
        sanitizedVulnerabilities = vulnerabilities.map((vuln) => {
          // Ensure line is a number or undefined/null
          let line = vuln.line;
          if (line !== undefined && line !== null) {
            // Try to parse as number
            const parsedLine = typeof line === "string" ? parseInt(line, 10) : Number(line);
            line = isNaN(parsedLine) ? undefined : parsedLine;
          } else {
            line = undefined;
          }
          
          // Convert originalCode and fixCode to strings if they are objects
          let originalCode = vuln.originalCode;
          if (originalCode !== undefined && originalCode !== null && typeof originalCode === "object") {
            originalCode = JSON.stringify(originalCode, null, 2);
          } else if (originalCode !== undefined && originalCode !== null) {
            originalCode = String(originalCode);
          }
          
          let fixCode = vuln.fixCode;
          if (fixCode !== undefined && fixCode !== null && typeof fixCode === "object") {
            fixCode = JSON.stringify(fixCode, null, 2);
          } else if (fixCode !== undefined && fixCode !== null) {
            fixCode = String(fixCode);
          }
          
          return {
            ...vuln,
            line: line, // Will be undefined if not a valid number
            originalCode: originalCode,
            fixCode: fixCode,
          };
        });
        
        // Calculate OWASP Top 10 count
        const owaspTop10Count = sanitizedVulnerabilities.filter(
          (v) => v.owaspTop10 && v.owaspTop10 !== "N/A" && v.owaspTop10.startsWith("A")
        ).length;
        
        summary = aiResponse.data.summary || { critical: 0, high: 0, medium: 0, low: 0 };
        summary.owaspTop10 = owaspTop10Count;
      } catch (aiError) {
        console.error("AI analysis error (non-critical for binary files):", aiError.message);
        // Continue with threat intelligence even if AI analysis fails
      }
    } else {
      // No text files - skip AI analysis, only do threat intelligence
      scanDuration = Math.round((Date.now() - scanStartTime) / 1000);
    }

    // Determine target name before cleanup - ensure it's always a valid string
    let targetName;
    if (isZip && extractedFiles && extractedFiles.length > 0) {
      targetName = `${files[0].originalname} (${extractedFiles.length} file(s) extracted)`;
    } else {
      targetName = files.length === 1 
        ? (files[0].originalname || files[0].name || "file") 
        : `${files.length} files`;
    }

    // Threat intelligence results are already collected during pre-scan for each file
    // If we have multiple files (from ZIP), combine the results
    // If we only have one file and threatIntelligenceResults wasn't set, scan it now
    let overallSecurity = null;
    
    try {
      if (!threatIntelligenceResults && filesToScan.length > 0 && firstFileBuffer) {
        // Fallback: scan first file if threat intelligence wasn't done during pre-scan
        const filePassword = filesToScan[0].password || null;
        
        console.log(`[Scan ID: ${scanId}] Performing threat intelligence scan on first file...`);
        threatIntelligenceResults = await unifiedThreatIntelligenceService.scanFile(
          filesToScan[0].path,
          firstFileBuffer,
          user.plan,
          filePassword,
          scanId
        );
        
        // Use pre-scan VirusTotal result if available
        if (virusTotalPreScanResult && virusTotalPreScanResult.scanned) {
          threatIntelligenceResults.virusTotal = virusTotalPreScanResult;
        }
      }
      
      // Calculate overall security from combined results
      // For ZIP files with multiple files, use the most severe result
      if (threatIntelligenceResults) {
        if (threatIntelligenceResults.files && threatIntelligenceResults.files.length > 0) {
          // Multiple files: combine results
          const combinedResults = {
            virusTotal: { scanned: false },
            malwareBazaar: { scanned: false },
            hybridAnalysis: { scanned: false },
            threatFox: { scanned: false },
          };
          
          // Combine results from all files (use first successful scan for each service)
          for (const fileResult of threatIntelligenceResults.files) {
            const ti = fileResult.threatIntelligence;
            if (ti.virusTotal?.scanned && !combinedResults.virusTotal.scanned) {
              combinedResults.virusTotal = ti.virusTotal;
            }
            if (ti.malwareBazaar?.scanned && !combinedResults.malwareBazaar.scanned) {
              combinedResults.malwareBazaar = ti.malwareBazaar;
            }
            if (ti.hybridAnalysis?.scanned && !combinedResults.hybridAnalysis.scanned) {
              combinedResults.hybridAnalysis = ti.hybridAnalysis;
            }
            if (ti.threatFox?.scanned && !combinedResults.threatFox.scanned) {
              combinedResults.threatFox = ti.threatFox;
            }
          }
          
          threatIntelligenceResults = {
            ...combinedResults,
            files: threatIntelligenceResults.files,
            isZipExtraction: isZip,
            zipFileName: isZip ? files[0].originalname : null,
          };
        }
        
        // Calculate overall security
        overallSecurity = await unifiedThreatIntelligenceService.calculateOverallSecurity(
          { summary, vulnerabilities: sanitizedVulnerabilities },
          threatIntelligenceResults
        );
      }
    } catch (threatError) {
      console.error(`[Scan ID: ${scanId}] Threat intelligence scan error:`, threatError);
      // Continue even if threat intelligence fails
    }

    // Save scan to database
    const scan = new Scan({
      userId: req.user.userId,
      scanId,
      type: "file",
      target: targetName,
      targetDetails: {
        files: isZip && extractedFiles 
          ? extractedFiles.map((f) => f.name) 
          : files.map((f) => f.originalname || f.name || "unknown"),
        isZip: isZip,
        zipFileName: isZip ? files[0].originalname : null,
        extractedFileCount: isZip && extractedFiles ? extractedFiles.length : null,
      },
      status: "completed",
      vulnerabilities: sanitizedVulnerabilities,
      summary,
      aiInsights: aiResponse.data.aiInsights || null,
      scanDuration,
      filesAnalyzed: filesToScan.length,
      threatIntelligence: threatIntelligenceResults || {},
      overallSecurity: overallSecurity || { status: "safe", score: 100, summary: "No security issues detected", recommendations: [] },
    });

    await scan.save();

    // Security: Clean up uploaded files and extracted files after successful save
    // This ensures malware files are removed from the server immediately
    const cleanupPromises = [];
    
    // Clean up original uploaded files
    cleanupPromises.push(...files.map((f) => 
      fs.unlink(f.path).catch((err) => {
        console.error(`[Scan ID: ${scanId}] Failed to delete uploaded file ${f.path}:`, err);
        // Try again after a short delay
        setTimeout(() => fs.unlink(f.path).catch(() => {}), 1000);
      })
    ));
    
    // Clean up extracted files and directory (if ZIP was extracted)
    if (extractPath) {
      cleanupPromises.push(
        zipExtractor.cleanup(extractPath).then(() => {
          console.log(`[Scan ID: ${scanId}] Cleaned up extracted files from: ${extractPath}`);
        }).catch((err) => {
          console.error(`[Scan ID: ${scanId}] Failed to cleanup extraction directory:`, err);
        })
      );
    }
    
    await Promise.all(cleanupPromises);

    // Update user scan count
    await User.findByIdAndUpdate(req.user.userId, {
      $inc: { "usage.scans": 1 },
    });

    res.json({
      scanId,
      message: isZip 
        ? `ZIP file extracted and analyzed. ${extractedFiles ? extractedFiles.length : 0} file(s) scanned.`
        : textFiles.length > 0 
          ? "Files analyzed successfully" 
          : "Threat intelligence analysis completed (binary files - AI code analysis skipped)",
      files: isZip && extractedFiles 
        ? extractedFiles.map((f) => f.name) 
        : files.map((f) => f.originalname || f.name),
      isZip: isZip,
      zipFileName: isZip ? files[0].originalname : null,
      extractedFileCount: isZip && extractedFiles ? extractedFiles.length : null,
      vulnerabilities: sanitizedVulnerabilities,
      summary,
      aiInsights: aiResponse.data.aiInsights || null,
      threatIntelligence: threatIntelligenceResults,
      overallSecurity,
      filesAnalyzed: filesToScan.length,
      textFilesAnalyzed: textFiles.length,
      binaryFilesAnalyzed: filesToScan.length - textFiles.length,
      scanDuration,
      malwareWarning: malwareWarning, // Include pre-scan malware warning if detected
    });
  } catch (error) {
    // Security: Ensure files are cleaned up even if an error occurs
    // This prevents malware files from remaining on the server
    if (uploadedFiles && uploadedFiles.length > 0) {
      await Promise.all(uploadedFiles.map((f) => fs.unlink(f.path).catch(() => {})));
    } else if (req.files && req.files.length > 0) {
      // Fallback: clean up all files if uploadedFiles is not set
      await Promise.all(req.files.map((f) => fs.unlink(f.path).catch(() => {})));
    }
    
    // Clean up extracted files if ZIP was extracted
    if (extractPath) {
      await zipExtractor.cleanup(extractPath).catch((err) => {
        console.error(`[Scan ID: ${scanId}] Failed to cleanup extraction directory on error:`, err);
      });
    }
    
    next(error);
  }
});

// Scan URL or Hash
router.post("/url", async (req, res, next) => {
  try {
    const { url, hash, hashType } = req.body;
    
    // Debug logging (commented out for production)
    // console.log("[URL Scan] Request body:", { url, hash, hashType, bodyKeys: Object.keys(req.body) });
    
    // Must provide either URL or hash
    if (!url && !hash) {
      console.error("[URL Scan] Validation failed: Neither URL nor hash provided");
      return res.status(400).json({ error: "Either URL or hash (SHA256, SHA1, or MD5) is required" });
    }

    // If hash is provided, validate hash type and format
    let isValidHash = false;
    let hashToScan = null;
    if (hash) {
      const hashLower = hash.toLowerCase().trim();
      const hashTypeLower = (hashType || "sha256").toLowerCase();
      
      // Validate hash format based on type
      if (hashTypeLower === "sha256" && /^[a-f0-9]{64}$/i.test(hashLower)) {
        isValidHash = true;
        hashToScan = hashLower;
      } else if (hashTypeLower === "sha1" && /^[a-f0-9]{40}$/i.test(hashLower)) {
        isValidHash = true;
        hashToScan = hashLower;
      } else if (hashTypeLower === "md5" && /^[a-f0-9]{32}$/i.test(hashLower)) {
        isValidHash = true;
        hashToScan = hashLower;
      } else {
        return res.status(400).json({ 
          error: "Invalid hash format", 
          message: `Hash must be a valid ${hashTypeLower.toUpperCase()} (${hashTypeLower === "sha256" ? "64" : hashTypeLower === "sha1" ? "40" : "32"} hexadecimal characters)`,
          providedHash: hash,
          providedHashType: hashType || "sha256"
        });
      }
    }

    // If URL is provided, validate URL format or check if it's an IP address
    let isIPAddress = false;
    let ipAddress = null;
    if (url) {
      const trimmedUrl = url.trim();
      
      // Check if it's a valid IP address (IPv4 or IPv6)
      // IPv4 regex: matches 0.0.0.0 to 255.255.255.255
      const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      // IPv6 regex: matches various IPv6 formats including compressed notation
      const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$|^(?:[0-9a-fA-F]{1,4}:)*::(?:[0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$/i;
      
      if (ipv4Regex.test(trimmedUrl) || ipv6Regex.test(trimmedUrl)) {
        isIPAddress = true;
        ipAddress = trimmedUrl;
        // console.log(`[URL Scan] Detected IP address: ${ipAddress}`);
      } else {
        // Try to validate as URL
        try {
          // If it doesn't start with http:// or https://, add https:// for validation
          const urlToValidate = trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://') 
            ? trimmedUrl 
            : `https://${trimmedUrl}`;
          new URL(urlToValidate);
        } catch {
          return res.status(400).json({ error: "Invalid URL or IP address format" });
        }
      }
    }

    // Get user for plan-specific service enablement
    const user = await User.findById(req.user.userId).lean();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const scanId = "scan_" + Date.now();
    const scanStartTime = Date.now();

    // PRIORITIZE: Run threat intelligence scan first
    // If hash is provided, scan hash; otherwise scan URL or IP
    let threatIntelligenceResults = null;
    let overallSecurity = null;
    let scanTarget = url || hashToScan;
    let scanType = hashToScan ? "hash" : (isIPAddress ? "ip" : "url");
    
    try {
      if (hashToScan) {
        // Scan hash using threat intelligence services
        console.log(`[Scan ID: ${scanId}] Scanning hash: ${hashToScan} (${hashType || "sha256"})`);
        threatIntelligenceResults = await unifiedThreatIntelligenceService.scanHash(hashToScan, hashType || "sha256", user.plan, scanId);
      } else if (isIPAddress) {
        // Scan IP address
        console.log(`[Scan ID: ${scanId}] Scanning IP address: ${ipAddress}`);
        threatIntelligenceResults = await unifiedThreatIntelligenceService.scanIP(ipAddress, user.plan, scanId);
      } else {
        // Scan URL
        threatIntelligenceResults = await unifiedThreatIntelligenceService.scanURL(url, user.plan, scanId);
      }
    } catch (threatError) {
      console.error(`[Scan ID: ${scanId}] Threat intelligence scan error:`, threatError);
      // Continue even if threat intelligence fails
      threatIntelligenceResults = null;
    }

    // Then run AI analysis (secondary priority, only for URLs, not for hash-only or IP-only scans)
    let aiResponse = { data: { vulnerabilities: [], summary: {}, aiInsights: null } };
    let sanitizedVulnerabilities = [];
    let summary = { critical: 0, high: 0, medium: 0, low: 0 };
    
    if (url && !isIPAddress) {
      // Only run AI analysis if URL is provided (not for hash-only or IP-only scans)
      try {
        aiResponse = await axios.post(
          `${PYTHON_ENGINE_URL}/api/analyze/url`,
          {
            url,
            scanId,
          },
          {
            timeout: 60000, // 1 minute timeout for URL analysis
          }
        );

      const vulnerabilities = aiResponse.data.vulnerabilities || [];
      
      // Validate and sanitize vulnerabilities before saving
      sanitizedVulnerabilities = vulnerabilities.map((vuln) => {
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
      
        summary = aiResponse.data.summary || { critical: 0, high: 0, medium: 0, low: 0 };
        summary.owaspTop10 = owaspTop10Count;
      } catch (aiError) {
        console.error("AI analysis error (non-critical for URL scanning):", aiError.message);
        // Continue with threat intelligence results even if AI analysis fails
      }
    }

    // Calculate overall security using both threat intelligence and AI results
    try {
      overallSecurity = await unifiedThreatIntelligenceService.calculateOverallSecurity(
        { summary, vulnerabilities: sanitizedVulnerabilities },
        threatIntelligenceResults
      );
    } catch (securityError) {
      console.error("Overall security calculation error:", securityError);
      overallSecurity = { status: "safe", score: 100, summary: "No security issues detected", recommendations: [] };
    }

    // Generate AI insights for threat intelligence (if threat intelligence results exist)
    let threatIntelligenceInsights = null;
    if (threatIntelligenceResults) {
      try {
        // Determine the correct target and type for insights generation
        const insightsTarget = hashToScan 
          ? `Hash (${hashType || "sha256"}): ${hashToScan}`
          : isIPAddress 
            ? ipAddress 
            : url || scanTarget;
        const insightsType = hashToScan ? "hash" : isIPAddress ? "ip" : url ? "url" : "file";
        
        threatIntelligenceInsights = await unifiedThreatIntelligenceService.generateThreatIntelligenceInsights(
          threatIntelligenceResults,
          insightsTarget,
          insightsType
        );
      } catch (insightsError) {
        console.error("Error generating threat intelligence insights:", insightsError);
        // Continue without insights
      }
    }

    const scanDuration = Math.round((Date.now() - scanStartTime) / 1000); // in seconds

      // Save scan to database
      const scan = new Scan({
        userId: req.user.userId,
        scanId,
        type: scanType === "hash" ? "file" : scanType === "ip" ? "ip" : "url", // Use "file" type for hash scans
        target: scanTarget,
        targetDetails: {
          url: url && !isIPAddress ? url : null,
          ip: isIPAddress ? ipAddress : null,
          hash: hashToScan || null,
          hashType: hashToScan ? (hashType || "sha256") : null,
        },
        status: "completed",
        vulnerabilities: sanitizedVulnerabilities,
        summary,
        aiInsights: aiResponse.data?.aiInsights || null,
        scanDuration,
        filesAnalyzed: 0,
        threatIntelligence: threatIntelligenceResults || {},
        threatIntelligenceInsights: threatIntelligenceInsights || null,
        overallSecurity: overallSecurity || { status: "safe", score: 100, summary: "No security issues detected", recommendations: [] },
      });

      await scan.save();

      // Update user scan count
      await User.findByIdAndUpdate(req.user.userId, {
        $inc: { "usage.scans": 1 },
      });

      res.json({
        scanId,
        url: url && !isIPAddress ? url : null,
        ip: isIPAddress ? ipAddress : null,
        hash: hashToScan || null,
        hashType: hashToScan ? (hashType || "sha256") : null,
        scanType: scanType,
        message: hashToScan 
          ? `Hash (${hashType || "sha256"}) analyzed successfully`
          : isIPAddress 
            ? `IP address ${ipAddress} analyzed successfully`
            : "URL analyzed successfully",
        vulnerabilities: sanitizedVulnerabilities,
        summary,
        threatIntelligence: threatIntelligenceResults,
        threatIntelligenceInsights: threatIntelligenceInsights,
        overallSecurity,
        aiInsights: aiResponse.data?.aiInsights || null,
        securityChecks: aiResponse.data?.securityChecks || {},
      });
  } catch (error) {
    next(error);
  }
});

// Scan IP Address
router.post("/ip", async (req, res, next) => {
  try {
    const { ip } = req.body;
    
    if (!ip) {
      return res.status(400).json({ error: "IP address is required" });
    }

    // Validate IP format (IPv4 or IPv6)
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    if (!ipv4Regex.test(ip) && !ipv6Regex.test(ip)) {
      return res.status(400).json({ error: "Invalid IP address format" });
    }

    // Get user for plan-specific service enablement
    const user = await User.findById(req.user.userId).lean();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const scanId = "scan_" + Date.now();
    const scanStartTime = Date.now();

    // PRIORITIZE: Run threat intelligence scan for IP (primary analysis)
    let threatIntelligenceResults = null;
    let overallSecurity = null;
    
    try {
      threatIntelligenceResults = await unifiedThreatIntelligenceService.scanIP(ip, user.plan, scanId);
      
      // Calculate overall security based on threat intelligence results
      overallSecurity = unifiedThreatIntelligenceService.calculateOverallSecurity(
        { summary: { critical: 0, high: 0, medium: 0, low: 0 }, vulnerabilities: [] },
        threatIntelligenceResults
      );
    } catch (threatError) {
      console.error("Threat intelligence IP scan error:", threatError);
      threatIntelligenceResults = null;
      overallSecurity = { status: "safe", score: 100, summary: "No security issues detected", recommendations: [] };
    }

    const scanDuration = Math.round((Date.now() - scanStartTime) / 1000); // in seconds

    // Save scan to database
    const scan = new Scan({
      userId: req.user.userId,
      scanId,
      type: "ip",
      target: ip,
      targetDetails: {
        ip,
      },
      status: "completed",
      vulnerabilities: [],
      summary: { critical: 0, high: 0, medium: 0, low: 0 },
      scanDuration,
      filesAnalyzed: 0,
      threatIntelligence: threatIntelligenceResults || {},
      threatIntelligenceInsights: threatIntelligenceInsights || null,
      overallSecurity: overallSecurity || { status: "safe", score: 100, summary: "No security issues detected", recommendations: [] },
    });

    await scan.save();

    // Update user scan count
    await User.findByIdAndUpdate(req.user.userId, {
      $inc: { "usage.scans": 1 },
    });

    res.json({
      scanId,
      ip,
      message: "IP address analyzed successfully",
      vulnerabilities: [],
      summary: { critical: 0, high: 0, medium: 0, low: 0 },
      threatIntelligence: threatIntelligenceResults,
      threatIntelligenceInsights: threatIntelligenceInsights,
      overallSecurity,
    });
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

    if (type && ["file", "url", "repository", "ip"].includes(type)) {
      query.type = type;
    }

    if (search) {
      query.$or = [
        { target: { $regex: search, $options: "i" } },
        { scanId: { $regex: search, $options: "i" } },
      ];
    }

    // Get scans with pagination (include deleted scans for history visibility)
    const scans = await Scan.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("scanId type target status summary createdAt scanDuration filesAnalyzed deleted deletedAt overallSecurity.status")
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
      overallSecurityStatus: scan.overallSecurity?.status || "safe",
      deleted: scan.deleted || false, // Mark if deleted
      deletedAt: scan.deletedAt || null,
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
      threatIntelligence: scan.threatIntelligence || {},
      overallSecurity: scan.overallSecurity || { status: "safe", score: 100, summary: "No security issues detected", recommendations: [] },
      deleted: scan.deleted || false, // Include deleted status
      deletedAt: scan.deletedAt || null,
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

    // Prevent actions on deleted scans
    if (scan.deleted) {
      return res.status(403).json({ 
        error: "Cannot add chat messages to deleted scan",
        message: "This scan has been deleted and is read-only. It remains in your history for reference but cannot be modified.",
      });
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

    // Prevent actions on deleted scans
    if (scan.deleted) {
      return res.status(403).json({ 
        error: "Cannot edit chat messages in deleted scan",
        message: "This scan has been deleted and is read-only. It remains in your history for reference but cannot be modified.",
      });
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

    // Prevent actions on deleted scans
    if (scan.deleted) {
      return res.status(403).json({ 
        error: "Cannot delete chat messages from deleted scan",
        message: "This scan has been deleted and is read-only. It remains in your history for reference but cannot be modified.",
      });
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

// Delete a scan (soft delete - marks as deleted but keeps in history)
router.delete("/:id", authenticate, async (req, res, next) => {
  try {
    const scan = await Scan.findOne({
      scanId: req.params.id,
      userId: req.user.userId,
    });

    if (!scan) {
      return res.status(404).json({ error: "Scan not found" });
    }

    // Soft delete: mark as deleted instead of actually deleting
    // This maintains the count (price-based model) while allowing history visibility
    scan.deleted = true;
    scan.deletedAt = new Date();
    await scan.save();

    // Note: We do NOT decrement user.usage.scans
    // This ensures the price-based model where counts never decrease
    // The scan count represents the maximum number of scans ever performed, not current scan history
    // Deleted scans remain visible in history but are marked as deleted

    res.json({ message: "Scan deleted successfully" });
  } catch (error) {
    next(error);
  }
});

export default router;

