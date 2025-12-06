// Site Configuration - Modify these values to customize your platform
export const SITE_CONFIG = {
    name: "IntelliShieldX",
    tagline: "AI Security Analysis & Auto-Remediation Platform",
    description: "Detect vulnerabilities, auto-remediate with AI, and generate professional security reports.",
    founder: "Himanshu Kumar Modi",
    foundedYear: 2025,
    email: "contact@intellishieldx.io",
    social: {
      twitter: "@IntelliShieldX",
      github: "https://github.com/intellishieldx",
      linkedin: "https://linkedin.com/company/intellishieldx",
    },
  };
  
  export const STATS = {
    scansCompleted: "50K+",
    detectionRate: "99.9%",
    avgScanTime: "< 30s",
    trustedDevelopers: "10,000+",
    vulnerabilitiesFound: "2M+",
    codeFixed: "500K+",
  };
  
  export const PRICING_PLANS = [
    {
      name: "Free",
      price: "₹0",
      period: "forever",
      description: "Perfect for individual developers exploring security",
      features: [
        "5 scans per month",
        "1 documentation generation",
        "Basic vulnerability detection",
        "Basic AI models (GPT-3.5, Claude Haiku)",
        "Community support",
        "Public project scans",
        "Standard reports",
      ],
      limitations: [
        "No AI remediation",
        "No priority support",
      ],
      cta: "Get Started Free",
      popular: false,
    },
    {
      name: "Standard",
      price: "₹499",
      period: "per year",
      description: "For developers who need more power",
      features: [
        "Unlimited scans",
        "10 documentation generations",
        "Standard + Basic AI models (GPT-4 Turbo, Mixtral)",
        "AI-powered remediation",
        "Email support",
        "Private project scans",
        "PDF reports",
        "Scan history (30 days)",
        "14-day cancellation period",
      ],
      limitations: [],
      cta: "Start Standard Trial",
      popular: false,
    },
    {
      name: "Pro",
      price: "₹999",
      period: "per year",
      description: "For professional developers and small teams",
      features: [
        "Everything in Standard",
        "25 documentation generations",
        "Advanced AI models (GPT-4o, Claude Opus)",
        "Priority email support",
        "PDF reports with signatures",
        "API access",
        "Scan history (90 days)",
        "Team collaboration (up to 5)",
        "14-day cancellation period",
      ],
      limitations: [],
      cta: "Start Pro Trial",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "₹4,999",
      period: "per year",
      description: "For organizations with advanced security needs",
      features: [
        "Everything in Pro",
        "Unlimited documentation generations",
        "All AI models including security-specialized",
        "Unlimited team members",
        "Custom integrations",
        "Dedicated account manager",
        "SSO & SAML authentication",
        "Compliance reports (SOC2, HIPAA)",
        "On-premise deployment option",
        "24/7 phone & chat support",
        "Custom SLA",
        "Audit logs",
      ],
      limitations: [],
      cta: "Contact Sales",
      popular: false,
    },
  ];
  
  export const ABOUT_STORY = {
    headline: "Born from a Developer's Frustration",
    story: `In 2023, I was leading a security audit for a fintech startup when disaster struck. 
    A single SQL injection vulnerability—one that could have been caught in minutes—went undetected 
    for months. The breach cost the company millions and eroded customer trust overnight.
  
    That night, I couldn't sleep. I kept asking myself: "Why is finding vulnerabilities still so hard? 
    Why do developers have to choose between shipping fast and shipping secure?"
  
    The existing tools were either too complex for everyday developers, too slow to integrate into 
    modern CI/CD pipelines, or too expensive for startups. There had to be a better way.
  
    So I built IntelliShieldX—a platform that thinks like a security expert but works at the speed 
    developers need. Using advanced AI, IntelliShieldX doesn't just find vulnerabilities; it explains 
    them in plain English and writes the secure code for you.
  
    Today, IntelliShieldX protects thousands of applications, from weekend side projects to 
    enterprise-grade systems. Our mission remains simple: make world-class security accessible 
    to every developer, regardless of their security expertise.`,
    mission: "To democratize application security by making vulnerability detection and remediation instant, intelligent, and accessible to every developer.",
    vision: "A world where every line of code is secure by default.",
  };
  