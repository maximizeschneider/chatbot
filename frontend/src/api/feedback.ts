import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "./client";

export type FeedbackRequest = {
  conversationId: string;
  messageId: string;
  feedback: "up" | "down" | null;
  reason?: string;
};

type FeedbackResponse = {
  ok: boolean;
  receivedAt: string;
};

export const useFeedbackMutation = () =>
  useMutation<FeedbackResponse, Error, FeedbackRequest>({
    mutationKey: ["feedback"],
    mutationFn: async (payload) =>
      apiFetch<FeedbackResponse>("/feedback", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  });

