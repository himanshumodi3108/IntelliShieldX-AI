import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { paymentApi } from "@/lib/api";
import { toast } from "sonner";
import {
  CreditCard,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { PaymentDialog } from "./PaymentDialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface Subscription {
  plan: string;
  status: string;
  subscription: {
    id: string;
    plan: string;
    status: string;
    startDate: string;
    endDate: string;
    amount: number;
    cancelledAt?: string;
    refundRequested?: boolean;
    refundedAt?: string | null;
    refundAmount?: number | null;
    refundId?: string | null;
    bankReferenceNumber?: string | null;
    refundError?: string | null;
    cancellationReason?: string;
  } | null;
  usage: {
    documentation: number;
    scans: number;
    chatMessages: number;
    repositories?: number; // Current active repositories
    maxRepositories?: number; // Maximum repositories ever connected (for limit checking)
    threatIntelligence?: {
      virusTotal?: number;
      hybridAnalysis?: number;
      abuseIPDB?: number;
    };
  };
  limits: {
    documentation: number;
    scans: number;
    chatMessages: number;
    repositories?: number;
    threatIntelligence?: {
      virusTotal?: number;
      hybridAnalysis?: number;
      abuseIPDB?: number;
      malwareBazaar?: boolean;
      urlhaus?: boolean;
      threatFox?: boolean;
    };
  };
}

export function SubscriptionManagement() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"standard" | "pro" | "enterprise">("standard");
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const { user } = useAuth();

  useEffect(() => {
    loadSubscription();
  }, []);

  // Reload subscription when user plan changes (e.g., after admin modifies it)
  useEffect(() => {
    if (user?.plan) {
      loadSubscription();
    }
  }, [user?.plan]);

  const loadSubscription = async () => {
    try {
      setIsLoading(true);
      const data = await paymentApi.getSubscription() as Subscription;
      setSubscription(data);
    } catch (error: any) {
      console.error("Failed to load subscription:", error);
      toast.error("Failed to load subscription details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = (plan: "standard" | "pro" | "enterprise") => {
    setSelectedPlan(plan);
    setShowPaymentDialog(true);
  };

  const handleCancelSubscription = async () => {
    if (!subscription?.subscription) return;

    try {
      setIsCancelling(true);
      const response = await paymentApi.cancelSubscription(cancellationReason) as {
        message: string;
        subscription: {
          refunded: boolean;
          refundError?: string;
        };
      };
      
      if (response.subscription?.refunded) {
        toast.success("Subscription cancelled and refund processed successfully!");
      } else if (response.subscription?.refundError) {
        toast.warning("Subscription cancelled. Refund processing failed and will be handled manually within 5-7 business days.", {
          duration: 8000,
        });
      } else {
        toast.success("Subscription cancelled successfully. Refund will be processed within 5-7 business days.");
      }
      
      setShowCancelDialog(false);
      setCancellationReason("");
      loadSubscription();
    } catch (error: any) {
      console.error("Cancellation error:", error);
      toast.error(error.message || "Failed to cancel subscription");
    } finally {
      setIsCancelling(false);
    }
  };

  const canCancel = () => {
    if (!subscription?.subscription) return false;
    if (subscription.subscription.status !== "active") return false;
    if (!["standard", "pro"].includes(subscription.subscription.plan)) return false;

    // Check if within 14 days
    const startDate = new Date(subscription.subscription.startDate);
    const daysSinceStart = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceStart > 14) return false;

    // Check usage < 15%
    const usagePercentage = {
      documentation: (subscription.usage.documentation / subscription.limits.documentation) * 100,
      scans: (subscription.usage.scans / subscription.limits.scans) * 100,
      chatMessages: (subscription.usage.chatMessages / subscription.limits.chatMessages) * 100,
    };

    return (
      usagePercentage.documentation < 15 &&
      usagePercentage.scans < 15 &&
      usagePercentage.chatMessages < 15
    );
  };

  if (isLoading) {
    return (
      <Card className="glass border-border">
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return null;
  }

  const isActive = subscription.status === "active";
  const isExpired = subscription.status === "expired";
  const isCancelled = subscription.subscription?.status === "cancelled" || subscription.subscription?.status === "refunded";

  return (
    <>
      <Card className="glass border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Subscription & Billing</CardTitle>
              <CardDescription>Manage your subscription and payment details</CardDescription>
            </div>
            <Badge
              variant={
                isActive
                  ? "default"
                  : isExpired
                  ? "destructive"
                  : "secondary"
              }
            >
              {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Plan Info */}
          {subscription.subscription && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-border bg-secondary/30">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Status</p>
                    <div className="flex items-center gap-2">
                      {isActive ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="font-medium capitalize">{subscription.status}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Valid Until</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {subscription.subscription.endDate
                          ? new Date(subscription.subscription.endDate).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Amount Paid</p>
                    <span className="font-medium">₹{subscription.subscription.amount.toLocaleString()}</span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Purchase Date</p>
                    <span className="font-medium">
                      {new Date(subscription.subscription.startDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {subscription.subscription.refundRequested && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-2">Refund Status</p>
                    {subscription.subscription.refundId ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="font-medium text-green-500">
                            Refunded - ₹{subscription.subscription.refundAmount ? subscription.subscription.refundAmount.toLocaleString() : subscription.subscription.amount.toLocaleString()}
                          </span>
                          {subscription.subscription.refundedAt && (
                            <span className="text-xs text-muted-foreground">
                              ({new Date(subscription.subscription.refundedAt).toLocaleDateString()})
                            </span>
                          )}
                        </div>
                        {subscription.subscription.bankReferenceNumber && (
                          <div className="mt-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                            <div className="flex items-start gap-2">
                              <div className="mt-0.5">
                                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">
                                  Bank Reference Number
                                </p>
                                <p className="text-lg font-bold text-green-700 dark:text-green-300 font-mono">
                                  {subscription.subscription.bankReferenceNumber}
                                </p>
                                <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                                  Please save this reference number for your records. Refund will be credited within 5-7 business days.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : subscription.subscription.refundError ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          <span className="font-medium text-yellow-500">
                            Refund Pending
                          </span>
                        </div>
                        <Alert variant="destructive" className="mt-2">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription className="text-sm">
                            <p className="font-medium mb-1">Automatic refund failed</p>
                            <p className="text-xs mb-2">{subscription.subscription.refundError}</p>
                            <p className="text-xs">
                              Your refund will be processed manually within 5-7 business days. 
                              If you have any questions, please contact support.
                            </p>
                          </AlertDescription>
                        </Alert>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        <span className="font-medium text-blue-500">
                          Refund Processing...
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {subscription.subscription.cancelledAt && !subscription.subscription.refundRequested && (
                <Alert className="border-yellow-500/50 bg-yellow-500/10">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <AlertDescription>
                    Subscription cancelled on {new Date(subscription.subscription.cancelledAt).toLocaleDateString()}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Usage Stats */}
          <div>
            <h3 className="font-semibold mb-4">Usage Statistics</h3>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Documentation</span>
                  <span className="text-sm font-medium">
                    {subscription.usage.documentation} / {subscription.limits.documentation === Infinity ? "∞" : subscription.limits.documentation}
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all",
                      subscription.usage.documentation / subscription.limits.documentation > 0.8
                        ? "bg-red-500"
                        : subscription.usage.documentation / subscription.limits.documentation > 0.5
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    )}
                    style={{
                      width: `${Math.min((subscription.usage.documentation / subscription.limits.documentation) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Scans</span>
                  <span className="text-sm font-medium">
                    {subscription.usage.scans} / {subscription.limits.scans === Infinity ? "∞" : subscription.limits.scans}
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all",
                      subscription.usage.scans / subscription.limits.scans > 0.8
                        ? "bg-red-500"
                        : subscription.usage.scans / subscription.limits.scans > 0.5
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    )}
                    style={{
                      width: `${Math.min((subscription.usage.scans / subscription.limits.scans) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Chat Messages</span>
                  <span className="text-sm font-medium">
                    {subscription.usage.chatMessages} / {subscription.limits.chatMessages === Infinity ? "∞" : subscription.limits.chatMessages}
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all",
                      subscription.usage.chatMessages / subscription.limits.chatMessages > 0.8
                        ? "bg-red-500"
                        : subscription.usage.chatMessages / subscription.limits.chatMessages > 0.5
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    )}
                    style={{
                      width: `${Math.min((subscription.usage.chatMessages / subscription.limits.chatMessages) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
              {subscription.limits.repositories !== undefined && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-muted-foreground">Connected Repositories</span>
                    <span className="text-sm font-medium">
                      {subscription.usage.repositories || 0} / {subscription.limits.repositories === Infinity ? "∞" : subscription.limits.repositories}
                    </span>
                  </div>
                  {subscription.usage.maxRepositories !== undefined && subscription.usage.maxRepositories > (subscription.usage.repositories || 0) && (
                    <p className="text-xs text-muted-foreground mb-1">
                      Max ever connected: {subscription.usage.maxRepositories} (limit based on max)
                    </p>
                  )}
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all",
                        calculateUsagePercentage(
                          subscription.usage.maxRepositories !== undefined ? subscription.usage.maxRepositories : (subscription.usage.repositories || 0),
                          subscription.limits.repositories as number
                        ) > 80
                          ? "bg-red-500"
                          : calculateUsagePercentage(
                              subscription.usage.maxRepositories !== undefined ? subscription.usage.maxRepositories : (subscription.usage.repositories || 0),
                              subscription.limits.repositories as number
                            ) > 50
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      )}
                      style={{
                        width: `${Math.min(
                          calculateUsagePercentage(
                            subscription.usage.maxRepositories !== undefined ? subscription.usage.maxRepositories : (subscription.usage.repositories || 0),
                            subscription.limits.repositories as number
                          ),
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Threat Intelligence Usage */}
              {subscription.limits.threatIntelligence && (
                <>
                  <div className="pt-2 mt-2 border-t border-border">
                    <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Threat Intelligence</h4>
                  </div>
                  
                  {subscription.limits.threatIntelligence.virusTotal !== undefined && subscription.limits.threatIntelligence.virusTotal > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-muted-foreground">VirusTotal Scans (Daily)</span>
                        <span className="text-sm font-medium">
                          {subscription.usage.threatIntelligence?.virusTotal || 0} / {subscription.limits.threatIntelligence.virusTotal === -1 ? "∞" : subscription.limits.threatIntelligence.virusTotal}
                        </span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all",
                            subscription.limits.threatIntelligence.virusTotal === -1 ? "bg-green-500" :
                            ((subscription.usage.threatIntelligence?.virusTotal || 0) / subscription.limits.threatIntelligence.virusTotal) > 0.8
                              ? "bg-red-500"
                              : ((subscription.usage.threatIntelligence?.virusTotal || 0) / subscription.limits.threatIntelligence.virusTotal) > 0.5
                              ? "bg-yellow-500"
                              : "bg-green-500"
                          )}
                          style={{
                            width: subscription.limits.threatIntelligence.virusTotal === -1 ? "100%" : `${Math.min(((subscription.usage.threatIntelligence?.virusTotal || 0) / subscription.limits.threatIntelligence.virusTotal) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {subscription.limits.threatIntelligence.hybridAnalysis !== undefined && subscription.limits.threatIntelligence.hybridAnalysis > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-muted-foreground">Hybrid Analysis (Daily)</span>
                        <span className="text-sm font-medium">
                          {subscription.usage.threatIntelligence?.hybridAnalysis || 0} / {subscription.limits.threatIntelligence.hybridAnalysis === -1 ? "∞" : subscription.limits.threatIntelligence.hybridAnalysis}
                        </span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all",
                            subscription.limits.threatIntelligence.hybridAnalysis === -1 ? "bg-green-500" :
                            ((subscription.usage.threatIntelligence?.hybridAnalysis || 0) / subscription.limits.threatIntelligence.hybridAnalysis) > 0.8
                              ? "bg-red-500"
                              : ((subscription.usage.threatIntelligence?.hybridAnalysis || 0) / subscription.limits.threatIntelligence.hybridAnalysis) > 0.5
                              ? "bg-yellow-500"
                              : "bg-green-500"
                          )}
                          style={{
                            width: subscription.limits.threatIntelligence.hybridAnalysis === -1 ? "100%" : `${Math.min(((subscription.usage.threatIntelligence?.hybridAnalysis || 0) / subscription.limits.threatIntelligence.hybridAnalysis) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {subscription.limits.threatIntelligence.abuseIPDB !== undefined && subscription.limits.threatIntelligence.abuseIPDB > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-muted-foreground">AbuseIPDB Queries (Daily)</span>
                        <span className="text-sm font-medium">
                          {subscription.usage.threatIntelligence?.abuseIPDB || 0} / {subscription.limits.threatIntelligence.abuseIPDB === -1 ? "∞" : subscription.limits.threatIntelligence.abuseIPDB}
                        </span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all",
                            subscription.limits.threatIntelligence.abuseIPDB === -1 ? "bg-green-500" :
                            ((subscription.usage.threatIntelligence?.abuseIPDB || 0) / subscription.limits.threatIntelligence.abuseIPDB) > 0.8
                              ? "bg-red-500"
                              : ((subscription.usage.threatIntelligence?.abuseIPDB || 0) / subscription.limits.threatIntelligence.abuseIPDB) > 0.5
                              ? "bg-yellow-500"
                              : "bg-green-500"
                          )}
                          style={{
                            width: subscription.limits.threatIntelligence.abuseIPDB === -1 ? "100%" : `${Math.min(((subscription.usage.threatIntelligence?.abuseIPDB || 0) / subscription.limits.threatIntelligence.abuseIPDB) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Free unlimited services status */}
                  <div className="pt-2 mt-2 space-y-1">
                    {subscription.limits.threatIntelligence.malwareBazaar && (
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>MalwareBazaar</span>
                        <Badge variant="outline" className="text-xs">Enabled (Unlimited)</Badge>
                      </div>
                    )}
                    {subscription.limits.threatIntelligence.urlhaus && (
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>URLhaus</span>
                        <Badge variant="outline" className="text-xs">Enabled (Unlimited)</Badge>
                      </div>
                    )}
                    {subscription.limits.threatIntelligence.threatFox && (
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>ThreatFox</span>
                        <Badge variant="outline" className="text-xs">Enabled (Unlimited)</Badge>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
            {!isActive && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleUpgrade("standard")}
                  className="flex-1"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Upgrade to Standard
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleUpgrade("pro")}
                  className="flex-1"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Upgrade to Pro
                </Button>
              </>
            )}
            {isActive && canCancel() && (
              <Button
                variant="destructive"
                onClick={() => setShowCancelDialog(true)}
                className="flex-1"
              >
                Cancel Subscription
              </Button>
            )}
            {isActive && !canCancel() && subscription.plan !== "enterprise" && (
              <Button
                variant="outline"
                onClick={() => handleUpgrade("pro")}
                disabled={subscription.plan === "pro"}
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {subscription.plan === "pro" ? "Current Plan" : "Upgrade to Pro"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <PaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        plan={selectedPlan}
        onSuccess={loadSubscription}
      />

      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              You are eligible for a full refund as you're within the 14-day cancellation period and have used less than 15% of your limits.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="reason">Reason for Cancellation (Optional)</Label>
              <Textarea
                id="reason"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Help us improve by sharing your reason..."
                className="mt-2"
                rows={3}
              />
            </div>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Your subscription will be cancelled immediately and a refund will be processed within 5-7 business days.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Keep Subscription
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelSubscription}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Cancel & Request Refund"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

