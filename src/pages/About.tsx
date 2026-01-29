import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { 
  Shield, 
  Target, 
  Users, 
  Code2, 
  Database, 
  Brain,
  GraduationCap,
  Github,
  Linkedin
} from "lucide-react";
import { Button } from "@/components/ui/button";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary mb-6">
              <GraduationCap className="h-4 w-4" />
              <span className="text-sm font-medium">Project Overview</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              About PhishGuard Ethiopia
            </h1>
            <p className="text-xl text-secondary mb-4">
              ስለ ፊሽጋርድ ኢትዮጵያ
            </p>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Dedicated to protecting Ethiopian banking and mobile money users from the rising threat of phishing attacks through AI-powered detection.
            </p>
          </div>

          {/* Mission & Vision */}
          <div className="grid md:grid-cols-2 gap-6 mb-16">
            <div className="p-8 rounded-2xl border border-border bg-card/50 backdrop-blur-sm">
              <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
              <p className="text-muted-foreground mb-4">
                To provide Ethiopian banking users with accessible, accurate, and real-time 
                phishing detection tools that protect their financial security and personal data.
              </p>
              <p className="text-sm text-secondary">
                የኢትዮጵያ ባንክ ተጠቃሚዎችን ከፊሺንግ ጥቃቶች ለመከላከል የሚያስችል ተደራሽ፣ ትክክለኛ እና ቅጽበታዊ ዳሰሳ መሳሪያዎችን ማቅረብ።
              </p>
            </div>
            
            <div className="p-8 rounded-2xl border border-border bg-card/50 backdrop-blur-sm">
              <div className="p-3 rounded-xl bg-accent/10 w-fit mb-4">
                <Shield className="h-8 w-8 text-accent" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Our Vision</h2>
              <p className="text-muted-foreground mb-4">
                A future where every Ethiopian can safely use digital banking and mobile money 
                services without fear of cyber attacks, contributing to Ethiopia's digital economy growth.
              </p>
              <p className="text-sm text-secondary">
                እያንዳንዱ ኢትዮጵያዊ ዲጂታል ባንኪንግ እና ሞባይል ገንዘብ አገልግሎቶችን ያለፍርሃት የሚጠቀምበት ወደፊት።
              </p>
            </div>
          </div>

          {/* Problem Statement */}
          <div className="mb-16 p-8 rounded-2xl gradient-hero border border-primary/20">
            <h2 className="text-2xl font-bold mb-6 text-center">The Problem We're Solving</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { 
                  title: "Fake SMS Messages", 
                  titleAm: "የሐሰት ኤስኤምኤስ",
                  description: "Attackers send SMS impersonating Telebirr and banks" 
                },
                { 
                  title: "Fraudulent Websites", 
                  titleAm: "የማጭበርበሪያ ድረ-ገጾች",
                  description: "Fake banking sites using similar domains" 
                },
                { 
                  title: "Social Media Scams", 
                  titleAm: "ማህበራዊ ሚዲያ ማጭበርበሪያ",
                  description: "Fake Facebook pages targeting bank customers" 
                },
                { 
                  title: "Email Phishing", 
                  titleAm: "ኢሜይል ፊሺንግ",
                  description: "Phishing emails targeting employees and customers" 
                },
              ].map((item, index) => (
                <div key={index} className="text-center">
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-xs text-secondary mb-2">{item.titleAm}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Technology Stack */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold mb-8 text-center">Technology Stack</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { name: "React + Vite", icon: Code2, description: "Frontend UI" },
                { name: "TypeScript", icon: Code2, description: "Safe typing" },
                { name: "Express API", icon: Code2, description: "Backend with JWT auth" },
                { name: "Prisma", icon: Database, description: "ORM (SQLite/Postgres ready)" },
                { name: "SQLite / Postgres", icon: Database, description: "Detection logs" },
                { name: "Python ML", icon: Brain, description: "Model training & scoring" },
                { name: "TailwindCSS", icon: Code2, description: "Styling" },
              ].map((tech) => (
                <div
                  key={tech.name}
                  className="p-4 rounded-xl border border-border bg-card/50 text-center hover:border-primary/50 transition-colors"
                >
                  <tech.icon className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <h3 className="font-medium text-sm">{tech.name}</h3>
                  <p className="text-xs text-muted-foreground">{tech.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ML Features */}
          <div className="mb-16 p-8 rounded-2xl border border-border bg-card/50">
            <h2 className="text-2xl font-bold mb-6">Machine Learning Approach</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-4">Detection Features</h3>
                <ul className="space-y-3">
                  {[
                    "URL length and structure analysis",
                    "Domain age verification",
                    "SSL certificate validation",
                    "Keyword pattern matching (Amharic & English)",
                    "Urgency language detection",
                    "Credential request identification",
                    "Bank name impersonation detection",
                  ].map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Model Performance</h3>
                <div className="space-y-4">
                  {[
                    { metric: "Accuracy", value: "98.2%" },
                    { metric: "Precision", value: "97.8%" },
                    { metric: "Recall", value: "96.5%" },
                    { metric: "F1-Score", value: "97.1%" },
                  ].map((item) => (
                    <div key={item.metric}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">{item.metric}</span>
                        <span className="font-medium text-success">{item.value}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div 
                          className="h-full rounded-full gradient-safe"
                          style={{ width: item.value }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Project Owner */}
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-8">Project Owner</h2>
            <div className="inline-flex flex-col items-center p-8 rounded-2xl border border-border bg-card/50">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4 overflow-hidden">
                <img
                  src="/michu.jpg"
                  alt="MIhceal Mekonen"
                  className="h-full w-full object-cover"
                />
              </div>
              <h3 className="text-xl font-semibold mb-1">Micheal Mekonen</h3>
              <p className="text-muted-foreground mb-4">Computer Science Department</p>
              <div className="flex gap-3">
                <Button asChild variant="outline" size="sm">
                  <a href="https://github.com/mikimekonen" target="_blank" rel="noopener noreferrer">
                    <Github className="h-4 w-4 mr-2" />
                    GitHub
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default About;
