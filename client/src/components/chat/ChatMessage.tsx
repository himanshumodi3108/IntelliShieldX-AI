import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { memo } from "react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export const ChatMessage = memo(({ role, content, isStreaming }: ChatMessageProps) => {
  const isUser = role === "user";

  // Extract code blocks from markdown
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const parts: Array<{ type: "text" | "code"; content: string; language?: string }> = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        content: content.slice(lastIndex, match.index),
      });
    }
    // Add code block
    parts.push({
      type: "code",
      content: match[2],
      language: match[1] || "text",
    });
    lastIndex = match.index + match[0].length;
  }
  // Add remaining text
  if (lastIndex < content.length) {
    parts.push({
      type: "text",
      content: content.slice(lastIndex),
    });
  }

  // If no code blocks found, treat entire content as text
  if (parts.length === 0) {
    parts.push({ type: "text", content });
  }

  // Helper function to process text content
  const processTextContent = (text: string): string => {
    return text
      .replace(/\n/g, "<br />")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>');
  };

  return (
    <div
      className={cn(
        "flex gap-4 p-4 rounded-lg transition-all",
        isUser ? "bg-secondary/30" : "bg-card/50"
      )}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className={cn(isUser ? "bg-primary" : "bg-accent")}>
          {isUser ? (
            <User className="h-4 w-4 text-primary-foreground" />
          ) : (
            <Bot className="h-4 w-4 text-accent-foreground" />
          )}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 space-y-2 min-w-0">
        <div className="text-sm font-medium text-muted-foreground">
          {isUser ? "You" : "IntelliShieldX AI"}
        </div>
        <div className="prose prose-invert max-w-none">
          {parts.map((part, index) => {
            if (part.type === "code") {
              return (
                <div key={index} className="my-2 rounded-lg overflow-hidden">
                  <SyntaxHighlighter
                    language={part.language}
                    style={vscDarkPlus}
                    customStyle={{
                      margin: 0,
                      borderRadius: "0.5rem",
                      fontSize: "0.875rem",
                    }}
                  >
                    {part.content}
                  </SyntaxHighlighter>
                </div>
              );
            }
            const processedContent = processTextContent(part.content);
            return (
              <div
                key={index}
                className="whitespace-pre-wrap break-words"
                dangerouslySetInnerHTML={{ __html: processedContent }}
              ></div>
            );
          })}
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
          )}
        </div>
      </div>
    </div>
  );
});

ChatMessage.displayName = "ChatMessage";
