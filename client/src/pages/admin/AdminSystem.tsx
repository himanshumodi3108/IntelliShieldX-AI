import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Activity, Database, Server, CheckCircle2, XCircle } from "lucide-react";
import adminApi from "@/lib/adminApi";

export default function AdminSystem() {
  const [health, setHealth] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSystemData();
    const interval = setInterval(loadSystemData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadSystemData = async () => {
    try {
      const [healthData, metricsData] = await Promise.all([
        adminApi.getSystemHealth(),
        adminApi.getSystemMetrics(),
      ]);
      setHealth(healthData);
      setMetrics(metricsData);
    } catch (error) {
      console.error("Failed to load system data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">System Monitoring</h1>
          <p className="text-muted-foreground">Monitor system health and performance</p>
        </div>

        {/* System Health */}
        {health && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="glass border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  System Health
                </CardTitle>
                <CardDescription>Current system status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Overall Status</span>
                  <Badge variant={health.status === "healthy" ? "default" : "destructive"}>
                    {health.status}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Database
                    </span>
                    {health.services.database.status === "connected" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Server className="h-4 w-4" />
                      AI Engine
                    </span>
                    {health.services.aiEngine.status === "connected" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Metrics */}
            {metrics && (
              <Card className="glass border-border">
                <CardHeader>
                  <CardTitle>System Metrics</CardTitle>
                  <CardDescription>Performance metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Memory Usage</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Heap Used:</span>
                        <span>{(metrics.memory.heapUsed / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Heap Total:</span>
                        <span>{(metrics.memory.heapTotal / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Uptime</div>
                    <div className="text-sm">
                      {Math.floor(metrics.uptime / 3600)}h {Math.floor((metrics.uptime % 3600) / 60)}m
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Node Version</div>
                    <div className="text-sm">{metrics.nodeVersion}</div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}




