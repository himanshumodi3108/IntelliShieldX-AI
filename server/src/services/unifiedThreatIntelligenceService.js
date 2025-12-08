/**
 * Unified Threat Intelligence Service
 * Orchestrates all enabled threat intelligence services
 */
import Settings from "../models/Settings.js";
import PricingPlan from "../models/PricingPlan.js";
import { hashService } from "./hashService.js";
import { virusTotalService } from "./virusTotalService.js";
import { malwareBazaarService } from "./malwareBazaarService.js";
import { urlhausService } from "./urlhausService.js";
import { hybridAnalysisService } from "./hybridAnalysisService.js";
import { abuseIPDBService } from "./abuseIPDBService.js";
import { threatFoxService } from "./threatFoxService.js";

class UnifiedThreatIntelligenceService {
  /**
   * Get enabled services from settings and plan (if provided)
   * @param {string} planId - Optional plan ID to check plan-specific enablement
   * @returns {Promise<object>} Enabled services object
   */
  async getEnabledServices(planId = null) {
    try {
      // Get global settings
      const settings = await Settings.find({ category: "threatIntelligence" }).lean();
      const settingsMap = {};
      
      settings.forEach((setting) => {
        settingsMap[setting.key] = setting.value;
      });

      // Base enabled status from global settings
      let enabled = {
        virusTotal: settingsMap.virusTotalEnabled !== false && virusTotalService.isEnabled(),
        malwareBazaar: settingsMap.malwareBazaarEnabled !== false && malwareBazaarService.isEnabled(),
        urlhaus: settingsMap.urlhausEnabled !== false && urlhausService.isEnabled(),
        hybridAnalysis: settingsMap.hybridAnalysisEnabled !== false && hybridAnalysisService.isEnabled(),
        abuseIPDB: settingsMap.abuseIPDBEnabled !== false && abuseIPDBService.isEnabled(),
        threatFox: settingsMap.threatFoxEnabled !== false && threatFoxService.isEnabled(),
      };

      // If planId is provided, check plan-specific enablement
      if (planId) {
        try {
          const plan = await PricingPlan.findOne({ planId, isActive: true }).lean();
          // console.log(`[Threat Intelligence] Looking up plan "${planId}" in database...`);
          
          if (!plan) {
            console.warn(`[Threat Intelligence] Plan "${planId}" not found in database`);
          } else if (!plan.limits || !plan.limits.threatIntelligence) {
            console.warn(`[Threat Intelligence] Plan "${planId}" found but has no threat intelligence limits configured`);
          } else {
            const ti = plan.limits.threatIntelligence;
            
            // Log plan configuration for debugging
            // console.log(`[Threat Intelligence] Plan "${planId}" configuration from database:`, JSON.stringify(ti, null, 2));

            // Check new structure (with enabled flags) or old structure (numbers)
            if (ti.virusTotal !== undefined) {
              if (typeof ti.virusTotal === 'object' && ti.virusTotal !== null) {
                // New structure: check enabled flag
                enabled.virusTotal = enabled.virusTotal && (ti.virusTotal.enabled === true);
              } else if (typeof ti.virusTotal === 'number') {
                // Old structure: if limit > 0, service is enabled
                enabled.virusTotal = enabled.virusTotal && (ti.virusTotal > 0);
              }
            }

            if (ti.hybridAnalysis !== undefined) {
              if (typeof ti.hybridAnalysis === 'object' && ti.hybridAnalysis !== null) {
                enabled.hybridAnalysis = enabled.hybridAnalysis && (ti.hybridAnalysis.enabled === true);
              } else if (typeof ti.hybridAnalysis === 'number') {
                enabled.hybridAnalysis = enabled.hybridAnalysis && (ti.hybridAnalysis > 0);
              }
            }

            if (ti.abuseIPDB !== undefined) {
              if (typeof ti.abuseIPDB === 'object' && ti.abuseIPDB !== null) {
                enabled.abuseIPDB = enabled.abuseIPDB && (ti.abuseIPDB.enabled === true);
              } else if (typeof ti.abuseIPDB === 'number') {
                enabled.abuseIPDB = enabled.abuseIPDB && (ti.abuseIPDB > 0);
              }
            }

            // Boolean services
            if (ti.malwareBazaar !== undefined) {
              if (typeof ti.malwareBazaar === 'object') {
                enabled.malwareBazaar = enabled.malwareBazaar && (ti.malwareBazaar.enabled === true);
              } else {
                enabled.malwareBazaar = enabled.malwareBazaar && (ti.malwareBazaar === true);
              }
            }

            if (ti.urlhaus !== undefined) {
              if (typeof ti.urlhaus === 'object') {
                enabled.urlhaus = enabled.urlhaus && (ti.urlhaus.enabled === true);
              } else {
                enabled.urlhaus = enabled.urlhaus && (ti.urlhaus === true);
              }
            }

            if (ti.threatFox !== undefined) {
              if (typeof ti.threatFox === 'object') {
                enabled.threatFox = enabled.threatFox && (ti.threatFox.enabled === true);
              } else {
                enabled.threatFox = enabled.threatFox && (ti.threatFox === true);
              }
            }
          }
        } catch (planError) {
          console.error("Error loading plan-specific threat intelligence settings:", planError);
        }
      } else if (planId) {
        console.warn(`[Threat Intelligence] Plan "${planId}" not found or inactive in database, using global settings only`);
      }

      // Log detailed service enablement status for debugging
      if (planId) {
        const logDetails = {
          virusTotal: {
            enabled: enabled.virusTotal,
            serviceAvailable: virusTotalService.isEnabled(),
            reason: !virusTotalService.isEnabled() 
              ? "API key not configured" 
              : enabled.virusTotal 
                ? "Enabled" 
                : "Disabled in plan settings or global settings"
          },
          hybridAnalysis: {
            enabled: enabled.hybridAnalysis,
            serviceAvailable: hybridAnalysisService.isEnabled(),
            reason: !hybridAnalysisService.isEnabled() 
              ? "API key not configured" 
              : enabled.hybridAnalysis 
                ? "Enabled" 
                : "Disabled in plan settings or global settings"
          },
          abuseIPDB: {
            enabled: enabled.abuseIPDB,
            serviceAvailable: abuseIPDBService.isEnabled(),
            reason: !abuseIPDBService.isEnabled() 
              ? "API key not configured" 
              : enabled.abuseIPDB 
                ? "Enabled" 
                : "Disabled in plan settings or global settings"
          },
        };

        const disabledServices = Object.entries(enabled)
          .filter(([_, isEnabled]) => !isEnabled)
          .map(([name]) => name);
        
        // if (disabledServices.length > 0) {
        //   console.log(`[Threat Intelligence] Plan "${planId}" - Disabled services: ${disabledServices.join(", ")}`);
        //   console.log(`[Threat Intelligence] Plan "${planId}" - Service enablement details:`, JSON.stringify(logDetails, null, 2));
        // }
      }

      return enabled;
    } catch (error) {
      console.error("Error loading threat intelligence settings:", error);
      // Return defaults if settings can't be loaded
      return {
        virusTotal: virusTotalService.isEnabled(),
        malwareBazaar: malwareBazaarService.isEnabled(),
        urlhaus: urlhausService.isEnabled(),
        hybridAnalysis: hybridAnalysisService.isEnabled(),
        abuseIPDB: abuseIPDBService.isEnabled(),
        threatFox: threatFoxService.isEnabled(),
      };
    }
  }

  /**
   * Scan file with all enabled services
   * @param {string} filePath - File path
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} planId - Optional plan ID to check plan-specific enablement
   * @param {string} password - Optional password for password-protected files
   * @param {string} scanId - Optional scan ID for logging
   */
  async scanFile(filePath, fileBuffer, planId = null, password = null, scanId = null) {
    const enabled = await this.getEnabledServices(planId);
    const logPrefix = scanId ? `[Scan ID: ${scanId}]` : "[Threat Intelligence]";
    const fileName = filePath.split("/").pop() || "file";
    
    // console.log(`${logPrefix} Starting threat intelligence analysis for file: ${fileName}`);
    // console.log(`${logPrefix} Enabled services:`, {
    //   virusTotal: enabled.virusTotal,
    //   malwareBazaar: enabled.malwareBazaar,
    //   hybridAnalysis: enabled.hybridAnalysis,
    //   threatFox: enabled.threatFox,
    //   urlhaus: enabled.urlhaus,
    //   abuseIPDB: enabled.abuseIPDB,
    // });

    const results = {
      hashes: null,
      virusTotal: { scanned: false },
      malwareBazaar: { scanned: false },
      urlhaus: { scanned: false },
      hybridAnalysis: { scanned: false },
      abuseIPDB: { scanned: false },
      threatFox: { scanned: false },
    };

    try {
      // Generate hashes first
      results.hashes = await hashService.generateAllHashes(fileBuffer);
      // console.log(`${logPrefix} Generated file hashes - MD5: ${results.hashes.md5}, SHA1: ${results.hashes.sha1}, SHA256: ${results.hashes.sha256}`);

      // Run enabled services in parallel
      const promises = [];

      // VirusTotal
      if (enabled.virusTotal) {
        // console.log(`${logPrefix} [VirusTotal] Starting hash scan...`);
        promises.push(
          virusTotalService.scanHash(results.hashes.sha256, scanId).then((result) => {
            if (result.scanned) {
              // console.log(`${logPrefix} [VirusTotal] ✓ Successfully analyzed file. Status: ${result.status || "unknown"}, Positives: ${result.positives || 0}/${result.total || 0}`);
            } else {
              // console.log(`${logPrefix} [VirusTotal] ⚠ Hash not found in database or scan failed`);
            }
            return result;
          }).catch((error) => {
            console.error(`${logPrefix} [VirusTotal] ✗ Failed to analyze file: ${error.message}`);
            return { scanned: false, error: error.message };
          })
        );
      } else {
        console.log(`${logPrefix} [VirusTotal] Disabled (not enabled for this plan or service unavailable)`);
        promises.push(Promise.resolve({ scanned: false, disabled: true }));
      }

      // MalwareBazaar
      if (enabled.malwareBazaar) {
        // console.log(`${logPrefix} [MalwareBazaar] Starting hash query...`);
        promises.push(
          malwareBazaarService.queryHash(results.hashes.sha256, scanId).then((result) => {
            if (result.scanned) {
              if (result.found) {
                // console.log(`${logPrefix} [MalwareBazaar] ✓ Successfully analyzed file. Found: ${result.malwareFamily || "Unknown malware"}, Threat Level: ${result.threatLevel || "unknown"}`);
              } else {
                // console.log(`${logPrefix} [MalwareBazaar] ✓ Successfully analyzed file. Hash not found in database (clean)`);
              }
            } else {
              // Show detailed error information
              const errorMsg = result.error || result.message || "Unknown error";
              if (errorMsg.includes("401") || errorMsg.includes("Unauthorized") || errorMsg.includes("authentication") || errorMsg.includes("IP restrictions")) {
                console.warn(`${logPrefix} [MalwareBazaar] ⚠ Service unavailable: ${errorMsg} (May require API key or have IP restrictions)`);
              } else if (errorMsg.includes("timeout") || errorMsg.includes("ECONNREFUSED") || errorMsg.includes("ENOTFOUND")) {
                console.error(`${logPrefix} [MalwareBazaar] ✗ Connection error: ${errorMsg}`);
              } else {
                console.warn(`${logPrefix} [MalwareBazaar] ⚠ Query failed: ${errorMsg}`);
              }
            }
            return result;
          }).catch((error) => {
            const errorMsg = error.message || error.toString();
            console.error(`${logPrefix} [MalwareBazaar] ✗ Failed to analyze file: ${errorMsg}`);
            if (error.response) {
              console.error(`${logPrefix} [MalwareBazaar] Response status: ${error.response.status}, Data:`, error.response.data);
            }
            return { scanned: false, error: errorMsg };
          })
        );
      } else {
        console.log(`${logPrefix} [MalwareBazaar] Disabled (not enabled for this plan or service unavailable)`);
        promises.push(Promise.resolve({ scanned: false, disabled: true }));
      }

      // Hybrid Analysis - try hash query first, then file submission if password provided
      if (enabled.hybridAnalysis) {
        // console.log(`${logPrefix} [Hybrid Analysis] Starting hash query...`);
        promises.push(
          hybridAnalysisService.queryHash(results.hashes.sha256, scanId).then((result) => {
            if (result.scanned) {
              if (result.found) {
                console.log(`${logPrefix} [Hybrid Analysis] ✓ Successfully analyzed file. Threat Score: ${result.threatScore || 0}, Verdict: ${result.verdict || "unknown"}`);
              } else {
                console.log(`${logPrefix} [Hybrid Analysis] ✓ Successfully analyzed file. Hash not found in database (clean)`);
              }
            } else {
              console.log(`${logPrefix} [Hybrid Analysis] ⚠ Query failed or service unavailable`);
            }
            return result;
          }).catch(async (error) => {
            // If hash query fails and password is provided, try file submission
            if (password) {
              console.log(`${logPrefix} [Hybrid Analysis] Hash query failed, attempting file submission with password...`);
              try {
                const result = await hybridAnalysisService.submitFile(filePath, fileBuffer, password, scanId);
                if (result.scanned) {
                  // console.log(`${logPrefix} [Hybrid Analysis] ✓ Successfully submitted and analyzed file. Threat Score: ${result.threatScore || 0}, Verdict: ${result.verdict || "unknown"}`);
                }
                return result;
              } catch (submitError) {
                console.error(`${logPrefix} [Hybrid Analysis] ✗ Failed to submit file: ${submitError.message}`);
                return { scanned: false, error: submitError.message };
              }
            }
            console.error(`${logPrefix} [Hybrid Analysis] ✗ Failed to analyze file: ${error.message}`);
            return { scanned: false, error: error.message };
          })
        );
      } else {
        console.log(`${logPrefix} [Hybrid Analysis] Disabled (not enabled for this plan or service unavailable)`);
        promises.push(Promise.resolve({ scanned: false, disabled: true }));
      }

      // ThreatFox
      if (enabled.threatFox) {
        // console.log(`${logPrefix} [ThreatFox] Starting IOC query...`);
        promises.push(
          threatFoxService.queryHash(results.hashes.sha256, scanId).then((result) => {
            if (result.scanned) {
              if (result.found) {
                // console.log(`${logPrefix} [ThreatFox] ✓ Successfully analyzed file. IOC found: ${result.malwareFamily || "Unknown"}, Threat Type: ${result.threatType || "unknown"}`);
              } else {
                // console.log(`${logPrefix} [ThreatFox] ✓ Successfully analyzed file. IOC not found in database (clean)`);
              }
            } else {
              // Show detailed error information
              const errorMsg = result.error || result.message || "Unknown error";
              if (errorMsg.includes("401") || errorMsg.includes("Unauthorized") || errorMsg.includes("authentication") || errorMsg.includes("IP restrictions")) {
                console.warn(`${logPrefix} [ThreatFox] ⚠ Service unavailable: ${errorMsg} (May require API key or have IP restrictions)`);
              } else if (errorMsg.includes("timeout") || errorMsg.includes("ECONNREFUSED") || errorMsg.includes("ENOTFOUND")) {
                console.error(`${logPrefix} [ThreatFox] ✗ Connection error: ${errorMsg}`);
              } else {
                console.warn(`${logPrefix} [ThreatFox] ⚠ Query failed: ${errorMsg}`);
              }
            }
            return result;
          }).catch((error) => {
            const errorMsg = error.message || error.toString();
            console.error(`${logPrefix} [ThreatFox] ✗ Failed to analyze file: ${errorMsg}`);
            if (error.response) {
              console.error(`${logPrefix} [ThreatFox] Response status: ${error.response.status}, Data:`, error.response.data);
            }
            return { scanned: false, error: errorMsg };
          })
        );
      } else {
        console.log(`${logPrefix} [ThreatFox] Disabled (not enabled for this plan or service unavailable)`);
        promises.push(Promise.resolve({ scanned: false, disabled: true }));
      }

      const [virusTotalResult, malwareBazaarResult, hybridAnalysisResult, threatFoxResult] = await Promise.all(promises);

      results.virusTotal = virusTotalResult;
      results.malwareBazaar = malwareBazaarResult;
      results.hybridAnalysis = hybridAnalysisResult;
      results.threatFox = threatFoxResult;

      // Summary log
      const successfulScans = [
        results.virusTotal.scanned && "VirusTotal",
        results.malwareBazaar.scanned && "MalwareBazaar",
        results.hybridAnalysis.scanned && "Hybrid Analysis",
        results.threatFox.scanned && "ThreatFox",
      ].filter(Boolean);
      
      // console.log(`${logPrefix} Threat intelligence analysis complete. Successfully analyzed by: ${successfulScans.length > 0 ? successfulScans.join(", ") : "None"}`);

      return results;
    } catch (error) {
      console.error(`${logPrefix} Unified threat intelligence scan error:`, error);
      return results;
    }
  }

  /**
   * Scan URL with all enabled services
   * @param {string} url - URL to scan
   * @param {string} planId - Optional plan ID to check plan-specific enablement
   * @param {string} scanId - Optional scan ID for logging
   */
  async scanURL(url, planId = null, scanId = null) {
    const logPrefix = scanId ? `[Scan ID: ${scanId}]` : "[Threat Intelligence]";
    // console.log(`${logPrefix} Starting threat intelligence analysis for URL: ${url}`);
    
    const enabled = await this.getEnabledServices(planId);
    // console.log(`${logPrefix} Enabled services for URL scan:`, {
    //   virusTotal: enabled.virusTotal,
    //   hybridAnalysis: enabled.hybridAnalysis,
    //   urlhaus: enabled.urlhaus,
    //   abuseIPDB: enabled.abuseIPDB,
    //   threatFox: enabled.threatFox,
    // });

    const results = {
      virusTotal: { scanned: false },
      hybridAnalysis: { scanned: false },
      urlhaus: { scanned: false },
      abuseIPDB: { scanned: false },
      threatFox: { scanned: false },
    };

    try {
      const promises = [];

      // VirusTotal
      if (enabled.virusTotal) {
        // console.log(`${logPrefix} [VirusTotal] Starting URL scan...`);
        promises.push(
          virusTotalService.scanURL(url, scanId).then((result) => {
            // if (result.scanned) {
            //   // console.log(`${logPrefix} [VirusTotal] ✓ Successfully analyzed URL. Status: ${result.status || "unknown"}, Positives: ${result.positives || 0}/${result.total || 0}`);
            // } else {
            //   // console.log(`${logPrefix} [VirusTotal] ⚠ URL scan failed or not found`);
            // }
            return result;
          }).catch((error) => {
            console.error(`${logPrefix} [VirusTotal] ✗ Failed to analyze URL: ${error.message}`);
            return { scanned: false, error: error.message };
          })
        );
      } else {
        console.log(`${logPrefix} [VirusTotal] Disabled (not enabled for this plan or service unavailable)`);
        promises.push(Promise.resolve({ scanned: false, disabled: true }));
      }

      // URLhaus
      if (enabled.urlhaus) {
        // console.log(`${logPrefix} [URLhaus] Starting URL query...`);
        promises.push(
          urlhausService.queryURL(url, scanId).then((result) => {
            if (result.scanned) {
            //   if (result.found) {
            //     // console.log(`${logPrefix} [URLhaus] ✓ Successfully analyzed URL. Status: ${result.status || "unknown"}, Threat: ${result.threat || "unknown"}`);
            //   } else {
            //     // console.log(`${logPrefix} [URLhaus] ✓ Successfully analyzed URL. URL not found in database (clean)`);
            //   }
            }
            // } else {
            //   console.log(`${logPrefix} [URLhaus] ⚠ Query failed or service unavailable`);
            // }
            return result;
          }).catch((error) => {
            //console.error(`${logPrefix} [URLhaus] ✗ Failed to analyze URL: ${error.message}`);
            return { scanned: false, error: error.message };
          })
        );
      } else {
        //console.log(`${logPrefix} [URLhaus] Disabled (not enabled for this plan or service unavailable)`);
        promises.push(Promise.resolve({ scanned: false, disabled: true }));
      }

      // AbuseIPDB
      if (enabled.abuseIPDB) {
        //console.log(`${logPrefix} [AbuseIPDB] Starting URL/IP check...`);
        promises.push(
          abuseIPDBService.checkURL(url, scanId).then((result) => {
            // if (result.scanned) {
            //   console.log(`${logPrefix} [AbuseIPDB] ✓ Successfully analyzed URL/IP. Abuse Confidence: ${result.abuseConfidence || 0}%, Status: ${result.status || "unknown"}`);
            // } else {
            //   console.log(`${logPrefix} [AbuseIPDB] ⚠ Check failed or service unavailable`);
            // }
            return result;
          }).catch((error) => {
            //console.error(`${logPrefix} [AbuseIPDB] ✗ Failed to analyze URL: ${error.message}`);
            return { scanned: false, error: error.message };
          })
        );
      } else {
        //console.log(`${logPrefix} [AbuseIPDB] Disabled (not enabled for this plan or service unavailable)`);
        promises.push(Promise.resolve({ scanned: false, disabled: true }));
      }

      // Hybrid Analysis (URL analysis)
      if (enabled.hybridAnalysis) {
        // console.log(`${logPrefix} [Hybrid Analysis] Starting URL submission...`);
        promises.push(
          hybridAnalysisService.submitURL(url, scanId).then((result) => {
            if (result.scanned) {
              // if (result.found) {
              //   // console.log(`${logPrefix} [Hybrid Analysis] ✓ Successfully analyzed URL. Threat Score: ${result.threatScore || 0}, Verdict: ${result.verdict || "unknown"}`);
              // } else {
              //   // console.log(`${logPrefix} [Hybrid Analysis] ✓ Successfully analyzed URL. No threats detected`);
              // }
            }
            // else {
            //   console.log(`${logPrefix} [Hybrid Analysis] ⚠ URL analysis failed or service unavailable`);
            // }
            return result;
          }).catch((error) => {
            //console.error(`${logPrefix} [Hybrid Analysis] ✗ Failed to analyze URL: ${error.message}`);
            return { scanned: false, error: error.message };
          })
        );
      } else {
        //console.log(`${logPrefix} [Hybrid Analysis] Disabled (not enabled for this plan or service unavailable)`);
        promises.push(Promise.resolve({ scanned: false, disabled: true }));
      }

      // ThreatFox
      if (enabled.threatFox) {
        // console.log(`${logPrefix} [ThreatFox] Starting IOC query for URL...`);
        promises.push(
          threatFoxService.queryURL(url, scanId).then((result) => {
            if (result.scanned) {
              if (result.found) {
                // console.log(`${logPrefix} [ThreatFox] ✓ Successfully analyzed URL. IOC found: ${result.malwareFamily || "Unknown"}, Threat Type: ${result.threatType || "unknown"}`);
              } else {
                // console.log(`${logPrefix} [ThreatFox] ✓ Successfully analyzed URL. IOC not found in database (clean)`);
              }
            } else {
              console.log(`${logPrefix} [ThreatFox] ⚠ Query failed or service unavailable`);
            }
            return result;
          }).catch((error) => {
            console.error(`${logPrefix} [ThreatFox] ✗ Failed to analyze URL: ${error.message}`);
            return { scanned: false, error: error.message };
          })
        );
      } else {
        console.log(`${logPrefix} [ThreatFox] Disabled (not enabled for this plan or service unavailable)`);
        promises.push(Promise.resolve({ scanned: false, disabled: true }));
      }

      const [virusTotalResult, hybridAnalysisResult, urlhausResult, abuseIPDBResult, threatFoxResult] = await Promise.all(promises);

      results.virusTotal = virusTotalResult;
      results.hybridAnalysis = hybridAnalysisResult;
      results.urlhaus = urlhausResult;
      results.abuseIPDB = abuseIPDBResult;
      results.threatFox = threatFoxResult;

      // Summary log
      const successfulScans = [
        results.virusTotal.scanned && "VirusTotal",
        results.hybridAnalysis.scanned && "Hybrid Analysis",
        results.urlhaus.scanned && "URLhaus",
        results.abuseIPDB.scanned && "AbuseIPDB",
        results.threatFox.scanned && "ThreatFox",
      ].filter(Boolean);
      
      console.log(`${logPrefix} Threat intelligence URL analysis complete. Successfully analyzed by: ${successfulScans.length > 0 ? successfulScans.join(", ") : "None"}`);

      return results;
    } catch (error) {
      console.error(`${logPrefix} Unified threat intelligence URL scan error:`, error);
      return results;
    }
  }

  /**
   * Scan hash (SHA256, SHA1, or MD5) with all enabled services
   * @param {string} hash - Hash to scan (SHA256, SHA1, or MD5)
   * @param {string} hashType - Type of hash: "sha256", "sha1", or "md5" (default: "sha256")
   * @param {string} planId - Optional plan ID to check plan-specific enablement
   * @param {string} scanId - Optional scan ID for logging
   */
  async scanHash(hash, hashType = "sha256", planId = null, scanId = null) {
    const logPrefix = scanId ? `[Scan ID: ${scanId}]` : "[Unified TI Service]";
    console.log(`${logPrefix} Starting threat intelligence analysis for hash: ${hash} (${hashType.toUpperCase()})`);
    
    const enabled = await this.getEnabledServices(planId);
    console.log(`${logPrefix} Enabled services for hash scan:`, enabled);

    const results = {
      hashes: {
        [hashType]: hash,
      },
      virusTotal: { scanned: false },
      malwareBazaar: { scanned: false },
      hybridAnalysis: { scanned: false },
      threatFox: { scanned: false },
    };

    try {
      const promises = [];

      // VirusTotal - supports MD5, SHA1, and SHA256
      if (enabled.virusTotal) {
        // console.log(`${logPrefix} [VirusTotal] Starting hash scan...`);
        promises.push(
          virusTotalService.scanHash(hash, scanId).then((result) => {
            if (result.scanned) {
              console.log(`${logPrefix} [VirusTotal] ✓ Successfully analyzed hash. Status: ${result.status || "unknown"}, Positives: ${result.positives || 0}/${result.total || 0}`);
            } else {
              console.log(`${logPrefix} [VirusTotal] ⚠ Hash not found in database or scan failed`);
            }
            return result;
          }).catch((error) => {
            console.error(`${logPrefix} [VirusTotal] ✗ Failed to analyze hash: ${error.message}`);
            return { scanned: false, error: error.message };
          })
        );
      } else {
        console.log(`${logPrefix} [VirusTotal] Disabled (not enabled for this plan or service unavailable)`);
        promises.push(Promise.resolve({ scanned: false, disabled: true }));
      }

      // MalwareBazaar - supports MD5, SHA1, and SHA256
      if (enabled.malwareBazaar) {
        // console.log(`${logPrefix} [MalwareBazaar] Starting hash query...`);
        promises.push(
          malwareBazaarService.queryHash(hash, scanId).then((result) => {
            if (result.scanned) {
              if (result.found) {
                console.log(`${logPrefix} [MalwareBazaar] ✓ Successfully analyzed hash. Found: ${result.malwareFamily || "Unknown malware"}, Threat Level: ${result.threatLevel || "unknown"}`);
              } else {
                console.log(`${logPrefix} [MalwareBazaar] ✓ Successfully analyzed hash. Hash not found in database (clean)`);
              }
            } else {
              console.log(`${logPrefix} [MalwareBazaar] ⚠ Query failed or service unavailable`);
            }
            return result;
          }).catch((error) => {
            console.error(`${logPrefix} [MalwareBazaar] ✗ Failed to analyze hash: ${error.message}`);
            return { scanned: false, error: error.message };
          })
        );
      } else {
        console.log(`${logPrefix} [MalwareBazaar] Disabled (not enabled for this plan or service unavailable)`);
        promises.push(Promise.resolve({ scanned: false, disabled: true }));
      }

      // Hybrid Analysis - supports SHA256
      if (enabled.hybridAnalysis && hashType === "sha256") {
        // console.log(`${logPrefix} [Hybrid Analysis] Starting hash query...`);
        promises.push(
          hybridAnalysisService.queryHash(hash, scanId).then((result) => {
            if (result.scanned) {
              if (result.found) {
                console.log(`${logPrefix} [Hybrid Analysis] ✓ Successfully analyzed hash. Threat Score: ${result.threatScore || 0}, Verdict: ${result.verdict || "unknown"}`);
              } else {
                console.log(`${logPrefix} [Hybrid Analysis] ✓ Successfully analyzed hash. Hash not found in database (clean)`);
              }
            } else {
              console.log(`${logPrefix} [Hybrid Analysis] ⚠ Query failed or service unavailable`);
            }
            return result;
          }).catch((error) => {
            console.error(`${logPrefix} [Hybrid Analysis] ✗ Failed to analyze hash: ${error.message}`);
            return { scanned: false, error: error.message };
          })
        );
      } else if (enabled.hybridAnalysis && hashType !== "sha256") {
        console.log(`${logPrefix} [Hybrid Analysis] Skipped (only supports SHA256, provided: ${hashType})`);
        promises.push(Promise.resolve({ scanned: false, disabled: true, reason: "Only SHA256 supported" }));
      } else {
        console.log(`${logPrefix} [Hybrid Analysis] Disabled (not enabled for this plan or service unavailable)`);
        promises.push(Promise.resolve({ scanned: false, disabled: true }));
      }

      // ThreatFox - supports MD5, SHA1, and SHA256
      if (enabled.threatFox) {
        // console.log(`${logPrefix} [ThreatFox] Starting IOC query...`);
        promises.push(
          threatFoxService.queryHash(hash, scanId).then((result) => {
            if (result.scanned) {
              if (result.found) {
                console.log(`${logPrefix} [ThreatFox] ✓ Successfully analyzed hash. IOC found: ${result.malwareFamily || "Unknown"}, Threat Type: ${result.threatType || "unknown"}`);
              } else {
                console.log(`${logPrefix} [ThreatFox] ✓ Successfully analyzed hash. IOC not found in database (clean)`);
              }
            } else {
              console.log(`${logPrefix} [ThreatFox] ⚠ Query failed or service unavailable`);
            }
            return result;
          }).catch((error) => {
            console.error(`${logPrefix} [ThreatFox] ✗ Failed to analyze hash: ${error.message}`);
            return { scanned: false, error: error.message };
          })
        );
      } else {
        console.log(`${logPrefix} [ThreatFox] Disabled (not enabled for this plan or service unavailable)`);
        promises.push(Promise.resolve({ scanned: false, disabled: true }));
      }

      const [virusTotalResult, malwareBazaarResult, hybridAnalysisResult, threatFoxResult] = await Promise.all(promises);

      results.virusTotal = virusTotalResult;
      results.malwareBazaar = malwareBazaarResult;
      results.hybridAnalysis = hybridAnalysisResult;
      results.threatFox = threatFoxResult;

      // Summary log
      const successfulScans = [
        results.virusTotal.scanned && "VirusTotal",
        results.malwareBazaar.scanned && "MalwareBazaar",
        results.hybridAnalysis.scanned && "Hybrid Analysis",
        results.threatFox.scanned && "ThreatFox",
      ].filter(Boolean);
      
      console.log(`${logPrefix} Threat intelligence hash analysis complete. Successfully analyzed by: ${successfulScans.length > 0 ? successfulScans.join(", ") : "None"}`);

      return results;
    } catch (error) {
      console.error(`${logPrefix} Unified threat intelligence hash scan error:`, error);
      return results;
    }
  }

  /**
   * Scan IP address with all enabled services
   * @param {string} ip - IP address to scan
   * @param {string} planId - Optional plan ID to check plan-specific enablement
   * @param {string} scanId - Optional scan ID for logging
   */
  async scanIP(ip, planId = null, scanId = null) {
    const logPrefix = scanId ? `[Scan ID: ${scanId}]` : "[Threat Intelligence]";
    // console.log(`${logPrefix} Starting threat intelligence analysis for IP: ${ip}`);
    
    const enabled = await this.getEnabledServices(planId);
    // console.log(`${logPrefix} Enabled services for IP scan:`, {
    //   virusTotal: enabled.virusTotal,
    //   abuseIPDB: enabled.abuseIPDB,
    //   threatFox: enabled.threatFox,
    // });

    const results = {
      virusTotal: { scanned: false },
      abuseIPDB: { scanned: false },
      threatFox: { scanned: false },
    };

    try {
      const promises = [];

      // VirusTotal (IP reputation and analysis)
      if (enabled.virusTotal) {
        // console.log(`${logPrefix} [VirusTotal] Starting IP scan...`);
        promises.push(
          virusTotalService.scanIP(ip, scanId).then((result) => {
            if (result.scanned) {
              // console.log(`${logPrefix} [VirusTotal] ✓ Successfully analyzed IP. Status: ${result.status || "unknown"}, Positives: ${result.positives || 0}/${result.total || 0}`);
            } else {
              // console.log(`${logPrefix} [VirusTotal] ⚠ IP scan failed or not found`);
            }
            return result;
          }).catch((error) => {
            console.error(`${logPrefix} [VirusTotal] ✗ Failed to analyze IP: ${error.message}`);
            return { scanned: false, error: error.message };
          })
        );
      } else {
        console.log(`${logPrefix} [VirusTotal] Disabled (not enabled for this plan or service unavailable)`);
        promises.push(Promise.resolve({ scanned: false, disabled: true }));
      }

      // AbuseIPDB (primary IP reputation service)
      if (enabled.abuseIPDB) {
        // console.log(`${logPrefix} [AbuseIPDB] Starting IP check...`);
        promises.push(
          abuseIPDBService.checkIP(ip, scanId).then((result) => {
            if (result.scanned) {
              // console.log(`${logPrefix} [AbuseIPDB] ✓ Successfully analyzed IP. Abuse Confidence: ${result.abuseConfidence || 0}%, Status: ${result.status || "unknown"}, Total Reports: ${result.totalReports || 0}`);
            } else {
              console.log(`${logPrefix} [AbuseIPDB] ⚠ Check failed or service unavailable`);
            }
            return result;
          }).catch((error) => {
            console.error(`${logPrefix} [AbuseIPDB] ✗ Failed to analyze IP: ${error.message}`);
            return { scanned: false, error: error.message };
          })
        );
      } else {
        console.log(`${logPrefix} [AbuseIPDB] Disabled (not enabled for this plan or service unavailable)`);
        promises.push(Promise.resolve({ scanned: false, disabled: true }));
      }

      // ThreatFox (IOC checking for IPs)
      if (enabled.threatFox) {
        // console.log(`${logPrefix} [ThreatFox] Starting IOC query for IP...`);
        promises.push(
          threatFoxService.queryIP(ip, scanId).then((result) => {
            if (result.scanned) {
              if (result.found) {
                // console.log(`${logPrefix} [ThreatFox] ✓ Successfully analyzed IP. IOC found: ${result.malwareFamily || "Unknown"}, Threat Type: ${result.threatType || "unknown"}`);
              } else {
                // console.log(`${logPrefix} [ThreatFox] ✓ Successfully analyzed IP. IOC not found in database (clean)`);
              }
            } else {
              console.log(`${logPrefix} [ThreatFox] ⚠ Query failed or service unavailable`);
            }
            return result;
          }).catch((error) => {
            console.error(`${logPrefix} [ThreatFox] ✗ Failed to analyze IP: ${error.message}`);
            return { scanned: false, error: error.message };
          })
        );
      } else {
        console.log(`${logPrefix} [ThreatFox] Disabled (not enabled for this plan or service unavailable)`);
        promises.push(Promise.resolve({ scanned: false, disabled: true }));
      }

      const [virusTotalResult, abuseIPDBResult, threatFoxResult] = await Promise.all(promises);

      results.virusTotal = virusTotalResult;
      results.abuseIPDB = abuseIPDBResult;
      results.threatFox = threatFoxResult;

      // Summary log
      const successfulScans = [
        results.virusTotal.scanned && "VirusTotal",
        results.abuseIPDB.scanned && "AbuseIPDB",
        results.threatFox.scanned && "ThreatFox",
      ].filter(Boolean);
      
      console.log(`${logPrefix} Threat intelligence IP analysis complete. Successfully analyzed by: ${successfulScans.length > 0 ? successfulScans.join(", ") : "None"}`);

      return results;
    } catch (error) {
      console.error(`${logPrefix} Unified threat intelligence IP scan error:`, error);
      return results;
    }
  }

  /**
   * Calculate overall security score and status
   */
  async calculateOverallSecurity(aiResults, threatResults) {
    let score = 100;
    const recommendations = [];

    // Deduct for code vulnerabilities
    if (aiResults && aiResults.summary) {
      score -= (aiResults.summary.critical || 0) * 20;
      score -= (aiResults.summary.high || 0) * 10;
      score -= (aiResults.summary.medium || 0) * 5;
      score -= (aiResults.summary.low || 0) * 2;

      if (aiResults.summary.critical > 0) {
        recommendations.push({
          title: `Fix ${aiResults.summary.critical} critical code vulnerability/vulnerabilities`,
          type: "code_vulnerability",
          severity: "critical",
        });
      }
      if (aiResults.summary.high > 0) {
        recommendations.push({
          title: `Address ${aiResults.summary.high} high-severity code vulnerability/vulnerabilities`,
          type: "code_vulnerability",
          severity: "high",
        });
      }
    }

    // Deduct for VirusTotal malware detection
    if (threatResults.virusTotal?.positives > 0) {
      const detectionRate = threatResults.virusTotal.detectionRate || 0;
      score -= Math.min(detectionRate * 2, 50);
      if (threatResults.virusTotal.positives > 5) {
        recommendations.push({
          title: "Malware detected by multiple antivirus engines - immediate action required",
          type: "malware",
          severity: "critical",
          malwareFamily: threatResults.virusTotal.tags?.[0] || "Unknown",
          detectionRate: detectionRate,
          engines: threatResults.virusTotal.positives,
          totalEngines: threatResults.virusTotal.total,
          threatCategories: threatResults.virusTotal.tags || [],
        });
      }
    }

    // Deduct for MalwareBazaar detection
    if (threatResults.malwareBazaar?.found) {
      score -= 40;
      recommendations.push({
        title: `Known malware detected: ${threatResults.malwareBazaar.malwareFamily || "Unknown"}`,
        type: "malware",
        severity: "critical",
        malwareFamily: threatResults.malwareBazaar.malwareFamily || "Unknown",
        signature: threatResults.malwareBazaar.signature,
        fileType: threatResults.malwareBazaar.fileType,
        threatLevel: threatResults.malwareBazaar.threatLevel,
        tags: threatResults.malwareBazaar.tags || [],
      });
    }

    // Deduct for malicious URL
    if (threatResults.urlhaus?.status === "malicious") {
      score -= 30;
      recommendations.push({
        title: "URL flagged as malicious by URLhaus",
        type: "malicious_url",
        severity: "high",
        threat: threatResults.urlhaus.threat,
        tags: threatResults.urlhaus.tags || [],
      });
    } else if (threatResults.urlhaus?.status === "suspicious") {
      score -= 15;
      recommendations.push({
        title: "URL flagged as suspicious",
        type: "malicious_url",
        severity: "medium",
        threat: threatResults.urlhaus.threat,
      });
    }

    // Deduct for Hybrid Analysis threat
    if (threatResults.hybridAnalysis?.threatScore >= 80 || threatResults.hybridAnalysis?.verdict === "malicious") {
      score -= 30;
      recommendations.push({
        title: `High threat detected by Hybrid Analysis: ${threatResults.hybridAnalysis.verdict || "malicious"}`,
        type: "malware",
        severity: threatResults.hybridAnalysis.threatScore >= 80 ? "critical" : "high",
        threatScore: threatResults.hybridAnalysis.threatScore,
        verdict: threatResults.hybridAnalysis.verdict,
        malwareFamily: threatResults.hybridAnalysis.malwareFamily,
      });
    }

    // Deduct for AbuseIPDB
    if (threatResults.abuseIPDB?.abuseConfidence >= 75) {
      score -= 25;
      recommendations.push({
        title: `High abuse confidence for IP: ${threatResults.abuseIPDB.abuseConfidence}%`,
        type: "malicious_ip",
        severity: "high",
        abuseConfidence: threatResults.abuseIPDB.abuseConfidence,
        totalReports: threatResults.abuseIPDB.totalReports,
        ip: threatResults.abuseIPDB.ip,
      });
    }

    // Deduct for ThreatFox
    if (threatResults.threatFox?.found && threatResults.threatFox.confidenceLevel >= 90) {
      score -= 20;
      recommendations.push({
        title: `IOC detected with high confidence: ${threatResults.threatFox.malwareFamily || "Unknown"}`,
        type: "malware",
        severity: "high",
        malwareFamily: threatResults.threatFox.malwareFamily,
        threatType: threatResults.threatFox.threatType,
        confidenceLevel: threatResults.threatFox.confidenceLevel,
      });
    }

    score = Math.max(0, Math.min(100, score));

    // Determine overall status
    let status = "safe";
    if (score < 30 || threatResults.virusTotal?.positives > 5 || threatResults.malwareBazaar?.found) {
      status = "critical";
    } else if (score < 50 || (aiResults?.summary?.critical || 0) > 0) {
      status = "critical";
    } else if (score < 70) {
      status = "high";
    } else if (score < 90) {
      status = "medium";
    } else if (score < 100) {
      status = "low";
    }

    const summary = this.generateSummary(aiResults, threatResults, status);

    // Generate detailed recommendations for malware threats
    const detailedRecommendations = await this.generateDetailedRecommendations(recommendations, threatResults);

    return {
      status,
      score: Math.round(score),
      summary,
      recommendations: detailedRecommendations.slice(0, 10), // Top 10 recommendations (now with details)
    };
  }

  /**
   * Generate detailed recommendations with symptoms, removal steps, etc.
   */
  async generateDetailedRecommendations(recommendations, threatResults) {
    const detailedRecs = [];

    for (const rec of recommendations) {
      // If it's already a string (backward compatibility), keep it simple
      if (typeof rec === 'string') {
        detailedRecs.push({ title: rec, type: 'general' });
        continue;
      }

      // For malware recommendations, generate detailed information
      if (rec.type === 'malware' && rec.malwareFamily) {
        try {
          const details = await this.generateMalwareDetails(rec, threatResults);
          detailedRecs.push({
            ...rec,
            ...details,
          });
        } catch (error) {
          console.error('Error generating malware details:', error);
          // Fallback to basic recommendation
          detailedRecs.push(rec);
        }
      } else {
        // For other types, use the recommendation as-is
        detailedRecs.push(rec);
      }
    }

    return detailedRecs;
  }

  /**
   * Generate detailed malware information using AI
   * Uses caching to reduce API calls and improve performance
   */
  async generateMalwareDetails(recommendation, threatResults) {
    const malwareFamily = recommendation.malwareFamily || "Unknown";
    const fileType = recommendation.fileType || threatResults.malwareBazaar?.fileType || "Unknown";
    const signature = recommendation.signature || threatResults.malwareBazaar?.signature || "";
    const tags = recommendation.tags || threatResults.malwareBazaar?.tags || [];
    const threatLevel = recommendation.threatLevel || threatResults.malwareBazaar?.threatLevel || "unknown";

    // Check cache first (24-hour TTL)
    const cacheKey = `malware_details_${malwareFamily.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    
    // Initialize simple in-memory cache if not exists
    if (!global.malwareDetailsCache) {
      global.malwareDetailsCache = new Map();
    }
    
    // Check cache
    const cached = global.malwareDetailsCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      // console.log(`[Threat Intelligence] Using cached malware details for: ${malwareFamily}`);
      return cached.data;
    }

    // Enhanced prompt for malware-specific information
    const prompt = `You are a cybersecurity expert specializing in malware analysis and removal. 
Provide detailed, malware-specific information about "${malwareFamily}" in JSON format.

**Malware Context:**
- Malware Family: ${malwareFamily}
- File Type: ${fileType}
- Signature: ${signature || "Not specified"}
- Tags: ${tags.join(", ") || "None"}
- Threat Level: ${threatLevel}

**IMPORTANT - Be Specific to ${malwareFamily}:**
Different malware families have unique behaviors. For example:
- MIRAI: IoT botnet that targets default credentials, creates botnet networks
- ILOVEYOU: Email worm that spreads via email attachments, modifies system files
- WannaCry: Ransomware that encrypts files and spreads via SMB vulnerability
- Stuxnet: Industrial control system malware targeting SCADA systems

**For ${malwareFamily} specifically, provide:**

1. **Symptoms** - Unique indicators specific to this malware:
   - How ${malwareFamily} manifests on infected systems
   - Specific files, processes, or registry keys it creates
   - Network behavior patterns (ports, protocols, C2 servers)
   - System modifications it makes
   - Any unique behavioral characteristics

2. **Removal Steps** - Specific to ${malwareFamily}:
   - Known persistence mechanisms (registry, services, scheduled tasks)
   - Specific files and directories to check/remove
   - Registry keys it modifies
   - Network connections to terminate
   - Processes to kill
   - Specific removal tools or commands if available
   - Order of operations (what to do first, second, etc.)

3. **Prevention** - Targeted prevention for ${malwareFamily}:
   - Known infection vectors (email, USB, network shares, etc.)
   - Specific vulnerabilities it exploits
   - Security controls that prevent this malware
   - Configuration changes needed
   - Patches or updates required

4. **Description** - What ${malwareFamily} does:
   - Primary purpose (data theft, ransomware, botnet, etc.)
   - How it operates
   - When it was first discovered
   - Notable characteristics

5. **Impact** - Specific risks and damage:
   - What data it targets
   - What systems it affects
   - Potential business impact
   - Data breach risks
   - System compromise scenarios

**Response Format (JSON only, no additional text):**
{
  "symptoms": ["specific symptom 1", "specific symptom 2", ...],
  "removalSteps": ["step 1", "step 2", ...],
  "prevention": ["prevention measure 1", "prevention measure 2", ...],
  "description": "Brief but specific description of ${malwareFamily}",
  "impact": "Specific impact description for ${malwareFamily}"
}

**CRITICAL REQUIREMENTS:**
- Be SPECIFIC to ${malwareFamily}, not generic malware advice
- Base recommendations on actual ${malwareFamily} behavior and characteristics
- If you don't know specific details about ${malwareFamily}, indicate uncertainty but provide best available information
- Return ONLY valid JSON, no markdown, no explanations, no additional text
- Symptoms should be unique to ${malwareFamily} when possible
- Removal steps should be actionable and specific to ${malwareFamily}'s persistence mechanisms`;

    try {
      const { chatService } = await import("../services/chatService.js");
      
      let fullResponse = "";
      await chatService.streamResponse(
        prompt,
        "mixtral-8x7b",
        "free",
        (chunk) => {
          fullResponse += chunk;
        },
        true
      );

      // Try to extract JSON from response
      let jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const details = JSON.parse(jsonMatch[0]);
        const result = {
          symptoms: details.symptoms || [],
          removalSteps: details.removalSteps || [],
          prevention: details.prevention || [],
          description: details.description || "",
          impact: details.impact || "",
        };

        // Cache the result for 24 hours (86400000 ms)
        if (!global.malwareDetailsCache) {
          global.malwareDetailsCache = new Map();
        }
        global.malwareDetailsCache.set(cacheKey, {
          data: result,
          expiry: Date.now() + 86400000 // 24 hours
        });
        // console.log(`[Threat Intelligence] Cached malware details for: ${malwareFamily}`);
        
        // Clean up expired cache entries (keep cache size manageable)
        if (global.malwareDetailsCache.size > 1000) {
          for (const [key, value] of global.malwareDetailsCache.entries()) {
            if (value.expiry <= Date.now()) {
              global.malwareDetailsCache.delete(key);
            }
          }
        }

        return result;
      }
    } catch (error) {
      console.error(`[Threat Intelligence] Error generating malware details for ${malwareFamily}:`, error.message);
    }

    // Fallback to generic information
    return {
      symptoms: [
        "Unusual system behavior",
        "Slow system performance",
        "Unexpected network activity",
        "Files or programs appearing without installation",
        "System crashes or freezes"
      ],
      removalSteps: [
        "Disconnect from the internet immediately",
        "Boot into Safe Mode",
        "Run a full system scan with updated antivirus software",
        "Use specialized malware removal tools",
        "Manually remove suspicious files and registry entries",
        "Restore system from a clean backup if available"
      ],
      prevention: [
        "Keep antivirus software updated",
        "Avoid downloading files from untrusted sources",
        "Enable firewall protection",
        "Regularly update operating system and software",
        "Be cautious with email attachments and links",
        "Use strong, unique passwords"
      ],
      description: `${malwareFamily} is a known malware threat that has been detected in your system.`,
      impact: "This malware can compromise system security, steal sensitive information, or cause system instability."
    };
  }

  /**
   * Generate summary text
   */
  generateSummary(aiResults, threatResults, status) {
    const parts = [];

    if (aiResults?.summary) {
      const vulnCount = (aiResults.summary.critical || 0) + (aiResults.summary.high || 0) + 
                       (aiResults.summary.medium || 0) + (aiResults.summary.low || 0);
      if (vulnCount > 0) {
        parts.push(`${vulnCount} code vulnerability/vulnerabilities found`);
      }
    }

    if (threatResults.virusTotal?.positives > 0) {
      parts.push(`${threatResults.virusTotal.positives} antivirus engine(s) detected threats`);
    }

    if (threatResults.malwareBazaar?.found) {
      parts.push("Known malware detected");
    }

    if (threatResults.urlhaus?.status === "malicious") {
      parts.push("URL flagged as malicious");
    }

    if (parts.length === 0) {
      return "No security issues detected";
    }

    return parts.join(", ");
  }

  /**
   * Generate AI insights for threat intelligence analysis
   * @param {object} threatResults - Threat intelligence results from all services
   * @param {string} target - Target being scanned (URL, IP, file path, hash)
   * @param {string} targetType - Type of target (url, ip, file, hash)
   * @returns {Promise<string|null>} AI-generated insights or null if generation fails
   */
  async generateThreatIntelligenceInsights(threatResults, target, targetType = "file") {
    try {
      // Create cache key based on threat results and target
      // Use hash if available (most reliable), otherwise use target
      const cacheKey = this.createInsightsCacheKey(threatResults, target, targetType);
      
      // Initialize cache if not exists
      if (!global.aiInsightsCache) {
        global.aiInsightsCache = new Map();
      }
      
      // Check cache first (24-hour TTL)
      const cached = global.aiInsightsCache.get(cacheKey);
      if (cached && cached.expiry > Date.now()) {
        // console.log(`[Threat Intelligence] Using cached AI insights for: ${targetType} ${target.substring(0, 50)}...`);
        return cached.data;
      }

      const pythonEngineUrl = process.env.PYTHON_ENGINE_URL || "http://localhost:5000";
      const axios = (await import("axios")).default;

      // Build detailed threat intelligence summary from ALL services
      const threatSummary = this.buildThreatIntelligenceSummary(threatResults);

      // Format target description based on type
      let targetDescription = "";
      if (targetType === "url") {
        targetDescription = `URL: ${target}`;
      } else if (targetType === "ip") {
        targetDescription = `IP Address: ${target}`;
      } else if (targetType === "hash") {
        targetDescription = `File Hash: ${target}`;
      } else {
        targetDescription = `File: ${target}`;
      }

      const insightsPrompt = `You are a cybersecurity expert analyzing threat intelligence data. This is a DIRECT ANALYSIS REQUEST, not a chat conversation. DO NOT introduce yourself or ask questions. Start immediately with the analysis.

Based on the comprehensive threat intelligence analysis of ${targetDescription}, provide a detailed security assessment.

**IMPORTANT CONTEXT:**
- This is a ${targetType === "hash" ? "file hash" : targetType === "url" ? "URL" : targetType === "ip" ? "IP address" : "file"} analysis
- Use the term "${targetType === "hash" ? "file/hash" : targetType === "url" ? "URL" : targetType === "ip" ? "IP address" : "file"}" throughout your analysis, NOT "URL" unless it's actually a URL scan
- The analysis includes results from multiple threat intelligence services

**Threat Intelligence Results from All Services:**
${threatSummary}

Provide a detailed security assessment covering:

1. **Threat Intelligence Overview:**
   - Overall threat level assessment (Critical/High/Medium/Low/Safe)
   - Summary of findings from ALL threat intelligence sources (VirusTotal, MalwareBazaar, Hybrid Analysis, ThreatFox, URLhaus, AbuseIPDB)
   - Risk level evaluation based on combined results

2. **Detailed Analysis by Service:**
   Analyze and explain the findings from EACH threat intelligence service that was used:
   - **VirusTotal**: Detection rate, number of engines, status, threat categories (tags), file type description, file name
   - **MalwareBazaar**: Malware signature, file type, MIME type, malware family, threat level, tags
   - **Hybrid Analysis**: Threat score, verdict, analysis details, malware family
   - **ThreatFox**: IOC findings, threat type, confidence level, malware family, tags
   - **URLhaus**: URL status, threat level, tags (if applicable)
   - **AbuseIPDB**: Abuse confidence, reports, IP reputation, ISP, country, usage type (if applicable)
   
   For each service, explain what the findings mean and their significance. Pay special attention to:
   - Threat categories/tags from VirusTotal (these indicate specific threat types)
   - Signature and file type information from MalwareBazaar (helps identify malware families)
   - MIME type information (helps understand file format and potential attack vectors)

3. **Possible Causes:**
   - What could have led to these threat indicators for this ${targetType === "hash" ? "file hash" : targetType}?
   - Potential attack vectors or infection methods
   - Security gaps that may have been exploited
   - Why this ${targetType === "hash" ? "file" : targetType} might be flagged

4. **Possible Effects:**
   - Immediate security risks if this ${targetType === "hash" ? "file is executed or downloaded" : targetType === "url" ? "URL is accessed" : targetType === "ip" ? "IP address is used" : "file is used"}
   - Potential business impact
   - Data breach risks
   - System compromise scenarios
   - Reputation damage

5. **Recommendations:**
   - Immediate action items (if threats detected)
   - Remediation steps specific to this ${targetType === "hash" ? "file hash" : targetType}
   - Security controls to implement
   - Monitoring and detection improvements
   - Best practices to follow

6. **Prevention Strategies:**
   - How to prevent similar threats in the future
   - Security hygiene recommendations
   - Threat intelligence integration strategies

**CRITICAL INSTRUCTION:** Throughout your entire response, refer to the target as "${targetType === "hash" ? "file/hash" : targetType === "url" ? "URL" : targetType === "ip" ? "IP address" : "file"}" or "${targetType === "hash" ? "this file" : targetType === "url" ? "this URL" : targetType === "ip" ? "this IP address" : "this file"}", NOT "URL" unless the targetType is actually "url". Be consistent with terminology.

Provide a comprehensive, well-structured analysis with clear sections, actionable recommendations, and detailed explanations. Use markdown formatting with headers (##, ###), bold text (**text**), bullet points, and numbered lists for better readability.`;

      // Call Python engine directly to avoid chat handler's security check
      // The chat handler adds a security check that causes unwanted assistant introductions
      try {
        const response = await axios.post(
          `${pythonEngineUrl}/api/analyze/threat-intelligence`,
          {
            prompt: insightsPrompt,
            modelId: "mixtral-8x7b",
          },
          {
            timeout: 120000, // 2 minutes timeout for analysis
          }
        );

        const result = response.data.insights || null;
        
        // Cache the result for 24 hours (86400000 ms)
        if (result) {
          global.aiInsightsCache.set(cacheKey, {
            data: result,
            expiry: Date.now() + 86400000 // 24 hours
          });
          console.log(`[Threat Intelligence] Cached AI insights for: ${targetType} ${target.substring(0, 50)}...`);
          
          // Clean up expired cache entries (keep cache size manageable)
          if (global.aiInsightsCache.size > 1000) {
            for (const [key, value] of global.aiInsightsCache.entries()) {
              if (value.expiry <= Date.now()) {
                global.aiInsightsCache.delete(key);
              }
            }
          }
        }
        
        return result;
      } catch (directError) {
        // Fallback to chat service if direct endpoint doesn't exist
        console.warn("Direct threat intelligence endpoint not available, using chat service:", directError.message);
        
        // Use the chat service with enhanced prompt
        
        // Enhanced prompt that explicitly tells the AI to skip the introduction
        const enhancedPrompt = `You are a cybersecurity expert providing a threat intelligence analysis. DO NOT introduce yourself or ask questions. Start directly with the analysis.

${insightsPrompt}`;

        const { chatService } = await import("../services/chatService.js");
        
        let fullResponse = "";
        await chatService.streamResponse(
          enhancedPrompt,
          "mixtral-8x7b",
          "free", // Default plan for insights generation
          (chunk) => {
            fullResponse += chunk;
          },
          true
        );

        // Remove any unwanted introduction text if it appears
        // The chat handler may add a security check that causes unwanted introductions
        if (fullResponse) {
          // Remove common introduction patterns
          const introPatterns = [
            /^I'm a security-focused assistant[^]*?(?=Given the security-related nature|Threat Intelligence|Overall Threat|Based on|Here's|Summary|##)/i,
            /^I'm a security-focused assistant[^]*?(?=\*\*Threat Intelligence)/i,
            /^I'm a security-focused assistant[^]*?(?=##)/i,
          ];
          
          for (const pattern of introPatterns) {
            fullResponse = fullResponse.replace(pattern, '').trim();
          }
          
          // If still starts with introduction, find the first meaningful content
          if (fullResponse.includes("I'm a security-focused assistant")) {
            // Look for common analysis starting points
            const startMarkers = [
              "Given the security-related nature",
              "## Threat Intelligence",
              "**Threat Intelligence",
              "Threat Intelligence Overview",
              "Overall Threat Level",
              "Based on the threat intelligence",
              "Here's a summary",
            ];
            
            for (const marker of startMarkers) {
              const markerIndex = fullResponse.indexOf(marker);
              if (markerIndex > 0) {
                fullResponse = fullResponse.substring(markerIndex);
                break;
              }
            }
            
            // If still not found, try to find first heading or bold text
            const headingMatch = fullResponse.match(/(?:^|\n)(?:##|###|\*\*)[^\n]+/);
            if (headingMatch && headingMatch.index > 0) {
              fullResponse = fullResponse.substring(headingMatch.index).trim();
            }
          }
        }

        const result = fullResponse || null;
        
        // Cache the result for 24 hours (86400000 ms)
        if (result) {
          global.aiInsightsCache.set(cacheKey, {
            data: result,
            expiry: Date.now() + 86400000 // 24 hours
          });
          console.log(`[Threat Intelligence] Cached AI insights for: ${targetType} ${target.substring(0, 50)}...`);
          
          // Clean up expired cache entries (keep cache size manageable)
          if (global.aiInsightsCache.size > 1000) {
            for (const [key, value] of global.aiInsightsCache.entries()) {
              if (value.expiry <= Date.now()) {
                global.aiInsightsCache.delete(key);
              }
            }
          }
        }
        
        return result;
      }
    } catch (error) {
      console.error("Error generating threat intelligence AI insights:", error);
      return null;
    }
  }

  /**
   * Create a cache key for AI insights based on threat results and target
   * @param {object} threatResults - Threat intelligence results
   * @param {string} target - Target being scanned
   * @param {string} targetType - Type of target
   * @returns {string} Cache key
   */
  createInsightsCacheKey(threatResults, target, targetType) {
    // Use hash if available (most reliable identifier)
    let identifier = target;
    
    if (threatResults.hashes?.sha256) {
      identifier = threatResults.hashes.sha256;
    } else if (threatResults.hashes?.sha1) {
      identifier = threatResults.hashes.sha1;
    } else if (threatResults.hashes?.md5) {
      identifier = threatResults.hashes.md5;
    } else if (targetType === "hash") {
      identifier = target;
    }
    
    // Create a deterministic key from threat results
    // Include key indicators that affect the analysis
    const keyParts = [
      targetType,
      identifier,
      threatResults.virusTotal?.positives || 0,
      threatResults.virusTotal?.status || "unknown",
      threatResults.malwareBazaar?.found ? "found" : "notfound",
      threatResults.malwareBazaar?.malwareFamily || "none",
      threatResults.hybridAnalysis?.verdict || "unknown",
      threatResults.hybridAnalysis?.threatScore || 0,
      threatResults.urlhaus?.status || "unknown",
      threatResults.abuseIPDB?.abuseConfidence || 0,
      threatResults.threatFox?.found ? "found" : "notfound",
    ];
    
    return `ai_insights_${keyParts.join("_")}`;
  }

  /**
   * Build a detailed summary of threat intelligence results for AI prompt
   */
  buildThreatIntelligenceSummary(threatResults) {
    const parts = [];

    if (threatResults.virusTotal?.scanned) {
      if (threatResults.virusTotal.found) {
        let vtInfo = `- **VirusTotal**: ${threatResults.virusTotal.positives || 0}/${threatResults.virusTotal.total || 0} antivirus engines detected threats (${threatResults.virusTotal.detectionRate || 0}% detection rate). Status: ${threatResults.virusTotal.status || "unknown"}.`;
        if (threatResults.virusTotal.tags && threatResults.virusTotal.tags.length > 0) {
          vtInfo += ` Threat Categories: ${threatResults.virusTotal.tags.join(", ")}.`;
        }
        if (threatResults.virusTotal.typeDescription) {
          vtInfo += ` File Type: ${threatResults.virusTotal.typeDescription}.`;
        }
        if (threatResults.virusTotal.meaningfulName) {
          vtInfo += ` File Name: ${threatResults.virusTotal.meaningfulName}.`;
        }
        // IP-specific fields
        if (threatResults.virusTotal.asn) {
          vtInfo += ` ASN: ${threatResults.virusTotal.asn}.`;
        }
        if (threatResults.virusTotal.asOwner) {
          vtInfo += ` AS Owner: ${threatResults.virusTotal.asOwner}.`;
        }
        if (threatResults.virusTotal.country) {
          vtInfo += ` Country: ${threatResults.virusTotal.country}.`;
        }
        if (threatResults.virusTotal.reputation !== undefined) {
          vtInfo += ` Reputation: ${threatResults.virusTotal.reputation}.`;
        }
        parts.push(vtInfo);
      } else {
        parts.push(`- **VirusTotal**: No threats detected.`);
      }
    }

    if (threatResults.malwareBazaar?.scanned) {
      if (threatResults.malwareBazaar.found) {
        let mbInfo = `- **MalwareBazaar**: Known malware detected.`;
        if (threatResults.malwareBazaar.signature) {
          mbInfo += ` Signature: ${threatResults.malwareBazaar.signature}.`;
        }
        if (threatResults.malwareBazaar.fileType) {
          mbInfo += ` File Type: ${threatResults.malwareBazaar.fileType}.`;
        }
        if (threatResults.malwareBazaar.fileTypeMime) {
          mbInfo += ` MIME Type: ${threatResults.malwareBazaar.fileTypeMime}.`;
        }
        mbInfo += ` Family: ${threatResults.malwareBazaar.malwareFamily || "Unknown"}. Threat Level: ${threatResults.malwareBazaar.threatLevel || "unknown"}.`;
        if (threatResults.malwareBazaar.tags && threatResults.malwareBazaar.tags.length > 0) {
          mbInfo += ` Tags: ${threatResults.malwareBazaar.tags.join(", ")}.`;
        }
        parts.push(mbInfo);
      } else {
        parts.push(`- **MalwareBazaar**: Not found in malware database.`);
      }
    }

    if (threatResults.urlhaus?.scanned) {
      if (threatResults.urlhaus.found) {
        parts.push(`- **URLhaus**: URL flagged as ${threatResults.urlhaus.status || "unknown"}. Threat: ${threatResults.urlhaus.threat || "Unknown"}. URL Status: ${threatResults.urlhaus.urlStatus || "unknown"}.`);
      } else {
        parts.push(`- **URLhaus**: URL not found in malicious URL database.`);
      }
    }

    if (threatResults.hybridAnalysis?.scanned) {
      if (threatResults.hybridAnalysis.found) {
        let haInfo = `- **Hybrid Analysis**: Threat Score: ${threatResults.hybridAnalysis.threatScore || 0}/100. Verdict: ${threatResults.hybridAnalysis.verdict || "unknown"}.`;
        if (threatResults.hybridAnalysis.malwareFamily) {
          haInfo += ` Malware Family: ${threatResults.hybridAnalysis.malwareFamily}.`;
        }
        if (threatResults.hybridAnalysis.environmentDescription) {
          haInfo += ` Environment: ${threatResults.hybridAnalysis.environmentDescription}.`;
        }
        if (threatResults.hybridAnalysis.tags && threatResults.hybridAnalysis.tags.length > 0) {
          haInfo += ` Tags: ${threatResults.hybridAnalysis.tags.join(", ")}.`;
        }
        parts.push(haInfo);
      } else {
        parts.push(`- **Hybrid Analysis**: Not found in database or analysis pending.`);
      }
    } else if (threatResults.hybridAnalysis?.error) {
      parts.push(`- **Hybrid Analysis**: Analysis failed - ${threatResults.hybridAnalysis.error}`);
    }

    if (threatResults.abuseIPDB?.scanned) {
      parts.push(`- **AbuseIPDB**: Abuse Confidence: ${threatResults.abuseIPDB.abuseConfidence || 0}%. Status: ${threatResults.abuseIPDB.status || "unknown"}. Total Reports: ${threatResults.abuseIPDB.totalReports || 0}. ISP: ${threatResults.abuseIPDB.isp || "Unknown"}. Country: ${threatResults.abuseIPDB.countryCode || "Unknown"}.`);
    }

    if (threatResults.threatFox?.scanned) {
      if (threatResults.threatFox.found) {
        parts.push(`- **ThreatFox**: IOC detected. Type: ${threatResults.threatFox.iocType || "Unknown"}, Threat Type: ${threatResults.threatFox.threatType || "Unknown"}, Malware Family: ${threatResults.threatFox.malwareFamily || "Unknown"}. Confidence: ${threatResults.threatFox.confidenceLevel || 0}%.`);
      } else {
        parts.push(`- **ThreatFox**: IOC not found in database.`);
      }
    }

    if (parts.length === 0) {
      return "- No threat intelligence data available.";
    }

    return parts.join("\n   ");
  }
}

export const unifiedThreatIntelligenceService = new UnifiedThreatIntelligenceService();

