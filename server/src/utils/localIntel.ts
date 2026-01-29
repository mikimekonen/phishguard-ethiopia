export type LocalIntelMatch = {
  type: "domain" | "shortcode" | "pattern";
  label: string;
  detail: string;
  severity: "low" | "medium" | "high";
};

const bankDomains = [
  "cbe.com.et",
  "telebirr.com.et",
  "ethiotelecom.et",
  "dashenbanksc.com",
  "awashbank.com",
  "bankofabyssinia.com",
  "boabank.com",
  "zemenbank.com",
  "wegagenbanksc.com",
  "abaybank.com.et",
];

const telecomShortcodes = ["127", "128", "129", "7070", "8100", "8455"];

const scamPatterns: Array<{ label: string; regex: RegExp; severity: LocalIntelMatch["severity"] }> = [
  { label: "OTP Request", regex: /\b(otp|one time password|verification code|pin)\b/i, severity: "high" },
  { label: "Account Locked", regex: /(account|መለያ).*(blocked|locked|suspended|ታግዷል)/i, severity: "medium" },
  { label: "Urgent Bank Alert", regex: /(urgent|immediately|አስቸኳይ).*(bank|telebirr|cbe|dashen|awash)/i, severity: "high" },
  { label: "Amharic PIN Request", regex: /(ፒን|የይለፍ ቃል|OTP)/i, severity: "high" },
];

const extractHost = (content: string) => {
  try {
    const normalized = content.startsWith("http") ? content : `https://${content}`;
    return new URL(normalized).hostname.toLowerCase();
  } catch {
    return "";
  }
};

export const matchLocalIntel = (type: "url" | "sms" | "email", content: string) => {
  const matches: LocalIntelMatch[] = [];
  const lower = content.toLowerCase();
  const hostname = type === "url" ? extractHost(content) : "";

  if (hostname) {
    bankDomains.forEach((domain) => {
      if (hostname.endsWith(domain)) {
        matches.push({
          type: "domain",
          label: "Ethiopian Bank Domain",
          detail: domain,
          severity: "low",
        });
      }
    });
  }

  telecomShortcodes.forEach((code) => {
    if (lower.includes(code)) {
      matches.push({
        type: "shortcode",
        label: "Telecom Shortcode Mention",
        detail: code,
        severity: "medium",
      });
    }
  });

  scamPatterns.forEach((pattern) => {
    if (pattern.regex.test(content)) {
      matches.push({
        type: "pattern",
        label: pattern.label,
        detail: "pattern",
        severity: pattern.severity,
      });
    }
  });

  return matches;
};
