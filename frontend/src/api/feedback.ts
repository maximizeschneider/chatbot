import { useMutation } from "@tanstack/react-query";
import { fetchData } from "./client";

export type FeedbackRequest = {
  conversationId: string;
  messageId: string;
  feedback: "up" | "down" | null;
  reason?: string;
};

export const useFeedbackMutation = (
  tenantId: string | null,
  userId: string | null,
) =>
  useMutation<void, Error, FeedbackRequest>({
    mutationKey: ["feedback", tenantId, userId],
    mutationFn: async ({ conversationId, messageId, feedback, reason }) => {
      if (!tenantId || !userId) {
        throw new Error("Cannot submit feedback without a tenant and user.");
      }

      const feedbackType =
        feedback === "up" ? 1 : feedback === "down" ? 0 : null;

      await fetchData(
        `/api/v1/tenant/${tenantId}/user/${userId}/conversation/${conversationId}/message/${messageId}/feedback`,
        {
          method: "POST",
          body: JSON.stringify({
            feedbackType,
            reason: feedback === "down" ? reason ?? null : null,
            text: feedback === "down" ? reason ?? null : null,
            acknowledged: feedback === "up",
          }),
        },
        "submit feedback",
      );
    },
  });
