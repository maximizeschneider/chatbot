import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "./client";

export type QuestionGenerationRequest = {
  messageId?: string;
  conversationId?: string;
  text?: string;
};

export type QuestionGenerationResponse = {
  questions: string[];
  generatedAt: string;
  conversationId?: string;
  messageId?: string;
};

export const useQuestionGenerationMutation = () =>
  useMutation<QuestionGenerationResponse, Error, QuestionGenerationRequest>({
    mutationKey: ["generate-questions"],
    mutationFn: (payload) =>
      apiFetch<QuestionGenerationResponse>("/questions", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  });

