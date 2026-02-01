import { useState } from "react";
import { Link2, MessageSquare, Mail, Search, Loader2, FileSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type DetectionType = "url" | "sms" | "email" | "file";
type TextDetectionType = "url" | "sms" | "email";

interface DetectionFormProps {
  onSubmit: (type: TextDetectionType, content: string) => void;
  onFileSubmit: (file: File, meta?: { deliveryMethod?: string; impersonatedInstitution?: string }) => void;
  isLoading: boolean;
}

const detectionTypes = [
  { 
    id: "url" as DetectionType, 
    label: "URL", 
    labelAm: "ዩአርኤል",
    icon: Link2, 
    placeholder: "https://cbe-verify-account.com/login",
    description: "Check suspicious website links"
  },
  { 
    id: "sms" as DetectionType, 
    label: "SMS", 
    labelAm: "ኤስኤምኤስ",
    icon: MessageSquare, 
    placeholder: "የTelebirr ሂሳብዎ ታግዷል። ለማስተካከል እዚህ ይጫኑ: http://telebirr-verify.com",
    description: "Analyze SMS messages in Amharic or English"
  },
  { 
    id: "email" as DetectionType, 
    label: "Email", 
    labelAm: "ኢሜይል",
    icon: Mail, 
    placeholder: "Dear Customer, Your CBE account has been suspended. Click here to verify: http://cbe-birr-verify.com",
    description: "Scan email content for phishing"
  },
  {
    id: "file" as DetectionType,
    label: "File Scan",
    labelAm: "ፋይል ፍተሻ",
    icon: FileSearch,
    placeholder: "Upload a file to scan for malware",
    description: "Analyze files for malware (exe, apk, pdf, docx, zip)"
  },
];

const allowedExtensions = [".exe", ".apk", ".pdf", ".docx", ".zip"];
const maxFileSize = 25 * 1024 * 1024;

export function DetectionForm({ onSubmit, onFileSubmit, isLoading }: DetectionFormProps) {
  const [selectedType, setSelectedType] = useState<DetectionType>("url");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<string>("");
  const [impersonatedInstitution, setImpersonatedInstitution] = useState<string>("");

  const selectedConfig = detectionTypes.find((t) => t.id === selectedType)!;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedType === "file") {
      if (!file) return;
      if (fileError) return;
      onFileSubmit(file, {
        deliveryMethod: deliveryMethod || undefined,
        impersonatedInstitution: impersonatedInstitution || undefined,
      });
      return;
    }
    if (content.trim()) {
      onSubmit(selectedType as TextDetectionType, content.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Type Selector */}
      <div className="flex flex-wrap gap-3">
        {detectionTypes.map((type) => (
          <button
            key={type.id}
            type="button"
            onClick={() => {
              setSelectedType(type.id);
              setContent("");
              setFile(null);
              setFileError(null);
              setDeliveryMethod("");
              setImpersonatedInstitution("");
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-3 rounded-xl border transition-all duration-200",
              selectedType === type.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card hover:border-primary/50 text-muted-foreground hover:text-foreground"
            )}
          >
            <type.icon className="h-5 w-5" />
            <span className="font-medium">{type.label}</span>
            <span className="text-xs opacity-70">({type.labelAm})</span>
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">
          {selectedConfig.description}
        </label>
        {selectedType === "file" ? (
          <div className="space-y-3">
            <input
              type="file"
              accept={allowedExtensions.join(",")}
              onChange={(e) => {
                const selected = e.target.files?.[0] || null;
                setFile(selected);
                if (!selected) {
                  setFileError("Please select a file to scan.");
                  return;
                }
                const ext = `.${selected.name.split(".").pop() || ""}`.toLowerCase();
                if (!allowedExtensions.includes(ext)) {
                  setFileError("Unsupported file type. Allowed: exe, apk, pdf, docx, zip.");
                  return;
                }
                if (selected.size > maxFileSize) {
                  setFileError("File is too large. Max 25MB.");
                  return;
                }
                setFileError(null);
              }}
              className="w-full rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm"
            />
            <div className="text-xs text-muted-foreground">
              Max size 25MB. Allowed: {allowedExtensions.join(", ")}
            </div>
            {fileError && <p className="text-xs text-destructive">{fileError}</p>}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Delivery method (optional)</label>
                <select
                  value={deliveryMethod}
                  onChange={(e) => setDeliveryMethod(e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm"
                >
                  <option value="">Select method</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="apk">APK</option>
                  <option value="link">Link</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Impersonated institution (optional)</label>
                <select
                  value={impersonatedInstitution}
                  onChange={(e) => setImpersonatedInstitution(e.target.value)}
                  className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm"
                >
                  <option value="">Select institution</option>
                  <option value="Telebirr">Telebirr</option>
                  <option value="CBE">CBE</option>
                  <option value="Dashen">Dashen</option>
                  <option value="Awash">Awash</option>
                  <option value="BOA">BOA</option>
                </select>
              </div>
            </div>
          </div>
        ) : (
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={selectedConfig.placeholder}
            className="min-h-[150px] bg-muted/50 border-border focus:border-primary resize-none"
          />
        )}
      </div>

      {/* Submit Button */}
      <Button 
        type="submit" 
        variant="hero" 
        size="lg" 
        className="w-full"
        disabled={selectedType === "file" ? !file || !!fileError || isLoading : !content.trim() || isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Search className="h-5 w-5" />
            {selectedType === "file" ? "Scan File for Malware" : "Analyze for Phishing"}
          </>
        )}
      </Button>

      {/* Example Hints */}
      {selectedType !== "file" && (
        <div className="text-xs text-muted-foreground text-center">
          <span>Try example: </span>
          <button
            type="button"
            onClick={() => setContent(selectedConfig.placeholder)}
            className="text-primary hover:underline"
          >
            Load sample {selectedType.toUpperCase()}
          </button>
        </div>
      )}
    </form>
  );
}
