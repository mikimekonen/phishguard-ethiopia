import { Shield, Github, Mail, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/50 light:bg-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-4">
              <Shield className="h-8 w-8 text-primary" />
              <div className="flex flex-col">
                <span className="font-bold text-lg">PhishGuard Ethiopia</span>
                <span className="text-xs text-muted-foreground">ፊሽጋርድ ኢትዮጵያ</span>
              </div>
            </Link>
            <p className="text-sm text-muted-foreground max-w-sm">
              Protecting Ethiopian banking and mobile money users from phishing attacks 
              through AI-powered detection and real-time analysis.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              የኢትዮጵያ ባንኪንግ እና ሞባይል ገንዘብ ተጠቃሚዎችን ከፊሺንግ ጥቃቶች መከላከል
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/detect" className="text-muted-foreground hover:text-primary transition-colors">
                  Phishing Detection
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-muted-foreground hover:text-primary transition-colors">
                  Admin Dashboard
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors">
                  About Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Supported Banks */}
          <div>
            <h4 className="font-semibold mb-4">Supported Platforms</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Telebirr</li>
              <li>CBE Birr</li>
              <li>Commercial Bank of Ethiopia</li>
              <li>Dashen Bank</li>
              <li>Awash Bank</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2026 PhishGuard Ethiopia.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/mikimekonen"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <Github className="h-5 w-5" />
            </a>
            <a
              href="mailto:mikimekonen9@gmail.com"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <Mail className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
