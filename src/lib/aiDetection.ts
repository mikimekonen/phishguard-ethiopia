import { supabase } from "@/integrations/supabase/client";

export type AIClassifyResult = {
  label: "phishing" | "safe";
  score: number; // 0-100 where higher means more likely phishing
  reasons: string[];
};

const amharicRegex = /[\u1200-\u137F]/; // Ethiopic block

const keywordSets = {
  credentials: ["password", "pin", "otp", "code", "account", "login", "ይግቡ", "የይለፍ ቃል", "ኮድ"],
  urgency: [
    "urgent",
    "immediately",
    "suspended",
    "blocked",
    "verify",
    "confirm",
    "limited",
    "expired",
    "reactivate",
    "restore",
    "unlock",
    "unblock",
    "ታግዷል",
    "አስቸኳይ",
    "ያረጋግጡ",
    "ይጫኑ",
  ],
  banks: [
    "telebirr",
    "cbe",
    "commercial bank",
    "dashen",
    "awash",
    "abyssinia",
    "zemen",
    "amhara",
    "hibret",
    "coop",
    "ቴሌብር",
    "ሲቢኢ",
  ],
  shorteners: ["bit.ly", "tinyurl", "t.co", "rebrand.ly", "goo.gl", "ow.ly", "is.gd"],
};

const normalize = (text: string) => text.toLowerCase();

async function trySupabaseEdge(type: "url" | "sms" | "email", content: string): Promise<AIClassifyResult | null> {
  try {
    // Optional edge function: create one named `phishing-detect` that returns { label, score, reasons }
    const { data, error } = await (supabase as any).functions.invoke("phishing-detect", {
      body: { type, content },
    });
    if (error) return null;
    if (data && typeof data.score === "number" && data.label) {
      return {
        label: data.label === "phishing" ? "phishing" : "safe",
        score: Math.max(0, Math.min(100, Math.round(data.score))),
        reasons: Array.isArray(data.reasons) ? data.reasons : [],
      };
    }
    return null;
  } catch (e) {
    return null;
  }
}

export async function classifyContent(
  type: "url" | "sms" | "email",
  content: string,
): Promise<AIClassifyResult> {
  const lower = normalize(content);
  const reasons: string[] = [];
  let score = 0;

  // Optional remote classifier first
  const remote = await trySupabaseEdge(type, content);
  if (remote) {
    // If remote strongly indicates phishing, return; else continue layering
    if (remote.score >= 70 || remote.label === "phishing") {
      return remote;
    }
    // Blend remote mild signals
    score += Math.round(remote.score * 0.5);
    reasons.push("Remote classifier suggests possible phishing");
  }

  // Language signals (Amharic content presence)
  const isAmharic = amharicRegex.test(content);
  if (isAmharic) {
    score += 5;
    reasons.push("Amharic content detected");
  }

  // Bank targeting and context
  const bankTarget = keywordSets.banks.some((k) => lower.includes(k));
  if (bankTarget) {
    score += 20;
    reasons.push("Mentions Ethiopian banking/Telebirr");
  }

  // Urgency
  const hasUrgency = keywordSets.urgency.some((k) => lower.includes(k));
  if (hasUrgency) {
    score += 15;
    reasons.push("Urgent/pressure language");
  }

  // Credentials
  const asksCreds = keywordSets.credentials.some((k) => lower.includes(k));
  if (asksCreds) {
    score += 30;
    reasons.push("Requests credentials (PIN/OTP/password)");
  }

  // Links and shorteners
  const hasLink = /https?:\/\/|www\./i.test(content);
  const usesShortener = keywordSets.shorteners.some((s) => lower.includes(s));
  if (hasLink) {
    score += 10;
    reasons.push("Contains links");
  }
  if (usesShortener) {
    score += 35;
    reasons.push("Uses link shortener to obfuscate destination");
  }

  // URL-only extras: domain impersonation (basic, complements heuristics)
  if (type === "url") {
    const hostname = (() => {
      try {
        const normalized = content.startsWith("http") ? content : `https://${content}`;
        return new URL(normalized).hostname.toLowerCase();
      } catch {
        return "";
      }
    })();

    const officialDomains = [
      "cbe.com.et",
      "dashenbanksc.com",
      "awashbank.com",
      "ethiotelecom.et",
      "telebirr.com.et",
      "boabank.com",
    ];
    const isOfficial = officialDomains.some((d) => hostname.endsWith(d));
    const mentionsBank = bankTarget;

    if (mentionsBank && !isOfficial) {
      score += 25;
      reasons.push("Bank lookalike domain not official");
    }

    if (mentionsBank && !/\.(et|com\.et|org\.et|gov\.et)$/i.test(hostname)) {
      score += 10;
      reasons.push("Non-Ethiopian TLD");
    }
  }

  // Cap and label
  score = Math.max(0, Math.min(100, score));
  const label: AIClassifyResult["label"] = score >= 50 ? "phishing" : "safe";

  return { label, score, reasons };
}
