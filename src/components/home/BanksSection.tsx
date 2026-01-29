import { Building2, Smartphone, CreditCard, Wallet } from "lucide-react";

const banks = [
  { name: "Telebirr", nameAm: "ቴሌብር", icon: Smartphone, type: "Mobile Money" },
  { name: "CBE Birr", nameAm: "ሲቢኢ ብር", icon: Wallet, type: "Mobile Banking" },
  { name: "Commercial Bank of Ethiopia", nameAm: "የኢትዮጵያ ንግድ ባንክ", icon: Building2, type: "Bank" },
  { name: "Dashen Bank", nameAm: "ዳሽን ባንክ", icon: CreditCard, type: "Bank" },
  { name: "Awash Bank", nameAm: "አዋሽ ባንክ", icon: Building2, type: "Bank" },
  { name: "Bank of Abyssinia", nameAm: "የአቢሲኒያ ባንክ", icon: Building2, type: "Bank" },
];

export function BanksSection() {
  return (
    <section className="py-24 bg-muted/30 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, hsl(var(--primary)) 0%, transparent 50%),
                             radial-gradient(circle at 75% 75%, hsl(var(--accent)) 0%, transparent 50%)`,
          }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Protecting Ethiopian Banking
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Specialized detection for major Ethiopian financial institutions and mobile money platforms.
          </p>
        </div>

        {/* Banks Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {banks.map((bank, index) => (
            <div
              key={bank.name}
              className="group flex flex-col items-center p-6 rounded-2xl border border-border bg-card/80 backdrop-blur-sm hover:border-primary/50 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <bank.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-center mb-1">{bank.name}</h3>
              <p className="text-xs text-secondary text-center">{bank.nameAm}</p>
              <span className="mt-2 text-[10px] text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
                {bank.type}
              </span>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: "10K+", label: "Scans Performed", labelAm: "ፍተሻዎች" },
            { value: "98%", label: "Detection Rate", labelAm: "መለያ ደረጃ" },
            { value: "500+", label: "Threats Blocked", labelAm: "የታገዱ ስጋቶች" },
            { value: "24/7", label: "Protection", labelAm: "ጥበቃ" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-gradient mb-2">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
              <div className="text-xs text-secondary">{stat.labelAm}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
