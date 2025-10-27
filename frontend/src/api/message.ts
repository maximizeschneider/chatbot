import type { Source } from "@/types/chat";
import { apiFetch } from "./client";

type MessageSourcesResponse = {
  sources?: Source[];
};

export const fetchMessageSources = async (
  messageId: string,
): Promise<Source[]> => {
  const data = await apiFetch<MessageSourcesResponse>(`/sources/${messageId}`);

  if (!Array.isArray(data.sources)) {
    return [];
  }

  return data.sources;
};
