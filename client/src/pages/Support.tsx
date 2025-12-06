import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { SITE_CONFIG } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { 
  Mail, 
  MessageSquare, 
  HelpCircle, 
  Bug, 
  CreditCard, 
  Shield,
  Send,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const supportCategories = [
  {
    icon: HelpCircle,
    title: "General Questions",
    description: "Questions about features, usage, or getting started",
    color: "text-primary",
  },
  {
    icon: Bug,
    title: "Technical Support",
    description: "Report bugs, errors, or technical issues",
    color: "text-destructive",
  },
  {
    icon: CreditCard,
    title: "Billing & Plans",
    description: "Questions about pricing, payments, or subscriptions",
    color: "text-warning",
  },
  {
    icon: Shield,
    title: "Security & Privacy",
    description: "Security concerns or privacy-related inquiries",
    color: "text-success",
  },
];

const faqs = [
  {
    question: "How do I reset my password?",
    answer: "You can reset your password from the login page by clicking 'Forgot password?' or by going to your account settings.",
  },
  {
    question: "How long does a security scan take?",
    answer: "Scan duration depends on the size of your codebase or website. Typically, scans complete within 30 seconds to 5 minutes.",
  },
  {
    question: "Can I cancel my subscription anytime?",
    answer: "Yes, you can cancel your subscription at any time from your account settings. You'll continue to have access until the end of your billing period.",
  },
  {
    question: "Is my code stored securely?",
    answer: "Yes, all code and data are encrypted both in transit and at rest. We follow industry-standard security practices and never share your code with third parties.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards (Visa, MasterCard, Amex), PayPal, and for Enterprise customers, we support invoicing and bank transfers.",
  },
  {
    question: "How do I contact support?",
    answer: "You can reach us through this support page, email us at support@IntelliShieldX.com, or use the live chat feature if available.",
  },
];

const Support = () => {
  const { user, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    category: "general",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      toast.success("Support request submitted successfully!");
      setFormData({
        name: "",
        email: "",
        category: "general",
        subject: "",
        message: "",
      });
      
      // Reset submitted state after 5 seconds
      setTimeout(() => setIsSubmitted(false), 5000);
    }, 1500);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        {/* Hero */}
        <section className="container px-4 mb-12">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/30 mb-6">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">We're Here to Help</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Contact <span className="text-gradient">Support</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Have a question or need assistance? Our support team is ready to help you.
            </p>
          </div>
        </section>

        {/* Support Categories */}
        <section className="container px-4 mb-12">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {supportCategories.map((category, index) => {
                const Icon = category.icon;
                return (
                  <Card
                    key={index}
                    className="glass border-border/50 hover:border-primary/50 transition-all cursor-pointer animate-fade-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                    onClick={() => setFormData({ ...formData, category: category.title.toLowerCase().replace(/\s+/g, "-") })}
                  >
                    <CardContent className="p-6 text-center">
                      <div className={`inline-flex p-3 rounded-full bg-primary/10 border border-primary/30 mb-4 ${category.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="font-semibold mb-2">{category.title}</h3>
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Contact Form */}
        <section className="container px-4 mb-12">
          <div className="max-w-2xl mx-auto">
            <Card className="glass border-border/50">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">Send us a Message</CardTitle>
                <CardDescription>
                  Fill out the form below and we'll get back to you as soon as possible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isSubmitted ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-16 w-16 text-success mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">Message Sent!</h3>
                    <p className="text-muted-foreground">
                      We've received your message and will respond within 24 hours.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium">
                          Name *
                        </label>
                        <Input
                          id="name"
                          name="name"
                          type="text"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          disabled={isAuthenticated}
                          className="bg-background/50 border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium">
                          Email *
                        </label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          disabled={isAuthenticated}
                          className="bg-background/50 border-border"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="category" className="text-sm font-medium">
                        Category *
                      </label>
                      <select
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        required
                        className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="general">General Questions</option>
                        <option value="technical-support">Technical Support</option>
                        <option value="billing-plans">Billing & Plans</option>
                        <option value="security-privacy">Security & Privacy</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="subject" className="text-sm font-medium">
                        Subject *
                      </label>
                      <Input
                        id="subject"
                        name="subject"
                        type="text"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                        placeholder="Brief description of your issue"
                        className="bg-background/50 border-border"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="message" className="text-sm font-medium">
                        Message *
                      </label>
                      <Textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                        rows={6}
                        placeholder="Please provide as much detail as possible..."
                        className="bg-background/50 border-border resize-none"
                      />
                    </div>

                    <Button
                      type="submit"
                      variant="cyber"
                      size="lg"
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-5 w-5 mr-2" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* FAQs */}
        <section className="container px-4 mb-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
              <p className="text-muted-foreground">
                Quick answers to common questions
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {faqs.map((faq, index) => (
                <Card key={index} className="glass border-border/50 animate-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">{faq.question}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Additional Contact Methods */}
        <section className="container px-4">
          <div className="max-w-4xl mx-auto">
            <Card className="glass border-border/50">
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="inline-flex p-3 rounded-full bg-primary/10 border border-primary/30 mb-4">
                      <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">Email Us</h3>
                    <p className="text-muted-foreground mb-2">support@sentinelx.com</p>
                    <p className="text-sm text-muted-foreground">We typically respond within 24 hours</p>
                  </div>
                  <div className="text-center">
                    <div className="inline-flex p-3 rounded-full bg-primary/10 border border-primary/30 mb-4">
                      <MessageSquare className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">Response Time</h3>
                    <p className="text-muted-foreground mb-2">24-48 hours</p>
                    <p className="text-sm text-muted-foreground">For urgent issues, please mark your message as urgent</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-border mt-16">
        <div className="container px-4 text-center">
          <p className="text-muted-foreground">
            © {new Date().getFullYear()} {SITE_CONFIG.name}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Support;

