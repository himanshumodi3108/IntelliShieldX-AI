/**
 * Hash Service - Generate file hashes (MD5, SHA1, SHA256)
 */
import crypto from "crypto";
import fs from "fs/promises";

class HashService {
  /**
   * Generate MD5 hash from file buffer
   */
  async generateMD5(fileBuffer) {
    return crypto.createHash("md5").update(fileBuffer).digest("hex");
  }

  /**
   * Generate SHA1 hash from file buffer
   */
  async generateSHA1(fileBuffer) {
    return crypto.createHash("sha1").update(fileBuffer).digest("hex");
  }

  /**
   * Generate SHA256 hash from file buffer
   */
  async generateSHA256(fileBuffer) {
    return crypto.createHash("sha256").update(fileBuffer).digest("hex");
  }

  /**
   * Generate all hashes from file buffer
   */
  async generateAllHashes(fileBuffer) {
    return {
      md5: await this.generateMD5(fileBuffer),
      sha1: await this.generateSHA1(fileBuffer),
      sha256: await this.generateSHA256(fileBuffer),
    };
  }

  /**
   * Generate hashes from file path
   */
  async generateHashesFromFile(filePath) {
    const fileBuffer = await fs.readFile(filePath);
    return this.generateAllHashes(fileBuffer);
  }
}

export const hashService = new HashService();



