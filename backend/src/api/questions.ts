import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const QuestionRequestSchema = z.object({
  messageId: z.string().optional(),
  conversationId: z.string().optional(),
  text: z.string().optional(),
});

router.post('/', (req, res) => {
  const parsed = QuestionRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid question generation payload',
      details: parsed.error.flatten(),
    });
  }

  const { conversationId, messageId, text } = parsed.data;
  const baseTopic =
    text?.slice(0, 40) ??
    (messageId ? `message ${messageId}` : 'your recent conversation');

  res.json({
    questions: [
      `What follow-up details can you share about ${baseTopic}?`,
      `Are there constraints or edge cases for ${baseTopic}?`,
      `How should success be measured when addressing ${baseTopic}?`,
    ],
    conversationId,
    messageId,
    generatedAt: new Date().toISOString(),
  });
});

export const questionsRouter = router;

