import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Shield, Mail, Lock, User, ArrowRight, Loader2, CheckCircle2, Sparkles, Copy, Check, Eye, EyeOff } from "lucide-react";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { generatePasswordSuggestions } from "@/utils/passwordGenerator";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordSuggestions, setPasswordSuggestions] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const { register, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Generate password suggestions on mount
  useEffect(() => {
    setPasswordSuggestions(generatePasswordSuggestions(3));
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const validatePassword = (pwd: string) => {
    return {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
    };
  };

  const passwordValidation = validatePassword(password);
  const isPasswordValid = Object.values(passwordValidation).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email || !password || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (!isPasswordValid) {
      toast.error("Password does not meet requirements");
      return;
    }

    setIsLoading(true);
    try {
      await register(email, password, name);
      toast.success("Account created successfully!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to create account. Please try again.");
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

      {authLoading ? (
        <main className="relative min-h-screen flex items-center justify-center pt-16 px-4">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </main>
      ) : !isAuthenticated ? (
      <main className="relative min-h-screen flex items-center justify-center pt-16 px-4 py-12">
        <div className="w-full max-w-md">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/30 mb-8 mx-auto block text-center animate-fade-in">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Create Your Account</span>
          </div>

          <Card className="glass border-border/50 shadow-2xl animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-full bg-primary/10 border border-primary/30">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold">
                Join <span className="text-gradient">IntelliShieldX</span>
              </CardTitle>
              <CardDescription className="text-base">
                Start securing your applications today
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* OAuth Buttons */}
              <OAuthButtons mode="register" />
              
              <form onSubmit={handleSubmit} className="space-y-4 mt-6">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Full Name
                  </label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                    className="h-12 bg-background/50 border-border focus:border-primary/50"
                    required
                  />
                </div>

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
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a strong password"
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
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-12 w-12"
                      onClick={() => setPasswordSuggestions(generatePasswordSuggestions(3))}
                      title="Generate new suggestions"
                    >
                      <Sparkles className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Password Suggestions */}
                  {passwordSuggestions.length > 0 && !password && (
                    <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-3 w-3 text-primary" />
                        <p className="text-xs font-medium text-muted-foreground">Suggested strong passwords:</p>
                      </div>
                      <div className="space-y-2">
                        {passwordSuggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 p-2 rounded bg-background/50 border border-border/30 hover:border-primary/50 transition-colors group cursor-pointer"
                            onClick={() => {
                              setPassword(suggestion);
                              setConfirmPassword(suggestion);
                              toast.success("Password suggestion applied!");
                            }}
                          >
                            <code className="flex-1 text-xs font-mono text-foreground break-all">
                              {suggestion}
                            </code>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(suggestion);
                                setCopiedIndex(index);
                                toast.success("Password copied to clipboard!");
                                setTimeout(() => setCopiedIndex(null), 2000);
                              }}
                            >
                              {copiedIndex === index ? (
                                <Check className="h-3 w-3 text-success" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Click on a suggestion to use it, or click the sparkle icon to generate new ones
                      </p>
                    </div>
                  )}
                  
                  {/* Password Requirements */}
                  {password && (
                    <div className="mt-2 p-3 rounded-lg bg-secondary/30 border border-border/50 space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Password requirements:</p>
                      <div className="space-y-1">
                        <div className={`flex items-center gap-2 text-xs ${passwordValidation.length ? "text-success" : "text-muted-foreground"}`}>
                          <CheckCircle2 className={`h-3 w-3 ${passwordValidation.length ? "text-success" : "opacity-30"}`} />
                          At least 8 characters
                        </div>
                        <div className={`flex items-center gap-2 text-xs ${passwordValidation.uppercase ? "text-success" : "text-muted-foreground"}`}>
                          <CheckCircle2 className={`h-3 w-3 ${passwordValidation.uppercase ? "text-success" : "opacity-30"}`} />
                          One uppercase letter
                        </div>
                        <div className={`flex items-center gap-2 text-xs ${passwordValidation.lowercase ? "text-success" : "text-muted-foreground"}`}>
                          <CheckCircle2 className={`h-3 w-3 ${passwordValidation.lowercase ? "text-success" : "opacity-30"}`} />
                          One lowercase letter
                        </div>
                        <div className={`flex items-center gap-2 text-xs ${passwordValidation.number ? "text-success" : "text-muted-foreground"}`}>
                          <CheckCircle2 className={`h-3 w-3 ${passwordValidation.number ? "text-success" : "opacity-30"}`} />
                          One number
                        </div>
                        <div className={`flex items-center gap-2 text-xs ${passwordValidation.special ? "text-success" : "text-muted-foreground"}`}>
                          <CheckCircle2 className={`h-3 w-3 ${passwordValidation.special ? "text-success" : "opacity-30"}`} />
                          One special character
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isLoading}
                      className="h-12 bg-background/50 border-border focus:border-primary/50 pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-12 w-10 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isLoading}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-destructive">Passwords do not match</p>
                  )}
                </div>

                <div className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    id="terms"
                    className="mt-1 rounded border-border focus:ring-primary"
                    required
                  />
                  <label htmlFor="terms" className="text-muted-foreground cursor-pointer">
                    I agree to the{" "}
                    <Link to="/terms" className="text-primary hover:underline font-medium">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link to="/privacy" className="text-primary hover:underline font-medium">
                      Privacy Policy
                    </Link>
                  </label>
                </div>

                <Button
                  type="submit"
                  variant="cyber"
                  size="lg"
                  className="w-full h-12 group"
                  disabled={isLoading || !isPasswordValid || password !== confirmPassword}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="h-5 w-5 ml-2 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="text-primary hover:underline font-medium"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Additional Info */}
          <div className="mt-8 text-center animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <p className="text-sm text-muted-foreground">
              Free plan includes 2 AI chats and basic security scans
            </p>
          </div>
        </div>
      </main>
      ) : null}
    </div>
  );
};

export default Register;

