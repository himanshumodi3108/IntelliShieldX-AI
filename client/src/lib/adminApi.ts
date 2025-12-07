// Admin API service layer
import { apiClient } from "./api";

// Ensure admin token is loaded before making requests
const ensureAdminToken = () => {
  // Force refresh tokens from localStorage
  apiClient.refreshTokens();
  
  // Verify admin token exists
  const adminToken = localStorage.getItem("admin_token");
  if (!adminToken) {
    console.warn("Admin token not found in localStorage. Please log in again.");
    throw new Error("Admin authentication required. Please log in again.");
  }
};

const adminApi = {
  // Auth
  login: (email: string, password: string) =>
    apiClient.request<{ token: string; admin: any }>("/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  
  getProfile: () => {
    ensureAdminToken();
    return apiClient.request<any>("/admin/auth/profile");
  },
  
  changePassword: (data: { currentPassword?: string; newPassword: string }) => {
    ensureAdminToken();
    return apiClient.request<{ message: string }>("/admin/auth/change-password", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Users
  getUsers: (params?: { page?: number; limit?: number; search?: string; plan?: string; status?: string }) => {
    ensureAdminToken();
    const query = new URLSearchParams();
    if (params?.page) query.append("page", params.page.toString());
    if (params?.limit) query.append("limit", params.limit.toString());
    if (params?.search) query.append("search", params.search);
    if (params?.plan) query.append("plan", params.plan);
    if (params?.status) query.append("status", params.status);
    return apiClient.request<any>(`/admin/users?${query.toString()}`);
  },
  
  getUser: (id: string) => {
    ensureAdminToken();
    return apiClient.request<any>(`/admin/users/${id}`);
  },
  
  updateUser: (id: string, data: any) => {
    ensureAdminToken();
    return apiClient.request<any>(`/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  
  suspendUser: (id: string, reason?: string) => {
    ensureAdminToken();
    return apiClient.request<{ message: string }>(`/admin/users/${id}/suspend`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },
  
  activateUser: (id: string) => {
    ensureAdminToken();
    return apiClient.request<{ message: string }>(`/admin/users/${id}/activate`, {
      method: "POST",
    });
  },
  
  changeUserPlan: (id: string, plan: string) => {
    ensureAdminToken();
    return apiClient.request<any>(`/admin/users/${id}/change-plan`, {
      method: "POST",
      body: JSON.stringify({ plan }),
    });
  },
  
  deleteUser: (id: string) => {
    ensureAdminToken();
    return apiClient.request<{ message: string }>(`/admin/users/${id}`, {
      method: "DELETE",
    });
  },

  createAdminUser: (data: { email: string; password?: string; name: string; role?: string; permissions?: string[] }) => {
    ensureAdminToken();
    return apiClient.request<any>("/admin/users/admins", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  changePassword: (data: { currentPassword?: string; newPassword: string }) => {
    ensureAdminToken();
    return apiClient.request<any>("/admin/auth/change-password", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateProfile: (data: { name?: string; phone?: string }) => {
    ensureAdminToken();
    return apiClient.request<any>("/admin/auth/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // MFA methods
  enableMFA: (method: "email" | "sms" | "totp") => {
    ensureAdminToken();
    return apiClient.request<any>("/admin/auth/mfa/enable", {
      method: "POST",
      body: JSON.stringify({ method }),
    });
  },

  disableMFA: () => {
    ensureAdminToken();
    return apiClient.request<any>("/admin/auth/mfa/disable", {
      method: "POST",
    });
  },

  setupEmailOTP: () => {
    ensureAdminToken();
    return apiClient.request<any>("/admin/auth/mfa/setup-email", {
      method: "POST",
    });
  },

  setupSMSOTP: (phoneNumber: string) => {
    ensureAdminToken();
    return apiClient.request<any>("/admin/auth/mfa/setup-sms", {
      method: "POST",
      body: JSON.stringify({ phoneNumber }),
    });
  },

  setupTOTP: () => {
    ensureAdminToken();
    return apiClient.request<any>("/admin/auth/mfa/setup-totp", {
      method: "POST",
    });
  },

  verifyTOTP: (code: string) => {
    ensureAdminToken();
    return apiClient.request<any>("/admin/auth/mfa/verify-totp", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  },

  // Subscriptions
  getSubscriptions: (params?: { page?: number; limit?: number; plan?: string; status?: string; search?: string }) => {
    ensureAdminToken();
    const query = new URLSearchParams();
    if (params?.page) query.append("page", params.page.toString());
    if (params?.limit) query.append("limit", params.limit.toString());
    if (params?.plan) query.append("plan", params.plan);
    if (params?.status) query.append("status", params.status);
    if (params?.search) query.append("search", params.search);
    return apiClient.request<any>(`/admin/subscriptions?${query.toString()}`);
  },
  
  getSubscription: (id: string) => {
    ensureAdminToken();
    return apiClient.request<any>(`/admin/subscriptions/${id}`);
  },
  
  processRefund: (id: string) => {
    ensureAdminToken();
    return apiClient.request<any>(`/admin/subscriptions/${id}/refund`, {
      method: "POST",
    });
  },
  
  getRevenueAnalytics: (period?: string) => {
    ensureAdminToken();
    return apiClient.request<any>(`/admin/subscriptions/analytics/revenue?period=${period || "month"}`);
  },

  // Analytics
  getOverview: () => {
    ensureAdminToken();
    return apiClient.request<any>("/admin/analytics/overview");
  },
  
  getUserAnalytics: (period?: string) => {
    ensureAdminToken();
    return apiClient.request<any>(`/admin/analytics/users?period=${period || "30"}`);
  },
  
  getUsageAnalytics: (period?: string) => {
    ensureAdminToken();
    return apiClient.request<any>(`/admin/analytics/usage?period=${period || "30"}`);
  },

  // Models
  getModels: () => {
    ensureAdminToken();
    return apiClient.request<{ models: any[] }>("/admin/models");
  },
  
  getModel: (id: string) => {
    ensureAdminToken();
    return apiClient.request<{ model: any }>(`/admin/models/${id}`);
  },
  
  createModel: (data: any) => {
    ensureAdminToken();
    return apiClient.request<any>("/admin/models", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  
  updateModel: (id: string, data: any) => {
    ensureAdminToken();
    return apiClient.request<any>(`/admin/models/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  
  deleteModel: (id: string) => {
    ensureAdminToken();
    return apiClient.request<{ message: string }>(`/admin/models/${id}`, {
      method: "DELETE",
    });
  },

  // Content
  getScans: (params?: { page?: number; limit?: number }) => {
    ensureAdminToken();
    const query = new URLSearchParams();
    if (params?.page) query.append("page", params.page.toString());
    if (params?.limit) query.append("limit", params.limit.toString());
    return apiClient.request<any>(`/admin/content/scans?${query.toString()}`);
  },
  
  deleteScan: (id: string) => {
    ensureAdminToken();
    return apiClient.request<{ message: string }>(`/admin/content/scans/${id}`, {
      method: "DELETE",
    });
  },
  
  getDocumentation: (params?: { page?: number; limit?: number }) => {
    ensureAdminToken();
    const query = new URLSearchParams();
    if (params?.page) query.append("page", params.page.toString());
    if (params?.limit) query.append("limit", params.limit.toString());
    return apiClient.request<any>(`/admin/content/documentation?${query.toString()}`);
  },
  
  deleteDocumentation: (id: string) => {
    ensureAdminToken();
    return apiClient.request<{ message: string }>(`/admin/content/documentation/${id}`, {
      method: "DELETE",
    });
  },
  
  getConversations: (params?: { page?: number; limit?: number }) => {
    ensureAdminToken();
    const query = new URLSearchParams();
    if (params?.page) query.append("page", params.page.toString());
    if (params?.limit) query.append("limit", params.limit.toString());
    return apiClient.request<any>(`/admin/content/conversations?${query.toString()}`);
  },
  
  deleteConversation: (id: string) => {
    ensureAdminToken();
    return apiClient.request<{ message: string }>(`/admin/content/conversations/${id}`, {
      method: "DELETE",
    });
  },

  // System
  getSystemHealth: () => {
    ensureAdminToken();
    return apiClient.request<any>("/admin/system/health");
  },
  
  getSystemMetrics: () => {
    ensureAdminToken();
    return apiClient.request<any>("/admin/system/metrics");
  },

  // Settings
  getSettings: () => {
    ensureAdminToken();
    return apiClient.request<any>("/admin/settings");
  },

  updateSettings: (data: any) => {
    ensureAdminToken();
    return apiClient.request<any>("/admin/settings", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  updateSettingsCategory: (category: string, data: any) => {
    ensureAdminToken();
    return apiClient.request<any>(`/admin/settings/${category}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Pricing Plans
  getPricingPlans: () => {
    ensureAdminToken();
    return apiClient.request<any>("/admin/pricing");
  },

  getPricingPlan: (id: string) => {
    ensureAdminToken();
    return apiClient.request<any>(`/admin/pricing/${id}`);
  },

  createPricingPlan: (data: any) => {
    ensureAdminToken();
    return apiClient.request<any>("/admin/pricing", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updatePricingPlan: (id: string, data: any) => {
    ensureAdminToken();
    return apiClient.request<any>(`/admin/pricing/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deletePricingPlan: (id: string) => {
    ensureAdminToken();
    return apiClient.request<any>(`/admin/pricing/${id}`, {
      method: "DELETE",
    });
  },

  // Reports
  getRevenueReport: (startDate?: string, endDate?: string) => {
    ensureAdminToken();
    const query = new URLSearchParams();
    if (startDate) query.append("startDate", startDate);
    if (endDate) query.append("endDate", endDate);
    return apiClient.request<any>(`/admin/reports/revenue?${query.toString()}`);
  },
  
  getUserReport: (startDate?: string, endDate?: string) => {
    ensureAdminToken();
    const query = new URLSearchParams();
    if (startDate) query.append("startDate", startDate);
    if (endDate) query.append("endDate", endDate);
    return apiClient.request<any>(`/admin/reports/users?${query.toString()}`);
  },
  
  getUsageReport: (startDate?: string, endDate?: string) => {
    ensureAdminToken();
    const query = new URLSearchParams();
    if (startDate) query.append("startDate", startDate);
    if (endDate) query.append("endDate", endDate);
    return apiClient.request<any>(`/admin/reports/usage?${query.toString()}`);
  },

  // Logs
  getLogs: (params?: { page?: number; limit?: number; adminId?: string; action?: string; resource?: string; startDate?: string; endDate?: string }) => {
    ensureAdminToken();
    const query = new URLSearchParams();
    if (params?.page) query.append("page", params.page.toString());
    if (params?.limit) query.append("limit", params.limit.toString());
    if (params?.adminId) query.append("adminId", params.adminId);
    if (params?.action) query.append("action", params.action);
    if (params?.resource) query.append("resource", params.resource);
    if (params?.startDate) query.append("startDate", params.startDate);
    if (params?.endDate) query.append("endDate", params.endDate);
    return apiClient.request<any>(`/admin/logs?${query.toString()}`);
  },
};

export default adminApi;

