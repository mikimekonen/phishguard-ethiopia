import PDFDocument from "pdfkit";
import path from "path";

const FONT_PATH = path.join(process.cwd(), "assets", "fonts", "NotoSansEthiopic.ttf");

type CaseRecord = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  severity: string;
  detectionLogId?: string | null;
  createdAt: Date;
  notes?: Array<{ id: string; message: string; createdAt: Date }>;
  evidence?: Array<{ filename: string; mimeType: string; sizeBytes: number; createdAt: Date; uploadedBy?: { email: string } | null }>;
};

type PDFDocumentType = InstanceType<typeof PDFDocument>;

const addHeader = (doc: PDFDocumentType, title: string) => {
  doc.font(FONT_PATH);
  doc.fontSize(18).fillColor("#0F172A").text("PhishGuard Ethiopia", 40, 40);
  doc.fontSize(12).fillColor("#1F2937").text("Case Evidence Report", 40, 64);
  doc.fontSize(10).fillColor("#6B7280").text(title, 40, 82);
  doc.moveTo(40, 100).lineTo(555, 100).strokeColor("#E5E7EB").stroke();
};

export const buildCasePdf = (record: CaseRecord) => {
  const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true });
  addHeader(doc, record.title);

  let cursorY = 120;
  doc.fontSize(11).fillColor("#111827").text("Case Summary", 40, cursorY);
  cursorY += 16;
  doc.fontSize(9).fillColor("#6B7280").text("Status", 40, cursorY);
  doc.fillColor("#111827").text(record.status, 140, cursorY);
  cursorY += 14;
  doc.fontSize(9).fillColor("#6B7280").text("Severity", 40, cursorY);
  doc.fillColor("#111827").text(record.severity, 140, cursorY);
  cursorY += 14;
  doc.fontSize(9).fillColor("#6B7280").text("Detection Log", 40, cursorY);
  doc.fillColor("#111827").text(record.detectionLogId || "N/A", 140, cursorY);
  cursorY += 14;
  doc.fontSize(9).fillColor("#6B7280").text("Created", 40, cursorY);
  doc.fillColor("#111827").text(record.createdAt.toISOString(), 140, cursorY);

  cursorY += 24;
  doc.fontSize(11).fillColor("#111827").text("Description", 40, cursorY);
  cursorY += 16;
  doc.fontSize(9).fillColor("#111827").text(record.description || "No description", 40, cursorY, { width: 500 });
  cursorY += 36;

  doc.fontSize(11).fillColor("#111827").text("Evidence List", 40, cursorY);
  cursorY += 16;
  const evidence = record.evidence || [];
  if (!evidence.length) {
    doc.fontSize(9).fillColor("#6B7280").text("No evidence attachments.", 40, cursorY);
  } else {
    evidence.forEach((item, idx) => {
      doc.fontSize(9).fillColor("#111827").text(`${idx + 1}. ${item.filename}`, 40, cursorY);
      const by = item.uploadedBy?.email ? ` • ${item.uploadedBy.email}` : "";
      doc.fillColor("#6B7280").text(`${item.mimeType} • ${item.sizeBytes} bytes${by}`, 300, cursorY);
      cursorY += 14;
    });
  }

  cursorY += 20;
  doc.fontSize(11).fillColor("#111827").text("Analyst Notes", 40, cursorY);
  cursorY += 16;
  const notes = record.notes || [];
  if (!notes.length) {
    doc.fontSize(9).fillColor("#6B7280").text("No analyst notes.", 40, cursorY);
  } else {
    notes.forEach((note, idx) => {
      doc.fontSize(9).fillColor("#111827").text(`${idx + 1}. ${note.message}`, 40, cursorY, { width: 500 });
      cursorY += 14;
    });
  }

  return doc;
};

const escapeCsv = (value: string | number | null | undefined) => {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes("\n") || str.includes("\"")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const buildCaseCsv = (record: CaseRecord) => {
  const headers = [
    "case_id",
    "title",
    "status",
    "severity",
    "detection_log_id",
    "created_at",
    "evidence_filename",
    "evidence_mime",
    "evidence_size",
    "evidence_created_at",
    "evidence_uploaded_by",
  ];

  const evidence = record.evidence || [];
  const rows = evidence.length
    ? evidence.map((ev) => [
        record.id,
        record.title,
        record.status,
        record.severity,
        record.detectionLogId || "",
        record.createdAt.toISOString(),
        ev.filename,
        ev.mimeType,
        ev.sizeBytes,
      ev.createdAt.toISOString(),
      ev.uploadedBy?.email || "",
      ])
    : [
        [
          record.id,
          record.title,
          record.status,
          record.severity,
          record.detectionLogId || "",
          record.createdAt.toISOString(),
          "",
          "",
          "",
          "",
          "",
        ],
      ];

  return [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
};
