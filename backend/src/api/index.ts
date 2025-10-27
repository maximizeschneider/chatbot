import { Router } from "express";
import { chatRouter } from "@/api/chat";
import { configRouter } from "@/api/config";
import { conversationsRouter } from "@/api/conversations";
import { feedbackRouter } from "@/api/feedback";
import { messagesRouter } from "@/api/messages";
import { questionsRouter } from "@/api/questions";
import { sourcesRouter } from "@/api/sources";
import { userProfileRouter } from "@/api/user-profile";

const apiRouter = Router();

apiRouter.use("/chat", chatRouter);
apiRouter.use("/config", configRouter);
apiRouter.use("/conversations", conversationsRouter);
apiRouter.use("/messages", messagesRouter);
apiRouter.use("/feedback", feedbackRouter);
apiRouter.use("/questions", questionsRouter);
apiRouter.use("/sources", sourcesRouter);
apiRouter.use("/user-profile", userProfileRouter);

export { apiRouter };
