import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ConversationData } from "@/types/chat";
import { fetchData } from "./client";

type ApiConversation = {
  _id: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
};

const mapConversation = (conversation: ApiConversation): ConversationData => ({
  id: conversation._id,
  name: conversation.title ?? "Untitled conversation",
  createdAt: conversation.createdAt,
  updatedAt: conversation.updatedAt,
});

export const useConversationsQuery = (
  tenantId: string | null,
  userId: string | null,
) =>
  useQuery<ConversationData[]>({
    queryKey: ["conversations", tenantId, userId],
    enabled: Boolean(tenantId && userId),
    queryFn: async () => {
      if (!tenantId || !userId) {
        return [];
      }

      const data = await fetchData<ApiConversation[]>(
        `/api/v1/tenant/${tenantId}/user/${userId}/conversation`,
        {},
        "load conversations",
      );

      return Array.isArray(data) ? data.map(mapConversation) : [];
    },
    staleTime: 5 * 60 * 1000,
    initialData: [],
  });

type CreateConversationRequest = {
  title?: string;
};

export const useCreateConversationMutation = (
  tenantId: string | null,
  userId: string | null,
) => {
  const queryClient = useQueryClient();

  return useMutation<ConversationData, Error, CreateConversationRequest>({
    mutationKey: ["create-conversation", tenantId, userId],
    mutationFn: async ({ title }) => {
      if (!tenantId || !userId) {
        throw new Error("Cannot create a conversation without a tenant and user.");
      }

      const conversation = await fetchData<ApiConversation>(
        `/api/v1/tenant/${tenantId}/user/${userId}/conversation`,
        {
          method: "POST",
          body: JSON.stringify({ title }),
        },
        "create conversation",
      );

      return mapConversation(conversation);
    },
    onSuccess: (createdConversation) => {
      queryClient.setQueryData<ConversationData[] | undefined>(
        ["conversations", tenantId, userId],
        (current) =>
          current ? [createdConversation, ...current] : [createdConversation],
      );
    },
  });
};

export const useDeleteConversationMutation = (
  tenantId: string | null,
  userId: string | null,
) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { conversationId: string }>({
    mutationKey: ["delete-conversation", tenantId, userId],
    mutationFn: async ({ conversationId }) => {
      if (!tenantId || !userId) {
        throw new Error("Cannot delete a conversation without a tenant and user.");
      }

      await fetchData<void>(
        `/api/v1/tenant/${tenantId}/user/${userId}/conversation/${conversationId}`,
        {
          method: "DELETE",
        },
        "delete conversation",
      );
    },
    onSuccess: (_result, variables) => {
      queryClient.setQueryData<ConversationData[] | undefined>(
        ["conversations", tenantId, userId],
        (current) =>
          current?.filter(
            (conversation) => conversation.id !== variables.conversationId,
          ) ?? current,
      );
    },
  });
};
