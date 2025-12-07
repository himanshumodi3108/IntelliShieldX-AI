import AdminLog from "../models/AdminLog.js";

export const logAdminAction = async (adminId, adminEmail, action, resource, resourceId = null, details = {}, req = null) => {
  try {
    const log = new AdminLog({
      adminId,
      adminEmail,
      action,
      resource,
      resourceId: resourceId?.toString() || null,
      details,
      ipAddress: req?.ip || req?.connection?.remoteAddress || null,
      userAgent: req?.get("user-agent") || null,
    });
    
    await log.save();
    return log;
  } catch (error) {
    console.error("Error logging admin action:", error);
    // Don't throw error - logging should not break the main flow
    return null;
  }
};

export const getAdminLogs = async (filters = {}, page = 1, limit = 50) => {
  try {
    const skip = (page - 1) * limit;
    const query = {};
    
    if (filters.adminId) {
      query.adminId = filters.adminId;
    }
    if (filters.action) {
      query.action = filters.action;
    }
    if (filters.resource) {
      query.resource = filters.resource;
    }
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.createdAt.$lte = new Date(filters.endDate);
      }
    }
    
    // Execute queries in parallel for better performance
    const [logs, total] = await Promise.all([
      AdminLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("adminId", "email name")
        .lean(),
      AdminLog.countDocuments(query),
    ]);
    
    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  } catch (error) {
    console.error("Error fetching admin logs:", error);
    throw error;
  }
};

