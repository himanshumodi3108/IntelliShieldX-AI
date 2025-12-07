import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { SITE_CONFIG, PRICING_PLANS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Check, X, Zap, Shield, Building2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PaymentDialog } from "@/components/payments/PaymentDialog";
import { useAuth } from "@/contexts/AuthContext";
import { paymentApi } from "@/lib/api";

const planIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Free: Shield,
  Standard: Zap,
  Pro: Zap,
  Enterprise: Building2,
};

const faqs = [
  {
    question: "Can I upgrade my plan anytime?",
    answer: "Yes! You can upgrade instantly to a higher plan. However, downgrades are not available. Your data and scan history are always preserved.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards (Visa, MasterCard, Amex), PayPal, and for Enterprise customers, we also support invoicing and bank transfers.",
  },
  {
    question: "Is there a free trial for paid plans?",
    answer: "Yes! Pro plan comes with a 14-day free trial. No credit card required to start. Enterprise customers can request a custom pilot program.",
  },
  {
    question: "What happens if I exceed my scan limits on Free?",
    answer: "We'll notify you when you're approaching the limit. You can either wait for the next month or upgrade to Pro for unlimited scans.",
  },
  {
    question: "Do you offer discounts for startups or open source?",
    answer: "Absolutely! We offer 50% off Pro for verified startups (under $1M funding) and free Pro access for maintainers of popular open source projects.",
  },
];

// Plan hierarchy for comparison
const PLAN_HIERARCHY: Record<string, number> = {
  free: 0,
  standard: 1,
  pro: 2,
  enterprise: 3,
};

const Pricing = () => {
  const { isAuthenticated, user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"standard" | "pro" | "enterprise">("standard");
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadCurrentPlan();
    } else {
      setCurrentPlan("free");
    }
  }, [isAuthenticated, user?.plan]); // Reload when user plan changes

  // Refresh user data when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible" && isAuthenticated) {
        try {
          await refreshUser();
          loadCurrentPlan();
        } catch (error) {
          console.error("Failed to refresh user data:", error);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isAuthenticated]);


  const loadCurrentPlan = async () => {
    try {
      setIsLoadingPlan(true);
      const subscription = await paymentApi.getSubscription() as {
        plan: string;
        status: string;
        subscription: {
          plan: string;
          status: string;
        } | null;
      };
      
      // Get the actual plan - check subscription status first
      if (subscription.subscription && subscription.subscription.status === "active") {
        setCurrentPlan(subscription.subscription.plan);
      } else {
        setCurrentPlan(subscription.plan || "free");
      }
    } catch (error) {
      console.error("Failed to load current plan:", error);
      // Default to user's plan from auth context if available
      if (user?.plan) {
        setCurrentPlan(user.plan);
      }
    } finally {
      setIsLoadingPlan(false);
    }
  };

  const getPlanButtonText = (planName: string) => {
    const planKey = planName.toLowerCase();
    const currentPlanKey = currentPlan.toLowerCase();
    
    // For unauthenticated users
    if (!isAuthenticated) {
      if (planKey === "free") {
        return "Start Free Trial";
      }
      return `Start ${planName} Trial`;
    }
    
    // For authenticated users
    // Free plan - only show "Subscribed" if user has free plan (no active paid subscription)
    if (planKey === "free") {
      if (currentPlanKey === "free") {
        return "Subscribed";
      }
      // User has a paid plan, so Free should be disabled (can't downgrade)
      return "Current Plan";
    }
    
    // Same plan and active - show "Subscribed" or "Current Plan"
    if (planKey === currentPlanKey) {
      return "Subscribed";
    }
    
    // Higher plan - show "Upgrade to [Plan Name]"
    if (PLAN_HIERARCHY[planKey] > PLAN_HIERARCHY[currentPlanKey]) {
      return `Upgrade to ${planName}`;
    }
    
    // Lower plan - can't downgrade, show "Current Plan" (will be disabled)
    return "Current Plan";
  };

  const isPlanButtonDisabled = (planName: string) => {
    const planKey = planName.toLowerCase();
    const currentPlanKey = currentPlan.toLowerCase();
    
    // For unauthenticated users, no buttons are disabled (they can start any trial)
    if (!isAuthenticated) {
      return false;
    }
    
    // For authenticated users
    // Free plan is disabled if user has any paid plan (can't downgrade)
    if (planKey === "free") {
      return currentPlanKey !== "free";
    }
    
    // Same plan is disabled
    if (planKey === currentPlanKey) {
      return true;
    }
    
    // Lower plans are disabled (can't downgrade)
    if (PLAN_HIERARCHY[planKey] < PLAN_HIERARCHY[currentPlanKey]) {
      return true;
    }
    
    return false;
  };

  const handlePlanClick = (planName: string) => {
    if (planName.toLowerCase() === "free") {
      if (isAuthenticated) {
        navigate("/dashboard");
      } else {
        navigate("/register");
      }
      return;
    }

    if (planName.toLowerCase() === "enterprise") {
      // Contact sales
      window.location.href = `mailto:${SITE_CONFIG.email}?subject=Enterprise Plan Inquiry`;
      return;
    }

    if (!isAuthenticated) {
      navigate("/register");
      return;
    }

    setSelectedPlan(planName.toLowerCase() as "standard" | "pro" | "enterprise");
    setShowPaymentDialog(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        {/* Hero */}
        <section className="container px-4 mb-16">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/30 mb-6">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Simple, Transparent Pricing</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Choose the Best Plan{" "}
              <span className="text-gradient">for You</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Start free, upgrade when you need more. All plans include our core 
              AI-powered vulnerability detection.
            </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="container px-4 mb-20">
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {PRICING_PLANS.map((plan, i) => {
              const Icon = planIcons[plan.name] || Shield;
              return (
                <div
                  key={i}
                  className={cn(
                    "relative p-8 rounded-3xl animate-fade-in",
                    plan.popular
                      ? "glass border-2 border-primary shadow-[0_0_40px_hsl(var(--primary)/0.2)]"
                      : "glass"
                  )}
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm font-semibold">
                      Most Popular
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-6">
                    <div className={cn(
                      "p-3 rounded-xl",
                      plan.popular ? "bg-primary/20" : "bg-secondary"
                    )}>
                      <Icon className={cn(
                        "h-6 w-6",
                        plan.popular ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <h3 className="text-2xl font-bold">{plan.name}</h3>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      {plan.price !== "₹0" && (
                        <span className="text-xs text-muted-foreground align-sub">+ GST</span>
                      )}
                      <span className="text-muted-foreground">/{plan.period}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {plan.description}
                    </p>
                  </div>

                  <Button
                    variant={
                      isAuthenticated && plan.name.toLowerCase() === currentPlan.toLowerCase()
                        ? "default"
                        : plan.popular
                        ? "cyber"
                        : "outline"
                    }
                    className="w-full mb-8"
                    size="lg"
                    onClick={() => handlePlanClick(plan.name)}
                    disabled={isPlanButtonDisabled(plan.name) || isLoadingPlan}
                  >
                    {isLoadingPlan ? (
                      "Loading..."
                    ) : isAuthenticated && plan.name.toLowerCase() === currentPlan.toLowerCase() ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        {getPlanButtonText(plan.name)}
                      </>
                    ) : (
                      getPlanButtonText(plan.name)
                    )}
                  </Button>

                  <div className="space-y-3">
                    {plan.features.map((feature, j) => (
                      <div key={j} className="flex items-start gap-3">
                        <div className="p-0.5 rounded-full bg-success/20 mt-1">
                          <Check className="h-3 w-3 text-success" />
                        </div>
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                    {plan.limitations.map((limitation, j) => (
                      <div key={j} className="flex items-start gap-3 opacity-50">
                        <div className="p-0.5 rounded-full bg-muted mt-1">
                          <X className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <span className="text-sm line-through">{limitation}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Comparison Table */}
        <section className="container px-4 mb-20">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Compare Plans</h2>
              <p className="text-muted-foreground">
                See all features side by side
              </p>
            </div>

            <div className="rounded-2xl glass overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-4 font-medium">Feature</th>
                      <th className="text-center p-4 font-medium">Free</th>
                      <th className="text-center p-4 font-medium">Standard</th>
                      <th className="text-center p-4 font-medium text-primary">Pro</th>
                      <th className="text-center p-4 font-medium">Enterprise</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { feature: "Monthly Scans", free: "5", standard: "Unlimited", pro: "Unlimited", enterprise: "Unlimited" },
                      { feature: "Documentation Generations", free: "1", standard: "10", pro: "25", enterprise: "Unlimited" },
                      { feature: "Connected Repositories", free: "1", standard: "10", pro: "25", enterprise: "Unlimited" },
                      { feature: "Repository Deletions", free: "3", standard: "Unlimited", pro: "Unlimited", enterprise: "Unlimited" },
                      { feature: "AI Models", free: "Basic", standard: "Standard + Basic", pro: "Advanced + Standard + Basic", enterprise: "All Models" },
                      { feature: "AI Remediation", free: false, standard: true, pro: true, enterprise: true },
                      { feature: "PDF Reports", free: "Basic", standard: "Full", pro: "Full + Signatures", enterprise: "Custom" },
                      { feature: "API Access", free: false, standard: false, pro: true, enterprise: true },
                      { feature: "Team Members", free: "1", standard: "1", pro: "5", enterprise: "Unlimited" },
                      { feature: "Scan History", free: "7 days", standard: "30 days", pro: "90 days", enterprise: "Unlimited" },
                      { feature: "Support", free: "Community", standard: "Email", pro: "Priority Email", enterprise: "24/7 Phone & Chat" },
                      { feature: "Private Projects", free: false, standard: true, pro: true, enterprise: true },
                      { feature: "SSO/SAML", free: false, standard: false, pro: false, enterprise: true },
                      { feature: "Compliance Reports", free: false, standard: false, pro: false, enterprise: true },
                      { feature: "On-Premise Option", free: false, standard: false, pro: false, enterprise: true },
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="p-4 text-sm">{row.feature}</td>
                        <td className="p-4 text-center">
                          {typeof row.free === "boolean" ? (
                            row.free ? (
                              <Check className="h-5 w-5 text-success mx-auto" />
                            ) : (
                              <X className="h-5 w-5 text-muted-foreground mx-auto" />
                            )
                          ) : (
                            <span className="text-sm text-muted-foreground">{row.free}</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {typeof row.standard === "boolean" ? (
                            row.standard ? (
                              <Check className="h-5 w-5 text-success mx-auto" />
                            ) : (
                              <X className="h-5 w-5 text-muted-foreground mx-auto" />
                            )
                          ) : (
                            <span className="text-sm text-muted-foreground">{row.standard}</span>
                          )}
                        </td>
                        <td className="p-4 text-center bg-primary/5">
                          {typeof row.pro === "boolean" ? (
                            row.pro ? (
                              <Check className="h-5 w-5 text-success mx-auto" />
                            ) : (
                              <X className="h-5 w-5 text-muted-foreground mx-auto" />
                            )
                          ) : (
                            <span className="text-sm font-medium">{row.pro}</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {typeof row.enterprise === "boolean" ? (
                            row.enterprise ? (
                              <Check className="h-5 w-5 text-success mx-auto" />
                            ) : (
                              <X className="h-5 w-5 text-muted-foreground mx-auto" />
                            )
                          ) : (
                            <span className="text-sm text-muted-foreground">{row.enterprise}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="container px-4 mb-20">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
              <p className="text-muted-foreground">
                Everything you need to know about our pricing
              </p>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  className="p-6 rounded-2xl glass animate-fade-in"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <h3 className="font-semibold mb-2">{faq.question}</h3>
                  <p className="text-muted-foreground text-sm">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="container px-4">
          <div className="max-w-3xl mx-auto text-center p-12 rounded-3xl glass border border-primary/30">
            <h2 className="text-3xl font-bold mb-4">
              Still Have Questions?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Our team is here to help you find the perfect plan for your needs. 
              Reach out and we'll get back to you within 24 hours.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button variant="cyber" size="lg">
                Contact Sales
              </Button>
              <Button variant="glass" size="lg">
                Schedule a Demo
              </Button>
            </div>
          </div>
        </section>
      </main>

      <PaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        plan={selectedPlan}
        onSuccess={() => {
          setShowPaymentDialog(false);
          loadCurrentPlan(); // Reload current plan after successful payment
          navigate("/profile?tab=subscription");
        }}
      />

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

export default Pricing;
