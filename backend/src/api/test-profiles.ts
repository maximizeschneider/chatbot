import { Router } from "express";
import { TEST_PROFILES_BY_TENANT } from "@/data/mock";

export const testProfilesRouter = Router({ mergeParams: true });

testProfilesRouter.get("/", (req, res) => {
  const { tenantId } = req.params as { tenantId?: string };

  if (!tenantId) {
    return res.status(400).json({ error: "tenantId is required" });
  }

  const profiles = TEST_PROFILES_BY_TENANT[tenantId] ?? [];
  return res.json(profiles);
});
