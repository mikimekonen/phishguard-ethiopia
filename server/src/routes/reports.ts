import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, requireRole } from "../auth";
import { appendAuditLog } from "../utils/audit";
import { getDefaultTenantId } from "../utils/tenant";

const reportSchema = z.object({
  message: z.string().min(6).max(1000),
  url: z.string().max(500).optional(),
  source: z.string().max(100).optional(),
  reporter: z.string().max(120).optional(),
});

export const publicReportsRouter = Router();
export const adminReportsRouter = Router();
adminReportsRouter.use(requireAuth);

publicReportsRouter.post("/reports", async (req, res) => {
  const parsed = reportSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid report", details: parsed.error.flatten() });
  }
  try {
    const tenantId = await getDefaultTenantId();
    const created = await prisma.communityReport.create({ data: { ...parsed.data, tenantId } });
    await appendAuditLog({
      tenantId,
      action: "report.submit",
      targetType: "CommunityReport",
      targetId: created.id,
      metadata: { source: parsed.data.source },
    });
    return res.status(201).json({ id: created.id });
  } catch (err) {
    return res.status(500).json({ error: "Failed to submit report" });
  }
});

adminReportsRouter.get("/reports", async (req, res) => {
  try {
    const tenantId = (req as any).user.tenantId;
    const reports = await prisma.communityReport.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return res.json({ data: reports });
  } catch (err) {
    return res.status(500).json({ error: "Failed to load reports" });
  }
});

adminReportsRouter.post("/reports/:id/review", requireRole("analyst"), async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Missing id" });
  try {
    const tenantId = (req as any).user.tenantId;
    const existing = await prisma.communityReport.findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Not found" });
    const updated = await prisma.communityReport.update({ where: { id }, data: { reviewed: true } });
    await appendAuditLog({
      tenantId,
      actorId: (req as any).user.sub,
      actorEmail: (req as any).user.email,
      action: "report.review",
      targetType: "CommunityReport",
      targetId: id,
    });
    return res.json({ data: updated });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update report" });
  }
});
