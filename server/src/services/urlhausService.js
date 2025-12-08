/**
 * URLhaus Service - URL reputation checking
 * According to API docs: Free, unlimited, no API key required for queries
 * API for automated bulk queries: https://urlhaus-api.abuse.ch/v1/
 * Note: Submissions require Auth-Key, but queries do not
 */
import axios from "axios";

class URLhausService {
  constructor() {
    this.baseUrl = "https://urlhaus-api.abuse.ch/v1";
  }

  /**
   * Service is always enabled (free, no key required for queries)
   */
  isEnabled() {
    return true;
  }

  /**
   * Query URL reputation
   * According to API docs: POST to /url/ with JSON body containing { url: "..." }
   * @param {string} url - URL to query
   * @param {string} scanId - Optional scan ID for logging
   */
  async queryURL(url, scanId = null) {
    // Store original URL for permalink construction
    const originalUrl = url;
    const logPrefix = scanId ? `[Scan ID: ${scanId}]` : "[URLhaus Service]";
    
    try {
      // URLhaus API endpoint for URL lookup
      // POST to /url/ with JSON body: { url: "..." }
      const response = await axios.post(
        `${this.baseUrl}/url/`,
        {
          url: url,
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "IntelliShieldX/1.0 (Security Scanner)",
          },
          timeout: 30000,
          validateStatus: (status) => status < 500, // Don't throw on 4xx errors
        }
      );

      // Handle error responses
      if (response.status >= 400) {
        console.error(`${logPrefix} URLhaus API returned error status ${response.status}:`, response.data);
        return {
          scanned: false,
          found: false,
          status: "unknown",
          error: `API returned status ${response.status}`,
        };
      }

      // Response structure: { query_status: "ok" | "no_results", ... }
      const queryStatus = response.data?.query_status;

      if (queryStatus === "no_results") {
        console.log(`${logPrefix} URL not found in URLhaus database`);
        return {
          scanned: true,
          found: false,
          status: "clean",
          message: "URL not found in URLhaus database",
        };
      }

      if (queryStatus === "ok") {
        const data = response.data;
        const threat = data.threat || "unknown";
        const tags = Array.isArray(data.tags) ? data.tags : (data.tags ? [data.tags] : []);
        const urlStatus = data.url_status || "unknown";
        const dateAdded = data.date_added || null;
        const urlId = data.id || null;
        const dateAddedTimestamp = data.dateadded || null;
        const threatType = data.threat || null;
        const payloads = data.payloads || [];
        const reporter = data.reporter || null;
        const larted = data.larted || null; // Last seen timestamp

        console.log(`${logPrefix} URLhaus URL found - Status: ${urlStatus}, Threat: ${threat}, Tags: ${tags.join(", ") || "none"}`);

        // Construct permalink to view URL on URLhaus
        // Use urlId if available, otherwise construct from the queried URL
        const permalink = urlId 
          ? `https://urlhaus.abuse.ch/url/${urlId}/`
          : (originalUrl ? `https://urlhaus.abuse.ch/browse.php?search=${encodeURIComponent(originalUrl)}` : null);

        return {
          scanned: true,
          found: true,
          status: urlStatus === "online" ? "malicious" : urlStatus === "offline" ? "suspicious" : "unknown",
          threat,
          threatType,
          tags,
          dateAdded,
          dateAddedTimestamp,
          urlStatus,
          urlId,
          url: originalUrl, // Store the original URL for permalink construction
          payloads, // Array of payload hashes
          reporter,
          lastSeen: larted,
          threatLevel: this.determineThreatLevel(threat, tags, urlStatus),
          permalink, // Link to view URL on URLhaus
        };
      }

      // Unknown query status
      console.warn(`${logPrefix} URLhaus returned unknown query_status: ${queryStatus}`);
      return {
        scanned: true,
        found: false,
        status: "unknown",
        message: `Unknown query status: ${queryStatus}`,
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status;
        const statusText = error.response.statusText;
        const responseData = error.response.data;
        
        if (status === 401) {
          // 401 Unauthorized - may occur with IP restrictions
          console.warn(`${logPrefix} URLhaus API returned 401 Unauthorized - service may have IP restrictions`);
          return {
            scanned: false,
            found: false,
            status: "unknown",
            error: "Service may have IP restrictions",
          };
        } else if (status === 429) {
          console.warn(`${logPrefix} URLhaus API returned 429 Too Many Requests - rate limit exceeded`);
          return {
            scanned: false,
            found: false,
            status: "unknown",
            error: "Rate limit exceeded",
            rateLimitExceeded: true,
          };
        } else if (status >= 500) {
          console.error(`${logPrefix} URLhaus API server error: ${status} ${statusText}`, responseData);
        } else {
          console.error(`${logPrefix} URLhaus API error: ${status} ${statusText}`, responseData);
        }
        
        return {
          scanned: false,
          found: false,
          status: "unknown",
          error: `HTTP ${status}: ${statusText}`,
        };
      } else if (axios.isAxiosError(error) && error.request) {
        console.error(`${logPrefix} URLhaus network error: No response received`, error.message);
        return {
          scanned: false,
          found: false,
          status: "unknown",
          error: "Network error - service unreachable",
        };
      } else {
        console.error(`${logPrefix} URLhaus query error:`, error.message);
        return {
          scanned: false,
          found: false,
          status: "unknown",
          error: error.message,
        };
      }
    }
  }

  /**
   * Determine threat level based on threat type, tags, and URL status
   */
  determineThreatLevel(threat, tags, urlStatus) {
    const threatLower = (threat || "").toLowerCase();
    const tagsLower = Array.isArray(tags) 
      ? tags.map((t) => String(t).toLowerCase()).join(" ")
      : String(tags || "").toLowerCase();
    const statusLower = (urlStatus || "").toLowerCase();

    // Critical: Active malware distribution sites
    if (
      statusLower === "online" ||
      threatLower.includes("malware") ||
      threatLower.includes("phishing") ||
      tagsLower.includes("phishing") ||
      tagsLower.includes("ransomware") ||
      tagsLower.includes("trojan")
    ) {
      return "critical";
    }
    
    // High: Suspicious or offline malware sites
    if (
      statusLower === "offline" ||
      threatLower.includes("suspicious") ||
      tagsLower.includes("suspicious") ||
      tagsLower.includes("malware")
    ) {
      return "high";
    }
    
    // Medium: Other threats
    if (threatLower || tagsLower) {
      return "medium";
    }
    
    return "low";
  }
}

export const urlhausService = new URLhausService();

