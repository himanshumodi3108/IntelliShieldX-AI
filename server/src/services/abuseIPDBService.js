/**
 * AbuseIPDB Service - IP reputation checking
 * Free tier: 1,000 queries/day
 */
import axios from "axios";

class AbuseIPDBService {
  constructor() {
    this.apiKey = process.env.ABUSEIPDB_API_KEY;
    this.baseUrl = "https://api.abuseipdb.com/api/v2";
    this.rateLimitPerDay = 1000;
    this.requestCount = 0;
    this.requestDate = new Date().toDateString();
  }

  /**
   * Get current API key (re-reads from environment to support updates)
   */
  getApiKey() {
    return process.env.ABUSEIPDB_API_KEY || this.apiKey;
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
   * Check rate limit
   */
  checkRateLimit() {
    const today = new Date().toDateString();
    if (today !== this.requestDate) {
      this.requestCount = 0;
      this.requestDate = today;
    }

    if (this.requestCount >= this.rateLimitPerDay) {
      throw new Error("AbuseIPDB daily limit reached (1,000 requests/day)");
    }

    this.requestCount++;
  }

  /**
   * Extract IP from URL
   */
  extractIPFromURL(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return null;
    }
  }

  /**
   * Check IP reputation
   * According to API docs: GET /check with parameters:
   * - ipAddress (required) - IP address to check (IPv4 or IPv6, should be URL-encoded)
   * - maxAgeInDays (optional, default 30, min 1, max 365) - Only return reports within last X days
   * - verbose (optional flag) - Include reports array and country name in response
   * @param {string} ip - IP address to check
   * @param {string} scanId - Optional scan ID for logging
   * @param {number} maxAgeInDays - Optional, default 90, max 365
   * @param {boolean} verbose - Optional, include detailed reports (default: true)
   */
  async checkIP(ip, scanId = null, maxAgeInDays = 90, verbose = true) {
    const logPrefix = scanId ? `[Scan ID: ${scanId}]` : "[AbuseIPDB Service]";
    
    if (!this.isEnabled()) {
      throw new Error("AbuseIPDB API key not configured");
    }

    this.checkRateLimit();

    try {
      // Build query parameters according to API docs
      const params = {
        ipAddress: ip, // Should be URL-encoded by axios automatically
        maxAgeInDays: Math.min(Math.max(1, maxAgeInDays), 365), // Clamp between 1-365
      };
      
      // Add verbose flag if requested (API expects it as a flag, not a value)
      if (verbose) {
        params.verbose = ""; // Empty string indicates flag is present
      }

      const response = await axios.get(`${this.baseUrl}/check`, {
        headers: {
          Key: this.getApiKey(), // API uses "Key" header (not "api-key")
          Accept: "application/json",
        },
        params: params,
        timeout: 30000,
        validateStatus: (status) => status < 500, // Don't throw on 4xx errors
      });

      // Handle error responses (API returns JSON with errors array)
      if (response.status >= 400) {
        const errorData = response.data;
        if (errorData.errors && Array.isArray(errorData.errors)) {
          const errorMsg = errorData.errors.map(e => e.detail || e.status).join(", ");
          console.error(`${logPrefix} AbuseIPDB API error: HTTP ${response.status} - ${errorMsg}`);
          return {
            scanned: false,
            error: `API error: ${errorMsg}`,
          };
        }
        console.error(`${logPrefix} AbuseIPDB API error: HTTP ${response.status}`, response.data);
        return {
          scanned: false,
          error: `API returned status ${response.status}`,
        };
      }

      // Response structure: { data: { ipAddress, abuseConfidenceScore, ... } }
      const data = response.data?.data;
      if (!data) {
        console.error(`${logPrefix} Invalid response structure from AbuseIPDB:`, response.data);
        return {
          scanned: false,
          error: "Invalid response structure",
        };
      }

      // Extract fields according to official API response structure
      // Note: Field is "abuseConfidenceScore" not "abuseConfidencePercentage"
      const abuseConfidence = data.abuseConfidenceScore !== undefined ? data.abuseConfidenceScore : 0;
      const usageType = data.usageType || "unknown";
      const isp = data.isp || "unknown";
      const countryCode = data.countryCode || "unknown";
      const countryName = data.countryName || null; // Only present with verbose flag
      const isWhitelisted = data.isWhitelisted === true;
      const totalReports = data.totalReports || 0;
      const numDistinctUsers = data.numDistinctUsers || 0;
      const lastReportedAt = data.lastReportedAt || null;
      const isPublic = data.isPublic !== undefined ? data.isPublic : true;
      const ipVersion = data.ipVersion || 4;
      const domain = data.domain || null;
      const hostnames = data.hostnames || [];
      const isTor = data.isTor === true;
      const reports = verbose && data.reports ? data.reports : []; // Only with verbose flag

      console.log(`${logPrefix} AbuseIPDB check completed - IP: ${ip}, Abuse Confidence: ${abuseConfidence}%, Total Reports: ${totalReports}, Country: ${countryCode}`);

      // Construct permalink to view IP on AbuseIPDB
      const ipAddress = data.ipAddress || ip;
      const permalink = ipAddress 
        ? `https://www.abuseipdb.com/check/${ipAddress}`
        : null;

      return {
        scanned: true,
        ip: ipAddress,
        abuseConfidence, // 0-100 score
        usageType,
        isp,
        countryCode,
        countryName,
        isWhitelisted,
        totalReports,
        numDistinctUsers,
        lastReportedAt,
        isPublic,
        ipVersion,
        domain,
        hostnames,
        isTor,
        reports, // Only included if verbose=true
        status: isWhitelisted 
          ? "clean" 
          : abuseConfidence >= 75 
          ? "malicious" 
          : abuseConfidence >= 50 
          ? "suspicious" 
          : "clean",
        threatLevel: this.determineThreatLevel(abuseConfidence, totalReports),
        permalink, // Link to view IP on AbuseIPDB
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        // Handle rate limiting (429)
        if (error.response.status === 429) {
          const retryAfter = error.response.headers['retry-after'] || 0;
          const rateLimitRemaining = error.response.headers['x-ratelimit-remaining'] || 0;
          console.error(`${logPrefix} AbuseIPDB rate limit exceeded. Remaining: ${rateLimitRemaining}, Retry after: ${retryAfter}s`);
          return {
            scanned: false,
            error: `Rate limit exceeded. Retry after ${retryAfter} seconds`,
            rateLimitExceeded: true,
            retryAfter: parseInt(retryAfter),
          };
        }
        console.error(`${logPrefix} AbuseIPDB check error: HTTP ${error.response.status} ${error.response.statusText}`, error.response.data);
      } else if (axios.isAxiosError(error) && error.request) {
        console.error(`${logPrefix} AbuseIPDB network error: No response received`, error.message);
      } else {
        console.error(`${logPrefix} AbuseIPDB check error:`, error.message);
      }
      throw new Error(`AbuseIPDB check failed: ${error.message}`);
    }
  }

  /**
   * Check URL's IP reputation
   * Note: AbuseIPDB only checks IP addresses, not domains/URLs directly.
   * This method extracts the hostname from the URL and checks if it's an IP.
   * For domain names, DNS resolution would be needed (not implemented here).
   * @param {string} url - URL to check
   * @param {string} scanId - Optional scan ID for logging
   * @param {number} maxAgeInDays - Optional, default 90
   * @param {boolean} verbose - Optional, include detailed reports
   */
  async checkURL(url, scanId = null, maxAgeInDays = 90, verbose = true) {
    const logPrefix = scanId ? `[Scan ID: ${scanId}]` : "[AbuseIPDB Service]";
    const hostname = this.extractIPFromURL(url);
    
    if (!hostname) {
      return {
        scanned: false,
        error: "Could not extract hostname from URL",
      };
    }

    // Check if hostname is already an IP address (IPv4 or IPv6)
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    
    if (ipv4Regex.test(hostname) || ipv6Regex.test(hostname)) {
      // It's an IP address, check it directly
      return this.checkIP(hostname, scanId, maxAgeInDays, verbose);
    } else {
      // It's a domain name - AbuseIPDB only works with IPs
      // Note: In a production environment, you might want to resolve the domain to an IP first
      console.warn(`${logPrefix} URL hostname "${hostname}" is a domain, not an IP. AbuseIPDB requires IP addresses.`);
      return {
        scanned: false,
        error: `AbuseIPDB only checks IP addresses. Hostname "${hostname}" is a domain name. DNS resolution not implemented.`,
        hostname: hostname,
      };
    }
  }

  /**
   * Determine threat level
   */
  determineThreatLevel(abuseConfidence, totalReports) {
    if (abuseConfidence >= 75 || totalReports > 50) {
      return "critical";
    }
    if (abuseConfidence >= 50 || totalReports > 20) {
      return "high";
    }
    if (abuseConfidence >= 25 || totalReports > 5) {
      return "medium";
    }
    return "low";
  }
}

export const abuseIPDBService = new AbuseIPDBService();

