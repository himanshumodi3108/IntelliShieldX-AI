import { Navbar } from "@/components/layout/Navbar";
import { SITE_CONFIG, ABOUT_STORY, STATS } from "@/lib/constants";
import { Shield, Target, Eye, Heart, Users, Award, BookOpen, MessageSquare, FileCode, BarChart3, FileText, Bot } from "lucide-react";

const values = [
  {
    icon: Shield,
    title: "Security First",
    description: "Every decision we make prioritizes the security of our users and their applications.",
  },
  {
    icon: Target,
    title: "Developer-Centric",
    description: "We build tools that fit seamlessly into your existing workflow, not the other way around.",
  },
  {
    icon: Eye,
    title: "Transparency",
    description: "Clear explanations, honest pricing, and no hidden catches. Ever.",
  },
  {
    icon: Heart,
    title: "Accessibility",
    description: "World-class security shouldn't require a world-class budget or expertise.",
  },
];

const milestones = [
  { year: "2023", event: "Idea conceived after a critical security incident" },
  { year: "2024 Q1", event: "First prototype built, tested with 50 developers" },
  { year: "2024 Q2", event: "Public beta launch, 1,000+ users in first month" },
  { year: "2024 Q3", event: "AI remediation engine released" },
  { year: "2024 Q4", event: "AI Documentation & Code Q&A features launched" },
  { year: "2025 Q1", event: "Enterprise tier launched, SOC2 compliance achieved" },
];

const keyFeatures = [
  {
    icon: FileCode,
    title: "Security Scanning",
    description: "Comprehensive vulnerability detection across code, URLs, and repositories with AI-powered analysis.",
  },
  {
    icon: Shield,
    title: "Threat Intelligence",
    description: "Multi-source malware detection integrating VirusTotal, MalwareBazaar, URLhaus, Hybrid Analysis, AbuseIPDB, and ThreatFox for comprehensive threat assessment.",
  },
  {
    icon: Bot,
    title: "AI Remediation",
    description: "Automated code fixes and security recommendations powered by advanced AI models.",
  },
  {
    icon: BookOpen,
    title: "AI Documentation",
    description: "Auto-generate complete project documentation including API endpoints, schemas, project structure, and dependencies from your codebase.",
  },
  {
    icon: MessageSquare,
    title: "Code Q&A Assistant",
    description: "Interactive AI chat to understand your codebase, ask about functions, variables, API endpoints, and get instant explanations.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Track security metrics, vulnerability trends, and get actionable insights with visual analytics.",
  },
  {
    icon: FileText,
    title: "Professional Reports",
    description: "Generate downloadable PDF reports with detailed findings, threat intelligence results, remediation steps, and compliance information.",
  },
];

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        {/* Hero */}
        <section className="container px-4 mb-20">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/30 mb-6">
              <Heart className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Our Story</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              About <span className="text-gradient">{SITE_CONFIG.name}</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              {SITE_CONFIG.tagline}
            </p>
          </div>
        </section>

        {/* Founder Story */}
        <section className="container px-4 mb-20">
          <div className="max-w-3xl mx-auto">
            <div className="p-8 md:p-12 rounded-3xl glass">
              <h2 className="text-2xl md:text-3xl font-bold mb-6 text-gradient">
                {ABOUT_STORY.headline}
              </h2>
              <div className="prose prose-invert prose-lg max-w-none">
                {ABOUT_STORY.story.split('\n\n').map((paragraph, i) => (
                  <p key={i} className="text-muted-foreground mb-4 leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
              <div className="mt-8 pt-8 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  — <span className="text-foreground font-medium">{SITE_CONFIG.founder}</span>, 
                  Founder & CEO of {SITE_CONFIG.name}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="container px-4 mb-20">
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="p-8 rounded-2xl glass">
              <div className="p-3 rounded-xl bg-primary/20 w-fit mb-4">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Our Mission</h3>
              <p className="text-muted-foreground">{ABOUT_STORY.mission}</p>
            </div>
            <div className="p-8 rounded-2xl glass">
              <div className="p-3 rounded-xl bg-accent/20 w-fit mb-4">
                <Eye className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Our Vision</h3>
              <p className="text-muted-foreground">{ABOUT_STORY.vision}</p>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="container px-4 mb-20">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { value: STATS.scansCompleted, label: "Scans Completed" },
              { value: STATS.vulnerabilitiesFound, label: "Vulnerabilities Found" },
              { value: STATS.codeFixed, label: "Lines of Code Fixed" },
              { value: STATS.trustedDevelopers, label: "Developers Trust Us" },
              { value: STATS.detectionRate, label: "Detection Accuracy" },
              { value: STATS.avgScanTime, label: "Average Scan Time" },
            ].map((stat, i) => (
              <div key={i} className="p-6 rounded-2xl glass text-center">
                <div className="text-3xl md:text-4xl font-bold text-gradient mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Key Features */}
        <section className="container px-4 mb-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Key Features</h2>
              <p className="text-muted-foreground">
                Everything you need for comprehensive security and code understanding
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {keyFeatures.map((feature, i) => (
                <div
                  key={i}
                  className="p-6 rounded-2xl glass glass-hover animate-fade-in"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className="p-3 rounded-xl bg-secondary w-fit mb-4">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="container px-4 mb-20">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Our Values</h2>
              <p className="text-muted-foreground">
                The principles that guide everything we build
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {values.map((value, i) => (
                <div
                  key={i}
                  className="p-6 rounded-2xl glass glass-hover animate-fade-in"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className="p-3 rounded-xl bg-secondary w-fit mb-4">
                    <value.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{value.title}</h3>
                  <p className="text-muted-foreground">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="container px-4 mb-20">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Our Journey</h2>
              <p className="text-muted-foreground">
                From idea to platform protecting thousands of apps
              </p>
            </div>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
              {milestones.map((milestone, i) => (
                <div
                  key={i}
                  className="relative pl-12 pb-8 last:pb-0 animate-fade-in"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className="absolute left-2 w-5 h-5 rounded-full bg-primary border-4 border-background" />
                  <div className="text-sm font-medium text-primary mb-1">
                    {milestone.year}
                  </div>
                  <div className="text-foreground">{milestone.event}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="container px-4">
          <div className="max-w-3xl mx-auto text-center p-12 rounded-3xl glass border border-primary/30">
            <Users className="h-12 w-12 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">
              Join {STATS.trustedDevelopers} Developers
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Start securing your applications today with {SITE_CONFIG.name}'s 
              AI-powered vulnerability detection, auto-remediation, and intelligent documentation features.
            </p>
            <a
              href="/scan"
              className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold shadow-[0_0_20px_hsl(var(--primary)/0.3)] hover:opacity-90 transition-opacity"
            >
              Start Your Free Scan
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container px-4 text-center">
          <p className="text-muted-foreground">
            © {SITE_CONFIG.foundedYear} {SITE_CONFIG.name}. {SITE_CONFIG.tagline}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default About;
