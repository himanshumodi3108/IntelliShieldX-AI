import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiClient } from "@/lib/api";

interface Admin {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  mustChangePassword?: boolean;
}

interface AdminAuthContextType {
  admin: Admin | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  mustChangePassword: boolean;
  login: (email: string, password: string) => Promise<{ mustChangePassword: boolean }>;
  logout: () => void;
  refreshAdmin: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  const logout = () => {
    localStorage.removeItem("admin_token");
    apiClient.setAdminToken(null);
    setAdmin(null);
  };

  const refreshAdmin = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        throw new Error("No admin token found");
      }

      // Ensure apiClient has the token
      apiClient.setAdminToken(token);

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAdmin({
          id: data.id,
          email: data.email,
          name: data.name,
          role: data.role,
          permissions: data.permissions || [],
          mustChangePassword: data.mustChangePassword || false,
        });
        setMustChangePassword(data.mustChangePassword || false);
      } else {
        const errorData = await response.json().catch(() => ({ error: "Failed to refresh admin" }));
        const errorMessage = errorData.error || "Failed to refresh admin";
        
        // If token is invalid or expired, clear it
        if (response.status === 401) {
          console.warn("Admin token is invalid or expired. Clearing token.");
          localStorage.removeItem("admin_token");
          apiClient.setAdminToken(null);
          setAdmin(null);
        }
        
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      // Only log if it's not a "no token" error (which is expected on first load)
      if (error.message !== "No admin token found") {
        console.error("Failed to refresh admin:", error.message || error);
      }
      // Don't call logout here - let checkAdminAuth handle it
      throw error;
    }
  };

  const checkAdminAuth = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      if (token) {
        apiClient.setAdminToken(token);
        await refreshAdmin();
      } else {
        // No token - user is not logged in, which is fine
        setAdmin(null);
      }
    } catch (error: any) {
      // Token is invalid or expired - clear it silently
      // This is expected behavior when token expires or is invalid
      if (error.message?.includes("token") || error.message?.includes("Invalid") || error.message?.includes("expired")) {
        console.log("Admin token is invalid. User needs to log in again.");
        localStorage.removeItem("admin_token");
        apiClient.setAdminToken(null);
        setAdmin(null);
      } else {
        console.error("Admin auth check failed:", error.message || error);
        localStorage.removeItem("admin_token");
        apiClient.setAdminToken(null);
        setAdmin(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const login = async (email: string, password: string): Promise<{ mustChangePassword: boolean }> => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/admin/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Login failed" }));
        throw new Error(error.error || "Login failed");
      }

      const data = await response.json();
      
      // Verify we got a token
      if (!data.token) {
        throw new Error("No token received from server");
      }
      
      // Store token and set in apiClient
      localStorage.setItem("admin_token", data.token);
      apiClient.setAdminToken(data.token);
      
      // Set admin data
      if (data.admin) {
        const adminData = {
          id: data.admin.id || data.admin._id,
          email: data.admin.email,
          name: data.admin.name,
          role: data.admin.role,
          permissions: data.admin.permissions || [],
          mustChangePassword: data.mustChangePassword || data.admin.mustChangePassword || false,
        };
        setAdmin(adminData);
        setMustChangePassword(adminData.mustChangePassword);
        
        // Return mustChangePassword flag
        return { mustChangePassword: adminData.mustChangePassword };
      } else {
        throw new Error("No admin data received from server");
      }
    } catch (error: any) {
      // Clear any existing invalid tokens
      localStorage.removeItem("admin_token");
      apiClient.setAdminToken(null);
      throw error;
    }
  };

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        isAuthenticated: !!admin,
        isLoading,
        mustChangePassword,
        login,
        logout,
        refreshAdmin,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
};
