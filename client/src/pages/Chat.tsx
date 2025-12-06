import { useState, useRef, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatHistory } from "@/components/chat/ChatHistory";
import { ModelSelector, AIModel } from "@/components/chat/ModelSelector";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Settings, MessageSquare, History as HistoryIcon, Download, Lock, AlertCircle } from "lucide-react";
import { useChat } from "@/hooks/use-chat";
import { toast } from "sonner";
import { generateChatPDF } from "@/utils/pdfGenerator";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

const Chat = () => {
  const { isAuthenticated } = useAuth();
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>();
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isLoading,
    sendMessage,
    currentConversationId,
    conversations,
    selectConversation,
    renameConversation,
    deleteConversation,
    startNewChat: startNewChatFromHook,
    availableModels,
    userPlan,
    guestChatCount,
    guestChatLimit,
    guestRemainingMessages,
    hasReachedLimit,
  } = useChat(selectedModelId);

  // Wrap startNewChat to also close the history sheet
  const startNewChat = () => {
    startNewChatFromHook();
    setShowHistory(false);
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (content: string) => {
    if (!selectedModelId) {
      toast.error("Please select an AI model first");
      setShowModelSelector(true);
      return;
    }

    try {
      await sendMessage(content);
    } catch (error: any) {
      if (error.message === "RATE_LIMIT_REACHED") {
        // Error toast is already shown in useChat hook
        return;
      }
      toast.error("Failed to send message. Please try again.");
      console.error("Chat error:", error);
    }
  };

  const handleDownloadPDF = () => {
    if (messages.length === 0) {
      toast.error("No messages to download");
      return;
    }

    try {
      const conversationTitle = conversations.find(
        (c) => c.id === currentConversationId
      )?.title || "Chat Conversation";
      
      generateChatPDF(messages, conversationTitle);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast.error("Failed to generate PDF. Please try again.");
    }
  };

  // Use API models if available, otherwise use mock models for development
  const models: AIModel[] = availableModels.length > 0 
    ? availableModels.map(m => ({
        ...m,
        available: m.available !== false,
      }))
    : [
        // Fallback: Only show Groq model for free tier/unauthenticated
        {
          id: "mixtral-8x7b",
          name: "Llama 3.1 8B Instant",
          provider: "Groq",
          category: "basic",
          maxTokens: 8192,
          speed: "fast",
          accuracy: "medium",
          cost: { input: 0.00024, output: 0.00024 },
          enabled: true,
          available: true,
          description: "Fast and efficient Llama model via Groq",
        },
      ];

  // Set default model if none selected (runs when models are loaded)
  useEffect(() => {
    // Only set default if no model is currently selected and models are available
    if (!selectedModelId && models.length > 0) {
      // For unauthenticated users, prefer Groq model (free tier)
      let defaultModel;
      if (!isAuthenticated) {
        // For guests, find Groq model first, then any available model
        defaultModel = models.find((m) => 
          m.provider === "Groq" && m.available && m.enabled
        ) || models.find((m) => m.available && m.enabled) || models[0];
      } else {
        // For authenticated users, find first available model
        defaultModel = models.find((m) => m.available && m.enabled) || models[0];
      }
      
      if (defaultModel && defaultModel.id) {
        setSelectedModelId(defaultModel.id);
      }
    }
  }, [models, selectedModelId, isAuthenticated]);

  // Also set default when availableModels change (from useChat hook)
  useEffect(() => {
    if (!selectedModelId && availableModels.length > 0) {
      // For unauthenticated users, prefer Groq model (free tier)
      let defaultModel;
      if (!isAuthenticated) {
        // For guests, find Groq model first, then any available model
        defaultModel = availableModels.find((m) => 
          m.provider === "Groq" && m.available && m.enabled
        ) || availableModels.find((m) => m.available && m.enabled) || availableModels[0];
      } else {
        // For authenticated users, find first available model
        defaultModel = availableModels.find((m) => m.available && m.enabled) || availableModels[0];
      }
      
      if (defaultModel && defaultModel.id) {
        setSelectedModelId(defaultModel.id);
      }
    }
  }, [availableModels, selectedModelId, isAuthenticated]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 flex pt-16">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="border-b border-border bg-card/50 p-4">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              <div className="flex-1">
                <h1 className="text-2xl font-bold">AI Security Assistant</h1>
                <p className="text-sm text-muted-foreground">
                  Ask about vulnerabilities, get code help, or request explanations
                </p>
                {!isAuthenticated && guestRemainingMessages !== undefined && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {hasReachedLimit ? (
                      <span className="text-destructive">Daily rate limit reached. Sign in to continue.</span>
                    ) : (
                      <span>Daily messages remaining: {guestRemainingMessages} of {guestChatLimit}</span>
                    )}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadPDF}
                    title="Download chat as PDF"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                )}
                {isAuthenticated && (
                  <Sheet open={showHistory} onOpenChange={setShowHistory}>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm">
                        <HistoryIcon className="h-4 w-4 mr-2" />
                        History
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-80">
                      <SheetHeader>
                        <SheetTitle>Chat History</SheetTitle>
                        <SheetDescription>
                          View and manage your previous conversations
                        </SheetDescription>
                      </SheetHeader>
                      <div className="mt-4">
                        <ChatHistory
                          conversations={conversations}
                          selectedId={currentConversationId}
                          onSelect={(id) => {
                            selectConversation(id);
                            setShowHistory(false); // Close sheet when selecting a conversation
                          }}
                          onRename={renameConversation}
                          onDelete={deleteConversation}
                          onNewChat={startNewChat}
                        />
                      </div>
                    </SheetContent>
                  </Sheet>
                )}
                <Sheet open={showModelSelector} onOpenChange={setShowModelSelector}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Model
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-96 overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle>Select AI Model</SheetTitle>
                      <SheetDescription>
                        Choose a model based on your plan and needs
                      </SheetDescription>
                    </SheetHeader>
                    <div className="space-y-4 mt-4">
                      <ModelSelector
                        models={models}
                        selectedModelId={selectedModelId}
                        onSelect={(id) => {
                          setSelectedModelId(id);
                          setShowModelSelector(false);
                          toast.success("Model selected");
                        }}
                        userPlan={userPlan}
                      />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>

          {/* Rate Limit Alert */}
          {hasReachedLimit && (
            <div className="max-w-4xl mx-auto p-4">
              <Alert className="border-destructive">
                <Lock className="h-4 w-4" />
                <AlertTitle>Daily Rate Limit Reached</AlertTitle>
                <AlertDescription>
                  You've used all {guestChatLimit} daily messages. The limit will reset at midnight. Please{" "}
                  <Link to="/login" className="text-primary underline font-medium">
                    sign in
                  </Link>{" "}
                  to continue with unlimited access and save your chat history.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Messages */}
          <ScrollArea className="flex-1" ref={scrollAreaRef}>
            <div className="max-w-4xl mx-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Start a conversation</h3>
                  <p className="text-muted-foreground max-w-md">
                    Ask me about security vulnerabilities, get help debugging code, or
                    request explanations of attack vectors like SQL injection, XSS, CSRF, etc.
                  </p>
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg">
                    {[
                      "Explain SQL injection vulnerabilities",
                      "How do I fix XSS in React?",
                      "What is CSRF and how to prevent it?",
                      "Review my code for security issues",
                    ].map((suggestion) => (
                      <Button
                        key={suggestion}
                        variant="outline"
                        className="text-left justify-start h-auto py-3"
                        onClick={() => handleSend(suggestion)}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    role={message.role}
                    content={message.content}
                    isStreaming={message.isStreaming}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <ChatInput onSend={handleSend} disabled={isLoading || hasReachedLimit} />
        </div>
      </div>
    </div>
  );
};

export default Chat;

