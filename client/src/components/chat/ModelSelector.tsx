import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Zap, Shield, Lock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  category: "basic" | "standard" | "advanced" | "enterprise";
  maxTokens: number;
  speed: "fast" | "medium" | "slow";
  accuracy: "high" | "medium" | "low";
  cost?: {
    input: number;
    output: number;
  };
  enabled: boolean;
  available: boolean;
  description?: string;
}

interface ModelSelectorProps {
  models: AIModel[];
  selectedModelId?: string;
  onSelect: (modelId: string) => void;
  userPlan?: "free" | "standard" | "pro" | "enterprise";
}

const categoryColors = {
  basic: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  standard: "bg-green-500/20 text-green-400 border-green-500/30",
  advanced: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  enterprise: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const speedIcons = {
  fast: <Zap className="h-3 w-3" />,
  medium: <Zap className="h-3 w-3 opacity-70" />,
  slow: <Zap className="h-3 w-3 opacity-40" />,
};

const planAccess: Record<string, string[]> = {
  free: ["basic"],
  standard: ["basic", "standard"],
  pro: ["basic", "standard", "advanced"],
  enterprise: ["basic", "standard", "advanced", "enterprise"],
};

export const ModelSelector = ({
  models,
  selectedModelId,
  onSelect,
  userPlan = "free",
}: ModelSelectorProps) => {
  const allowedCategories = planAccess[userPlan] || ["basic"];

  const isModelAvailable = (model: AIModel) => {
    return model.enabled && model.available && allowedCategories.includes(model.category);
  };

  const groupedModels = models.reduce((acc, model) => {
    if (!acc[model.category]) {
      acc[model.category] = [];
    }
    acc[model.category].push(model);
    return acc;
  }, {} as Record<string, AIModel[]>);

  return (
    <div className="space-y-4">
      {Object.entries(groupedModels).map(([category, categoryModels]) => {
        const isCategoryAllowed = allowedCategories.includes(category);
        return (
          <div key={category} className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold capitalize">{category}</h3>
              {!isCategoryAllowed && (
                <Badge variant="outline" className="text-xs">
                  <Lock className="h-3 w-3 mr-1" />
                  Upgrade Required
                </Badge>
              )}
            </div>
            <div className="grid gap-2">
              {categoryModels.map((model) => {
                const available = isModelAvailable(model);
                const isSelected = selectedModelId === model.id;
                return (
                  <Card
                    key={model.id}
                    className={cn(
                      "p-3 cursor-pointer transition-all",
                      isSelected && "ring-2 ring-primary",
                      !available && "opacity-50 cursor-not-allowed",
                      available && "hover:bg-secondary/50"
                    )}
                    onClick={() => available && onSelect(model.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{model.name}</span>
                          <Badge
                            variant="outline"
                            className={cn("text-xs", categoryColors[model.category])}
                          >
                            {model.category}
                          </Badge>
                          {!available && (
                            <Badge variant="outline" className="text-xs">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Unavailable
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {model.description || `${model.provider} • ${model.maxTokens.toLocaleString()} tokens`}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            {speedIcons[model.speed]}
                            <span className="capitalize">{model.speed}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            <span className="capitalize">{model.accuracy}</span>
                          </div>
                          {model.cost && (
                            <div>
                              ${model.cost.input.toFixed(4)}/1K in • ${model.cost.output.toFixed(4)}/1K out
                            </div>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="h-5 w-5 text-primary shrink-0" />
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

