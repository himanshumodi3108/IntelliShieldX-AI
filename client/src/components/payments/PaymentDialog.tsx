import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { paymentApi } from "@/lib/api";
import { toast } from "sonner";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: "standard" | "pro" | "enterprise";
  onSuccess?: () => void;
}

export function PaymentDialog({ open, onOpenChange, plan, onSuccess }: PaymentDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderData, setOrderData] = useState<{
    baseAmount?: number;
    gstAmount?: number;
    transactionFee?: number;
    totalAmount?: number;
    gstEnabled?: boolean;
    orderId?: string;
  } | null>(null);

  useEffect(() => {
    // Suppress harmless Razorpay SVG attribute errors
    const originalError = console.error;
    const errorFilter = (...args: any[]) => {
      const errorMessage = args.join(" ");
      // Filter out Razorpay SVG attribute errors (harmless UI bugs in Razorpay's code)
      if (
        errorMessage.includes("attribute height: Expected length") ||
        errorMessage.includes("attribute width: Expected length") ||
        (errorMessage.includes("<svg>") && errorMessage.includes("auto"))
      ) {
        // Silently ignore these Razorpay UI errors
        return;
      }
      originalError.apply(console, args);
    };
    console.error = errorFilter;

    // Load Razorpay script
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Restore original console.error
      console.error = originalError;
      // Remove script if component unmounts
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handlePayment = async () => {
    try {
      setIsLoading(true);

      // Create order
      const orderResponse = await paymentApi.createOrder(plan) as {
        orderId: string;
        amount: number;
        currency: string;
        key: string;
        baseAmount: number;
        gstAmount: number;
        transactionFee: number;
        totalAmount: number;
        gstEnabled: boolean;
      };

      setOrderData(orderResponse);

      if (!window.Razorpay) {
        toast.error("Payment gateway not loaded. Please refresh the page.");
        return;
      }

      const options = {
        key: orderResponse.key,
        amount: orderResponse.amount,
        currency: orderResponse.currency,
        name: "IntelliShieldX",
        description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan Subscription`,
        order_id: orderResponse.orderId,
        handler: async (response: any) => {
          try {
            setIsProcessing(true);
            await paymentApi.verifyPayment(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature,
              plan
            );
            toast.success("Payment successful! Your subscription is now active.");
            setOrderData(null); // Reset order data
            onOpenChange(false);
            if (onSuccess) {
              onSuccess();
            }
          } catch (error: any) {
            console.error("Payment verification error:", error);
            toast.error(error.message || "Payment verification failed");
          } finally {
            setIsProcessing(false);
          }
        },
        prefill: {
          name: "",
          email: "",
        },
        theme: {
          color: "#6366f1",
        },
        modal: {
          ondismiss: () => {
            setIsLoading(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
      setIsLoading(false);
    } catch (error: any) {
      setOrderData(null); // Reset on error
      console.error("Payment error:", error);
      
      // Provide user-friendly error messages
      let errorMessage = "Failed to initiate payment";
      if (error.message?.includes("502") || error.message?.includes("Bad Gateway")) {
        errorMessage = "Payment gateway is temporarily unavailable. Please try again in a few moments.";
      } else if (error.message?.includes("500") || error.message?.includes("Internal Server Error")) {
        errorMessage = "Payment service error. Please try again or contact support if the issue persists.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };

  const planNames: Record<string, string> = {
    standard: "Standard",
    pro: "Pro",
    enterprise: "Enterprise",
  };

  const planPrices: Record<string, string> = {
    standard: "₹499",
    pro: "₹999",
    enterprise: "₹4,999",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Subscribe to {planNames[plan]} Plan</DialogTitle>
          <DialogDescription>
            Complete your payment to activate your subscription
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 rounded-lg border border-border bg-secondary/30">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Plan</span>
              <span className="font-semibold">{planNames[plan]}</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Base Price</span>
                <span className="font-semibold">{planPrices[plan]}</span>
              </div>
              {orderData?.gstEnabled && orderData?.gstAmount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">GST</span>
                  <span className="text-muted-foreground">
                    ₹{(orderData.gstAmount / 100).toLocaleString()}
                  </span>
                </div>
              )}
              {orderData?.transactionFee && orderData.transactionFee > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Transaction Fee</span>
                  <span className="text-muted-foreground">
                    ₹{(orderData.transactionFee / 100).toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="font-medium">Total Amount</span>
                <span className="text-2xl font-bold">
                  ₹{orderData ? (orderData.totalAmount / 100).toLocaleString() : Math.round(parseInt(planPrices[plan].replace("₹", "").replace(",", "")) * 1.18).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <span className="text-sm text-muted-foreground">Validity</span>
              <span className="text-sm text-muted-foreground">1 Year</span>
            </div>
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Subscription valid for 1 year or until limits exhausted</p>
            <p>• 14-day cancellation period (Standard & Pro only)</p>
            <p>• Refund available if usage &lt; 15%</p>
          </div>

          <Button
            onClick={handlePayment}
            disabled={isLoading || isProcessing}
            variant="cyber"
            className="w-full"
            size="lg"
          >
            {isLoading || isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                {isProcessing ? "Processing..." : "Loading..."}
              </>
            ) : orderData?.totalAmount ? (
              `Pay ₹${(orderData.totalAmount / 100).toLocaleString()}`
            ) : (
              `Pay ${planPrices[plan]}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

