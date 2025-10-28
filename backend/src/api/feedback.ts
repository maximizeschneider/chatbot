import { Router } from "express";
import { z } from "zod";
import { upsertFeedback } from "@/data/mock";

const FeedbackSchema = z.object({
  feedbackType: z.union([z.literal(1), z.literal(0)]).nullable(),
  reason: z.string().nullish(),
  text: z.string().nullish(),
  acknowledged: z.boolean().optional(),
});

export const feedbackRouter = Router({ mergeParams: true });

feedbackRouter.post("/", (req, res) => {
  const { tenantId, userId, conversationId, messageId } = req.params as {
    tenantId?: string;
    userId?: string;
    conversationId?: string;
    messageId?: string;
  };

  if (!tenantId || !userId || !conversationId || !messageId) {
    return res.status(400).json({
      error:
        "tenantId, userId, conversationId, and messageId are required parameters",
    });
  }

  const parsed = FeedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid feedback payload",
      details: parsed.error.flatten(),
    });
  }

  const payload =
    parsed.data.feedbackType === null
      ? null
      : {
          feedbackType: parsed.data.feedbackType,
          reason: parsed.data.reason ?? null,
          text: parsed.data.text ?? null,
          acknowledged: parsed.data.acknowledged ?? false,
        };

  const updatedMessage = upsertFeedback(
    tenantId,
    userId,
    conversationId,
    messageId,
    payload,
  );

  if (!updatedMessage) {
    return res.status(404).json({ error: "Message not found" });
  }

  return res.json(updatedMessage);
});
