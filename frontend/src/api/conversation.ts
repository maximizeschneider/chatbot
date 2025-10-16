import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ConversationData } from "@/types/chat";
import { apiFetch, buildApiUrl } from "./client";

type ConversationsResponse = {
  conversations: ConversationData[];
};

type CreateConversationRequest = {
  title?: string;
};

type CreateConversationResponse = {
  conversation: ConversationData;
};

type UpdateConversationRequest = {
  conversationId: string;
  title: string;
};

type UpdateConversationResponse = {
  conversation: ConversationData;
};

export const useConversationsQuery = () =>
  useQuery<ConversationData[]>({
    queryKey: ["conversations"],
    queryFn: async () => {
      const data = await apiFetch<ConversationsResponse>("/conversations");
      return data.conversations ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

export const useCreateConversationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<ConversationData, Error, CreateConversationRequest>({
    mutationKey: ["create-conversation"],
    mutationFn: async (payload) => {
      const data = await apiFetch<CreateConversationResponse>("/conversations", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return data.conversation;
    },
    onSuccess: (createdConversation) => {
      queryClient.setQueryData<ConversationData[] | undefined>(
        ["conversations"],
        (current) =>
          current ? [createdConversation, ...current] : [createdConversation]
      );
    },
  });
};

export const useUpdateConversationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    ConversationData,
    Error,
    UpdateConversationRequest,
    { previous?: ConversationData[] }
  >({
    mutationKey: ["update-conversation"],
    mutationFn: async ({ conversationId, title }) => {
      const data = await apiFetch<UpdateConversationResponse>(
        `/conversations/${conversationId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ title }),
        }
      );
      return data.conversation;
    },
    onMutate: async ({ conversationId, title }) => {
      await queryClient.cancelQueries({ queryKey: ["conversations"] });
      const previous = queryClient.getQueryData<ConversationData[]>([
        "conversations",
      ]);

      queryClient.setQueryData<ConversationData[] | undefined>(
        ["conversations"],
        (current) =>
          current
            ? current.map((conversation) =>
                conversation.id === conversationId
                  ? { ...conversation, title }
                  : conversation
              )
            : current
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["conversations"], context.previous);
      }
    },
    onSuccess: (updatedConversation) => {
      queryClient.setQueryData<ConversationData[] | undefined>(
        ["conversations"],
        (current) =>
          current
            ? current.map((conversation) =>
                conversation.id === updatedConversation.id
                  ? updatedConversation
                  : conversation
              )
            : current
      );
    },
  });
};

export const useDeleteConversationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { conversationId: string }>({
    mutationKey: ["delete-conversation"],
    mutationFn: async ({ conversationId }) => {
      const response = await fetch(buildApiUrl(`/conversations/${conversationId}`), {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(
          `Failed to delete conversation with status ${response.status}`
        );
      }
    },
    onSuccess: (_result, variables) => {
      queryClient.setQueryData<ConversationData[] | undefined>(
        ["conversations"],
        (current) =>
          current?.filter(
            (conversation) => conversation.id !== variables.conversationId
          ) ?? current
      );
    },
  });
};
