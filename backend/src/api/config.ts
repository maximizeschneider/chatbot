import { Router } from "express";
import { CONFIGURATIONS_BY_TENANT } from "@/data/mock";

export const configRouter = Router({ mergeParams: true });

configRouter.get("/", (req, res) => {
  const { tenantId } = req.params as { tenantId?: string };

  if (!tenantId) {
    return res.status(400).json({ error: "tenantId is required" });
  }

  const configs = CONFIGURATIONS_BY_TENANT[tenantId] ?? [];
  return res.json(configs);
});
