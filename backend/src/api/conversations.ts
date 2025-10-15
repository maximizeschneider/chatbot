import { Router } from "express";
import { z } from "zod";
import type { ModelMessage } from "ai";

const router = Router();

const conversations: { id: string; title: string; messages: ModelMessage[] }[] = [
  {
    id: "seed-1",
    title: "Welcome Conversation",
    messages: [
      {
        role: "assistant",
        content: "Hi there! I'm your AI assistant. How can I help you today?",
      },
      {
        role: "user",
        content: "What can you help me with?",
      },
      {
        role: "tool",
        content: [{
          type: "tool-result",
          toolCallId: "get-capabilities-1",
          toolName: "get_capabilities",
          output: {
            type: "text",
            value: "Available capabilities: code assistance, data analysis, general questions"
          }
        }]
      },
      {
        role: "assistant",
        content: "I can help you with several things including:\n1. Code assistance\n2. Data analysis\n3. General questions\nWhat would you like to explore?",
      },
    ],
  },
];

const CreateConversationSchema = z.object({
  title: z.string().optional(),
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

  const newConversation = {
    id: `seed-${Date.now()}`,
    title: parsed.data.title?.trim().length
      ? parsed.data.title
      : "New Conversation",
    messages: [] as Array<{
      id: string;
      role: "assistant" | "user";
      content: string;
    }>,
  };

  conversations.push(newConversation);
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
  res.status(204).send();
});

export const conversationsRouter = router;

