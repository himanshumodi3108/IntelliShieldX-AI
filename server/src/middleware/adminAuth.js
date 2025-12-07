import jwt from "jsonwebtoken";
import AdminUser from "../models/AdminUser.js";
import JWT_SECRET from "../config/jwt.js";

export const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.log("Admin auth failed: No authorization header");
      return res.status(401).json({ error: "Admin authentication required" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      console.log("Admin auth failed: No token in authorization header");
      return res.status(401).json({ error: "Admin authentication required" });
    }
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Verify admin user exists and is active
      const admin = await AdminUser.findById(decoded.adminId);
      if (!admin || !admin.isActive) {
        console.log(`Admin auth failed: Admin not found or inactive. AdminId: ${decoded.adminId}`);
        return res.status(401).json({ error: "Admin account not found or inactive" });
      }

      req.admin = {
        adminId: admin._id.toString(),
        email: admin.email,
        name: admin.name,
        role: admin.role,
        permissions: admin.permissions,
      };
      
      next();
    } catch (jwtError) {
      if (jwtError.name === "JsonWebTokenError") {
        console.log("Admin auth failed: Invalid JWT token", jwtError.message);
        return res.status(401).json({ error: "Invalid admin token" });
      } else if (jwtError.name === "TokenExpiredError") {
        console.log("Admin auth failed: Token expired");
        return res.status(401).json({ error: "Admin token expired" });
      }
      console.log("Admin auth failed: JWT verification error", jwtError.message);
      return res.status(401).json({ error: "Admin authentication failed" });
    }
  } catch (error) {
    console.error("Admin auth error:", error);
    return res.status(401).json({ error: "Admin authentication failed" });
  }
};

export const requireSuperAdmin = (req, res, next) => {
  if (req.admin?.role !== "super_admin") {
    return res.status(403).json({ error: "Super admin access required" });
  }
  next();
};

export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (req.admin?.role === "super_admin") {
      return next(); // Super admin has all permissions
    }
    
    if (!req.admin?.permissions.includes(permission)) {
      return res.status(403).json({ error: `Permission required: ${permission}` });
    }
    
    next();
  };
};

