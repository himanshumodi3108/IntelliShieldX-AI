import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Calendar, FileText, FileSpreadsheet } from "lucide-react";
import adminApi from "@/lib/adminApi";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import jsPDF from "jspdf";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AdminReports() {
  const [revenueReport, setRevenueReport] = useState<any>(null);
  const [userReport, setUserReport] = useState<any>(null);
  const [usageReport, setUsageReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    loadReports();
  }, [startDate, endDate]);

  const loadReports = async () => {
    try {
      setIsLoading(true);
      const [revenue, users, usage] = await Promise.all([
        adminApi.getRevenueReport(startDate || undefined, endDate || undefined),
        adminApi.getUserReport(startDate || undefined, endDate || undefined),
        adminApi.getUsageReport(startDate || undefined, endDate || undefined),
      ]);
      setRevenueReport(revenue);
      setUserReport(users);
      setUsageReport(usage);
    } catch (error) {
      console.error("Failed to load reports:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toast.error("No data to export");
      return;
    }

    // Get headers from first object
    const headers = Object.keys(data[0]);
    
    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            // Handle nested objects and arrays
            if (value === null || value === undefined) return "";
            if (typeof value === "object") return JSON.stringify(value);
            // Escape commas and quotes
            const stringValue = String(value);
            if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          })
          .join(",")
      ),
    ].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV exported successfully!");
  };

  const exportToPDF = (type: string, data: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPosition = margin;

    // Header
    doc.setFillColor(29, 78, 137);
    doc.rect(0, 0, pageWidth, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(`${type.charAt(0).toUpperCase() + type.slice(1)} Report`, margin, 25);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 35);

    yPosition = 50;
    doc.setTextColor(0, 0, 0);

    // Report content based on type
    if (type === "revenue" && data) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Revenue Summary", margin, yPosition);
      yPosition += 15;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      if (data.total) {
        doc.text(`Total Revenue: ₹${data.total.toLocaleString()}`, margin, yPosition);
        yPosition += 10;
      }
      if (data.period) {
        doc.text(
          `Period: ${data.period.startDate ? new Date(data.period.startDate).toLocaleDateString() : "N/A"} - ${data.period.endDate ? new Date(data.period.endDate).toLocaleDateString() : "N/A"}`,
          margin,
          yPosition
        );
        yPosition += 15;
      }

      if (data.daily && data.daily.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.text("Daily Revenue", margin, yPosition);
        yPosition += 10;
        doc.setFont("helvetica", "normal");

        data.daily.forEach((day: any) => {
          if (yPosition > 250) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text(`${day._id}: ₹${day.total?.toLocaleString() || 0}`, margin + 5, yPosition);
          yPosition += 8;
        });
      }
    } else if (type === "users" && data) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("User Growth Summary", margin, yPosition);
      yPosition += 15;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      if (data.total) {
        doc.text(`Total Users: ${data.total.toLocaleString()}`, margin, yPosition);
        yPosition += 10;
      }
      if (data.period) {
        doc.text(
          `Period: ${data.period.startDate ? new Date(data.period.startDate).toLocaleDateString() : "N/A"} - ${data.period.endDate ? new Date(data.period.endDate).toLocaleDateString() : "N/A"}`,
          margin,
          yPosition
        );
        yPosition += 15;
      }

      if (data.growth && data.growth.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.text("Daily User Growth", margin, yPosition);
        yPosition += 10;
        doc.setFont("helvetica", "normal");

        data.growth.forEach((day: any) => {
          if (yPosition > 250) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text(`${day._id}: ${day.count || 0} new users`, margin + 5, yPosition);
          yPosition += 8;
        });
      }
    } else if (type === "usage" && data) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Usage Summary", margin, yPosition);
      yPosition += 15;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      if (data.period) {
        doc.text(
          `Period: ${data.period.startDate ? new Date(data.period.startDate).toLocaleDateString() : "N/A"} - ${data.period.endDate ? new Date(data.period.endDate).toLocaleDateString() : "N/A"}`,
          margin,
          yPosition
        );
        yPosition += 15;
      }

      if (data.scans && data.scans.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.text("Scans by Date", margin, yPosition);
        yPosition += 10;
        doc.setFont("helvetica", "normal");

        data.scans.forEach((day: any) => {
          if (yPosition > 250) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text(`${day._id}: ${day.count || 0} scans`, margin + 5, yPosition);
          yPosition += 8;
        });
        yPosition += 5;
      }

      if (data.documentation && data.documentation.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.text("Documentation by Date", margin, yPosition);
        yPosition += 10;
        doc.setFont("helvetica", "normal");

        data.documentation.forEach((day: any) => {
          if (yPosition > 250) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text(`${day._id}: ${day.count || 0} documentation`, margin + 5, yPosition);
          yPosition += 8;
        });
      }
    }

    // Footer
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Page ${i} of ${totalPages}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      );
    }

    const filename = `${type}-report-${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(filename);
    toast.success("PDF exported successfully!");
  };

  const handleExport = (type: string, format: "pdf" | "csv") => {
    let data: any = null;
    
    if (type === "revenue") {
      data = revenueReport;
    } else if (type === "users") {
      data = userReport;
    } else if (type === "usage") {
      data = usageReport;
    }

    if (!data) {
      toast.error("No data available to export");
      return;
    }

    if (format === "csv") {
      // Export CSV based on report type
      if (type === "revenue" && data.daily) {
        exportToCSV(data.daily, `${type}-report`);
      } else if (type === "users" && data.growth) {
        exportToCSV(data.growth, `${type}-report`);
      } else if (type === "usage") {
        // Combine scans and documentation for usage report
        const combinedData = [
          ...(data.scans || []).map((s: any) => ({ ...s, type: "scans" })),
          ...(data.documentation || []).map((d: any) => ({ ...d, type: "documentation" })),
        ];
        exportToCSV(combinedData, `${type}-report`);
      }
    } else {
      exportToPDF(type, data);
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Reports</h1>
            <p className="text-muted-foreground">Generate and export platform reports</p>
          </div>
        </div>

        {/* Date Filters */}
        <Card className="glass border-border">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 rounded-md border border-border bg-background"
                />
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 rounded-md border border-border bg-background"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Report */}
        {revenueReport && (
          <Card className="glass border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Revenue Report</CardTitle>
                  <CardDescription>
                    {revenueReport.period.startDate && revenueReport.period.endDate
                      ? `${new Date(revenueReport.period.startDate).toLocaleDateString()} - ${new Date(revenueReport.period.endDate).toLocaleDateString()}`
                      : "All time"}
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleExport("revenue", "pdf")}>
                      <FileText className="h-4 w-4 mr-2" />
                      Export as PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("revenue", "csv")}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export as CSV
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              {revenueReport.daily && revenueReport.daily.length > 0 && (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenueReport.daily}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="_id" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="total" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} name="Revenue" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* User Report */}
        {userReport && (
          <Card className="glass border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>User Growth Report</CardTitle>
                  <CardDescription>
                    {userReport.period.startDate && userReport.period.endDate
                      ? `${new Date(userReport.period.startDate).toLocaleDateString()} - ${new Date(userReport.period.endDate).toLocaleDateString()}`
                      : "All time"}
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleExport("users", "pdf")}>
                      <FileText className="h-4 w-4 mr-2" />
                      Export as PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("users", "csv")}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export as CSV
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              {userReport.growth && userReport.growth.length > 0 && (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={userReport.growth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="_id" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="count" stroke="#10b981" name="New Users" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* Usage Report */}
        {usageReport && (
          <Card className="glass border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Usage Report</CardTitle>
                  <CardDescription>
                    {usageReport.period.startDate && usageReport.period.endDate
                      ? `${new Date(usageReport.period.startDate).toLocaleDateString()} - ${new Date(usageReport.period.endDate).toLocaleDateString()}`
                      : "All time"}
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleExport("usage", "pdf")}>
                      <FileText className="h-4 w-4 mr-2" />
                      Export as PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("usage", "csv")}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export as CSV
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {usageReport.scans && usageReport.scans.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Scans</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={usageReport.scans}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="_id" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#3b82f6" name="Scans" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {usageReport.documentation && usageReport.documentation.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Documentation</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={usageReport.documentation}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="_id" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#10b981" name="Documentation" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}


