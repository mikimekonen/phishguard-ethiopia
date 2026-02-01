export type VerdictInput = {
  staticScore: number;
  mlScore: number;
  intelScore: number;
  behaviorScore?: number;
  indicators: string[];
  knownMalwareFamily?: string;
};

export type VerdictOutput = {
  verdict: "Clean" | "Suspicious" | "Malicious";
  confidence: number;
  decisiveSignal: string;
  reasonSummary: string[];
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const normalizeInput = (value: number | undefined) => {
  if (!Number.isFinite(value)) return 0;
  return clamp(Math.round(value || 0), 0, 100);
};

const logDecision = (stage: string, details: Record<string, unknown>) => {
  console.info(`[verdictEngine] ${stage}`, details);
};

export const evaluateVerdict = (input: VerdictInput): VerdictOutput => {
  const staticScore = normalizeInput(input.staticScore);
  const mlScore = normalizeInput(input.mlScore);
  const intelScore = normalizeInput(input.intelScore);
  const behaviorScore = normalizeInput(input.behaviorScore);
  const indicators = Array.isArray(input.indicators) ? input.indicators : [];

  logDecision("inputs", {
    staticScore,
    mlScore,
    intelScore,
    behaviorScore,
    indicators,
    knownMalwareFamily: input.knownMalwareFamily || null,
  });

  const reasons: string[] = [];

  if (input.knownMalwareFamily) {
    reasons.push(`Known malware family: ${input.knownMalwareFamily}.`);
    logDecision("override", { decisiveSignal: "knownMalwareFamily" });
    return {
      verdict: "Malicious",
      confidence: 90,
      decisiveSignal: "knownMalwareFamily",
      reasonSummary: reasons,
    };
  }

  if (behaviorScore >= 75) {
    reasons.push(`High behavior score: ${behaviorScore}.`);
    logDecision("override", { decisiveSignal: "behaviorScore" });
    return {
      verdict: "Malicious",
      confidence: 85,
      decisiveSignal: "behaviorScore",
      reasonSummary: reasons,
    };
  }

  if (mlScore >= 70 && intelScore < 70) {
    reasons.push(`High ML score without strong intel: ML=${mlScore}, Intel=${intelScore}.`);
    logDecision("override", { decisiveSignal: "mlScore" });
    return {
      verdict: "Malicious",
      confidence: 80,
      decisiveSignal: "mlScore",
      reasonSummary: reasons,
    };
  }

  const hasHighEntropyIndicator = indicators.some((indicator) => indicator.toLowerCase().includes("entropy"));
  const multipleIndicators = indicators.length >= 3;

  if (staticScore >= 40 && hasHighEntropyIndicator) {
    reasons.push("Static score high with high-entropy indicator.");
    logDecision("escalation", { decisiveSignal: "staticScore+entropy" });
    return {
      verdict: "Suspicious",
      confidence: clamp(Math.max(55, staticScore), 45, 74),
      decisiveSignal: "staticScore+entropy",
      reasonSummary: reasons,
    };
  }

  if (intelScore >= 50) {
    reasons.push(`Intel score elevated: ${intelScore}.`);
    logDecision("escalation", { decisiveSignal: "intelScore" });
    return {
      verdict: "Suspicious",
      confidence: clamp(Math.max(55, intelScore), 45, 74),
      decisiveSignal: "intelScore",
      reasonSummary: reasons,
    };
  }

  if (multipleIndicators) {
    reasons.push(`Multiple indicators (${indicators.length}) suggest risk.`);
    logDecision("escalation", { decisiveSignal: "indicatorCount" });
    return {
      verdict: "Suspicious",
      confidence: 50,
      decisiveSignal: "indicatorCount",
      reasonSummary: reasons,
    };
  }

  const strongest = Math.max(staticScore, mlScore, intelScore, behaviorScore);
  if (strongest > 0) {
    reasons.push(`Weak signals detected (max score ${strongest}).`);
    logDecision("clean", { decisiveSignal: "weakSignals" });
    return {
      verdict: "Clean",
      confidence: clamp(30 - Math.floor(strongest / 5), 5, 30),
      decisiveSignal: "weakSignals",
      reasonSummary: reasons,
    };
  }

  reasons.push("No signals detected; defaulting to Clean.");
  logDecision("clean", { decisiveSignal: "noSignals" });
  return {
    verdict: "Clean",
    confidence: 15,
    decisiveSignal: "noSignals",
    reasonSummary: reasons,
  };
};
