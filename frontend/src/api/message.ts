import type { ChatMessage, Source } from "@/types/chat";
import { apiFetch } from "./client";

type ConversationMessagesResponse = {
  messages?: ChatMessage[];
};

type MessageSourcesResponse = {
  sources?: Source[];
};

export const fetchConversationMessages = async (
  conversationId: string
): Promise<ChatMessage[]> => {
  if (!conversationId) {
    return [];
  }

  const data = await apiFetch<ConversationMessagesResponse>(
    `/conversations/${conversationId}/messages`
  );

  if (!Array.isArray(data.messages)) {
    return [];
  }

  return data.messages;
};

export const fetchMessageSources = async ({
  conversationId,
  messageId,
}: {
  conversationId: string;
  messageId: string;
}): Promise<Source[]> => {
  const data = await apiFetch<MessageSourcesResponse>(
    `/conversations/${conversationId}/messages/${messageId}/sources`
  );

  if (!Array.isArray(data.sources)) {
    return [];
  }

  return data.sources;
};
