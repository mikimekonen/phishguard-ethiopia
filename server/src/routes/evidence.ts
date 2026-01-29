import { Router, Request } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { prisma } from "../prisma";
import { requireAuth, requireRole } from "../auth";
import { appendAuditLog } from "../utils/audit";
import { allowedMimeTypes, safeUnlink, validateUploadedFile } from "../utils/uploadSecurity";
import { buildSignedUrl, createSignedDownloadToken } from "../utils/signedDownloads";

const uploadRoot = path.join(process.cwd(), "uploads", "evidence");
const storage = multer.diskStorage({
  destination: (req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    const logId = req.params.id;
    const dir = path.join(uploadRoot, logId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  },
});

const signedUrlTtlSeconds = Number(process.env.SIGNED_URL_TTL_SECONDS || 600);

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

export const evidenceRouter = Router();
evidenceRouter.use(requireAuth);

// Upload evidence attachment
evidenceRouter.post("/logs/:id/evidence", requireRole("analyst"), upload.single("file"), async (req, res) => {
  const logId = req.params.id;
  if (!logId) return res.status(400).json({ error: "Missing id" });
  const tenantId = (req as any).user.tenantId;

  const log = await prisma.detectionLog.findFirst({ where: { id: logId, tenantId } });
  if (!log) return res.status(404).json({ error: "Detection log not found" });
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) return res.status(400).json({ error: "Missing file" });

  const validation = await validateUploadedFile(file);
  if (!validation.ok) {
    safeUnlink(file.path);
    return res.status(400).json({ error: validation.reason });
  }

  const attachment = await prisma.evidenceAttachment.create({
    data: {
      tenantId,
      detectionLogId: logId,
      filename: file.originalname,
      mimeType: validation.normalizedMime,
      sizeBytes: file.size,
      storagePath: file.path,
      uploadedById: (req as any).user.sub,
    },
  });

  await appendAuditLog({
    tenantId,
    actorId: (req as any).user.sub,
    actorEmail: (req as any).user.email,
    action: "evidence.upload",
    targetType: "EvidenceAttachment",
    targetId: attachment.id,
    metadata: { logId },
  });

  return res.status(201).json({ data: attachment });
});

// List evidence for a scan
evidenceRouter.get("/logs/:id/evidence", async (req, res) => {
  const logId = req.params.id;
  const tenantId = (req as any).user.tenantId;
  const attachments = await prisma.evidenceAttachment.findMany({
    where: { detectionLogId: logId, tenantId },
    orderBy: { createdAt: "desc" },
  });
  return res.json({ data: attachments });
});

// Download evidence
evidenceRouter.get("/evidence/:id/download", async (req, res) => {
  const id = req.params.id;
  const tenantId = (req as any).user.tenantId;
  const attachment = await prisma.evidenceAttachment.findFirst({ where: { id, tenantId } });
  if (!attachment) return res.status(404).json({ error: "Not found" });
  res.download(attachment.storagePath, attachment.filename);
});

evidenceRouter.get("/evidence/:id/signed-url", requireRole("analyst"), async (req, res) => {
  const id = req.params.id;
  const tenantId = (req as any).user.tenantId;
  const attachment = await prisma.evidenceAttachment.findFirst({ where: { id, tenantId } });
  if (!attachment) return res.status(404).json({ error: "Not found" });

  const token = createSignedDownloadToken({ id, tenantId, type: "log" }, signedUrlTtlSeconds);
  const url = buildSignedUrl(req, `/downloads/logs/evidence/${id}`, token);
  return res.json({ url, expiresAt: new Date(Date.now() + signedUrlTtlSeconds * 1000).toISOString() });
});
