import { Navbar } from "@/components/layout/Navbar";
import { SITE_CONFIG } from "@/lib/constants";
import { Shield, Lock, Eye, Database, UserCheck, FileText, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { openCookieSettings } from "@/components/CookieConsent";

const sections = [
  {
    icon: Shield,
    title: "1. Information We Collect",
    content: `We collect information that you provide directly to us, including:
- Account information (name, email address, password)
- Payment information (processed securely through third-party payment processors)
- Content you upload (code files, URLs for scanning)
- Usage data (scan history, chat conversations, feature usage)
- Device and log information (IP address, browser type, access times)`,
  },
  {
    icon: Lock,
    title: "2. How We Use Your Information",
    content: `We use the information we collect to:
- Provide, maintain, and improve our Service
- Process transactions and send related information
- Send technical notices, updates, and support messages
- Respond to your comments, questions, and requests
- Monitor and analyze trends, usage, and activities
- Detect, prevent, and address technical issues and security threats`,
  },
  {
    icon: Database,
    title: "3. Data Storage and Security",
    content: `We implement appropriate technical and organizational measures to protect your personal information:
- All data is encrypted in transit using TLS/SSL
- Sensitive data is encrypted at rest
- Access to personal information is restricted to authorized personnel
- Regular security audits and vulnerability assessments
- Compliance with industry-standard security practices`,
  },
  {
    icon: Eye,
    title: "4. Information Sharing and Disclosure",
    content: `We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
- With your explicit consent
- To comply with legal obligations or respond to lawful requests
- To protect our rights, privacy, safety, or property
- In connection with a business transfer (merger, acquisition, etc.)
- With service providers who assist us in operating our Service (under strict confidentiality agreements)`,
  },
  {
    icon: UserCheck,
    title: "5. Your Rights and Choices",
    content: `You have the right to:
- Access and receive a copy of your personal data
- Rectify inaccurate or incomplete data
- Request deletion of your personal data
- Object to or restrict processing of your data
- Data portability (receive your data in a structured format)
- Withdraw consent at any time (where processing is based on consent)
- Opt-out of marketing communications`,
  },
  {
    icon: FileText,
    title: "6. Cookies and Tracking Technologies",
    content: `We use cookies and similar tracking technologies to:
- Remember your preferences and settings
- Analyze how you use our Service
- Provide personalized content and features
- Improve security and prevent fraud

You can control cookies through your browser settings, but this may affect Service functionality.`,
  },
  {
    icon: Shield,
    title: "7. Third-Party Services",
    content: `Our Service may contain links to third-party websites or integrate with third-party services. We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies before providing any information.`,
  },
  {
    icon: Lock,
    title: "8. Data Retention",
    content: `We retain your personal information for as long as necessary to:
- Provide you with the Service
- Comply with legal obligations
- Resolve disputes and enforce our agreements
- Maintain security and prevent fraud

When you delete your account, we will delete or anonymize your personal information, except where we are required to retain it for legal purposes.`,
  },
  {
    icon: Database,
    title: "9. International Data Transfers",
    content: `Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that differ from those in your country. We ensure appropriate safeguards are in place to protect your information in accordance with this Privacy Policy.`,
  },
  {
    icon: Eye,
    title: "10. Children's Privacy",
    content: `Our Service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected information from a child, we will take steps to delete such information promptly.`,
  },
  {
    icon: UserCheck,
    title: "11. Changes to This Privacy Policy",
    content: `We may update this Privacy Policy from time to time. We will notify you of any material changes by:
- Posting the new Privacy Policy on this page
- Sending you an email notification
- Updating the "Last updated" date

Your continued use of the Service after such changes constitutes acceptance of the updated Privacy Policy.`,
  },
  {
    icon: Shield,
    title: "12. Contact Us",
    content: `If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us through our support page or at privacy@${SITE_CONFIG.name.toLowerCase()}.com`,
  },
];

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        {/* Hero */}
        <section className="container px-4 mb-12">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/30 mb-6">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Your Privacy Matters</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Privacy <span className="text-gradient">Policy</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-4">
              Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              At {SITE_CONFIG.name}, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, and safeguard your data.
            </p>
          </div>
        </section>

        {/* Privacy Sections */}
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
                    {section.title === "6. Cookies and Tracking Technologies" && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <Button
                          variant="outline"
                          onClick={openCookieSettings}
                          className="flex items-center gap-2"
                        >
                          <Settings className="h-4 w-4" />
                          Manage Cookie Preferences
                        </Button>
                      </div>
                    )}
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
                <h2 className="text-2xl font-bold mb-4">Have Privacy Concerns?</h2>
                <p className="text-muted-foreground mb-6">
                  We're here to help. Contact us if you have any questions about your privacy or data.
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

export default Privacy;

