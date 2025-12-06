import { Shield, AlertTriangle, FileCode, Clock } from "lucide-react";

interface StatsCardsProps {
  stats: {
    totalScans: number;
    activeVulnerabilities: number;
    filesAnalyzed: number;
    avgScanTime: number;
    isDemo?: boolean;
  };
}

export function StatsCards({ stats }: StatsCardsProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const statsData = [
    {
      icon: Shield,
      label: "Total Scans",
      value: stats.isDemo ? "1,284" : formatNumber(stats.totalScans),
      change: stats.isDemo ? "+12%" : stats.totalScans > 0 ? "+12%" : "0%",
      positive: true,
    },
    {
      icon: AlertTriangle,
      label: "Active Vulnerabilities",
      value: stats.isDemo ? "30" : stats.activeVulnerabilities.toString(),
      change: stats.isDemo ? "-8%" : stats.activeVulnerabilities > 0 ? "-8%" : "0%",
      positive: true,
    },
    {
      icon: FileCode,
      label: "Files Analyzed",
      value: stats.isDemo ? "45.2K" : formatNumber(stats.filesAnalyzed),
      change: stats.isDemo ? "+24%" : stats.filesAnalyzed > 0 ? "+24%" : "0%",
      positive: true,
    },
    {
      icon: Clock,
      label: "Avg. Scan Time",
      value: stats.isDemo ? "28s" : `${stats.avgScanTime}s`,
      change: stats.isDemo ? "-15%" : stats.avgScanTime > 0 ? "-15%" : "0%",
      positive: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statsData.map((stat, i) => (
        <div
          key={i}
          className="p-5 rounded-2xl glass glass-hover animate-fade-in"
          style={{ animationDelay: `${i * 0.1}s` }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
            </div>
            <div className="p-2 rounded-lg bg-primary/10">
              <stat.icon className="h-5 w-5 text-primary" />
            </div>
          </div>
          {stats.isDemo && (
            <div className="mt-3">
              <span
                className={`text-sm font-medium ${
                  stat.positive ? "text-success" : "text-destructive"
                }`}
              >
                {stat.change}
              </span>
              <span className="text-sm text-muted-foreground"> vs last week</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
