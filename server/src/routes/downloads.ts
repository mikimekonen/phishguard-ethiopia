import { Router } from "express";
import { prisma } from "../prisma";
import { verifySignedDownloadToken } from "../utils/signedDownloads";
import { appendAuditLog } from "../utils/audit";

export const downloadsRouter = Router();

downloadsRouter.get("/downloads/cases/evidence/:id", async (req, res) => {
  const id = req.params.id;
  const token = req.query.token as string | undefined;
  if (!token) return res.status(401).json({ error: "Missing token" });

  const payload = verifySignedDownloadToken(token);
  if (!payload || payload.type !== "case" || payload.id !== id) {
    return res.status(403).json({ error: "Invalid token" });
  }

  const evidence = await prisma.caseEvidenceAttachment.findFirst({
    where: { id, tenantId: payload.tenantId },
  });
  if (!evidence) return res.status(404).json({ error: "Not found" });

  await appendAuditLog({
    tenantId: payload.tenantId,
    action: "case.evidence.download.signed",
    targetType: "CaseEvidenceAttachment",
    targetId: id,
    metadata: { caseId: evidence.caseId },
  });

  return res.download(evidence.storagePath, evidence.filename);
});

downloadsRouter.get("/downloads/logs/evidence/:id", async (req, res) => {
  const id = req.params.id;
  const token = req.query.token as string | undefined;
  if (!token) return res.status(401).json({ error: "Missing token" });

  const payload = verifySignedDownloadToken(token);
  if (!payload || payload.type !== "log" || payload.id !== id) {
    return res.status(403).json({ error: "Invalid token" });
  }

  const evidence = await prisma.evidenceAttachment.findFirst({
    where: { id, tenantId: payload.tenantId },
  });
  if (!evidence) return res.status(404).json({ error: "Not found" });

  await appendAuditLog({
    tenantId: payload.tenantId,
    action: "evidence.download.signed",
    targetType: "EvidenceAttachment",
    targetId: id,
    metadata: { logId: evidence.detectionLogId },
  });

  return res.download(evidence.storagePath, evidence.filename);
});
