import type { ConversationMessage, Source } from "@/types/chat";
import { fetchData } from "./client";

export type ApiMessage = {
  _id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  data?: {
    type?: string;
    sources?: Source[];
    [key: string]: unknown;
  };
  feedback?: {
    feedbackType: 1 | 0;
    reason: string | null;
    text: string | null;
    acknowledged: boolean;
  };
  imageSelection?: Array<{ key: string; src: string; filepath: string; type: string }>;
};

export const mapApiMessage = (message: ApiMessage): ConversationMessage => {
  const sources =
    message.data && message.data.type === "references"
      ? (message.data.sources ?? [])
      : undefined;

  const data =
    message.data && typeof message.data.type === "string"
      ? { ...message.data, type: message.data.type }
      : undefined;

  return {
    id: message._id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
    data,
    sources,
    feedback: message.feedback ?? null,
    imageSelection: message.imageSelection,
  };
};

export const fetchConversationMessages = async (
  tenantId: string,
  userId: string,
  conversationId: string,
): Promise<ConversationMessage[]> => {
  const data = await fetchData<ApiMessage[]>(
    `/api/v1/tenant/${tenantId}/user/${userId}/conversation/${conversationId}/message`,
    {},
    "load conversation messages",
  );

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map(mapApiMessage);
};
