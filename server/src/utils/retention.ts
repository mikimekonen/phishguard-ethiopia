import fs from "fs";
import { prisma } from "../prisma";
import { appendAuditLog } from "./audit";

const EVIDENCE_RETENTION_DAYS = Number(process.env.EVIDENCE_RETENTION_DAYS || 90);
const EXPORT_RETENTION_DAYS = Number(process.env.EXPORT_RETENTION_DAYS || 30);
const RETENTION_INTERVAL_MS = 24 * 60 * 60 * 1000;

const safeUnlink = (filePath?: string | null) => {
  if (!filePath) return;
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

const groupByTenant = <T extends { tenantId: string }>(items: T[]) => {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item.tenantId] = (acc[item.tenantId] || 0) + 1;
    return acc;
  }, {});
};

export async function runRetentionPurge() {
  const now = Date.now();
  const evidenceCutoff = new Date(now - EVIDENCE_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const exportCutoff = new Date(now - EXPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const [logEvidence, caseEvidence] = await Promise.all([
    prisma.evidenceAttachment.findMany({ where: { createdAt: { lt: evidenceCutoff } } }),
    prisma.caseEvidenceAttachment.findMany({ where: { createdAt: { lt: evidenceCutoff } } }),
  ]);

  for (const item of logEvidence) {
    safeUnlink(item.storagePath);
    await prisma.evidenceAttachment.delete({ where: { id: item.id } });
  }

  for (const item of caseEvidence) {
    safeUnlink(item.storagePath);
    await prisma.caseEvidenceAttachment.delete({ where: { id: item.id } });
  }

  const exportJobs = await prisma.exportJob.findMany({
    where: {
      createdAt: { lt: exportCutoff },
      status: "done",
      resultPath: { not: null },
    },
  });

  for (const job of exportJobs) {
    safeUnlink(job.resultPath);
    await prisma.exportJob.delete({ where: { id: job.id } });
  }

  const logCounts = groupByTenant(logEvidence);
  const caseCounts = groupByTenant(caseEvidence);
  const exportCounts = groupByTenant(exportJobs);

  const tenantIds = Array.from(new Set([
    ...Object.keys(logCounts),
    ...Object.keys(caseCounts),
    ...Object.keys(exportCounts),
  ]));

  for (const tenantId of tenantIds) {
    await appendAuditLog({
      tenantId,
      action: "retention.purge",
      targetType: "Retention",
      metadata: {
        logEvidence: logCounts[tenantId] || 0,
        caseEvidence: caseCounts[tenantId] || 0,
        exportJobs: exportCounts[tenantId] || 0,
        evidenceCutoff: evidenceCutoff.toISOString(),
        exportCutoff: exportCutoff.toISOString(),
      },
    });
  }
}

export function startRetentionJob() {
  runRetentionPurge().catch((err) => console.error("Retention purge failed", err));
  setInterval(() => {
    runRetentionPurge().catch((err) => console.error("Retention purge failed", err));
  }, RETENTION_INTERVAL_MS);
}
