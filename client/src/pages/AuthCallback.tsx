import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get("token");
      const error = searchParams.get("error");
      const userParam = searchParams.get("user");

      if (error) {
        toast.error(`Authentication failed: ${error}`);
        navigate("/login", { replace: true });
        return;
      }

      if (!token) {
        toast.error("No authentication token received");
        navigate("/login", { replace: true });
        return;
      }

      try {
        // Decode URL-encoded token if needed
        const decodedToken = decodeURIComponent(token);
        
        // Verify token format (JWT tokens have 3 parts separated by dots)
        if (!decodedToken || decodedToken.trim() === "") {
          throw new Error("Invalid token received");
        }

        const tokenParts = decodedToken.split(".");
        if (tokenParts.length !== 3) {
          console.error("Invalid JWT token format:", decodedToken.substring(0, 50) + "...");
          throw new Error("Invalid token format");
        }

        // Set token in API client (this also updates localStorage)
        apiClient.setToken(decodedToken);

        // Double-check token is in localStorage
        const storedToken = localStorage.getItem("auth_token");
        if (!storedToken || storedToken !== decodedToken) {
          // Force set it again
          localStorage.setItem("auth_token", decodedToken);
          apiClient.setToken(decodedToken);
        }

        console.log("✅ Token set successfully, refreshing user...");

        // Refresh user data (this will use the token we just set)
        await refreshUser();

        toast.success("Successfully authenticated!");
        navigate("/dashboard", { replace: true });
      } catch (error: any) {
        console.error("Auth callback error:", error);
        // Clear invalid token
        localStorage.removeItem("auth_token");
        apiClient.setToken(null);
        toast.error(error.message || "Failed to complete authentication");
        navigate("/login", { replace: true });
      }
    };

    handleCallback();
  }, [searchParams, navigate, refreshUser]);

  const error = searchParams.get("error");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        {error ? (
          <>
            <XCircle className="h-16 w-16 text-destructive mx-auto mb-4 animate-fade-in" />
            <h1 className="text-2xl font-bold mb-2">Authentication Failed</h1>
            <p className="text-muted-foreground mb-4">
              {error === "no_code" && "No authorization code received from provider"}
              {error === "unsupported_provider" && "Unsupported OAuth provider"}
              {error === "oauth_failed" && "OAuth authentication failed"}
              {!["no_code", "unsupported_provider", "oauth_failed"].includes(error) && error}
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting to login page...
            </p>
          </>
        ) : (
          <>
            <Loader2 className="h-16 w-16 text-primary mx-auto mb-4 animate-spin" />
            <h1 className="text-2xl font-bold mb-2">Completing Authentication</h1>
            <p className="text-muted-foreground">
              Please wait while we sign you in...
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;

