// Centralized JWT configuration
// This ensures JWT_SECRET is consistent across all modules

// Ensure dotenv is loaded before reading environment variables
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from the server root directory
dotenv.config({ path: join(__dirname, "../../.env") });

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Warn if using default secret (only log once when module is first loaded)
if (JWT_SECRET === "your-secret-key" && process.env.NODE_ENV !== "test") {
  console.warn("⚠️  WARNING: Using default JWT_SECRET. This is insecure for production!");
  console.warn("   Please set JWT_SECRET in your .env file.");
} else if (process.env.NODE_ENV !== "test") {
  console.log("✅ JWT_SECRET is configured (length:", JWT_SECRET.length, "characters)");
}

export default JWT_SECRET;

