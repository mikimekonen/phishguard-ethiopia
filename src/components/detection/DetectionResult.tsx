import { ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, XCircle, Info, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DetectionResultData {
  isPhishing: boolean;
  confidence: number;
  riskScore?: number;
  summary?: string;
  summaryAm?: string;
  targetInstitution?: string;
  type: "url" | "sms" | "email";
  content: string;
  localIntelMatches?: {
    type: "domain" | "shortcode" | "pattern";
    label: string;
    detail: string;
    severity: "low" | "medium" | "high";
  }[];
  playbook?: {
    id: string;
    name: string;
    actions: string[];
    rationale: string;
  };
  indicators: {
    name: string;
    nameAm: string;
    detected: boolean;
    severity: "high" | "medium" | "low";
    description: string;
  }[];
  recommendation: string;
  recommendationAm: string;
}

interface DetectionResultProps {
  result: DetectionResultData;
  onReset: () => void;
  onReport?: () => void;
}

export function DetectionResult({ result, onReset, onReport }: DetectionResultProps) {
  const { isPhishing, indicators, recommendation, recommendationAm, localIntelMatches, playbook } = result;
  const riskScore = result.riskScore ?? result.confidence;
  const summary = result.summary;
  const summaryAm = result.summaryAm;
  const riskLevel = riskScore >= 86 ? "critical" : riskScore >= 61 ? "high" : riskScore >= 31 ? "medium" : "low";
  const riskLabel = riskLevel === "critical" ? "Critical" : riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1);
  const riskStyles =
    riskLevel === "critical"
      ? "bg-destructive/20 text-destructive"
      : riskLevel === "high"
      ? "bg-destructive/10 text-destructive"
      : riskLevel === "medium"
      ? "bg-warning/20 text-warning"
      : "bg-success/20 text-success";
  const institution = result.targetInstitution || "Unclassified";
  const institutionBadge = (name: string) => {
    if (name.includes("Telebirr")) return { label: "TB", color: "bg-emerald-500/15 text-emerald-600" };
    if (name.includes("CBE")) return { label: "CBE", color: "bg-blue-500/15 text-blue-600" };
    if (name.includes("Dashen")) return { label: "DB", color: "bg-purple-500/15 text-purple-600" };
    if (name.includes("Awash")) return { label: "AB", color: "bg-orange-500/15 text-orange-600" };
    if (name.includes("Abyssinia")) return { label: "BoA", color: "bg-red-500/15 text-red-600" };
    return { label: "PG", color: "bg-slate-500/15 text-slate-600" };
  };
  const logo = institutionBadge(institution);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Main Result Card */}
      <div
        className={cn(
          "relative p-8 rounded-2xl border-2 overflow-hidden",
          isPhishing
            ? "border-destructive bg-destructive/5"
            : "border-success bg-success/5"
        )}
      >
        {/* Background Glow */}
        <div
          className={cn(
            "absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-20",
            isPhishing ? "bg-destructive" : "bg-success"
          )}
        />

        <div className="relative flex items-start gap-6">
          {/* Icon */}
          <div
            className={cn(
              "p-4 rounded-2xl",
              isPhishing ? "bg-destructive/20" : "bg-success/20"
            )}
          >
            {isPhishing ? (
              <ShieldAlert className="h-12 w-12 text-destructive" />
            ) : (
              <ShieldCheck className="h-12 w-12 text-success" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className={cn("h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold", logo.color)}>
                {logo.label}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Targeted Institution</p>
                <p className="font-semibold text-sm">{institution}</p>
              </div>
            </div>
            <h3
              className={cn(
                "text-2xl font-bold mb-1",
                isPhishing ? "text-destructive" : "text-success"
              )}
            >
              {isPhishing ? "Phishing Detected!" : "Safe Content"}
            </h3>
            <p className={cn("text-lg mb-2", isPhishing ? "text-destructive/80" : "text-success/80")}>
              {isPhishing ? "ፊሺንግ ተገኝቷል!" : "ደህንነቱ የተጠበቀ ይዘት"}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
              <span>
                Risk Score: <span className="font-semibold">{riskScore}%</span>
              </span>
              <span className={cn("text-xs px-2 py-0.5 rounded-full", riskStyles)}>{riskLabel} Risk</span>
              <span>
                Confidence: <span className="font-semibold">{result.confidence}%</span>
              </span>
              {localIntelMatches?.length ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  Local Match ({localIntelMatches.length})
                </span>
              ) : null}
              {playbook?.name ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">
                  Playbook Applied
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {(localIntelMatches?.length || playbook) && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl border border-border bg-card/60">
            <h4 className="font-semibold mb-2">Local Threat Intel Matches</h4>
            {localIntelMatches?.length ? (
              <ul className="space-y-2 text-sm text-muted-foreground">
                {localIntelMatches.map((match, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
                    <span className="font-medium text-foreground">{match.label}</span>
                    <span className="text-xs">({match.detail})</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No local matches detected.</p>
            )}
          </div>
          <div className="p-5 rounded-xl border border-border bg-card/60">
            <h4 className="font-semibold mb-2">Bank Response Playbook</h4>
            {playbook ? (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{playbook.name}</p>
                <p>{playbook.rationale}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No playbook applied.</p>
            )}
          </div>
        </div>
      )}

      {/* Indicators */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold flex items-center gap-2">
          <Info className="h-5 w-5 text-primary" />
          Detection Indicators
        </h4>

        <div className="grid gap-3">
          {indicators.map((indicator, index) => (
            <div
              key={index}
              className={cn(
                "flex items-start gap-3 p-4 rounded-xl border",
                indicator.detected
                  ? indicator.severity === "high"
                    ? "border-destructive/50 bg-destructive/5"
                    : indicator.severity === "medium"
                    ? "border-warning/50 bg-warning/5"
                    : "border-muted bg-muted/20"
                  : "border-success/50 bg-success/5"
              )}
            >
              {indicator.detected ? (
                indicator.severity === "high" ? (
                  <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                )
              ) : (
                <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{indicator.name}</span>
                  <span className="text-xs text-secondary">({indicator.nameAm})</span>
                  {indicator.detected && (
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        indicator.severity === "high"
                          ? "bg-destructive/20 text-destructive"
                          : indicator.severity === "medium"
                          ? "bg-warning/20 text-warning"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {indicator.severity}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{indicator.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary & Recommendation */}
      <div className="p-6 rounded-xl bg-muted/50 border border-border">
        {summary && (
          <>
            <h4 className="font-semibold mb-1">Summary</h4>
            <p className="text-sm text-muted-foreground mb-2">{summary}</p>
          </>
        )}
        <h4 className="font-semibold mb-2">Recommendation</h4>
        <p className="text-muted-foreground mb-2">{recommendation}</p>
        {summaryAm && summaryAm !== recommendationAm && (
          <div className="mb-2">
            <p className="text-xs text-secondary mb-1">ማጠቃለያ (አማርኛ)</p>
            {summaryAm.includes(";") ? (
              <ul className="list-disc pl-4 text-xs text-secondary space-y-1">
                {summaryAm.split(";").map((item, idx) => (
                  <li key={idx}>{item.trim()}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-secondary">{summaryAm}</p>
            )}
          </div>
        )}
        <p className="text-sm text-secondary">{recommendationAm}</p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="outline" className="flex-1" onClick={onReset}>
          Check Another
        </Button>
        <Button variant="glass" className="flex-1" onClick={onReport} disabled={!onReport}>
          <ExternalLink className="h-4 w-4" />
          Report This Threat
        </Button>
      </div>
    </div>
  );
}
