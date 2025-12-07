// API service layer for IntelliShieldX

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";

interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private adminToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    // Load token from localStorage
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("auth_token");
      this.adminToken = localStorage.getItem("admin_token");
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (token && typeof window !== "undefined") {
      localStorage.setItem("auth_token", token);
    } else if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
    }
  }

  setAdminToken(token: string | null) {
    this.adminToken = token;
    if (token && typeof window !== "undefined") {
      localStorage.setItem("admin_token", token);
    } else if (typeof window !== "undefined") {
      localStorage.removeItem("admin_token");
      this.adminToken = null; // Clear the token from memory too
    }
  }

  // Method to refresh tokens from localStorage
  refreshTokens() {
    if (typeof window !== "undefined") {
      // Always refresh from localStorage to get the latest token
      const adminToken = localStorage.getItem("admin_token");
      const userToken = localStorage.getItem("auth_token");
      this.adminToken = adminToken;
      this.token = userToken;
    }
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    // Always refresh tokens from localStorage before making requests
    // This ensures we have the latest token even if it was updated elsewhere
    this.refreshTokens();

    // Use admin token if available (for admin endpoints), otherwise use regular token
    if (this.adminToken) {
      headers["Authorization"] = `Bearer ${this.adminToken}`;
    } else if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }
    // Note: Some endpoints (like /models/available, /chat/guest/*) are designed to work without tokens

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // If we get a 401 and we have an admin token, log it for debugging
      if (response.status === 401 && this.adminToken && endpoint.startsWith("/admin/")) {
        console.warn("Admin API request returned 401. Token may be invalid or expired.");
        console.warn("Endpoint:", endpoint);
        console.warn("Token exists:", !!this.adminToken);
        console.warn("Token length:", this.adminToken?.length || 0);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}`;
        const error = new Error(errorMessage);
        
        // Attach status code to error for better handling
        (error as any).status = response.status;
        (error as any).response = response;
        
        throw error;
      }

      return await response.json();
    } catch (error: any) {
      // Don't log expected 404 errors (like documentation not found)
      const isExpected404 = (error.status === 404 && endpoint.includes("/documentation/")) ||
                           error.message?.includes("not found") || 
                           error.message?.includes("Not found");
      
      if (!isExpected404) {
        console.error(`API request failed: ${endpoint}`, error);
      }
      
      // Provide helpful error message for connection errors
      if (error instanceof TypeError && (error.message === "Failed to fetch" || error.message.includes("ERR_CONNECTION_REFUSED"))) {
        const connectionError = new Error(
          "Cannot connect to the backend server. Please ensure the server is running:\n\n" +
          "1. Open a terminal in the 'server' directory\n" +
          "2. Run: npm run dev\n" +
          "3. Wait for the server to start on http://localhost:3001"
        );
        connectionError.name = "ConnectionError";
        throw connectionError;
      }
      
      throw error;
    }
  }

  // Chat API
  async getConversations() {
    return this.request<any[]>("/chat/conversations");
  }

  async createConversation() {
    const response = await this.request<{ id: string }>("/chat/conversations", {
      method: "POST",
    });
    return response.id;
  }

  async getConversationMessages(conversationId: string) {
    return this.request<any[]>(`/chat/conversations/${conversationId}/messages`);
  }

  async updateConversationTitle(conversationId: string, title: string) {
    return this.request<{ message: string; title: string }>(`/chat/conversations/${conversationId}`, {
      method: "PUT",
      body: JSON.stringify({ title }),
    });
  }

  async deleteConversation(conversationId: string) {
    return this.request(`/chat/conversations/${conversationId}`, {
      method: "DELETE",
    });
  }

  // Guest Chat API (no authentication required)
  async getGuestRateLimit() {
    return this.request<{ remaining: number; limit: number }>("/chat/guest/rate-limit");
  }

  async sendGuestMessage(content: string, modelId: string, onChunk: (chunk: string) => void) {
    const url = `${this.baseUrl}/chat/guest/message`;
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ content, modelId }),
      });

      if (!response.ok) {
        // Check if it's a rate limit error
        if (response.status === 429) {
          const error = await response.json().catch(() => ({ error: response.statusText }));
          throw new Error(error.message || error.error || "Rate limit exceeded");
        }
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || error.message || `HTTP ${response.status}`);
      }

      // Handle SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") {
              return;
            }
            if (!data) continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                throw new Error(parsed.error);
              }
              if (parsed.content) {
                onChunk(parsed.content);
              }
            } catch (e) {
              if (e instanceof Error && e.message) {
                throw e;
              }
              // Ignore parse errors for non-JSON data
            }
          }
        }
      }
    } catch (error: any) {
      // Re-throw with better error message
      if (error.message) {
        throw error;
      }
      throw new Error("Failed to send message. Please check your connection and try again.");
    }
  }

  async sendMessage(
    conversationId: string,
    content: string,
    modelId: string,
    onChunk: (chunk: string) => void
  ) {
    const url = `${this.baseUrl}/chat/conversations/${conversationId}/messages`;
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ content, modelId }),
      });
    } catch (fetchError: any) {
      // Handle connection errors
      if (fetchError instanceof TypeError || fetchError.message?.includes("Failed to fetch")) {
        throw new Error(
          "Cannot connect to the backend server. Please ensure the server is running:\n\n" +
          "1. Open a terminal in the 'server' directory\n" +
          "2. Run: npm run dev\n" +
          "3. Wait for the server to start on http://localhost:3001"
        );
      }
      throw fetchError;
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || error.message || `HTTP ${response.status}`);
    }

    // Handle streaming response
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error("No response body");
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter((line) => line.trim());

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            return;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              onChunk(parsed.content);
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }
  }

  // Models API
  async getAvailableModels() {
    return this.request<any[]>("/models/available");
  }

  async getUserPlan() {
    return this.request<"free" | "standard" | "pro" | "enterprise">("/user/plan");
  }

  async getUserProfile() {
    return this.request<any>("/user/profile");
  }

  async updateProfile(data: { name?: string; phone?: string }) {
    return this.request<any>("/user/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async enableMFA(method: "email" | "sms" | "totp") {
    return this.request<any>("/user/mfa/enable", {
      method: "POST",
      body: JSON.stringify({ method }),
    });
  }

  async disableMFA() {
    return this.request<any>("/user/mfa/disable", {
      method: "POST",
    });
  }

  async setupEmailOTP() {
    return this.request<any>("/user/mfa/setup-email", {
      method: "POST",
    });
  }

  async setupSMSOTP(phoneNumber: string) {
    return this.request<any>("/user/mfa/setup-sms", {
      method: "POST",
      body: JSON.stringify({ phoneNumber }),
    });
  }

  async setupTOTP() {
    return this.request<{ secret: string; qrCode: string; backupCodes: string[] }>("/user/mfa/setup-totp", {
      method: "POST",
    });
  }

  async verifyTOTP(code: string) {
    return this.request<any>("/user/mfa/verify-totp", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  }

  // Scan API
  async uploadFiles(files: File[]) {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const url = `${this.baseUrl}/scan/upload`;
    const headers: HeadersInit = {};

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async scanUrl(url: string) {
    return this.request("/scan/url", {
      method: "POST",
      body: JSON.stringify({ url }),
    });
  }

  async getScanHistory(page: number = 1, limit: number = 20, search?: string, type?: string) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search) params.append("search", search);
    if (type) params.append("type", type);
    return this.request(`/scan?${params.toString()}`);
  }

  async getScanResults(scanId: string) {
    return this.request(`/scan/${scanId}`);
  }

  async deleteScan(scanId: string) {
    return this.request(`/scan/${scanId}`, { method: "DELETE" });
  }

  async getScanChatMessages(scanId: string) {
    return this.request(`/scan/${scanId}/chat`);
  }

  async addScanChatMessage(scanId: string, role: "user" | "assistant", content: string) {
    return this.request(`/scan/${scanId}/chat`, {
      method: "POST",
      body: JSON.stringify({ role, content }),
    });
  }

  async updateScanChatMessage(scanId: string, messageId: string, content: string) {
    return this.request(`/scan/${scanId}/chat/${messageId}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    });
  }

  async deleteScanChatMessages(scanId: string, messageIds?: string[]) {
    return this.request(`/scan/${scanId}/chat`, {
      method: "DELETE",
      body: JSON.stringify({ messageIds }),
    });
  }

  // Documentation API
  async generateDocumentation(repositoryId: string) {
    return this.request(`/documentation/${repositoryId}/generate`, {
      method: "POST",
    });
  }

  async getDocumentation(repositoryId: string) {
    return this.request(`/documentation/${repositoryId}`);
  }

  async getDocumentationChatMessages(repositoryId: string) {
    return this.request(`/documentation/${repositoryId}/chat`);
  }

  async addDocumentationChatMessage(repositoryId: string, role: "user" | "assistant", content: string) {
    return this.request(`/documentation/${repositoryId}/chat`, {
      method: "POST",
      body: JSON.stringify({ role, content }),
    });
  }

  async sendDocumentationChatMessage(
    repositoryId: string,
    message: string,
    onChunk: (chunk: string) => void
  ) {
    const url = `${this.baseUrl}/documentation/${repositoryId}/chat/stream`;
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || error.message || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                onChunk(parsed.content);
              } else if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error: any) {
      console.error(`Documentation chat error:`, error);
      throw error;
    }
  }

  // Auth API
  async login(email: string, password: string) {
    const response = await this.request<{ 
      token?: string; 
      user?: any;
      requiresMFA?: boolean;
      mfaMethod?: string;
      mfaToken?: string;
      message?: string;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (response.token) {
      this.setToken(response.token);
    }
    return response;
  }

  async verifyMFA(mfaToken: string, code: string) {
    const response = await this.request<{ token: string; user: any }>("/auth/login/verify-mfa", {
      method: "POST",
      body: JSON.stringify({ mfaToken, code }),
    });
    if (response.token) {
      this.setToken(response.token);
    }
    return response;
  }

  async register(email: string, password: string, name: string) {
    const response = await this.request<{ token: string; user: any }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
    if (response.token) {
      this.setToken(response.token);
    }
    return response;
  }

  async logout() {
    this.setToken(null);
  }

  // OAuth authentication
  async oauthLogin(provider: string) {
    // Redirect to OAuth provider
    const redirectUrl = `${this.baseUrl}/auth/oauth/${provider}`;
    window.location.href = redirectUrl;
  }

  // Get available OAuth providers
  async getOAuthProviders() {
    const baseUrl = this.baseUrl;
    const token = this.token;
    
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${baseUrl}/auth/oauth/providers`, {
      method: "GET",
      headers,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || error.message || `HTTP ${response.status}`);
    }
    
    return response.json();
  }

  async oauthCallback(provider: string, code: string) {
    const response = await this.request<{ token: string; user: any }>(
      `/auth/oauth/${provider}/callback`,
      {
        method: "POST",
        body: JSON.stringify({ code }),
      }
    );
    if (response.token) {
      this.setToken(response.token);
    }
    return response;
  }

  // Password Reset
  async requestPasswordResetOTP(email: string) {
    return this.request<any>("/auth/forgot-password/otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async verifyPasswordResetOTP(email: string, otp: string) {
    return this.request<{ token: string }>("/auth/forgot-password/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    });
  }

  async requestPasswordResetLink(email: string) {
    return this.request<any>("/auth/forgot-password/link", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async validateResetToken(token: string) {
    return this.request<{ valid: boolean; email: string }>("/auth/forgot-password/validate-token", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  }

  async resetPasswordWithToken(token: string, password: string) {
    return this.request<any>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
  }

  async resetPasswordWithOTP(email: string, otp: string, password: string) {
    return this.request<any>("/auth/reset-password/otp", {
      method: "POST",
      body: JSON.stringify({ email, otp, password }),
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

// Convenience exports
export const chatApi = {
  getConversations: () => apiClient.getConversations(),
  createConversation: () => apiClient.createConversation(),
  getConversationMessages: (id: string) => apiClient.getConversationMessages(id),
  updateConversationTitle: (id: string, title: string) => apiClient.updateConversationTitle(id, title),
  deleteConversation: (id: string) => apiClient.deleteConversation(id),
  sendMessage: (conversationId: string, content: string, modelId: string, onChunk: (chunk: string) => void) =>
    apiClient.sendMessage(conversationId, content, modelId, onChunk),
  getGuestRateLimit: () => apiClient.getGuestRateLimit(),
  sendGuestMessage: (content: string, modelId: string, onChunk: (chunk: string) => void) =>
    apiClient.sendGuestMessage(content, modelId, onChunk),
};

export const modelsApi = {
  getAvailableModels: () => apiClient.getAvailableModels(),
};

export const scanApi = {
  uploadFiles: (files: File[]) => apiClient.uploadFiles(files),
  scanUrl: (url: string) => apiClient.scanUrl(url),
  getScanHistory: (page?: number, limit?: number, search?: string, type?: string) =>
    apiClient.getScanHistory(page, limit, search, type),
  getScanResults: (scanId: string) => apiClient.getScanResults(scanId),
  deleteScan: (scanId: string) => apiClient.deleteScan(scanId),
  getScanChatMessages: (scanId: string) => apiClient.getScanChatMessages(scanId),
  addScanChatMessage: (scanId: string, role: "user" | "assistant", content: string) =>
    apiClient.addScanChatMessage(scanId, role, content),
  updateScanChatMessage: (scanId: string, messageId: string, content: string) =>
    apiClient.updateScanChatMessage(scanId, messageId, content),
  deleteScanChatMessages: (scanId: string, messageIds?: string[]) =>
    apiClient.deleteScanChatMessages(scanId, messageIds),
};

export const repositoryApi = {
  connectGitHubAccount: (data: {
    accessToken: string;
    providerAccountId: string;
    providerUsername: string;
    providerEmail?: string;
    providerAvatar?: string;
  }) => apiClient.request("/repositories/connect/github", { method: "POST", body: JSON.stringify(data) }),
  disconnectGitHubAccount: () => apiClient.request("/repositories/connect/github", { method: "DELETE" }),
  getConnectedAccounts: () => apiClient.request("/repositories/accounts"),
  getGitHubRepositories: () => apiClient.request("/repositories/github/repositories"),
  connectRepository: (data: {
    provider: string;
    repositoryId: string;
    name: string;
    fullName: string;
    description?: string;
    url: string;
    private: boolean;
    defaultBranch?: string;
    language?: string;
  }) => apiClient.request("/repositories/connect", { method: "POST", body: JSON.stringify(data) }),
  getRepositories: () => apiClient.request("/repositories"),
  deleteRepository: (id: string) => apiClient.request(`/repositories/${id}`, { method: "DELETE" }),
  syncRepository: (id: string) => apiClient.request(`/repositories/${id}/sync`, { method: "POST" }),
  scanRepository: (id: string) => apiClient.request(`/repositories/${id}/scan`, { method: "POST" }),
};

export const documentationApi = {
  generateDocumentation: (repositoryId: string) => apiClient.generateDocumentation(repositoryId),
  getDocumentation: (repositoryId: string) => apiClient.getDocumentation(repositoryId),
  getDocumentationChatMessages: (repositoryId: string) => apiClient.getDocumentationChatMessages(repositoryId),
  addDocumentationChatMessage: (repositoryId: string, role: "user" | "assistant", content: string) =>
    apiClient.addDocumentationChatMessage(repositoryId, role, content),
  sendDocumentationChatMessage: (repositoryId: string, message: string, onChunk: (chunk: string) => void) =>
    apiClient.sendDocumentationChatMessage(repositoryId, message, onChunk),
};

export const paymentApi = {
  createOrder: (plan: string) => apiClient.request("/payments/create-order", {
    method: "POST",
    body: JSON.stringify({ plan }),
  }),
  verifyPayment: (orderId: string, paymentId: string, signature: string, plan: string) =>
    apiClient.request("/payments/verify-payment", {
      method: "POST",
      body: JSON.stringify({ orderId, paymentId, signature, plan }),
    }),
  getSubscription: () => apiClient.request("/payments/subscription"),
  cancelSubscription: (reason?: string) => apiClient.request("/payments/cancel-subscription", {
    method: "POST",
    body: JSON.stringify({ reason }),
  }),
  getPurchaseHistory: () => apiClient.request("/payments/purchase-history"),
};

// Dashboard API - accessible without authentication
export const dashboardApi = {
  getStats: async () => {
    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${baseUrl}/dashboard/stats`, {
      method: "GET",
      headers,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || error.message || `HTTP ${response.status}`);
    }
    
    return response.json();
  },
};

export const authApi = {
  login: (email: string, password: string) => apiClient.login(email, password),
  verifyMFA: (mfaToken: string, code: string) => apiClient.verifyMFA(mfaToken, code),
  register: (email: string, password: string, name: string) => apiClient.register(email, password, name),
  logout: () => apiClient.logout(),
  oauthLogin: (provider: string) => apiClient.oauthLogin(provider),
  oauthCallback: (provider: string, code: string) => apiClient.oauthCallback(provider, code),
  getOAuthProviders: () => apiClient.getOAuthProviders(),
  requestPasswordResetOTP: (email: string) => apiClient.requestPasswordResetOTP(email),
  verifyPasswordResetOTP: (email: string, otp: string) => apiClient.verifyPasswordResetOTP(email, otp),
  requestPasswordResetLink: (email: string) => apiClient.requestPasswordResetLink(email),
  validateResetToken: (token: string) => apiClient.validateResetToken(token),
  resetPasswordWithToken: (token: string, password: string) => apiClient.resetPasswordWithToken(token, password),
  resetPasswordWithOTP: (email: string, otp: string, password: string) => apiClient.resetPasswordWithOTP(email, otp, password),
};

export const userApi = {
  getPlan: () => apiClient.getUserPlan(),
  getProfile: () => apiClient.getUserProfile(),
  updateProfile: (data: { name?: string; phone?: string }) => apiClient.updateProfile(data),
  changePassword: (data: { currentPassword: string; newPassword: string }) => apiClient.request<{ message: string }>("/user/change-password", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  enableMFA: (method: "email" | "sms" | "totp") => apiClient.enableMFA(method),
  disableMFA: () => apiClient.disableMFA(),
  setupEmailOTP: () => apiClient.setupEmailOTP(),
  setupSMSOTP: (phoneNumber: string) => apiClient.setupSMSOTP(phoneNumber),
  setupTOTP: () => apiClient.setupTOTP(),
  verifyTOTP: (code: string) => apiClient.verifyTOTP(code),
};

