/**
 * ZIP Extraction Utility
 * Handles extraction of ZIP files, including password-protected ones
 * Uses unzipper library for standard ZIP encryption
 * Uses @zip.js/zip.js for AES-encrypted ZIPs (like MalwareBazaar samples)
 * Falls back to 7-Zip command line if zip.js fails
 */
import path from "path";
import fs from "fs/promises";
import unzipper from "unzipper";
import { BlobReader, ZipReader, Uint8ArrayWriter } from "@zip.js/zip.js";
import { exec } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";
import { dirname } from "path";

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ZipExtractor {
  /**
   * Check if a file is a ZIP archive based on extension
   */
  isZipFile(filename) {
    const ext = path.extname(filename).toLowerCase();
    return ext === ".zip";
  }

  /**
   * Verify if a file is actually a valid ZIP by checking file signature
   * @param {string} filePath - Path to the file
   * @returns {Promise<boolean>} True if file is a valid ZIP
   */
  async verifyZipFile(filePath) {
    try {
      const buffer = await fs.readFile(filePath, { start: 0, end: 3 });
      // ZIP files start with "PK" (0x50 0x4B) followed by 0x03 0x04 or 0x05 0x06
      return buffer[0] === 0x50 && buffer[1] === 0x4B && 
             (buffer[2] === 0x03 || buffer[2] === 0x05) &&
             (buffer[3] === 0x04 || buffer[3] === 0x06);
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if 7-Zip is available on the system
   * Checks environment variable first, then common installation paths
   * @returns {Promise<string|null>} Path to 7z executable or null if not found
   */
  async find7Zip() {
    try {
      // First, check if SEVEN_ZIP_PATH environment variable is set (for deployment flexibility)
      if (process.env.SEVEN_ZIP_PATH) {
        try {
          await fs.access(process.env.SEVEN_ZIP_PATH);
          console.log(`[ZipExtractor] Found 7-Zip via SEVEN_ZIP_PATH: ${process.env.SEVEN_ZIP_PATH}`);
          return process.env.SEVEN_ZIP_PATH;
        } catch {
          console.warn(`[ZipExtractor] SEVEN_ZIP_PATH is set but file not found: ${process.env.SEVEN_ZIP_PATH}`);
        }
      }

      // Try common 7-Zip installation paths on Windows
      const possiblePaths = [
        "C:\\Program Files\\7-Zip\\7z.exe",
        "C:\\Program Files (x86)\\7-Zip\\7z.exe",
        process.env.PROGRAMFILES ? `${process.env.PROGRAMFILES}\\7-Zip\\7z.exe` : null,
        process.env["PROGRAMFILES(X86)"] ? `${process.env["PROGRAMFILES(X86)"]}\\7-Zip\\7z.exe` : null,
      ].filter(Boolean);

      for (const zipPath of possiblePaths) {
        try {
          await fs.access(zipPath);
          return zipPath;
        } catch {
          // Continue to next path
        }
      }

      // Try to find 7z in PATH (works for both Windows and Linux)
      try {
        // Test if 7z command is available
        await execAsync("7z --help", { timeout: 5000 });
        return "7z"; // Found in PATH
      } catch {
        // Not in PATH
      }

      // Try Linux/Unix paths
      const linuxPaths = ["/usr/bin/7z", "/usr/local/bin/7z", "/bin/7z"];
      for (const zipPath of linuxPaths) {
        try {
          await fs.access(zipPath);
          return zipPath;
        } catch {
          // Continue to next path
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract ZIP using @zip.js/zip.js (supports AES encryption)
   * SECURITY NOTE: This extracts files to disk temporarily. Files are cleaned up immediately after scanning.
   * Files are NEVER executed - only read for analysis (hash generation, threat intelligence).
   * @param {string} zipPath - Path to the ZIP file
   * @param {string} password - Password for password-protected ZIPs
   * @param {string} extractTo - Directory to extract to
   * @returns {Promise<Array<{name: string, path: string, size: number, buffer: Buffer}>>} Extracted files
   */
  async extractWithZipJs(zipPath, password, extractTo) {
    console.log(`[ZipExtractor] Using @zip.js/zip.js for extraction`);
    console.log(`[ZipExtractor] SECURITY: Extracting to isolated directory: ${extractTo}`);
    console.log(`[ZipExtractor] SECURITY: Files will be cleaned up immediately after scanning`);

    try {
      // Read the ZIP file as a buffer
      const zipBuffer = await fs.readFile(zipPath);
      
      // Create a BlobReader from the buffer
      // Note: In Node.js 18+, Blob is available globally
      const zipFileReader = new BlobReader(new Blob([zipBuffer]));
      
      // Create ZipReader (password is passed when getting data, not in constructor)
      const zipReader = new ZipReader(zipFileReader);
      
      // Get all entries
      const entries = await zipReader.getEntries();
      
      if (entries.length === 0) {
        await zipReader.close();
        throw new Error("ZIP file is empty or contains no extractable files");
      }

      const extractedFiles = [];

      // Extract each entry
      for (const entry of entries) {
        // Skip directories
        if (entry.directory) {
          continue;
        }

        try {
          console.log(`[ZipExtractor] Extracting entry: ${entry.filename}`);

          // Create a writer to get the file data
          const writer = new Uint8ArrayWriter();
          
          // Get the file data (pass password in options if provided)
          // zip.js will automatically detect if the entry is encrypted and use the password
          const data = await entry.getData(writer, password ? { password } : {});
          
          if (!data || data.length === 0) {
            console.warn(`[ZipExtractor] Entry ${entry.filename} has no data, skipping`);
            continue;
          }

          // Create directory structure if needed
          const entryPath = path.join(extractTo, entry.filename);
          const entryDir = path.dirname(entryPath);
          await fs.mkdir(entryDir, { recursive: true });

          // Convert Uint8Array to Buffer
          const buffer = Buffer.from(data);

          // Write file to disk
          await fs.writeFile(entryPath, buffer);

          // Get file stats
          const stats = await fs.stat(entryPath);

          extractedFiles.push({
            name: path.basename(entry.filename),
            path: entryPath,
            size: stats.size,
            buffer: buffer,
            relativePath: entry.filename.replace(/\\/g, '/'), // Use forward slashes
          });

          console.log(`[ZipExtractor] ✓ Extracted: ${entry.filename} (${stats.size} bytes)`);
        } catch (entryError) {
          const errorMsg = entryError.message || entryError.toString() || "Unknown error";
          console.error(`[ZipExtractor] Error extracting ${entry.filename}:`, errorMsg);
          
          // If it's a password error, close reader and re-throw
          if (errorMsg.toLowerCase().includes("password") || 
              errorMsg.toLowerCase().includes("decrypt") ||
              errorMsg.toLowerCase().includes("wrong password")) {
            await zipReader.close();
            throw new Error("ZIP file password is incorrect. Please verify the password.");
          }
          
          // For other errors, continue with other entries
        }
      }

      // Close the reader
      await zipReader.close();

      if (extractedFiles.length === 0) {
        throw new Error("ZIP file is empty or contains no extractable files");
      }

      console.log(`[ZipExtractor] SECURITY: Read ${extractedFiles.length} file(s) for analysis (files will not be executed)`);
      console.log(`[ZipExtractor] Successfully extracted ${extractedFiles.length} file(s) from ZIP using @zip.js/zip.js`);

      return extractedFiles;
    } catch (error) {
      const errorMsg = error.message || error.toString() || "Unknown error";
      const lowerErrorMsg = errorMsg.toLowerCase();
      
      if (lowerErrorMsg.includes("wrong password") || 
          lowerErrorMsg.includes("incorrect password") ||
          lowerErrorMsg.includes("bad password") ||
          lowerErrorMsg.includes("decrypt") ||
          lowerErrorMsg.includes("password")) {
        throw new Error("ZIP file password is incorrect. Please verify the password.");
      }
      
      throw error;
    }
  }

  /**
   * Extract ZIP using 7-Zip (fallback for AES encryption if zip.js fails)
   * SECURITY NOTE: This extracts files to disk temporarily. Files are cleaned up immediately after scanning.
   * Files are NEVER executed - only read for analysis (hash generation, threat intelligence).
   * @param {string} zipPath - Path to the ZIP file
   * @param {string} password - Password for password-protected ZIPs
   * @param {string} extractTo - Directory to extract to
   * @returns {Promise<Array<{name: string, path: string, size: number, buffer: Buffer}>>} Extracted files
   */
  async extractWith7Zip(zipPath, password, extractTo) {
    const sevenZipPath = await this.find7Zip();
    
    if (!sevenZipPath) {
      // Provide helpful error message with deployment instructions
      const errorMsg = "7-Zip is not installed. AES-encrypted ZIP files (like MalwareBazaar samples) require 7-Zip.\n" +
        "Installation options:\n" +
        "1. Windows: Download from https://www.7-zip.org/ and install to default location\n" +
        "2. Linux: sudo apt-get install p7zip-full (Ubuntu/Debian) or sudo yum install p7zip (RHEL/CentOS)\n" +
        "3. Docker: Add 'RUN apt-get update && apt-get install -y p7zip-full' to Dockerfile\n" +
        "4. Or set SEVEN_ZIP_PATH environment variable to point to 7z executable";
      throw new Error(errorMsg);
    }

    console.log(`[ZipExtractor] Using 7-Zip at: ${sevenZipPath}`);
    console.log(`[ZipExtractor] SECURITY: Extracting to isolated directory: ${extractTo}`);
    console.log(`[ZipExtractor] SECURITY: Files will be cleaned up immediately after scanning`);
    
    // Escape password for command line (handle special characters)
    // Use double quotes and escape internal quotes
    const escapedPassword = password.replace(/"/g, '""');
    
    // 7-Zip command: 7z x archive.zip -ooutput_dir -p"password"
    // -x: extract with full paths
    // -o: output directory (no space after -o)
    // -p: password
    // -y: assume yes to all prompts
    // SECURITY: Extract to isolated temp directory, never to system directories
    const command = `"${sevenZipPath}" x "${zipPath}" -o"${extractTo}" -p"${escapedPassword}" -y`;
    
    console.log(`[ZipExtractor] Executing 7-Zip command...`);
    
    try {
      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        timeout: 60000, // 60 second timeout for extraction
      });
      
      if (stderr && !stderr.includes("Everything is Ok")) {
        console.warn(`[ZipExtractor] 7-Zip stderr:`, stderr);
      }
      
      console.log(`[ZipExtractor] 7-Zip extraction completed`);
      
      // Read extracted files
      // SECURITY: Only read file contents, never execute
      const extractedFiles = [];
      await this.readExtractedFiles(extractTo, extractTo, extractedFiles);
      
      console.log(`[ZipExtractor] SECURITY: Read ${extractedFiles.length} file(s) for analysis (files will not be executed)`);
      
      return extractedFiles;
    } catch (error) {
      const errorMsg = error.message || error.toString() || "Unknown error";
      const lowerErrorMsg = errorMsg.toLowerCase();
      
      if (lowerErrorMsg.includes("wrong password") || 
          lowerErrorMsg.includes("incorrect password") ||
          lowerErrorMsg.includes("bad password") ||
          lowerErrorMsg.includes("cannot open encrypted archive")) {
        throw new Error("ZIP file password is incorrect. Please verify the password.");
      }
      
      throw error;
    }
  }

  /**
   * Recursively read extracted files from directory
   * @param {string} dir - Directory to read from
   * @param {string} baseDir - Base extraction directory
   * @param {Array} extractedFiles - Array to populate with file info
   */
  async readExtractedFiles(dir, baseDir, extractedFiles) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath);
      
      if (entry.isDirectory()) {
        await this.readExtractedFiles(fullPath, baseDir, extractedFiles);
      } else if (entry.isFile()) {
        const stats = await fs.stat(fullPath);
        const buffer = await fs.readFile(fullPath);
        
        extractedFiles.push({
          name: entry.name,
          path: fullPath,
          size: stats.size,
          buffer: buffer,
          relativePath: relativePath.replace(/\\/g, '/'), // Use forward slashes for relative path
        });
      }
    }
  }

  /**
   * Extract ZIP file to a temporary directory
   * @param {string} zipPath - Path to the ZIP file
   * @param {string} password - Optional password for password-protected ZIPs
   * @param {string} extractTo - Optional directory to extract to (defaults to temp directory)
   * @returns {Promise<Array<{name: string, path: string, size: number, buffer: Buffer}>>} Extracted files
   */
  async extractZip(zipPath, password = null, extractTo = null) {
    try {
      // Create temporary extraction directory if not provided
      if (!extractTo) {
        const tempDir = path.join(__dirname, "../../temp_extractions");
        await fs.mkdir(tempDir, { recursive: true });
        extractTo = path.join(tempDir, `extract_${Date.now()}_${Math.random().toString(36).substring(7)}`);
      }
      
      await fs.mkdir(extractTo, { recursive: true });

      console.log(`[ZipExtractor] Opening ZIP file${password ? ` with password: "${password}" (length: ${password.length})` : " (no password)"}`);

      // First, try with unzipper (for standard ZIP encryption)
      try {
        const directory = await unzipper.Open.file(zipPath);
        
        const extractedFiles = [];

        // Extract each file
        for (const file of directory.files) {
          // Skip directories
          if (file.type === 'Directory') {
            continue;
          }

          try {
            console.log(`[ZipExtractor] Extracting entry: ${file.path}`);

            // Get file content - pass password if provided
            const content = password 
              ? await file.buffer(password)
              : await file.buffer();

            if (!content || content.length === 0) {
              console.warn(`[ZipExtractor] Entry ${file.path} has no data, skipping`);
              continue;
            }

            // Create directory structure if needed
            const entryPath = path.join(extractTo, file.path);
            const entryDir = path.dirname(entryPath);
            await fs.mkdir(entryDir, { recursive: true });

            // Write file
            await fs.writeFile(entryPath, content);

            // Get file stats
            const stats = await fs.stat(entryPath);

            extractedFiles.push({
              name: file.path,
              path: entryPath,
              size: stats.size,
              buffer: content,
              relativePath: file.path,
            });

            console.log(`[ZipExtractor] ✓ Extracted: ${file.path} (${stats.size} bytes)`);
          } catch (entryError) {
            const errorMsg = entryError.message || entryError.toString() || "Unknown error";
            const lowerErrorMsg = errorMsg.toLowerCase();

            // If it's a password error and we have a password, try zip.js for AES encryption
            if (password && (lowerErrorMsg.includes("password") || 
                lowerErrorMsg.includes("bad_password") ||
                entryError.code === "BAD_PASSWORD")) {
              console.log(`[ZipExtractor] unzipper failed with password error, trying @zip.js/zip.js for AES encryption support...`);
              throw entryError; // Will be caught by outer try-catch
            }

            console.error(`[ZipExtractor] Error extracting ${file.path}:`, errorMsg);
            // For other errors, continue with other entries
          }
        }

        if (extractedFiles.length > 0) {
          console.log(`[ZipExtractor] Successfully extracted ${extractedFiles.length} file(s) from ZIP using unzipper`);
          return {
            files: extractedFiles,
            extractPath: extractTo,
          };
        }
      } catch (unzipperError) {
        const errorMsg = unzipperError.message || unzipperError.toString() || "Unknown error";
        const lowerErrorMsg = errorMsg.toLowerCase();
        
        // If unzipper fails with password error and we have a password, try zip.js for AES encryption
        if (password && (lowerErrorMsg.includes("password") || 
            lowerErrorMsg.includes("bad_password") ||
            unzipperError.code === "BAD_PASSWORD")) {
          console.log(`[ZipExtractor] unzipper doesn't support this encryption method, trying @zip.js/zip.js...`);
          
          try {
            const extractedFiles = await this.extractWithZipJs(zipPath, password, extractTo);
            
            if (extractedFiles.length === 0) {
              throw new Error("ZIP file is empty or contains no extractable files");
            }
            
            console.log(`[ZipExtractor] Successfully extracted ${extractedFiles.length} file(s) from ZIP using @zip.js/zip.js`);
            return {
              files: extractedFiles,
              extractPath: extractTo,
            };
          } catch (zipJsError) {
            // If zip.js also fails, try 7-Zip as final fallback
            console.log(`[ZipExtractor] @zip.js/zip.js failed, trying 7-Zip as final fallback...`);
            
            try {
              const extractedFiles = await this.extractWith7Zip(zipPath, password, extractTo);
              
              if (extractedFiles.length === 0) {
                throw new Error("ZIP file is empty or contains no extractable files");
              }
              
              console.log(`[ZipExtractor] Successfully extracted ${extractedFiles.length} file(s) from ZIP using 7-Zip`);
              return {
                files: extractedFiles,
                extractPath: extractTo,
              };
            } catch (sevenZipError) {
              // If all methods fail, throw the original error
              throw unzipperError;
            }
          }
        }
        
        // If it's not a password error, re-throw
        throw unzipperError;
      }

      // This should never be reached, but just in case
      throw new Error("Failed to extract ZIP file");
    } catch (error) {
      // Check if it's a password error
      const errorMsg = error.message || error.toString() || "Unknown error";
      const lowerErrorMsg = errorMsg.toLowerCase();
      
      if (lowerErrorMsg.includes("password") || 
          lowerErrorMsg.includes("wrong password") ||
          lowerErrorMsg.includes("incorrect password") ||
          lowerErrorMsg.includes("bad password") ||
          lowerErrorMsg.includes("bad decrypt") ||
          lowerErrorMsg.includes("decryption") ||
          lowerErrorMsg.includes("encrypted") ||
          error.code === "BAD_PASSWORD") {
        throw new Error("ZIP file is password-protected. Please provide the correct password.");
      }
      
      // Check if file is not a valid ZIP
      if (lowerErrorMsg.includes("invalid") || 
          lowerErrorMsg.includes("corrupt") ||
          lowerErrorMsg.includes("not a zip") ||
          lowerErrorMsg.includes("end of central directory") ||
          error.code === "INVALID_ZIP") {
        throw new Error("The file is not a valid ZIP archive or is corrupted.");
      }
      
      // Re-throw the original error if it's already our custom error
      if (errorMsg.includes("ZIP file is password-protected") || 
          errorMsg.includes("ZIP file is empty")) {
        throw error;
      }
      
      // Generic error
      throw new Error(`Failed to extract ZIP file: ${errorMsg}`);
    }
  }

  /**
   * Clean up extracted files
   * @param {string} extractPath - Path to the extraction directory
   */
  async cleanup(extractPath) {
    try {
      if (extractPath && await fs.access(extractPath).then(() => true).catch(() => false)) {
        await fs.rm(extractPath, { recursive: true, force: true });
      }
    } catch (error) {
      console.error(`Failed to cleanup extraction directory ${extractPath}:`, error.message);
    }
  }

  /**
   * Clean up all temporary extraction directories (for maintenance)
   */
  async cleanupAll() {
    try {
      const tempDir = path.join(__dirname, "../../temp_extractions");
      if (await fs.access(tempDir).then(() => true).catch(() => false)) {
        const entries = await fs.readdir(tempDir);
        for (const entry of entries) {
          const entryPath = path.join(tempDir, entry);
          try {
            const stats = await fs.stat(entryPath);
            if (stats.isDirectory()) {
              await fs.rm(entryPath, { recursive: true, force: true });
            }
          } catch (error) {
            console.error(`Failed to cleanup ${entryPath}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.error(`Failed to cleanup temporary extraction directories:`, error.message);
    }
  }
}

export const zipExtractor = new ZipExtractor();
