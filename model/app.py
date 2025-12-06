"""
IntelliShieldX AI Engine - Python Flask Server
Handles AI model interactions, chat streaming, and security analysis
"""

from flask import Flask, request, Response, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import json
import re
import time

from llm.chat_handler import ChatHandler
from llm.model_manager import ModelManager
from llm.prompts import get_documentation_prompt, get_documentation_chat_prompt

load_dotenv()

app = Flask(__name__)
CORS(app)

# Initialize managers
model_manager = ModelManager()
chat_handler = ChatHandler(model_manager)


@app.route("/", methods=["GET"])
def root():
    """Root endpoint"""
    return jsonify({
        "service": "IntelliShieldX AI Engine",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "chat": "/api/chat/stream",
            "models": "/api/models/available",
            "security": "/api/analyze/security"
        }
    })


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok", "service": "intellishieldx-ai-engine"})


@app.route("/api/chat/stream", methods=["POST"])
def chat_stream():
    """Stream chat responses from AI models"""
    try:
        data = request.get_json()
        message = data.get("message")
        model_id = data.get("modelId", "mixtral-8x7b")  # Default to Groq for safety
        user_plan = data.get("userPlan", "free")
        is_authenticated = data.get("isAuthenticated", False)

        if not message:
            return jsonify({"error": "Message is required"}), 400

        # Validate model access for free tier unauthenticated users
        if user_plan == "free" and not is_authenticated:
            available_models = model_manager.get_available_models(user_plan, False)
            model_config = next((m for m in available_models if m["id"] == model_id), None)
            if not model_config or model_config.get("provider") != "Groq":
                # Force Groq model for unauthenticated free tier
                groq_model = next((m for m in available_models if m.get("provider") == "Groq"), None)
                if groq_model:
                    model_id = groq_model["id"]
                else:
                    model_id = "mixtral-8x7b"

        def generate():
            try:
                # Get timeout from request (default 30 seconds)
                timeout = int(data.get("timeout", 30))
                
                for chunk in chat_handler.stream_response(
                    message, model_id, user_plan, mode="normal", 
                    is_authenticated=is_authenticated, timeout=timeout
                ):
                    yield f"data: {json.dumps({'content': chunk})}\n\n"
                yield "data: [DONE]\n\n"
            except ValueError as e:
                # Handle configuration errors (missing API keys, etc.)
                error_msg = str(e)
                error_data = json.dumps({"error": error_msg, "type": "configuration_error"})
                yield f"data: {error_data}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as e:
                error_data = json.dumps({"error": str(e), "type": "api_error"})
                yield f"data: {error_data}\n\n"
                yield "data: [DONE]\n\n"

        return Response(
            generate(),
            mimetype="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/models/available", methods=["GET"])
def get_available_models():
    """Get list of available AI models"""
    try:
        user_plan = request.args.get("plan", "free")
        is_authenticated = request.args.get("authenticated", "true").lower() == "true"
        models = model_manager.get_available_models(user_plan, is_authenticated)
        return jsonify(models)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/analyze/security", methods=["POST"])
def analyze_security():
    """Analyze code/files for security vulnerabilities using AI"""
    try:
        data = request.get_json()
        files = data.get("files", [])
        code = data.get("code")  # Legacy support
        file_type = data.get("fileType", "unknown")

        if not files and not code:
            return jsonify({"error": "Code or files are required"}), 400

        # Use AI to analyze security vulnerabilities
        vulnerabilities = []
        ai_insights = None

        # If files are provided, analyze each file
        if files:
            for file_data in files:
                file_content = file_data.get("content", "")
                file_name = file_data.get("name", "unknown")
                
                if not file_content:
                    continue

                # Use AI to analyze the code
                analysis_prompt = f"""Perform a comprehensive security analysis of the following code file covering all security domains:

File: {file_name}
Code:
{file_content}

Conduct a thorough security assessment across the following security domains:

1. CYBER SECURITY:
   - Network security vulnerabilities
   - Malware and threat detection issues
   - Intrusion detection and prevention gaps
   - Security architecture weaknesses
   - Threat modeling concerns

2. DATA PRIVACY:
   - Personal data exposure (PII, PHI, financial data)
   - Data anonymization and pseudonymization issues
   - Data minimization violations
   - Consent management problems
   - Data retention and deletion issues
   - Cross-border data transfer concerns

3. INFORMATION SECURITY:
   - Confidentiality breaches (data leaks, exposure)
   - Integrity violations (data tampering, unauthorized modifications)
   - Availability issues (DoS, resource exhaustion)
   - Information classification and handling errors
   - Data loss prevention gaps

4. WEB APPLICATION SECURITY:
   - Injection attacks (SQL, NoSQL, LDAP, OS command, XPath, XXE)
   - Cross-Site Scripting (XSS) - Reflected, Stored, DOM-based
   - Cross-Site Request Forgery (CSRF)
   - Broken authentication and session management
   - Insecure direct object references
   - Security misconfiguration
   - Sensitive data exposure
   - Missing function-level access control
   - Using components with known vulnerabilities
   - Insufficient logging and monitoring
   - API security issues (authentication, authorization, rate limiting)
   - CORS misconfigurations
   - Clickjacking vulnerabilities

5. COMPLIANCE & REGULATORY:
   - GDPR compliance issues (EU General Data Protection Regulation)
   - HIPAA violations (Health Insurance Portability and Accountability Act)
   - PCI-DSS non-compliance (Payment Card Industry Data Security Standard)
   - SOC 2 gaps (Service Organization Control 2)
   - ISO 27001 alignment issues
   - NIST Cybersecurity Framework deviations
   - CCPA/CPRA compliance (California Consumer Privacy Act)
   - FERPA violations (Family Educational Rights and Privacy Act)
   - SOX compliance issues (Sarbanes-Oxley Act)
   - Industry-specific regulatory requirements

6. GOVERNANCE & RISK MANAGEMENT:
   - Security policy violations
   - Risk assessment gaps
   - Security control deficiencies
   - Incident response readiness issues
   - Business continuity and disaster recovery concerns
   - Third-party risk management
   - Vendor security assessment gaps
   - Security awareness and training needs

7. CRYPTOGRAPHY & ENCRYPTION:
   - Weak encryption algorithms
   - Improper key management
   - Hardcoded secrets and credentials
   - Insecure random number generation
   - Certificate validation issues
   - TLS/SSL misconfigurations
   - Hash function weaknesses

8. ACCESS CONTROL & AUTHORIZATION:
   - Privilege escalation vulnerabilities
   - Broken access control
   - Inadequate authentication mechanisms
   - Session management flaws
   - Multi-factor authentication gaps
   - Role-based access control (RBAC) issues
   - Attribute-based access control (ABAC) problems

9. SECURE CODING PRACTICES:
   - Input validation failures
   - Output encoding issues
   - Error handling and information disclosure
   - Logging and monitoring deficiencies
   - Secure configuration management
   - Dependency management issues
   - Code quality and maintainability concerns

10. INFRASTRUCTURE & DEVOPS SECURITY:
    - Container security issues
    - CI/CD pipeline vulnerabilities
    - Infrastructure as Code (IaC) misconfigurations
    - Cloud security gaps (AWS, Azure, GCP)
    - Secrets management problems
    - Network segmentation issues

For each vulnerability found, provide:
1. Vulnerability name and type
2. Severity level (critical, high, medium, low)
3. CWE classification
4. OWASP Top 10 mapping
5. Compliance/regulatory impact (GDPR, HIPAA, PCI-DSS, etc.)
6. Line numbers where issues occur
7. Detailed description with attack vectors
8. Original vulnerable code snippet
9. Secure code fix with remediation
10. Additional recommendations and best practices

Format your response as JSON with this structure:
{{
  "vulnerabilities": [
    {{
      "cwe": "CWE-XXX",
      "name": "Vulnerability Name",
      "severity": "critical|high|medium|low",
      "line": line_number,
      "description": "Detailed description",
      "originalCode": "Original vulnerable code snippet from the file (include surrounding context if helpful)",
      "fixCode": "Secure code fix example with the same context",
      "recommendation": "Additional recommendations or best practices",
      "owaspTop10": "A01|A02|A03|A04|A05|A06|A07|A08|A09|A10|N/A"
    }}
  ]
}}

OWASP Top 10 2021 Mapping:
- A01: Broken Access Control (CWE-284, CWE-639, CWE-285)
- A02: Cryptographic Failures (CWE-327, CWE-759, CWE-798)
- A03: Injection (CWE-79, CWE-89, CWE-73, CWE-78)
- A04: Insecure Design (CWE-209, CWE-213, CWE-352)
- A05: Security Misconfiguration (CWE-16, CWE-209, CWE-352)
- A06: Vulnerable and Outdated Components (CWE-1104)
- A07: Identification and Authentication Failures (CWE-287, CWE-798, CWE-521)
- A08: Software and Data Integrity Failures (CWE-345, CWE-494, CWE-502)
- A09: Security Logging and Monitoring Failures (CWE-778, CWE-117)
- A10: Server-Side Request Forgery (CWE-918)

IMPORTANT: 
1. Include the originalCode field showing the actual vulnerable code from the file
2. Provide fixCode with the corrected version
3. Map each vulnerability to the appropriate OWASP Top 10 category (A01-A10) or "N/A" if not applicable"""

                # Try multiple models with rate limit handling
                models_to_try = ["mixtral-8x7b", "llama-3.3-70b", "gemini-pro"]
                file_analyzed = False
                
                for model_id in models_to_try:
                    try:
                        model_config = model_manager.get_model_config(model_id)
                        client = model_manager.get_client(model_id)
                        
                        if not client or not model_config:
                            continue
                        
                        # Add delay between file analyses to avoid rate limits
                        if file_data != files[0]:  # Don't delay first file
                            time.sleep(2)  # 2 second delay between files
                        
                        # Determine actual model name based on provider
                        if model_config["client"] == "groq":
                            actual_model_name = model_config.get("groq_model_name", model_id)
                        elif model_config["client"] == "google":
                            actual_model_name = model_config.get("google_model_name", model_id)
                        else:
                            actual_model_name = model_id
                        
                        # Make API call with retry logic for rate limits
                        max_retries = 3
                        retry_delay = 5  # Start with 5 seconds
                        
                        for attempt in range(max_retries):
                            try:
                                if model_config["client"] == "groq":
                                    response = client.chat.completions.create(
                                        model=actual_model_name,
                                        messages=[
                                            {
                                                "role": "system",
                                                "content": "You are a comprehensive security expert specializing in cyber security, data privacy, information security, web application security, compliance (GDPR, HIPAA, PCI-DSS, SOC 2, ISO 27001, NIST), governance, and risk management. Analyze code for vulnerabilities across all security domains and provide detailed security analysis. IMPORTANT: Respond ONLY with valid JSON, no additional text."
                                            },
                                            {"role": "user", "content": analysis_prompt}
                                        ],
                                        temperature=0.3,
                                    )
                                elif model_config["client"] == "google":
                                    import google.generativeai as genai
                                    genai_model = genai.GenerativeModel(actual_model_name)
                                    response_obj = genai_model.generate_content(analysis_prompt)
                                    # Convert Google response to similar format
                                    class MockResponse:
                                        def __init__(self, content):
                                            self.choices = [type('obj', (object,), {
                                                'message': type('obj', (object,), {'content': content})()
                                            })()]
                                    response = MockResponse(response_obj.text)
                                else:
                                    continue  # Skip unsupported clients
                                
                                # Extract JSON from response
                                response_text = response.choices[0].message.content.strip()
                                
                                # Remove markdown code blocks if present
                                if response_text.startswith("```json"):
                                    response_text = response_text[7:]
                                if response_text.startswith("```"):
                                    response_text = response_text[3:]
                                if response_text.endswith("```"):
                                    response_text = response_text[:-3]
                                response_text = response_text.strip()
                                
                                # Parse JSON with better error handling
                                try:
                                    result = json.loads(response_text)
                                except json.JSONDecodeError as json_err:
                                    # Try to extract JSON object from text (handle common issues)
                                    # First, try to find JSON block in markdown
                                    json_match = re.search(r'```json\s*(\{[\s\S]*?\})\s*```', response_text)
                                    if not json_match:
                                        # Try to find any JSON object
                                        json_match = re.search(r'(\{[\s\S]*\})', response_text)
                                    
                                    if json_match:
                                        json_str = json_match.group(1) if json_match.lastindex else json_match.group(0)
                                        try:
                                            # Try to fix common JSON issues
                                            # Remove trailing commas
                                            json_str = re.sub(r',\s*}', '}', json_str)
                                            json_str = re.sub(r',\s*]', ']', json_str)
                                            # Fix unquoted keys (basic attempt)
                                            json_str = re.sub(r'(\w+):', r'"\1":', json_str)
                                            result = json.loads(json_str)
                                        except json.JSONDecodeError:
                                            print(f"⚠️  JSON parsing error for {file_name} with {model_id}: {str(json_err)[:200]}")
                                            if attempt < max_retries - 1:
                                                time.sleep(retry_delay)
                                                retry_delay *= 2  # Exponential backoff
                                                continue
                                            else:
                                                break  # Try next model
                                    else:
                                        print(f"⚠️  No JSON found in response for {file_name} with {model_id}. Response preview: {response_text[:200]}...")
                                        if attempt < max_retries - 1:
                                            time.sleep(retry_delay)
                                            retry_delay *= 2
                                            continue
                                        else:
                                            break  # Try next model
                                
                                file_vulns = result.get("vulnerabilities", [])
                                
                                # Add file name to each vulnerability
                                for vuln in file_vulns:
                                    vuln["file"] = file_name
                                    vuln["id"] = f"{file_name}_{vuln.get('line', 0)}_{len(vulnerabilities)}"
                                
                                vulnerabilities.extend(file_vulns)
                                file_analyzed = True
                                print(f"✅ Analyzed {file_name} using {model_config.get('name', model_id)}")
                                break  # Success, exit retry loop
                                
                            except Exception as api_error:
                                error_str = str(api_error)
                                
                                # Check for rate limit errors
                                if "429" in error_str or "rate_limit" in error_str.lower() or "rate limit" in error_str.lower():
                                    # Extract wait time if available
                                    wait_time_match = re.search(r'(\d+\.?\d*)\s*s', error_str, re.IGNORECASE)
                                    if wait_time_match:
                                        wait_time = float(wait_time_match.group(1)) + 2  # Add 2 seconds buffer
                                    else:
                                        wait_time = retry_delay
                                    
                                    print(f"⏳ Rate limit hit for {model_id} on {file_name}. Waiting {wait_time:.1f}s...")
                                    time.sleep(wait_time)
                                    
                                    if attempt < max_retries - 1:
                                        retry_delay *= 2  # Exponential backoff
                                        continue
                                    else:
                                        print(f"⚠️  Rate limit exceeded for {model_id}, trying next model...")
                                        break  # Try next model
                                else:
                                    # Other errors - log and try next model
                                    print(f"⚠️  Error with {model_id} on {file_name}: {error_str[:200]}")
                                    if attempt < max_retries - 1:
                                        time.sleep(retry_delay)
                                        retry_delay *= 2
                                        continue
                                    else:
                                        break  # Try next model
                        
                        if file_analyzed:
                            break  # Successfully analyzed, exit model loop
                            
                    except Exception as e:
                        print(f"⚠️  Error analyzing file {file_name} with {model_id}: {str(e)[:200]}")
                        continue
                
                if not file_analyzed:
                    print(f"❌ Failed to analyze {file_name} with all available models")

        # Generate AI insights summary
        if vulnerabilities:
            critical_count = len([v for v in vulnerabilities if v.get('severity') == 'critical'])
            high_count = len([v for v in vulnerabilities if v.get('severity') == 'high'])
            medium_count = len([v for v in vulnerabilities if v.get('severity') == 'medium'])
            low_count = len([v for v in vulnerabilities if v.get('severity') == 'low'])
            owasp_count = len([v for v in vulnerabilities if v.get('owaspTop10') and v.get('owaspTop10') != 'N/A'])
            
            insights_prompt = f"""Based on the comprehensive security scan results, provide a detailed security assessment covering:

1. **Overall Security Assessment:**
   - Overall security posture rating (Excellent/Good/Fair/Poor/Critical)
   - Risk level assessment
   - Security maturity evaluation

2. **Critical Issues to Address First:**
   - Prioritized list of most critical vulnerabilities
   - Immediate action items
   - Business impact assessment

3. **Security Domain Analysis:**
   - Cyber security concerns
   - Data privacy violations and GDPR/HIPAA/PCI-DSS compliance gaps
   - Information security risks
   - Web application security issues
   - Compliance and regulatory violations
   - Governance and risk management gaps

4. **Compliance Impact:**
   - GDPR compliance status and violations
   - HIPAA compliance concerns (if applicable)
   - PCI-DSS compliance issues (if applicable)
   - Other regulatory requirements affected

5. **General Recommendations:**
   - Security improvements needed
   - Best practices to implement
   - Security controls to strengthen
   - Remediation roadmap suggestions

6. **Security Best Practices:**
   - Secure coding guidelines
   - Security architecture recommendations
   - Monitoring and logging improvements
   - Incident response enhancements

Scan Statistics:
- Total Vulnerabilities: {len(vulnerabilities)}
- Critical: {critical_count}
- High: {high_count}
- Medium: {medium_count}
- Low: {low_count}
- OWASP Top 10: {owasp_count}

Provide a comprehensive, well-structured summary with clear sections, actionable recommendations, and compliance guidance. Use markdown formatting with headers (##, ###), bold text (**text**), bullet points, and numbered lists for better readability."""

            try:
                client = model_manager.get_client("mixtral-8x7b")
                if client:
                    model_config = model_manager.get_model_config("mixtral-8x7b")
                    groq_model_name = model_config.get("groq_model_name", "llama-3.1-8b-instant")
                    
                    response = client.chat.completions.create(
                        model=groq_model_name,
                        messages=[
                            {
                                "role": "system",
                                "content": "You are a comprehensive security expert specializing in cyber security, data privacy, information security, web application security, compliance (GDPR, HIPAA, PCI-DSS, SOC 2, ISO 27001, NIST), governance, and risk management. Provide detailed, actionable security insights covering all security domains."
                            },
                            {"role": "user", "content": insights_prompt}
                        ],
                        temperature=0.5,
                    )
                    ai_insights = response.choices[0].message.content
            except Exception as e:
                print(f"Error generating AI insights: {e}")

        # Calculate summary
        summary = {
            "critical": len([v for v in vulnerabilities if v.get("severity") == "critical"]),
            "high": len([v for v in vulnerabilities if v.get("severity") == "high"]),
            "medium": len([v for v in vulnerabilities if v.get("severity") == "medium"]),
            "low": len([v for v in vulnerabilities if v.get("severity") == "low"]),
        }

        return jsonify({
            "vulnerabilities": vulnerabilities,
            "summary": summary,
            "aiInsights": ai_insights,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/analyze/url", methods=["POST"])
def analyze_url():
    """Analyze URL for security vulnerabilities using AI"""
    try:
        data = request.get_json()
        url = data.get("url")

        if not url:
            return jsonify({"error": "URL is required"}), 400

        # Basic security checks (can be enhanced with actual HTTP requests)
        security_checks = {
            "ssl": url.startswith("https://"),
            "http_methods": "GET, POST",
            "headers": {},
        }

        # Use AI to analyze URL security
        analysis_prompt = f"""Perform a comprehensive security analysis of the following URL covering all security domains:

URL: {url}

Conduct a thorough security assessment across the following security domains:

1. CYBER SECURITY:
   - Network security vulnerabilities
   - SSL/TLS configuration and certificate issues
   - Protocol security (HTTP/HTTPS, HTTP/2, HTTP/3)
   - DNS security concerns
   - Threat detection and prevention gaps

2. DATA PRIVACY:
   - Personal data exposure risks
   - Privacy policy and data handling concerns
   - Cookie and tracking technology usage
   - GDPR, CCPA, and other privacy regulation compliance
   - Data transmission security

3. INFORMATION SECURITY:
   - Confidentiality, integrity, and availability concerns
   - Information disclosure risks
   - Data leakage vulnerabilities
   - Information classification issues

4. WEB APPLICATION SECURITY:
   - OWASP Top 10 vulnerabilities
   - Injection attack vectors (SQL, XSS, Command, etc.)
   - Authentication and authorization flaws
   - Session management issues
   - CSRF and clickjacking vulnerabilities
   - API security concerns
   - CORS misconfigurations

5. SECURITY HEADERS & CONFIGURATION:
   - Content Security Policy (CSP)
   - HTTP Strict Transport Security (HSTS)
   - X-Frame-Options
   - X-Content-Type-Options
   - Referrer-Policy
   - Permissions-Policy
   - Security headers missing or misconfigured

6. COMPLIANCE & REGULATORY:
   - GDPR compliance issues
   - HIPAA compliance (if healthcare-related)
   - PCI-DSS compliance (if payment processing)
   - SOC 2 alignment
   - ISO 27001 requirements
   - NIST Cybersecurity Framework
   - Industry-specific regulatory requirements

7. GOVERNANCE & RISK MANAGEMENT:
   - Security policy adherence
   - Risk assessment gaps
   - Incident response readiness
   - Business continuity concerns
   - Third-party risk management

8. CRYPTOGRAPHY & ENCRYPTION:
   - TLS/SSL version and cipher suite analysis
   - Certificate validation issues
   - Weak encryption algorithms
   - Perfect Forward Secrecy (PFS) support

9. ACCESS CONTROL:
   - Authentication mechanisms
   - Authorization flaws
   - Access control misconfigurations
   - Privilege escalation risks

10. SECURE CONFIGURATION:
    - Server configuration issues
    - Default credentials or configurations
    - Unnecessary services or ports exposed
    - Error handling and information disclosure

Provide a detailed security analysis in JSON format:
{{
  "vulnerabilities": [
    {{
      "cwe": "CWE-XXX",
      "name": "Vulnerability Name",
      "severity": "critical|high|medium|low",
      "description": "Detailed description with security domain context",
      "recommendation": "How to fix with compliance considerations",
      "owaspTop10": "A01|A02|A03|A04|A05|A06|A07|A08|A09|A10|N/A",
      "complianceImpact": "GDPR|HIPAA|PCI-DSS|SOC2|ISO27001|NIST|N/A"
    }}
  ],
  "recommendations": ["General security recommendations covering all domains"]
}}

IMPORTANT: Analyze across all security domains and provide comprehensive coverage of cyber security, data privacy, information security, web application security, compliance, and governance concerns."""

        vulnerabilities = []
        ai_insights = None

        try:
            client = model_manager.get_client("mixtral-8x7b")
            if client:
                model_config = model_manager.get_model_config("mixtral-8x7b")
                groq_model_name = model_config.get("groq_model_name", "llama-3.1-8b-instant")
                
                response = client.chat.completions.create(
                    model=groq_model_name,
                    messages=[
                        {
                            "role": "system",
                            "content": "You are a comprehensive security expert specializing in cyber security, data privacy, information security, web application security, compliance (GDPR, HIPAA, PCI-DSS, SOC 2, ISO 27001, NIST), governance, and risk management. Analyze URLs for security issues across all security domains and provide comprehensive recommendations. IMPORTANT: Respond ONLY with valid JSON, no additional text."
                        },
                        {"role": "user", "content": analysis_prompt}
                    ],
                    temperature=0.3,
                )
                
                # Extract JSON from response
                response_text = response.choices[0].message.content.strip()
                
                # Remove markdown code blocks if present
                if response_text.startswith("```json"):
                    response_text = response_text[7:]
                if response_text.startswith("```"):
                    response_text = response_text[3:]
                if response_text.endswith("```"):
                    response_text = response_text[:-3]
                response_text = response_text.strip()
                
                try:
                    result = json.loads(response_text)
                except json.JSONDecodeError:
                    # Try to extract JSON object from text
                    json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                    if json_match:
                        result = json.loads(json_match.group())
                    else:
                        result = {"vulnerabilities": []}
                
                vulnerabilities = result.get("vulnerabilities", [])
                
                # Add IDs to vulnerabilities
                for i, vuln in enumerate(vulnerabilities):
                    vuln["id"] = f"url_{i}"
                    vuln["url"] = url
                
                # Generate insights
                if vulnerabilities:
                    insights_prompt = f"""Based on the comprehensive URL security scan of {url}, provide a detailed security assessment covering:

1. **Overall Security Assessment:**
   - Overall security posture rating (Excellent/Good/Fair/Poor/Critical)
   - Risk level assessment
   - Security maturity evaluation

2. **Critical Security Issues:**
   - Prioritized list of most critical vulnerabilities
   - Immediate action items
   - Business impact assessment

3. **Security Domain Analysis:**
   - Cyber security concerns (network security, threat detection)
   - Data privacy violations and compliance gaps (GDPR, HIPAA, PCI-DSS)
   - Information security risks (confidentiality, integrity, availability)
   - Web application security issues (OWASP Top 10, injection, XSS, CSRF)
   - Compliance and regulatory violations
   - Governance and risk management gaps

4. **Compliance Impact:**
   - GDPR compliance status and violations
   - HIPAA compliance concerns (if applicable)
   - PCI-DSS compliance issues (if applicable)
   - Other regulatory requirements affected

5. **General Recommendations:**
   - Security improvements needed
   - Best practices to implement
   - Security controls to strengthen
   - Remediation roadmap suggestions

6. **Security Best Practices:**
   - Secure configuration guidelines
   - Security architecture recommendations
   - Monitoring and logging improvements
   - Incident response enhancements

Provide a comprehensive, well-structured summary with clear sections, actionable recommendations, and compliance guidance. Use markdown formatting with headers (##, ###), bold text (**text**), bullet points, and numbered lists for better readability."""
                    
                    insights_response = client.chat.completions.create(
                        model=groq_model_name,
                        messages=[
                            {
                                "role": "system",
                                "content": "You are a security expert providing actionable insights."
                            },
                            {"role": "user", "content": insights_prompt}
                        ],
                        temperature=0.5,
                    )
                    ai_insights = insights_response.choices[0].message.content
        except Exception as e:
            print(f"Error in AI URL analysis: {e}")

        summary = {
            "critical": len([v for v in vulnerabilities if v.get("severity") == "critical"]),
            "high": len([v for v in vulnerabilities if v.get("severity") == "high"]),
            "medium": len([v for v in vulnerabilities if v.get("severity") == "medium"]),
            "low": len([v for v in vulnerabilities if v.get("severity") == "low"]),
        }

        return jsonify({
            "vulnerabilities": vulnerabilities,
            "summary": summary,
            "aiInsights": ai_insights,
            "securityChecks": security_checks,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/analyze/documentation", methods=["POST"])
def analyze_documentation():
    """Generate documentation from repository files"""
    try:
        data = request.json
        files = data.get("files", [])
        user_plan = data.get("userPlan", "free")
        is_authenticated = data.get("isAuthenticated", True)
        
        if not files:
            return jsonify({"error": "No files provided"}), 400

        # Prepare file contents for analysis
        file_contents = []
        for file in files:
            file_contents.append({
                "path": file.get("path", ""),
                "content": file.get("content", ""),
                "language": file.get("language", ""),
            })

        # Create documentation prompt
        prompt = get_documentation_prompt()
        
        # Add file contents to prompt
        files_text = "\n\n".join([
            f"File: {f['path']}\nLanguage: {f['language']}\n\n{f['content']}"
            for f in file_contents
        ])
        
        full_prompt = f"{prompt}\n\nAnalyze the following codebase:\n\n{files_text}"

        # Get available models for user's plan
        available_models = model_manager.get_available_models(user_plan, is_authenticated)
        available_model_ids = [m["id"] for m in available_models if m.get("available", False)]
        
        print(f"📋 Available models for plan '{user_plan}' (authenticated: {is_authenticated}): {available_model_ids}")
        
        # Preferred models for documentation (in order of preference)
        # Note: Only Groq and Google AI models are currently available
        # OpenAI and Anthropic models will be available in future updates
        preferred_models = [
            "llama-3.3-70b",  # Groq - best quality
            "mixtral-8x7b",   # Groq - fast
            "gemini-pro",     # Google AI
        ]
        
        # Try preferred models first, then fall back to any available model
        models_to_try = []
        for model_id in preferred_models:
            if model_id in available_model_ids:
                models_to_try.append(model_id)
        # Add any remaining available models
        for model_id in available_model_ids:
            if model_id not in models_to_try:
                models_to_try.append(model_id)
        
        print(f"🔄 Models to try (in order): {models_to_try}")
        
        if not models_to_try:
            error_msg = f"No suitable AI model available for documentation generation. Available models: {available_model_ids}"
            print(f"❌ {error_msg}")
            return jsonify({
                "error": "No suitable AI model available for documentation generation",
                "details": error_msg,
                "available_models": available_model_ids
            }), 503

        # Try each model until one works
        last_error = None
        for model_id in models_to_try:
            try:
                model_config = model_manager.get_model_config(model_id)
                if not model_config:
                    continue
                
                client = model_manager.get_client(model_id)
                if not client:
                    continue
                
                # Get the actual model name to use (for Groq, use groq_model_name; for Google, use google_model_name)
                if model_config["client"] == "groq" and "groq_model_name" in model_config:
                    actual_model_name = model_config["groq_model_name"]
                elif model_config["client"] == "google" and "google_model_name" in model_config:
                    actual_model_name = model_config["google_model_name"]
                else:
                    actual_model_name = model_id

                # Generate documentation
                if model_config["client"] == "openai":
                    response = client.chat.completions.create(
                        model=actual_model_name,
                        messages=[
                            {"role": "system", "content": "You are a technical documentation expert. Generate accurate, comprehensive documentation in JSON format."},
                            {"role": "user", "content": full_prompt}
                        ],
                        temperature=0.3,
                    )
                    documentation_text = response.choices[0].message.content
                elif model_config["client"] == "groq":
                    response = client.chat.completions.create(
                        model=actual_model_name,
                        messages=[
                            {"role": "system", "content": "You are a technical documentation expert. Generate accurate, comprehensive documentation in JSON format."},
                            {"role": "user", "content": full_prompt}
                        ],
                        temperature=0.3,
                    )
                    documentation_text = response.choices[0].message.content
                elif model_config["client"] == "anthropic":
                    response = client.messages.create(
                        model=actual_model_name,
                        max_tokens=4096,
                        system="You are a technical documentation expert. Generate accurate, comprehensive documentation in JSON format.",
                        messages=[{"role": "user", "content": full_prompt}],
                        temperature=0.3,
                    )
                    documentation_text = response.content[0].text
                elif model_config["client"] == "google":
                    model = client.GenerativeModel(actual_model_name)
                    full_prompt_with_system = f"You are a technical documentation expert. Generate accurate, comprehensive documentation in JSON format.\n\n{full_prompt}"
                    response = model.generate_content(
                        full_prompt_with_system,
                        generation_config={"temperature": 0.3}
                    )
                    documentation_text = response.text
                else:
                    continue  # Skip unsupported client types

                # Try to extract JSON from response (might be wrapped in markdown code blocks)
                documentation = None
                json_match = re.search(r'```(?:json)?\s*(\{.*\})\s*```', documentation_text, re.DOTALL)
                if json_match:
                    try:
                        documentation = json.loads(json_match.group(1))
                    except json.JSONDecodeError:
                        pass  # Try parsing entire response instead
                
                if not documentation:
                    # Try to find JSON object in the response
                    json_match = re.search(r'\{.*\}', documentation_text, re.DOTALL)
                    if json_match:
                        try:
                            documentation = json.loads(json_match.group(0))
                        except json.JSONDecodeError:
                            pass  # Try parsing entire response instead
                
                if not documentation:
                    # Try to parse the entire response as JSON
                    try:
                        documentation = json.loads(documentation_text)
                    except json.JSONDecodeError as json_err:
                        # If JSON parsing fails, try next model
                        last_error = f"JSON parsing failed for {model_id}: {str(json_err)}"
                        print(f"⚠️  {last_error}, trying next model...")
                        continue
                
                # Success! Return the documentation with model info
                if isinstance(documentation, dict):
                    documentation["_metadata"] = {
                        "generatedBy": model_id,
                        "modelName": model_config.get("name", model_id),
                        "provider": model_config.get("provider", "Unknown"),
                    }
                    print(f"✅ Documentation generated successfully using model: {model_config.get('name', model_id)} ({model_config.get('provider', 'Unknown')})")
                return jsonify(documentation)
                
            except Exception as e:
                last_error = f"Error with model {model_id}: {str(e)}"
                print(f"⚠️  {last_error}, trying next model...")
                import traceback
                traceback.print_exc()  # Print full traceback for debugging
                continue
        
        # All models failed
        error_msg = f"All available models failed. Last error: {last_error or 'Unknown error'}"
        print(f"❌ {error_msg}")
        return jsonify({
            "error": "Failed to generate documentation",
            "details": error_msg
        }), 503
    except Exception as e:
        print(f"Error in documentation generation: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/chat/documentation", methods=["POST"])
def documentation_chat():
    """Chat about documentation and codebase"""
    try:
        data = request.json
        message = data.get("message", "")
        repo_context = data.get("repoContext", "")
        user_plan = data.get("userPlan", "free")
        is_authenticated = data.get("isAuthenticated", True)
        
        if not message:
            return jsonify({"error": "Message is required"}), 400

        # Create chat prompt with repository context
        prompt = get_documentation_chat_prompt(repo_context)
        full_prompt = f"{prompt}\n\nUser Question: {message}"

        # Get available models for user's plan
        available_models = model_manager.get_available_models(user_plan, is_authenticated)
        available_model_ids = [m["id"] for m in available_models if m.get("available", False)]
        
        # Preferred models for documentation chat
        # Note: Only Groq and Google AI models are currently available
        # OpenAI and Anthropic models will be available in future updates
        preferred_models = [
            "llama-3.3-70b",  # Groq - best quality
            "mixtral-8x7b",   # Groq - fast
            "gemini-pro",     # Google AI
        ]
        
        # Try preferred models first, then fall back to any available model
        models_to_try = []
        for model_id in preferred_models:
            if model_id in available_model_ids:
                models_to_try.append(model_id)
        # Add any remaining available models
        for model_id in available_model_ids:
            if model_id not in models_to_try:
                models_to_try.append(model_id)
        
        if not models_to_try:
            def generate_error():
                yield f"data: {json.dumps({'error': 'No suitable AI model available'})}\n\n"
                yield "data: [DONE]\n\n"
            return Response(generate_error(), mimetype="text/event-stream")

        # Use streaming for chat
        def generate():
            last_error = None
            for model_id in models_to_try:
                try:
                    model_config = model_manager.get_model_config(model_id)
                    if not model_config:
                        continue
                    
                    client = model_manager.get_client(model_id)
                    if not client:
                        continue
                    
                    # Get the actual model name to use (for Groq, use groq_model_name)
                    if model_config["client"] == "groq" and "groq_model_name" in model_config:
                        actual_model_name = model_config["groq_model_name"]
                    elif model_config["client"] == "google" and "google_model_name" in model_config:
                        actual_model_name = model_config["google_model_name"]
                    else:
                        actual_model_name = model_id
                    
                    # Try streaming with this model
                    if model_config["client"] == "openai" or model_config["client"] == "groq":
                        stream = client.chat.completions.create(
                            model=actual_model_name,
                            messages=[
                                {"role": "system", "content": "You are a helpful code documentation assistant."},
                                {"role": "user", "content": full_prompt}
                            ],
                            stream=True,
                            temperature=0.7,
                        )

                        for chunk in stream:
                            if chunk.choices and len(chunk.choices) > 0:
                                if chunk.choices[0].delta and chunk.choices[0].delta.content:
                                    yield f"data: {json.dumps({'content': chunk.choices[0].delta.content})}\n\n"
                        
                        yield "data: [DONE]\n\n"
                        return  # Success, exit
                    elif model_config["client"] == "anthropic":
                        with client.messages.stream(
                            model=actual_model_name,
                            max_tokens=4096,
                            system="You are a helpful code documentation assistant.",
                            messages=[{"role": "user", "content": full_prompt}],
                        ) as stream:
                            for text in stream.text_stream:
                                yield f"data: {json.dumps({'content': text})}\n\n"
                        yield "data: [DONE]\n\n"
                        return  # Success, exit
                    elif model_config["client"] == "google":
                        model = client.GenerativeModel(actual_model_name)
                        full_prompt_with_system = f"You are a helpful code documentation assistant.\n\n{full_prompt}"
                        response = model.generate_content(
                            full_prompt_with_system, stream=True, generation_config={"temperature": 0.7}
                        )
                        for chunk in response:
                            if chunk.text:
                                yield f"data: {json.dumps({'content': chunk.text})}\n\n"
                        yield "data: [DONE]\n\n"
                        return  # Success, exit
                except Exception as e:
                    last_error = str(e)
                    print(f"⚠️  Error with model {model_id}: {last_error}, trying next model...")
                    continue
            
            # All models failed
            error_msg = f'All available models failed. Last error: {last_error or "Unknown error"}'
            yield f"data: {json.dumps({'error': error_msg})}\n\n"
            yield "data: [DONE]\n\n"

        return Response(generate(), mimetype="text/event-stream")
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_ENV") == "development"
    app.run(host="0.0.0.0", port=port, debug=debug)

