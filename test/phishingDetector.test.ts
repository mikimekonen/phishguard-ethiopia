import { describe, it, expect } from "vitest";

import { analyzeContent } from "../src/lib/phishingDetector";

// Wrapper to access returned DetectionResultData via existing function
async function run(type: "url" | "sms" | "email", content: string) {
  const res = await analyzeContent(type, content);
  return res;
}

describe("PhishGuard-ET detection", () => {
  it("flags SMS with bit.ly unblock theme as phishing", async () => {
    const sample = "Fake Telebirr unblock link using bit.ly redirects";
    const result = await run("sms", sample);
    expect(result.isPhishing).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(50);
  });

  it("flags bank lookalike non-official URL", async () => {
    const url = "http://telebirr-verify-account.com/login";
    const result = await run("url", url);
    expect(result.isPhishing).toBe(true);
  });

  it("keeps official domains safer by default", async () => {
    const url = "https://cbe.com.et/services";
    const result = await run("url", url);
    expect(result.isPhishing).toBe(false);
  });
});
