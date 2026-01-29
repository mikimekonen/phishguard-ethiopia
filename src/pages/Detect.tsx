import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DetectionForm } from "@/components/detection/DetectionForm";
import { DetectionResult, DetectionResultData } from "@/components/detection/DetectionResult";
import { PatternAlerts } from "@/components/detection/PatternAlerts";
import { analyzeContent } from "@/lib/phishingDetector";
import { detectContent, logDetection, submitReport } from "@/lib/api";
import { Shield, AlertTriangle, Brain, Layers } from "lucide-react";

const Detect = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DetectionResultData | null>(null);
  const [reportStatus, setReportStatus] = useState<string | null>(null);

  const handleDetection = async (type: "url" | "sms" | "email", content: string) => {
    setIsLoading(true);
    setResult(null);
    setReportStatus(null);
    
    try {
      try {
        const apiResult = await detectContent(type, content);
        const isPhishing = apiResult.riskLevel === "high" || apiResult.riskLevel === "critical";
        const indicators = (apiResult.explanationIndicators || []).map((entry) => ({
          name: entry.name,
          nameAm: entry.nameAm,
          detected: entry.severity !== "low",
          severity: entry.severity,
          description: entry.description,
        }));
        const recommendationAm = isPhishing
          ? "ከመደበኛ የባንክ መንገዶች ብቻ ያረጋግጡ። መረጃ አትካፈሉ፣ ሊንኮችንም አትጫኑ።"
          : apiResult.riskLevel === "suspicious"
          ? "ተጠንቀቁ እና ለመቀጠል በመደበኛ መንገድ ያረጋግጡ።"
          : "ይመስላል ደህንነቱ የተጠበቀ ነው፣ ነገር ግን የማረጋገጫ ጥያቄዎችን ሁልጊዜ ያረጋግጡ።";

        const detectionResult = {
          isPhishing,
          confidence: apiResult.confidence,
          riskScore: apiResult.riskScore,
          summary: apiResult.explanation,
          summaryAm: apiResult.explanationAmharic,
          targetInstitution: apiResult.targetInstitution,
          type,
          content,
          localIntelMatches: apiResult.localIntelMatches,
          playbook: apiResult.playbook,
          indicators: indicators.length
            ? indicators
            : [
                {
                  name: "Credential Intent",
                  nameAm: "የመረጃ መጠየቅ",
                  detected: apiResult.indicators.credentialIntent !== "low",
                  severity: apiResult.indicators.credentialIntent,
                  description: apiResult.explanation,
                },
              ],
          recommendation: apiResult.recommendation,
          recommendationAm,
        } as DetectionResultData;

        setResult(detectionResult);

        // Backend /api/detect already stores a log entry; avoid double counting here.
      } catch (apiError) {
        const analysisResult = await analyzeContent(type, content);
        setResult(analysisResult);
        logDetection({
          inputType: type,
          result: analysisResult.isPhishing ? "phishing" : "safe",
          confidence: Math.round(analysisResult.confidence),
          aiScore: analysisResult.riskScore ?? analysisResult.confidence,
          riskScore: analysisResult.riskScore ?? analysisResult.confidence,
          indicators: analysisResult.indicators,
          summary: analysisResult.summary,
          summaryAm: analysisResult.summaryAm,
          contentPreview: content.slice(0, 240),
          trustedDomain: !analysisResult.isPhishing && analysisResult.indicators.some((i) => i.name === "Bank Lookalike Domain" && !i.detected),
        }).catch((err) => console.warn("Log save failed", err));
      }
    } catch (error) {
      console.error("Detection error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setReportStatus(null);
  };

  const handleReport = async () => {
    if (!result) return;
    setReportStatus("Submitting report...");
    try {
      await submitReport({
        message: result.summary || "Phishing suspicious content",
        url: result.type === "url" ? result.content : undefined,
        source: result.type,
      });
      setReportStatus("Report submitted. Thank you.");
    } catch (err: any) {
      setReportStatus(err.message || "Report failed");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Page Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary mb-6">
              <Shield className="h-4 w-4" />
              <span className="text-sm font-medium">Phishing Detection Tool</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Check for Phishing Threats
            </h1>
            <p className="text-lg text-secondary mb-2">
              ፊሺንግ ስጋቶችን ይፈትሹ
            </p>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Paste a suspicious URL, SMS message, or email content below. Our AI-powered system 
              will analyze it for phishing indicators targeting Ethiopian banking users.
            </p>
          </div>

          {/* Pipeline Explainer */}
          <div className="max-w-4xl mx-auto mb-6 p-4 md:p-5 rounded-2xl border border-border bg-muted/40 backdrop-blur-sm shadow-sm">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Layers className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-1 text-left">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span>Multi-layer AI detection</span>
                  <Brain className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  The pipeline combines heuristic checks, machine learning classification, and NLP-driven context understanding. This layered approach avoids false trust and keeps every detection explainable for analysts and end users.
                </p>
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto space-y-6">
            <PatternAlerts />

            {/* Main Card */}
            <div className="p-6 md:p-8 rounded-2xl border border-border bg-card/50 backdrop-blur-sm shadow-card">
              {result ? (
                <div className="space-y-4">
                  <DetectionResult result={result} onReset={handleReset} onReport={handleReport} />
                  {reportStatus && <p className="text-sm text-secondary">{reportStatus}</p>}
                </div>
              ) : (
                <DetectionForm onSubmit={handleDetection} isLoading={isLoading} />
              )}
            </div>
            {/* Warning Banner */}
            {!result && (
              <div className="p-4 rounded-xl bg-warning/10 border border-warning/30 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-medium text-warning mb-1">Important Security Notice</h4>
                  <p className="text-sm text-muted-foreground">
                    Ethiopian banks and Telebirr will <strong>never</strong> ask for your PIN, password, or OTP 
                    via SMS, email, or phone. If you receive such requests, it's a phishing attempt.
                  </p>
                  <p className="text-sm text-secondary mt-1">
                    የኢትዮጵያ ባንኮች እና ቴሌብር ፒን፣ የይለፍ ቃል ወይም OTP በኤስኤምኤስ፣ ኢሜይል ወይም ስልክ አይጠይቁም።
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Detect;
