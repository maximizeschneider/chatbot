import type { Source } from "@/types/chat";
import { apiFetch } from "./client";

type MessageSourcesResponse = {
  sources?: Source[];
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
