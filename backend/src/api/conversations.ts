import { Router } from 'express';
import { z } from 'zod';

const router = Router();

const conversations = [
  {
    id: 'seed-1',
    title: 'Welcome Conversation',
    messages: [
      {
        id: 'm-1',
        role: 'assistant' as const,
        content:
          'Hi there! This is a seeded conversation from the demo API. Ask me anything to get started.',
      },
      {
        id: 'm-2',
        role: 'user' as const,
        content: 'Thanks! How do I submit feedback about responses?',
      },
      {
        id: 'm-3',
        role: 'assistant' as const,
        content:
          'Use the thumbs up or thumbs down actions next to any response—this demo will log them for review.',
      },
    ],
  },
];

const CreateConversationSchema = z.object({
  title: z.string().optional(),
});

router.get('/', (_req, res) => {
  res.json({ conversations });
});

router.post('/', (req, res) => {
  const parsed = CreateConversationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid request body',
      details: parsed.error.flatten(),
    });
  }

  const newConversation = {
    id: `seed-${Date.now()}`,
    title: parsed.data.title?.trim().length
      ? parsed.data.title
      : 'New Conversation',
    messages: [] as Array<{
      id: string;
      role: 'assistant' | 'user';
      content: string;
    }>,
  };

  res.status(201).json({ conversation: newConversation });
});

router.delete('/:conversationId', (req, res) => {
  const { conversationId } = req.params;
  if (!conversationId) {
    return res.status(400).json({ error: 'conversationId is required' });
  }
  res.status(204).send();
});

export const conversationsRouter = router;

