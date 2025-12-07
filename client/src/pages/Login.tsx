import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Shield, Mail, Lock, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";
import { OAuthButtons } from "@/components/auth/OAuthButtons";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [requiresMFA, setRequiresMFA] = useState(false);
  const [mfaMethod, setMfaMethod] = useState<"email" | "sms" | "totp" | null>(null);
  const [mfaToken, setMfaToken] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaMessage, setMfaMessage] = useState("");
  const [isVerifyingMFA, setIsVerifyingMFA] = useState(false);
  const { login, isAuthenticated, isLoading: authLoading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Load saved credentials if "Remember Me" was previously checked
  useEffect(() => {
    const savedRememberMe = localStorage.getItem("rememberMe") === "true";
    if (savedRememberMe) {
      const savedEmail = localStorage.getItem("rememberedEmail");
      const savedPassword = localStorage.getItem("rememberedPassword");
      if (savedEmail) setEmail(savedEmail);
      if (savedPassword) setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      // Redirect to the page they were trying to access, or dashboard by default
      const from = (location.state as any)?.from || "/dashboard";
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      const response = await login(email, password);
      
      // Check if MFA is required
      if (response.requiresMFA) {
        setRequiresMFA(true);
        setMfaMethod(response.mfaMethod || null);
        setMfaToken(response.mfaToken || "");
        setMfaMessage(response.message || "Please enter your verification code");
        toast.info(response.message || "Please enter your verification code");
        setIsLoading(false);
        return;
      }
      
      // Save credentials if "Remember Me" is checked
      if (rememberMe) {
        localStorage.setItem("rememberMe", "true");
        localStorage.setItem("rememberedEmail", email);
        localStorage.setItem("rememberedPassword", password);
      } else {
        // Clear saved credentials if "Remember Me" is unchecked
        localStorage.removeItem("rememberMe");
        localStorage.removeItem("rememberedEmail");
        localStorage.removeItem("rememberedPassword");
      }
      
      toast.success("Welcome back!");
      // Redirect to the page they were trying to access, or dashboard by default
      const from = (location.state as any)?.from || "/dashboard";
      navigate(from, { replace: true });
    } catch (error: any) {
      toast.error(error.message || "Failed to login. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyMFA = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!mfaCode) {
      toast.error("Please enter your verification code");
      return;
    }

    setIsVerifyingMFA(true);
    try {
      const { authApi } = await import("@/lib/api");
      const response = await authApi.verifyMFA(mfaToken, mfaCode);
      
      // Update user context
      await refreshUser();
      
      // Save credentials if "Remember Me" is checked
      if (rememberMe) {
        localStorage.setItem("rememberMe", "true");
        localStorage.setItem("rememberedEmail", email);
        localStorage.setItem("rememberedPassword", password);
      } else {
        // Clear saved credentials if "Remember Me" is unchecked
        localStorage.removeItem("rememberMe");
        localStorage.removeItem("rememberedEmail");
        localStorage.removeItem("rememberedPassword");
      }
      
      toast.success("Welcome back!");
      // Redirect to the page they were trying to access, or dashboard by default
      const from = (location.state as any)?.from || "/dashboard";
      navigate(from, { replace: true });
    } catch (error: any) {
      toast.error(error.message || "Invalid verification code");
    } finally {
      setIsVerifyingMFA(false);
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

      {authLoading ? (
        <main className="relative min-h-screen flex items-center justify-center pt-16 px-4">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </main>
      ) : !isAuthenticated ? (
      <main className="relative min-h-screen flex items-center justify-center pt-16 px-4">
        <div className="w-full max-w-md">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/30 mb-8 mx-auto block text-center animate-fade-in">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Secure Authentication</span>
          </div>

          <Card className="glass border-border/50 shadow-2xl animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-full bg-primary/10 border border-primary/30">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold">
                Welcome to <span className="text-gradient">IntelliShieldX</span>
              </CardTitle>
              <CardDescription className="text-base">
                Sign in to your account to continue
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* OAuth Buttons */}
              {!requiresMFA && <OAuthButtons mode="login" />}
              
              {!requiresMFA ? (
              <form onSubmit={handleSubmit} className="space-y-4 mt-6">
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

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className="h-12 bg-background/50 border-border focus:border-primary/50 pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-12 w-10 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-border focus:ring-primary"
                    />
                    <span className="text-muted-foreground">Remember me</span>
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-primary hover:underline font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>

                <Button
                  type="submit"
                  variant="cyber"
                  size="lg"
                  className="w-full h-12 group"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="h-5 w-5 ml-2 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </Button>
              </form>
              ) : (
              <form onSubmit={handleVerifyMFA} className="space-y-4 mt-6">
                <div className="space-y-2">
                  <label htmlFor="mfaCode" className="text-sm font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    {mfaMethod === "email" && "Email Verification Code"}
                    {mfaMethod === "sms" && "SMS Verification Code"}
                    {mfaMethod === "totp" && "Authenticator Code"}
                  </label>
                  <Input
                    id="mfaCode"
                    type="text"
                    placeholder={mfaMethod === "totp" ? "000000" : "Enter 6-digit code"}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    disabled={isVerifyingMFA}
                    className="h-12 bg-background/50 border-border focus:border-primary/50 text-center text-2xl tracking-widest font-mono"
                    maxLength={6}
                    required
                  />
                  {mfaMessage && (
                    <p className="text-sm text-muted-foreground text-center">{mfaMessage}</p>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => {
                      setRequiresMFA(false);
                      setMfaCode("");
                      setMfaToken("");
                      setMfaMessage("");
                    }}
                    disabled={isVerifyingMFA}
                  >
                    Back to login
                  </Button>
                </div>

                <Button
                  type="submit"
                  variant="cyber"
                  size="lg"
                  className="w-full h-12 group"
                  disabled={isVerifyingMFA || mfaCode.length !== 6}
                >
                  {isVerifyingMFA ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify
                      <ArrowRight className="h-5 w-5 ml-2 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </Button>
              </form>
              )}

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <Link
                    to="/register"
                    className="text-primary hover:underline font-medium"
                  >
                    Sign up for free
                  </Link>
                </p>
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-xs text-center text-muted-foreground">
                  By signing in, you agree to our{" "}
                  <Link to="/terms" className="text-primary hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Additional Info */}
          <div className="mt-8 text-center animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <p className="text-sm text-muted-foreground">
              Need help?{" "}
              <Link to="/support" className="text-primary hover:underline font-medium">
                Contact Support
              </Link>
            </p>
          </div>
        </div>
      </main>
      ) : null}
    </div>
  );
};

export default Login;

