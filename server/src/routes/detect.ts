import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "../prisma";
import { getDefaultTenantId } from "../utils/tenant";
import { appendAuditLog } from "../utils/audit";
import { matchLocalIntel } from "../utils/localIntel";
import { resolvePlaybook } from "../utils/playbooks";

const detectSchema = z.object({
  type: z.enum(["url", "sms", "email"]),
  content: z.string().min(3).max(5000),
});

type RiskLevel = "low" | "medium" | "high";
type RiskTier = "safe" | "suspicious" | "high" | "critical";

type ReputationResult = {
  domainRiskScore: number;
  isTrusted: boolean;
  matchedDomain?: string;
  suspiciousSimilarity?: { domain: string; similarity: number };
  reasons: string[];
};

type SignalSeverity = "low" | "medium" | "high";

type SignalSet = {
  credentialIntent: SignalSeverity;
  bankImpersonation: SignalSeverity;
  suspiciousLinks: SignalSeverity;
  shortenedLinks: SignalSeverity;
  urgencyLanguage: SignalSeverity;
  grammarSpelling: SignalSeverity;
};

// Configurable keyword lists (extend in config/env later).
const bankKeywords = [
  "telebirr",
  "cbe",
  "commercial bank",
  "cbe birr",
  "dashen",
  "awash",
  "bank of abyssinia",
  "abyssinia",
  "ethio telecom",
  "ethiotelecom",
  "ቴሌብር",
  "ሲቢኢ",
];

const urgencyKeywords = [
  "blocked",
  "verify",
  "unblock",
  "urgent",
  "immediately",
  "suspended",
  "confirm",
  "reactivate",
  "otp",
  "pin",
  "password",
  "አስቸኳይ",
  "ታግዷል",
  "ያረጋግጡ",
];

const shorteners = ["bit.ly", "tinyurl", "t.co", "rebrand.ly", "goo.gl", "ow.ly", "is.gd"];

const implicitCredentialPhrases = [
  "verify account",
  "unlock account",
  "confirm information",
  "reactivate account",
  "restore account",
  "update account",
  "account verification",
  "confirm your details",
  "confirm your information",
  "ሂሳብ ያረጋግጡ",
  "መለያዎን ያረጋግጡ",
  "መለያዎን ያድሱ",
];

const officialDomains = [
  "cbe.com.et",
  "dashenbanksc.com",
  "awashbank.com",
  "ethiotelecom.et",
  "telebirr.com.et",
  "boabank.com",
  "zemenbank.com",
  "bankofabyssinia.com",
  "amharabank.com.et",
  "hibretbank.com.et",
  "coopbankoromia.com.et",
  "oromiabank.com",
  "wegagenbanksc.com",
  "abaybank.com.et",
];

const institutionProfiles = [
  {
    name: "Telebirr",
    keywords: ["telebirr", "ቴሌብር"],
    domains: ["telebirr.com.et", "ethiotelecom.et"],
  },
  {
    name: "CBE",
    keywords: ["cbe", "commercial bank", "cbe birr", "ሲቢኢ"],
    domains: ["cbe.com.et"],
  },
  {
    name: "Dashen Bank",
    keywords: ["dashen"],
    domains: ["dashenbanksc.com"],
  },
  {
    name: "Awash Bank",
    keywords: ["awash"],
    domains: ["awashbank.com"],
  },
  {
    name: "Bank of Abyssinia",
    keywords: ["abyssinia", "bank of abyssinia"],
    domains: ["bankofabyssinia.com", "boabank.com"],
  },
];

const reasonAmMap: Record<string, string> = {
  "Trusted official domain": "የታመነ መደበኛ ጎራ",
  "Domain looks like a bank impersonation": "የባንክ መስመስል ይመስላል",
  "Non-Ethiopian TLD for bank-related content": "የባንክ ይዘት ጋር የማይዛመድ የቲኤልዲ",
  "Shortened link detected": "አቀናበረ ሊንክ ተገኘ",
  "Urgent language detected": "አስቸኳይ ቋንቋ ተገኘ",
  "Bank keywords present": "የባንክ ቁልፍ ቃላት ተገኙ",
  "Credential request indicators": "የማረጋገጫ መረጃ ጥያቄ",
  "Implicit credential harvesting intent detected": "የተሸሸገ የመረጃ መጠየቅ እሴት ተገኘ",
  "Unusual sender pattern": "ያልተለመደ የላኪ መለያ",
  "Domain age unknown": "የጎራ ዕድሜ ያልታወቀ",
  "Trusted domain lowered risk": "ታመነ ጎራ ስጋትን ቀነሰ",
  "No urgency language detected": "አስቸኳይ ቋንቋ አልተገኘም",
  "No links detected": "ሊንክ አልተገኘም",
  "Credential intent detected": "የመረጃ መጠየቅ እሴት ተገኘ",
  "No credential intent detected": "የመረጃ መጠየቅ እሴት አልተገኘም",
  "Bank impersonation likely": "የባንክ መስመስል እድል ከፍቶ ነው",
  "Suspicious links detected": "አጠራጣሪ ሊንኮች ተገኙ",
  "Grammar/spelling anomalies detected": "የሰዋስው ወይም ፊደል ችግኝ ተገኘ",
};

const extractHostname = (input: string) => {
  try {
    const normalized = input.startsWith("http") ? input : `https://${input}`;
    return new URL(normalized).hostname.toLowerCase();
  } catch {
    return "";
  }
};

const detectTargetInstitution = (hostname: string, content: string) => {
  const lower = content.toLowerCase();
  if (hostname) {
    const byDomain = institutionProfiles.find((inst) =>
      inst.domains.some((domain) => hostname.endsWith(domain)),
    );
    if (byDomain) return byDomain.name;
  }
  const byKeyword = institutionProfiles.find((inst) => inst.keywords.some((k) => lower.includes(k)));
  return byKeyword?.name || "Unclassified";
};

const isEthiopianTld = (hostname: string) => /\.(et|com\.et|gov\.et|edu\.et|org\.et)$/i.test(hostname);

const levenshtein = (a: string, b: string) => {
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[a.length][b.length];
};

const similarity = (a: string, b: string) => {
  if (!a || !b) return 0;
  const distance = levenshtein(a, b);
  return 1 - distance / Math.max(a.length, b.length);
};

const estimateDomainAgeRisk = async (_hostname: string) => {
  // TODO: integrate WHOIS/registrar lookup or Python ML enrichment.
  // Returning neutral score for now.
  return { score: 0, reason: "Domain age unknown" };
};

const checkDomainReputation = async (hostname: string, content: string, tenantId: string): Promise<ReputationResult> => {
  const reasons: string[] = [];
  if (!hostname) {
    return { domainRiskScore: 0, isTrusted: false, reasons: ["Domain missing"] };
  }

  const trusted = await prisma.trustedDomain.findMany({ where: { tenantId }, select: { domain: true } });
  const whitelist = new Set([...officialDomains, ...trusted.map((d: { domain: string }) => d.domain)]);
  const isTrusted = Array.from(whitelist).some((domain) => hostname.endsWith(domain));

  let domainRiskScore = 0;
  let matchedDomain: string | undefined;

  if (isTrusted) {
    reasons.push("Trusted official domain");
    matchedDomain = Array.from(whitelist).find((domain) => hostname.endsWith(domain));
  }

  const lower = content.toLowerCase();
  const bankMention = bankKeywords.some((k) => lower.includes(k));

  if (!isTrusted && bankMention) {
    const bestMatch = Array.from(whitelist)
      .map((domain) => ({ domain, similarity: similarity(hostname, domain) }))
      .sort((a, b) => b.similarity - a.similarity)[0];
    if (bestMatch && bestMatch.similarity >= 0.75) {
      reasons.push("Domain looks like a bank impersonation");
      domainRiskScore += 35;
      matchedDomain = bestMatch.domain;
    }
  }

  if (bankMention && !isEthiopianTld(hostname)) {
    reasons.push("Non-Ethiopian TLD for bank-related content");
    domainRiskScore += 15;
  }

  const ageRisk = await estimateDomainAgeRisk(hostname);
  if (ageRisk.score > 0) {
    domainRiskScore += ageRisk.score;
  } else {
    reasons.push(ageRisk.reason);
  }

  return {
    domainRiskScore: Math.min(100, domainRiskScore),
    isTrusted,
    matchedDomain,
    suspiciousSimilarity: matchedDomain && !isTrusted ? { domain: matchedDomain, similarity: 0.8 } : undefined,
    reasons,
  };
};

const detectSignals = (type: "url" | "sms" | "email", content: string, hostname: string, isTrustedDomain: boolean) => {
  const lower = content.toLowerCase();
  const hasShortener = shorteners.some((s) => lower.includes(s));
  const hasUrgency = urgencyKeywords.some((w) => lower.includes(w));
  const hasBank = bankKeywords.some((w) => lower.includes(w));
  const hasLink = /https?:\/\//i.test(content) || /www\./i.test(content) || hasShortener;
  const hasIpUrl = /\b\d{1,3}(?:\.\d{1,3}){3}\b/.test(content);
  const explicitCreds = ["otp", "pin", "password", "code", "login", "auth", "verify"].some((w) => lower.includes(w));
  const implicitCreds = implicitCredentialPhrases.some((w) => lower.includes(w));
  const hasGrammarIssues = /\s{2,}|[.]{2,}|\b(ur|u r|pls|plz)\b/i.test(content);

  const credentialIntent: SignalSeverity = explicitCreds ? "high" : implicitCreds ? "medium" : "low";
  const bankImpersonation: SignalSeverity = hasBank && !isTrustedDomain ? "high" : hasBank ? "medium" : "low";
  const suspiciousLinks: SignalSeverity = hasShortener || hasIpUrl ? "high" : hasLink ? "medium" : "low";
  const shortenedLinks: SignalSeverity = hasShortener ? "high" : "low";
  const urgencyLanguage: SignalSeverity = hasUrgency && hasBank ? "high" : hasUrgency ? "medium" : "low";
  const grammarSpelling: SignalSeverity = hasGrammarIssues ? "low" : "low";

  const reasons: string[] = [];
  if (credentialIntent !== "low") reasons.push("Credential intent detected");
  if (bankImpersonation !== "low") reasons.push("Bank impersonation likely");
  if (suspiciousLinks !== "low") reasons.push("Suspicious links detected");
  if (shortenedLinks !== "low") reasons.push("Shortened link detected");
  if (urgencyLanguage !== "low") reasons.push("Urgent language detected");
  if (hasGrammarIssues) reasons.push("Grammar/spelling anomalies detected");
  if (!hasUrgency) reasons.push("No urgency language detected");
  if (!hasLink) reasons.push("No links detected");
  if (credentialIntent === "low") reasons.push("No credential intent detected");

  return {
    signals: {
      credentialIntent,
      bankImpersonation,
      suspiciousLinks,
      shortenedLinks,
      urgencyLanguage,
      grammarSpelling,
    } as SignalSet,
    reasons,
    hasLink,
    hasUrgency,
    hasBank,
  };
};

const combineRisk = (scores: { domain?: number; content?: number; ai?: number }) => {
  // Balanced blend to avoid maxing scores unless multiple signals align.
  const weighted = (scores.domain ?? 0) * 0.35 + (scores.content ?? 0) * 0.45 + (scores.ai ?? 0) * 0.2;
  const riskScore = Math.round(Math.min(100, weighted));
  const confidence = Math.min(100, Math.round((scores.content ?? riskScore) * 0.6 + (scores.ai ?? 0) * 0.4));
  return { riskScore, confidence };
};

const scoreFromSignals = (signals: SignalSet) => {
  const weight = (severity: SignalSeverity, high: number, medium: number, low = 0) =>
    severity === "high" ? high : severity === "medium" ? medium : low;

  const score =
    weight(signals.credentialIntent, 35, 20) +
    weight(signals.bankImpersonation, 25, 12) +
    weight(signals.suspiciousLinks, 25, 12) +
    weight(signals.shortenedLinks, 15, 8) +
    weight(signals.urgencyLanguage, 15, 8) +
    weight(signals.grammarSpelling, 5, 3);

  return Math.min(100, score);
};

const toRiskTier = (score: number): RiskTier => (score >= 86 ? "critical" : score >= 61 ? "high" : score >= 31 ? "suspicious" : "safe");

const toDbRiskLevel = (score: number): RiskLevel => (score >= 61 ? "high" : score >= 31 ? "medium" : "low");

const buildExplanation = (reasons: string[]) => {
  const unique = Array.from(new Set(reasons));
  const explanation = unique.length ? unique.join("; ") : "No significant risk indicators detected.";
  const explanationAm = unique.length
    ? unique.map((r) => reasonAmMap[r] || r).join("; ")
    : "ግልጽ የስጋት ምልክቶች አልተገኙም።";
  return { explanation, explanationAm };
};

const buildIndicatorEntries = (signals: SignalSet) => {
  const entries = [
    {
      name: "Credential Intent",
      nameAm: "የመረጃ መጠየቅ",
      severity: signals.credentialIntent,
      detected: signals.credentialIntent !== "low",
      description:
        signals.credentialIntent === "high"
          ? "Explicit credential harvesting language detected (PIN/OTP/password)."
          : signals.credentialIntent === "medium"
            ? "Implicit account verification language suggests credential harvesting intent."
            : "No credential harvesting intent detected.",
      descriptionAm:
        signals.credentialIntent === "high"
          ? "ፒን/OTP/የይለፍ ቃል እንደሚጠየቅ ግልጽ ቃላት ተገኙ።"
          : signals.credentialIntent === "medium"
            ? "የመለያ ማረጋገጫ የሚመስል ቋንቋ ተገኝቷል።"
            : "የመረጃ መጠየቅ እሴት አልተገኘም።",
    },
    {
      name: "Bank Impersonation",
      nameAm: "ባንክ መስመስል",
      severity: signals.bankImpersonation,
      detected: signals.bankImpersonation !== "low",
      description:
        signals.bankImpersonation === "high"
          ? "Content references Ethiopian banks but uses suspicious context or domains."
          : signals.bankImpersonation === "medium"
            ? "Bank-related keywords detected; verify authenticity."
            : "No bank impersonation signals detected.",
      descriptionAm:
        signals.bankImpersonation === "high"
          ? "የባንክ ስሞች ከማጭበርበር ጋር የሚጣመሩ ተመልከቱ።"
          : signals.bankImpersonation === "medium"
            ? "የባንክ ቁልፍ ቃላት ተገኙ። በመደበኛ መንገድ ያረጋግጡ።"
            : "የባንክ መስመስል ምልክት አልተገኘም።",
    },
    {
      name: "Suspicious Links",
      nameAm: "አጠራጣሪ ሊንኮች",
      severity: signals.suspiciousLinks,
      detected: signals.suspiciousLinks !== "low",
      description:
        signals.suspiciousLinks === "high"
          ? "Links point to shortened or IP-based destinations commonly used in phishing."
          : signals.suspiciousLinks === "medium"
            ? "Links present; verify destination legitimacy."
            : "No suspicious links detected.",
      descriptionAm:
        signals.suspiciousLinks === "high"
          ? "አጠራጣሪ ወይም አይፒ መሰረት ሊንኮች ተገኙ።"
          : signals.suspiciousLinks === "medium"
            ? "ሊንኮች ተገኙ፣ ተደራሽነታቸውን ያረጋግጡ።"
            : "አጠራጣሪ ሊንክ አልተገኘም።",
    },
    {
      name: "Shortened Links",
      nameAm: "አቀናበረ ሊንኮች",
      severity: signals.shortenedLinks,
      detected: signals.shortenedLinks !== "low",
      description: signals.shortenedLinks === "high" ? "Shortened links hide destination URLs." : "No shortened links detected.",
      descriptionAm: signals.shortenedLinks === "high" ? "አቀናበረ ሊንክ መዳረሻን ይደብቃል።" : "አቀናበረ ሊንኮች አልተገኙም።",
    },
    {
      name: "Urgency Language",
      nameAm: "አስቸኳይ ቋንቋ",
      severity: signals.urgencyLanguage,
      detected: signals.urgencyLanguage !== "low",
      description:
        signals.urgencyLanguage === "high" || signals.urgencyLanguage === "medium"
          ? "Urgency language is used to pressure the recipient."
          : "No urgency language detected.",
      descriptionAm:
        signals.urgencyLanguage === "high" || signals.urgencyLanguage === "medium"
          ? "አስቸኳይ ቋንቋ ተጠቃሚውን ለመጫን ተጠቃሚ ነው።"
          : "አስቸኳይ ቋንቋ አልተገኘም።",
    },
    {
      name: "Grammar & Spelling",
      nameAm: "ሰዋስው እና ፊደል",
      severity: signals.grammarSpelling,
      detected: signals.grammarSpelling !== "low",
      description: signals.grammarSpelling !== "low" ? "Language quality issues often appear in phishing." : "No language anomalies detected.",
      descriptionAm: signals.grammarSpelling !== "low" ? "የቋንቋ ጉድለት በፊሺንግ ተደጋጋሚ ነው።" : "የቋንቋ ጉድለት አልተገኘም።",
    },
  ];

  return entries;
};

export const detectRouter = Router();

detectRouter.post("/api/detect", async (req, res) => {
  const parsed = detectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const { type, content } = parsed.data;
  const tenantId = await getDefaultTenantId();
  const hostname = type === "url" ? extractHostname(content) : "";
  const lower = content.toLowerCase();
  const targetInstitution = detectTargetInstitution(hostname, content);
  const localIntelMatches = matchLocalIntel(type, content);

  let domainRisk: ReputationResult | null = null;
  const reasons: string[] = [];
  let isTrustedDomain = false;

  if (type === "url" && hostname) {
    domainRisk = await checkDomainReputation(hostname, content, tenantId);
    reasons.push(...domainRisk.reasons);
    isTrustedDomain = domainRisk.isTrusted;
  }

  const signalResult = detectSignals(type, content, hostname, isTrustedDomain);
  reasons.push(...signalResult.reasons);

  // Placeholder for ML scoring (Python). For now, use heuristic content score by type.
  const contentScore = scoreFromSignals(signalResult.signals);
  const aiScore = 0; // TODO: plug in Python ML model outputs.
  const { riskScore: baseRisk, confidence: baseConfidence } = combineRisk({
    domain: domainRisk?.domainRiskScore,
    content: contentScore,
    ai: aiScore,
  });

  let riskScore = baseRisk;
  // Reduce false positives only when signals are weak.
  if (domainRisk?.isTrusted) {
    riskScore = Math.max(0, riskScore - 20);
    reasons.push("Trusted domain lowered risk");
  }
  if (!signalResult.hasUrgency) {
    riskScore = Math.max(0, riskScore - 5);
  }
  if (!signalResult.hasLink) {
    riskScore = Math.max(0, riskScore - 10);
  }

  // Enforce minimum risk for credential intent.
  if (signalResult.signals.credentialIntent !== "low") {
    riskScore = Math.max(riskScore, 55);
  }

  // Escalate to 100 when multiple high-confidence signals align.
  const highSignals = Object.values(signalResult.signals).filter((s) => s === "high").length;
  if (highSignals >= 3) {
    riskScore = 100;
  }

  const riskTier = toRiskTier(riskScore);
  const dbRiskLevel = toDbRiskLevel(riskScore);
  const confidence = Math.min(100, Math.max(baseConfidence, Math.round((riskScore + (aiScore || 0)) / 2)));

  const { explanation, explanationAm } = buildExplanation(reasons);
  const status = riskTier === "critical" || riskTier === "high"
    ? "Phishing Detected"
    : riskTier === "suspicious"
    ? "Suspicious Content"
    : "Safe Content";

  const playbook = resolvePlaybook({ riskTier, institution: targetInstitution });
  const result = riskTier === "critical" || riskTier === "high" ? "phishing" : riskTier === "suspicious" ? "suspicious" : "safe";
  const aiConfidenceLabel = aiScore >= 70 ? "High" : aiScore >= 40 ? "Medium" : "Low";
  if (aiScore > 0) {
    reasons.push(`AI Confidence: ${aiConfidenceLabel} (${aiScore}%) — Matches known Ethiopian banking phishing patterns`);
  }
  const indicatorEntries = buildIndicatorEntries(signalResult.signals);
  const indicatorsJson = JSON.stringify(
    indicatorEntries.map((entry) => ({
      name: entry.name,
      nameAm: entry.nameAm,
      detected: entry.detected,
      severity: entry.severity,
      description: entry.description,
    })),
  );
  const localIntelJson = localIntelMatches.length ? JSON.stringify(localIntelMatches) : undefined;
  const playbookJson = playbook ? JSON.stringify(playbook) : undefined;
  const contentPreview = content.slice(0, 240);
  const contentHash = contentPreview ? crypto.createHash("sha256").update(contentPreview).digest("hex") : undefined;

  const created = await prisma.detectionLog.create({
    data: {
      tenantId,
      inputType: type,
      result,
      confidence,
      riskScore,
      riskLevel: dbRiskLevel,
      indicatorsJson,
      localIntelJson,
      playbookJson,
      summary: explanation,
      summaryAm: explanationAm,
      contentPreview,
      contentHash,
      trustedDomain: domainRisk?.isTrusted ?? false,
      institution: targetInstitution === "Unclassified" ? undefined : targetInstitution,
      attackType: type,
      status: riskScore >= 86 ? "confirmed_phishing" : riskScore <= 30 ? "false_positive" : "pending",
    },
  });

  await appendAuditLog({
    tenantId,
    action: "detect.analyze",
    targetType: "DetectionLog",
    targetId: created.id,
    metadata: { type, result, riskScore },
  });

  return res.json({
    status,
    riskScore,
    riskLevel: riskTier,
    confidence,
    targetInstitution,
    localIntelMatches,
    playbook,
    indicators: {
      credentialIntent: signalResult.signals.credentialIntent,
      bankImpersonation: signalResult.signals.bankImpersonation,
      suspiciousLinks: signalResult.signals.suspiciousLinks,
      shortenedLinks: signalResult.signals.shortenedLinks,
      urgencyLanguage: signalResult.signals.urgencyLanguage,
      grammarSpelling: signalResult.signals.grammarSpelling,
    },
    recommendation: result === "phishing"
      ? "Do not respond or share information. Verify directly with your bank using official channels."
      : result === "suspicious"
      ? "Proceed with caution and verify the sender or URL with official sources before taking action."
      : "This appears safe, but always verify sensitive requests through official channels.",
    explanation,
    explanationAmharic: explanationAm,
    explanationIndicators: indicatorEntries.map((entry) => ({
      name: entry.name,
      nameAm: entry.nameAm,
      severity: entry.severity,
      description: entry.description,
      descriptionAm: entry.descriptionAm,
    })),
  });
});
