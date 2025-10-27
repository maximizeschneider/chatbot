import { Router } from "express";
import {
  HARDCODED_SOURCES,
  findMessageById,
} from "@/data/mock";

const router = Router();

router.get("/:messageId", (req, res) => {
  const { messageId } = req.params;

  if (!messageId) {
    return res.status(400).json({ error: "messageId is required" });
  }

  const message = findMessageById(messageId);

  if (!message) {
    return res.status(404).json({ error: "Message not found" });
  }

  const sources = message.sources ?? HARDCODED_SOURCES;
  return res.json({ sources });
});

export const sourcesRouter = router;
