import mongoose from "mongoose";

const documentationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    repositoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
    },
    version: {
      type: String,
      default: "1.0.0",
    },
    overview: {
      type: String,
      default: null,
    },
    fileStructure: {
      type: String,
      default: null, // Markdown-formatted directory tree
    },
    detailedExplanations: {
      type: String,
      default: null, // Markdown-formatted detailed explanations with code snippets
    },
    codeFlowAnalysis: {
      type: String,
      default: null, // Markdown-formatted code flow analysis
    },
    architectureDescription: {
      type: String,
      default: null, // Markdown-formatted architecture description
    },
    apiEndpoints: [
      {
        method: {
          type: String,
          enum: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
        },
        path: String,
        description: String,
        parameters: [
          {
            name: String,
            type: String,
            required: Boolean,
            description: String,
            location: {
              type: String,
              enum: ["query", "path", "body", "header"],
            },
          },
        ],
        requestBody: {
          type: mongoose.Schema.Types.Mixed,
        },
        responses: [
          {
            statusCode: Number,
            description: String,
            schema: mongoose.Schema.Types.Mixed,
          },
        ],
        file: String,
        line: Number,
      },
    ],
    schemas: [
      {
        name: String,
        type: {
          type: String,
          enum: ["model", "interface", "type", "class", "enum"],
        },
        description: String,
        properties: [
          {
            name: String,
            type: String,
            required: Boolean,
            description: String,
            defaultValue: mongoose.Schema.Types.Mixed,
          },
        ],
        file: String,
        line: Number,
      },
    ],
    projectStructure: {
      directories: [
        {
          path: String,
          description: String,
          files: [String],
        },
      ],
      entryPoints: [String],
      mainFiles: [String],
    },
    dependencies: [
      {
        name: String,
        version: String,
        type: {
          type: String,
          enum: ["dependency", "devDependency", "peerDependency"],
        },
        description: String,
      },
    ],
    chatMessages: [
      {
        role: {
          type: String,
          enum: ["user", "assistant"],
          required: true,
        },
        content: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    lastUpdatedAt: {
      type: Date,
      default: Date.now,
    },
    generatedBy: {
      type: String,
      default: null, // Model ID that generated this documentation
    },
    modelName: {
      type: String,
      default: null, // Human-readable model name
    },
    provider: {
      type: String,
      default: null, // Provider name (OpenAI, Groq, etc.)
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
documentationSchema.index({ userId: 1, repositoryId: 1 });
documentationSchema.index({ repositoryId: 1, generatedAt: -1 });

export default mongoose.model("Documentation", documentationSchema);

