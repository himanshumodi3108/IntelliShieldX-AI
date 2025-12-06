import { Navbar } from "@/components/layout/Navbar";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { SITE_CONFIG } from "@/lib/constants";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
      </main>
      
      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container px-4 text-center">
          <p className="text-muted-foreground">
            © {SITE_CONFIG.foundedYear} {SITE_CONFIG.name}. {SITE_CONFIG.tagline}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
