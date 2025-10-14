import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    user: {
      id: 'guest-user',
      name: 'Guest User',
      email: 'guest@example.com',
      profiles: ['Guest', 'Power User', 'Analyst'],
      activeProfile: 'Guest',
      featureFlags: {
        canSubmitFeedback: true,
        canGenerateQuestions: true,
      },
    },
  });
});

export const userRouter = router;

