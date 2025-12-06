import express from "express";
import jwt from "jsonwebtoken";
import axios from "axios";
import User from "../models/User.js";
import { authenticate } from "../middleware/auth.js";
import { getOAuthClient, getRedirectUri, getOAuthScope } from "../config/oauth.js";
import {
  handleGoogleOAuth,
  handleMicrosoftOAuth,
  handleZohoOAuth,
  handleGitHubOAuth,
} from "../services/oauthService.js";
import {
  requestPasswordResetOTP,
  verifyPasswordResetOTP,
  requestPasswordResetLink,
  validateResetToken,
  resetPasswordWithToken,
  resetPasswordWithOTP,
} from "../services/passwordResetService.js";
import { sendWelcomeEmail } from "../services/emailService.js";
import { sendPasswordResetEmail } from "../services/emailService.js";

const router = express.Router();
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

// Register
router.post("/register", async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: "Email, password, and name are required" });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Create user
    const user = new User({ email, password, name });
    await user.save();

    // Send welcome email
    try {
      await sendWelcomeEmail(email, name);
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
      // Don't fail registration if email fails
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id, email: user.email, plan: user.plan },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        plan: user.plan,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check password
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id, email: user.email, plan: user.plan },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        plan: user.plan,
      },
    });
  } catch (error) {
    next(error);
  }
});

// OAuth Routes
const supportedProviders = ["google", "microsoft", "zoho", "github"];

// Helper function to check if OAuth provider is configured
const isProviderConfigured = (provider) => {
  try {
    // Read directly from environment variables to ensure we get the latest values
    const envKey = provider.toUpperCase();
    const clientId = process.env[`${envKey}_CLIENT_ID`];
    const clientSecret = process.env[`${envKey}_CLIENT_SECRET`];
    
    // Check if values exist and are not placeholder/empty
    const hasValidId = clientId && 
                       clientId.trim() !== "" && 
                       clientId !== `your-${provider}-client-id` &&
                       !clientId.toLowerCase().includes("your-") &&
                       clientId.length > 10; // Basic validation - real client IDs are longer
    
    const hasValidSecret = clientSecret && 
                           clientSecret.trim() !== "" && 
                           clientSecret !== `your-${provider}-client-secret` &&
                           !clientSecret.toLowerCase().includes("your-") &&
                           clientSecret.length > 10; // Basic validation - real secrets are longer
    
    return hasValidId && hasValidSecret;
  } catch (error) {
    return false;
  }
};

// Get available OAuth providers
router.get("/oauth/providers", (req, res) => {
  try {
    const availableProviders = supportedProviders.map((provider) => ({
      id: provider,
      name: provider.charAt(0).toUpperCase() + provider.slice(1),
      configured: isProviderConfigured(provider),
    }));

    res.json(availableProviders);
  } catch (error) {
    res.status(500).json({ error: "Failed to check OAuth providers" });
  }
});

// Initiate OAuth flow - redirect to provider
router.get("/oauth/:provider", async (req, res, next) => {
  try {
    const { provider } = req.params;

    if (!supportedProviders.includes(provider)) {
      return res.status(400).json({ error: "Unsupported OAuth provider" });
    }

    // Check if provider is configured
    if (!isProviderConfigured(provider)) {
      return res.status(503).json({ 
        error: "OAuth provider not configured",
        message: `${provider} OAuth is currently not available. Please contact support or use email/password authentication.`
      });
    }

    const client = getOAuthClient(provider);
    const redirectUri = getRedirectUri(provider);
    const scope = getOAuthScope(provider);
    
    // Debug logging (remove in production)
    console.log(`🔐 OAuth ${provider} - Redirect URI: ${redirectUri}`);
    console.log(`🔐 OAuth ${provider} - Scope: ${scope}`);
    console.log(`🔐 OAuth ${provider} - Client ID: ${process.env[`${provider.toUpperCase()}_CLIENT_ID`] ? "Set" : "NOT SET"}`);
    
    const authorizationUri = client.authorizeURL({
      redirect_uri: redirectUri,
      scope: scope,
      state: Buffer.from(JSON.stringify({ provider })).toString("base64"), // Store provider in state
    });

    res.redirect(authorizationUri);
  } catch (error) {
    // Check if it's a configuration error
    if (error.message && error.message.includes("client")) {
      return res.status(503).json({
        error: "OAuth provider not configured",
        message: `${req.params.provider} OAuth is currently not available. Please contact support or use email/password authentication.`
      });
    }
    next(error);
  }
});

// OAuth for connecting account (not login) - redirect to provider - requires authentication
router.get("/connect/:provider", async (req, res, next) => {
  try {
    // For OAuth connection flows via redirect, token may be in query parameter
    // Check both Authorization header and query parameter
    let token = null;
    let decoded = null;

    // Try Authorization header first (for API calls)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.query.token) {
      // Try query parameter (for browser redirects)
      token = req.query.token;
    }

    const { provider } = req.params;
    const { redirect } = req.query; // Frontend redirect URL after connection
    const redirectUrl = redirect ? decodeURIComponent(redirect) : `${FRONTEND_URL}/profile`;

    if (!token) {
      console.error("No token found in request. Headers:", Object.keys(req.headers), "Query:", Object.keys(req.query));
      // Redirect to frontend with error instead of returning JSON (since this is a browser redirect)
      return res.redirect(`${redirectUrl}?error=${encodeURIComponent("Authentication required. Please ensure you are logged in.")}`);
    }

    // Verify token
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
      req.user = decoded;
    } catch (error) {
      // Redirect to frontend with error instead of returning JSON
      return res.redirect(`${redirectUrl}?error=${encodeURIComponent("Invalid or expired token. Please log in again.")}`);
    }

    if (!supportedProviders.includes(provider)) {
      return res.redirect(`${redirectUrl}?error=${encodeURIComponent("Unsupported OAuth provider")}`);
    }

    // Check if provider is configured
    if (!isProviderConfigured(provider)) {
      return res.redirect(`${redirectUrl}?error=${encodeURIComponent(`${provider} OAuth is currently not available. Please contact support.`)}`);
    }

    // Check if this provider is already connected
    const OAuthAccount = (await import("../models/OAuthAccount.js")).default;
    const existingAccount = await OAuthAccount.findOne({
      userId: req.user.userId,
      provider: provider,
      isActive: true,
    });

    if (existingAccount) {
      // Redirect to frontend with info message instead of error
      return res.redirect(`${redirectUrl}?info=${encodeURIComponent(`You have already connected your ${provider} account.`)}`);
    }

    const client = getOAuthClient(provider);
    // Use unified callback URI (same as login) - GitHub only allows one callback URL
    const unifiedCallbackUri = getRedirectUri(provider);
    // Store token in state so it's available in callback
    const authToken = req.query.token || req.headers.authorization?.split(" ")[1];
    const authorizationUri = client.authorizeURL({
      redirect_uri: unifiedCallbackUri,
      scope: getOAuthScope(provider),
      state: Buffer.from(JSON.stringify({ 
        flow: "connect", // Indicate this is a connection flow, not login
        redirect: redirect,
        userId: req.user.userId.toString(),
        token: authToken // Store token in state for callback
      })).toString("base64"),
    });

    res.redirect(authorizationUri);
  } catch (error) {
    next(error);
  }
});

// OAuth callback for account connection (not login) - requires authentication
router.get("/connect/:provider/callback", async (req, res, next) => {
  try {
    const { provider } = req.params;
    const { code, error, state } = req.query;

    // Parse state to get redirect URL, userId, and token
    let stateData = {};
    if (state) {
      try {
        stateData = JSON.parse(Buffer.from(state, "base64").toString());
      } catch (e) {
        // Fallback for old state format
        stateData.redirect = Buffer.from(state, "base64").toString();
      }
    }
    const finalRedirectUrl = stateData.redirect || `${FRONTEND_URL}/profile`;

    if (error) {
      return res.redirect(`${finalRedirectUrl}?error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      return res.redirect(`${finalRedirectUrl}?error=no_code`);
    }

    // Verify token from state (stored during initial redirect)
    if (!stateData.token) {
      return res.redirect(`${finalRedirectUrl}?error=${encodeURIComponent("Authentication required")}`);
    }

    try {
      const decoded = jwt.verify(stateData.token, process.env.JWT_SECRET || "your-secret-key");
      req.user = decoded;
    } catch (error) {
      return res.redirect(`${finalRedirectUrl}?error=${encodeURIComponent("Invalid or expired token")}`);
    }

    const client = getOAuthClient(provider);
    // Use connection callback URI
    const connectRedirectUri = `${BACKEND_URL}/api/auth/connect/${provider}/callback`;
    const tokenParams = {
      code,
      redirect_uri: connectRedirectUri,
    };

    const accessToken = await client.getToken(tokenParams);
    const token = accessToken.token.access_token;

    // Get user profile from provider
    let profile;
    try {
      if (provider === "github") {
        const response = await axios.get("https://api.github.com/user", {
          headers: { Authorization: `Bearer ${token}` },
        });
        let email = response.data.email;
        if (!email) {
          const emailResponse = await axios.get("https://api.github.com/user/emails", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const primaryEmail = emailResponse.data.find((e) => e.primary);
          email = primaryEmail?.email || emailResponse.data[0]?.email;
        }
        profile = {
          id: response.data.id.toString(),
          email: email,
          name: response.data.name || response.data.login,
          avatar: response.data.avatar_url,
        };
      } else if (provider === "google") {
        const response = await axios.get("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${token}` },
        });
        profile = {
          id: response.data.id,
          email: response.data.email,
          name: response.data.name,
          avatar: response.data.picture,
        };
      } else if (provider === "microsoft") {
        const response = await axios.get("https://graph.microsoft.com/v1.0/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        profile = {
          id: response.data.id,
          email: response.data.mail || response.data.userPrincipalName,
          name: response.data.displayName,
          avatar: null,
        };
      } else if (provider === "zoho") {
        const response = await axios.get("https://accounts.zoho.com/oauth/user/info", {
          headers: { Authorization: `Bearer ${token}` },
        });
        profile = {
          id: response.data.ZUID || response.data.id,
          email: response.data.Email,
          name: response.data.Display_Name || response.data.Full_Name,
          avatar: response.data.Photo || null,
        };
      } else {
        throw new Error("Unsupported provider for account linking");
      }
    } catch (error) {
      console.error(`Error fetching ${provider} profile:`, error);
      throw new Error(`Failed to fetch ${provider} profile`);
    }

    // Get current user
    const user = await User.findById(req.user.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if this provider is already connected
    const OAuthAccount = (await import("../models/OAuthAccount.js")).default;
    const existingOAuthAccount = await OAuthAccount.findOne({
      userId: user._id,
      provider: provider,
    });

    if (existingOAuthAccount) {
      // Update existing OAuth account
      existingOAuthAccount.providerAccountId = profile.id.toString();
      existingOAuthAccount.providerEmail = profile.email;
      existingOAuthAccount.providerName = profile.name;
      existingOAuthAccount.providerAvatar = profile.avatar;
      existingOAuthAccount.accessToken = token;
      existingOAuthAccount.lastUsedAt = new Date();
      existingOAuthAccount.isActive = true;
      await existingOAuthAccount.save();
    } else {
      // Create new OAuth account link
      const isFirstOAuthAccount = (await OAuthAccount.countDocuments({ userId: user._id })) === 0;
      const oauthAccount = new OAuthAccount({
        userId: user._id,
        provider: provider,
        providerAccountId: profile.id.toString(),
        providerEmail: profile.email,
        providerName: profile.name,
        providerAvatar: profile.avatar,
        accessToken: token,
        isPrimary: isFirstOAuthAccount,
        isActive: true,
        lastUsedAt: new Date(),
      });
      await oauthAccount.save();
    }

    // Update user avatar if not set
    if (profile.avatar && !user.avatar) {
      user.avatar = profile.avatar;
      await user.save();
    }

    res.redirect(`${finalRedirectUrl}?connected=${provider}&success=true`);
  } catch (error) {
    console.error("OAuth connection callback error:", error);
    const errorRedirectUrl = `${FRONTEND_URL}/profile?error=${encodeURIComponent(error.message || "connection_failed")}`;
    res.redirect(errorRedirectUrl);
  }
});

// OAuth callback - handle provider response
router.get("/oauth/:provider/callback", async (req, res, next) => {
  try {
    const { provider } = req.params;
    const { code, error } = req.query;

    if (error) {
      return res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      return res.redirect(`${FRONTEND_URL}/login?error=no_code`);
    }

    if (!supportedProviders.includes(provider)) {
      return res.redirect(`${FRONTEND_URL}/login?error=unsupported_provider`);
    }

    const client = getOAuthClient(provider);
    const tokenParams = {
      code,
      redirect_uri: getRedirectUri(provider),
    };

    // Exchange code for access token
    const accessToken = await client.getToken(tokenParams);
    const token = accessToken.token.access_token;

    // Get user profile from provider
    let result;
    switch (provider) {
      case "google":
        result = await handleGoogleOAuth(token);
        break;
      case "microsoft":
        result = await handleMicrosoftOAuth(token);
        break;
      case "zoho":
        result = await handleZohoOAuth(token);
        break;
      case "github":
        result = await handleGitHubOAuth(token);
        break;
      default:
        throw new Error("Unsupported provider");
    }

    // Redirect to frontend with token
    const redirectUrl = new URL(`${FRONTEND_URL}/auth/callback`);
    redirectUrl.searchParams.set("token", result.token);
    redirectUrl.searchParams.set("user", JSON.stringify({
      id: result.user._id,
      email: result.user.email,
      name: result.user.name,
      plan: result.user.plan,
    }));

    res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error("OAuth callback error:", error);
    res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent(error.message || "oauth_failed")}`);
  }
});

// Alternative callback endpoint for POST requests (if needed)
router.post("/oauth/:provider/callback", async (req, res, next) => {
  try {
    const { provider } = req.params;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Authorization code is required" });
    }

    if (!supportedProviders.includes(provider)) {
      return res.status(400).json({ error: "Unsupported OAuth provider" });
    }

    const client = getOAuthClient(provider);
    const tokenParams = {
      code,
      redirect_uri: getRedirectUri(provider),
    };

    const accessToken = await client.getToken(tokenParams);
    const token = accessToken.token.access_token;

    let result;
    switch (provider) {
      case "google":
        result = await handleGoogleOAuth(token);
        break;
      case "microsoft":
        result = await handleMicrosoftOAuth(token);
        break;
      case "zoho":
        result = await handleZohoOAuth(token);
        break;
      case "github":
        result = await handleGitHubOAuth(token);
        break;
      default:
        throw new Error("Unsupported provider");
    }

    res.json({
      token: result.token,
      user: {
        id: result.user._id,
        email: result.user.email,
        name: result.user.name,
        plan: result.user.plan,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

