import { DetectionResultData } from "@/components/detection/DetectionResult";
import { classifyContent } from "@/lib/aiDetection";

type Indicator = {
  name: string;
  nameAm: string;
  detected: boolean;
  severity: "high" | "medium" | "low";
  description: string;
};

function analyzeIndicators(type: "url" | "sms" | "email", content: string): Indicator[] {
  const lowerContent = content.toLowerCase();
  const indicators: Indicator[] = [];

  const isBankKeywordPresent = /telebirr|cbe|commercial bank|dashen|awash|birr|abyssinia|zemen|amhara|hibret|coop|ቴሌብር|ሲቢኢ/i.test(
    lowerContent,
  );

  const extractHostname = (url: string) => {
    try {
      const normalized = url.startsWith("http") ? url : `https://${url}`;
      return new URL(normalized).hostname.toLowerCase();
    } catch (error) {
      return "";
    }
  };

  const hostname = type === "url" ? extractHostname(content) : "";
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

  const isOfficialDomain = officialDomains.some((domain) => hostname.endsWith(domain));
  const hasSuspiciousTld =
    type === "url" &&
    isBankKeywordPresent &&
    !/\.(et|com\.et|org\.et|gov\.et)$/i.test(hostname);
  const hasBankLookalike = type === "url" && isBankKeywordPresent && !isOfficialDomain;

  if (type === "url") {
    indicators.push({
      name: "Bank Lookalike Domain",
      nameAm: "የባንክ ማመሳሰል ጎራ",
      detected: hasBankLookalike,
      severity: "high",
      description: hasBankLookalike
        ? "Domain mentions Ethiopian bank/Telebirr but is not an official .et or registered domain"
        : "No obvious impersonation in domain",
    });

    const hasHttps = content.trim().toLowerCase().startsWith("https://");
    indicators.push({
      name: "SSL Certificate",
      nameAm: "SSL ሰርተፊኬት",
      detected: !hasHttps,
      severity: "medium",
      description: hasHttps ? "Site uses secure HTTPS connection" : "Site does not use secure HTTPS",
    });

    const hasIpAddress = /\b\d{1,3}(?:\.\d{1,3}){3}\b/.test(content);
    indicators.push({
      name: "IP Address URL",
      nameAm: "አይፒ አድራሻ",
      detected: hasIpAddress,
      severity: "high",
      description: hasIpAddress
        ? "URL uses IP address instead of domain name - common in phishing"
        : "URL uses proper domain name",
    });

    const isLongUrl = content.length > 100;
    indicators.push({
      name: "URL Length",
      nameAm: "ዩአርኤል ርዝመት",
      detected: isLongUrl,
      severity: "low",
      description: isLongUrl
        ? "Unusually long URL - may contain hidden malicious parameters"
        : "URL length is normal",
    });

    indicators.push({
      name: "Suspicious TLD",
      nameAm: "አጠራጣሪ ቲኤልዲ",
      detected: hasSuspiciousTld,
      severity: "medium",
      description: hasSuspiciousTld
        ? "Domain is not using trusted Ethiopian TLDs"
        : "TLD appears regional/expected",
    });
  }

  if (type === "sms" || type === "email") {
    const urgencyWords = [
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
    ];
    const hasUrgency = urgencyWords.some((word) => lowerContent.includes(word));

    indicators.push({
      name: "Urgency Language",
      nameAm: "አስቸኳይ ቋንቋ",
      detected: hasUrgency,
      severity: "medium",
      description: hasUrgency ? "Message uses urgent language to create pressure" : "No urgency tactics detected",
    });

    const hasShortener = /bit\.ly|tinyurl|t\.co|rebrand\.ly|goo\.gl|ow\.ly|is\.gd/i.test(content);
    const hasLink = /https?:\/\/|www\./i.test(content) || hasShortener;
    const hasSuspiciousLink = hasLink && !/\.et$|cbe\.com\.et|ethiotelecom\.et/i.test(content);
    indicators.push({
      name: "Suspicious Links",
      nameAm: "አጠራጣሪ ማስፈንጠሪያዎች",
      detected: hasSuspiciousLink,
      severity: "high",
      description: hasSuspiciousLink ? "Message contains links to non-official domains" : "No suspicious links detected",
    });

    indicators.push({
      name: "Shortened Link",
      nameAm: "አቀናበረ ማስፈንጠሪያ",
      detected: hasShortener,
      severity: "high",
      description: hasShortener
        ? "Message references link shorteners (bit.ly/tinyurl) commonly used to hide phishing destinations"
        : "No link shortener detected",
    });

    const credentialWords = ["password", "pin", "otp", "code", "account", "login", "ይግቡ", "የይለፍ ቃል", "ኮድ"];
    const requestsCredentials = credentialWords.some((word) => lowerContent.includes(word));
    indicators.push({
      name: "Credential Request",
      nameAm: "የመረጃ ጥያቄ",
      detected: requestsCredentials,
      severity: "high",
      description: requestsCredentials
        ? "Message requests sensitive credentials - banks never ask for this via SMS/Email"
        : "No credential requests detected",
    });

    const impersonatesBank = isBankKeywordPresent;
    indicators.push({
      name: "Bank Impersonation",
      nameAm: "ባንክ መስመስል",
      detected: impersonatesBank && (hasUrgency || hasSuspiciousLink || requestsCredentials),
      severity: "high",
      description:
        impersonatesBank && (hasUrgency || hasSuspiciousLink || requestsCredentials)
          ? "Message impersonates Ethiopian financial institution with suspicious content"
          : "No impersonation detected",
    });

    const unblockKeywords = ["unblock", "unlock", "restore", "reactivate", "resume", "unsuspend", "አንቀሳቅስ", "አነቃነቅ"];
    const hasUnblockTheme = unblockKeywords.some((word) => lowerContent.includes(word));
    indicators.push({
      name: "Account Unlock Theme",
      nameAm: "የመለያ መክፈቻ ገጽታ",
      detected: hasUnblockTheme && impersonatesBank,
      severity: "medium",
      description:
        hasUnblockTheme && impersonatesBank
          ? "Mentions unblocking/reactivating bank account alongside bank keywords"
          : "No unblock/reactivation language detected",
    });
  }

  const hasGrammarIssues = /\s{2,}|[.]{2,}|\b(ur|u r|pls|plz)\b/i.test(content);
  indicators.push({
    name: "Grammar & Spelling",
    nameAm: "ሰዋስው እና ፊደል ግድፈት",
    detected: hasGrammarIssues,
    severity: "low",
    description: hasGrammarIssues
      ? "Content contains grammar or spelling issues common in phishing"
      : "Grammar and spelling appear normal",
  });

  return indicators;
}

function calculatePhishingScore(indicators: Indicator[]): number {
  let score = 0;
  for (const indicator of indicators) {
    if (indicator.detected) {
      switch (indicator.severity) {
        case "high":
          score += 30;
          break;
        case "medium":
          score += 15;
          break;
        case "low":
          score += 5;
          break;
      }
    }
  }
  return Math.min(score, 99);
}

export async function analyzeContent(
  type: "url" | "sms" | "email",
  content: string,
): Promise<DetectionResultData> {
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const baseIndicators = analyzeIndicators(type, content);
  const ai = await classifyContent(type, content);

  const heuristicScore = calculatePhishingScore(baseIndicators);
  const blended = Math.round(Math.min(99, heuristicScore * 0.6 + ai.score * 0.8));
  const riskScore = Math.max(heuristicScore, blended);
  const isPhishing = riskScore >= 50 || ai.label === "phishing";

  const detected = baseIndicators
    .filter((i) => i.detected)
    .sort((a, b) => {
      const w = (s: string) => (s === "high" ? 3 : s === "medium" ? 2 : 1);
      return w(b.severity) - w(a.severity);
    });
  const topReasons = detected.slice(0, 3).map((i) => i.name);
  if (ai.reasons && ai.reasons.length) topReasons.unshift("AI signal: " + ai.reasons[0]);
  const summary = topReasons.length
    ? `Reasons: ${topReasons.join(", ")}`
    : isPhishing
    ? "Multiple risk signals detected."
    : "No significant risk signals detected.";

  const amMap: Record<string, string> = {
    "Bank Lookalike Domain": "የባንክ ጎራ መመስረት",
    "Suspicious TLD": "አጠራጣሪ ቲኤልዲ",
    "IP Address URL": "የአይፒ አድራሻ ዩአርኤል",
    "SSL Certificate": "SSL ሰርተፊኬት",
    "URL Length": "የዩአርኤል ርዝመት",
    "Urgency Language": "አስቸኳይ ቋንቋ",
    "Suspicious Links": "አጠራጣሪ ሊንኮች",
    "Shortened Link": "አቀናበረ ሊንክ",
    "Credential Request": "የመረጃ ጥያቄ",
    "Bank Impersonation": "የባንክ መስመስል",
    "Account Unlock Theme": "የመለያ መክፈቻ ገጽታ",
    "AI Classification": "AI መለያ",
  };
  const topReasonsAm = detected.slice(0, 3).map((i) => amMap[i.name] || i.nameAm || i.name);
  const summaryAm = topReasonsAm.length
    ? `ምክንያቶች፡ ${topReasonsAm.join(", ")}`
    : isPhishing
    ? "ብዙ የስጋት ምልክቶች ተገኝተዋል።"
    : "የተወሰነ የስጋት ምልክት አልተገኘም።";

  const indicators: Indicator[] = [
    ...baseIndicators,
    {
      name: "AI Classification",
      nameAm: "AI መለያ",
      detected: ai.label === "phishing",
      severity: ai.score >= 70 ? "high" : ai.score >= 50 ? "medium" : "low",
      description: `AI score ${ai.score} — ${ai.reasons.join("; ")}`,
    },
  ];

  return {
    isPhishing,
    confidence: isPhishing ? riskScore : 100 - riskScore,
    riskScore,
    summary,
    summaryAm,
    type,
    content,
    indicators,
    recommendation: isPhishing
      ? "Do NOT click any links or provide personal information. This appears to be a phishing attempt targeting Ethiopian banking users."
      : "This content appears to be safe. However, always verify directly with your bank through official channels.",
    recommendationAm: isPhishing
      ? "ማንኛውንም ማስፈንጠሪያ አይጫኑ ወይም የግል መረጃ አይስጡ። ይህ ፊሺንግ ሙከራ ይመስላል።"
      : "ይህ ይዘት ደህንነቱ የተጠበቀ ይመስላል። ሆኖም፣ ሁልጊዜ በቀጥታ ከባንክዎ ጋር ያረጋግጡ።",
  };
}
