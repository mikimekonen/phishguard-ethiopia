import { Router } from "express";
import { requireAuth, requireRole } from "../auth";
import { getMetrics } from "../utils/metrics";

export const metricsRouter = Router();
metricsRouter.use(requireAuth, requireRole("admin"));

metricsRouter.get("/metrics", (_req, res) => {
  return res.json(getMetrics());
});
