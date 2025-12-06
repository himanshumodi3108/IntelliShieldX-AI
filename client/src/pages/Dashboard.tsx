import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { SeverityChart } from "@/components/dashboard/SeverityChart";
import { VulnerabilityTrend } from "@/components/dashboard/VulnerabilityTrend";
import { RecentScans } from "@/components/dashboard/RecentScans";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { dashboardApi } from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface DashboardStats {
  totalScans: number;
  activeVulnerabilities: number;
  filesAnalyzed: number;
  avgScanTime: number;
  totalChatMessages: number;
  connectedRepositories: number;
  severityBreakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  recentScans: Array<{
    id: string;
    name: string;
    type: string;
    date: string;
    critical: number;
    high: number;
    medium: number;
    low: number;
  }>;
  vulnerabilityTrend: Array<{
    date: string;
    critical: number;
    high: number;
    medium: number;
    low: number;
  }>;
  isDemo: boolean;
}

// Demo data for unauthenticated users
const getDemoStats = (): DashboardStats => {
  // Generate demo vulnerability trend (last 7 days)
  const demoTrend = [];
  const baseValues = { critical: 2, high: 6, medium: 12, low: 20 };
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const dateKey = date.toISOString().split("T")[0];
    // Add some variation to make it look realistic
    const variation = Math.random() * 0.3 + 0.85; // 85-115% variation
    demoTrend.push({
      date: dateKey,
      critical: Math.round(baseValues.critical * variation),
      high: Math.round(baseValues.high * variation),
      medium: Math.round(baseValues.medium * variation),
      low: Math.round(baseValues.low * variation),
    });
  }

  return {
    totalScans: 12,
    activeVulnerabilities: 50,
    filesAnalyzed: 45,
    avgScanTime: 8,
    totalChatMessages: 23,
    connectedRepositories: 2,
    severityBreakdown: {
      critical: 3,
      high: 8,
      medium: 15,
      low: 24,
    },
    recentScans: [
      {
        id: "demo-1",
        name: "auth-service.js",
        type: "file",
        date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        critical: 1,
        high: 2,
        medium: 3,
        low: 1,
      },
      {
        id: "demo-2",
        name: "https://example.com/api",
        type: "url",
        date: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        critical: 0,
        high: 1,
        medium: 4,
        low: 2,
      },
      {
        id: "demo-3",
        name: "payment-gateway.py",
        type: "file",
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        critical: 2,
        high: 4,
        medium: 6,
        low: 3,
      },
    ],
    vulnerabilityTrend: demoTrend,
    isDemo: true,
  };
};

const Dashboard = () => {
  const { isAuthenticated } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [isAuthenticated]);

  const loadStats = async () => {
    // For unauthenticated users, use hardcoded demo data without API call
    if (!isAuthenticated) {
      setStats(getDemoStats());
      setIsLoading(false);
      return;
    }

    // For authenticated users, fetch real data from API
    try {
      setIsLoading(true);
      const data = await dashboardApi.getStats() as DashboardStats;
      setStats(data);
    } catch (error) {
      console.error("Failed to load dashboard stats:", error);
      // Fallback to demo data on error
      setStats(getDemoStats());
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-12">
        <div className="container px-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Security Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                {isAuthenticated
                  ? "Monitor vulnerabilities and track your security posture"
                  : "View demo dashboard - Sign in to see your actual data"}
              </p>
            </div>
            {isAuthenticated && (
              <Link to="/scan">
                <Button variant="cyber">
                  <Plus className="h-5 w-5 mr-2" />
                  New Scan
                </Button>
              </Link>
            )}
          </div>

          {!isAuthenticated && (
            <Alert className="mb-6 border-primary/20 bg-primary/10">
              <Info className="h-4 w-4" />
              <AlertDescription>
                You're viewing a demo dashboard. <Link to="/register" className="text-primary hover:underline font-medium">Sign up</Link> or <Link to="/login" className="text-primary hover:underline font-medium">log in</Link> to see your actual security data and analytics.
              </AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : stats ? (
            <>
              {/* Stats */}
              <StatsCards stats={stats} />

              {/* Charts Row */}
              <div className="grid lg:grid-cols-2 gap-6 mt-6">
                <SeverityChart severityBreakdown={stats.severityBreakdown} />
                <VulnerabilityTrend trend={stats.vulnerabilityTrend} />
              </div>

              {/* Recent Scans */}
              <div className="mt-6">
                <RecentScans scans={stats.recentScans} isDemo={stats.isDemo} />
              </div>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
