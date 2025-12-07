import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, IndianRupee, RefreshCw } from "lucide-react";
import adminApi from "@/lib/adminApi";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";

export default function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500); // Debounce search by 500ms
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [revenue, setRevenue] = useState<any>(null);

  useEffect(() => {
    loadSubscriptions();
    // Only load revenue once, not on every filter change
    if (page === 1 && !debouncedSearch && !planFilter && !statusFilter) {
      loadRevenue();
    }
  }, [page, debouncedSearch, planFilter, statusFilter]);

  const loadSubscriptions = async () => {
    try {
      setIsLoading(true);
      const data = await adminApi.getSubscriptions({
        page,
        limit: 20,
        search: debouncedSearch, // Use debounced search
        plan: planFilter || undefined,
        status: statusFilter || undefined,
      });
      setSubscriptions(data.subscriptions);
      setPagination(data.pagination);
    } catch (error: any) {
      if (error.name !== "AbortError") {
        toast.error(error.message || "Failed to load subscriptions");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadRevenue = async () => {
    try {
      const data = await adminApi.getRevenueAnalytics("month");
      setRevenue(data);
    } catch (error) {
      console.error("Failed to load revenue:", error);
    }
  };

  const handleRefund = async (id: string) => {
    if (!confirm("Are you sure you want to process a refund for this subscription?")) return;
    try {
      await adminApi.processRefund(id);
      toast.success("Refund processed successfully");
      loadSubscriptions();
      loadRevenue();
    } catch (error: any) {
      toast.error(error.message || "Failed to process refund");
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-500/20 text-green-500",
      cancelled: "bg-yellow-500/20 text-yellow-500",
      expired: "bg-gray-500/20 text-gray-500",
      refunded: "bg-red-500/20 text-red-500",
    };
    return colors[status] || "bg-gray-500/20 text-gray-500";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Subscription Management</h1>
          <p className="text-muted-foreground">Manage user subscriptions and payments</p>
        </div>

        {/* Revenue Stats */}
        {revenue && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="glass border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center gap-1">
                  <IndianRupee className="h-5 w-5" />
                  {revenue.totalRevenue?.toFixed(2) || "0.00"}
                </div>
              </CardContent>
            </Card>
            <Card className="glass border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Refunds</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center gap-1">
                  <IndianRupee className="h-5 w-5" />
                  {revenue.refunds?.total?.toFixed(2) || "0.00"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {revenue.refunds?.count || 0} refunds
                </p>
              </CardContent>
            </Card>
            <Card className="glass border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center gap-1">
                  <IndianRupee className="h-5 w-5" />
                  {((revenue.totalRevenue || 0) - (revenue.refunds?.total || 0)).toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="glass border-border">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user email..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscriptions Table */}
        <Card className="glass border-border">
          <CardHeader>
            <CardTitle>Subscriptions</CardTitle>
            <CardDescription>
              {pagination && `${pagination.total} total subscriptions`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Refund Reference</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map((sub) => (
                      <TableRow key={sub._id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{sub.userId?.name || "N/A"}</div>
                            <div className="text-xs text-muted-foreground">{sub.userId?.email || ""}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge>{sub.plan}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <IndianRupee className="h-4 w-4" />
                            {sub.amount?.toFixed(2) || "0.00"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(sub.status)}>
                            {sub.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(sub.startDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {new Date(sub.endDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {sub.bankReferenceNumber ? (
                            <div className="text-xs">
                              <div className="font-mono font-semibold text-green-600">
                                {sub.bankReferenceNumber}
                              </div>
                              {sub.refundId && (
                                <div className="text-muted-foreground mt-1">
                                  ID: {sub.refundId}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {sub.status === "active" && !sub.refundedAt && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRefund(sub._id)}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                          {sub.refundedAt && (
                            <div className="text-xs text-muted-foreground">
                              Refunded: {new Date(sub.refundedAt).toLocaleDateString()}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {pagination && pagination.pages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Page {pagination.page} of {pagination.pages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                        disabled={page === pagination.pages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

