import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import adminApi from "@/lib/adminApi";
import { toast } from "sonner";
import {
  User,
  Mail,
  Phone,
  Shield,
  Smartphone,
  CheckCircle2,
  Loader2,
  QrCode,
  Copy,
  Eye,
  EyeOff,
  Lock,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChangePasswordForm } from "@/components/admin/AdminChangePasswordForm";

export default function AdminProfile() {
  const { admin, refreshAdmin } = useAdminAuth();
  const [profile, setProfile] = useState({
    name: admin?.name || "",
    email: admin?.email || "",
    phone: "",
  });
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaMethod, setMfaMethod] = useState<"email" | "sms" | "totp" | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [totpQrCode, setTotpQrCode] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [showTotpSecret, setShowTotpSecret] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [admin]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const data = await adminApi.getProfile();
      setProfile({
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
      });
      setMfaEnabled(data.mfaEnabled || false);
      setMfaMethod(data.mfaMethod || null);
      setPhoneNumber(data.phone || "");
    } catch (error) {
      console.error("Failed to load profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      await adminApi.updateProfile(profile);
      await refreshAdmin();
      toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleMFA = async (enabled: boolean) => {
    try {
      setIsLoading(true);
      if (enabled) {
        // Enable MFA - user needs to choose method first
        if (!mfaMethod) {
          toast.info("Please select an MFA method first");
          return;
        }
        await adminApi.enableMFA(mfaMethod);
        toast.success("MFA enabled successfully");
      } else {
        // Disable MFA
        await adminApi.disableMFA();
        setMfaMethod(null);
        toast.success("MFA disabled");
      }
      setMfaEnabled(enabled);
      await loadProfile();
    } catch (error: any) {
      toast.error(error.message || "Failed to update MFA settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupEmailOTP = async () => {
    try {
      setIsLoading(true);
      await adminApi.setupEmailOTP();
      setMfaMethod("email");
      toast.success("Email OTP setup complete. Check your email for verification.");
    } catch (error: any) {
      toast.error(error.message || "Failed to setup Email OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupSMSOTP = async () => {
    if (!phoneNumber) {
      toast.error("Please enter a phone number");
      return;
    }
    try {
      setIsLoading(true);
      await adminApi.setupSMSOTP(phoneNumber);
      setMfaMethod("sms");
      toast.success("SMS OTP setup complete. Check your phone for verification code.");
    } catch (error: any) {
      toast.error(error.message || "Failed to setup SMS OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupTOTP = async () => {
    try {
      setIsLoading(true);
      const result = await adminApi.setupTOTP();
      setTotpSecret(result.secret);
      setTotpQrCode(result.qrCode);
      setMfaMethod("totp");
      toast.success("TOTP setup initiated. Scan the QR code with your authenticator app.");
    } catch (error: any) {
      toast.error(error.message || "Failed to setup TOTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyTOTP = async () => {
    if (!totpCode) {
      toast.error("Please enter the verification code");
      return;
    }
    try {
      setIsLoading(true);
      await adminApi.verifyTOTP(totpCode);
      toast.success("TOTP verified successfully");
      setTotpCode("");
      setMfaEnabled(true);
      await loadProfile();
    } catch (error: any) {
      toast.error(error.message || "Invalid verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (isLoading && !profile.email) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Admin Profile</h1>
          <p className="text-muted-foreground">Manage your account settings and security</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-secondary/50 p-1 rounded-xl">
            <TabsTrigger value="profile" className="rounded-lg">
              Profile Information
            </TabsTrigger>
            <TabsTrigger value="security" className="rounded-lg">
              Security
            </TabsTrigger>
            <TabsTrigger value="mfa" className="rounded-lg">
              Multi-Factor Authentication
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            {/* Profile Information */}
            <Card className="glass border-border/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>Update your personal information</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="bg-background/50 border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    disabled
                    className="bg-background/50 border-border opacity-60"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="+1234567890"
                    className="bg-background/50 border-border"
                  />
                </div>
                <Button onClick={handleSaveProfile} disabled={isSaving} variant="cyber">
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            {/* Change Password */}
            <Card className="glass border-border/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
                    <Lock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Change Password</CardTitle>
                    <CardDescription>Update your account password</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ChangePasswordForm onPasswordChanged={refreshAdmin} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mfa" className="space-y-6">
            {/* Multi-Factor Authentication */}
            <Card className="glass border-border/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle>Multi-Factor Authentication</CardTitle>
                    <CardDescription>Add an extra layer of security to your account</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {mfaEnabled ? "Enabled" : "Disabled"}
                    </span>
                    <Switch
                      checked={mfaEnabled}
                      onCheckedChange={handleToggleMFA}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {!mfaEnabled && (
                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      Enable MFA to protect your account with an additional authentication step.
                    </AlertDescription>
                  </Alert>
                )}

                {mfaEnabled && mfaMethod && (
                  <Alert className="border-success/50 bg-success/10">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <AlertDescription className="text-success">
                      MFA is enabled using {mfaMethod === "email" ? "Email OTP" : mfaMethod === "sms" ? "SMS OTP" : "Authenticator App"}
                    </AlertDescription>
                  </Alert>
                )}

                <Separator />

                {/* Email OTP */}
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">Email OTP</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Receive one-time passwords via email when logging in
                      </p>
                      {mfaMethod === "email" ? (
                        <div className="flex items-center gap-2 text-sm text-success">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Email OTP is active</span>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSetupEmailOTP}
                          disabled={isLoading || mfaEnabled}
                        >
                          Setup Email OTP
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* SMS OTP */}
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <h3 className="font-semibold mb-1">SMS OTP</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          Receive one-time passwords via SMS when logging in
                        </p>
                      </div>
                      {mfaMethod === "sms" ? (
                        <div className="flex items-center gap-2 text-sm text-success">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>SMS OTP is active</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Input
                            type="tel"
                            placeholder="+1234567890"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="bg-background/50 border-border"
                            disabled={isLoading || mfaEnabled}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSetupSMSOTP}
                            disabled={isLoading || mfaEnabled || !phoneNumber}
                          >
                            Setup SMS OTP
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* TOTP Authenticator */}
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
                      <Smartphone className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 space-y-4">
                      <div>
                        <h3 className="font-semibold mb-1">Authenticator App</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          Use an authenticator app like Google Authenticator or Authy
                        </p>
                      </div>

                      {totpQrCode && !mfaEnabled && (
                        <div className="p-4 rounded-lg bg-secondary/30 border border-border/50 space-y-4">
                          <div className="text-center">
                            <p className="text-sm font-medium mb-2">Scan this QR code with your authenticator app</p>
                            <div className="inline-block p-4 bg-white rounded-lg">
                              <img src={totpQrCode} alt="TOTP QR Code" className="w-48 h-48" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Or enter this secret key manually:</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type={showTotpSecret ? "text" : "password"}
                                value={totpSecret}
                                readOnly
                                className="bg-background/50 border-border font-mono"
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setShowTotpSecret(!showTotpSecret)}
                              >
                                {showTotpSecret ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => copyToClipboard(totpSecret)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Enter verification code from your app:</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="text"
                                value={totpCode}
                                onChange={(e) => setTotpCode(e.target.value)}
                                placeholder="000000"
                                maxLength={6}
                                className="bg-background/50 border-border"
                              />
                              <Button
                                variant="cyber"
                                onClick={handleVerifyTOTP}
                                disabled={isLoading || totpCode.length !== 6}
                              >
                                Verify
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {mfaMethod === "totp" && mfaEnabled ? (
                        <div className="flex items-center gap-2 text-sm text-success">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Authenticator app is active</span>
                        </div>
                      ) : (
                        !totpQrCode && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSetupTOTP}
                            disabled={isLoading || mfaEnabled}
                          >
                            <QrCode className="h-4 w-4 mr-2" />
                            Setup Authenticator App
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}


