import { apiFetch } from "./client";
import type { ConversationMessage } from "@/types/chat";

type ConversationMessagesResponse = {
  messages: ConversationMessage[];
};

export const fetchConversationMessages = async (
  conversationId: string,
): Promise<ConversationMessage[]> => {
  const data = await apiFetch<ConversationMessagesResponse>(
    `/messages/${conversationId}`,
  );

  if (!Array.isArray(data.messages)) {
    return [];
  }

  return data.messages;
};
