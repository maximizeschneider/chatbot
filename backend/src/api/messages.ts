import { Router } from "express";
import {
  conversations,
  getConversationMessages,
  type StoredMessage,
} from "@/data/mock";

const router = Router();

router.get("/:conversationId", (req, res) => {
  const { conversationId } = req.params;

  if (!conversationId) {
    return res.status(400).json({ error: "conversationId is required" });
  }

  const conversationExists = conversations.some(
    (conversation) => conversation.id === conversationId,
  );

  if (!conversationExists) {
    return res.status(404).json({ error: "Conversation not found" });
  }

  const messages = getConversationMessages(conversationId).map(
    ({ id, role, content }: StoredMessage) => ({
      id,
      role,
      content,
    }),
  );

  return res.json({ messages });
});

export const messagesRouter = router;
