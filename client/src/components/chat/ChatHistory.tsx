import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { History, Trash2, MessageSquare, Edit2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatHistoryItem {
  id: string;
  title: string;
  timestamp: Date;
  messageCount: number;
}

interface ChatHistoryProps {
  conversations: ChatHistoryItem[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename?: (id: string, newTitle: string) => void;
  onNewChat: () => void;
}

export const ChatHistory = ({
  conversations,
  selectedId,
  onSelect,
  onDelete,
  onRename,
  onNewChat,
}: ChatHistoryProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleStartEdit = (e: React.MouseEvent, conv: ChatHistoryItem) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditValue(conv.title);
  };

  const handleSaveEdit = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (editValue.trim() && onRename) {
      onRename(id, editValue.trim());
    }
    setEditingId(null);
    setEditValue("");
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
    setEditValue("");
  };

  return (
    <Card className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <History className="h-4 w-4" />
            Chat History
          </h3>
          <Button onClick={onNewChat} size="sm" variant="outline">
            <MessageSquare className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              No chat history yet
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  "group relative p-3 rounded-lg cursor-pointer transition-all",
                  selectedId === conv.id
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-secondary/50"
                )}
                onClick={() => editingId !== conv.id && onSelect(conv.id)}
              >
                {editingId === conv.id ? (
                  <div className="flex items-center gap-1 mb-1" onClick={(e) => e.stopPropagation()}>
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleSaveEdit(e as any, conv.id);
                        } else if (e.key === "Escape") {
                          handleCancelEdit(e as any);
                        }
                      }}
                      className="h-7 text-sm flex-1"
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => handleSaveEdit(e, conv.id)}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={handleCancelEdit}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="font-medium text-sm truncate mb-1">
                    {conv.title}
                  </div>
                )}
                <div className="text-xs text-muted-foreground flex items-center justify-between">
                  <span>{conv.messageCount} messages</span>
                  <span>
                    {new Date(conv.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onRename && editingId !== conv.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => handleStartEdit(e, conv)}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(conv.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};

