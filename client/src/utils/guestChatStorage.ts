import { ChatMessage, Conversation } from "@/hooks/use-chat";

const GUEST_CHAT_STORAGE_KEY = "sentinelx_guest_chats";
const GUEST_CHAT_COUNT_KEY = "sentinelx_guest_chat_count";
const GUEST_CHAT_LIMIT = 2;

export interface GuestChatData {
  conversations: Conversation[];
  messages: Record<string, ChatMessage[]>;
}

/**
 * Get guest chat count from localStorage
 */
export const getGuestChatCount = (): number => {
  try {
    const count = localStorage.getItem(GUEST_CHAT_COUNT_KEY);
    return count ? parseInt(count, 10) : 0;
  } catch {
    return 0;
  }
};

/**
 * Increment guest chat count
 */
export const incrementGuestChatCount = (): number => {
  const current = getGuestChatCount();
  const newCount = current + 1;
  try {
    localStorage.setItem(GUEST_CHAT_COUNT_KEY, newCount.toString());
  } catch {
    // Ignore storage errors
  }
  return newCount;
};

/**
 * Check if guest has reached chat limit
 */
export const hasReachedGuestChatLimit = (): boolean => {
  return getGuestChatCount() >= GUEST_CHAT_LIMIT;
};

/**
 * Get remaining guest chats
 */
export const getRemainingGuestChats = (): number => {
  const used = getGuestChatCount();
  return Math.max(0, GUEST_CHAT_LIMIT - used);
};

/**
 * Load guest chat data from localStorage
 */
export const loadGuestChatData = (): GuestChatData => {
  try {
    const data = localStorage.getItem(GUEST_CHAT_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch {
    // Ignore parse errors
  }
  return { conversations: [], messages: {} };
};

/**
 * Save guest chat data to localStorage
 */
export const saveGuestChatData = (data: GuestChatData): void => {
  try {
    localStorage.setItem(GUEST_CHAT_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
};

/**
 * Save a conversation for guest user
 */
export const saveGuestConversation = (conversation: Conversation): void => {
  const data = loadGuestChatData();
  const existingIndex = data.conversations.findIndex((c) => c.id === conversation.id);
  
  if (existingIndex >= 0) {
    data.conversations[existingIndex] = conversation;
  } else {
    data.conversations.push(conversation);
  }
  
  saveGuestChatData(data);
};

/**
 * Save messages for a conversation
 */
export const saveGuestMessages = (conversationId: string, messages: ChatMessage[]): void => {
  const data = loadGuestChatData();
  data.messages[conversationId] = messages;
  saveGuestChatData(data);
};

/**
 * Delete a guest conversation
 */
export const deleteGuestConversation = (conversationId: string): void => {
  const data = loadGuestChatData();
  data.conversations = data.conversations.filter((c) => c.id !== conversationId);
  delete data.messages[conversationId];
  saveGuestChatData(data);
};

/**
 * Clear all guest chat data (called on page refresh)
 */
export const clearGuestChatData = (): void => {
  try {
    localStorage.removeItem(GUEST_CHAT_STORAGE_KEY);
    localStorage.removeItem(GUEST_CHAT_COUNT_KEY);
  } catch {
    // Ignore storage errors
  }
};

/**
 * Reset guest chat count (useful for testing or admin)
 */
export const resetGuestChatCount = (): void => {
  try {
    localStorage.removeItem(GUEST_CHAT_COUNT_KEY);
  } catch {
    // Ignore storage errors
  }
};

