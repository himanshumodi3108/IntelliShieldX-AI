/**
 * VirusTotal Service - File, URL, and Hash Scanning (v3 API)
 * Free tier: 4 requests/minute, 500 requests/day
 */
import axios from "axios";

class VirusTotalService {
  constructor() {
    this.apiKey = process.env.VIRUSTOTAL_API_KEY;
    this.baseUrl = "https://www.virustotal.com/api/v3";
    this.rateLimitPerMinute = parseInt(process.env.VIRUSTOTAL_RATE_LIMIT_PER_MINUTE) || 4;
    this.requestQueue = [];
    this.lastRequestTime = 0;
    this.requestCount = 0;
    this.requestWindowStart = Date.now();
  }

  /**
   * Get headers with API key for v3 API
   */
  getHeaders() {
    return {
      "x-apikey": this.getApiKey(),
      "Accept": "application/json",
    };
  }

  /**
   * Get current API key (re-reads from environment to support updates)
   */
  getApiKey() {
    return process.env.VIRUSTOTAL_API_KEY || this.apiKey;
  }

  /**
   * Check if service is enabled and configured
   * Re-reads API key from environment to support hot-reloading
   */
  isEnabled() {
    const apiKey = this.getApiKey();
    return !!apiKey && apiKey.trim() !== "";
  }

  /**
   * Rate limiting: ensure we don't exceed 4 requests/minute
   */
  async waitForRateLimit() {
    const now = Date.now();
    const windowDuration = 60 * 1000; // 1 minute

    // Reset counter if window has passed
    if (now - this.requestWindowStart >= windowDuration) {
      this.requestCount = 0;
      this.requestWindowStart = now;
    }

    // If we've hit the limit, wait until next window
    if (this.requestCount >= this.rateLimitPerMinute) {
      const waitTime = windowDuration - (now - this.requestWindowStart) + 1000; // Add 1 second buffer
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      this.requestCount = 0;
      this.requestWindowStart = Date.now();
    }

    this.requestCount++;
  }

  /**
   * Scan file hash (v3 API)
   * @param {string} hash - File hash (MD5, SHA1, or SHA256)
   * @param {string} scanId - Optional scan ID for logging
   */
  async scanHash(hash, scanId = null) {
    if (!this.isEnabled()) {
      throw new Error("VirusTotal API key not configured");
    }

    const logPrefix = scanId ? `[Scan ID: ${scanId}]` : "[VirusTotal]";
    console.log(`${logPrefix} Querying VirusTotal API v3 with hash: ${hash}`);
    await this.waitForRateLimit();

    try {
      const response = await axios.get(`${this.baseUrl}/files/${hash}`, {
        headers: this.getHeaders(),
        timeout: 30000,
      });
      
      // v3 API response structure
      const data = response.data.data;
      const attributes = data.attributes || {};
      const stats = attributes.stats || {};
      const lastAnalysisResults = attributes.last_analysis_results || {};
      const lastAnalysisStats = attributes.last_analysis_stats || {};

      const positives = lastAnalysisStats.malicious || stats.malicious || 0;
      const total = Object.keys(lastAnalysisResults).length || stats.total || 0;
      const detectionRate = total > 0 ? (positives / total) * 100 : 0;
      
      // Log the hash from VirusTotal response for comparison
      if (attributes.sha256) {
        const hashMatches = attributes.sha256.toLowerCase() === hash.toLowerCase();
        console.log(`${logPrefix} VirusTotal returned SHA256: ${attributes.sha256} (matches query: ${hashMatches ? "YES" : "NO"})`);
        if (!hashMatches) {
          console.warn(`${logPrefix} ⚠ WARNING: Hash mismatch! Query hash: ${hash}, VirusTotal SHA256: ${attributes.sha256}`);
        }
      }

      // Get permalink
      const permalink = `https://www.virustotal.com/gui/file/${attributes.sha256 || hash}`;

      return {
        scanned: true,
        found: true,
        positives,
        total,
        detectionRate: parseFloat(detectionRate.toFixed(2)),
        scanDate: attributes.last_analysis_date || attributes.first_submission_date,
        permalink,
        engines: lastAnalysisResults,
        status: positives > 5 ? "malicious" : positives > 0 ? "suspicious" : "clean",
        virusTotalHash: attributes.sha256,
        // Additional v3 API data
        meaningfulName: attributes.meaningful_name,
        typeDescription: attributes.type_description,
        size: attributes.size,
        tags: attributes.tags || [],
      };
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log(`${logPrefix} Hash not found in VirusTotal database (404)`);
        return {
          scanned: false,
          found: false,
          message: "Hash not found in VirusTotal database",
        };
      }
      console.error(`${logPrefix} Hash scan error:`, error.message);
      if (error.response) {
        console.error(`${logPrefix} Response status: ${error.response.status}, data:`, error.response.data);
      }
      throw new Error(`VirusTotal scan failed: ${error.message}`);
    }
  }

  /**
   * Scan URL (v3 API)
   * @param {string} url - URL to scan
   * @param {string} scanId - Optional scan ID for logging
   */
  async scanURL(url, scanId = null) {
    if (!this.isEnabled()) {
      throw new Error("VirusTotal API key not configured");
    }

    const logPrefix = scanId ? `[Scan ID: ${scanId}]` : "[VirusTotal]";
    await this.waitForRateLimit();

    try {
      // v3 API: POST to /urls to submit URL for analysis
      // VirusTotal v3 API requires form-encoded data, not JSON
      const params = new URLSearchParams();
      params.append("url", url);
      
      const submitResponse = await axios.post(
        `${this.baseUrl}/urls`,
        params.toString(),
        {
          headers: {
            ...this.getHeaders(),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          timeout: 30000,
        }
      );

      // v3 API returns analysis ID, need to poll for results
      const analysisId = submitResponse.data.data.id;
      console.log(`${logPrefix} URL submitted for analysis, ID: ${analysisId}`);
      
      // Wait a bit for scan to complete, then get report
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return this.getURLReport(analysisId, scanId);
    } catch (error) {
      console.error(`${logPrefix} VirusTotal URL scan error:`, error.message);
      if (error.response) {
        console.error(`${logPrefix} Response status: ${error.response.status}, data:`, error.response.data);
      }
      throw new Error(`VirusTotal URL scan failed: ${error.message}`);
    }
  }

  /**
   * Get URL scan report (v3 API)
   * @param {string} analysisId - Analysis ID from URL submission
   * @param {string} scanId - Optional scan ID for logging
   */
  async getURLReport(analysisId, scanId = null) {
    const logPrefix = scanId ? `[Scan ID: ${scanId}]` : "[VirusTotal]";
    await this.waitForRateLimit();

    try {
      const response = await axios.get(`${this.baseUrl}/analyses/${analysisId}`, {
        headers: this.getHeaders(),
        timeout: 30000,
      });

      const data = response.data.data;
      const attributes = data.attributes || {};
      const stats = attributes.stats || {};
      const results = attributes.results || {};

      // If analysis is still in progress
      if (attributes.status === "queued" || attributes.status === "in-progress") {
        // Wait and retry once
        await new Promise((resolve) => setTimeout(resolve, 3000));
        return this.getURLReport(analysisId, scanId);
      }

      const positives = stats.malicious || 0;
      const total = Object.keys(results).length || stats.total || 0;
      const detectionRate = total > 0 ? (positives / total) * 100 : 0;

      // Get URL from metadata if available
      const url = attributes.url || "";
      const urlId = attributes.url_id || "";
      const permalink = urlId ? `https://www.virustotal.com/gui/url/${urlId}` : "";

      return {
        scanned: true,
        found: positives > 0,
        positives,
        total,
        detectionRate: parseFloat(detectionRate.toFixed(2)),
        scanDate: attributes.date || new Date().toISOString(),
        permalink,
        engines: results,
        status: positives > 5 ? "malicious" : positives > 0 ? "suspicious" : "clean",
        url: url,
      };
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return {
          scanned: false,
          found: false,
          message: "URL analysis not found",
        };
      }
      console.error(`${logPrefix} VirusTotal URL report error:`, error.message);
      if (error.response) {
        console.error(`${logPrefix} Response status: ${error.response.status}, data:`, error.response.data);
      }
      throw new Error(`VirusTotal URL report failed: ${error.message}`);
    }
  }

  /**
   * Scan IP address (v3 API)
   * @param {string} ip - IP address to scan
   * @param {string} scanId - Optional scan ID for logging
   */
  async scanIP(ip, scanId = null) {
    if (!this.isEnabled()) {
      throw new Error("VirusTotal API key not configured");
    }

    const logPrefix = scanId ? `[Scan ID: ${scanId}]` : "[VirusTotal]";
    await this.waitForRateLimit();

    try {
      const response = await axios.get(`${this.baseUrl}/ip_addresses/${ip}`, {
        headers: this.getHeaders(),
        timeout: 30000,
      });

      const data = response.data.data;
      const attributes = data.attributes || {};
      const lastAnalysisStats = attributes.last_analysis_stats || {};
      const lastAnalysisResults = attributes.last_analysis_results || {};

      const positives = lastAnalysisStats.malicious || 0;
      const total = Object.keys(lastAnalysisResults).length || lastAnalysisStats.total || 0;
      const detectionRate = total > 0 ? (positives / total) * 100 : 0;

      const permalink = `https://www.virustotal.com/gui/ip-address/${ip}`;

      return {
        scanned: true,
        found: positives > 0,
        positives,
        total,
        detectionRate: parseFloat(detectionRate.toFixed(2)),
        scanDate: attributes.last_analysis_date || attributes.first_seen_date,
        permalink,
        engines: lastAnalysisResults,
        status: positives > 5 ? "malicious" : positives > 0 ? "suspicious" : "clean",
        ip: ip,
        // Additional v3 API data
        asn: attributes.asn,
        asOwner: attributes.as_owner,
        country: attributes.country,
        network: attributes.network,
        reputation: attributes.reputation || 0,
        tags: attributes.tags || [],
      };
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log(`${logPrefix} IP address not found in VirusTotal database (404)`);
        return {
          scanned: false,
          found: false,
          message: "IP address not found in VirusTotal database",
        };
      }
      console.error(`${logPrefix} IP scan error:`, error.message);
      if (error.response) {
        console.error(`${logPrefix} Response status: ${error.response.status}, data:`, error.response.data);
      }
      throw new Error(`VirusTotal IP scan failed: ${error.message}`);
    }
  }

  /**
   * Upload and scan file (v3 API - for files < 32MB on free tier, up to 650MB with upload_url)
   * @param {string} filePath - File path
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} password - Optional password for password-protected files
   * @param {string} scanId - Optional scan ID for logging
   */
  async scanFile(filePath, fileBuffer, password = null, scanId = null) {
    if (!this.isEnabled()) {
      throw new Error("VirusTotal API key not configured");
    }

    const logPrefix = scanId ? `[Scan ID: ${scanId}]` : "[VirusTotal]";
    
    // Check file size (32MB limit for direct upload, 650MB with upload_url)
    const maxSize = 32 * 1024 * 1024; // 32MB
    if (fileBuffer.length > maxSize) {
      throw new Error("File size exceeds 32MB limit for VirusTotal free tier direct upload. Use upload_url endpoint for files up to 650MB.");
    }

    await this.waitForRateLimit();

    try {
      const FormData = (await import("form-data")).default || (await import("form-data"));
      const form = new FormData();
      form.append("file", fileBuffer, {
        filename: filePath.split("/").pop() || "file",
      });

      // Add password if provided (for password-protected ZIP files)
      if (password) {
        form.append("password", password);
      }

      const headers = {
        ...this.getHeaders(),
        ...form.getHeaders(),
      };

      const response = await axios.post(`${this.baseUrl}/files`, form, {
        headers: headers,
        timeout: 60000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      // v3 API returns analysis ID
      const analysisId = response.data.data.id;
      console.log(`${logPrefix} File uploaded, analysis ID: ${analysisId}`);
      
      // Wait a bit for scan to complete, then get the file hash from analysis
      await new Promise((resolve) => setTimeout(resolve, 3000));
      
      // Get analysis result to extract file hash
      try {
        const analysisResponse = await axios.get(`${this.baseUrl}/analyses/${analysisId}`, {
          headers: this.getHeaders(),
          timeout: 30000,
        });

        const analysisData = analysisResponse.data.data;
        const fileHash = analysisData.attributes?.sha256;
        
        if (fileHash) {
          // Use the hash to get full file report
          return this.scanHash(fileHash, scanId);
        } else {
          // If hash not available yet, return analysis result
          const stats = analysisData.attributes?.stats || {};
          return {
            scanned: true,
            found: (stats.malicious || 0) > 0,
            positives: stats.malicious || 0,
            total: stats.total || 0,
            detectionRate: stats.total > 0 ? ((stats.malicious || 0) / stats.total) * 100 : 0,
            status: (stats.malicious || 0) > 5 ? "malicious" : (stats.malicious || 0) > 0 ? "suspicious" : "clean",
            analysisId: analysisId,
          };
        }
      } catch (analysisError) {
        // If analysis lookup fails, return basic success
        return {
          scanned: true,
          found: false,
          analysisId: analysisId,
          message: "File uploaded successfully, analysis in progress",
        };
      }
    } catch (error) {
      console.error(`${logPrefix} VirusTotal file scan error:`, error.message);
      if (error.response) {
        console.error(`${logPrefix} Response status: ${error.response.status}, data:`, error.response.data);
      }
      throw new Error(`VirusTotal file scan failed: ${error.message}`);
    }
  }
}

export const virusTotalService = new VirusTotalService();

