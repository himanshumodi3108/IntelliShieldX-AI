import { useState, useCallback, useEffect, useRef } from "react";
import { chatApi, modelsApi, userApi } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  loadGuestChatData,
  saveGuestConversation,
  saveGuestMessages,
  deleteGuestConversation,
  getGuestChatCount,
  incrementGuestChatCount,
  hasReachedGuestChatLimit,
  getRemainingGuestChats,
  clearGuestChatData,
} from "@/utils/guestChatStorage";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  timestamp: Date;
  messageCount: number;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  category: "basic" | "standard" | "advanced" | "enterprise";
  maxTokens: number;
  speed: "fast" | "medium" | "slow";
  accuracy: "high" | "medium" | "low";
  cost?: {
    input: number;
    output: number;
  };
  enabled: boolean;
  available: boolean;
  description?: string;
}

export const useChat = (selectedModelId?: string) => {
  const { isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [userPlan, setUserPlan] = useState<"free" | "standard" | "pro" | "enterprise">("free");
  const [guestRemainingMessages, setGuestRemainingMessages] = useState<{ remaining: number; limit: number } | null>(null);
  const hasInitialized = useRef(false);

  // Load conversations on mount
  const loadConversations = useCallback(async () => {
    if (isAuthenticated) {
      try {
        const data = await chatApi.getConversations();
        // Convert timestamp strings to Date objects
        const formattedConversations: Conversation[] = data.map((conv: any) => ({
          id: conv.id,
          title: conv.title,
          timestamp: new Date(conv.timestamp),
          messageCount: conv.messageCount || 0,
        }));
        setConversations(formattedConversations);
      } catch (error) {
        console.error("Failed to load conversations:", error);
        setConversations([]);
      }
    } else {
      // Load from localStorage for guest users
      const guestData = loadGuestChatData();
      // Convert timestamp strings to Date objects for guest conversations
      const formattedConversations: Conversation[] = guestData.conversations.map((conv: any) => ({
        ...conv,
        timestamp: conv.timestamp instanceof Date ? conv.timestamp : new Date(conv.timestamp),
      }));
      setConversations(formattedConversations);
    }
  }, [isAuthenticated]);

  // Load available models
  const loadModels = useCallback(async () => {
    try {
      const data = await modelsApi.getAvailableModels();
      setAvailableModels(data);
    } catch (error) {
      console.error("Failed to load models:", error);
      // Set empty array on error to prevent UI issues
      setAvailableModels([]);
    }
  }, []);

  // Load user plan
  const loadUserPlan = useCallback(async () => {
    try {
      const plan = await userApi.getPlan();
      setUserPlan(plan);
    } catch (error) {
      console.error("Failed to load user plan:", error);
      // Default to free plan if not authenticated
      setUserPlan("free");
    }
  }, []);

  // Load guest rate limit status
  const loadGuestRateLimit = useCallback(async () => {
    if (!isAuthenticated) {
      try {
        const status = await chatApi.getGuestRateLimit();
        setGuestRemainingMessages(status);
      } catch (error) {
        console.error("Failed to load guest rate limit:", error);
        // Default to limit if API fails
        setGuestRemainingMessages({ remaining: 10, limit: 10 });
      }
    }
  }, [isAuthenticated]);

  // Send a message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!selectedModelId) {
        throw new Error("No model selected");
      }

      // Rate limit is now checked on the backend

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      let conversationId = currentConversationId;
      const assistantMessageId = Date.now().toString() + "-assistant";

      try {
        // Create conversation if needed
        if (!conversationId) {
          if (isAuthenticated) {
            conversationId = await chatApi.createConversation();
            // Reload conversations to include the new one
            await loadConversations();
          } else {
            // Create guest conversation with auto-name from first question
            conversationId = `guest_${Date.now()}`;
            const title = content.trim().length > 50 
              ? content.trim().slice(0, 50) + "..." 
              : content.trim() || "New Conversation";
            const newConversation: Conversation = {
              id: conversationId,
              title,
              timestamp: new Date(),
              messageCount: 1,
            };
            saveGuestConversation(newConversation);
            setConversations((prev) => [...prev, newConversation]);
          }
          setCurrentConversationId(conversationId);
          
          // Auto-update conversation title from first question (for authenticated users)
          // This will be handled by the backend, but we need to reload conversations
          // after the first message to get the updated title
        }

        // Stream response
        const assistantMessage: ChatMessage = {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
          isStreaming: true,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Stream the response
        if (isAuthenticated) {
          await chatApi.sendMessage(conversationId, content, selectedModelId, (chunk) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: msg.content + chunk, isStreaming: true }
                  : msg
              )
            );
          });
        } else {
          // Use guest endpoint for unauthenticated users
          await chatApi.sendGuestMessage(content, selectedModelId, (chunk) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: msg.content + chunk, isStreaming: true }
                  : msg
              )
            );
          });
          // Reload rate limit after sending message
          await loadGuestRateLimit();
        }

        // Mark as complete
        setMessages((prev) => {
          const updated = prev.map((msg) =>
            msg.id === assistantMessageId ? { ...msg, isStreaming: false } : msg
          );
          
          // Save to localStorage for guest users
          if (!isAuthenticated && conversationId) {
            saveGuestMessages(conversationId, updated);
            // Update conversation message count
            const guestData = loadGuestChatData();
            const conv = guestData.conversations.find((c) => c.id === conversationId);
            if (conv) {
              conv.messageCount = updated.length;
              saveGuestConversation(conv);
              setConversations(guestData.conversations);
            }
          }
          
          return updated;
        });

        // Reload conversations to update message count
        await loadConversations();
      } catch (error: any) {
        console.error("Failed to send message:", error);
        
        if (error.message.includes("Rate limit exceeded") || error.message.includes("429")) {
          toast.error("You've reached the daily limit of 10 messages. Please sign in for unlimited access.");
          await loadGuestRateLimit(); // Refresh rate limit status
        } else {
          toast.error(error.message || "Failed to send message. Please try again.");
        }
        
        // Remove the assistant message on error
        setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId));
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [selectedModelId, currentConversationId, loadConversations, isAuthenticated, loadGuestRateLimit]
  );

  // Select a conversation
  const selectConversation = useCallback(async (conversationId: string) => {
    try {
      if (isAuthenticated) {
        const conversationMessages = await chatApi.getConversationMessages(conversationId);
        setMessages(conversationMessages);
      } else {
        // Load from localStorage for guest users
        const guestData = loadGuestChatData();
        const conversationMessages = guestData.messages[conversationId] || [];
        setMessages(conversationMessages);
      }
      setCurrentConversationId(conversationId);
    } catch (error) {
      console.error("Failed to load conversation:", error);
      toast.error("Failed to load conversation");
    }
  }, [isAuthenticated]);

  // Rename a conversation
  const renameConversation = useCallback(
    async (conversationId: string, newTitle: string) => {
      try {
        if (isAuthenticated) {
          await chatApi.updateConversationTitle(conversationId, newTitle);
          await loadConversations(); // Reload to get updated title
        } else {
          // Update guest conversation title
          const guestData = loadGuestChatData();
          const conv = guestData.conversations.find((c) => c.id === conversationId);
          if (conv) {
            conv.title = newTitle;
            saveGuestConversation(conv);
            setConversations((prev) =>
              prev.map((c) => (c.id === conversationId ? { ...c, title: newTitle } : c))
            );
          }
        }
        toast.success("Conversation renamed");
      } catch (error) {
        console.error("Failed to rename conversation:", error);
        toast.error("Failed to rename conversation");
      }
    },
    [isAuthenticated, loadConversations]
  );

  // Delete a conversation
  const deleteConversation = useCallback(
    async (conversationId: string) => {
      try {
        if (isAuthenticated) {
          await chatApi.deleteConversation(conversationId);
        } else {
          deleteGuestConversation(conversationId);
        }
        setConversations((prev) => prev.filter((c) => c.id !== conversationId));
        if (currentConversationId === conversationId) {
          setCurrentConversationId(undefined);
          setMessages([]);
        }
        toast.success("Conversation deleted");
      } catch (error) {
        console.error("Failed to delete conversation:", error);
        toast.error("Failed to delete conversation");
      }
    },
    [currentConversationId, isAuthenticated]
  );

  // Start a new chat
  const startNewChat = useCallback(() => {
    setCurrentConversationId(undefined);
    setMessages([]);
  }, []);

  // Clear guest chat data on page refresh for unauthenticated users
  useEffect(() => {
    if (!isAuthenticated) {
      // Detect if this is a page refresh vs React Router navigation
      // We check the navigation type using Performance API
      const navEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
      const isPageRefresh = navEntries.length > 0 && 
        (navEntries[0].type === "reload" || 
         (navEntries[0].type === "navigate" && !sessionStorage.getItem("guest_router_navigation")));
      
      if (isPageRefresh) {
        // Page was refreshed, clear guest chat data
        clearGuestChatData();
      }
      
      // Mark that we've navigated via React Router (not a refresh)
      sessionStorage.setItem("guest_router_navigation", "true");
      
      // Clear the flag on beforeunload so we can detect refresh next time
      const handleBeforeUnload = () => {
        sessionStorage.removeItem("guest_router_navigation");
      };
      
      window.addEventListener("beforeunload", handleBeforeUnload);
      
      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
      };
    } else {
      // Clear session flag when authenticated
      sessionStorage.removeItem("guest_router_navigation");
    }
  }, [isAuthenticated]);

  // Initialize on mount
  useEffect(() => {
    if (!hasInitialized.current) {
      loadConversations();
      loadModels();
      if (isAuthenticated) {
        loadUserPlan();
      } else {
        loadGuestRateLimit();
      }
      hasInitialized.current = true;
    }
  }, [isAuthenticated, loadConversations, loadModels, loadUserPlan, loadGuestRateLimit]);

  return {
    messages,
    isLoading,
    sendMessage,
    currentConversationId,
    conversations,
    selectConversation,
    renameConversation,
    deleteConversation,
    startNewChat,
    availableModels,
    userPlan,
    refreshConversations: loadConversations,
    refreshModels: loadModels,
    isAuthenticated,
    guestChatCount: guestRemainingMessages ? (guestRemainingMessages.limit - guestRemainingMessages.remaining) : 0,
    guestChatLimit: guestRemainingMessages?.limit || 10,
    guestRemainingMessages: guestRemainingMessages?.remaining || 0,
    hasReachedLimit: !isAuthenticated && guestRemainingMessages !== null && guestRemainingMessages.remaining === 0,
    refreshGuestRateLimit: loadGuestRateLimit,
  };
};

