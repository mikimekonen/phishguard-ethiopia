import { Shield, Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Home", labelAm: "መነሻ", href: "/" },
  { label: "Detect", labelAm: "ፈትሽ", href: "/detect" },
  { label: "Learn", labelAm: "ትምህርት", href: "/learn" },
  { label: "Dashboard", labelAm: "ዳሽቦርድ", href: "/dashboard" },
  { label: "Cases", labelAm: "ኬሶች", href: "/cases" },
  { label: "About", labelAm: "ስለ እኛ", href: "/about" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full group-hover:bg-primary/50 transition-all" />
              <Shield className="relative h-8 w-8 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-tight">PhishGuard</span>
              <span className="text-[10px] text-muted-foreground leading-tight">Ethiopia</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  location.pathname === item.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* CTA Button */}
          <div className="hidden md:flex items-center gap-4">
            <Link to="/detect">
              <Button variant="hero" size="sm">
                Start Detection
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                    location.pathname === item.href
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <span>{item.label}</span>
                  <span className="text-xs text-muted-foreground ml-2">({item.labelAm})</span>
                </Link>
              ))}
              <Link to="/detect" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="hero" className="w-full mt-2">
                  Start Detection
                </Button>
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
