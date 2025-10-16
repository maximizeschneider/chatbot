import { Router } from "express";
import { z } from "zod";
import { conversations, messages } from "@/api/data";

const router = Router();

const CreateConversationSchema = z.object({
  title: z.string().optional(),
});

const UpdateConversationSchema = z.object({
  title: z.string().min(1),
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

  const title = parsed.data.title?.trim();
  const newConversation = {
    id: `conv-${Date.now()}`,
    title: title && title.length > 0 ? title : "New Conversation",
  };

  conversations.unshift(newConversation);
  res.status(201).json({ conversation: newConversation });
});

router.patch("/:conversationId", (req, res) => {
  const { conversationId } = req.params;
  const parsed = UpdateConversationSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: parsed.error.flatten(),
    });
  }

  const conversation = conversations.find((conv) => conv.id === conversationId);
  if (!conversation) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  conversation.title = parsed.data.title.trim();
  res.json({ conversation });
});

router.get("/:conversationId/messages", (req, res) => {
  const { conversationId } = req.params;
  const conversation = conversations.find((conv) => conv.id === conversationId);

  if (!conversation) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  const conversationMessages = messages
    .filter(
      (message) =>
        message.conversationId === conversationId && message.role !== "tool"
    )
    .map((message) => ({
      id: message.id,
      conversationId: message.conversationId,
      role: message.role,
      content: typeof message.content === "string" ? message.content : "",
    }));

  res.json({ messages: conversationMessages });
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

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.conversationId === conversationId) {
      messages.splice(i, 1);
    }
  }

  res.status(204).send();
});

export const conversationsRouter = router;
