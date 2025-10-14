import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    options: ['Default', 'Creative', 'Precise'],
    defaultOption: 'Default',
    updatedAt: new Date().toISOString(),
    flags: {
      questionGenerationEnabled: true,
      feedbackEnabled: true,
    },
  });
});

export const configRouter = router;

