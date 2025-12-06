import jwt from "jsonwebtoken";

export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    req.user = decoded;
    next();
  } catch (error) {
    // Log the specific error for debugging
    if (error.name === "JsonWebTokenError") {
      console.error("JWT verification error:", error.message);
    } else if (error.name === "TokenExpiredError") {
      console.error("JWT expired:", error.expiredAt);
    } else {
      console.error("Auth middleware error:", error.message);
    }
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

export const optionalAuthenticate = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
        req.user = decoded;
      } catch (error) {
        // Invalid token, but continue without authentication
        req.user = null;
      }
    } else {
      req.user = null;
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    req.user = null;
    next();
  }
};

export const checkPlan = (allowedPlans) => {
  return (req, res, next) => {
    const userPlan = req.user?.plan || "free";
    
    if (!allowedPlans.includes(userPlan)) {
      return res.status(403).json({
        error: "Plan upgrade required",
        required: allowedPlans,
        current: userPlan,
      });
    }
    
    next();
  };
};

