export type Playbook = {
  id: string;
  name: string;
  actions: string[];
  rationale: string;
};

export const resolvePlaybook = (params: {
  riskTier: "safe" | "suspicious" | "high" | "critical";
  institution: string;
}) => {
  const target = params.institution || "Unclassified";
  if (params.riskTier === "critical" || params.riskTier === "high") {
    return {
      id: "pg-bank-001",
      name: `Immediate Bank Response (${target})`,
      rationale: "High-confidence phishing indicators and elevated risk require immediate containment.",
      actions: [
        "Block sender/domain and isolate affected endpoints.",
        "Notify the targeted bank security contact within 15 minutes.",
        "Preserve evidence and initiate incident response workflow.",
        "Monitor related accounts for anomalous access attempts.",
      ],
    } satisfies Playbook;
  }
  if (params.riskTier === "suspicious") {
    return {
      id: "pg-bank-002",
      name: `Verification & Monitoring (${target})`,
      rationale: "Moderate indicators require validation and monitoring before escalation.",
      actions: [
        "Validate the sender or URL using official bank channels.",
        "Flag affected accounts for heightened monitoring.",
        "Educate recipients to avoid OTP/PIN sharing.",
      ],
    } satisfies Playbook;
  }
  return {
    id: "pg-bank-003",
    name: "Advisory Monitoring",
    rationale: "No high-risk indicators detected; continue baseline monitoring.",
    actions: [
      "No immediate action required.",
      "Continue routine monitoring for similar patterns.",
      "Encourage verification for sensitive requests.",
    ],
  } satisfies Playbook;
};
