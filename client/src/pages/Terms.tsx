import { Navbar } from "@/components/layout/Navbar";
import { SITE_CONFIG } from "@/lib/constants";
import { FileText, Shield, AlertTriangle, Scale } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";

const sections = [
  {
    icon: Shield,
    title: "1. Acceptance of Terms",
    content: `By accessing and using ${SITE_CONFIG.name} ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.`,
  },
  {
    icon: FileText,
    title: "2. Description of Service",
    content: `${SITE_CONFIG.name} provides AI-powered security analysis and developer assistance tools, including but not limited to code vulnerability scanning, URL security testing, AI chat assistance, and automated remediation suggestions.`,
  },
  {
    icon: AlertTriangle,
    title: "3. User Accounts and Responsibilities",
    content: `You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account. You are responsible for all activities that occur under your account.`,
  },
  {
    icon: Scale,
    title: "4. Acceptable Use",
    content: `You agree not to use the Service to:
- Violate any applicable laws or regulations
- Infringe upon the rights of others
- Transmit any malicious code, viruses, or harmful data
- Attempt to gain unauthorized access to any part of the Service
- Use the Service for any illegal or unauthorized purpose
- Interfere with or disrupt the Service or servers connected to the Service`,
  },
  {
    icon: Shield,
    title: "5. Intellectual Property",
    content: `All content, features, and functionality of the Service, including but not limited to text, graphics, logos, icons, images, and software, are the exclusive property of ${SITE_CONFIG.name} and are protected by international copyright, trademark, and other intellectual property laws.`,
  },
  {
    icon: FileText,
    title: "6. User Content",
    content: `You retain ownership of any code, files, or content you upload to the Service. By uploading content, you grant ${SITE_CONFIG.name} a non-exclusive, worldwide, royalty-free license to use, process, and analyze your content solely for the purpose of providing the Service.`,
  },
  {
    icon: AlertTriangle,
    title: "7. Service Availability",
    content: `We strive to maintain high availability of the Service but do not guarantee uninterrupted access. The Service may be temporarily unavailable due to maintenance, updates, or circumstances beyond our control.`,
  },
  {
    icon: Scale,
    title: "8. Limitation of Liability",
    content: `To the maximum extent permitted by law, ${SITE_CONFIG.name} shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses.`,
  },
  {
    icon: Shield,
    title: "9. Indemnification",
    content: `You agree to indemnify and hold harmless ${SITE_CONFIG.name}, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising out of your use of the Service or violation of these Terms.`,
  },
  {
    icon: FileText,
    title: "10. Termination",
    content: `We reserve the right to terminate or suspend your account and access to the Service immediately, without prior notice, for any breach of these Terms or for any other reason we deem necessary.`,
  },
  {
    icon: Scale,
    title: "11. Changes to Terms",
    content: `We reserve the right to modify these Terms at any time. We will notify users of any material changes via email or through the Service. Your continued use of the Service after such modifications constitutes acceptance of the updated Terms.`,
  },
  {
    icon: Shield,
    title: "12. Governing Law",
    content: `These Terms shall be governed by and construed in accordance with applicable laws, without regard to its conflict of law provisions. Any disputes arising from these Terms shall be resolved through binding arbitration.`,
  },
];

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        {/* Hero */}
        <section className="container px-4 mb-12">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/30 mb-6">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Legal Information</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Terms of <span className="text-gradient">Service</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-4">
              Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Please read these terms carefully before using our Service. By using {SITE_CONFIG.name}, you agree to be bound by these Terms of Service.
            </p>
          </div>
        </section>

        {/* Terms Sections */}
        <section className="container px-4">
          <div className="max-w-4xl mx-auto space-y-6">
            {sections.map((section, index) => {
              const Icon = section.icon;
              return (
                <Card key={index} className="glass border-border/50 animate-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-primary/10 border border-primary/30 flex-shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-xl font-bold">{section.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                      {section.content}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Contact Section */}
        <section className="container px-4 mt-16">
          <div className="max-w-4xl mx-auto">
            <Card className="glass border-border/50">
              <CardContent className="p-8 text-center">
                <h2 className="text-2xl font-bold mb-4">Questions About These Terms?</h2>
                <p className="text-muted-foreground mb-6">
                  If you have any questions about these Terms of Service, please contact us.
                </p>
                <Link
                  to="/support"
                  className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
                >
                  Contact Support
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container px-4 text-center">
          <p className="text-muted-foreground">
            © {new Date().getFullYear()} {SITE_CONFIG.name}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Terms;

