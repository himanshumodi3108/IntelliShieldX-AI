import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Loader2, Plus, Edit, Trash2 } from "lucide-react";
import adminApi from "@/lib/adminApi";
import { toast } from "sonner";

export default function AdminModels() {
  const [models, setModels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingModel, setEditingModel] = useState<any>(null);
  const [formData, setFormData] = useState({
    modelId: "",
    name: "",
    provider: "",
    category: "",
    type: "general",
    maxTokens: 2048,
    speed: "medium",
    accuracy: "medium",
    enabled: true,
    description: "",
    costInput: 0,
    costOutput: 0,
    temperature: 0.7,
    endpoint: "",
  });

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setIsLoading(true);
      const data = await adminApi.getModels();
      setModels(data.models);
    } catch (error: any) {
      toast.error(error.message || "Failed to load models");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this model?")) return;
    try {
      await adminApi.deleteModel(id);
      toast.success("Model deleted successfully");
      loadModels();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete model");
    }
  };

  const handleAdd = () => {
    setEditingModel(null);
    setFormData({
      modelId: "",
      name: "",
      provider: "",
      category: "",
      type: "general",
      maxTokens: 2048,
      speed: "medium",
      accuracy: "medium",
      enabled: true,
      description: "",
      costInput: 0,
      costOutput: 0,
      temperature: 0.7,
      endpoint: "",
    });
    setShowDialog(true);
  };

  const handleEdit = async (model: any) => {
    try {
      const modelData = await adminApi.getModel(model._id || model.id);
      setEditingModel(modelData.model);
      setFormData({
        modelId: modelData.model.modelId || "",
        name: modelData.model.name || "",
        provider: modelData.model.provider || "",
        category: modelData.model.category || "",
        type: modelData.model.type || "general",
        maxTokens: modelData.model.maxTokens || 2048,
        speed: modelData.model.speed || "medium",
        accuracy: modelData.model.accuracy || "medium",
        enabled: modelData.model.enabled !== false,
        description: modelData.model.description || "",
        costInput: modelData.model.cost?.input || 0,
        costOutput: modelData.model.cost?.output || 0,
        temperature: modelData.model.config?.temperature || 0.7,
        endpoint: modelData.model.config?.endpoint || "",
      });
      setShowDialog(true);
    } catch (error: any) {
      toast.error(error.message || "Failed to load model details");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const modelPayload = {
        modelId: formData.modelId,
        name: formData.name,
        provider: formData.provider,
        category: formData.category,
        type: formData.type,
        maxTokens: formData.maxTokens,
        speed: formData.speed,
        accuracy: formData.accuracy,
        enabled: formData.enabled,
        description: formData.description,
        cost: {
          input: formData.costInput,
          output: formData.costOutput,
        },
        config: {
          temperature: formData.temperature,
          endpoint: formData.endpoint,
          maxTokens: formData.maxTokens,
        },
      };

      if (editingModel) {
        await adminApi.updateModel(editingModel._id || editingModel.id, modelPayload);
        toast.success("Model updated successfully");
      } else {
        await adminApi.createModel(modelPayload);
        toast.success("Model created successfully");
      }

      setShowDialog(false);
      loadModels();
    } catch (error: any) {
      toast.error(error.message || `Failed to ${editingModel ? "update" : "create"} model`);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      basic: "bg-blue-500/20 text-blue-500",
      standard: "bg-green-500/20 text-green-500",
      advanced: "bg-purple-500/20 text-purple-500",
      enterprise: "bg-yellow-500/20 text-yellow-500",
    };
    return colors[category] || "bg-gray-500/20 text-gray-500";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">AI Model Management</h1>
            <p className="text-muted-foreground">Configure and manage AI models</p>
          </div>
          <Button variant="cyber" onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Model
          </Button>
        </div>

        <Card className="glass border-border">
          <CardHeader>
            <CardTitle>Models</CardTitle>
            <CardDescription>
              {models.length} total models configured
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
                    <TableHead>Name</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Plans</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {models.map((model) => (
                    <TableRow key={model._id}>
                      <TableCell className="font-medium">{model.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{model.provider}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getCategoryColor(model.category)}>
                          {model.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {model.availablePlans && model.availablePlans.length > 0 ? (
                            model.availablePlans.map((plan: string) => (
                              <Badge key={plan} variant="secondary" className="text-xs">
                                {plan}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              {model.category}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {model.enabled !== false && model.integrated ? (
                          <Badge variant="default">Active</Badge>
                        ) : model.enabled !== false && !model.integrated ? (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                            Not Integrated
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(model)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(model._id || model.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Model Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingModel ? "Edit Model" : "Add New Model"}
              </DialogTitle>
              <DialogDescription>
                {editingModel
                  ? "Update the AI model configuration"
                  : "Configure a new AI model for the platform"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="modelId">Model ID *</Label>
                  <Input
                    id="modelId"
                    value={formData.modelId}
                    onChange={(e) =>
                      setFormData({ ...formData, modelId: e.target.value })
                    }
                    placeholder="e.g., gpt-4o-mini"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., GPT-4o Mini"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="provider">Provider *</Label>
                  <Select
                    value={formData.provider}
                    onValueChange={(value) =>
                      setFormData({ ...formData, provider: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OpenAI">OpenAI</SelectItem>
                      <SelectItem value="Groq">Groq</SelectItem>
                      <SelectItem value="Anthropic">Anthropic</SelectItem>
                      <SelectItem value="Google">Google</SelectItem>
                      <SelectItem value="AWS">AWS</SelectItem>
                      <SelectItem value="Local">Local</SelectItem>
                      <SelectItem value="Custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="security">Security</SelectItem>
                      <SelectItem value="code">Code</SelectItem>
                      <SelectItem value="analysis">Analysis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxTokens">Max Tokens *</Label>
                  <Input
                    id="maxTokens"
                    type="number"
                    value={formData.maxTokens}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxTokens: parseInt(e.target.value) || 2048,
                      })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="speed">Speed</Label>
                  <Select
                    value={formData.speed}
                    onValueChange={(value) =>
                      setFormData({ ...formData, speed: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fast">Fast</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="slow">Slow</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accuracy">Accuracy</Label>
                  <Select
                    value={formData.accuracy}
                    onValueChange={(value) =>
                      setFormData({ ...formData, accuracy: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="costInput">Input Cost (per 1M tokens)</Label>
                  <Input
                    id="costInput"
                    type="number"
                    step="0.0001"
                    value={formData.costInput}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        costInput: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="costOutput">Output Cost (per 1M tokens)</Label>
                  <Input
                    id="costOutput"
                    type="number"
                    step="0.0001"
                    value={formData.costOutput}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        costOutput: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="temperature">Temperature</Label>
                  <Input
                    id="temperature"
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={formData.temperature}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        temperature: parseFloat(e.target.value) || 0.7,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endpoint">API Endpoint</Label>
                  <Input
                    id="endpoint"
                    value={formData.endpoint}
                    onChange={(e) =>
                      setFormData({ ...formData, endpoint: e.target.value })
                    }
                    placeholder="Optional custom endpoint"
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
                  placeholder="Model description and use cases"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enabled"
                  checked={formData.enabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, enabled: checked === true })
                  }
                />
                <Label htmlFor="enabled" className="cursor-pointer">
                  Model is enabled
                </Label>
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
                  {editingModel ? "Update Model" : "Create Model"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

