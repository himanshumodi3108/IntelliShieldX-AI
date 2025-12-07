import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, CheckCircle2, XCircle, Settings, CreditCard, Mail, Shield, Edit, Save } from "lucide-react";
import adminApi from "@/lib/adminApi";
import { toast } from "sonner";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

export default function AdminSettings() {
  const { admin } = useAdminAuth();
  const isSuperAdmin = admin?.role === "super_admin";
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await adminApi.getSettings();
      setSettings(data);
    } catch (error) {
      console.error("Failed to load settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (category: string) => {
    setEditingCategory(category);
    setEditFormData(settings[category] || {});
  };

  const handleSave = async () => {
    if (!editingCategory) return;

    try {
      await adminApi.updateSettingsCategory(editingCategory, editFormData);
      toast.success("Settings updated successfully");
      setEditingCategory(null);
      loadSettings();
    } catch (error: any) {
      toast.error(error.message || "Failed to update settings");
    }
  };

  const handleCancel = () => {
    setEditingCategory(null);
    setEditFormData({});
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
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">System configuration and settings</p>
        </div>

        {settings && (
          <div className="space-y-6">
            {/* General Settings */}
            <Card className="glass border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    General Settings
                  </CardTitle>
                  {isSuperAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit("general")}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {editingCategory === "general" ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="siteName">Site Name</Label>
                      <Input
                        id="siteName"
                        value={editFormData.siteName || ""}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, siteName: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="frontendUrl">Frontend URL</Label>
                      <Input
                        id="frontendUrl"
                        value={editFormData.frontendUrl || ""}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, frontendUrl: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="backendUrl">Backend URL</Label>
                      <Input
                        id="backendUrl"
                        value={editFormData.backendUrl || ""}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, backendUrl: e.target.value })
                        }
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSave} size="sm">
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                      <Button onClick={handleCancel} variant="outline" size="sm">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span>Site Name</span>
                      <span className="font-medium">{settings.general.siteName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Frontend URL</span>
                      <span className="text-sm text-muted-foreground">{settings.general.frontendUrl}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Backend URL</span>
                      <span className="text-sm text-muted-foreground">{settings.general.backendUrl}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* OAuth Settings */}
            <Card className="glass border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  OAuth Providers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(settings.oauth).map(([provider, config]: [string, any]) => (
                  <div key={provider} className="flex items-center justify-between">
                    <span className="capitalize">{provider}</span>
                    {config.enabled ? (
                      <Badge variant="default" className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Enabled
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        Disabled
                      </Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Payment Settings */}
            <Card className="glass border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Settings
                  </CardTitle>
                  {isSuperAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit("payments")}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {editingCategory === "payments" ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/30">
                      <span>Razorpay</span>
                      {settings.payments.razorpay.enabled ? (
                        <Badge variant="default">Enabled</Badge>
                      ) : (
                        <Badge variant="secondary">Disabled</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">Configure via environment variables</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="gstEnabled"
                          checked={editFormData.gst?.enabled || false}
                          onCheckedChange={(checked) =>
                            setEditFormData({
                              ...editFormData,
                              gst: { ...editFormData.gst, enabled: checked === true },
                            })
                          }
                        />
                        <Label htmlFor="gstEnabled" className="cursor-pointer">
                          Enable GST
                        </Label>
                      </div>
                      {editFormData.gst?.enabled && (
                        <div className="space-y-2 ml-6">
                          <Label htmlFor="gstRate">GST Rate (%)</Label>
                          <Input
                            id="gstRate"
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={editFormData.gst?.rate || 18}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                gst: {
                                  ...editFormData.gst,
                                  rate: parseFloat(e.target.value) || 18,
                                },
                              })
                            }
                          />
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="transactionFeeRate">Transaction Fee Rate (%)</Label>
                      <Input
                        id="transactionFeeRate"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={editFormData.transactionFee?.rate !== undefined ? editFormData.transactionFee.rate : (settings.payments.transactionFee.rate || 2)}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            transactionFee: {
                              ...editFormData.transactionFee,
                              rate: parseFloat(e.target.value) || 2,
                            },
                          })
                        }
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSave} size="sm">
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                      <Button onClick={handleCancel} variant="outline" size="sm">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span>Razorpay</span>
                      {settings.payments.razorpay.enabled ? (
                        <Badge variant="default">Enabled</Badge>
                      ) : (
                        <Badge variant="secondary">Disabled</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>GST</span>
                      {settings.payments.gst.enabled ? (
                        <Badge variant="default">
                          Enabled ({settings.payments.gst.rate}%)
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Disabled</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Transaction Fee</span>
                      <span className="font-medium">{settings.payments.transactionFee.rate}%</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Email Settings */}
            <Card className="glass border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Settings
                  </CardTitle>
                  {isSuperAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit("email")}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {editingCategory === "email" ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/30">
                      <span>Email Service</span>
                      {settings.email.enabled ? (
                        <Badge variant="default">Enabled</Badge>
                      ) : (
                        <Badge variant="secondary">Disabled</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">Configure SMTP via environment variables</span>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fromEmail">From Email</Label>
                      <Input
                        id="fromEmail"
                        type="email"
                        value={editFormData.from || ""}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, from: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fromName">From Name</Label>
                      <Input
                        id="fromName"
                        value={editFormData.fromName || ""}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, fromName: e.target.value })
                        }
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSave} size="sm">
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                      <Button onClick={handleCancel} variant="outline" size="sm">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span>Email Service</span>
                      {settings.email.enabled ? (
                        <Badge variant="default">Enabled</Badge>
                      ) : (
                        <Badge variant="secondary">Disabled</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>From Email</span>
                      <span className="text-sm text-muted-foreground">{settings.email.from}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>From Name</span>
                      <span className="text-sm text-muted-foreground">{settings.email.fromName}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Pricing Plans Management */}
            {isSuperAdmin && (
              <Card className="glass border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Pricing Plans Management
                  </CardTitle>
                  <CardDescription>
                    Manage pricing plans, rates, and limits. Changes take effect immediately.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Use the Pricing Plans page to add, edit, or remove pricing plans.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => window.location.href = "/admin/pricing"}
                    >
                      Manage Pricing Plans
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Features Settings */}
            {settings.features && (
              <Card className="glass border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Feature Settings
                    </CardTitle>
                    {isSuperAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit("features")}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {editingCategory === "features" ? (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="maintenanceMode"
                          checked={editFormData.maintenanceMode || false}
                          onCheckedChange={(checked) =>
                            setEditFormData({ ...editFormData, maintenanceMode: checked === true })
                          }
                        />
                        <Label htmlFor="maintenanceMode" className="cursor-pointer">
                          Maintenance Mode
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="registrationEnabled"
                          checked={editFormData.registrationEnabled !== false}
                          onCheckedChange={(checked) =>
                            setEditFormData({ ...editFormData, registrationEnabled: checked === true })
                          }
                        />
                        <Label htmlFor="registrationEnabled" className="cursor-pointer">
                          Registration Enabled
                        </Label>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="guestChatLimit">Guest Chat Limit</Label>
                        <Input
                          id="guestChatLimit"
                          type="number"
                          min="0"
                          value={editFormData.guestChatLimit || 2}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              guestChatLimit: parseInt(e.target.value) || 2,
                            })
                          }
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleSave} size="sm">
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                        <Button onClick={handleCancel} variant="outline" size="sm">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span>Maintenance Mode</span>
                        {settings.features.maintenanceMode ? (
                          <Badge variant="default">Enabled</Badge>
                        ) : (
                          <Badge variant="secondary">Disabled</Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Registration Enabled</span>
                        {settings.features.registrationEnabled !== false ? (
                          <Badge variant="default">Enabled</Badge>
                        ) : (
                          <Badge variant="secondary">Disabled</Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Guest Chat Limit</span>
                        <span className="font-medium">{settings.features.guestChatLimit || 2}</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

