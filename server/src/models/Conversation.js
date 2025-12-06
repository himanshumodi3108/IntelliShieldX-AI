import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
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
    modelId: String,
  },
  { timestamps: true }
);

const conversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      default: "New Conversation",
    },
    messages: [messageSchema],
    modelId: String,
  },
  {
    timestamps: true,
  }
);

// Auto-generate title from first user message
conversationSchema.pre("save", function (next) {
  if (this.isNew && this.messages.length > 0) {
    const firstUserMessage = this.messages.find((m) => m.role === "user");
    if (firstUserMessage) {
      this.title = firstUserMessage.content.substring(0, 50) + "...";
    }
  }
  next();
});

export default mongoose.model("Conversation", conversationSchema);

