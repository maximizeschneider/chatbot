import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ConversationData } from '@/types/chat';
import { apiFetch, buildApiUrl } from './client';

type ConversationsResponse = {
  conversations: ConversationData[];
};

type CreateConversationRequest = {
  title?: string;
};

type CreateConversationResponse = {
  conversation: ConversationData;
};

export const useConversationsQuery = () =>
  useQuery<ConversationData[]>({
    queryKey: ['conversations'],
    queryFn: async () => {
      const data = await apiFetch<ConversationsResponse>('/conversations');
      return data.conversations ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

export const useCreateConversationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<ConversationData, Error, CreateConversationRequest>({
    mutationKey: ['create-conversation'],
    mutationFn: async (payload) => {
      const data = await apiFetch<CreateConversationResponse>('/conversations', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return data.conversation;
    },
    onSuccess: (createdConversation) => {
      queryClient.setQueryData<ConversationData[] | undefined>(
        ['conversations'],
        (current) => (current ? [createdConversation, ...current] : [createdConversation])
      );
    },
  });
};

export const useDeleteConversationMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { conversationId: string }>({
    mutationKey: ['delete-conversation'],
    mutationFn: async ({ conversationId }) => {
      const response = await fetch(buildApiUrl(`/conversations/${conversationId}`), {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(
          `Failed to delete conversation with status ${response.status}`
        );
      }
    },
    onSuccess: (_result, variables) => {
      queryClient.setQueryData<ConversationData[] | undefined>(
        ['conversations'],
        (current) =>
          current?.filter((conversation) => conversation.id !== variables.conversationId) ??
          current
      );
    },
  });
};
