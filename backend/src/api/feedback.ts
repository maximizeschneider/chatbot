import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const FeedbackSchema = z.object({
  conversationId: z.string().min(1),
  messageId: z.string().min(1),
  feedback: z.enum(['up', 'down']).nullable(),
  reason: z.string().optional(),
});

router.post('/', (req, res) => {
  const parsed = FeedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid feedback payload',
      details: parsed.error.flatten(),
    });
  }

  const { conversationId, messageId, feedback, reason } = parsed.data;

  console.info('Feedback received', {
    conversationId,
    messageId,
    feedback,
    reason,
  });

  res.json({
    ok: true,
    receivedAt: new Date().toISOString(),
  });
});

export const feedbackRouter = router;

