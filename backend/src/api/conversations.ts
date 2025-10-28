import { Router } from "express";
import { z } from "zod";
import {
  createConversation,
  deleteConversation,
  findConversation,
  listConversations,
  updateConversationTitle,
} from "@/data/mock";

const CreateConversationSchema = z.object({
  title: z.string().optional(),
});

const UpdateConversationSchema = z.object({
  title: z.string().min(1),
});

export const conversationsRouter = Router({ mergeParams: true });

conversationsRouter.get("/", (req, res) => {
  const { tenantId, userId } = req.params as {
    tenantId?: string;
    userId?: string;
  };
  if (!tenantId || !userId) {
    return res.status(400).json({ error: "tenantId and userId are required" });
  }

  const conversations = listConversations(tenantId, userId);
  return res.json(conversations);
});

conversationsRouter.post("/", (req, res) => {
  const { tenantId, userId } = req.params as {
    tenantId?: string;
    userId?: string;
  };
  if (!tenantId || !userId) {
    return res.status(400).json({ error: "tenantId and userId are required" });
  }

  const parsed = CreateConversationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: parsed.error.flatten(),
    });
  }

  const conversation = createConversation(
    tenantId,
    userId,
    parsed.data.title ?? undefined,
  );
  return res.status(201).json(conversation);
});

conversationsRouter.get("/:conversationId", (req, res) => {
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

  const conversation = findConversation(tenantId, userId, conversationId);
  if (!conversation) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  return res.json(conversation);
});

conversationsRouter.put("/:conversationId", (req, res) => {
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

  const parsed = UpdateConversationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: parsed.error.flatten(),
    });
  }

  const conversation = updateConversationTitle(
    tenantId,
    userId,
    conversationId,
    parsed.data.title,
  );

  if (!conversation) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  return res.json(conversation);
});

conversationsRouter.delete("/:conversationId", (req, res) => {
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

  const deleted = deleteConversation(tenantId, userId, conversationId);
  if (!deleted) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  return res.status(204).send();
});
