import { useState } from "react";
import { Hash, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface HashScannerProps {
  onScan: (hash: string, hashType: "sha256" | "sha1" | "md5") => void;
  isScanning?: boolean;
}

export function HashScanner({ onScan, isScanning }: HashScannerProps) {
  const [hash, setHash] = useState("");
  const [hashType, setHashType] = useState<"sha256" | "sha1" | "md5">("sha256");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedHash = hash.trim();
    console.log("HashScanner handleSubmit:", { hash, trimmedHash, hashType, isValid: isValidHash(trimmedHash, hashType) });
    if (trimmedHash && isValidHash(trimmedHash, hashType)) {
      onScan(trimmedHash, hashType);
    } else {
      console.error("HashScanner: Invalid hash or empty", { trimmedHash, hashType, isValid: isValidHash(trimmedHash, hashType) });
    }
  };

  // Validate hash format
  const isValidHash = (hashValue: string, type: "sha256" | "sha1" | "md5"): boolean => {
    const hashLower = hashValue.toLowerCase().trim();
    if (type === "sha256") {
      return /^[a-f0-9]{64}$/i.test(hashLower);
    } else if (type === "sha1") {
      return /^[a-f0-9]{40}$/i.test(hashLower);
    } else if (type === "md5") {
      return /^[a-f0-9]{32}$/i.test(hashLower);
    }
    return false;
  };

  const getHashPlaceholder = (type: "sha256" | "sha1" | "md5"): string => {
    if (type === "sha256") {
      return "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    } else if (type === "sha1") {
      return "da39a3ee5e6b4b0d3255bfef95601890afd80709";
    } else {
      return "d41d8cd98f00b204e9800998ecf8427e";
    }
  };

  return (
    <div className="p-6 rounded-2xl glass">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-accent/20">
          <Hash className="h-6 w-6 text-accent" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Hash Scanner</h3>
          <p className="text-sm text-muted-foreground">
            Analyze file hashes for malware and security threats
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="hashType">Hash Type</Label>
          <Select value={hashType} onValueChange={(v) => setHashType(v as "sha256" | "sha1" | "md5")}>
            <SelectTrigger id="hashType" className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sha256">SHA256 (64 characters)</SelectItem>
              <SelectItem value="sha1">SHA1 (40 characters)</SelectItem>
              <SelectItem value="md5">MD5 (32 characters)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="relative">
          <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder={getHashPlaceholder(hashType)}
            value={hash}
            onChange={(e) => setHash(e.target.value)}
            className="pl-12 h-14 text-lg bg-secondary/50 border-border focus:border-primary font-mono"
          />
        </div>

        {hash.trim() && !isValidHash(hash, hashType) && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">
              Invalid {hashType.toUpperCase()} format. Must be {hashType === "sha256" ? "64" : hashType === "sha1" ? "40" : "32"} hexadecimal characters.
            </p>
          </div>
        )}

        <Button
          type="submit"
          variant="cyber"
          size="lg"
          className="w-full"
          disabled={!hash.trim() || !isValidHash(hash, hashType) || isScanning}
        >
          {isScanning ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Hash className="h-5 w-5" />
              Start Hash Analysis
            </>
          )}
        </Button>
      </form>

      <div className="mt-6 p-4 rounded-xl bg-secondary/30">
        <p className="text-sm font-medium mb-2">Hash Analysis includes:</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            "VirusTotal",
            "MalwareBazaar",
            "Hybrid Analysis",
            "ThreatFox",
            "Hash Reputation",
            "Malware Detection",
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

