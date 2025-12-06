import { FileCode, Globe, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface RecentScansProps {
  scans: Array<{
    id: string;
    name: string;
    type: string;
    date: string | Date;
    critical: number;
    high: number;
    medium: number;
    low: number;
  }>;
  isDemo?: boolean;
}

const demoScans = [
  {
    id: "1",
    type: "file",
    name: "auth-service.js",
    date: "2 min ago",
    critical: 1,
    high: 2,
    medium: 3,
    low: 1,
  },
  {
    id: "2",
    type: "url",
    name: "https://example.com",
    date: "15 min ago",
    critical: 0,
    high: 1,
    medium: 4,
    low: 2,
  },
  {
    id: "3",
    type: "file",
    name: "payment-gateway.py",
    date: "1 hour ago",
    critical: 2,
    high: 4,
    medium: 6,
    low: 3,
  },
  {
    id: "4",
    type: "url",
    name: "https://api.myapp.io",
    date: "3 hours ago",
    critical: 0,
    high: 0,
    medium: 2,
    low: 5,
  },
  {
    id: "5",
    type: "file",
    name: "user-controller.java",
    date: "5 hours ago",
    critical: 1,
    high: 3,
    medium: 5,
    low: 2,
  },
];

function formatDate(date: string | Date): string {
  if (typeof date === "string" && !date.includes("ago")) {
    const dateObj = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return dateObj.toLocaleDateString();
  }
  return date.toString();
}

function SeverityBadge({ count, severity }: { count: number; severity: string }) {
  if (count === 0) return null;

  const colors: Record<string, string> = {
    critical: "bg-severity-critical/20 text-severity-critical",
    high: "bg-severity-high/20 text-severity-high",
    medium: "bg-severity-medium/20 text-severity-medium",
    low: "bg-severity-low/20 text-severity-low",
  };

  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", colors[severity])}>
      {count}
    </span>
  );
}

export function RecentScans({ scans, isDemo }: RecentScansProps) {
  const displayScans = isDemo ? demoScans : scans;

  return (
    <div className="p-6 rounded-2xl glass">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Recent Scans</h3>
        {!isDemo && (
          <Link
            to="/history"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            View All <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>

      {displayScans.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No scans yet. Start your first security scan to see results here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayScans.map((scan, i) => (
            <div
              key={scan.id}
              className="flex items-center gap-4 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer animate-fade-in"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="p-2 rounded-lg bg-secondary">
                {scan.type === "file" || scan.type === "chat" ? (
                  <FileCode className="h-4 w-4 text-primary" />
                ) : (
                  <Globe className="h-4 w-4 text-accent" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{scan.name}</p>
                <p className="text-sm text-muted-foreground">{formatDate(scan.date)}</p>
              </div>

              <div className="flex items-center gap-1.5">
                <SeverityBadge count={scan.critical} severity="critical" />
                <SeverityBadge count={scan.high} severity="high" />
                <SeverityBadge count={scan.medium} severity="medium" />
                <SeverityBadge count={scan.low} severity="low" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
