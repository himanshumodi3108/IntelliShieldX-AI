/**
 * ThreatFox Service - IOC (Indicators of Compromise) checking
 * According to API docs: Auth-Key is REQUIRED
 * Get your Auth-Key from: https://threatfox.abuse.ch/api/
 */
import axios from "axios";

class ThreatFoxService {
  constructor() {
    this.apiKey = process.env.THREATFOX_API_KEY;
    this.baseUrl = "https://threatfox-api.abuse.ch/api/v1";
  }

  /**
   * Get current API key (re-reads from environment to support updates)
   */
  getApiKey() {
    return process.env.THREATFOX_API_KEY || this.apiKey;
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
   * Query IOCs (can query by hash, IP, domain, URL)
   * According to API docs: POST to /api/v1/ with query: "search_ioc"
   * @param {string} ioc - Indicator of Compromise
   * @param {string} iocType - Type of IOC (hash, ip, domain, url)
   * @param {string} scanId - Optional scan ID for logging
   */
  async queryIOC(ioc, iocType = "hash", scanId = null) {
    const logPrefix = scanId ? `[Scan ID: ${scanId}]` : "[ThreatFox Service]";
    
    if (!this.isEnabled()) {
      throw new Error("ThreatFox API key (Auth-Key) not configured. Get one from https://threatfox.abuse.ch/api/");
    }

    try {
      // ThreatFox API: POST to /api/v1/ with JSON body
      // Query structure: { query: "search_ioc", search_term: "value" }
      const response = await axios.post(
        `${this.baseUrl}/`, // Note: trailing slash required
        {
          query: "search_ioc",
          search_term: ioc,
        },
        {
          headers: {
            "Auth-Key": this.getApiKey(), // API uses "Auth-Key" header (required)
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "IntelliShieldX/1.0 (Security Scanner)",
          },
          timeout: 30000,
          validateStatus: (status) => status < 500, // Don't throw on 4xx errors
        }
      );

      // Handle 401 Unauthorized responses (missing or invalid Auth-Key)
      if (response.status === 401) {
        console.warn(`${logPrefix} ThreatFox API returned 401 Unauthorized - Auth-Key may be missing or invalid`);
        return {
          scanned: false,
          found: false,
          error: "Authentication required - Auth-Key missing or invalid",
        };
      }

      // Handle other error statuses
      if (response.status >= 400) {
        console.error(`${logPrefix} ThreatFox API returned error status ${response.status}:`, response.data);
        return {
          scanned: false,
          found: false,
          error: `API returned status ${response.status}`,
        };
      }

      // Response structure: { query_status: "ok" | "no_result", data: [...] }
      if (response.data.query_status === "no_result") {
        console.log(`${logPrefix} IOC not found in ThreatFox database`);
        return {
          scanned: true,
          found: false,
          message: "IOC not found in ThreatFox database",
        };
      }

      if (response.data.query_status === "ok" && response.data.data) {
        // Data is an array of IOC objects
        const dataArray = Array.isArray(response.data.data) 
          ? response.data.data 
          : [response.data.data];
        
        if (dataArray.length === 0) {
          return {
            scanned: true,
            found: false,
            message: "No IOCs found",
          };
        }

        // Use the first result (most relevant)
        const data = dataArray[0];

        console.log(`${logPrefix} ThreatFox IOC found - IOC: ${data.ioc}, Threat Type: ${data.threat_type}, Malware: ${data.malware_printable || data.malware}, Confidence: ${data.confidence_level || 0}%`);

        // Construct permalink to view IOC on ThreatFox
        const permalink = data.id 
          ? `https://threatfox.abuse.ch/ioc/${data.id}/`
          : null;

        return {
          scanned: true,
          found: true,
          id: data.id,
          ioc: data.ioc,
          iocType: data.ioc_type,
          iocTypeDesc: data.ioc_type_desc,
          threatType: data.threat_type,
          threatTypeDesc: data.threat_type_desc,
          malware: data.malware,
          malwarePrintable: data.malware_printable,
          malwareAlias: data.malware_alias,
          malwareMalpedia: data.malware_malpedia,
          confidenceLevel: data.confidence_level || 0,
          firstSeen: data.first_seen,
          lastSeen: data.last_seen,
          reporter: data.reporter,
          reference: data.reference,
          tags: data.tags || [],
          // Additional fields that may be present
          comment: data.comment,
          credits: data.credits,
          malwareSamples: data.malware_samples,
          // Computed fields
          malwareFamily: data.malware_alias || data.malware_printable || data.malware || "Unknown",
          threatLevel: this.determineThreatLevel(data),
          permalink, // Link to view IOC on ThreatFox
        };
      }

      return {
        scanned: true,
        found: false,
        message: "No data returned",
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status;
        const statusText = error.response.statusText;
        const responseData = error.response.data;
        
        if (status === 401) {
          console.warn(`${logPrefix} ThreatFox API returned 401 Unauthorized - Auth-Key may be missing or invalid`);
          return {
            scanned: false,
            found: false,
            error: "Authentication required - Auth-Key missing or invalid",
          };
        } else if (status === 429) {
          console.warn(`${logPrefix} ThreatFox API returned 429 Too Many Requests - rate limit exceeded`);
          return {
            scanned: false,
            found: false,
            error: "Rate limit exceeded",
            rateLimitExceeded: true,
          };
        } else if (status >= 500) {
          console.error(`${logPrefix} ThreatFox API server error: ${status} ${statusText}`, responseData);
        } else {
          console.error(`${logPrefix} ThreatFox API error: ${status} ${statusText}`, responseData);
        }
        
        return {
          scanned: false,
          found: false,
          error: `HTTP ${status}: ${statusText}${responseData?.message ? ` - ${responseData.message}` : ""}`,
        };
      } else if (axios.isAxiosError(error) && error.request) {
        console.error(`${logPrefix} ThreatFox network error: No response received`, error.message);
        return {
          scanned: false,
          found: false,
          error: "Network error - service unreachable",
        };
      } else {
        console.error(`${logPrefix} ThreatFox query error:`, error.message);
        return {
          scanned: false,
          found: false,
          error: error.message,
        };
      }
    }
  }

  /**
   * Query by hash
   */
  async queryHash(hash, scanId = null) {
    return this.queryIOC(hash, "hash", scanId);
  }

  /**
   * Query by IP
   */
  async queryIP(ip, scanId = null) {
    return this.queryIOC(ip, "ip", scanId);
  }

  /**
   * Query by URL
   */
  async queryURL(url, scanId = null) {
    return this.queryIOC(url, "url", scanId);
  }

  /**
   * Determine threat level
   */
  determineThreatLevel(data) {
    const threatType = (data.threat_type || "").toLowerCase();
    const malware = (data.malware || "").toLowerCase();
    const confidence = data.confidence_level || 0;

    if (threatType.includes("botnet") || threatType.includes("malware") || confidence >= 90) {
      return "critical";
    }
    if (threatType.includes("suspicious") || confidence >= 70) {
      return "high";
    }
    if (confidence >= 50) {
      return "medium";
    }
    return "low";
  }
}

export const threatFoxService = new ThreatFoxService();

