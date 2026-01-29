import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

export type PatternAlert = {
  id: string;
  bank: string;
  vector: "url" | "sms" | "email" | "social" | "ussd";
  severity: "high" | "medium" | "low";
  pattern: string;
  indicator: string;
  createdAt: string;
  source: string;
  confidence: number;
};

const fallbackAlerts: PatternAlert[] = [
  {
    id: "seed-telebirr",
    bank: "Telebirr",
    vector: "sms",
    severity: "high",
    pattern: "Fake Telebirr unblock link using bit.ly redirects",
    indicator: "Account suspension claim + OTP harvest",
    createdAt: new Date().toISOString(),
    source: "Simulated intel",
    confidence: 93,
  },
  {
    id: "seed-cbe",
    bank: "Commercial Bank of Ethiopia",
    vector: "email",
    severity: "medium",
    pattern: "CBE account locked verification form on lookalike domain",
    indicator: ".com domain masquerading as .com.et",
    createdAt: new Date().toISOString(),
    source: "Simulated intel",
    confidence: 88,
  },
  {
    id: "seed-dashen",
    bank: "Dashen Bank",
    vector: "url",
    severity: "high",
    pattern: "Credential phishing via dashen-login-help.net",
    indicator: "Non-HTTPS domain requesting PIN + password",
    createdAt: new Date().toISOString(),
    source: "Simulated intel",
    confidence: 90,
  },
  {
    id: "seed-awash",
    bank: "Awash Bank",
    vector: "social",
    severity: "medium",
    pattern: "Telegram bot promising Awash loan approval with login capture",
    indicator: "Impersonation + urgent repayment language",
    createdAt: new Date().toISOString(),
    source: "Simulated intel",
    confidence: 82,
  },
  {
    id: "seed-abyssinia",
    bank: "Bank of Abyssinia",
    vector: "sms",
    severity: "low",
    pattern: "Short code SMS linking to update-benefits-boaa.info",
    indicator: "Untrusted TLD + reward bait",
    createdAt: new Date().toISOString(),
    source: "Simulated intel",
    confidence: 76,
  },
];

const bankKeywords = [
  "telebirr",
  "cbe",
  "commercial bank",
  "dashen",
  "awash",
  "abyssinia",
  "boaa",
  "zemen",
  "amhara",
  "hibret",
  "coop",
];

type RealtimeSource = "supabase" | "demo";

const severityFromValue = (value: string | undefined): PatternAlert["severity"] => {
  if (!value) return "high";
  const normalized = value.toLowerCase();
  if (normalized.includes("high") || normalized.includes("critical")) return "high";
  if (normalized.includes("med")) return "medium";
  return "low";
};

const vectorFromValue = (value: string | undefined): PatternAlert["vector"] => {
  if (!value) return "url";
  const normalized = value.toLowerCase();
  if (normalized.includes("sms") || normalized.includes("text")) return "sms";
  if (normalized.includes("email")) return "email";
  if (normalized.includes("social") || normalized.includes("telegram") || normalized.includes("whatsapp")) return "social";
  if (normalized.includes("ussd")) return "ussd";
  return "url";
};

const detectBank = (content: string | undefined): string => {
  if (!content) return "Ethiopian bank";
  const lower = content.toLowerCase();
  const match = bankKeywords.find((keyword) => lower.includes(keyword));
  if (!match) return "Ethiopian bank";
  if (match === "cbe" || match === "commercial bank") return "Commercial Bank of Ethiopia";
  if (match === "boaa" || match === "abyssinia") return "Bank of Abyssinia";
  return match.charAt(0).toUpperCase() + match.slice(1);
};

const normalizeRecord = (record: Record<string, unknown>): PatternAlert => {
  const patternText = String(
    (record.pattern_text ?? record.pattern ?? record.message ?? record.title ?? "New phishing lure detected") as string,
  ).trim();

  const createdAt = String(record.created_at ?? record.inserted_at ?? new Date().toISOString());
  const bankValue = String(record.bank ?? record.target_bank ?? detectBank(patternText));

  const confidenceRaw = Number(record.confidence ?? record.score ?? 85);
  const confidence = Number.isFinite(confidenceRaw)
    ? Math.min(Math.max(Math.round(confidenceRaw), 10), 99)
    : 85;

  return {
    id: String(record.id ?? crypto.randomUUID()),
    bank: bankValue,
    vector: vectorFromValue(record.vector as string | undefined),
    severity: severityFromValue(record.severity as string | undefined),
    pattern: patternText,
    indicator: String(record.indicator ?? record.signal ?? "New pattern seen across telemetry"),
    createdAt,
    source: String(record.source ?? "Supabase realtime"),
    confidence,
  };
};

export const usePatternAlerts = (maxItems = 6) => {
  const [alerts, setAlerts] = useState<PatternAlert[]>(() => fallbackAlerts.slice(0, 3));
  const [isLive, setIsLive] = useState(false);
  const [source, setSource] = useState<RealtimeSource>("demo");
  const mockTimerRef = useRef<number>();
  const fallbackIndex = useRef(0);

  const pushAlert = (alert: PatternAlert, withToast = true) => {
    setAlerts((prev) => {
      const deduped = prev.filter((item) => item.id !== alert.id);
      const next = [alert, ...deduped];
      return next.slice(0, maxItems);
    });

    if (withToast) {
      toast(`${alert.bank} phishing pattern detected`, {
        description: `${alert.vector.toUpperCase()} · ${alert.pattern}`,
        duration: 8000,
        action: {
          label: "View",
          onClick: () => undefined,
        },
      });
    }
  };

  useEffect(() => {
    let cancelled = false;
    const startRealtime = async () => {
      const hasEnv = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
      if (!hasEnv) throw new Error("Supabase env missing");

      const channel = supabase
        .channel("phishing-patterns")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "phishing_patterns" },
          (payload) => {
            if (cancelled) return;
            const alert = normalizeRecord((payload as { new: Record<string, unknown> }).new);
            pushAlert(alert);
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED" && !cancelled) {
            setIsLive(true);
            setSource("supabase");
          }
        });

      return () => {
        channel.unsubscribe();
      };
    };

    const startMockStream = () => {
      setIsLive(true);
      setSource("demo");
      const timer = window.setInterval(() => {
        fallbackIndex.current = (fallbackIndex.current + 1) % fallbackAlerts.length;
        const template = fallbackAlerts[fallbackIndex.current];
        const alert: PatternAlert = {
          ...template,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          source: "Demo stream",
        };
        pushAlert(alert);
      }, 12000);
      mockTimerRef.current = timer;
    };

    const setup = async () => {
      try {
        const stopRealtime = await startRealtime();
        return stopRealtime;
      } catch (error) {
        startMockStream();
        return undefined;
      }
    };

    let cleanup: (() => void) | undefined;
    setup().then((stop) => {
      cleanup = stop;
    });

    return () => {
      cancelled = true;
      if (cleanup) cleanup();
      if (mockTimerRef.current) {
        window.clearInterval(mockTimerRef.current);
      }
    };
  }, [maxItems]);

  const statusLabel = useMemo(() => {
    if (!isLive) return "Connecting";
    return source === "supabase" ? "Live (Supabase)" : "Live demo";
  }, [isLive, source]);

  return {
    alerts,
    isLive,
    source,
    statusLabel,
  } as const;
};
