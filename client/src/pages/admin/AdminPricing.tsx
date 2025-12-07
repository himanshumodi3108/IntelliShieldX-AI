import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
import { Loader2, Plus, Edit, Trash2, CreditCard, Save } from "lucide-react";
import adminApi from "@/lib/adminApi";
import { toast } from "sonner";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

export default function AdminPricing() {
  const { admin } = useAdminAuth();
  const isSuperAdmin = admin?.role === "super_admin";
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [formData, setFormData] = useState({
    planId: "",
    name: "",
    description: "",
    price: 0,
    currency: "INR",
    period: "year",
    limits: {
      documentation: 1,
      repositories: 1,
      scans: 5,
      chatMessages: 100,
    },
    features: [] as string[],
    isActive: true,
    displayOrder: 0,
  });
  const [featureInput, setFeatureInput] = useState("");

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setIsLoading(true);
      const data = await adminApi.getPricingPlans();
      setPlans(data.plans || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load pricing plans");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingPlan(null);
    setFormData({
      planId: "",
      name: "",
      description: "",
      price: 0,
      currency: "INR",
      period: "year",
      limits: {
        documentation: 1,
        repositories: 1,
        scans: 5,
        chatMessages: 100,
      },
      features: [],
      isActive: true,
      displayOrder: 0,
    });
    setFeatureInput("");
    setShowDialog(true);
  };

  const handleEdit = async (plan: any) => {
    try {
      const planData = await adminApi.getPricingPlan(plan.planId);
      setEditingPlan(planData.plan);
      setFormData({
        planId: planData.plan.planId,
        name: planData.plan.name || "",
        description: planData.plan.description || "",
        price: planData.plan.price || 0,
        currency: planData.plan.currency || "INR",
        period: planData.plan.period || "year",
        limits: planData.plan.limits || {
          documentation: 1,
          repositories: 1,
          scans: 5,
          chatMessages: 100,
        },
        features: planData.plan.features || [],
        isActive: planData.plan.isActive !== false,
        displayOrder: planData.plan.displayOrder || 0,
      });
      setFeatureInput("");
      setShowDialog(true);
    } catch (error: any) {
      toast.error(error.message || "Failed to load plan details");
    }
  };

  const handleDelete = async (planId: string) => {
    if (!confirm(`Are you sure you want to delete the "${planId}" pricing plan?`)) return;
    try {
      await adminApi.deletePricingPlan(planId);
      toast.success("Pricing plan deleted successfully");
      loadPlans();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete pricing plan");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const planPayload = {
        planId: formData.planId,
        name: formData.name,
        description: formData.description,
        price: formData.price,
        currency: formData.currency,
        period: formData.period,
        limits: formData.limits,
        features: formData.features,
        isActive: formData.isActive,
        displayOrder: formData.displayOrder,
      };

      if (editingPlan) {
        await adminApi.updatePricingPlan(editingPlan.planId, planPayload);
        toast.success("Pricing plan updated successfully");
      } else {
        await adminApi.createPricingPlan(planPayload);
        toast.success("Pricing plan created successfully");
      }

      setShowDialog(false);
      loadPlans();
    } catch (error: any) {
      toast.error(error.message || `Failed to ${editingPlan ? "update" : "create"} pricing plan`);
    }
  };

  const addFeature = () => {
    if (featureInput.trim()) {
      setFormData({
        ...formData,
        features: [...formData.features, featureInput.trim()],
      });
      setFeatureInput("");
    }
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index),
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Pricing Plans Management</h1>
            <p className="text-muted-foreground">Configure pricing plans, rates, and limits</p>
          </div>
          {isSuperAdmin && (
            <Button variant="cyber" onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Plan
            </Button>
          )}
        </div>

        <Card className="glass border-border">
          <CardHeader>
            <CardTitle>Pricing Plans</CardTitle>
            <CardDescription>
              {plans.length} pricing plans configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No pricing plans found. {isSuperAdmin && "Click 'Add Plan' to create one."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    plans.map((plan) => (
                      <TableRow key={plan._id || plan.planId}>
                        <TableCell className="font-medium">{plan.planId}</TableCell>
                        <TableCell>{plan.name}</TableCell>
                        <TableCell>
                          {plan.currency} {plan.price}
                        </TableCell>
                        <TableCell>{plan.period}</TableCell>
                        <TableCell>
                          <Badge variant={plan.isActive ? "default" : "secondary"}>
                            {plan.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {isSuperAdmin && (
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(plan)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {plan.planId !== "free" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(plan.planId)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Plan Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPlan ? "Edit Pricing Plan" : "Add New Pricing Plan"}
              </DialogTitle>
              <DialogDescription>
                {editingPlan
                  ? "Update the pricing plan configuration"
                  : "Configure a new pricing plan for the platform"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="planId">Plan ID *</Label>
                  <Select
                    value={formData.planId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, planId: value })
                    }
                    required
                    disabled={!!editingPlan}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select plan ID" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Plan Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Pro Plan"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Plan description"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (₹) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) =>
                      setFormData({ ...formData, currency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="period">Period</Label>
                  <Select
                    value={formData.period}
                    onValueChange={(value) =>
                      setFormData({ ...formData, period: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">Month</SelectItem>
                      <SelectItem value="year">Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <Label>Limits</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="docLimit">Documentation</Label>
                    <Input
                      id="docLimit"
                      type="number"
                      min="0"
                      value={formData.limits.documentation === Infinity ? "Unlimited" : formData.limits.documentation}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          limits: {
                            ...formData.limits,
                            documentation: e.target.value === "Unlimited" ? Infinity : parseInt(e.target.value) || 0,
                          },
                        })
                      }
                      placeholder="Use 'Unlimited' for no limit"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="repoLimit">Repositories</Label>
                    <Input
                      id="repoLimit"
                      type="number"
                      min="0"
                      value={formData.limits.repositories === Infinity ? "Unlimited" : formData.limits.repositories}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          limits: {
                            ...formData.limits,
                            repositories: e.target.value === "Unlimited" ? Infinity : parseInt(e.target.value) || 0,
                          },
                        })
                      }
                      placeholder="Use 'Unlimited' for no limit"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scanLimit">Scans</Label>
                    <Input
                      id="scanLimit"
                      type="number"
                      min="0"
                      value={formData.limits.scans === Infinity ? "Unlimited" : formData.limits.scans}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          limits: {
                            ...formData.limits,
                            scans: e.target.value === "Unlimited" ? Infinity : parseInt(e.target.value) || 0,
                          },
                        })
                      }
                      placeholder="Use 'Unlimited' for no limit"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="chatLimit">Chat Messages</Label>
                    <Input
                      id="chatLimit"
                      type="number"
                      min="0"
                      value={formData.limits.chatMessages === Infinity ? "Unlimited" : formData.limits.chatMessages}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          limits: {
                            ...formData.limits,
                            chatMessages: e.target.value === "Unlimited" ? Infinity : parseInt(e.target.value) || 0,
                          },
                        })
                      }
                      placeholder="Use 'Unlimited' for no limit"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Features</Label>
                <div className="flex gap-2">
                  <Input
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addFeature();
                      }
                    }}
                    placeholder="Add a feature"
                  />
                  <Button type="button" onClick={addFeature} variant="outline">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.features.map((feature, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {feature}
                      <button
                        type="button"
                        onClick={() => removeFeature(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="displayOrder">Display Order</Label>
                  <Input
                    id="displayOrder"
                    type="number"
                    min="0"
                    value={formData.displayOrder}
                    onChange={(e) =>
                      setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="flex items-center space-x-2 pt-8">
                  <Checkbox
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isActive: checked === true })
                    }
                  />
                  <Label htmlFor="isActive" className="cursor-pointer">
                    Plan is active
                  </Label>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="cyber">
                  <Save className="h-4 w-4 mr-2" />
                  {editingPlan ? "Update Plan" : "Create Plan"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

