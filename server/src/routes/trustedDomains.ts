import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, requireRole } from "../auth";
import { appendAuditLog } from "../utils/audit";

const domainSchema = z.object({ domain: z.string().trim().toLowerCase().min(3).max(255) });
const updateSchema = z.object({ domain: z.string().trim().toLowerCase().min(3).max(255) });

export const trustedDomainsRouter = Router();

trustedDomainsRouter.get("/trusted-domains", requireAuth, async (req, res) => {
  try {
    const tenantId = (req as any).user.tenantId;
    const domains = await prisma.trustedDomain.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });
    return res.json({ data: domains });
  } catch (err) {
    return res.status(500).json({ error: "Failed to load domains" });
  }
});

trustedDomainsRouter.post("/trusted-domains", requireAuth, requireRole("admin"), async (req, res) => {
  const parsed = domainSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid domain" });
  }
  try {
    const tenantId = (req as any).user.tenantId;
    const created = await prisma.trustedDomain.create({
      data: { tenantId, domain: parsed.data.domain, createdBy: (req as any).user?.email },
    });
    await appendAuditLog({
      tenantId,
      actorId: (req as any).user.sub,
      actorEmail: (req as any).user.email,
      action: "trustedDomain.create",
      targetType: "TrustedDomain",
      targetId: created.id,
      metadata: { domain: created.domain },
    });
    return res.status(201).json({ data: created });
  } catch (err) {
    return res.status(500).json({ error: "Failed to add domain" });
  }
});

trustedDomainsRouter.delete("/trusted-domains/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Missing id" });
  try {
    const tenantId = (req as any).user.tenantId;
    const existing = await prisma.trustedDomain.findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Not found" });
    await prisma.trustedDomain.delete({ where: { id } });
    await appendAuditLog({
      tenantId,
      actorId: (req as any).user.sub,
      actorEmail: (req as any).user.email,
      action: "trustedDomain.delete",
      targetType: "TrustedDomain",
      targetId: id,
      metadata: { domain: existing.domain },
    });
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete domain" });
  }
});

trustedDomainsRouter.patch("/trusted-domains/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Missing id" });
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid domain" });
  try {
    const tenantId = (req as any).user.tenantId;
    const existing = await prisma.trustedDomain.findFirst({ where: { id, tenantId } });
    if (!existing) return res.status(404).json({ error: "Not found" });
    const updated = await prisma.trustedDomain.update({
      where: { id },
      data: { domain: parsed.data.domain },
    });
    await appendAuditLog({
      tenantId,
      actorId: (req as any).user.sub,
      actorEmail: (req as any).user.email,
      action: "trustedDomain.update",
      targetType: "TrustedDomain",
      targetId: id,
      metadata: { domain: parsed.data.domain },
    });
    return res.json({ data: updated });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update domain" });
  }
});
