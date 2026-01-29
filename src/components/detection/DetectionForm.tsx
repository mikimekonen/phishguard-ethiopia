import { useState } from "react";
import { Link2, MessageSquare, Mail, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type DetectionType = "url" | "sms" | "email";

interface DetectionFormProps {
  onSubmit: (type: DetectionType, content: string) => void;
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
];

export function DetectionForm({ onSubmit, isLoading }: DetectionFormProps) {
  const [selectedType, setSelectedType] = useState<DetectionType>("url");
  const [content, setContent] = useState("");

  const selectedConfig = detectionTypes.find((t) => t.id === selectedType)!;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onSubmit(selectedType, content.trim());
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
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={selectedConfig.placeholder}
          className="min-h-[150px] bg-muted/50 border-border focus:border-primary resize-none"
        />
      </div>

      {/* Submit Button */}
      <Button 
        type="submit" 
        variant="hero" 
        size="lg" 
        className="w-full"
        disabled={!content.trim() || isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Search className="h-5 w-5" />
            Analyze for Phishing
          </>
        )}
      </Button>

      {/* Example Hints */}
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
    </form>
  );
}
