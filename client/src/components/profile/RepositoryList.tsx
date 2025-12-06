import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { repositoryApi, userApi } from "@/lib/api";
import { toast } from "sonner";
import {
  Github,
  Loader2,
  Plus,
  Trash2,
  ExternalLink,
  Shield,
  Code2,
  Calendar,
  AlertTriangle,
  FileText,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface Repository {
  _id: string;
  name: string;
  fullName: string;
  description?: string;
  url: string;
  private: boolean;
  defaultBranch: string;
  language?: string;
  lastScannedAt?: string;
  lastScanResult?: {
    vulnerabilities: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  provider: string;
}

const REPOSITORY_LIMITS: Record<string, number> = {
  free: 1,
  standard: 10,
  pro: 25,
  enterprise: Infinity,
};

export function RepositoryList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [availableRepos, setAvailableRepos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [userPlan, setUserPlan] = useState("free");

  useEffect(() => {
    loadRepositories();
    loadUserPlan();
  }, [user]);

  const loadUserPlan = async () => {
    try {
      // getPlan returns the plan string directly, not an object
      const plan = await userApi.getPlan();
      setUserPlan(typeof plan === "string" ? plan : (plan?.plan || user?.plan || "free"));
    } catch (error) {
      console.error("Failed to load user plan:", error);
      // Fallback to user plan from context
      setUserPlan(user?.plan || "free");
    }
  };

  const loadRepositories = async () => {
    try {
      setIsLoading(true);
      const data = await repositoryApi.getRepositories();
      setRepositories(data);
    } catch (error: any) {
      console.error("Failed to load repositories:", error);
      toast.error("Failed to load repositories");
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableRepositories = async () => {
    try {
      setIsLoadingAvailable(true);
      const data = await repositoryApi.getGitHubRepositories();
      setAvailableRepos(data);
      setShowConnectDialog(true);
    } catch (error: any) {
      console.error("Failed to load available repositories:", error);
      toast.error(error.message || "Failed to load repositories. Make sure GitHub is connected.");
    } finally {
      setIsLoadingAvailable(false);
    }
  };

  const handleConnectRepository = async (repo: any) => {
    try {
      await repositoryApi.connectRepository({
        provider: "github",
        repositoryId: repo.id,
        name: repo.name,
        fullName: repo.fullName,
        description: repo.description,
        url: repo.url,
        private: repo.private,
        defaultBranch: repo.defaultBranch,
        language: repo.language,
      });

      toast.success("Repository connected successfully!");
      setShowConnectDialog(false);
      await loadRepositories();
    } catch (error: any) {
      toast.error(error.message || "Failed to connect repository");
    }
  };

  const handleDeleteRepository = async (id: string) => {
    if (!confirm("Are you sure you want to disconnect this repository?")) {
      return;
    }

    try {
      await repositoryApi.deleteRepository(id);
      toast.success("Repository disconnected");
      await loadRepositories();
    } catch (error: any) {
      toast.error(error.message || "Failed to disconnect repository");
    }
  };

  const handleSyncRepository = async (id: string) => {
    try {
      setIsLoading(true);
      await repositoryApi.syncRepository(id);
      toast.success("Repository synced successfully!");
      await loadRepositories();
    } catch (error: any) {
      console.error("Sync error:", error);
      toast.error(error.message || "Failed to sync repository");
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanRepository = async (id: string) => {
    try {
      setIsLoading(true);
      const result = await repositoryApi.scanRepository(id);
      
      if (result.scanId) {
        toast.success(
          `Repository scan completed! Found ${result.summary?.critical || 0} critical, ${result.summary?.high || 0} high vulnerabilities.`,
          { duration: 5000 }
        );
        
        // Reload repositories to show updated scan results
        await loadRepositories();
        
        // Optionally navigate to scan results page
        // navigate(`/history?scanId=${result.scanId}`);
      } else {
        toast.success("Repository scan initiated successfully");
        await loadRepositories();
      }
    } catch (error: any) {
      console.error("Scan error:", error);
      toast.error(error.message || "Failed to start repository scan. Please ensure the AI engine is running.");
    } finally {
      setIsLoading(false);
    }
  };

  const limit = REPOSITORY_LIMITS[userPlan] || 1;
  const canAddMore = limit === Infinity || repositories.length < limit;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5" />
              Connected Repositories
            </CardTitle>
            <CardDescription>
              {repositories.length} / {limit === Infinity ? "∞" : limit} repositories connected
            </CardDescription>
          </div>
          <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
            <DialogTrigger asChild>
              <Button
                variant="default"
                size="sm"
                onClick={loadAvailableRepositories}
                disabled={!canAddMore || isLoadingAvailable}
              >
                {isLoadingAvailable ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Connect Repository
                  </>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Select Repository to Connect</DialogTitle>
                <DialogDescription>
                  Choose a repository from your GitHub account to connect
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-2">
                  {availableRepos.map((repo) => (
                    <div
                      key={repo.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-secondary/50"
                    >
                      <div className="flex-1">
                        <div className="font-medium flex items-center gap-2">
                          <Github className="h-4 w-4" />
                          {repo.fullName}
                          {repo.private && (
                            <Badge variant="outline" className="text-xs">
                              Private
                            </Badge>
                          )}
                        </div>
                        {repo.description && (
                          <div className="text-sm text-muted-foreground mt-1">{repo.description}</div>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          {repo.language && <span>{repo.language}</span>}
                          <span>Branch: {repo.defaultBranch}</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConnectRepository(repo)}
                        disabled={repositories.some((r) => r.fullName === repo.fullName)}
                      >
                        {repositories.some((r) => r.fullName === repo.fullName) ? "Connected" : "Connect"}
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : repositories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Code2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No repositories connected</p>
            <p className="text-sm mt-2">Connect a repository to start security scanning</p>
          </div>
        ) : (
          <div className="space-y-3">
            {repositories.map((repo) => (
              <div
                key={repo._id}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-secondary/30"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Github className="h-4 w-4" />
                    <a
                      href={repo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:text-primary flex items-center gap-1"
                    >
                      {repo.fullName}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    {repo.private && (
                      <Badge variant="outline" className="text-xs">
                        Private
                      </Badge>
                    )}
                  </div>
                  {repo.description && (
                    <div className="text-sm text-muted-foreground mb-2">{repo.description}</div>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {repo.language && (
                      <span className="flex items-center gap-1">
                        <Code2 className="h-3 w-3" />
                        {repo.language}
                      </span>
                    )}
                    {repo.lastScannedAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Last scanned: {new Date(repo.lastScannedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {repo.lastScanResult && (
                    <div className="flex items-center gap-2 mt-2">
                      {repo.lastScanResult.vulnerabilities.critical > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {repo.lastScanResult.vulnerabilities.critical} Critical
                        </Badge>
                      )}
                      {repo.lastScanResult.vulnerabilities.high > 0 && (
                        <Badge variant="destructive" className="text-xs bg-orange-500">
                          {repo.lastScanResult.vulnerabilities.high} High
                        </Badge>
                      )}
                      {repo.lastScanResult.vulnerabilities.medium > 0 && (
                        <Badge variant="outline" className="text-xs text-yellow-500 border-yellow-500">
                          {repo.lastScanResult.vulnerabilities.medium} Medium
                        </Badge>
                      )}
                      {repo.lastScanResult.vulnerabilities.low > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {repo.lastScanResult.vulnerabilities.low} Low
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSyncRepository(repo._id)}
                    disabled={isLoading}
                    title="Sync with latest commits"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Sync
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/documentation/${repo._id}`)}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Docs
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleScanRepository(repo._id)}
                  >
                    <Shield className="h-4 w-4 mr-1" />
                    Scan
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteRepository(repo._id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!canAddMore && (
          <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm text-yellow-600 dark:text-yellow-400">
            <AlertTriangle className="h-4 w-4 inline mr-2" />
            You've reached your repository limit ({limit}). Upgrade your plan to connect more repositories.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

