import type { ChatMessage, Source } from "@/types/chat";
import { apiFetch, buildApiUrl } from "./client";

export const DEFAULT_MESSAGES_PAGE_SIZE = 10;

export type ConversationMessagesPage = {
  messages: ChatMessage[];
  nextCursor: number | null;
};

type ConversationMessagesResponse = {
  messages?: ChatMessage[];
  nextCursor?: number | null;
};

type ConversationMessagesParams = {
  conversationId: string;
  cursor?: number | null;
  limit?: number;
  signal?: AbortSignal;
};

type MessageSourcesResponse = {
  sources?: Source[];
};

export const fetchConversationMessages = async ({
  conversationId,
  cursor,
  limit = DEFAULT_MESSAGES_PAGE_SIZE,
  signal,
}: ConversationMessagesParams): Promise<ConversationMessagesPage> => {
  if (!conversationId) {
    return { messages: [], nextCursor: null };
  }

  const url = new URL(
    buildApiUrl(`/conversations/${conversationId}/messages`)
  );
  url.searchParams.set("limit", String(limit));
  if (typeof cursor === "number") {
    url.searchParams.set("cursor", String(cursor));
  }

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch messages (${response.status} ${response.statusText})`
    );
  }

  const data = (await response.json()) as ConversationMessagesResponse;

  if (!Array.isArray(data.messages)) {
    return { messages: [], nextCursor: null };
  }

  return {
    messages: data.messages,
    nextCursor:
      typeof data.nextCursor === "number" ? data.nextCursor : null,
  };
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
