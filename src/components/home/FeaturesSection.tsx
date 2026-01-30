import { Link2, MessageSquare, Mail, Globe, Shield, BarChart3 } from "lucide-react";

const features = [
  {
    icon: Link2,
    title: "URL Analysis",
    titleAm: "ዩአርኤል ትንተና",
    description: "Detect phishing websites targeting Ethiopian banks with domain age, SSL, and pattern analysis.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: MessageSquare,
    title: "SMS Detection",
    titleAm: "ኤስኤምኤስ ፍተሻ",
    description: "Analyze SMS messages in Amharic and English for phishing indicators and urgency patterns.",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    icon: Mail,
    title: "Email Scanning",
    titleAm: "ኢሜይል ቅኝት",
    description: "Scan email content for suspicious links, attachments, and social engineering tactics.",
    color: "text-secondary",
    bgColor: "bg-secondary/10",
  },
  {
    icon: Globe,
    title: "Amharic Support",
    titleAm: "የአማርኛ ድጋፍ",
    description: "Full bilingual support for Amharic and English text analysis and user interface.",
    color: "text-ethiopian-green",
    bgColor: "bg-ethiopian-green/10",
  },
  {
    icon: Shield,
    title: "ML-Powered",
    titleAm: "ኤምኤል ሃይል",
    description: "Machine learning models trained on Ethiopian-specific phishing patterns and datasets.",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    titleAm: "ትንታኔዎች",
    description: "Track attack trends, view statistics, and export reports for security research.",
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Comprehensive Protection
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our multi-layered detection system analyzes various attack vectors to keep Ethiopian users safe.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group relative p-6 rounded-2xl border border-border bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 light:bg-white light:border-slate-200 light:hover:border-primary/40"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Icon */}
              <div className={`inline-flex p-3 rounded-xl ${feature.bgColor} mb-4`}>
                <feature.icon className={`h-6 w-6 ${feature.color}`} />
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold mb-1">{feature.title}</h3>
              <p className="text-sm text-secondary mb-2">{feature.titleAm}</p>
              <p className="text-muted-foreground text-sm">{feature.description}</p>

              {/* Hover Glow */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
