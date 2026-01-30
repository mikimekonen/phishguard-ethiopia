import { Shield, ShieldCheck, AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background Effects */}
      <div className="absolute inset-0 gradient-hero dark:opacity-100 light:opacity-80" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 light:bg-primary/5 rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 light:bg-accent/5 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "1s" }} />
      
      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--primary) / 0.3) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(var(--primary) / 0.3) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 light:bg-primary/5 light:border-primary/20 text-primary mb-8 animate-fade-in">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-sm font-medium">Protecting Ethiopian Banking Users</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <span className="text-gradient">Phishing Detection</span>
            <br />
            <span className="text-foreground">for Ethiopia</span>
          </h1>

          {/* Amharic Subtitle */}
          <p className="text-xl md:text-2xl text-secondary font-medium mb-4 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            ፊሺንግ መለያ ስርዓት ለኢትዮጵያ
          </p>

          {/* Description */}
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            Protect yourself from phishing attacks targeting Telebirr, CBE Birr, and Ethiopian banks. 
            Analyze suspicious URLs, SMS messages, and emails instantly with our AI-powered detection system.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <Link to="/detect">
              <Button variant="hero" size="xl" className="w-full sm:w-auto group">
                Start Detection
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/about">
              <Button variant="glass" size="xl" className="w-full sm:w-auto">
                Learn More
              </Button>
            </Link>
          </div>

          {/* Floating Shield */}
          <div className="relative w-32 h-32 mx-auto animate-float">
            <div className="absolute inset-0 bg-primary/20 light:bg-primary/10 rounded-full blur-2xl" />
            <div className="relative w-full h-full flex items-center justify-center">
              <Shield className="w-20 h-20 text-primary animate-shield-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
