import { Activity, AlertTriangle, BellRing, ShieldAlert, SignalHigh } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePatternAlerts } from "@/hooks/use-pattern-alerts";
import { cn } from "@/lib/utils";

const severityStyles: Record<"high" | "medium" | "low", string> = {
  high: "bg-destructive/10 text-destructive border-destructive/30",
  medium: "bg-warning/10 text-warning border-warning/30",
  low: "bg-success/10 text-success border-success/30",
};

const vectorLabels: Record<string, string> = {
  url: "URL",
  sms: "SMS",
  email: "Email",
  social: "Social",
  ussd: "USSD",
};

export function PatternAlerts() {
  const { alerts, statusLabel, isLive, source } = usePatternAlerts();

  return (
    <Card className="bg-card/70 border-primary/20 shadow-card mb-8">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BellRing className="h-5 w-5 text-primary" />
              Live phishing pattern alerts
            </CardTitle>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Get instant alerts when new phishing lures targeting Ethiopian banks are detected. Toasts are pushed in real
              time so analysts can respond quickly.
            </p>
          </div>
          <Badge variant="outline" className={cn("flex items-center gap-2", isLive ? "text-success" : "text-muted-foreground")}> 
            <span className={cn("h-2 w-2 rounded-full", isLive ? "bg-success animate-pulse" : "bg-muted")}></span>
            {statusLabel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="flex items-start gap-3 p-4 rounded-xl border border-border/60 bg-muted/30"
          >
            <div
              className={cn(
                "p-3 rounded-xl border",
                severityStyles[alert.severity],
              )}
            >
              {alert.severity === "high" ? (
                <ShieldAlert className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
            </div>

            <div className="flex-1 space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold leading-tight truncate">{alert.bank}</span>
                <Badge variant="secondary" className="px-2 py-0.5 text-[11px]">
                  {vectorLabels[alert.vector] ?? alert.vector.toUpperCase()}
                </Badge>
                <Badge variant="outline" className="px-2 py-0.5 text-[11px]">
                  {alert.confidence}% confidence
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    "px-2 py-0.5 text-[11px] capitalize",
                    severityStyles[alert.severity],
                  )}
                >
                  {alert.severity} risk
                </Badge>
              </div>
              <p className="text-sm font-medium text-foreground line-clamp-2">{alert.pattern}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{alert.indicator}</p>
              <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <SignalHigh className="h-3 w-3" />
                  {new Date(alert.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  Source: {source === "supabase" ? alert.source : "Demo stream"}
                </span>
              </div>
            </div>
          </div>
        ))}

        {alerts.length === 0 && (
          <div className="p-6 rounded-xl border border-dashed border-border text-sm text-muted-foreground flex items-center gap-2">
            <BellRing className="h-4 w-4 text-muted-foreground" />
            Waiting for new alerts...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
