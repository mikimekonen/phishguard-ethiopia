import type { DetectionLog } from "@prisma/client";

const escapeCsv = (value: string | number | null | undefined) => {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes("\n") || str.includes("\"")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const buildCsv = (logs: DetectionLog[]) => {
  const headers = [
    "scan_id",
    "scan_type",
    "verdict",
    "risk_level",
    "risk_score",
    "confidence",
    "target_institution",
    "content_preview",
    "created_at",
  ];

  const rows = logs.map((log) => [
    log.id,
    log.inputType,
    log.result,
    log.riskLevel,
    log.riskScore ?? "",
    log.confidence,
    log.institution ?? "Unclassified",
    log.contentPreview ?? "",
    log.createdAt.toISOString(),
  ]);

  return [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
};
