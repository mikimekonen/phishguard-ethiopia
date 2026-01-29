import { Router } from "express";
import type { DetectionLog } from "@prisma/client";
import { requireAuth, requireRole } from "../auth";
import { prisma } from "../prisma";
import { buildSingleScanPdf } from "../utils/pdfReport";
import { buildBulkReportPdf } from "../utils/pdfBulkReport";
import { z } from "zod";
import { appendAuditLog, computeExportHash, computeExportSignature } from "../utils/audit";

export const exportsRouter = Router();
exportsRouter.use(requireAuth);

const listQuery = z.object({
  result: z.enum(["safe", "suspicious", "phishing"]).optional(),
  inputType: z.enum(["url", "sms", "email"]).optional(),
  riskLevel: z.enum(["high", "medium", "low"]).optional(),
  institution: z.enum(["Telebirr", "CBE", "Dashen", "Awash"]).optional(),
  status: z.enum(["pending", "confirmed_phishing", "false_positive"]).optional(),
  includeDeleted: z.coerce.boolean().optional().default(false),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const buildFilters = (data: z.infer<typeof listQuery> & { tenantId: string }) => {
  const { result, inputType, riskLevel, institution, status, includeDeleted, from, to } = data;
  const filters: any = { tenantId: data.tenantId };
  if (result) filters.result = result;
  if (inputType) filters.inputType = inputType;
  if (riskLevel) filters.riskLevel = riskLevel;
  if (institution) filters.institution = institution;
  if (status) filters.status = status;
  if (!includeDeleted) filters.softDeleted = false;
  if (from || to) {
    filters.createdAt = {};
    if (from) filters.createdAt.gte = from;
    if (to) filters.createdAt.lte = to;
  }
  return filters;
};

exportsRouter.get("/exports/scans/:id/pdf", requireRole("analyst"), async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "Missing id" });
  const tenantId = (req as any).user.tenantId;

  const log = await prisma.detectionLog.findFirst({ where: { id, tenantId } });
  if (!log) return res.status(404).json({ error: "Not found" });

  const indicators = (() => {
    try {
      const parsed = JSON.parse(log.indicatorsJson || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  const doc = buildSingleScanPdf({
    id: log.id,
    inputType: log.inputType as any,
    result: log.result as any,
    confidence: log.confidence,
    riskScore: log.riskScore ?? undefined,
    riskLevel: (log.riskLevel as any) ?? undefined,
    contentPreview: log.contentPreview ?? undefined,
    createdAt: log.createdAt,
    institution: log.institution ?? undefined,
    summary: log.summary ?? undefined,
    summaryAm: log.summaryAm ?? undefined,
    indicators: indicators,
  });

  const exportHash = computeExportHash({
    scope: "single",
    id: log.id,
    createdAt: log.createdAt.toISOString(),
    result: log.result,
    riskScore: log.riskScore,
    tenantId,
  });

  const exportSignature = computeExportSignature(exportHash);

  await appendAuditLog({
    tenantId,
    actorId: (req as any).user.sub,
    actorEmail: (req as any).user.email,
    action: "export.single",
    targetType: "DetectionLog",
    targetId: log.id,
    metadata: { exportHash, exportSignature },
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="phishguard-scan-${log.id.slice(0, 8)}.pdf"`);
  res.setHeader("X-Export-Hash", exportHash);
  res.setHeader("X-Export-Signature", exportSignature);
  doc.pipe(res);
  doc.end();
});

exportsRouter.get("/exports/scans/pdf", requireRole("analyst"), async (req, res) => {
  const parsed = listQuery.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query", details: parsed.error.flatten() });
  }
  const tenantId = (req as any).user.tenantId;
  const filters = buildFilters({ ...parsed.data, tenantId });
  const logs = (await prisma.detectionLog.findMany({
    where: filters,
    orderBy: { createdAt: "desc" },
    take: 500,
  })) as DetectionLog[];

  const doc = buildBulkReportPdf({
    logs: logs.map((log) => ({
      id: log.id,
      inputType: log.inputType as any,
      result: log.result as any,
      confidence: log.confidence,
      riskScore: log.riskScore ?? undefined,
      riskLevel: (log.riskLevel as any) ?? undefined,
      contentPreview: log.contentPreview ?? undefined,
      createdAt: log.createdAt,
      institution: log.institution ?? undefined,
      summary: log.summary ?? undefined,
      summaryAm: log.summaryAm ?? undefined,
    })),
    generatedAt: new Date(),
  });

  const exportHash = computeExportHash({
    scope: "bulk",
    total: logs.length,
    from: parsed.data.from || null,
    to: parsed.data.to || null,
    tenantId,
    ids: logs.map((log) => log.id),
  });

  const exportSignature = computeExportSignature(exportHash);

  await appendAuditLog({
    tenantId,
    actorId: (req as any).user.sub,
    actorEmail: (req as any).user.email,
    action: "export.bulk",
    targetType: "DetectionLog",
    metadata: { exportHash, exportSignature, count: logs.length },
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="phishguard-scans-${Date.now()}.pdf"`);
  res.setHeader("X-Export-Hash", exportHash);
  res.setHeader("X-Export-Signature", exportSignature);
  doc.pipe(res);
  doc.end();
});

const exportJobSchema = z.object({
  type: z.enum(["bulk_pdf", "bulk_csv"]),
  filters: z.object({
    result: z.string().optional(),
    inputType: z.string().optional(),
    riskLevel: z.string().optional(),
    institution: z.string().optional(),
    status: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    includeDeleted: z.boolean().optional(),
  }).default({}),
});

exportsRouter.post("/exports/jobs", requireRole("analyst"), async (req, res) => {
  const parsed = exportJobSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid job", details: parsed.error.flatten() });
  }
  const tenantId = (req as any).user.tenantId;
  const job = await prisma.exportJob.create({
    data: {
      tenantId,
      type: parsed.data.type,
      paramsJson: JSON.stringify({ filters: parsed.data.filters }),
      createdById: (req as any).user.sub,
    },
  });

  await appendAuditLog({
    tenantId,
    actorId: (req as any).user.sub,
    actorEmail: (req as any).user.email,
    action: "export.job.create",
    targetType: "ExportJob",
    targetId: job.id,
    metadata: { type: job.type },
  });

  return res.status(201).json({ data: job });
});

exportsRouter.get("/exports/jobs/:id", requireRole("analyst"), async (req, res) => {
  const id = req.params.id;
  const tenantId = (req as any).user.tenantId;
  const job = await prisma.exportJob.findFirst({ where: { id, tenantId } });
  if (!job) return res.status(404).json({ error: "Not found" });
  return res.json({ data: job });
});

exportsRouter.get("/exports/jobs/:id/download", requireRole("analyst"), async (req, res) => {
  const id = req.params.id;
  const tenantId = (req as any).user.tenantId;
  const job = await prisma.exportJob.findFirst({ where: { id, tenantId } });
  if (!job || !job.resultPath || job.status !== "done") {
    return res.status(404).json({ error: "Export not ready" });
  }

  const exportSignature = job.exportHash ? computeExportSignature(job.exportHash) : "";
  if (job.exportHash) res.setHeader("X-Export-Hash", job.exportHash);
  if (exportSignature) res.setHeader("X-Export-Signature", exportSignature);
  return res.download(job.resultPath);
});
