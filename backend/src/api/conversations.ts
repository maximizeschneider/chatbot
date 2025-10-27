import { Router } from "express";
import { z } from "zod";
import {
  conversations,
  ensureConversationMessages,
  messagesByConversation,
  type StoredConversation,
} from "@/data/mock";

const router = Router();

const CreateConversationSchema = z.object({
  name: z.string().optional(),
});

router.get("/", (_req, res) => {
  res.json({ conversations });
});

router.post("/", (req, res) => {
  const parsed = CreateConversationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: parsed.error.flatten(),
    });
  }

  const trimmedName = parsed.data.name?.trim();
  const newConversation: StoredConversation = {
    id: `conv-${Date.now()}`,
    name: trimmedName && trimmedName.length > 0 ? trimmedName : "New Conversation",
  };

  conversations.unshift(newConversation);
  ensureConversationMessages(newConversation.id);

  res.status(201).json({ conversation: newConversation });
});

router.delete("/:conversationId", (req, res) => {
  const { conversationId } = req.params;
  if (!conversationId) {
    return res.status(400).json({ error: "conversationId is required" });
  }

  const index = conversations.findIndex((conv) => conv.id === conversationId);
  if (index === -1) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  conversations.splice(index, 1);
  delete messagesByConversation[conversationId];

  res.status(204).send();
});

export const conversationsRouter = router;
