import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { documentationApi, repositoryApi } from "@/lib/api";
import { toast } from "sonner";
import {
  FileText,
  Code2,
  FolderTree,
  Package,
  MessageSquare,
  Send,
  Loader2,
  Bot,
  User,
  ArrowLeft,
  RefreshCw,
  Download,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { generateDocumentationPDF } from "@/utils/pdfGenerator";

interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

interface Documentation {
  id: string;
  overview?: string;
  fileStructure?: string;
  detailedExplanations?: string;
  codeFlowAnalysis?: string;
  architectureDescription?: string;
  apiEndpoints: Array<{
    method: string;
    path: string;
    description?: string;
    parameters?: Array<{
      name: string;
      type: string;
      required: boolean;
      description?: string;
      location: string;
    }>;
    requestBody?: any;
    responses?: Array<{
      statusCode: number;
      description?: string;
      schema?: any;
    }>;
    file?: string;
    line?: number;
  }>;
  schemas: Array<{
    name: string;
    type: string;
    description?: string;
    properties?: Array<{
      name: string;
      type: string;
      required: boolean;
      description?: string;
      defaultValue?: any;
    }>;
    file?: string;
    line?: number;
  }>;
  projectStructure?: {
    directories?: Array<{
      path: string;
      description?: string;
      files?: string[];
    }>;
    entryPoints?: string[];
    mainFiles?: string[];
  };
  dependencies?: Array<{
    name: string;
    version?: string;
    type?: string;
    description?: string;
  }>;
  generatedAt?: string;
  lastUpdatedAt?: string;
}

export function DocumentationView() {
  const { repositoryId } = useParams<{ repositoryId: string }>();
  const navigate = useNavigate();
  const [documentation, setDocumentation] = useState<Documentation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "api" | "schemas" | "structure" | "chat">("overview");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [repository, setRepository] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (repositoryId) {
      loadRepository();
      loadDocumentation();
      loadChatMessages();
    }
  }, [repositoryId]);

  useEffect(() => {
    if (activeTab === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, activeTab]);

  const loadRepository = async () => {
    try {
      const repos = await repositoryApi.getRepositories();
      const repo = repos.find((r: any) => r._id === repositoryId);
      if (repo) {
        setRepository(repo);
      }
    } catch (error) {
      console.error("Failed to load repository:", error);
    }
  };

  const loadDocumentation = async () => {
    if (!repositoryId) return;

    try {
      setIsLoading(true);
      const data = await documentationApi.getDocumentation(repositoryId);
      // Backend returns null if documentation doesn't exist (not an error)
      setDocumentation(data || null);
    } catch (error: any) {
      // Handle any unexpected errors
      console.error("Failed to load documentation:", error);
      // Only show error if it's not a 404 (which should now return null instead)
      if (!error.message?.includes("404") && !error.message?.includes("not found")) {
        toast.error("Failed to load documentation");
      }
      setDocumentation(null);
    } finally {
      setIsLoading(false);
    }
  };

  const loadChatMessages = async () => {
    if (!repositoryId) return;

    try {
      const response = await documentationApi.getDocumentationChatMessages(repositoryId) as { messages: any[] };
      const loadedMessages = response.messages.map((msg) => ({
        id: msg._id || msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
      }));
      setChatMessages(loadedMessages);
    } catch (error) {
      console.error("Failed to load chat messages:", error);
    }
  };

  const handleGenerateDocumentation = async () => {
    if (!repositoryId) return;

    try {
      setIsGenerating(true);
      const data = await documentationApi.generateDocumentation(repositoryId) as { documentation: Documentation };
      setDocumentation(data.documentation);
      toast.success("Documentation generated successfully!");
    } catch (error: any) {
      console.error("Failed to generate documentation:", error);
      
      // Provide helpful error message for service unavailable
      if (error.message?.includes("service unavailable") || error.message?.includes("503")) {
        toast.error(
          "AI engine is not running. Please start the Python AI engine:\n\n" +
          "1. Open a terminal in the 'model' directory\n" +
          "2. Run: python app.py\n" +
          "3. Wait for the engine to start on http://localhost:5000",
          { duration: 10000 }
        );
      } else {
        toast.error(error.message || "Failed to generate documentation");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || isChatLoading || !repositoryId) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: chatInput.trim(),
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      let fullResponse = "";
      await documentationApi.sendDocumentationChatMessage(
        repositoryId,
        chatInput.trim(),
        (chunk: string) => {
          fullResponse += chunk;
          setChatMessages((prev) => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg && lastMsg.role === "assistant") {
              lastMsg.content = fullResponse;
            } else {
              updated.push({
                role: "assistant",
                content: fullResponse,
                timestamp: new Date(),
              });
            }
            return updated;
          });
        }
      );

      if (fullResponse) {
        setChatMessages((prev) => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          if (lastMsg && lastMsg.role === "assistant") {
            lastMsg.content = fullResponse;
          }
          return updated;
        });
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      toast.error(error.message || "Failed to send message");
      setChatMessages((prev) => [...prev, {
        role: "assistant",
        content: "I apologize, but I encountered an error. Please try again.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDownloadReport = () => {
    if (!documentation) return;
    
    generateDocumentationPDF({
      repositoryName: repository?.fullName || repository?.name || "Repository",
      overview: documentation.overview,
      fileStructure: documentation.fileStructure,
      detailedExplanations: documentation.detailedExplanations,
      codeFlowAnalysis: documentation.codeFlowAnalysis,
      architectureDescription: documentation.architectureDescription,
      apiEndpoints: documentation.apiEndpoints,
      schemas: documentation.schemas,
      projectStructure: documentation.projectStructure,
      dependencies: documentation.dependencies,
      generatedAt: documentation.generatedAt,
      generatedBy: documentation.generatedBy,
      modelName: documentation.modelName,
      provider: documentation.provider,
    });
    
    toast.success("Documentation report downloaded successfully");
  };

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: "bg-blue-500/20 text-blue-500 border-blue-500/30",
      POST: "bg-green-500/20 text-green-500 border-green-500/30",
      PUT: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
      DELETE: "bg-red-500/20 text-red-500 border-red-500/30",
      PATCH: "bg-purple-500/20 text-purple-500 border-purple-500/30",
    };
    return colors[method] || "bg-gray-500/20 text-gray-500 border-gray-500/30";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-12">
          <div className="container px-4">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
        <div className="container px-4 max-w-6xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Documentation</h1>
                <p className="text-muted-foreground mt-1">
                  {repository?.fullName || "Repository Documentation"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {documentation && (
                <>
                  <Button variant="outline" onClick={handleDownloadReport}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Report
                  </Button>
                  <Button variant="outline" onClick={handleGenerateDocumentation} disabled={isGenerating}>
                    <RefreshCw className={cn("h-4 w-4 mr-2", isGenerating && "animate-spin")} />
                    Regenerate
                  </Button>
                </>
              )}
            </div>
          </div>

          {!documentation ? (
            <Card className="glass border-border">
              <CardHeader>
                <CardTitle>No Documentation Found</CardTitle>
                <CardDescription>
                  Generate comprehensive documentation for this repository including API endpoints, schemas, and project structure.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleGenerateDocumentation} disabled={isGenerating} variant="cyber" size="lg">
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Generating Documentation...
                    </>
                  ) : (
                    <>
                      <FileText className="h-5 w-5 mr-2" />
                      Generate Documentation
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid w-full grid-cols-5 mb-6 bg-secondary/50 p-1 rounded-xl">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="api" className="flex items-center gap-2">
                  <Code2 className="h-4 w-4" />
                  API Endpoints ({documentation.apiEndpoints.length})
                </TabsTrigger>
                <TabsTrigger value="schemas" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Schemas ({documentation.schemas.length})
                </TabsTrigger>
                <TabsTrigger value="structure" className="flex items-center gap-2">
                  <FolderTree className="h-4 w-4" />
                  Structure
                </TabsTrigger>
                <TabsTrigger value="chat" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Chat
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {documentation.overview && (
                  <Card className="glass border-border">
                    <CardHeader>
                      <CardTitle>Project Overview</CardTitle>
                      {documentation.generatedAt && (
                        <CardDescription>
                          Generated: {new Date(documentation.generatedAt).toLocaleString()}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-invert max-w-none">
                        <p className="whitespace-pre-wrap">{documentation.overview}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {documentation.fileStructure && (
                  <Card className="glass border-border">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FolderTree className="h-5 w-5" />
                        File Structure
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="whitespace-pre-wrap font-mono text-sm bg-secondary/30 p-4 rounded-lg border border-border overflow-x-auto">
                        {documentation.fileStructure}
                      </pre>
                    </CardContent>
                  </Card>
                )}

                {documentation.detailedExplanations && (
                  <Card className="glass border-border">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Detailed Function Explanations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-invert max-w-none">
                        <pre className="whitespace-pre-wrap font-mono text-sm bg-secondary/30 p-4 rounded-lg border border-border overflow-x-auto">
                          {documentation.detailedExplanations}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {documentation.codeFlowAnalysis && (
                  <Card className="glass border-border">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Code2 className="h-5 w-5" />
                        Code Flow Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-invert max-w-none">
                        <pre className="whitespace-pre-wrap font-mono text-sm bg-secondary/30 p-4 rounded-lg border border-border overflow-x-auto">
                          {documentation.codeFlowAnalysis}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {documentation.architectureDescription && (
                  <Card className="glass border-border">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FolderTree className="h-5 w-5" />
                        Architecture Diagram Description
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-invert max-w-none">
                        <pre className="whitespace-pre-wrap font-mono text-sm bg-secondary/30 p-4 rounded-lg border border-border overflow-x-auto">
                          {documentation.architectureDescription}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {documentation.dependencies && documentation.dependencies.length > 0 && (
                  <Card className="glass border-border">
                    <CardHeader>
                      <CardTitle>Dependencies</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {documentation.dependencies.map((dep, idx) => (
                          <div key={idx} className="p-3 rounded-lg border border-border bg-secondary/30">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">{dep.name}</span>
                              {dep.version && (
                                <Badge variant="outline" className="text-xs">
                                  {dep.version}
                                </Badge>
                              )}
                            </div>
                            {dep.description && (
                              <p className="text-sm text-muted-foreground">{dep.description}</p>
                            )}
                            {dep.type && (
                              <Badge variant="secondary" className="text-xs mt-2">
                                {dep.type}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="api" className="space-y-4">
                {documentation.apiEndpoints.length === 0 ? (
                  <Card className="glass border-border">
                    <CardContent className="py-12 text-center">
                      <Code2 className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                      <p className="text-muted-foreground">No API endpoints found</p>
                    </CardContent>
                  </Card>
                ) : (
                  documentation.apiEndpoints.map((endpoint, idx) => (
                    <Card key={idx} className="glass border-border">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge className={getMethodColor(endpoint.method)}>
                                {endpoint.method}
                              </Badge>
                              <code className="text-lg font-mono">{endpoint.path}</code>
                            </div>
                            {endpoint.description && (
                              <CardDescription className="mt-2">{endpoint.description}</CardDescription>
                            )}
                          </div>
                          {endpoint.file && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(`${endpoint.file}:${endpoint.line || ""}`, `file-${idx}`)}
                            >
                              {copied === `file-${idx}` ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {endpoint.parameters && endpoint.parameters.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-2">Parameters</h4>
                            <div className="space-y-2">
                              {endpoint.parameters.map((param, pIdx) => (
                                <div key={pIdx} className="p-3 rounded-lg border border-border bg-secondary/30">
                                  <div className="flex items-center gap-2 mb-1">
                                    <code className="font-mono text-sm">{param.name}</code>
                                    <Badge variant="outline" className="text-xs">
                                      {param.type}
                                    </Badge>
                                    {param.required && (
                                      <Badge variant="destructive" className="text-xs">
                                        Required
                                      </Badge>
                                    )}
                                    <Badge variant="secondary" className="text-xs">
                                      {param.location}
                                    </Badge>
                                  </div>
                                  {param.description && (
                                    <p className="text-sm text-muted-foreground">{param.description}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {endpoint.requestBody && (
                          <div>
                            <h4 className="font-semibold mb-2">Request Body</h4>
                            <div className="rounded-lg overflow-hidden border border-border">
                              <SyntaxHighlighter
                                language="json"
                                style={vscDarkPlus}
                                customStyle={{ margin: 0, fontSize: "0.875rem", padding: "1rem" }}
                              >
                                {JSON.stringify(endpoint.requestBody, null, 2)}
                              </SyntaxHighlighter>
                            </div>
                          </div>
                        )}

                        {endpoint.responses && endpoint.responses.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-2">Responses</h4>
                            <div className="space-y-2">
                              {endpoint.responses.map((response, rIdx) => (
                                <div key={rIdx} className="p-3 rounded-lg border border-border bg-secondary/30">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline">{response.statusCode}</Badge>
                                    {response.description && (
                                      <span className="text-sm">{response.description}</span>
                                    )}
                                  </div>
                                  {response.schema && (
                                    <div className="mt-2 rounded-lg overflow-hidden border border-border">
                                      <SyntaxHighlighter
                                        language="json"
                                        style={vscDarkPlus}
                                        customStyle={{ margin: 0, fontSize: "0.75rem", padding: "0.75rem" }}
                                      >
                                        {JSON.stringify(response.schema, null, 2)}
                                      </SyntaxHighlighter>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="schemas" className="space-y-4">
                {documentation.schemas.length === 0 ? (
                  <Card className="glass border-border">
                    <CardContent className="py-12 text-center">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                      <p className="text-muted-foreground">No schemas found</p>
                    </CardContent>
                  </Card>
                ) : (
                  documentation.schemas.map((schema, idx) => (
                    <Card key={idx} className="glass border-border">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <CardTitle className="text-xl">{schema.name}</CardTitle>
                              <Badge variant="outline">{schema.type}</Badge>
                            </div>
                            {schema.description && (
                              <CardDescription>{schema.description}</CardDescription>
                            )}
                          </div>
                          {schema.file && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(`${schema.file}:${schema.line || ""}`, `schema-${idx}`)}
                            >
                              {copied === `schema-${idx}` ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      {schema.properties && schema.properties.length > 0 && (
                        <CardContent>
                          <h4 className="font-semibold mb-3">Properties</h4>
                          <div className="space-y-2">
                            {schema.properties.map((prop, pIdx) => (
                              <div key={pIdx} className="p-3 rounded-lg border border-border bg-secondary/30">
                                <div className="flex items-center gap-2 mb-1">
                                  <code className="font-mono text-sm font-semibold">{prop.name}</code>
                                  <Badge variant="outline" className="text-xs">
                                    {prop.type}
                                  </Badge>
                                  {prop.required && (
                                    <Badge variant="destructive" className="text-xs">
                                      Required
                                    </Badge>
                                  )}
                                  {prop.defaultValue !== undefined && prop.defaultValue !== null && (
                                    <Badge variant="secondary" className="text-xs">
                                      Default: {String(prop.defaultValue)}
                                    </Badge>
                                  )}
                                </div>
                                {prop.description && (
                                  <p className="text-sm text-muted-foreground">{prop.description}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="structure" className="space-y-4">
                {!documentation.projectStructure ? (
                  <Card className="glass border-border">
                    <CardContent className="py-12 text-center">
                      <FolderTree className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                      <p className="text-muted-foreground">No project structure information available</p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {documentation.projectStructure.directories && documentation.projectStructure.directories.length > 0 && (
                      <Card className="glass border-border">
                        <CardHeader>
                          <CardTitle>Directory Structure</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {documentation.projectStructure.directories.map((dir, idx) => (
                              <div key={idx} className="p-4 rounded-lg border border-border bg-secondary/30">
                                <div className="flex items-center gap-2 mb-2">
                                  <FolderTree className="h-4 w-4" />
                                  <code className="font-mono font-semibold">{dir.path}</code>
                                </div>
                                {dir.description && (
                                  <p className="text-sm text-muted-foreground mb-2">{dir.description}</p>
                                )}
                                {dir.files && dir.files.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {dir.files.map((file, fIdx) => (
                                      <Badge key={fIdx} variant="outline" className="text-xs">
                                        {file}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {documentation.projectStructure.entryPoints && documentation.projectStructure.entryPoints.length > 0 && (
                      <Card className="glass border-border">
                        <CardHeader>
                          <CardTitle>Entry Points</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {documentation.projectStructure.entryPoints.map((entry, idx) => (
                              <code key={idx} className="block p-2 rounded bg-secondary/30 font-mono text-sm">
                                {entry}
                              </code>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {documentation.projectStructure.mainFiles && documentation.projectStructure.mainFiles.length > 0 && (
                      <Card className="glass border-border">
                        <CardHeader>
                          <CardTitle>Main Files</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {documentation.projectStructure.mainFiles.map((file, idx) => (
                              <Badge key={idx} variant="outline" className="text-sm">
                                {file}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="chat">
                <Card className="glass border-border">
                  <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Ask About Code</h3>
                    </div>
                  </div>

                  <ScrollArea className="h-[500px] p-4">
                    {chatMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center py-12">
                        <MessageSquare className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                        <p className="text-muted-foreground mb-2">Start a conversation about the codebase</p>
                        <p className="text-sm text-muted-foreground">
                          Ask questions about functions, variables, API endpoints, or code structure
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {chatMessages.map((message, index) => {
                          const isUser = message.role === "user";
                          return (
                            <div
                              key={message.id || index}
                              className={cn(
                                "flex gap-4 p-4 rounded-lg",
                                isUser ? "bg-secondary/30" : "bg-card/50"
                              )}
                            >
                              <Avatar className="h-8 w-8 shrink-0">
                                <AvatarFallback className={cn(isUser ? "bg-primary" : "bg-accent")}>
                                  {isUser ? (
                                    <User className="h-4 w-4 text-primary-foreground" />
                                  ) : (
                                    <Bot className="h-4 w-4 text-accent-foreground" />
                                  )}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 space-y-2 min-w-0">
                                <div className="text-sm font-medium text-muted-foreground">
                                  {isUser ? "You" : "IntelliShieldX AI"}
                                </div>
                                <div className="prose prose-invert max-w-none whitespace-pre-wrap break-words">
                                  {message.content}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {isChatLoading && (
                          <div className="flex gap-4 p-4 rounded-lg bg-card/50">
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback className="bg-accent">
                                <Bot className="h-4 w-4 text-accent-foreground" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                          </div>
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>

                  <div className="border-t border-border bg-card/50 p-4">
                    <div className="flex gap-2 items-end">
                      <div className="flex-1 relative">
                        <Textarea
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleChatSend();
                            }
                          }}
                          placeholder="Ask about functions, variables, API endpoints, code structure..."
                          disabled={isChatLoading}
                          className="min-h-[60px] max-h-[200px] resize-none"
                          rows={1}
                        />
                      </div>
                      <Button
                        onClick={handleChatSend}
                        disabled={isChatLoading || !chatInput.trim()}
                        size="icon"
                        className="h-[60px] w-[60px] shrink-0"
                      >
                        {isChatLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Send className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
    </div>
  );
}

