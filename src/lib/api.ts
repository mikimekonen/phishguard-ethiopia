const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8787";
const ADMIN_API_URL = `${API_URL}/admin`;

export type DetectionLogPayload = {
  inputType: "url" | "sms" | "email";
  result: "safe" | "suspicious" | "phishing";
  confidence: number;
  aiScore?: number;
  riskScore?: number;
  riskLevel?: "high" | "medium" | "low";
  indicators: {
    name: string;
    nameAm?: string;
    detected: boolean;
    severity: "high" | "medium" | "low";
    description?: string;
  }[];
  summary?: string;
  summaryAm?: string;
  contentPreview?: string;
  trustedDomain?: boolean;
  institution?: "Telebirr" | "CBE" | "Dashen" | "Awash";
  attackType?: "url" | "sms" | "email";
};

export type DetectResponse = {
  status: "Phishing Detected" | "Suspicious Content" | "Safe Content";
  riskScore: number;
  riskLevel: "safe" | "suspicious" | "high" | "critical";
  confidence: number;
  targetInstitution: string;
  indicators: {
    credentialIntent: "low" | "medium" | "high";
    bankImpersonation: "low" | "medium" | "high";
    suspiciousLinks: "low" | "medium" | "high";
    shortenedLinks: "low" | "medium" | "high";
    urgencyLanguage: "low" | "medium" | "high";
    grammarSpelling: "low" | "medium" | "high";
  };
  recommendation: string;
  explanation: string;
  explanationAmharic: string;
  explanationIndicators?: Array<{
    name: string;
    nameAm: string;
    severity: "low" | "medium" | "high";
    description: string;
    descriptionAm: string;
  }>;
  localIntelMatches?: Array<{
    type: "domain" | "shortcode" | "pattern";
    label: string;
    detail: string;
    severity: "low" | "medium" | "high";
  }>;
  playbook?: {
    id: string;
    name: string;
    actions: string[];
    rationale: string;
  };
};

export type MalwareScanResponse = {
  verdict: "CLEAN" | "SUSPICIOUS" | "MALICIOUS" | "UNKNOWN";
  verdictLabel: string;
  verdictLabelAm?: string;
  confidenceBand?: "safe" | "suspicious" | "malware";
  confidence: number;
  malwareFamily?: string;
  behaviorSummary?: string;
  warning?: string;
  sourceLabel?: string;
};

export type MalwareScanAdmin = {
  id: string;
  hashSha256: string;
  verdict: string;
  malwareFamily?: string | null;
  behaviorSummary?: string | null;
  confidenceScore: number;
  targetPlatform?: string | null;
  deliveryMethod?: string | null;
  impersonatedInstitution?: string | null;
  firstSeen?: string | null;
  lastSeen?: string | null;
  classification?: string | null;
  behaviorIndicators?: string[];
  sourceProvider?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MalwareScanRow = {
  id: string;
  fileName?: string | null;
  fileHash: string;
  verdict: "CLEAN" | "SUSPICIOUS" | "MALICIOUS" | "UNKNOWN";
  malwareFamily?: string | null;
  malwareType?: string | null;
  threatLabel?: string | null;
  threatTags?: string[];
  md5?: string | null;
  sha1?: string | null;
  fileSize?: number | null;
  fileTypeDescription?: string | null;
  entropy?: number | null;
  suspiciousStrings?: string[];
  detectionEngines?: Array<{ engine: string; category: string; result: string | null }>;
  detectionTimestamp?: string | null;
  behaviorDescription?: string | null;
  impactDescription?: string | null;
  mitigationSuggestions?: string | null;
  descriptionAm?: string | null;
  iocs?: Record<string, unknown> | null;
  staticFeatures?: Record<string, unknown> | null;
  dynamicFeatures?: Record<string, unknown> | null;
  confidenceScore: number;
  riskScore?: number | null;
  maliciousCount?: number | null;
  suspiciousCount?: number | null;
  harmlessCount?: number | null;
  platform: "windows" | "android" | "pdf" | "archive" | "unknown";
  fileType?: string | null;
  source: "upload" | "email" | "url" | string;
  intelProvider?: string | null;
  scannedAt?: string;
  createdAt: string;
};

export type DetectionLog = {
  id: string;
  inputType: "url" | "sms" | "email";
  result: "safe" | "suspicious" | "phishing";
  confidence: number;
  aiScore?: number | null;
  riskScore?: number | null;
  riskLevel?: "high" | "medium" | "low" | null;
  indicators: DetectionLogPayload["indicators"];
  summary?: string | null;
  summaryAm?: string | null;
  contentPreview?: string | null;
  createdAt: string;
  trustedDomain: boolean;
  institution?: "Telebirr" | "CBE" | "Dashen" | "Awash" | null;
  attackType?: "url" | "sms" | "email" | null;
  status?: "pending" | "confirmed_phishing" | "false_positive" | null;
  softDeleted?: boolean | null;
  localIntel?: DetectResponse["localIntelMatches"] | null;
  playbook?: DetectResponse["playbook"] | null;
};

export type CaseNote = {
  id: string;
  caseId: string;
  authorId: string;
  message: string;
  createdAt: string;
};

export type CaseRecord = {
  id: string;
  title: string;
  description?: string | null;
  status: "new" | "triaged" | "investigating" | "resolved" | "closed";
  severity: "low" | "medium" | "high" | "critical";
  detectionLogId?: string | null;
  createdById: string;
  assignedToId?: string | null;
  createdAt: string;
  notes?: CaseNote[];
  evidence?: Array<{
    id: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: string;
    uploadedBy?: { email: string } | null;
  }>;
};

function authHeaders(token?: string) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed with ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function logDetection(payload: DetectionLogPayload) {
  const res = await fetch(`${API_URL}/logs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleJson<{ id: string }>(res);
}

export async function detectContent(type: "url" | "sms" | "email", content: string) {
  const res = await fetch(`${API_URL}/api/detect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, content }),
  });
  return handleJson<DetectResponse>(res);
}

export async function scanMalwareFile(file: File, meta?: { deliveryMethod?: string; impersonatedInstitution?: string }) {
  const formData = new FormData();
  formData.append("file", file);
  if (meta?.deliveryMethod) formData.append("deliveryMethod", meta.deliveryMethod);
  if (meta?.impersonatedInstitution) formData.append("impersonatedInstitution", meta.impersonatedInstitution);
  const res = await fetch(`${API_URL}/api/malware/scan`, {
    method: "POST",
    body: formData,
  });
  return handleJson<MalwareScanResponse>(res);
}

export async function loginAdmin(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleJson<{ token: string; email: string }>(res);
}

export async function fetchLogs(token: string, params?: {
  result?: string;
  inputType?: string;
  riskLevel?: string;
  institution?: string;
  status?: string;
  from?: string;
  to?: string;
  includeDeleted?: boolean;
}) {
  const qs = new URLSearchParams();
  if (params?.result) qs.set("result", params.result);
  if (params?.inputType) qs.set("inputType", params.inputType);
  if (params?.riskLevel) qs.set("riskLevel", params.riskLevel);
  if (params?.institution) qs.set("institution", params.institution);
  if (params?.status) qs.set("status", params.status);
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  if (params?.includeDeleted) qs.set("includeDeleted", String(params.includeDeleted));
  const res = await fetch(`${ADMIN_API_URL}/logs?${qs.toString()}`, {
    headers: { ...authHeaders(token) },
  });
  return handleJson<{ data: DetectionLog[]; nextCursor: string | null }>(res);
}

export async function fetchAllLogs(token: string, params?: {
  result?: string;
  inputType?: string;
  riskLevel?: string;
  institution?: string;
  status?: string;
  from?: string;
  to?: string;
  includeDeleted?: boolean;
}) {
  const qs = new URLSearchParams();
  if (params?.result) qs.set("result", params.result);
  if (params?.inputType) qs.set("inputType", params.inputType);
  if (params?.riskLevel) qs.set("riskLevel", params.riskLevel);
  if (params?.institution) qs.set("institution", params.institution);
  if (params?.status) qs.set("status", params.status);
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  if (params?.includeDeleted) qs.set("includeDeleted", String(params.includeDeleted));
  const res = await fetch(`${ADMIN_API_URL}/logs/export?${qs.toString()}`, {
    headers: { ...authHeaders(token) },
  });
  return handleJson<{ data: DetectionLog[] }>(res);
}

export async function fetchStats(token: string) {
  const res = await fetch(`${ADMIN_API_URL}/stats`, { headers: { ...authHeaders(token) } });
  return handleJson<{ total: number; phishing: number; suspicious: number; safe: number; recentByType: any[] }>(res);
}

export async function fetchMalwareStats(token: string) {
  const res = await fetch(`${ADMIN_API_URL}/malware/stats?refresh=1`, { headers: { ...authHeaders(token) } });
  return handleJson<MalwareStatsPayload>(res);
}

export type MalwareStatsPayload = {
  total: number;
  verdicts: {
    CLEAN: number;
    SUSPICIOUS: number;
    MALICIOUS: number;
    UNKNOWN: number;
  };
  averageRiskScore: number;
  highRiskScans: number;
  intelProviders: Array<{ provider: string; count: number }>;
  topFamilies: Array<{ name: string; count: number }>;
  topTypes: Array<{ name: string; count: number }>;
  topThreatLabels: Array<{ name: string; count: number }>;
  trends: {
    daily: Array<{ date: string; counts: { CLEAN: number; SUSPICIOUS: number; MALICIOUS: number; UNKNOWN: number } }>;
    weekly: Array<{ weekStart: string; counts: { CLEAN: number; SUSPICIOUS: number; MALICIOUS: number; UNKNOWN: number } }>;
  };
  lastUpdated: string;
};

export async function fetchMalwareScans(token: string) {
  const res = await fetch(`${ADMIN_API_URL}/malware/scans`, { headers: { ...authHeaders(token) } });
  return handleJson<{ data: MalwareScanAdmin[] }>(res);
}

export async function fetchAdminMalwareScans(token: string, params?: {
  page?: number;
  limit?: number;
  verdict?: "CLEAN" | "SUSPICIOUS" | "MALICIOUS" | "UNKNOWN";
  platform?: "windows" | "android" | "pdf" | "archive" | "unknown";
  from?: string;
  to?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.verdict) qs.set("verdict", params.verdict);
  if (params?.platform) qs.set("platform", params.platform);
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  const res = await fetch(`${API_URL}/api/admin/malware-scans?${qs.toString()}`, {
    headers: { ...authHeaders(token) },
  });
  return handleJson<{ total: number; rows: MalwareScanRow[] }>(res);
}

export async function rescanMalwareScan(token: string, scanId: string) {
  const res = await fetch(`${API_URL}/api/admin/malware/${scanId}/rescan`, {
    method: "POST",
    headers: { ...authHeaders(token) },
  });
  return handleJson<{
    ok: boolean;
    message: string;
    verdict?: MalwareScanRow["verdict"];
    riskScore?: number;
    changed?: boolean;
  }>(res);
}

export async function downloadMalwareExportCsv(token: string) {
  const res = await fetch(`${ADMIN_API_URL}/malware/exports/csv`, { headers: { ...authHeaders(token) } });
  if (!res.ok) throw new Error(`Export failed with ${res.status}`);
  return res.blob();
}

export async function downloadMalwareExportPdf(token: string) {
  const res = await fetch(`${ADMIN_API_URL}/malware/exports/pdf`, { headers: { ...authHeaders(token) } });
  if (!res.ok) throw new Error(`Export failed with ${res.status}`);
  return res.blob();
}

export async function downloadMalwareScanPdf(token: string, scanId: string) {
  const res = await fetch(`${ADMIN_API_URL}/malware/exports/${scanId}/pdf`, { headers: { ...authHeaders(token) } });
  if (!res.ok) throw new Error(`Export failed with ${res.status}`);
  return res.blob();
}

export async function fetchTrustedDomains(token: string) {
  const res = await fetch(`${ADMIN_API_URL}/trusted-domains`, { headers: { ...authHeaders(token) } });
  return handleJson<{ data: any[] }>(res);
}

export async function addTrustedDomain(token: string, domain: string) {
  const res = await fetch(`${ADMIN_API_URL}/trusted-domains`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ domain }),
  });
  return handleJson<{ data: any }>(res);
}

export async function updateTrustedDomain(token: string, id: string, domain: string) {
  const res = await fetch(`${ADMIN_API_URL}/trusted-domains/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ domain }),
  });
  return handleJson<{ data: any }>(res);
}

export async function deleteTrustedDomain(token: string, id: string) {
  const res = await fetch(`${ADMIN_API_URL}/trusted-domains/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders(token) },
  });
  if (!res.ok) throw new Error(`Failed to delete domain (${res.status})`);
}

export async function updateDetection(token: string, id: string, payload: { status?: string; softDeleted?: boolean }) {
  const res = await fetch(`${ADMIN_API_URL}/logs/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(payload),
  });
  return handleJson<{ data: DetectionLog }>(res);
}

export async function fetchCases(token: string, params?: {
  status?: string;
  severity?: string;
  assignedToId?: string;
  limit?: number;
  cursor?: string | null;
}) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.severity) qs.set("severity", params.severity);
  if (params?.assignedToId) qs.set("assignedToId", params.assignedToId);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.cursor) qs.set("cursor", params.cursor);
  const res = await fetch(`${ADMIN_API_URL}/cases?${qs.toString()}`, { headers: { ...authHeaders(token) } });
  return handleJson<{ data: CaseRecord[]; nextCursor: string | null }>(res);
}

export async function createCase(token: string, payload: {
  title: string;
  description?: string;
  severity?: "low" | "medium" | "high" | "critical";
  detectionLogId?: string;
  assignedToId?: string;
}) {
  const res = await fetch(`${ADMIN_API_URL}/cases`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(payload),
  });
  return handleJson<{ data: CaseRecord }>(res);
}

export async function updateCase(token: string, id: string, payload: {
  status?: "new" | "triaged" | "investigating" | "resolved" | "closed";
  severity?: "low" | "medium" | "high" | "critical";
  assignedToId?: string | null;
  title?: string;
  description?: string;
}) {
  const res = await fetch(`${ADMIN_API_URL}/cases/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(payload),
  });
  return handleJson<{ data: CaseRecord }>(res);
}

export async function addCaseNote(token: string, id: string, message: string) {
  const res = await fetch(`${ADMIN_API_URL}/cases/${id}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({ message }),
  });
  return handleJson<{ data: CaseNote }>(res);
}

export async function uploadCaseEvidence(token: string, caseId: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${ADMIN_API_URL}/cases/${caseId}/evidence`, {
    method: "POST",
    headers: { ...authHeaders(token) },
    body: form,
  });
  return handleJson<{ data: any }>(res);
}

export async function fetchCaseEvidence(token: string, caseId: string) {
  const res = await fetch(`${ADMIN_API_URL}/cases/${caseId}/evidence`, {
    headers: { ...authHeaders(token) },
  });
  return handleJson<{ data: any[] }>(res);
}

export async function downloadCaseEvidence(token: string, evidenceId: string) {
  const res = await fetch(`${ADMIN_API_URL}/cases/evidence/${evidenceId}/download`, {
    headers: { ...authHeaders(token) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed with ${res.status}`);
  }
  return res.blob();
}

export async function getCaseEvidenceSignedUrl(token: string, evidenceId: string) {
  const res = await fetch(`${ADMIN_API_URL}/cases/evidence/${evidenceId}/signed-url`, {
    headers: { ...authHeaders(token) },
  });
  return handleJson<{ url: string; expiresAt: string }>(res);
}

export async function deleteCaseEvidence(token: string, evidenceId: string) {
  const res = await fetch(`${ADMIN_API_URL}/cases/evidence/${evidenceId}`, {
    method: "DELETE",
    headers: { ...authHeaders(token) },
  });
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed with ${res.status}`);
  }
}

export async function downloadCaseExportPdf(token: string, caseId: string) {
  const res = await fetch(`${ADMIN_API_URL}/cases/${caseId}/export/pdf`, {
    headers: { ...authHeaders(token) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed with ${res.status}`);
  }
  return res.blob();
}

export async function downloadCaseExportCsv(token: string, caseId: string) {
  const res = await fetch(`${ADMIN_API_URL}/cases/${caseId}/export/csv`, {
    headers: { ...authHeaders(token) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed with ${res.status}`);
  }
  return res.blob();
}

export async function createExportJob(token: string, payload: {
  type: "bulk_pdf" | "bulk_csv";
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
}) {
  const res = await fetch(`${ADMIN_API_URL}/exports/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify(payload),
  });
  return handleJson<{ data: { id: string; status: string } }>(res);
}

export async function fetchExportJob(token: string, id: string) {
  const res = await fetch(`${ADMIN_API_URL}/exports/jobs/${id}`, { headers: { ...authHeaders(token) } });
  return handleJson<{ data: { id: string; status: string; errorMessage?: string } }>(res);
}

export async function downloadExportJob(token: string, id: string) {
  const res = await fetch(`${ADMIN_API_URL}/exports/jobs/${id}/download`, {
    headers: { ...authHeaders(token) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed with ${res.status}`);
  }
  return res.blob();
}

export async function fetchAnalytics(token: string) {
  const res = await fetch(`${ADMIN_API_URL}/analytics`, { headers: { ...authHeaders(token) } });
  return handleJson<{
    mostTargeted: string | null;
    mostTargetedCount: number;
    mostCommonAttack: string | null;
    mostCommonAttackCount: number;
    dailyCounts: Record<string, number>;
    institutions: Array<{ institution: string | null; _count: { _all: number } }>;
    attackTypes: Array<{ attackType: string | null; _count: { _all: number } }>;
  }>(res);
}

export async function submitReport(payload: { message: string; url?: string; source?: string; reporter?: string }) {
  const res = await fetch(`${API_URL}/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleJson<{ id: string }>(res);
}

export async function fetchScanPdf(token: string, id: string) {
  const res = await fetch(`${ADMIN_API_URL}/exports/scans/${id}/pdf`, {
    headers: { ...authHeaders(token) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed with ${res.status}`);
  }
  return res.blob();
}

export async function fetchBulkPdf(
  token: string,
  params?: {
    result?: string;
    inputType?: string;
    riskLevel?: string;
    institution?: string;
    status?: string;
    from?: string;
    to?: string;
    includeDeleted?: boolean;
  },
) {
  const qs = new URLSearchParams();
  if (params?.result) qs.set("result", params.result);
  if (params?.inputType) qs.set("inputType", params.inputType);
  if (params?.riskLevel) qs.set("riskLevel", params.riskLevel);
  if (params?.institution) qs.set("institution", params.institution);
  if (params?.status) qs.set("status", params.status);
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  if (params?.includeDeleted) qs.set("includeDeleted", String(params.includeDeleted));

  const res = await fetch(`${ADMIN_API_URL}/exports/scans/pdf?${qs.toString()}`, {
    headers: { ...authHeaders(token) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed with ${res.status}`);
  }
  return res.blob();
}

export async function uploadEvidence(token: string, logId: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${ADMIN_API_URL}/logs/${logId}/evidence`, {
    method: "POST",
    headers: { ...authHeaders(token) },
    body: form,
  });
  return handleJson<{ data: any }>(res);
}

export async function fetchEvidence(token: string, logId: string) {
  const res = await fetch(`${ADMIN_API_URL}/logs/${logId}/evidence`, {
    headers: { ...authHeaders(token) },
  });
  return handleJson<{ data: any[] }>(res);
}

export async function downloadEvidence(token: string, evidenceId: string) {
  const res = await fetch(`${ADMIN_API_URL}/evidence/${evidenceId}/download`, {
    headers: { ...authHeaders(token) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed with ${res.status}`);
  }
  return res.blob();
}
