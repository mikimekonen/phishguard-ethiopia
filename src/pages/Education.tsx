import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, BookOpen, Info, CheckCircle2, XCircle, Globe2 } from "lucide-react";

const examples = [
  {
    title: "Fake Telebirr unlock SMS",
    am: "የተሳሳተ የቴሌብር መክፈቻ ኤስኤምኤስ",
    fake: "Telebirr account blocked. Click http://bit.ly/ab12 to unblock now.",
    real: "Telebirr will never send short links or ask you to unblock via SMS.",
  },
  {
    title: "Bank lookalike URL",
    am: "የባንክ ቅርጽ ያለው ዩአርኤል",
    fake: "https://cbe-verify-login.com.et-update.xyz/login",
    real: "Official: https://www.cbe.com.et/",
  },
  {
    title: "Credential harvest email",
    am: "የመረጃ መሰብሰቢያ ኢሜይል",
    fake: "Verify your account or it will be closed. Send your OTP now.",
    real: "Banks never ask for PIN/OTP over email or SMS.",
  },
];

const tips = [
  {
    en: "Check domain endings (.et, .com.et) and avoid random TLDs.",
    am: "የድር ገጹን መጨረሻ (.et, .com.et) ያረጋግጡ፣ ያልታመኑ ቲኤልዲዎችን ይቆጥቡ።",
  },
  {
    en: "Never share PIN, password, or OTP through links or forms you did not request.",
    am: "ፒን፣ የይለፍ ቃል፣ OTP ከተጠየቀ በቀር በማንኛውም ሊንክ ወይም ቅጽ አትስጡ።",
  },
  {
    en: "Shortened links (bit.ly, tinyurl) hide destinations—treat them as high risk.",
    am: "አጭር ሊንኮች (bit.ly, tinyurl) መድረሻ ያጣሉ፣ ከፍተኛ ስጋት ይቆጠራሉ።",
  },
  {
    en: "Urgent tone + bank name + link = likely phishing.",
    am: "አስቸኳይ ቋንቋ + የባንክ ስም + ሊንክ = ብዙ ጊዜ ፊሺንግ ነው።",
  },
];

const Education = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary">
              <ShieldAlert className="h-4 w-4" />
              <span className="text-sm font-medium">Phishing Education / የፊሺንግ ትምህርት</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold">Stay Safe Online in Ethiopia</h1>
            <p className="text-muted-foreground max-w-3xl mx-auto">
              Understand common phishing tricks targeting Telebirr and Ethiopian banks. Compare fake vs. real messages and learn quick checks in both English and Amharic.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {tips.map((tip, idx) => (
              <Card key={idx} className="border-border bg-card/60">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Info className="h-4 w-4 text-primary" />
                    <span>{tip.en}</span>
                  </div>
                  <p className="text-xs text-secondary">{tip.am}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4">
            {examples.map((example) => (
              <Card key={example.title} className="border-border bg-card/60">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    {example.title}
                    <span className="text-xs text-secondary">({example.am})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                  <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                    <div className="flex items-center gap-2 text-destructive font-semibold mb-1">
                      <XCircle className="h-4 w-4" /> Fake / የሐሰት
                    </div>
                    <p className="text-sm text-destructive/90">{example.fake}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-success/10 border border-success/20">
                    <div className="flex items-center gap-2 text-success font-semibold mb-1">
                      <CheckCircle2 className="h-4 w-4" /> Real / እውነተኛ
                    </div>
                    <p className="text-sm text-success/90">{example.real}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-border bg-card/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe2 className="h-4 w-4 text-primary" /> Safe Browsing Checklist
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-3 text-sm text-muted-foreground">
              <div className="space-y-2">
                <p>• Hover to see the real URL before you click.</p>
                <p>• Prefer typing bank domains directly: cbe.com.et, dashenbanksc.com, awashbank.com.</p>
                <p>• Use HTTPS and avoid IP-only links.</p>
              </div>
              <div className="space-y-2 text-secondary">
                <p>• ድር ገጹን ከመጫንዎ በፊት ዩአርኤል ይመልከቱ።</p>
                <p>• የባንኩን ኦፊሴላዊ ጎታ በቀጥታ ይፃፉ፤ ምሳሌ፡ cbe.com.et።</p>
                <p>• HTTPS ያለውን ጎታ ይጠቀሙ፣ የአይፒ አድራሻ ሊንኮችን ይቆጥቡ።</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Education;
