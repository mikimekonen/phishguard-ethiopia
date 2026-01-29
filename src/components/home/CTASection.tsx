import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 gradient-hero" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/20 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Icon */}
          <div className="inline-flex p-4 rounded-2xl bg-primary/10 border border-primary/30 mb-8">
            <ShieldCheck className="h-12 w-12 text-primary" />
          </div>

          {/* Content */}
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Start Protecting Yourself Today
          </h2>
          <p className="text-xl text-secondary mb-2">
            ዛሬ እራስዎን መከላከል ይጀምሩ
          </p>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Don't wait for an attack. Check any suspicious URL, SMS, or email before it's too late.
          </p>

          {/* CTA */}
          <Link to="/detect">
            <Button variant="hero" size="xl" className="group">
              Check for Phishing
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>

          {/* Trust Indicators */}
          <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span>Free to Use</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span>Instant Results</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span>No Registration Required</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
