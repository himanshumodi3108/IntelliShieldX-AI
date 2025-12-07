import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, Edit, Trash2, UserX, UserCheck, Mail, Calendar, Plus, Shield } from "lucide-react";
import adminApi from "@/lib/adminApi";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useDebounce } from "@/hooks/useDebounce";
import { useAbortController } from "@/hooks/useAbortController";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Label } from "@/components/ui/label";

export default function AdminUsers() {
  const { admin } = useAdminAuth();
  const isSuperAdmin = admin?.role === "super_admin";
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500); // Debounce search by 500ms
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [adminFormData, setAdminFormData] = useState({
    email: "",
    password: "",
    name: "",
    role: "admin",
    passwordExpiryHours: 24,
  });
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const navigate = useNavigate();
  const { getAbortSignal } = useAbortController();

  useEffect(() => {
    loadUsers();
  }, [page, debouncedSearch, planFilter, statusFilter]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const data = await adminApi.getUsers({
        page,
        limit: 20,
        search: debouncedSearch, // Use debounced search
        plan: planFilter || undefined,
        status: statusFilter || undefined,
      });
      setUsers(data.users);
      setStats(data.stats);
      setPagination(data.pagination);
    } catch (error: any) {
      // Don't show error if request was aborted
      if (error.name !== "AbortError") {
        toast.error(error.message || "Failed to load users");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewUser = async (userId: string) => {
    try {
      const user = await adminApi.getUser(userId);
      setSelectedUser(user);
      setShowUserDialog(true);
    } catch (error: any) {
      toast.error(error.message || "Failed to load user details");
    }
  };

  const handleSuspend = async (userId: string) => {
    if (!confirm("Are you sure you want to suspend this user?")) return;
    try {
      await adminApi.suspendUser(userId);
      toast.success("User suspended successfully");
      loadUsers();
    } catch (error: any) {
      toast.error(error.message || "Failed to suspend user");
    }
  };

  const handleActivate = async (userId: string) => {
    if (!selectedUser) {
      toast.error("No user selected");
      return;
    }
    const userIdToUse = selectedUser.id || selectedUser._id;
    if (!userIdToUse) {
      toast.error("Invalid user ID");
      return;
    }
    try {
      await adminApi.activateUser(userIdToUse);
      toast.success("User activated successfully");
      loadUsers();
      setShowUserDialog(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to activate user");
    }
  };

  const handleChangePlan = async (plan: string) => {
    if (!selectedUser) {
      toast.error("No user selected");
      return;
    }
    const userIdToUse = selectedUser.id || selectedUser._id;
    if (!userIdToUse) {
      toast.error("Invalid user ID");
      return;
    }
    try {
      await adminApi.changeUserPlan(userIdToUse, plan);
      toast.success("User plan updated successfully");
      loadUsers();
      setShowUserDialog(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update plan");
    }
  };

  const handleCreateAdmin = async () => {
    if (!adminFormData.email || !adminFormData.name) {
      toast.error("Please fill in all required fields (email and name)");
      return;
    }

    try {
      setIsCreatingAdmin(true);
      await adminApi.createAdminUser(adminFormData);
      toast.success("Admin user created successfully");
      setShowAdminDialog(false);
      setAdminFormData({ email: "", password: "", name: "", role: "admin", passwordExpiryHours: 24 });
    } catch (error: any) {
      toast.error(error.message || "Failed to create admin user");
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const getPlanColor = (plan: string) => {
    const colors: Record<string, string> = {
      free: "bg-gray-500/20 text-gray-500",
      standard: "bg-blue-500/20 text-blue-500",
      pro: "bg-purple-500/20 text-purple-500",
      enterprise: "bg-yellow-500/20 text-yellow-500",
    };
    return colors[plan] || "bg-gray-500/20 text-gray-500";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">User Management</h1>
            <p className="text-muted-foreground">Manage all platform users</p>
          </div>
          {isSuperAdmin && (
            <Button variant="cyber" onClick={() => setShowAdminDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Admin User
            </Button>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="glass border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card className="glass border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">New Today</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.newToday}</div>
              </CardContent>
            </Card>
            <Card className="glass border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">New This Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.newThisWeek}</div>
              </CardContent>
            </Card>
            <Card className="glass border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">New This Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.newThisMonth}</div>
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
                  placeholder="Search by email or name..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1); // Reset to first page on search
                  }}
                  className="pl-10"
                />
              </div>
              <Select value={planFilter || "all"} onValueChange={(v) => { setPlanFilter(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="All Plans" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter || "all"} onValueChange={(v) => { setStatusFilter(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="glass border-border">
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>
              {pagination && `${pagination.total} total users`}
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
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user._id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge className={getPlanColor(user.plan)}>
                            {user.plan}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.subscriptionStatus === "active"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {user.subscriptionStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewUser(user._id)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {user.subscriptionStatus === "active" ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSuspend(user._id)}
                              >
                                <UserX className="h-4 w-4 text-destructive" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  await adminApi.activateUser(user._id);
                                  toast.success("User activated");
                                  loadUsers();
                                }}
                              >
                                <UserCheck className="h-4 w-4 text-green-500" />
                              </Button>
                            )}
                          </div>
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

        {/* User Details Dialog */}
        <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription>
                View and manage user information
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <p className="text-sm text-muted-foreground">{selectedUser.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Plan</label>
                    <Select
                      value={selectedUser.plan}
                      onValueChange={handleChangePlan}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <p className="text-sm text-muted-foreground">
                      {selectedUser.subscriptionStatus}
                    </p>
                  </div>
                </div>

                {selectedUser.stats && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Usage Statistics</label>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-3 rounded-lg border border-border bg-secondary/30">
                        <div className="text-2xl font-bold">{selectedUser.stats.scans}</div>
                        <div className="text-xs text-muted-foreground">Scans</div>
                      </div>
                      <div className="p-3 rounded-lg border border-border bg-secondary/30">
                        <div className="text-2xl font-bold">{selectedUser.stats.documentation}</div>
                        <div className="text-xs text-muted-foreground">Documentation</div>
                      </div>
                      <div className="p-3 rounded-lg border border-border bg-secondary/30">
                        <div className="text-2xl font-bold">{selectedUser.stats.conversations}</div>
                        <div className="text-xs text-muted-foreground">Conversations</div>
                      </div>
                    </div>
                  </div>
                )}

                <DialogFooter>
                  {selectedUser.subscriptionStatus !== "active" && (
                    <Button onClick={handleActivate} variant="default">
                      <UserCheck className="h-4 w-4 mr-2" />
                      Activate User
                    </Button>
                  )}
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Create Admin User Dialog */}
        <Dialog open={showAdminDialog} onOpenChange={setShowAdminDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Create Admin User
              </DialogTitle>
              <DialogDescription>
                Create a new admin user account. Only super-admins can create admin users.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="adminName">Full Name *</Label>
                <Input
                  id="adminName"
                  value={adminFormData.name}
                  onChange={(e) => setAdminFormData({ ...adminFormData, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminEmail">Email *</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={adminFormData.email}
                  onChange={(e) => setAdminFormData({ ...adminFormData, email: e.target.value })}
                  placeholder="admin@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminPassword">Password (Optional)</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  value={adminFormData.password}
                  onChange={(e) => setAdminFormData({ ...adminFormData, password: e.target.value })}
                  placeholder="Leave empty to auto-generate"
                />
                <p className="text-xs text-muted-foreground">
                  If left empty, a secure password will be auto-generated and sent via email
                </p>
              </div>
              {!adminFormData.password && (
                <div className="space-y-2">
                  <Label htmlFor="passwordExpiryHours">Password Expiry Time (Hours)</Label>
                  <Input
                    id="passwordExpiryHours"
                    type="number"
                    min="1"
                    max="168"
                    value={adminFormData.passwordExpiryHours}
                    onChange={(e) => setAdminFormData({ ...adminFormData, passwordExpiryHours: parseInt(e.target.value) || 24 })}
                    placeholder="24"
                  />
                  <p className="text-xs text-muted-foreground">
                    The auto-generated password will be valid for this many hours (default: 24 hours)
                  </p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="adminRole">Role</Label>
                <Select
                  value={adminFormData.role}
                  onValueChange={(value) => setAdminFormData({ ...adminFormData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdminDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="cyber"
                onClick={handleCreateAdmin}
                disabled={isCreatingAdmin}
              >
                {isCreatingAdmin ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Admin
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

