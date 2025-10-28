import { Router } from "express";
import { findMessage, listMessages } from "@/data/mock";

export const messagesRouter = Router({ mergeParams: true });

messagesRouter.get("/", (req, res) => {
  const { tenantId, userId, conversationId } = req.params as {
    tenantId?: string;
    userId?: string;
    conversationId?: string;
  };

  if (!tenantId || !userId || !conversationId) {
    return res.status(400).json({
      error: "tenantId, userId, and conversationId are required",
    });
  }

  const messages = listMessages(tenantId, userId, conversationId);
  if (!messages) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  return res.json(messages);
});

messagesRouter.get("/:messageId", (req, res) => {
  const { tenantId, userId, conversationId, messageId } = req.params as {
    tenantId?: string;
    userId?: string;
    conversationId?: string;
    messageId?: string;
  };

  if (!tenantId || !userId || !conversationId || !messageId) {
    return res.status(400).json({
      error: "tenantId, userId, conversationId, and messageId are required",
    });
  }

  const message = findMessage(tenantId, userId, conversationId, messageId);
  if (!message) {
    return res.status(404).json({ error: "Message not found" });
  }

  return res.json(message);
});
