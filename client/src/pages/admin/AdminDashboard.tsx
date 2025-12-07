import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, CreditCard, FileText, Activity, TrendingUp, Database, MessageSquare } from "lucide-react";
import adminApi from "@/lib/adminApi";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface OverviewStats {
  users: {
    total: number;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
  };
  scans: {
    total: number;
    today: number;
  };
  documentation: {
    total: number;
    today: number;
  };
  conversations: {
    total: number;
  };
  models: {
    active: number;
  };
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function AdminDashboard() {
  const { isAuthenticated, isLoading: authLoading } = useAdminAuth();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [userAnalytics, setUserAnalytics] = useState<any>(null);
  const [revenue, setRevenue] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Wait for auth to be checked before loading data
    if (!authLoading && isAuthenticated) {
      // Small delay to ensure token is fully set in apiClient
      const timer = setTimeout(() => {
        loadData();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [authLoading, isAuthenticated]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Ensure token is refreshed before making requests
      const adminToken = localStorage.getItem("admin_token");
      if (!adminToken) {
        throw new Error("Admin token not found. Please log in again.");
      }

      const [overview, userData, revenueData] = await Promise.all([
        adminApi.getOverview(),
        adminApi.getUserAnalytics("30"),
        adminApi.getRevenueAnalytics("month"),
      ]);
      setStats(overview);
      setUserAnalytics(userData);
      setRevenue(revenueData);
    } catch (error: any) {
      console.error("Failed to load dashboard data:", error);
      if (error.message?.includes("authentication") || error.message?.includes("token")) {
        // Token issue - redirect to login
        window.location.href = "/admin/login";
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading) {
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
          <h1 className="text-3xl font-bold mb-2">Dashboard Overview</h1>
          <p className="text-muted-foreground">Welcome to the admin panel</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.users.total || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                +{stats?.users.newToday || 0} today
              </p>
            </CardContent>
          </Card>

          <Card className="glass border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.scans.total || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                +{stats?.scans.today || 0} today
              </p>
            </CardContent>
          </Card>

          <Card className="glass border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Documentation</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.documentation.total || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                +{stats?.documentation.today || 0} today
              </p>
            </CardContent>
          </Card>

          <Card className="glass border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Models</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.models.active || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                AI models configured
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Growth Chart */}
          {userAnalytics?.growth && (
            <Card className="glass border-border">
              <CardHeader>
                <CardTitle>User Growth</CardTitle>
                <CardDescription>New users over the last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={userAnalytics.growth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="_id" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="count" stroke="#3b82f6" name="New Users" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Revenue Chart */}
          {revenue?.revenue && (
            <Card className="glass border-border">
              <CardHeader>
                <CardTitle>Revenue by Plan</CardTitle>
                <CardDescription>Revenue distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={revenue.revenue}
                      dataKey="total"
                      nameKey="_id"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {revenue.revenue.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Users by Plan */}
          {userAnalytics?.byPlan && (
            <Card className="glass border-border">
              <CardHeader>
                <CardTitle>Users by Plan</CardTitle>
                <CardDescription>Plan distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={userAnalytics.byPlan}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="_id" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#3b82f6" name="Users" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Users by Registration Method */}
          {userAnalytics?.byMethod && (
            <Card className="glass border-border">
              <CardHeader>
                <CardTitle>Registration Methods</CardTitle>
                <CardDescription>How users signed up</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={userAnalytics.byMethod}
                      dataKey="count"
                      nameKey="_id"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {userAnalytics.byMethod.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

