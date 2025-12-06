import axios from "axios";
import ConnectedAccount from "../models/ConnectedAccount.js";

/**
 * Get GitHub repositories for a user
 */
export const getGitHubRepositories = async (accessToken) => {
  try {
    const response = await axios.get("https://api.github.com/user/repos", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
      params: {
        per_page: 100,
        sort: "updated",
        direction: "desc",
      },
    });

    return response.data.map((repo) => ({
      id: repo.id.toString(),
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      url: repo.html_url,
      private: repo.private,
      defaultBranch: repo.default_branch || "main",
      language: repo.language,
      updatedAt: repo.updated_at,
    }));
  } catch (error) {
    console.error("Error fetching GitHub repositories:", error);
    throw new Error("Failed to fetch GitHub repositories");
  }
};

/**
 * Get repository contents (for scanning)
 */
export const getRepositoryContents = async (accessToken, owner, repo, path = "") => {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error fetching repository contents:", error);
    throw new Error("Failed to fetch repository contents");
  }
};

/**
 * Get file content from repository
 */
export const getRepositoryFileContent = async (accessToken, owner, repo, path) => {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    // Decode base64 content
    if (response.data.content) {
      const content = Buffer.from(response.data.content, "base64").toString("utf-8");
      return {
        content,
        encoding: response.data.encoding,
        size: response.data.size,
        path: response.data.path,
      };
    }

    return null;
  } catch (error) {
    console.error("Error fetching file content:", error);
    throw new Error("Failed to fetch file content");
  }
};

/**
 * Get user's connected GitHub account
 */
export const getConnectedGitHubAccount = async (userId) => {
  return ConnectedAccount.findOne({
    userId,
    provider: "github",
    isActive: true,
  });
};

