/**
 * Utility to detect password-protected files
 * Supports: ZIP, PDF, DOCX, XLSX, PPTX
 */
import path from "path";
import fs from "fs/promises";

class PasswordProtectedFileDetector {
  /**
   * Check if file extension indicates a potentially password-protected file type
   */
  isPotentiallyPasswordProtected(filename) {
    const ext = path.extname(filename).toLowerCase();
    const protectedExtensions = [".zip", ".rar", ".7z", ".pdf", ".docx", ".xlsx", ".pptx", ".doc", ".xls", ".ppt"];
    return protectedExtensions.includes(ext);
  }

  /**
   * Attempt to detect if a ZIP file is password-protected
   * This is a basic check - actual password protection requires attempting to extract
   */
  async isZipPasswordProtected(filePath) {
    try {
      // Try to read the ZIP file header
      // ZIP files with password protection have specific markers
      const buffer = await fs.readFile(filePath);
      const header = buffer.slice(0, 4);
      
      // Check for ZIP file signature (PK\x03\x04 or PK\x05\x06)
      if (header[0] === 0x50 && header[1] === 0x4B) {
        // For encrypted ZIP files, the general purpose bit flag (bit 0) is set
        // This is a basic check - we'll rely on user input or service errors
        return null; // Cannot definitively determine without attempting extraction
      }
      return false;
    } catch (error) {
      return null; // Cannot determine
    }
  }

  /**
   * Attempt to detect if a PDF is password-protected
   */
  async isPdfPasswordProtected(filePath) {
    try {
      const buffer = await fs.readFile(filePath);
      const content = buffer.toString("utf-8", 0, Math.min(1024, buffer.length));
      
      // Check for encryption dictionary markers
      if (content.includes("/Encrypt") || content.includes("/Filter/Standard")) {
        // PDF might be encrypted - check for encryption dictionary
        const encryptIndex = content.indexOf("/Encrypt");
        if (encryptIndex !== -1) {
          // Check if encryption is present (not just a reference)
          const afterEncrypt = content.substring(encryptIndex, encryptIndex + 200);
          if (afterEncrypt.match(/\d+\s+\d+\s+R/)) {
            // This is a reference, might not be encrypted
            return null;
          }
          return true; // Likely encrypted
        }
      }
      return false;
    } catch (error) {
      return null; // Cannot determine
    }
  }

  /**
   * Check if Office document (DOCX, XLSX, PPTX) is password-protected
   * Office documents are ZIP archives, so we check for encryption info
   */
  async isOfficeDocumentPasswordProtected(filePath) {
    try {
      const buffer = await fs.readFile(filePath);
      const content = buffer.toString("utf-8", 0, Math.min(2048, buffer.length));
      
      // Office documents are ZIP files, check for encryption info
      // Encrypted Office documents have specific markers
      if (content.includes("EncryptionInfo") || content.includes("EncryptedPackage")) {
        return true;
      }
      return false;
    } catch (error) {
      return null; // Cannot determine
    }
  }

  /**
   * Detect if a file is potentially password-protected
   * Returns: { isProtected: boolean | null, type: string }
   * null means cannot determine without attempting to open
   */
  async detectPasswordProtection(filePath, filename) {
    const ext = path.extname(filename).toLowerCase();
    
    if (!this.isPotentiallyPasswordProtected(filename)) {
      return { isProtected: false, type: "not_supported" };
    }

    try {
      if (ext === ".zip" || ext === ".rar" || ext === ".7z") {
        const result = await this.isZipPasswordProtected(filePath);
        return { isProtected: result, type: "archive" };
      } else if (ext === ".pdf") {
        const result = await this.isPdfPasswordProtected(filePath);
        return { isProtected: result, type: "pdf" };
      } else if ([".docx", ".xlsx", ".pptx", ".doc", ".xls", ".ppt"].includes(ext)) {
        const result = await this.isOfficeDocumentPasswordProtected(filePath);
        return { isProtected: result, type: "office" };
      }
      
      return { isProtected: null, type: "unknown" };
    } catch (error) {
      console.error("Error detecting password protection:", error);
      return { isProtected: null, type: "error" };
    }
  }
}

export const passwordProtectedFileDetector = new PasswordProtectedFileDetector();



