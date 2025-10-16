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

const MessageQuerySchema = z.object({
  limit: z
    .preprocess((value) => (typeof value === "string" ? Number(value) : value), z.number().int().positive().max(100))
    .optional(),
  cursor: z
    .preprocess((value) => (typeof value === "string" ? Number(value) : value), z.number().int().nonnegative())
    .optional(),
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

  const parsedQuery = MessageQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    return res.status(400).json({
      error: "Invalid query parameters",
      details: parsedQuery.error.flatten(),
    });
  }

  const { limit = 10, cursor } = parsedQuery.data;

  const sortedMessages = messages
    .filter(
      (message) =>
        message.conversationId === conversationId && message.role !== "tool"
    )
    .sort((a, b) => b.createdAt - a.createdAt);

  const filteredByCursor = typeof cursor === "number"
    ? sortedMessages.filter((message) => message.createdAt < cursor)
    : sortedMessages;

  const page = filteredByCursor.slice(0, limit);
  const nextCursor =
    page.length === limit
      ? page[page.length - 1]?.createdAt ?? null
      : null;

  const orderedMessages = [...page]
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((message) => ({
      id: message.id,
      conversationId: message.conversationId,
      role: message.role,
      content: typeof message.content === "string" ? message.content : "",
      createdAt: message.createdAt,
    }));

  res.json({ messages: orderedMessages, nextCursor });
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
