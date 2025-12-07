import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  FileCode, 
  Globe, 
  Search, 
  Download, 
  Eye, 
  Trash2,
  Calendar,
  Filter,
  Loader2,
  GitBranch,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { scanApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { generateScanReportPDF } from "@/utils/pdfGenerator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ScanHistoryItem {
  id: string;
  type: "file" | "url" | "repository";
  name: string;
  date: string | Date;
  status: "pending" | "scanning" | "completed" | "failed";
  critical: number;
  high: number;
  medium: number;
  low: number;
  scanDuration?: number;
  filesAnalyzed?: number;
}

const severityColors = {
  critical: "text-red-500",
  high: "text-orange-500",
  medium: "text-yellow-500",
  low: "text-blue-500",
};

const statusColors = {
  completed: "text-green-500",
  scanning: "text-blue-500",
  pending: "text-yellow-500",
  failed: "text-red-500",
};

const History = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [scans, setScans] = useState<ScanHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleteScanId, setDeleteScanId] = useState<string | null>(null);
  const limit = 20;

  useEffect(() => {
    if (isAuthenticated) {
      loadScans();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, page, searchQuery, typeFilter]);

  const loadScans = async () => {
    try {
      setIsLoading(true);
      const response = await scanApi.getScanHistory(
        page,
        limit,
        searchQuery || undefined,
        typeFilter !== "all" ? typeFilter : undefined
      ) as {
        scans: ScanHistoryItem[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      };

      // Convert date strings to Date objects for formatting
      const formattedScans = response.scans.map((scan) => ({
        ...scan,
        date: typeof scan.date === "string" ? new Date(scan.date) : scan.date,
      }));

      setScans(formattedScans);
      setTotalPages(response.pagination.totalPages);
      setTotal(response.pagination.total);
    } catch (error: any) {
      console.error("Failed to load scan history:", error);
      toast.error(error.message || "Failed to load scan history");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setPage(1); // Reset to first page on new search
  };

  const handleTypeFilter = (value: string) => {
    setTypeFilter(value);
    setPage(1); // Reset to first page on filter change
  };

  const handleViewScan = (scanId: string) => {
    // Navigate to scan results page or show in modal
    navigate(`/scan?scanId=${scanId}`);
  };

  const handleDeleteScan = async (scanId: string) => {
    try {
      await scanApi.deleteScan(scanId);
      toast.success("Scan deleted successfully");
      setDeleteScanId(null);
      loadScans(); // Reload scans
    } catch (error: any) {
      console.error("Failed to delete scan:", error);
      toast.error(error.message || "Failed to delete scan");
    }
  };

  const handleDownloadReport = async (scanId: string) => {
    try {
      const scanData = await scanApi.getScanResults(scanId);
      
      // Generate PDF report
      generateScanReportPDF({
        scanId: scanData.scanId || scanId,
        target: scanData.target || "Unknown",
        type: scanData.type || "file",
        vulnerabilities: scanData.vulnerabilities || [],
        summary: scanData.summary || { critical: 0, high: 0, medium: 0, low: 0 },
        aiInsights: scanData.aiInsights,
        scanDuration: scanData.scanDuration,
        filesAnalyzed: scanData.filesAnalyzed,
        createdAt: scanData.createdAt || new Date(),
      });
      
      toast.success("Scan report downloaded successfully!");
    } catch (error: any) {
      console.error("Failed to download report:", error);
      toast.error(error.message || "Failed to download report");
    }
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "file":
        return <FileCode className="h-4 w-4 text-primary" />;
      case "url":
        return <Globe className="h-4 w-4 text-accent" />;
      case "repository":
        return <GitBranch className="h-4 w-4 text-purple-500" />;
      default:
        return <FileCode className="h-4 w-4 text-primary" />;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-12">
          <div className="container px-4">
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h2 className="text-2xl font-bold mb-2">Authentication Required</h2>
              <p className="text-muted-foreground mb-6">
                Please log in to view your scan history
              </p>
              <Button variant="cyber" onClick={() => navigate("/login")}>
                Sign In
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-12">
        <div className="container px-4">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold">Scan History</h1>
              <p className="text-muted-foreground mt-1">
                View and manage all your previous security scans
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search scans..."
                  className="pl-10 w-64 bg-secondary/50"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
              <Select value={typeFilter} onValueChange={handleTypeFilter}>
                <SelectTrigger className="w-40 bg-secondary/50">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="file">File Scans</SelectItem>
                  <SelectItem value="url">URL Scans</SelectItem>
                  <SelectItem value="repository">Repository Scans</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : scans.length === 0 ? (
            <div className="rounded-2xl glass p-12 text-center">
              <FileCode className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Scans Found</h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery || typeFilter !== "all"
                  ? "No scans match your search criteria. Try adjusting your filters."
                  : "You haven't performed any scans yet. Start by uploading files or scanning a URL."}
              </p>
              {!searchQuery && typeFilter === "all" && (
                <Button variant="cyber" onClick={() => navigate("/scan")}>
                  Start Your First Scan
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="rounded-2xl glass overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                          Scan Target
                        </th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                          Date
                        </th>
                        <th className="text-center p-4 text-sm font-medium text-muted-foreground">
                          Status
                        </th>
                        <th className="text-center p-4 text-sm font-medium text-muted-foreground">
                          Critical
                        </th>
                        <th className="text-center p-4 text-sm font-medium text-muted-foreground">
                          High
                        </th>
                        <th className="text-center p-4 text-sm font-medium text-muted-foreground">
                          Medium
                        </th>
                        <th className="text-center p-4 text-sm font-medium text-muted-foreground">
                          Low
                        </th>
                        <th className="text-right p-4 text-sm font-medium text-muted-foreground">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {scans.map((scan, i) => (
                        <tr
                          key={scan.id}
                          className="border-b border-border/50 hover:bg-secondary/30 transition-colors animate-fade-in"
                          style={{ animationDelay: `${i * 0.05}s` }}
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-secondary">
                                {getTypeIcon(scan.type)}
                              </div>
                              <div>
                                <p className="font-medium">{scan.name}</p>
                                <p className="text-xs text-muted-foreground capitalize">
                                  {scan.type} scan
                                  {scan.filesAnalyzed !== undefined && scan.filesAnalyzed > 0 && (
                                    <> • {scan.filesAnalyzed} file{scan.filesAnalyzed !== 1 ? "s" : ""}</>
                                  )}
                                  {scan.scanDuration !== undefined && (
                                    <> • {scan.scanDuration}s</>
                                  )}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {formatDate(scan.date)}
                          </td>
                          <td className="p-4 text-center">
                            <span
                              className={cn(
                                "text-xs font-medium px-2 py-1 rounded capitalize",
                                statusColors[scan.status]
                              )}
                            >
                              {scan.status}
                            </span>
                          </td>
                          <td
                            className={cn(
                              "p-4 text-center font-semibold",
                              severityColors.critical
                            )}
                          >
                            {scan.critical}
                          </td>
                          <td
                            className={cn(
                              "p-4 text-center font-semibold",
                              severityColors.high
                            )}
                          >
                            {scan.high}
                          </td>
                          <td
                            className={cn(
                              "p-4 text-center font-semibold",
                              severityColors.medium
                            )}
                          >
                            {scan.medium}
                          </td>
                          <td
                            className={cn(
                              "p-4 text-center font-semibold",
                              severityColors.low
                            )}
                          >
                            {scan.low}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleViewScan(scan.id)}
                                title="View scan details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDownloadReport(scan.id)}
                                title="Download report"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:text-destructive"
                                onClick={() => setDeleteScanId(scan.id)}
                                title="Delete scan"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-muted-foreground">
                    Showing {scans.length} of {total} scans
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground px-2">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteScanId !== null}
        onOpenChange={(open) => !open && setDeleteScanId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this scan? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteScanId && handleDeleteScan(deleteScanId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default History;
