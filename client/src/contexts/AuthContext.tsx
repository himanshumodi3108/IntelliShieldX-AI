import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authApi, userApi } from "@/lib/api";
import { apiClient } from "@/lib/api";

interface OAuthAccount {
  provider: string;
  providerUsername: string;
  isActive: boolean;
}

interface User {
  id: string;
  email: string;
  name: string;
  plan: "free" | "standard" | "pro" | "enterprise";
  oauthAccounts?: OAuthAccount[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("auth_token");
      if (token) {
        apiClient.setToken(token);
        try {
          // Try to get user profile to verify token is valid
          const profile = await userApi.getProfile();
          const plan = await userApi.getPlan();
          setUser({
            id: profile.id || "",
            email: profile.email || "",
            name: profile.name || "",
            plan: plan || "free",
            oauthAccounts: profile.oauthAccounts || [],
          });
        } catch (error) {
          // Token is invalid, clear it
          localStorage.removeItem("auth_token");
          apiClient.setToken(null);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    if (response.user) {
      const token = response.token || localStorage.getItem("auth_token");
      if (token) {
        apiClient.setToken(token);
        localStorage.setItem("auth_token", token);
      }
      // Fetch full profile to get oauthAccounts
      try {
        const profile = await userApi.getProfile();
        setUser({
          id: response.user.id,
          email: response.user.email,
          name: response.user.name,
          plan: response.user.plan || "free",
          oauthAccounts: profile.oauthAccounts || [],
        });
      } catch {
        setUser({
          id: response.user.id,
          email: response.user.email,
          name: response.user.name,
          plan: response.user.plan || "free",
          oauthAccounts: [],
        });
      }
    }
  };

  const register = async (email: string, password: string, name: string) => {
    const response = await authApi.register(email, password, name);
    if (response.user) {
      const token = response.token || localStorage.getItem("auth_token");
      if (token) {
        apiClient.setToken(token);
        localStorage.setItem("auth_token", token);
      }
      // Fetch full profile to get oauthAccounts
      try {
        const profile = await userApi.getProfile();
        setUser({
          id: response.user.id,
          email: response.user.email,
          name: response.user.name,
          plan: response.user.plan || "free",
          oauthAccounts: profile.oauthAccounts || [],
        });
      } catch {
        setUser({
          id: response.user.id,
          email: response.user.email,
          name: response.user.name,
          plan: response.user.plan || "free",
          oauthAccounts: [],
        });
      }
    }
  };

  const logout = () => {
    authApi.logout();
    localStorage.removeItem("auth_token");
    apiClient.setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      // Ensure token is set in API client
      const token = localStorage.getItem("auth_token");
      if (token) {
        apiClient.setToken(token);
      } else {
        throw new Error("No authentication token found");
      }

      const profile = await userApi.getProfile();
      const plan = await userApi.getPlan();
      setUser({
        id: profile.id || "",
        email: profile.email || "",
        name: profile.name || "",
        plan: plan || "free",
        oauthAccounts: profile.oauthAccounts || [],
      });
    } catch (error) {
      console.error("Failed to refresh user:", error);
      // Clear invalid token
      localStorage.removeItem("auth_token");
      apiClient.setToken(null);
      throw error; // Re-throw to let caller handle it
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

