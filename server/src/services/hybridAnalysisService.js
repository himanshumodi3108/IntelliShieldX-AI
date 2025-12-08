/**
 * Hybrid Analysis Service - Additional file analysis
 * Free tier: 100 submissions/day
 */
import axios from "axios";

class HybridAnalysisService {
  constructor() {
    this.apiKey = process.env.HYBRID_ANALYSIS_API_KEY;
    this.baseUrl = "https://www.hybrid-analysis.com/api/v2";
    this.rateLimitPerDay = 100;
    this.requestCount = 0;
    this.requestDate = new Date().toDateString();
  }

  /**
   * Get current API key (re-reads from environment to support updates)
   */
  getApiKey() {
    return process.env.HYBRID_ANALYSIS_API_KEY || this.apiKey;
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
      throw new Error("Hybrid Analysis daily limit reached (100 requests/day)");
    }

    this.requestCount++;
  }

  /**
   * Search hash using /search/hash endpoint (supports MD5, SHA1, SHA256, SHA512)
   * Converts any hash format to SHA256 and returns associated reports
   * @param {string} hash - Hash in any format (MD5, SHA1, SHA256, SHA512)
   * @param {string} scanId - Optional scan ID for logging
   * @returns {Promise<object>} Search results with SHA256s and reports
   */
  async searchHash(hash, scanId = null) {
    const logPrefix = scanId ? `[Scan ID: ${scanId}]` : "[Hybrid Analysis Service]";
    
    if (!this.isEnabled()) {
      throw new Error("Hybrid Analysis API key not configured");
    }

    this.checkRateLimit();

    try {
      // GET /search/hash?hash={hash} - converts any hash format to SHA256
      const response = await axios.get(`${this.baseUrl}/search/hash`, {
        params: { hash: hash },
        headers: {
          "api-key": this.getApiKey(),
          "user-agent": "IntelliShieldX",
        },
        timeout: 30000,
        validateStatus: (status) => status < 500,
      });

      if (response.status === 404) {
        return {
          scanned: true,
          found: false,
          message: "Hash not found in Hybrid Analysis database",
        };
      }

      if (response.status >= 400) {
        console.error(`${logPrefix} Hybrid Analysis search error: HTTP ${response.status}`, response.data);
        return {
          scanned: false,
          found: false,
          error: `API returned status ${response.status}`,
        };
      }

      const data = response.data;
      if (!data || !data.sha256s || data.sha256s.length === 0) {
        return {
          scanned: true,
          found: false,
          message: "No associated SHA256 hashes found",
        };
      }

      // Use the first SHA256 to get overview
      const sha256 = data.sha256s[0];
      console.log(`${logPrefix} Hash search found ${data.sha256s.length} associated SHA256(s), using first: ${sha256}`);
      
      // Get detailed overview for the first SHA256
      return this.queryHash(sha256, scanId);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 404) {
          return {
            scanned: true,
            found: false,
            message: "Hash not found in Hybrid Analysis database",
          };
        }
        console.error(`${logPrefix} Hybrid Analysis search error: HTTP ${error.response.status}`, error.response.data);
      } else {
        console.error(`${logPrefix} Hybrid Analysis search error:`, error.message);
      }
      throw new Error(`Hybrid Analysis search failed: ${error.message}`);
    }
  }

  /**
   * Query hash (SHA256) - Uses /overview/{sha256} endpoint
   * @param {string} sha256 - SHA256 hash
   * @param {string} scanId - Optional scan ID for logging
   */
  async queryHash(sha256, scanId = null) {
    const logPrefix = scanId ? `[Scan ID: ${scanId}]` : "[Hybrid Analysis Service]";
    
    if (!this.isEnabled()) {
      throw new Error("Hybrid Analysis API key not configured");
    }

    this.checkRateLimit();

    try {
      const response = await axios.get(`${this.baseUrl}/overview/${sha256}`, {
        headers: {
          "api-key": this.getApiKey(),
          "user-agent": "IntelliShieldX",
        },
        timeout: 30000,
        validateStatus: (status) => status < 500, // Don't throw on 4xx errors
      });

      // Handle 404 - hash not found
      if (response.status === 404) {
        console.log(`${logPrefix} Hash not found in Hybrid Analysis database (404)`);
        return {
          scanned: true,
          found: false,
          message: "Hash not found in Hybrid Analysis database",
        };
      }

      // Handle other error statuses
      if (response.status >= 400) {
        console.error(`${logPrefix} Hybrid Analysis API returned error status ${response.status}:`, response.data);
        return {
          scanned: false,
          found: false,
          error: `API returned status ${response.status}`,
        };
      }

      // /overview/{sha256} returns an Overview object, not an array
      const data = response.data;
      if (!data || typeof data !== 'object') {
        console.error(`${logPrefix} Invalid response structure from Hybrid Analysis:`, typeof data);
        return {
          scanned: false,
          found: false,
          error: "Invalid response structure",
        };
      }

      // Extract threat score and verdict from Overview object
      // Handle null, undefined, or missing threat_score
      const threatScore = (data.threat_score !== undefined && data.threat_score !== null) 
        ? data.threat_score 
        : 0;
      const verdict = data.verdict || "unknown";
      
      // Determine if threat was found (verdict 4 = suspicious, 5 = malicious)
      // If verdict is malicious but threat_score is 0/null, still consider it a threat
      // Check both string and number formats for verdict
      const verdictNum = typeof verdict === 'number' ? verdict : (typeof verdict === 'string' ? parseInt(verdict) : null);
      const verdictStr = typeof verdict === 'string' ? verdict.toLowerCase() : '';
      const isThreat = verdictStr === "malicious" || verdictNum === 5 || verdictStr === "suspicious" || verdictNum === 4 || (threatScore !== null && threatScore > 0);

      console.log(`${logPrefix} Hybrid Analysis overview retrieved - Threat Score: ${threatScore !== null ? threatScore : 'N/A'}, Verdict: ${verdict}, SHA256: ${data.sha256 || sha256}`);

      // Construct permalink to view sample on Hybrid Analysis
      const sampleSha256 = data.sha256 || sha256;
      const permalink = sampleSha256 
        ? `https://www.hybrid-analysis.com/sample/${sampleSha256}`
        : null;

      return {
        scanned: true,
        found: isThreat,
        threatScore,
        verdict: typeof verdict === 'number' 
          ? (verdict === 5 ? "malicious" : verdict === 4 ? "suspicious" : verdict === 3 ? "no specific threat" : verdict === 2 ? "no verdict" : verdict === 1 ? "whitelisted" : "unknown")
          : verdict,
        malwareFamily: data.vx_family || "Unknown",
        submitName: data.last_file_name || data.submit_name,
        analysisStartTime: data.analysis_start_time || data.submitted_at,
        environmentId: data.environment_id,
        environmentDescription: data.environment_description,
        sha256: sampleSha256,
        type: data.type || data.type_short,
        size: data.size,
        tags: data.tags || [],
        threatLevel: this.determineThreatLevel(threatScore, verdict),
        permalink, // Link to view sample on Hybrid Analysis
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 404) {
          console.log(`${logPrefix} Hash not found in Hybrid Analysis database (404)`);
          return {
            scanned: true,
            found: false,
            message: "Hash not found in Hybrid Analysis database",
          };
        }
        console.error(`${logPrefix} Hybrid Analysis query error: HTTP ${error.response.status} ${error.response.statusText}`, error.response.data);
      } else if (axios.isAxiosError(error) && error.request) {
        console.error(`${logPrefix} Hybrid Analysis network error: No response received`, error.message);
      } else {
        console.error(`${logPrefix} Hybrid Analysis query error:`, error.message);
      }
      throw new Error(`Hybrid Analysis query failed: ${error.message}`);
    }
  }

  /**
   * Submit file for analysis (for password-protected files or new files)
   * According to API docs: POST /submit/file requires environment_id (required)
   * Available environments: 400='Mac Catalina 64 bit', 310='Linux Ubuntu 20.04', 
   * 200='Android Static Analysis', 160='Windows 10 64 bit', 140='Windows 11 64 bit',
   * 120='Windows 7 64 bit', 110='Windows 7 32 bit (HWP Support)', 100='Windows 7 32 bit'
   * @param {string} filePath - File path
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} password - Optional password for password-protected files (API uses 'document_password')
   * @param {string} scanId - Optional scan ID for logging
   * @param {number} environmentId - Environment ID (default: 120 = Windows 7 64 bit)
   */
  async submitFile(filePath, fileBuffer, password = null, scanId = null, environmentId = 120) {
    const logPrefix = scanId ? `[Scan ID: ${scanId}]` : "[Hybrid Analysis Service]";
    
    if (!this.isEnabled()) {
      throw new Error("Hybrid Analysis API key not configured");
    }

    this.checkRateLimit();

    try {
      const FormData = (await import("form-data")).default || (await import("form-data"));
      const form = new FormData();
      form.append("file", fileBuffer, {
        filename: filePath.split("/").pop() || "file",
      });
      
      // Required parameter: environment_id
      form.append("environment_id", environmentId.toString());

      // Add password if provided (API uses 'document_password' for password-protected files)
      if (password) {
        form.append("document_password", password);
      }

      console.log(`${logPrefix} Submitting file to Hybrid Analysis with environment_id: ${environmentId}`);

      // Submit file for analysis
      const response = await axios.post(`${this.baseUrl}/submit/file`, form, {
        headers: {
          ...form.getHeaders(),
          "api-key": this.getApiKey(),
          "user-agent": "IntelliShieldX",
        },
        timeout: 60000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        validateStatus: (status) => status < 500, // Don't throw on 4xx errors
      });

      // Handle error responses
      if (response.status >= 400) {
        console.error(`${logPrefix} Hybrid Analysis file submission error: HTTP ${response.status}`, response.data);
        return {
          scanned: false,
          error: `API returned status ${response.status}: ${response.data?.message || "Unknown error"}`,
        };
      }

      // Response contains: job_id, submission_id, environment_id, sha256
      if (response.data && response.data.sha256) {
        const sha256 = response.data.sha256;
        console.log(`${logPrefix} File submitted successfully. SHA256: ${sha256}, Job ID: ${response.data.job_id}`);
        
        // Wait a bit for analysis to start, then query using overview endpoint
        // The /report/{id}/summary endpoint is deprecated, use /overview/{sha256} instead
        await new Promise((resolve) => setTimeout(resolve, 5000));
        
        // Query the analysis result using overview endpoint with SHA256
        try {
          const overviewResult = await this.queryHash(sha256, scanId);
          if (overviewResult.scanned && overviewResult.found) {
            return {
              ...overviewResult,
              jobId: response.data.job_id,
              submissionId: response.data.submission_id,
              environmentId: response.data.environment_id,
            };
          }
          
          // If overview not ready yet, return basic submission info
          return {
            scanned: true,
            found: false,
            jobId: response.data.job_id,
            submissionId: response.data.submission_id,
            environmentId: response.data.environment_id,
            sha256: sha256,
            message: "File submitted successfully, analysis in progress",
          };
        } catch (overviewError) {
          // If overview query fails, return submission info
          console.warn(`${logPrefix} Could not retrieve overview immediately:`, overviewError.message);
          return {
            scanned: true,
            found: false,
            jobId: response.data.job_id,
            submissionId: response.data.submission_id,
            environmentId: response.data.environment_id,
            sha256: sha256,
            message: "File submitted successfully, analysis in progress",
          };
        }
      }

      return {
        scanned: false,
        error: "File submission failed: No SHA256 in response",
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        console.error(`${logPrefix} Hybrid Analysis file submission error: HTTP ${error.response.status} ${error.response.statusText}`, error.response.data);
      } else if (axios.isAxiosError(error) && error.request) {
        console.error(`${logPrefix} Hybrid Analysis network error: No response received`, error.message);
      } else {
        console.error(`${logPrefix} Hybrid Analysis file submission error:`, error.message);
      }
      throw new Error(`Hybrid Analysis file submission failed: ${error.message}`);
    }
  }

  /**
   * Determine threat level
   * Verdict can be: 1='whitelisted', 2='no verdict', 3='no specific threat', 4='suspicious', 5='malicious'
   * Or string: "whitelisted", "no verdict", "no specific threat", "suspicious", "malicious"
   */
  determineThreatLevel(threatScore, verdict) {
    // Normalize verdict to string for comparison
    let verdictStr = "";
    if (typeof verdict === 'number') {
      const verdictMap = {
        1: "whitelisted",
        2: "no verdict",
        3: "no specific threat",
        4: "suspicious",
        5: "malicious"
      };
      verdictStr = verdictMap[verdict] || "unknown";
    } else {
      verdictStr = String(verdict).toLowerCase();
    }

    // Critical: malicious verdict or very high threat score
    if (verdictStr === "malicious" || verdict === 5 || threatScore >= 80) {
      return "critical";
    }
    // High: suspicious verdict or high threat score
    if (verdictStr === "suspicious" || verdict === 4 || threatScore >= 50) {
      return "high";
    }
    // Medium: moderate threat score
    if (threatScore >= 20) {
      return "medium";
    }
    // Low: low threat score or no specific threat
    if (verdictStr === "no specific threat" || verdict === 3 || threatScore > 0) {
      return "low";
    }
    // Safe: whitelisted, no verdict, or zero threat score
    return "low";
  }

  /**
   * Submit URL for analysis
   * According to API docs: POST /submit/url requires environment_id (required)
   * @param {string} url - URL to analyze
   * @param {string} scanId - Optional scan ID for logging
   * @param {number} environmentId - Environment ID (default: 120 = Windows 7 64 bit)
   */
  async submitURL(url, scanId = null, environmentId = 120) {
    const logPrefix = scanId ? `[Scan ID: ${scanId}]` : "[Hybrid Analysis Service]";
    
    if (!this.isEnabled()) {
      throw new Error("Hybrid Analysis API key not configured");
    }

    this.checkRateLimit();

    try {
      const FormData = (await import("form-data")).default || (await import("form-data"));
      const form = new FormData();
      form.append("url", url);
      
      // Required parameter: environment_id
      form.append("environment_id", environmentId.toString());

      console.log(`${logPrefix} Submitting URL to Hybrid Analysis: ${url}`);

      // Submit URL for analysis
      const response = await axios.post(`${this.baseUrl}/submit/url`, form, {
        headers: {
          ...form.getHeaders(),
          "api-key": this.getApiKey(),
          "user-agent": "IntelliShieldX",
        },
        timeout: 60000,
        validateStatus: (status) => status < 500,
      });

      // Handle error responses
      if (response.status >= 400) {
        console.error(`${logPrefix} Hybrid Analysis URL submission error: HTTP ${response.status}`, response.data);
        return {
          scanned: false,
          error: `API returned status ${response.status}: ${response.data?.message || "Unknown error"}`,
        };
      }

      // Response contains: job_id, submission_id, environment_id, sha256
      if (response.data && response.data.sha256) {
        const sha256 = response.data.sha256;
        console.log(`${logPrefix} URL submitted successfully. SHA256: ${sha256}, Job ID: ${response.data.job_id}`);
        
        // Wait a bit for analysis to start, then query using overview endpoint
        await new Promise((resolve) => setTimeout(resolve, 5000));
        
        // Get analysis results using overview endpoint
        return this.queryHash(sha256, scanId);
      } else {
        return {
          scanned: false,
          error: "URL submission succeeded but no SHA256 returned",
        };
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        console.error(`${logPrefix} Hybrid Analysis URL submission error: HTTP ${error.response.status}`, error.response.data);
      } else {
        console.error(`${logPrefix} Hybrid Analysis URL submission error:`, error.message);
      }
      throw new Error(`Hybrid Analysis URL submission failed: ${error.message}`);
    }
  }
}

export const hybridAnalysisService = new HybridAnalysisService();

