import type { Source } from "@/types/chat";
import { fetchData } from "./client";
import type { ApiMessage } from "./messages";

export const fetchMessageSources = async (
  tenantId: string,
  userId: string,
  conversationId: string,
  messageId: string,
): Promise<Source[]> => {
  const data = await fetchData<ApiMessage>(
    `/api/v1/tenant/${tenantId}/user/${userId}/conversation/${conversationId}/message/${messageId}`,
    {},
    "load message sources",
  );

  if (data?.data?.type === "references" && Array.isArray(data.data.sources)) {
    return data.data.sources;
  }

  return [];
};
