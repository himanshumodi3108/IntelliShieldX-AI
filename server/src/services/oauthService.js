import axios from "axios";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import OAuthAccount from "../models/OAuthAccount.js";

/**
 * Get JWT secret dynamically (read from env each time to ensure it's loaded)
 */
const getJWTSecret = () => {
  return process.env.JWT_SECRET || "your-secret-key";
};

/**
 * Generate JWT token for user
 */
export const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id, email: user.email, plan: user.plan },
    getJWTSecret(),
    { expiresIn: "7d" }
  );
};

/**
 * Find or create user from OAuth profile
 * Supports multiple OAuth providers per user
 */
export const findOrCreateOAuthUser = async (provider, profile, accessToken = null, isLinking = false) => {
  try {
    // Try to find existing OAuth account
    let oauthAccount = await OAuthAccount.findOne({
      provider: provider,
      providerAccountId: profile.id.toString(),
    });

    let user;

    if (oauthAccount) {
      // OAuth account exists, get the user
      user = await User.findById(oauthAccount.userId);
      if (!user) {
        throw new Error("OAuth account found but user not found");
      }

      // Update OAuth account info
      oauthAccount.providerEmail = profile.email || oauthAccount.providerEmail;
      oauthAccount.providerName = profile.name || oauthAccount.providerName;
      oauthAccount.providerAvatar = profile.avatar || oauthAccount.providerAvatar;
      oauthAccount.accessToken = accessToken || oauthAccount.accessToken;
      oauthAccount.lastUsedAt = new Date();
      oauthAccount.isActive = true;
      await oauthAccount.save();

      // Update user info if needed
      if (profile.email && user.email !== profile.email) {
        user.email = profile.email;
      }
      if (profile.name && user.name !== profile.name) {
        user.name = profile.name;
      }
      if (profile.avatar && user.avatar !== profile.avatar) {
        user.avatar = profile.avatar;
      }
      await user.save();
      return { user, oauthAccount, isNew: false };
    }

    // Try to find user by email (account linking)
    if (profile.email) {
      user = await User.findOne({ email: profile.email.toLowerCase() });
      if (user) {
        // Check if this provider is already linked
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
          existingOAuthAccount.accessToken = accessToken;
          existingOAuthAccount.lastUsedAt = new Date();
          existingOAuthAccount.isActive = true;
          await existingOAuthAccount.save();
          return { user, oauthAccount: existingOAuthAccount, isNew: false };
        }

        // Link new OAuth account to existing user
        const isFirstOAuthAccount = (await OAuthAccount.countDocuments({ userId: user._id })) === 0;
        oauthAccount = new OAuthAccount({
          userId: user._id,
          provider: provider,
          providerAccountId: profile.id.toString(),
          providerEmail: profile.email,
          providerName: profile.name,
          providerAvatar: profile.avatar,
          accessToken: accessToken,
          isPrimary: isFirstOAuthAccount, // First OAuth account becomes primary
          isActive: true,
          lastUsedAt: new Date(),
        });
        await oauthAccount.save();

        // Update user avatar if not set
        if (profile.avatar && !user.avatar) {
          user.avatar = profile.avatar;
          await user.save();
        }

        // Migrate legacy oauthProvider/oauthId if present
        if (user.oauthProvider && !isFirstOAuthAccount) {
          // Legacy field exists, but we now have OAuthAccount, so clear it
          user.oauthProvider = null;
          user.oauthId = null;
          await user.save();
        }

        return { user, oauthAccount, isNew: false, isLinking: true };
      }
    }

    // Create new user with OAuth account
    user = new User({
      email: profile.email.toLowerCase(),
      name: profile.name || profile.displayName || "User",
      avatar: profile.avatar || profile.photos?.[0]?.value || null,
      password: null, // No password for OAuth users
      // Don't set legacy oauthProvider/oauthId - use OAuthAccount instead
    });

    await user.save();

    // Create OAuth account (first one is primary)
    oauthAccount = new OAuthAccount({
      userId: user._id,
      provider: provider,
      providerAccountId: profile.id.toString(),
      providerEmail: profile.email,
      providerName: profile.name,
      providerAvatar: profile.avatar,
      accessToken: accessToken,
      isPrimary: true, // First OAuth account is primary
      isActive: true,
      lastUsedAt: new Date(),
    });
    await oauthAccount.save();

    return { user, oauthAccount, isNew: true };
  } catch (error) {
    console.error("Error in findOrCreateOAuthUser:", error);
    throw error;
  }
};

/**
 * Google OAuth handler
 */
export const handleGoogleOAuth = async (accessToken) => {
  try {
    const response = await axios.get(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const profile = {
      id: response.data.id,
      email: response.data.email,
      name: response.data.name,
      avatar: response.data.picture,
    };

    const { user, oauthAccount } = await findOrCreateOAuthUser("google", profile, accessToken);
    return { user, token: generateToken(user), oauthAccount };
  } catch (error) {
    console.error("Google OAuth error:", error);
    throw new Error("Failed to authenticate with Google");
  }
};

/**
 * Microsoft OAuth handler
 */
export const handleMicrosoftOAuth = async (accessToken) => {
  try {
    const response = await axios.get(
      "https://graph.microsoft.com/v1.0/me",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const profile = {
      id: response.data.id,
      email: response.data.mail || response.data.userPrincipalName,
      name: response.data.displayName,
      avatar: null, // Microsoft Graph doesn't provide avatar in basic profile
    };

    const { user, oauthAccount } = await findOrCreateOAuthUser("microsoft", profile, accessToken);
    return { user, token: generateToken(user), oauthAccount };
  } catch (error) {
    console.error("Microsoft OAuth error:", error);
    throw new Error("Failed to authenticate with Microsoft");
  }
};

/**
 * Zoho OAuth handler
 */
export const handleZohoOAuth = async (accessToken) => {
  try {
    // Zoho uses different endpoints for different services
    // For Zoho Mail, we'll use the accounts API
    const response = await axios.get(
      "https://mail.zoho.com/api/accounts",
      {
        headers: { 
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          "Content-Type": "application/json"
        },
      }
    );

    // If that fails, try the user info endpoint
    let profile;
    if (response.data && response.data.data && response.data.data.length > 0) {
      const account = response.data.data[0];
      profile = {
        id: account.accountId || account.ZUID,
        email: account.accountName || account.emailAddress,
        name: account.displayName || account.accountName,
        avatar: null,
      };
    } else {
      // Fallback to user info endpoint
      const userInfoResponse = await axios.get(
        "https://accounts.zoho.com/oauth/user/info",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      profile = {
        id: userInfoResponse.data.ZUID || userInfoResponse.data.id,
        email: userInfoResponse.data.Email,
        name: userInfoResponse.data.Display_Name || userInfoResponse.data.Full_Name,
        avatar: userInfoResponse.data.Photo || null,
      };
    }

    const { user, oauthAccount } = await findOrCreateOAuthUser("zoho", profile, accessToken);
    return { user, token: generateToken(user), oauthAccount };
  } catch (error) {
    console.error("Zoho OAuth error:", error);
    // If Zoho Mail API fails, try accounts.zoho.com
    try {
      const fallbackResponse = await axios.get(
        "https://accounts.zoho.com/oauth/user/info",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const profile = {
        id: fallbackResponse.data.ZUID || fallbackResponse.data.id,
        email: fallbackResponse.data.Email,
        name: fallbackResponse.data.Display_Name || fallbackResponse.data.Full_Name,
        avatar: fallbackResponse.data.Photo || null,
      };
      const { user, oauthAccount } = await findOrCreateOAuthUser("zoho", profile, accessToken);
      return { user, token: generateToken(user), oauthAccount };
    } catch (fallbackError) {
      throw new Error("Failed to authenticate with Zoho");
    }
  }
};

/**
 * GitHub OAuth handler
 */
export const handleGitHubOAuth = async (accessToken) => {
  try {
    const response = await axios.get("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // Get email if not in public profile
    let email = response.data.email;
    if (!email) {
      const emailResponse = await axios.get(
        "https://api.github.com/user/emails",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const primaryEmail = emailResponse.data.find((e) => e.primary);
      email = primaryEmail?.email || emailResponse.data[0]?.email;
    }

    const profile = {
      id: response.data.id.toString(),
      email: email,
      name: response.data.name || response.data.login,
      avatar: response.data.avatar_url,
    };

    const { user, oauthAccount } = await findOrCreateOAuthUser("github", profile, accessToken);
    
    // Also create/update connected account for repository access
    try {
      const ConnectedAccount = (await import("../models/ConnectedAccount.js")).default;
      const existingAccount = await ConnectedAccount.findOne({
        userId: user._id,
        provider: "github",
      });

      if (existingAccount) {
        existingAccount.accessToken = accessToken;
        existingAccount.providerAccountId = profile.id;
        existingAccount.providerUsername = response.data.login;
        existingAccount.providerEmail = email;
        existingAccount.providerAvatar = response.data.avatar_url;
        existingAccount.isActive = true;
        existingAccount.scopes = ["repo", "read:user"];
        await existingAccount.save();
      } else {
        const connectedAccount = new ConnectedAccount({
          userId: user._id,
          provider: "github",
          providerAccountId: profile.id,
          accessToken,
          providerUsername: response.data.login,
          providerEmail: email,
          providerAvatar: response.data.avatar_url,
          scopes: ["repo", "read:user"],
          isActive: true,
        });
        await connectedAccount.save();
      }
    } catch (error) {
      console.error("Error creating connected account:", error);
      // Don't fail the login if connected account creation fails
    }
    
    return { user, token: generateToken(user), oauthAccount };
  } catch (error) {
    console.error("GitHub OAuth error:", error);
    throw new Error("Failed to authenticate with GitHub");
  }
};


