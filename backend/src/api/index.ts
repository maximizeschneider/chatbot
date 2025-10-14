import { Router } from 'express';
import { chatRouter } from '@/api/chat';
import { configRouter } from '@/api/config';
import { conversationsRouter } from '@/api/conversations';
import { feedbackRouter } from '@/api/feedback';
import { questionsRouter } from '@/api/questions';
import { userRouter } from '@/api/user';

const apiRouter = Router();

apiRouter.use('/chat', chatRouter);
apiRouter.use('/config', configRouter);
apiRouter.use('/conversations', conversationsRouter);
apiRouter.use('/feedback', feedbackRouter);
apiRouter.use('/questions', questionsRouter);
apiRouter.use('/user', userRouter);

export { apiRouter };

