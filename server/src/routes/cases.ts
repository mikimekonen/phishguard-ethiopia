import { Router, Request } from "express";
import { z } from "zod";
import path from "path";
import fs from "fs";
import multer from "multer";
import { prisma } from "../prisma";
import { requireAuth, requireRole } from "../auth";
import { appendAuditLog } from "../utils/audit";
import { buildCasePdf } from "../utils/caseReport.js";
import { buildCaseCsv } from "../utils/caseReport.js";
import { computeExportHash, computeExportSignature } from "../utils/audit";
import { allowedMimeTypes, safeUnlink, validateUploadedFile } from "../utils/uploadSecurity";
import { buildSignedUrl, createSignedDownloadToken } from "../utils/signedDownloads";

export const casesRouter = Router();
casesRouter.use(requireAuth);

const uploadRoot = path.join(process.cwd(), "uploads", "cases");
const signedUrlTtlSeconds = Number(process.env.SIGNED_URL_TTL_SECONDS || 600);
const storage = multer.diskStorage({
  destination: (req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    const caseId = req.params.id;
    const dir = path.join(uploadRoot, caseId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!(allowedMimeTypes as readonly string[]).includes(file.mimetype)) {
      return cb(new Error("Unsupported file type"));
    }
    return cb(null, true);
  },
});

const createCaseSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  detectionLogId: z.string().optional(),
  assignedToId: z.string().optional(),
});

const updateCaseSchema = z.object({
  status: z.enum(["new", "triaged", "investigating", "resolved", "closed"]).optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  assignedToId: z.string().optional().nullable(),
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(2000).optional(),
});

const noteSchema = z.object({
  message: z.string().min(3).max(2000),
});

const casesListQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(50),
  cursor: z.string().optional(),
  status: z.enum(["new", "triaged", "investigating", "resolved", "closed"]).optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  assignedToId: z.string().optional(),
});

casesRouter.get("/cases", async (req, res) => {
  const parsed = casesListQuery.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query", details: parsed.error.flatten() });
  }

  const tenantId = (req as any).user.tenantId;
  const { limit, cursor, status, severity, assignedToId } = parsed.data;

  const where: any = { tenantId };
  if (status) where.status = status;
  if (severity) where.severity = severity;
  if (assignedToId) where.assignedToId = assignedToId;

  try {
    const cases = await prisma.case.findMany({
      take: limit + 1,
      where,
      orderBy: { createdAt: "desc" },
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : undefined,
      include: {
        detectionLog: true,
        assignedTo: true,
        createdBy: true,
        notes: true,
        evidence: { include: { uploadedBy: { select: { email: true } } } },
      },
    });
    const hasMore = cases.length > limit;
    const sliced = hasMore ? cases.slice(0, limit) : cases;
    return res.json({ data: sliced, nextCursor: hasMore ? sliced[sliced.length - 1].id : null });
  } catch (err) {
    return res.status(500).json({ error: "Failed to load cases" });
  }
});

casesRouter.post("/cases", requireRole("analyst"), async (req, res) => {
  const parsed = createCaseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid case", details: parsed.error.flatten() });
  }
  const tenantId = (req as any).user.tenantId;

  if (parsed.data.detectionLogId) {
    const log = await prisma.detectionLog.findFirst({
      where: { id: parsed.data.detectionLogId, tenantId },
    });
    if (!log) return res.status(404).json({ error: "Detection log not found" });
  }

  try {
    const created = await prisma.case.create({
      data: {
        tenantId,
        title: parsed.data.title,
        description: parsed.data.description,
        severity: parsed.data.severity,
        detectionLogId: parsed.data.detectionLogId,
        assignedToId: parsed.data.assignedToId,
        createdById: (req as any).user.sub,
      },
    });

    await appendAuditLog({
      tenantId,
      actorId: (req as any).user.sub,
      actorEmail: (req as any).user.email,
      action: "case.create",
      targetType: "Case",
      targetId: created.id,
      metadata: { severity: created.severity },
    });

    return res.status(201).json({ data: created });
  } catch (err) {
    return res.status(500).json({ error: "Failed to create case" });
  }
});

casesRouter.patch("/cases/:id", requireRole("analyst"), async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Missing id" });
  const parsed = updateCaseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid update", details: parsed.error.flatten() });
  }

  const tenantId = (req as any).user.tenantId;
  const existing = await prisma.case.findFirst({ where: { id, tenantId } });
  if (!existing) return res.status(404).json({ error: "Not found" });

  try {
    const updated = await prisma.case.update({ where: { id }, data: parsed.data });
    await appendAuditLog({
      tenantId,
      actorId: (req as any).user.sub,
      actorEmail: (req as any).user.email,
      action: "case.update",
      targetType: "Case",
      targetId: id,
      metadata: parsed.data,
    });
    return res.json({ data: updated });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update case" });
  }
});

casesRouter.post("/cases/:id/notes", requireRole("analyst"), async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Missing id" });
  const parsed = noteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid note", details: parsed.error.flatten() });
  }

  const tenantId = (req as any).user.tenantId;
  const existing = await prisma.case.findFirst({ where: { id, tenantId } });
  if (!existing) return res.status(404).json({ error: "Not found" });

  try {
    const note = await prisma.caseNote.create({
      data: {
        caseId: id,
        authorId: (req as any).user.sub,
        message: parsed.data.message,
      },
    });

    await appendAuditLog({
      tenantId,
      actorId: (req as any).user.sub,
      actorEmail: (req as any).user.email,
      action: "case.note.create",
      targetType: "CaseNote",
      targetId: note.id,
      metadata: { caseId: id },
    });

    return res.status(201).json({ data: note });
  } catch (err) {
    return res.status(500).json({ error: "Failed to add note" });
  }
});

casesRouter.post("/cases/:id/evidence", requireRole("analyst"), upload.single("file"), async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Missing id" });
  const tenantId = (req as any).user.tenantId;
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) return res.status(400).json({ error: "Missing file" });

  const validation = await validateUploadedFile(file);
  if (!validation.ok) {
    safeUnlink(file.path);
    return res.status(400).json({ error: validation.reason });
  }

  const existing = await prisma.case.findFirst({ where: { id, tenantId } });
  if (!existing) return res.status(404).json({ error: "Case not found" });

  const attachment = await prisma.caseEvidenceAttachment.create({
    data: {
      tenantId,
      caseId: id,
      filename: file.originalname,
      mimeType: validation.normalizedMime,
      sizeBytes: file.size,
      storagePath: file.path,
      uploadedById: (req as any).user.sub,
    },
    include: { uploadedBy: { select: { email: true } } },
  });

  await appendAuditLog({
    tenantId,
    actorId: (req as any).user.sub,
    actorEmail: (req as any).user.email,
    action: "case.evidence.upload",
    targetType: "CaseEvidenceAttachment",
    targetId: attachment.id,
    metadata: { caseId: id, mimeType: file.mimetype, size: file.size },
  });

  return res.status(201).json({ data: attachment });
});

casesRouter.get("/cases/evidence/:id/signed-url", requireRole("analyst"), async (req, res) => {
  const id = req.params.id;
  const tenantId = (req as any).user.tenantId;
  const evidence = await prisma.caseEvidenceAttachment.findFirst({ where: { id, tenantId } });
  if (!evidence) return res.status(404).json({ error: "Not found" });

  const token = createSignedDownloadToken({ id, tenantId, type: "case" }, signedUrlTtlSeconds);
  const url = buildSignedUrl(req, `/downloads/cases/evidence/${id}`, token);
  return res.json({ url, expiresAt: new Date(Date.now() + signedUrlTtlSeconds * 1000).toISOString() });
});

casesRouter.get("/cases/:id/evidence", async (req, res) => {
  const id = req.params.id;
  const tenantId = (req as any).user.tenantId;
  const evidence = await prisma.caseEvidenceAttachment.findMany({
    where: { caseId: id, tenantId },
    orderBy: { createdAt: "desc" },
    include: { uploadedBy: { select: { email: true } } },
  });
  return res.json({ data: evidence });
});

casesRouter.get("/cases/evidence/:id/download", async (req, res) => {
  const id = req.params.id;
  const tenantId = (req as any).user.tenantId;
  const evidence = await prisma.caseEvidenceAttachment.findFirst({ where: { id, tenantId } });
  if (!evidence) return res.status(404).json({ error: "Not found" });
  return res.download(evidence.storagePath, evidence.filename);
});

casesRouter.delete("/cases/evidence/:id", requireRole("analyst"), async (req, res) => {
  const id = req.params.id;
  const tenantId = (req as any).user.tenantId;
  const evidence = await prisma.caseEvidenceAttachment.findFirst({ where: { id, tenantId } });
  if (!evidence) return res.status(404).json({ error: "Not found" });

  await prisma.caseEvidenceAttachment.delete({ where: { id } });
  if (fs.existsSync(evidence.storagePath)) {
    fs.unlinkSync(evidence.storagePath);
  }

  await appendAuditLog({
    tenantId,
    actorId: (req as any).user.sub,
    actorEmail: (req as any).user.email,
    action: "case.evidence.delete",
    targetType: "CaseEvidenceAttachment",
    targetId: id,
    metadata: { caseId: evidence.caseId },
  });

  return res.status(204).send();
});

casesRouter.get("/cases/:id/export/pdf", requireRole("analyst"), async (req, res) => {
  const id = req.params.id;
  const tenantId = (req as any).user.tenantId;
  const record = await prisma.case.findFirst({
    where: { id, tenantId },
    include: { notes: true, evidence: { include: { uploadedBy: { select: { email: true } } } } },
  });
  if (!record) return res.status(404).json({ error: "Not found" });

  const doc = buildCasePdf(record);
  const exportHash = computeExportHash({ scope: "case_pdf", caseId: id, tenantId });
  const exportSignature = computeExportSignature(exportHash);

  await appendAuditLog({
    tenantId,
    actorId: (req as any).user.sub,
    actorEmail: (req as any).user.email,
    action: "case.export.pdf",
    targetType: "Case",
    targetId: id,
    metadata: { exportHash, exportSignature },
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="phishguard-case-${id.slice(0, 8)}.pdf"`);
  res.setHeader("X-Export-Hash", exportHash);
  res.setHeader("X-Export-Signature", exportSignature);
  doc.pipe(res);
  doc.end();
});

casesRouter.get("/cases/:id/export/csv", requireRole("analyst"), async (req, res) => {
  const id = req.params.id;
  const tenantId = (req as any).user.tenantId;
  const record = await prisma.case.findFirst({
    where: { id, tenantId },
    include: { notes: true, evidence: { include: { uploadedBy: { select: { email: true } } } } },
  });
  if (!record) return res.status(404).json({ error: "Not found" });

  const csv = buildCaseCsv(record);
  const exportHash = computeExportHash({ scope: "case_csv", caseId: id, tenantId });
  const exportSignature = computeExportSignature(exportHash);

  await appendAuditLog({
    tenantId,
    actorId: (req as any).user.sub,
    actorEmail: (req as any).user.email,
    action: "case.export.csv",
    targetType: "Case",
    targetId: id,
    metadata: { exportHash, exportSignature },
  });

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="phishguard-case-${id.slice(0, 8)}.csv"`);
  res.setHeader("X-Export-Hash", exportHash);
  res.setHeader("X-Export-Signature", exportSignature);
  return res.send(csv);
});
