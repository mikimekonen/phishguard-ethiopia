import fs from "fs";
import path from "path";
import { prisma } from "../prisma";
import { buildBulkReportPdf, type BulkScanLog } from "./pdfBulkReport";
import { buildCsv } from "./exportCsv";
import { appendAuditLog, computeExportHash, computeExportSignature } from "./audit";

const exportDir = path.join(process.cwd(), "exports");

type ExportJobParams = {
  filters: {
    result?: string;
    inputType?: string;
    riskLevel?: string;
    institution?: string;
    status?: string;
    from?: string;
    to?: string;
    includeDeleted?: boolean;
  };
};

const buildFilters = (params: ExportJobParams["filters"], tenantId: string) => {
  const filters: any = { tenantId };
  if (params.result) filters.result = params.result;
  if (params.inputType) filters.inputType = params.inputType;
  if (params.riskLevel) filters.riskLevel = params.riskLevel;
  if (params.institution) filters.institution = params.institution;
  if (params.status) filters.status = params.status;
  if (!params.includeDeleted) filters.softDeleted = false;
  if (params.from || params.to) {
    filters.createdAt = {};
    if (params.from) filters.createdAt.gte = new Date(params.from);
    if (params.to) filters.createdAt.lte = new Date(params.to);
  }
  return filters;
};

export const startExportWorker = () => {
  fs.mkdirSync(exportDir, { recursive: true });

  setInterval(async () => {
    const job = await prisma.exportJob.findFirst({ where: { status: "queued" }, orderBy: { createdAt: "asc" } });
    if (!job) return;

    await prisma.exportJob.update({ where: { id: job.id }, data: { status: "processing" } });

    try {
      const params = JSON.parse(job.paramsJson) as ExportJobParams;
      const filters = buildFilters(params.filters, job.tenantId);
      const logs = await prisma.detectionLog.findMany({ where: filters, orderBy: { createdAt: "desc" }, take: 1000 });
      const bulkLogs: BulkScanLog[] = logs.map((log) => ({
        id: log.id,
        inputType: log.inputType as "url" | "sms" | "email",
        result: log.result as "safe" | "suspicious" | "phishing",
        confidence: log.confidence,
        riskScore: log.riskScore,
        riskLevel: log.riskLevel as "low" | "medium" | "high" | null,
        contentPreview: log.contentPreview,
        createdAt: log.createdAt,
        institution: log.institution,
        summary: log.summary,
        summaryAm: log.summaryAm,
      }));

      let resultPath = "";
      if (job.type === "bulk_pdf") {
        const doc = buildBulkReportPdf({ logs: bulkLogs, generatedAt: new Date() });
        resultPath = path.join(exportDir, `${job.id}.pdf`);
        const stream = fs.createWriteStream(resultPath);
        doc.pipe(stream);
        doc.end();
        await new Promise<void>((resolve) => stream.on("finish", () => resolve()));
      } else if (job.type === "bulk_csv") {
        resultPath = path.join(exportDir, `${job.id}.csv`);
        fs.writeFileSync(resultPath, buildCsv(logs));
      } else {
        throw new Error("Unsupported export job type");
      }

      const exportHash = computeExportHash({ scope: job.type, ids: logs.map((l: { id: string }) => l.id), tenantId: job.tenantId });
      const exportSignature = computeExportSignature(exportHash);

      await prisma.exportJob.update({
        where: { id: job.id },
        data: { status: "done", resultPath, exportHash },
      });

      await appendAuditLog({
        tenantId: job.tenantId,
        actorId: job.createdById,
        action: "export.job.complete",
        targetType: "ExportJob",
        targetId: job.id,
        metadata: { exportHash, exportSignature, count: logs.length },
      });
    } catch (err: any) {
      await prisma.exportJob.update({
        where: { id: job.id },
        data: { status: "failed", errorMessage: err?.message || "Export failed" },
      });
    }
  }, 5000);
};
