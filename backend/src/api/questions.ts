import { Router } from "express";

export const questionsRouter = Router({ mergeParams: true });

questionsRouter.get("/", (req, res) => {
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

  const { configName } = req.query;
  const context =
    typeof configName === "string" && configName.length > 0
      ? ` with configuration "${configName}"`
      : "";

  const suggestions = [
    `Can you expand on the previous answer${context}?`,
    `What risks should be considered${context}?`,
    `What follow-up actions are recommended${context}?`,
  ];

  return res.json(suggestions);
});
