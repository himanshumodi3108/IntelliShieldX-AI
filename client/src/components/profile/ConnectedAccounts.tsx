import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { repositoryApi } from "@/lib/api";
import { toast } from "sonner";
import { Github, Loader2, CheckCircle2, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ConnectedAccount {
  _id: string;
  provider: string;
  providerUsername: string;
  providerEmail?: string;
  providerAvatar?: string;
  isActive: boolean;
}

export function ConnectedAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    loadAccounts();
    // Check for OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("connected") === "true" && urlParams.get("provider") === "github") {
      handleOAuthCallback(urlParams);
    }
    // Check for errors or info messages from OAuth flow
    if (urlParams.get("error")) {
      toast.error(urlParams.get("error") || "An error occurred");
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (urlParams.get("info")) {
      toast.info(urlParams.get("info") || "");
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const loadAccounts = async () => {
    try {
      setIsLoading(true);
      const data = await repositoryApi.getConnectedAccounts();
      setAccounts(data);
    } catch (error: any) {
      console.error("Failed to load connected accounts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthCallback = async (params: URLSearchParams) => {
    try {
      setIsConnecting(true);
      const accessToken = params.get("accessToken");
      const profileStr = params.get("profile");

      if (!accessToken || !profileStr) {
        throw new Error("Missing OAuth data");
      }

      const profile = JSON.parse(profileStr);

      await repositoryApi.connectGitHubAccount({
        accessToken,
        providerAccountId: profile.providerAccountId,
        providerUsername: profile.providerUsername,
        providerEmail: profile.providerEmail,
        providerAvatar: profile.providerAvatar,
      });

      toast.success("GitHub account connected successfully!");
      await loadAccounts();

      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
    } catch (error: any) {
      console.error("Failed to connect GitHub account:", error);
      toast.error(error.message || "Failed to connect GitHub account");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectGitHub = () => {
    const BACKEND_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || "http://localhost:3001";
    const redirectUrl = encodeURIComponent(window.location.href);
    const token = localStorage.getItem("auth_token");
    
    if (!token) {
      toast.error("Please log in to connect your GitHub account");
      return;
    }
    
    // Include token in query parameter for OAuth connection flow
    const connectUrl = `${BACKEND_URL}/api/auth/connect/github?redirect=${redirectUrl}&token=${encodeURIComponent(token)}`;
    console.log("Redirecting to GitHub OAuth:", connectUrl.replace(token, "***")); // Log without exposing token
    window.location.href = connectUrl;
  };

  const handleDisconnect = async (accountId: string, provider: string) => {
    if (!confirm(`Are you sure you want to disconnect your ${provider} account?`)) {
      return;
    }

    try {
      if (provider === "github") {
        await repositoryApi.disconnectGitHubAccount();
      }
      toast.success(`${provider} account disconnected`);
      await loadAccounts();
    } catch (error: any) {
      toast.error(error.message || `Failed to disconnect ${provider} account`);
    }
  };

  const githubAccount = accounts.find((a) => a.provider === "github");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Github className="h-5 w-5" />
          Connected Accounts
        </CardTitle>
        <CardDescription>
          Connect your accounts to access repositories and perform security scans
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* GitHub Account */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary">
                  <Github className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium">GitHub</div>
                  {githubAccount ? (
                    <div className="text-sm text-muted-foreground">
                      @{githubAccount.providerUsername}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">Not connected</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {githubAccount ? (
                  <>
                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDisconnect(githubAccount._id, "github")}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleConnectGitHub}
                    disabled={isConnecting}
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Github className="h-4 w-4 mr-2" />
                        Connect GitHub
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {user?.oauthProvider === "github" && !githubAccount && (
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm text-primary">
                You registered with GitHub. Your account is automatically connected for repository access.
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

