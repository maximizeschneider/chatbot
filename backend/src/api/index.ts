import { Router } from "express";
import {
  ACTIVE_USER,
  TENANTS,
  TECHNICAL_USER_PERMISSIONS,
} from "@/data/mock";
import { chatRouter } from "@/api/chat";
import { configRouter } from "@/api/config";
import { conversationsRouter } from "@/api/conversations";
import { feedbackRouter } from "@/api/feedback";
import { messagesRouter } from "@/api/messages";
import { questionsRouter } from "@/api/questions";
import { testProfilesRouter } from "@/api/test-profiles";

const apiRouter = Router();
const v1Router = Router();

v1Router.get("/status", (_req, res) => {
  res.json({ status: "ok" });
});

v1Router.get("/tenant", (req, res) => {
  const { includeLogo } = req.query;
  const shouldIncludeLogo = includeLogo !== "false";

  const tenants = TENANTS.map((tenant) => {
    if (shouldIncludeLogo) {
      return tenant;
    }
    const { logoUrl, ...rest } = tenant;
    return rest;
  });

  res.json(tenants);
});

v1Router.get("/activeUser", (_req, res) => {
  res.json(ACTIVE_USER);
});

v1Router.get("/tenant/:tenantId/current-technical-user", (req, res) => {
  const { tenantId } = req.params;
  if (!tenantId) {
    return res.status(400).json({ error: "tenantId is required" });
  }

  const permissions =
    TECHNICAL_USER_PERMISSIONS[tenantId] ?? {
      canChat: false,
      canDeleteConversation: false,
      canProvideFeedback: false,
    };

  res.json(permissions);
});

const tenantRouter = Router({ mergeParams: true });
tenantRouter.use("/configuration", configRouter);
tenantRouter.use("/test-profiles", testProfilesRouter);

tenantRouter.use(
  "/user/:userId/conversation",
  conversationsRouter,
);

tenantRouter.use(
  "/user/:userId/conversation/:conversationId/chat",
  chatRouter,
);

tenantRouter.use(
  "/user/:userId/conversation/:conversationId/message",
  messagesRouter,
);

tenantRouter.use(
  "/user/:userId/conversation/:conversationId/message/:messageId/feedback",
  feedbackRouter,
);

tenantRouter.use(
  "/user/:userId/conversation/:conversationId/message/:messageId/questions",
  questionsRouter,
);

v1Router.use("/tenant/:tenantId", tenantRouter);

apiRouter.use("/v1", v1Router);

export { apiRouter };
