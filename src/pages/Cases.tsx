import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import {
  CaseRecord,
  fetchCases,
  createCase,
  updateCase,
  addCaseNote,
  uploadCaseEvidence,
  getCaseEvidenceSignedUrl,
  deleteCaseEvidence,
  downloadCaseExportPdf,
  downloadCaseExportCsv,
} from "@/lib/api";

const Cases = () => {
  const { token, clear } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ status: "", severity: "" });
  const [newCase, setNewCase] = useState({
    title: "",
    description: "",
    severity: "medium",
    detectionLogId: "",
  });
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<Record<string, string[]>>({});
  const [draggingEvidence, setDraggingEvidence] = useState<{ caseId: string; evidenceId: string } | null>(null);
  const [preview, setPreview] = useState<{
    caseId: string;
    evidenceId: string;
    url: string;
    mimeType: string;
    filename: string;
    text?: string;
  } | null>(null);

  const load = async (reset = true) => {
    if (!token) return;
    if (reset) {
      setLoading(true);
      setSelectedEvidence({});
      setPreview(null);
    } else {
      setLoadingMore(true);
    }
    setError(null);
    try {
      const res = await fetchCases(token, {
        status: filters.status || undefined,
        severity: filters.severity || undefined,
        limit: 10,
        cursor: reset ? null : nextCursor,
      });
      setCases((prev) => (reset ? res.data || [] : [...prev, ...(res.data || [])]));
      setNextCursor(res.nextCursor || null);
    } catch (err: any) {
      setError(err.message || "Failed to load cases");
      if (err.message?.includes("Unauthorized")) {
        clear();
        navigate("/admin/login");
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    load(true);
  }, [token, filters.status, filters.severity]);

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

  const handleUploadEvidence = async (id: string, file: File | null) => {
    if (!token || !file) return;
    try {
      const res = await uploadCaseEvidence(token, id, file);
      setCases((prev) => prev.map((c) => (c.id === id ? { ...c, evidence: [res.data, ...(c.evidence || [])] } : c)));
    } catch (err: any) {
      setError(err.message || "Failed to upload evidence");
    }
  };

  const handlePreviewEvidence = async (caseId: string, ev: NonNullable<CaseRecord["evidence"]>[number]) => {
    if (!token) return;
    try {
      const signed = await getCaseEvidenceSignedUrl(token, ev.id);
      if (ev.mimeType === "text/plain") {
        const text = await fetch(signed.url).then((r) => r.text());
        setPreview({ caseId, evidenceId: ev.id, url: signed.url, mimeType: ev.mimeType, filename: ev.filename, text });
      } else {
        setPreview({ caseId, evidenceId: ev.id, url: signed.url, mimeType: ev.mimeType, filename: ev.filename });
      }
    } catch (err: any) {
      setError(err.message || "Failed to preview evidence");
    }
  };

  const handleDownloadEvidence = async (evidenceId: string, filename: string) => {
    if (!token) return;
    try {
      const signed = await getCaseEvidenceSignedUrl(token, evidenceId);
      const link = document.createElement("a");
      link.href = signed.url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      setError(err.message || "Failed to download evidence");
    }
  };

  const handleDeleteEvidence = async (caseId: string, evidenceId: string) => {
    if (!token) return;
    try {
      await deleteCaseEvidence(token, evidenceId);
      setCases((prev) => prev.map((c) => (c.id === caseId ? { ...c, evidence: (c.evidence || []).filter((e) => e.id !== evidenceId) } : c)));
      setSelectedEvidence((prev) => ({
        ...prev,
        [caseId]: (prev[caseId] || []).filter((id) => id !== evidenceId),
      }));
    } catch (err: any) {
      setError(err.message || "Failed to delete evidence");
    }
  };

  const toggleEvidenceSelection = (caseId: string, evidenceId: string) => {
    setSelectedEvidence((prev) => {
      const current = new Set(prev[caseId] || []);
      if (current.has(evidenceId)) current.delete(evidenceId);
      else current.add(evidenceId);
      return { ...prev, [caseId]: Array.from(current) };
    });
  };

  const toggleSelectAllEvidence = (caseId: string, allIds: string[], checked: boolean) => {
    setSelectedEvidence((prev) => ({ ...prev, [caseId]: checked ? allIds : [] }));
  };

  const handleBulkDeleteEvidence = async (caseId: string) => {
    if (!token) return;
    const ids = selectedEvidence[caseId] || [];
    if (!ids.length) return;
    if (!window.confirm(`Delete ${ids.length} evidence file(s)?`)) return;
    try {
      await Promise.all(ids.map((id) => deleteCaseEvidence(token, id)));
      setCases((prev) => prev.map((c) => (c.id === caseId ? { ...c, evidence: (c.evidence || []).filter((e) => !ids.includes(e.id)) } : c)));
      setSelectedEvidence((prev) => ({ ...prev, [caseId]: [] }));
    } catch (err: any) {
      setError(err.message || "Failed to delete evidence");
    }
  };

  const handleDragStartEvidence = (caseId: string, evidenceId: string) => {
    setDraggingEvidence({ caseId, evidenceId });
  };

  const handleDropEvidence = (caseId: string, targetId: string) => {
    if (!draggingEvidence || draggingEvidence.caseId !== caseId) return;
    if (draggingEvidence.evidenceId === targetId) return;
    setCases((prev) =>
      prev.map((c) => {
        if (c.id !== caseId || !c.evidence) return c;
        const list = [...c.evidence];
        const fromIndex = list.findIndex((e) => e.id === draggingEvidence.evidenceId);
        const toIndex = list.findIndex((e) => e.id === targetId);
        if (fromIndex === -1 || toIndex === -1) return c;
        const [moved] = list.splice(fromIndex, 1);
        list.splice(toIndex, 0, moved);
        return { ...c, evidence: list };
      })
    );
    setDraggingEvidence(null);
  };

  const handleExportCasePdf = async (caseId: string) => {
    if (!token) return;
    try {
      const blob = await downloadCaseExportPdf(token, caseId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `phishguard-case-${caseId.slice(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || "Failed to export case PDF");
    }
  };

  const handleExportCaseCsv = async (caseId: string) => {
    if (!token) return;
    try {
      const blob = await downloadCaseExportCsv(token, caseId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `phishguard-case-${caseId.slice(0, 8)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || "Failed to export case CSV");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">SOC Case Workflow</h1>
            <p className="text-muted-foreground">Create, triage, and track incident cases.</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle className="text-lg">Create New Case</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="Case title"
                  value={newCase.title}
                  onChange={(e) => setNewCase((prev) => ({ ...prev, title: e.target.value }))}
                />
                <Textarea
                  placeholder="Case description"
                  value={newCase.description}
                  onChange={(e) => setNewCase((prev) => ({ ...prev, description: e.target.value }))}
                />
                <div className="grid gap-3 sm:grid-cols-2">
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
                    placeholder="Detection log ID (optional)"
                    value={newCase.detectionLogId}
                    onChange={(e) => setNewCase((prev) => ({ ...prev, detectionLogId: e.target.value }))}
                  />
                </div>
                <Button variant="outline" onClick={handleCreateCase}>
                  Create Case
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle className="text-lg">Case Filters</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <select
                  value={filters.status}
                  onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                  className="w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm"
                >
                  <option value="">All Statuses</option>
                  <option value="new">New</option>
                  <option value="triaged">Triaged</option>
                  <option value="investigating">Investigating</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
                <select
                  value={filters.severity}
                  onChange={(e) => setFilters((prev) => ({ ...prev, severity: e.target.value }))}
                  className="w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm"
                >
                  <option value="">All Severities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 space-y-4">
            {loading && <p className="text-sm text-muted-foreground">Loading cases...</p>}
            {!loading && !cases.length && (
              <p className="text-sm text-muted-foreground">No cases found.</p>
            )}
            {cases.map((item) => (
              <Card key={item.id} className="bg-card/50 backdrop-blur-sm border-border">
                <CardContent className="p-5 space-y-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-semibold text-lg">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.description || "No description"}</p>
                      {item.detectionLogId && (
                        <p className="text-xs text-muted-foreground mt-1">Log ID: {item.detectionLogId}</p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline">{item.status}</Badge>
                      <Badge variant="secondary">{item.severity}</Badge>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <select
                      value={item.status}
                      onChange={(e) => handleCaseUpdate(item.id, { status: e.target.value })}
                      className="w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm"
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
                      className="w-full rounded-md border border-border bg-muted/50 px-3 py-2 text-sm"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <input
                      id={`case-evidence-${item.id}`}
                      type="file"
                      className="hidden"
                      onChange={(e) => handleUploadEvidence(item.id, e.target.files?.[0] || null)}
                    />
                    <Button variant="outline" onClick={() => handleExportCasePdf(item.id)}>
                      Export PDF
                    </Button>
                    <Button variant="outline" onClick={() => handleExportCaseCsv(item.id)}>
                      Export CSV
                    </Button>
                    <Button variant="outline" onClick={() => document.getElementById(`case-evidence-${item.id}`)?.click()}>
                      Upload Evidence
                    </Button>
                    <span className="text-xs text-muted-foreground">PNG/JPG/PDF/TXT up to 10MB</span>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Add analyst note"
                      value={noteInputs[item.id] || ""}
                      onChange={(e) => setNoteInputs((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    />
                    <Button variant="outline" onClick={() => handleAddCaseNote(item.id)}>
                      Add Note
                    </Button>
                  </div>

                  {(item.evidence?.length || item.notes?.length) ? (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">Case Timeline</p>
                      <ul className="space-y-2 text-sm">
                        {[...(item.notes || []).map((note) => ({
                          type: "note",
                          id: note.id,
                          message: note.message,
                          createdAt: note.createdAt,
                        })), ...(item.evidence || []).map((ev) => ({
                          type: "evidence",
                          id: ev.id,
                          message: ev.uploadedBy?.email ? `${ev.filename} (by ${ev.uploadedBy.email})` : ev.filename,
                          createdAt: ev.createdAt,
                        }))]
                          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                          .map((entry) => (
                            <li key={entry.id} className="rounded-md border border-border bg-muted/30 p-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {entry.type === "note" ? "Note" : "Evidence"}
                                </Badge>
                                <span>{entry.message}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(entry.createdAt).toLocaleString()}
                              </p>
                            </li>
                          ))}
                      </ul>
                    </div>
                  ) : null}

                  {item.evidence?.length ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground">Evidence Attachments</p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleBulkDeleteEvidence(item.id)}
                            disabled={!selectedEvidence[item.id]?.length}
                          >
                            Delete Selected
                          </Button>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left text-muted-foreground">
                              <th className="py-2">
                                <input
                                  type="checkbox"
                                  checked={
                                    (selectedEvidence[item.id]?.length || 0) > 0 &&
                                    (selectedEvidence[item.id]?.length || 0) === (item.evidence?.length || 0)
                                  }
                                  onChange={(e) =>
                                    toggleSelectAllEvidence(
                                      item.id,
                                      (item.evidence || []).map((ev) => ev.id),
                                      e.target.checked
                                    )
                                  }
                                />
                              </th>
                              <th className="py-2">File</th>
                              <th className="py-2">Type</th>
                              <th className="py-2">Size</th>
                              <th className="py-2">Uploaded</th>
                              <th className="py-2">Uploaded By</th>
                              <th className="py-2">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.evidence.map((ev) => (
                              <tr
                                key={ev.id}
                                className="border-t border-border/60"
                                draggable
                                onDragStart={() => handleDragStartEvidence(item.id, ev.id)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => handleDropEvidence(item.id, ev.id)}
                              >
                                <td className="py-2 pr-2">
                                  <input
                                    type="checkbox"
                                    checked={(selectedEvidence[item.id] || []).includes(ev.id)}
                                    onChange={() => toggleEvidenceSelection(item.id, ev.id)}
                                  />
                                </td>
                                <td className="py-2 pr-2">{ev.filename}</td>
                                <td className="py-2 pr-2">{ev.mimeType}</td>
                                <td className="py-2 pr-2">{Math.round(ev.sizeBytes / 1024)} KB</td>
                                <td className="py-2 pr-2">{new Date(ev.createdAt).toLocaleString()}</td>
                                <td className="py-2 pr-2">{ev.uploadedBy?.email || "Unknown"}</td>
                                <td className="py-2 flex gap-2">
                                  <Button size="sm" variant="outline" onClick={() => handlePreviewEvidence(item.id, ev)}>
                                    Preview
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => handleDownloadEvidence(ev.id, ev.filename)}>
                                    Download
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => handleDeleteEvidence(item.id, ev.id)}>
                                    Delete
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {preview && preview.caseId === item.id && (
                        <div className="rounded-md border border-border bg-muted/20 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">Preview: {preview.filename}</p>
                            <Button size="sm" variant="ghost" onClick={() => setPreview(null)}>
                              Close
                            </Button>
                          </div>
                          {preview.mimeType.startsWith("image/") && (
                            <img src={preview.url} alt={preview.filename} className="max-h-64 rounded-md border" />
                          )}
                          {preview.mimeType === "application/pdf" && (
                            <iframe title={preview.filename} src={preview.url} className="h-64 w-full rounded-md border" />
                          )}
                          {preview.mimeType === "text/plain" && (
                            <pre className="max-h-64 overflow-auto rounded-md border bg-background p-2 text-xs">
                              {preview.text || "Loading..."}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
            {nextCursor && (
              <div className="flex justify-center">
                <Button variant="outline" onClick={() => load(false)} disabled={loadingMore}>
                  {loadingMore ? "Loading..." : "Load more"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Cases;
