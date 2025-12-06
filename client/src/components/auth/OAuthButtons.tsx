import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { authApi } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Wrench } from "lucide-react";
import { useState, useEffect } from "react";
import { ProviderLogo } from "./ProviderLogo";

interface OAuthProvider {
  id: string;
  name: string;
  color: string;
}

const providers: OAuthProvider[] = [
  { 
    id: "google", 
    name: "Google", 
    color: "hover:bg-red-500/10 hover:border-red-500/50" 
  },
  { 
    id: "microsoft", 
    name: "Microsoft", 
    color: "hover:bg-blue-500/10 hover:border-blue-500/50" 
  },
  { 
    id: "zoho", 
    name: "Zoho Mail", 
    color: "hover:bg-orange-500/10 hover:border-orange-500/50" 
  },
  { 
    id: "github", 
    name: "GitHub", 
    color: "hover:bg-gray-500/10 hover:border-gray-500/50" 
  },
];

interface OAuthButtonsProps {
  mode?: "login" | "register";
}

interface ProviderStatus {
  id: string;
  name: string;
  configured: boolean;
}

export const OAuthButtons = ({ mode = "login" }: OAuthButtonsProps) => {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [providerStatuses, setProviderStatuses] = useState<Record<string, boolean>>({});
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);

  useEffect(() => {
    loadProviderStatuses();
  }, []);

  const loadProviderStatuses = async () => {
    try {
      setIsLoadingProviders(true);
      const providers = await authApi.getOAuthProviders();
      const statusMap: Record<string, boolean> = {};
      providers.forEach((p: ProviderStatus) => {
        statusMap[p.id] = p.configured;
      });
      setProviderStatuses(statusMap);
    } catch (error) {
      console.error("Failed to load OAuth provider statuses:", error);
      // Default to all unconfigured if API fails
      providers.forEach((p) => {
        setProviderStatuses((prev) => ({ ...prev, [p.id]: false }));
      });
    } finally {
      setIsLoadingProviders(false);
    }
  };

  const handleOAuthLogin = async (providerId: string) => {
    // Check if provider is configured
    if (!providerStatuses[providerId]) {
      toast.error(`${providers.find(p => p.id === providerId)?.name} authentication is not available yet. Please use email/password or try another method.`);
      return;
    }

    try {
      setLoadingProvider(providerId);
      await authApi.oauthLogin(providerId);
      // The redirect will happen automatically
    } catch (error: any) {
      if (error.message?.includes("not configured") || error.message?.includes("503")) {
        toast.error(`${providers.find(p => p.id === providerId)?.name} authentication is currently unavailable. Please use email/password or try another method.`);
      } else {
        toast.error(`Failed to authenticate with ${providerId}. Please try again.`);
      }
      setLoadingProvider(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <TooltipProvider>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {providers.map((provider) => {
            const isLoading = loadingProvider === provider.id;
            const isConfigured = providerStatuses[provider.id] ?? false;
            const isDisabled = isLoading || !!loadingProvider || !isConfigured || isLoadingProviders;
            const actionText = mode === "login" ? "Login" : "Register";
            
            return (
              <Tooltip key={provider.id}>
                <TooltipTrigger asChild>
                  <div className="relative">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className={`h-10 w-10 border-border bg-background/50 transition-all ${
                        isConfigured 
                          ? provider.color 
                          : "opacity-50 cursor-not-allowed hover:opacity-50"
                      }`}
                      onClick={() => handleOAuthLogin(provider.id)}
                      disabled={isDisabled}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : !isConfigured ? (
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ProviderLogo provider={provider.id} className="h-5 w-5" />
                      )}
                    </Button>
                    {!isConfigured && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full border-2 border-background" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {isConfigured ? (
                    <p>{actionText} with {provider.name}</p>
                  ) : (
                    <div className="text-center">
                      <p className="font-medium">Work in Progress</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {provider.name} authentication is not available yet
                      </p>
                    </div>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    </div>
  );
};

