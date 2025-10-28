import { useMutation } from "@tanstack/react-query";
import { fetchData } from "./client";

export type QuestionGenerationRequest = {
  conversationId: string;
  messageId: string;
  configName?: string | null;
};

export type QuestionGenerationResponse = {
  questions: string[];
};

export const useQuestionGenerationMutation = (
  tenantId: string | null,
  userId: string | null,
) =>
  useMutation<QuestionGenerationResponse, Error, QuestionGenerationRequest>({
    mutationKey: ["generate-questions", tenantId, userId],
    mutationFn: async ({ conversationId, messageId, configName }) => {
      if (!tenantId || !userId) {
        throw new Error("Cannot generate questions without a tenant and user.");
      }

      const query = configName
        ? `?configName=${encodeURIComponent(configName)}`
        : "";

      const data = await fetchData<string[]>(
        `/api/v1/tenant/${tenantId}/user/${userId}/conversation/${conversationId}/message/${messageId}/questions${query}`,
        {},
        "generate follow-up questions",
      );

      return {
        questions: Array.isArray(data) ? data : [],
      };
    },
  });
