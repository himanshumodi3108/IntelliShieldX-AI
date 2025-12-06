import { AuthorizationCode } from "simple-oauth2";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

export const oauthConfigs = {
  google: {
    client: {
      id: process.env.GOOGLE_CLIENT_ID,
      secret: process.env.GOOGLE_CLIENT_SECRET,
    },
    auth: {
      tokenHost: "https://accounts.google.com",
      tokenPath: "/o/oauth2/token",
      authorizePath: "/o/oauth2/v2/auth",
    },
    redirectUri: `${BACKEND_URL}/api/auth/oauth/google/callback`,
    scope: "openid email profile",
  },
  microsoft: {
    client: {
      id: process.env.MICROSOFT_CLIENT_ID,
      secret: process.env.MICROSOFT_CLIENT_SECRET,
    },
    auth: {
      tokenHost: "https://login.microsoftonline.com",
      tokenPath: "/common/oauth2/v2.0/token",
      authorizePath: "/common/oauth2/v2.0/authorize",
    },
    redirectUri: `${BACKEND_URL}/api/auth/oauth/microsoft/callback`,
    scope: "openid email profile",
  },
  zoho: {
    client: {
      id: process.env.ZOHO_CLIENT_ID,
      secret: process.env.ZOHO_CLIENT_SECRET,
    },
    auth: {
      tokenHost: "https://accounts.zoho.com",
      tokenPath: "/oauth/v2/token",
      authorizePath: "/oauth/v2/auth",
    },
    redirectUri: `${BACKEND_URL}/api/auth/oauth/zoho/callback`,
    scope: "ZohoMail.accounts.READ AaaServer.profile.READ",
  },
  github: {
    client: {
      id: process.env.GITHUB_CLIENT_ID,
      secret: process.env.GITHUB_CLIENT_SECRET,
    },
    auth: {
      tokenHost: "https://github.com",
      tokenPath: "/login/oauth/access_token",
      authorizePath: "/login/oauth/authorize",
    },
    // Use unified callback for both login and account connection
    redirectUri: `${BACKEND_URL}/api/auth/oauth/github/callback`,
    scope: "user:email repo", // Added 'repo' scope for repository access
  },
};

export const getOAuthClient = (provider) => {
  const config = oauthConfigs[provider];
  if (!config) {
    throw new Error(`Unsupported OAuth provider: ${provider}`);
  }
  
  // Read directly from environment variables to ensure we get the latest values
  const envKey = provider.toUpperCase();
  const clientId = process.env[`${envKey}_CLIENT_ID`] || config.client.id;
  const clientSecret = process.env[`${envKey}_CLIENT_SECRET`] || config.client.secret;
  
  // Validate that client ID and secret are set
  if (!clientId || !clientSecret || clientId.trim() === "" || clientSecret.trim() === "") {
    console.error(`❌ OAuth ${provider} configuration error:`);
    console.error(`   ${envKey}_CLIENT_ID: ${clientId ? "Set" : "NOT SET"}`);
    console.error(`   ${envKey}_CLIENT_SECRET: ${clientSecret ? "Set" : "NOT SET"}`);
    throw new Error(
      `OAuth ${provider} is not configured. Please set ${envKey}_CLIENT_ID and ${envKey}_CLIENT_SECRET in your .env file.`
    );
  }
  
  // Create config with actual values from env
  const oauthConfig = {
    client: {
      id: clientId,
      secret: clientSecret,
    },
    auth: config.auth,
  };
  
  return new AuthorizationCode(oauthConfig);
};

export const getOAuthScope = (provider) => {
  return oauthConfigs[provider]?.scope || "";
};

export const getRedirectUri = (provider) => {
  return oauthConfigs[provider]?.redirectUri;
};

