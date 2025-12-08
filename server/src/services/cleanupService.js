/**
 * Cleanup Service
 * Handles automatic cleanup of temporary files and extraction directories
 */
import { zipExtractor } from "../utils/zipExtractor.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class CleanupService {
  constructor() {
    this.isRunning = false;
    this.cleanupInterval = null;
  }

  /**
   * Start the cleanup service
   * @param {number} maxAgeHours - Maximum age in hours for extraction directories (default: 24)
   * @param {number} intervalMinutes - Cleanup interval in minutes (default: 360 = 6 hours)
   */
  start(maxAgeHours = 24, intervalMinutes = 360) {
    if (this.isRunning) {
      console.warn("[Cleanup Service] Service is already running");
      return;
    }

    this.maxAgeHours = maxAgeHours;
    this.intervalMinutes = intervalMinutes;

    // Run cleanup immediately on start
    this.cleanupOldExtractions().catch((err) => {
      console.error("[Cleanup Service] Initial cleanup failed:", err);
    });

    // Schedule periodic cleanup using setInterval
    const intervalMs = intervalMinutes * 60 * 1000;
    this.cleanupInterval = setInterval(() => {
      console.log(`[Cleanup Service] Running scheduled cleanup (max age: ${maxAgeHours} hours)`);
      this.cleanupOldExtractions().catch((err) => {
        console.error("[Cleanup Service] Scheduled cleanup failed:", err);
      });
    }, intervalMs);

    this.isRunning = true;
    console.log(`[Cleanup Service] Started with interval: ${intervalMinutes} minutes, max age: ${maxAgeHours} hours`);
  }

  /**
   * Stop the cleanup service
   */
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.isRunning = false;
    console.log("[Cleanup Service] Stopped");
  }

  /**
   * Clean up old extraction directories
   * Removes directories older than maxAgeHours
   */
  async cleanupOldExtractions() {
    try {
      const tempDir = path.join(__dirname, "../../temp_extractions");
      
      // Check if temp directory exists
      try {
        await fs.access(tempDir);
      } catch {
        // Directory doesn't exist, nothing to clean
        return;
      }

      const entries = await fs.readdir(tempDir);
      const now = Date.now();
      const maxAgeMs = this.maxAgeHours * 60 * 60 * 1000;
      let cleanedCount = 0;
      let failedCount = 0;

      for (const entry of entries) {
        const entryPath = path.join(tempDir, entry);
        
        try {
          // Get directory stats
          const stats = await fs.stat(entryPath);
          
          // Check if it's a directory and if it's older than maxAgeHours
          if (stats.isDirectory()) {
            const age = now - stats.mtimeMs;
            
            if (age > maxAgeMs) {
              // Directory is older than max age, delete it
              await fs.rm(entryPath, { recursive: true, force: true });
              cleanedCount++;
              console.log(`[Cleanup Service] Removed old extraction directory: ${entry} (age: ${Math.round(age / (60 * 60 * 1000))} hours)`);
            }
          } else {
            // It's a file, remove it
            await fs.unlink(entryPath);
            cleanedCount++;
            console.log(`[Cleanup Service] Removed file: ${entry}`);
          }
        } catch (error) {
          failedCount++;
          console.error(`[Cleanup Service] Failed to cleanup ${entry}:`, error.message);
        }
      }

      if (cleanedCount > 0 || failedCount > 0) {
        console.log(`[Cleanup Service] Cleanup completed: ${cleanedCount} removed, ${failedCount} failed`);
      }
    } catch (error) {
      console.error("[Cleanup Service] Error during cleanup:", error);
    }
  }

  /**
   * Clean up all extraction directories immediately (for maintenance)
   */
  async cleanupAll() {
    try {
      await zipExtractor.cleanupAll();
      console.log("[Cleanup Service] All extraction directories cleaned up");
    } catch (error) {
      console.error("[Cleanup Service] Failed to cleanup all directories:", error);
    }
  }

  /**
   * Get cleanup statistics
   */
  async getStats() {
    try {
      const tempDir = path.join(__dirname, "../../temp_extractions");
      
      try {
        await fs.access(tempDir);
      } catch {
        return {
          totalDirectories: 0,
          totalSize: 0,
          oldestDirectory: null,
        };
      }

      const entries = await fs.readdir(tempDir);
      let totalSize = 0;
      let oldestTime = Date.now();
      let oldestName = null;

      for (const entry of entries) {
        const entryPath = path.join(tempDir, entry);
        try {
          const stats = await fs.stat(entryPath);
          
          if (stats.isDirectory()) {
            // Calculate directory size (recursive)
            const size = await this.getDirectorySize(entryPath);
            totalSize += size;
            
            if (stats.mtimeMs < oldestTime) {
              oldestTime = stats.mtimeMs;
              oldestName = entry;
            }
          } else {
            totalSize += stats.size;
          }
        } catch (error) {
          // Ignore errors for individual entries
        }
      }

      return {
        totalDirectories: entries.length,
        totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        oldestDirectory: oldestName,
        oldestAge: oldestName ? Math.round((Date.now() - oldestTime) / (60 * 60 * 1000)) : null,
        isRunning: this.isRunning,
        intervalMinutes: this.intervalMinutes,
        maxAgeHours: this.maxAgeHours,
      };
    } catch (error) {
      console.error("[Cleanup Service] Error getting stats:", error);
      return null;
    }
  }

  /**
   * Calculate directory size recursively
   */
  async getDirectorySize(dirPath) {
    let size = 0;
    try {
      const entries = await fs.readdir(dirPath);
      
      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry);
        const stats = await fs.stat(entryPath);
        
        if (stats.isDirectory()) {
          size += await this.getDirectorySize(entryPath);
        } else {
          size += stats.size;
        }
      }
    } catch (error) {
      // Ignore errors
    }
    
    return size;
  }
}

export const cleanupService = new CleanupService();

