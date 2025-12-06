import { 
    FileCode, 
    Globe, 
    Bot, 
    BarChart3, 
    FileText, 
    Code2,
    ShieldCheck,
    Zap,
    BookOpen,
    MessageSquare
  } from "lucide-react";
  
  const features = [
    {
      icon: FileCode,
      title: "Code Analysis",
      description: "Upload source files, ZIP projects, or connect Git repos. Detect vulnerabilities across 15+ languages.",
      color: "text-primary",
    },
    {
      icon: Globe,
      title: "URL Scanner",
      description: "Test websites for SQL injection, XSS, CSRF, SSL issues, and misconfigurations in seconds.",
      color: "text-accent",
    },
    {
      icon: Bot,
      title: "AI Remediation",
      description: "Get AI-generated secure code replacements and best-practice recommendations instantly.",
      color: "text-success",
    },
    {
      icon: BarChart3,
      title: "Visual Dashboard",
      description: "Track vulnerabilities with severity charts, trends, and actionable insights at a glance.",
      color: "text-warning",
    },
    {
      icon: FileText,
      title: "PDF Reports",
      description: "Download professional reports with charts, remediation steps, signatures, and QR codes.",
      color: "text-destructive",
    },
    {
      icon: Code2,
      title: "JSON API",
      description: "Integrate with CI/CD pipelines using our RESTful API for automated security workflows.",
      color: "text-primary",
    },
    {
      icon: BookOpen,
      title: "AI Documentation",
      description: "Auto-generate comprehensive documentation including API endpoints, schemas, project structure, and dependencies from your codebase.",
      color: "text-accent",
    },
    {
      icon: MessageSquare,
      title: "Code Q&A Chat",
      description: "Ask questions about your codebase, understand functions, variables, API endpoints, and get instant AI-powered explanations.",
      color: "text-success",
    },
  ];
  
  export function FeaturesSection() {
    return (
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/20 to-background" />
        
        <div className="container relative z-10 px-4">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-border mb-6">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Powerful Features</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Everything You Need for{" "}
              <span className="text-gradient">Complete Security</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              From code scanning to AI-powered fixes — IntelliShieldX covers your entire security workflow.
            </p>
          </div>
  
          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="group p-6 rounded-2xl glass glass-hover animate-fade-in"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className={`inline-flex p-3 rounded-xl bg-secondary/50 ${feature.color} mb-4 transition-transform group-hover:scale-110`}>
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
  
          {/* Bottom CTA */}
          <div className="mt-16 text-center">
            <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl glass border border-primary/30">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <span className="text-lg font-medium">
                Trusted by <span className="text-primary">10,000+</span> developers worldwide
              </span>
            </div>
          </div>
        </div>
      </section>
    );
  }
  