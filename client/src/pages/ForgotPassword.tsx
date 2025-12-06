import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { authApi } from "@/lib/api";
import { toast } from "sonner";
import { Shield, Mail, Key, ArrowLeft, Loader2, CheckCircle2, ArrowRight } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [step, setStep] = useState<"request" | "verify" | "reset">("request");
  const [method, setMethod] = useState<"otp" | "link">("otp");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();

  const handleRequestReset = async () => {
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setIsLoading(true);
    try {
      if (method === "otp") {
        await authApi.requestPasswordResetOTP(email);
        setEmailSent(true);
        setStep("verify");
        toast.success("OTP sent to your email");
      } else {
        await authApi.requestPasswordResetLink(email);
        setEmailSent(true);
        toast.success("Password reset link sent to your email");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset request");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp) {
      toast.error("Please enter the OTP");
      return;
    }

    setIsLoading(true);
    try {
      const result = await authApi.verifyPasswordResetOTP(email, otp);
      setResetToken(result.token);
      setStep("reset");
      toast.success("OTP verified successfully");
    } catch (error: any) {
      toast.error(error.message || "Invalid OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);
    try {
      if (method === "otp") {
        await authApi.resetPasswordWithOTP(email, otp, newPassword);
      } else {
        await authApi.resetPasswordWithToken(resetToken, newPassword);
      }
      toast.success("Password reset successfully!");
      navigate("/login");
    } catch (error: any) {
      toast.error(error.message || "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: "-3s" }} />
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.1)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.1)_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      <main className="relative min-h-screen flex items-center justify-center pt-16 px-4 py-12">
        <div className="w-full max-w-md">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/30 mb-8 mx-auto block text-center animate-fade-in">
            <Key className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Reset Your Password</span>
          </div>

          <Card className="glass border-border/50 shadow-2xl animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-full bg-primary/10 border border-primary/30">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold">
                Forgot <span className="text-gradient">Password?</span>
              </CardTitle>
              <CardDescription className="text-base">
                Choose how you'd like to reset your password
              </CardDescription>
            </CardHeader>
            <CardContent>
              {step === "request" && (
                <div className="space-y-4">
                  <Tabs value={method} onValueChange={(v) => setMethod(v as "otp" | "link")}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="otp">OTP via Email</TabsTrigger>
                      <TabsTrigger value="link">Reset Link</TabsTrigger>
                    </TabsList>
                    <TabsContent value="otp" className="space-y-4 mt-4">
                      <Alert>
                        <Mail className="h-4 w-4" />
                        <AlertDescription>
                          We'll send a one-time password (OTP) to your email address. Enter the OTP to reset your password.
                        </AlertDescription>
                      </Alert>
                    </TabsContent>
                    <TabsContent value="link" className="space-y-4 mt-4">
                      <Alert>
                        <Mail className="h-4 w-4" />
                        <AlertDescription>
                          We'll send a secure reset link to your email address. Click the link to reset your password.
                        </AlertDescription>
                      </Alert>
                    </TabsContent>
                  </Tabs>

                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      Email Address
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      className="h-12 bg-background/50 border-border focus:border-primary/50"
                      required
                    />
                  </div>

                  <Button
                    onClick={handleRequestReset}
                    variant="cyber"
                    size="lg"
                    className="w-full h-12 group"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        Send {method === "otp" ? "OTP" : "Reset Link"}
                        <ArrowRight className="h-5 w-5 ml-2 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </Button>
                </div>
              )}

              {step === "verify" && method === "otp" && (
                <div className="space-y-4">
                  <Alert className="border-success/50 bg-success/10">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <AlertDescription className="text-success">
                      OTP sent to {email}. Please check your email.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <label htmlFor="otp" className="text-sm font-medium flex items-center gap-2">
                      <Key className="h-4 w-4 text-muted-foreground" />
                      Enter OTP
                    </label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="000000"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      disabled={isLoading}
                      maxLength={6}
                      className="h-12 bg-background/50 border-border focus:border-primary/50 text-center text-2xl tracking-widest font-mono"
                      required
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      Enter the 6-digit code sent to your email
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setStep("request");
                        setOtp("");
                      }}
                      className="flex-1"
                      disabled={isLoading}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={handleVerifyOTP}
                      variant="cyber"
                      className="flex-1"
                      disabled={isLoading || otp.length !== 6}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        "Verify OTP"
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {step === "reset" && (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      {method === "otp" ? "OTP verified successfully!" : "Click the link in your email to continue."}
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <label htmlFor="newPassword" className="text-sm font-medium flex items-center gap-2">
                      <Key className="h-4 w-4 text-muted-foreground" />
                      New Password
                    </label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={isLoading}
                      className="h-12 bg-background/50 border-border focus:border-primary/50"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="confirmPassword" className="text-sm font-medium flex items-center gap-2">
                      <Key className="h-4 w-4 text-muted-foreground" />
                      Confirm Password
                    </label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isLoading}
                      className="h-12 bg-background/50 border-border focus:border-primary/50"
                      required
                    />
                  </div>

                  <Button
                    onClick={handleResetPassword}
                    variant="cyber"
                    size="lg"
                    className="w-full h-12 group"
                    disabled={isLoading || newPassword !== confirmPassword || newPassword.length < 8}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      <>
                        Reset Password
                        <ArrowRight className="h-5 w-5 ml-2 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </Button>
                </div>
              )}

              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="text-sm text-primary hover:underline font-medium inline-flex items-center gap-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Login
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ForgotPassword;

