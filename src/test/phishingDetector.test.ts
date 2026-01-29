import { describe, it, expect } from "vitest";
import { analyzeContent } from "@/lib/phishingDetector";

describe("PhishGuard-ET detection", () => {
  it("flags SMS with bit.ly unblock theme as phishing", async () => {
    const sample = "Fake Telebirr unblock link using bit.ly redirects";
    const result = await analyzeContent("sms", sample);
    expect(result.isPhishing).toBe(true);
    expect((result.riskScore ?? result.confidence)).toBeGreaterThanOrEqual(50);
  });

  it("flags bank lookalike non-official URL", async () => {
    const url = "http://telebirr-verify-account.com/login";
    const result = await analyzeContent("url", url);
    expect(result.isPhishing).toBe(true);
  });

  it("keeps official domains safer by default", async () => {
    const url = "https://cbe.com.et/services";
    const result = await analyzeContent("url", url);
    expect(result.isPhishing).toBe(false);
  });
});
