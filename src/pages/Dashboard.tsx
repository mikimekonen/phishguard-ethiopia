import { useEffect, useMemo, useRef, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import {
  BarChart3,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Link2,
  MessageSquare,
  Mail,
  Calendar,
  Download,
  Filter,
  Plus,
  Trash,
  CheckCircle2,
  XCircle,
  Pencil,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DetectionLog,
  fetchLogs,
  fetchStats,
  fetchTrustedDomains,
  addTrustedDomain,
  deleteTrustedDomain,
  updateTrustedDomain,
  updateDetection,
  fetchAnalytics,
  fetchAllLogs,
  fetchScanPdf,
  fetchCases,
  createCase,
  updateCase,
  addCaseNote,
  createExportJob,
  fetchExportJob,
  downloadExportJob,
  uploadEvidence,
  fetchEvidence,
  downloadEvidence,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { CSVLink } from "react-csv";
import { buildCsvRows } from "@/lib/export";

type StatCard = { label: string; labelAm: string; value: string; icon: any; color: string; bgColor: string };

const Dashboard = () => {
  const { token, clear } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<{ total: number; phishing: number; safe: number; recentByType: any[] } | null>(null);
  const [logs, setLogs] = useState<DetectionLog[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [newDomain, setNewDomain] = useState("");
  const [editingDomainId, setEditingDomainId] = useState<string | null>(null);
  const [editingDomainValue, setEditingDomainValue] = useState("");
  const [exportLogs, setExportLogs] = useState<DetectionLog[]>([]);
  const [exporting, setExporting] = useState(false);
  const [csvReady, setCsvReady] = useState(false);
  const [newCase, setNewCase] = useState({
    title: "",
    description: "",
    severity: "medium",
    detectionLogId: "",
  });
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const csvLinkRef = useRef<any>(null);
  const [filters, setFilters] = useState({
    inputType: "",
    riskLevel: "",
    institution: "",
    status: "",
    from: "",
    to: "",
    includeDeleted: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (activeFilters = filters) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [statsRes, logsRes, domainsRes, casesRes] = await Promise.all([
        fetchStats(token),
        fetchLogs(token, {
          inputType: activeFilters.inputType || undefined,
          riskLevel: activeFilters.riskLevel || undefined,
          institution: activeFilters.institution || undefined,
          status: activeFilters.status || undefined,
          from: activeFilters.from || undefined,
          to: activeFilters.to || undefined,
          includeDeleted: activeFilters.includeDeleted || undefined,
        }),
        fetchTrustedDomains(token),
        fetchCases(token),
      ]);
      setStats(statsRes);
      setLogs(logsRes.data || []);
      setDomains(domainsRes.data || []);
      setCases(casesRes.data || []);
      try {
        const analyticsRes = await fetchAnalytics(token);
        setAnalytics(analyticsRes);
      } catch (analyticsErr: any) {
        setAnalytics(null);
        console.warn("Analytics fetch failed", analyticsErr);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard");
      if (err.message?.includes("Unauthorized")) {
        clear();
        navigate("/admin/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  useEffect(() => {
    if (csvReady && csvLinkRef.current) {
      csvLinkRef.current.link.click();
      setCsvReady(false);
      setExporting(false);
    }
  }, [csvReady]);

  const statCards: StatCard[] = useMemo(() => {
    const total = stats?.total ?? 0;
    const phishing = stats?.phishing ?? 0;
    const safe = stats?.safe ?? 0;
    const detectionRate = total ? `${((phishing / total) * 100).toFixed(1)}%` : "0%";
    return [
      {
        label: "Total Scans",
        labelAm: "ጠቅላላ ፍተሻዎች",
        value: total.toLocaleString(),
        icon: BarChart3,
        color: "text-primary",
        bgColor: "bg-primary/10",
      },
      {
        label: "Threats Detected",
        labelAm: "የተገኙ ስጋቶች",
        value: phishing.toLocaleString(),
        icon: ShieldAlert,
        color: "text-destructive",
        bgColor: "bg-destructive/10",
      },
      {
        label: "Safe Content",
        labelAm: "ደህንነቱ የተጠበቀ",
        value: safe.toLocaleString(),
        icon: ShieldCheck,
        color: "text-success",
        bgColor: "bg-success/10",
      },
      {
        label: "Detection Rate",
        labelAm: "መለያ ደረጃ",
        value: detectionRate,
        icon: TrendingUp,
        color: "text-secondary",
        bgColor: "bg-secondary/10",
      },
    ];
  }, [stats]);

  const handleAddDomain = async () => {
    if (!newDomain.trim() || !token) return;
    try {
      const res = await addTrustedDomain(token, newDomain.trim());
      setDomains((prev) => [res.data, ...prev]);
      setNewDomain("");
    } catch (err: any) {
      setError(err.message || "Failed to add domain");
    }
  };

  const handleEditDomain = async (id: string) => {
    if (!token || !editingDomainValue.trim()) return;
    try {
      const res = await updateTrustedDomain(token, id, editingDomainValue.trim());
      setDomains((prev) => prev.map((d) => (d.id === id ? res.data : d)));
      setEditingDomainId(null);
      setEditingDomainValue("");
    } catch (err: any) {
      setError(err.message || "Failed to update domain");
    }
  };

  const handleDeleteDomain = async (id: string) => {
    if (!token) return;
    await deleteTrustedDomain(token, id);
    setDomains((prev) => prev.filter((d) => d.id !== id));
  };

  const handleStatusUpdate = async (id: string, status: "confirmed_phishing" | "false_positive" | "pending") => {
    if (!token) return;
    try {
      const res = await updateDetection(token, id, { status });
      setLogs((prev) => prev.map((log) => (log.id === id ? res.data : log)));
    } catch (err: any) {
      setError(err.message || "Failed to update detection status");
    }
  };

  const handleSoftDelete = async (id: string) => {
    if (!token) return;
    try {
      const res = await updateDetection(token, id, { softDeleted: true });
      setLogs((prev) => {
        if (!filters.includeDeleted) {
          return prev.filter((log) => log.id !== id);
        }
        return prev.map((log) => (log.id === id ? res.data : log));
      });
    } catch (err: any) {
      setError(err.message || "Failed to delete detection");
    }
  };

  const handleUploadEvidence = async (id: string, file: File | null) => {
    if (!token || !file) return;
    try {
      await uploadEvidence(token, id, file);
    } catch (err: any) {
      setError(err.message || "Failed to upload evidence");
    }
  };

  const handleViewEvidence = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetchEvidence(token, id);
      const first = res.data?.[0];
      if (!first) {
        setError("No evidence attachments for this scan.");
        return;
      }
      const blob = await downloadEvidence(token, first.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = first.filename || `evidence-${first.id}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || "Failed to download evidence");
    }
  };

  const handleCreateCase = async () => {
    if (!token || !newCase.title.trim()) return;
    try {
      const res = await createCase(token, {
        title: newCase.title.trim(),
        description: newCase.description.trim() || undefined,
        severity: newCase.severity as any,
        detectionLogId: newCase.detectionLogId.trim() || undefined,
      });
      setCases((prev) => [res.data, ...prev]);
      setNewCase({ title: "", description: "", severity: "medium", detectionLogId: "" });
    } catch (err: any) {
      setError(err.message || "Failed to create case");
    }
  };

  const handleCaseUpdate = async (id: string, payload: { status?: string; severity?: string }) => {
    if (!token) return;
    try {
      const res = await updateCase(token, id, payload as any);
      setCases((prev) => prev.map((c) => (c.id === id ? res.data : c)));
    } catch (err: any) {
      setError(err.message || "Failed to update case");
    }
  };

  const handleAddCaseNote = async (id: string) => {
    if (!token) return;
    const message = noteInputs[id]?.trim();
    if (!message) return;
    try {
      const res = await addCaseNote(token, id, message);
      setCases((prev) => prev.map((c) => (c.id === id ? { ...c, notes: [...(c.notes || []), res.data] } : c)));
      setNoteInputs((prev) => ({ ...prev, [id]: "" }));
    } catch (err: any) {
      setError(err.message || "Failed to add note");
    }
  };

  const handleDownloadScanPdf = async (id: string) => {
    if (!token) return;
    try {
      const blob = await fetchScanPdf(token, id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `phishguard-scan-${id.slice(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || "Failed to download PDF");
    }
  };

  const waitForJob = async (jobId: string) => {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const res = await fetchExportJob(token as string, jobId);
      if (res.data.status === "done") return res.data;
      if (res.data.status === "failed") throw new Error(res.data.errorMessage || "Export failed");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    throw new Error("Export is taking too long. Please try again.");
  };

  const loadExportData = async () => {
    if (!token) return [] as DetectionLog[];
    const res = await fetchAllLogs(token, {
      inputType: filters.inputType || undefined,
      riskLevel: filters.riskLevel || undefined,
      institution: filters.institution || undefined,
      status: filters.status || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      includeDeleted: filters.includeDeleted || undefined,
    });
    return res.data || [];
  };

  const handleExportAllPdf = async () => {
    if (!token) return;
    setExporting(true);
    try {
      const job = await createExportJob(token, {
        type: "bulk_pdf",
        filters: {
          inputType: filters.inputType || undefined,
          riskLevel: filters.riskLevel || undefined,
          institution: filters.institution || undefined,
          status: filters.status || undefined,
          from: filters.from || undefined,
          to: filters.to || undefined,
          includeDeleted: filters.includeDeleted || undefined,
        },
      });
      const completed = await waitForJob(job.data.id);
      const blob = await downloadExportJob(token, completed.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `phishguard-scans-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || "Failed to export PDF");
    } finally {
      setExporting(false);
    }
  };

  const handlePrepareExportCsv = async () => {
    if (!token) return;
    setExporting(true);
    try {
      const job = await createExportJob(token, {
        type: "bulk_csv",
        filters: {
          inputType: filters.inputType || undefined,
          riskLevel: filters.riskLevel || undefined,
          institution: filters.institution || undefined,
          status: filters.status || undefined,
          from: filters.from || undefined,
          to: filters.to || undefined,
          includeDeleted: filters.includeDeleted || undefined,
        },
      });
      const completed = await waitForJob(job.data.id);
      const blob = await downloadExportJob(token, completed.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `phishguard-scans-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || "Failed to prepare CSV export");
    }
    setExporting(false);
  };

  const handleApplyFilters = () => {
    load(filters);
  };

  const handleClearFilters = () => {
    const cleared = {
      inputType: "",
      riskLevel: "",
      institution: "",
      status: "",
      from: "",
      to: "",
      includeDeleted: false,
    };
    setFilters(cleared);
    load(cleared);
  };

  const riskLabel = (log: DetectionLog) => {
    if (log.riskLevel) return log.riskLevel;
    if (typeof log.riskScore === "number") {
      if (log.riskScore >= 70) return "high";
      if (log.riskScore >= 40) return "medium";
    }
    return log.result === "phishing" ? "high" : log.result === "suspicious" ? "medium" : "low";
  };

  const riskBadgeClass = (level: string) => {
    if (level === "high") return "bg-destructive/10 text-destructive";
    if (level === "medium") return "bg-warning/10 text-warning";
    return "bg-success/10 text-success";
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-1">Admin Dashboard</h1>
              <p className="text-muted-foreground">Monitor phishing threats and detection statistics</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                <Filter className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrepareExportCsv} disabled={exporting}>
                Download Report (CSV)
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportAllPdf} disabled={exporting}>
                Download Report (PDF)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  clear();
                  navigate("/admin/login");
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>

          <CSVLink
            data={exportLogs}
            headers={[
              { label: "report_id", key: "report_id" },
              { label: "scan_id", key: "scan_id" },
              { label: "scan_type", key: "scan_type" },
              { label: "submitted_content", key: "submitted_content" },
              { label: "verdict", key: "verdict" },
              { label: "risk_level", key: "risk_level" },
              { label: "confidence", key: "confidence" },
              { label: "target_institution", key: "target_institution" },
              { label: "indicators", key: "indicators" },
              { label: "detected_at", key: "detected_at" },
              { label: "report_generated_at", key: "report_generated_at" },
              { label: "exported_by", key: "exported_by" },
              { label: "export_scope", key: "export_scope" },
            ]}
            filename={`phishguard-scans-${Date.now()}.csv`}
            ref={csvLinkRef}
            className="hidden"
          />

          {error && (
            <div className="mb-4 p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-sm">
              {error}
            </div>
          )}

          <Card className="mb-6 bg-card/50 backdrop-blur-sm border-border">
            <CardHeader>
              <CardTitle className="text-lg">Detection Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Content Type</label>
                  <select
                    value={filters.inputType}
                    onChange={(e) => setFilters((prev) => ({ ...prev, inputType: e.target.value }))}
                    className="w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm"
                  >
                    <option value="">All</option>
                    <option value="url">URL</option>
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Risk Level</label>
                  <select
                    value={filters.riskLevel}
                    onChange={(e) => setFilters((prev) => ({ ...prev, riskLevel: e.target.value }))}
                    className="w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm"
                  >
                    <option value="">All</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Targeted Institution</label>
                  <select
                    value={filters.institution}
                    onChange={(e) => setFilters((prev) => ({ ...prev, institution: e.target.value }))}
                    className="w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm"
                  >
                    <option value="">All</option>
                    <option value="Telebirr">Telebirr</option>
                    <option value="CBE">CBE</option>
                    <option value="Dashen">Dashen</option>
                    <option value="Awash">Awash</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                    className="w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm"
                  >
                    <option value="">All</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed_phishing">Confirmed Phishing</option>
                    <option value="false_positive">False Positive</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">From</label>
                  <Input
                    type="date"
                    value={filters.from}
                    onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">To</label>
                  <Input
                    type="date"
                    value={filters.to}
                    onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="showDeleted"
                    type="checkbox"
                    checked={filters.includeDeleted}
                    onChange={(e) => setFilters((prev) => ({ ...prev, includeDeleted: e.target.checked }))}
                  />
                  <label htmlFor="showDeleted" className="text-sm text-muted-foreground">
                    Show deleted
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleApplyFilters}>
                    Apply Filters
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statCards.map((stat) => (
              <Card key={stat.label} className="bg-card/50 backdrop-blur-sm border-border">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                      <p className="text-xs text-secondary">{stat.labelAm}</p>
                      <p className="text-3xl font-bold mt-2">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle className="text-lg">Most Targeted Bank</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {analytics?.mostTargeted || "N/A"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {analytics?.mostTargetedCount || 0} detections
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle className="text-lg">Most Common Attack</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {analytics?.mostCommonAttack || "N/A"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {analytics?.mostCommonAttackCount || 0} detections
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle className="text-lg">Daily Scan Counts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(analytics?.dailyCounts || {})
                  .sort(([a], [b]) => (a > b ? 1 : -1))
                  .slice(-7)
                  .map(([day, count]) => (
                    <div key={day} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-20">{day}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, count * 10)}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                    </div>
                  ))}
                {!Object.keys(analytics?.dailyCounts || {}).length && (
                  <p className="text-sm text-muted-foreground">No analytics yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 bg-card/50 backdrop-blur-sm border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Recent Detections</CardTitle>
                <Button variant="ghost" size="sm" onClick={load}>
                  <Download className="h-4 w-4 mr-2" />Reload
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {logs.map((log) => {
                    const level = riskLabel(log);
                    const statusLabel =
                      log.status === "confirmed_phishing"
                        ? "Confirmed"
                        : log.status === "false_positive"
                        ? "False Positive"
                        : "Pending";
                    return (
                      <div key={log.id} className="flex flex-col gap-3 p-4 rounded-xl bg-muted/30 border border-border">
                        <div className="flex items-start gap-4">
                          <div className={`p-2 rounded-lg ${
                            log.inputType === "url" ? "bg-primary/10" : log.inputType === "sms" ? "bg-accent/10" : "bg-secondary/10"
                          }`}>
                            {log.inputType === "url" ? (
                              <Link2 className="h-4 w-4 text-primary" />
                            ) : log.inputType === "sms" ? (
                              <MessageSquare className="h-4 w-4 text-accent" />
                            ) : (
                              <Mail className="h-4 w-4 text-secondary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{log.contentPreview || "(no preview)"}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              {new Date(log.createdAt).toLocaleString()}
                            </p>
                            <div className="mt-2 flex gap-1 flex-wrap">
                              {(log.indicators || []).filter((i: any) => i.detected).slice(0, 3).map((i: any) => (
                                <Badge key={i.name} variant="outline" className="text-xs">
                                  {i.name}
                                </Badge>
                              ))}
                              {log.trustedDomain && (
                                <Badge variant="secondary" className="text-xs">
                                  Verified Ethiopian Institution
                                </Badge>
                              )}
                              {log.localIntel?.length ? (
                                <Badge variant="secondary" className="text-xs">
                                  Local Match
                                </Badge>
                              ) : null}
                              {log.playbook?.name ? (
                                <Badge variant="secondary" className="text-xs">
                                  Playbook Applied
                                </Badge>
                              ) : null}
                            </div>
                            <div className="mt-2 flex gap-2 flex-wrap text-xs text-muted-foreground">
                              <span>Institution: {log.institution || "Unknown"}</span>
                              <span>•</span>
                              <span>Attack: {log.attackType || log.inputType}</span>
                            </div>
                          </div>
                          <div className="text-right min-w-[140px]">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              log.result === "phishing"
                                ? "bg-destructive/10 text-destructive"
                                : log.result === "suspicious"
                                ? "bg-warning/10 text-warning"
                                : "bg-success/10 text-success"
                            }`}>
                              {log.result}
                            </span>
                            <div className="mt-2 flex flex-col gap-1">
                              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${riskBadgeClass(level)}`}>
                                {level} risk
                              </span>
                              <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                                {statusLabel}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">{log.confidence}% confidence</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <input
                            id={`evidence-${log.id}`}
                            type="file"
                            className="hidden"
                            onChange={(e) => handleUploadEvidence(log.id, e.target.files?.[0] || null)}
                          />
                          <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(log.id, "confirmed_phishing")}
                            disabled={log.status === "confirmed_phishing"}>
                            <CheckCircle2 className="h-4 w-4 mr-2" />Confirm Phishing
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(log.id, "false_positive")}
                            disabled={log.status === "false_positive"}>
                            <XCircle className="h-4 w-4 mr-2" />False Positive
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleSoftDelete(log.id)}>
                            <Trash className="h-4 w-4 mr-2" />Soft Delete
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadScanPdf(log.id)}
                          >
                            Download Report (PDF)
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => document.getElementById(`evidence-${log.id}`)?.click()}
                          >
                            Upload Evidence
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewEvidence(log.id)}
                          >
                            View Evidence
                          </Button>
                          <Button size="sm" variant="outline" asChild>
                            <CSVLink
                              data={buildCsvRows([log], {
                                generatedAt: new Date().toISOString(),
                                exportedBy: undefined,
                                scope: "single",
                              })}
                              headers={[
                                { label: "report_id", key: "report_id" },
                                { label: "scan_id", key: "scan_id" },
                                { label: "scan_type", key: "scan_type" },
                                { label: "submitted_content", key: "submitted_content" },
                                { label: "verdict", key: "verdict" },
                                { label: "risk_level", key: "risk_level" },
                                { label: "confidence", key: "confidence" },
                                { label: "target_institution", key: "target_institution" },
                                { label: "indicators", key: "indicators" },
                                { label: "detected_at", key: "detected_at" },
                                { label: "report_generated_at", key: "report_generated_at" },
                                { label: "exported_by", key: "exported_by" },
                                { label: "export_scope", key: "export_scope" },
                              ]}
                              filename={`phishguard-scan-${log.id.slice(0, 8)}.csv`}
                            >
                              Download Report (CSV)
                            </CSVLink>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {!logs.length && <p className="text-sm text-muted-foreground">No detections logged yet.</p>}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle className="text-lg">Trusted Domains</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. cbe.com.et"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                  />
                  <Button onClick={handleAddDomain} size="icon" variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {domains.map((d) => (
                    <div key={d.id} className="flex items-center justify-between p-2 rounded-lg border border-border">
                      {editingDomainId === d.id ? (
                        <Input
                          value={editingDomainValue}
                          onChange={(e) => setEditingDomainValue(e.target.value)}
                          className="h-8"
                        />
                      ) : (
                        <span className="text-sm font-mono">{d.domain}</span>
                      )}
                      <div className="flex items-center gap-2">
                        {editingDomainId === d.id ? (
                          <>
                            <Button size="icon" variant="outline" onClick={() => handleEditDomain(d.id)}>
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setEditingDomainId(null);
                                setEditingDomainValue("");
                              }}
                            >
                              <XCircle className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingDomainId(d.id);
                              setEditingDomainValue(d.domain);
                            }}
                          >
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteDomain(d.id)}>
                          <Trash className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {!domains.length && <p className="text-sm text-muted-foreground">No domains added yet.</p>}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle className="text-lg">SOC Case Workflow</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    placeholder="Case title"
                    value={newCase.title}
                    onChange={(e) => setNewCase((prev) => ({ ...prev, title: e.target.value }))}
                  />
                  <select
                    value={newCase.severity}
                    onChange={(e) => setNewCase((prev) => ({ ...prev, severity: e.target.value }))}
                    className="w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                  <Input
                    placeholder="Optional detection log ID"
                    value={newCase.detectionLogId}
                    onChange={(e) => setNewCase((prev) => ({ ...prev, detectionLogId: e.target.value }))}
                  />
                  <Button variant="outline" onClick={handleCreateCase}>
                    Create Case
                  </Button>
                </div>
                <Textarea
                  placeholder="Case description"
                  value={newCase.description}
                  onChange={(e) => setNewCase((prev) => ({ ...prev, description: e.target.value }))}
                />

                <div className="space-y-3">
                  {cases.map((item) => (
                    <div key={item.id} className="p-4 rounded-xl border border-border bg-muted/30">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-sm">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.description || "No description"}</p>
                        </div>
                        <div className="flex gap-2">
                          <select
                            value={item.status}
                            onChange={(e) => handleCaseUpdate(item.id, { status: e.target.value })}
                            className="rounded-md border border-border bg-muted/50 px-2 py-1 text-xs"
                          >
                            <option value="new">New</option>
                            <option value="triaged">Triaged</option>
                            <option value="investigating">Investigating</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                          </select>
                          <select
                            value={item.severity}
                            onChange={(e) => handleCaseUpdate(item.id, { severity: e.target.value })}
                            className="rounded-md border border-border bg-muted/50 px-2 py-1 text-xs"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                          </select>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Input
                          placeholder="Add analyst note"
                          value={noteInputs[item.id] || ""}
                          onChange={(e) => setNoteInputs((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        />
                        <Button variant="outline" onClick={() => handleAddCaseNote(item.id)}>
                          Add Note
                        </Button>
                      </div>
                    </div>
                  ))}
                  {!cases.length && <p className="text-sm text-muted-foreground">No cases created yet.</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
