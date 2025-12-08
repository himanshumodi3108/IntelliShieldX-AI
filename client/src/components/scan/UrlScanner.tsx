import { useState } from "react";
import { Globe, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface UrlScannerProps {
  onScan: (url: string) => void;
  isScanning?: boolean;
}

export function UrlScanner({ onScan, isScanning }: UrlScannerProps) {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onScan(url.trim());
    }
  };

  return (
    <div className="p-6 rounded-2xl glass">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-accent/20">
          <Globe className="h-6 w-6 text-accent" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">URL & IP Scanner</h3>
          <p className="text-sm text-muted-foreground">
            Scan any website URL or IP address for security vulnerabilities
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="https://example.com, example.com, or 192.168.1.1"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="pl-12 h-14 text-lg bg-secondary/50 border-border focus:border-primary"
          />
        </div>

        <Button
          type="submit"
          variant="cyber"
          size="lg"
          className="w-full"
          disabled={!url.trim() || isScanning}
        >
          {isScanning ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Search className="h-5 w-5" />
              Start Security Scan
            </>
          )}
        </Button>
      </form>

      <div className="mt-6 p-4 rounded-xl bg-secondary/30">
        <p className="text-sm font-medium mb-2">Scan includes:</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            "Threat Intelligence",
            "SQL Injection",
            "XSS Detection",
            "CSRF Validation",
            "SSL/TLS Check",
            "Header Analysis",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
