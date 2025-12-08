import mongoose from "mongoose";

const adminLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminUser",
      required: true,
    },
    adminEmail: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    resource: {
      type: String,
      required: true,
    },
    resourceId: {
      type: String,
      default: null,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
adminLogSchema.index({ adminId: 1, createdAt: -1 });
adminLogSchema.index({ action: 1, createdAt: -1 });
adminLogSchema.index({ resource: 1, createdAt: -1 });

export default mongoose.model("AdminLog", adminLogSchema);




