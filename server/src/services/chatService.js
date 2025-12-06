import axios from "axios";

class ChatService {
  async streamResponse(message, modelId, userPlan, onChunk, isAuthenticated = true) {
    // This would call the Python AI engine for actual LLM processing
    // For now, simulate streaming response
    
    const pythonEngineUrl = process.env.PYTHON_ENGINE_URL || "http://localhost:5000";
    
    try {
      const response = await axios.post(
        `${pythonEngineUrl}/api/chat/stream`,
        {
          message,
          modelId,
          userPlan,
          isAuthenticated,
        },
        {
          responseType: "stream",
        }
      );

      return new Promise((resolve, reject) => {
        let buffer = "";

        response.data.on("data", (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") {
                resolve();
                return;
              }
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  onChunk(parsed.content);
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        });

        response.data.on("end", () => {
          if (buffer) {
            try {
              const parsed = JSON.parse(buffer);
              if (parsed.content) {
                onChunk(parsed.content);
              }
            } catch (e) {
              // Ignore
            }
          }
          resolve();
        });

        response.data.on("error", reject);
      });
    } catch (error) {
      // Fallback: simulate response if Python engine is not available
      console.warn("Python engine not available, using fallback response:", error.message);
      const fallbackResponse = `I understand you're asking about: "${message}". This is a simulated response. Please ensure the Python AI engine is running at ${pythonEngineUrl} for full functionality.`;
      
      // Simulate streaming
      for (let i = 0; i < fallbackResponse.length; i += 5) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        onChunk(fallbackResponse.slice(i, i + 5));
      }
    }
  }
}

export const chatService = new ChatService();

