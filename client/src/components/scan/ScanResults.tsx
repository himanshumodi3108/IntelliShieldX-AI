import { useState, useRef, useEffect } from "react";
import { 
  AlertTriangle, 
  ChevronDown, 
  ChevronRight, 
  Code2, 
  FileText, 
  Copy, 
  Check,
  CheckCircle2,
  Download,
  MessageSquare,
  Send,
  Loader2,
  Bot,
  User,
  Shield,
  Edit2,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { toast } from "sonner";
import { chatApi, scanApi } from "@/lib/api";
import { generateChatPDF, generateScanReportPDF } from "@/utils/pdfGenerator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";

interface Vulnerability {
  id: string;
  cwe: string;
  name: string;
  file?: string;
  url?: string;
  line?: number;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  fixCode?: string;
  originalCode?: string;
  recommendation?: string;
  owaspTop10?: string; // OWASP Top 10 category (A01-A10)
  complianceImpact?: string; // Compliance frameworks affected (GDPR, HIPAA, PCI-DSS, etc.)
}

interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
  isEditing?: boolean;
}

const severityConfig = {
  critical: { color: "text-red-500", bg: "bg-red-500/20", label: "Critical" },
  high: { color: "text-orange-500", bg: "bg-orange-500/20", label: "High" },
  medium: { color: "text-yellow-500", bg: "bg-yellow-500/20", label: "Medium" },
  low: { color: "text-blue-500", bg: "bg-blue-500/20", label: "Low" },
};

function RecommendationCard({ rec, index }: { rec: string | any; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const recTitle = typeof rec === 'string' ? rec : rec.title;
  const recData = typeof rec === 'string' ? null : rec;

  if (!recData) {
    return (
      <li className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border">
        <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <span className="text-sm">{recTitle}</span>
      </li>
    );
  }

  return (
    <li className="rounded-lg bg-secondary/30 border border-border overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-start gap-3 p-4 hover:bg-secondary/50 transition-colors cursor-pointer"
      >
        <CheckCircle2 className={`h-5 w-5 mt-0.5 shrink-0 ${recData.severity === 'critical' ? 'text-red-500' : recData.severity === 'high' ? 'text-orange-500' : 'text-primary'}`} />
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">{recTitle}</span>
            {recData.severity && (
              <Badge variant={recData.severity === 'critical' ? 'destructive' : recData.severity === 'high' ? 'default' : 'secondary'} className="text-xs">
                {recData.severity}
              </Badge>
            )}
          </div>
          {recData.description && (
            <p className="text-xs text-muted-foreground">{recData.description}</p>
          )}
        </div>
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
        )}
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
          {recData.symptoms && recData.symptoms.length > 0 && (
            <div>
              <h5 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Symptoms
              </h5>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-6">
                {recData.symptoms.map((symptom: string, idx: number) => (
                  <li key={idx}>{symptom}</li>
                ))}
              </ul>
            </div>
          )}
          {recData.impact && (
            <div>
              <h5 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4 text-red-500" />
                Potential Impact
              </h5>
              <p className="text-sm text-muted-foreground ml-6">{recData.impact}</p>
            </div>
          )}
          {recData.removalSteps && recData.removalSteps.length > 0 && (
            <div>
              <h5 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Removal Steps
              </h5>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-6">
                {recData.removalSteps.map((step: string, idx: number) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
            </div>
          )}
          {recData.prevention && recData.prevention.length > 0 && (
            <div>
              <h5 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-500" />
                Prevention
              </h5>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-6">
                {recData.prevention.map((prevent: string, idx: number) => (
                  <li key={idx}>{prevent}</li>
                ))}
              </ul>
            </div>
          )}
          {recData.malwareFamily && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Malware Family:</span>
              <Badge variant="outline">{recData.malwareFamily}</Badge>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function VulnerabilityCard({ vuln }: { vuln: Vulnerability }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const config = severityConfig[vuln.severity];

  const copyCode = (code: string, type: string) => {
    navigator.clipboard.writeText(code);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  // Extract language from file extension
  const getLanguage = (filename?: string): string => {
    if (!filename) return "text";
    const ext = filename.split(".").pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      js: "javascript",
      jsx: "javascript",
      ts: "typescript",
      tsx: "typescript",
      py: "python",
      java: "java",
      cpp: "cpp",
      c: "c",
      cs: "csharp",
      php: "php",
      rb: "ruby",
      go: "go",
      rs: "rust",
      swift: "swift",
      kt: "kotlin",
      html: "html",
      css: "css",
      scss: "scss",
      sql: "sql",
      json: "json",
      xml: "xml",
      yaml: "yaml",
      yml: "yaml",
    };
    return langMap[ext || ""] || "text";
  };

  return (
    <div className="rounded-xl border border-border overflow-hidden animate-fade-in">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center gap-4 hover:bg-secondary/30 transition-colors"
      >
        <div className={cn("p-2 rounded-lg", config.bg)}>
          <AlertTriangle className={cn("h-5 w-5", config.color)} />
        </div>

        <div className="flex-1 text-left">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={cn("px-2 py-0.5 rounded text-xs font-medium", config.bg, config.color)}>
              {config.label}
            </span>
            <span className="text-xs font-mono text-muted-foreground">{vuln.cwe}</span>
            {vuln.owaspTop10 && vuln.owaspTop10 !== "N/A" && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-500 border border-purple-500/30">
                {vuln.owaspTop10}
              </span>
            )}
            {vuln.complianceImpact && vuln.complianceImpact !== "N/A" && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-500 border border-blue-500/30">
                {vuln.complianceImpact}
              </span>
            )}
          </div>
          <h4 className="font-semibold">{vuln.name}</h4>
          <p className="text-sm text-muted-foreground">
            {vuln.file && vuln.line !== undefined
              ? `${vuln.file}:${vuln.line}`
              : vuln.file || vuln.url || "General"}
          </p>
        </div>

        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
          <div>
            <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Description
            </h5>
            <p className="text-sm text-muted-foreground">{vuln.description}</p>
          </div>

          {/* Original and Fixed Code Side-by-Side */}
          {(vuln.originalCode || vuln.fixCode) && (
            <div className="space-y-3">
              <h5 className="text-sm font-medium flex items-center gap-2">
                <Code2 className="h-4 w-4 text-primary" />
                Code Comparison
              </h5>
              <div className="grid md:grid-cols-2 gap-4">
                {/* Original Code */}
                {vuln.originalCode && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">Original Code</span>
                        {vuln.file && vuln.line !== undefined && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {vuln.file}:{vuln.line}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={() => copyCode(vuln.originalCode!, "original")}
                      >
                        {copied === "original" ? (
                          <Check className="h-3 w-3 text-success" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    <div className="rounded-lg overflow-hidden border border-border">
                      <SyntaxHighlighter
                        language={getLanguage(vuln.file)}
                        style={vscDarkPlus}
                        customStyle={{
                          margin: 0,
                          fontSize: "0.75rem",
                          padding: "1rem",
                        }}
                      >
                        {vuln.originalCode}
                      </SyntaxHighlighter>
                    </div>
                  </div>
                )}

                {/* Fixed Code */}
                {vuln.fixCode && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-green-500">AI Remediated Code</span>
                        {vuln.file && vuln.line !== undefined && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {vuln.file}:{vuln.line}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={() => copyCode(vuln.fixCode!, "fixed")}
                      >
                        {copied === "fixed" ? (
                          <Check className="h-3 w-3 text-success" />
                        ) : (
                          <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
                    <div className="rounded-lg overflow-hidden border border-green-500/30">
                      <SyntaxHighlighter
                        language={getLanguage(vuln.file)}
                        style={vscDarkPlus}
                        customStyle={{
                          margin: 0,
                          fontSize: "0.75rem",
                          padding: "1rem",
                        }}
                      >
                        {vuln.fixCode}
                      </SyntaxHighlighter>
          </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {vuln.complianceImpact && vuln.complianceImpact !== "N/A" && (
            <div>
              <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-500" />
                Compliance Impact
              </h5>
              <p className="text-sm text-muted-foreground">
                This vulnerability may impact compliance with: <strong className="text-blue-500">{vuln.complianceImpact}</strong>
              </p>
            </div>
          )}

          {vuln.recommendation && (
            <div>
              <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Recommendation
              </h5>
              <p className="text-sm text-muted-foreground">{vuln.recommendation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ThreatIntelligence {
  hashes?: {
    md5?: string;
    sha1?: string;
    sha256?: string;
  };
  virusTotal?: {
    scanned: boolean;
    found?: boolean;
    positives?: number;
    total?: number;
    detectionRate?: number;
    status?: "malicious" | "suspicious" | "clean" | "unknown";
    permalink?: string;
    tags?: string[];
    typeDescription?: string;
    meaningfulName?: string;
  };
  malwareBazaar?: {
    scanned: boolean;
    found?: boolean;
    malwareType?: string;
    fileType?: string;
    fileTypeMime?: string;
    malwareFamily?: string;
    signature?: string;
    threatLevel?: "critical" | "high" | "medium" | "low";
    permalink?: string;
    tags?: string[];
  };
  urlhaus?: {
    scanned: boolean;
    found?: boolean;
    status?: "malicious" | "suspicious" | "clean" | "unknown";
    threat?: string;
    permalink?: string;
  };
  hybridAnalysis?: {
    scanned: boolean;
    found?: boolean;
    threatScore?: number;
    verdict?: string;
    malwareFamily?: string;
    permalink?: string;
  };
  abuseIPDB?: {
    scanned: boolean;
    ip?: string;
    abuseConfidence?: number;
    status?: "malicious" | "suspicious" | "clean" | "unknown";
    totalReports?: number;
    isp?: string;
    countryCode?: string;
    usageType?: string;
    isWhitelisted?: boolean;
    permalink?: string;
  };
  threatFox?: {
    scanned: boolean;
    found?: boolean;
    ioc?: string;
    iocType?: string;
    threatType?: string;
    malwareFamily?: string;
    confidenceLevel?: number;
    firstSeen?: string;
    lastSeen?: string;
    tags?: string[];
    permalink?: string;
  };
}

interface OverallSecurity {
  status: "critical" | "high" | "medium" | "low" | "safe";
  score: number;
  summary: string;
  recommendations?: string[];
}

interface ScanResultsProps {
  scanData?: {
    scanId?: string;
    target?: string;
    type?: string;
    vulnerabilities?: Vulnerability[];
    summary?: {
      critical: number;
      high: number;
      medium: number;
      low: number;
      owaspTop10?: number;
    };
    aiInsights?: string;
    threatIntelligenceInsights?: string;
    warning?: string;
    malwareWarning?: {
      file: string;
      positives: number;
      total: number;
      detectionRate: number;
      status: string;
      permalink?: string;
      message: string;
    };
    scanDuration?: number;
    filesAnalyzed?: number;
    createdAt?: string | Date;
    threatIntelligence?: ThreatIntelligence;
    overallSecurity?: OverallSecurity;
    chatMessages?: Array<{
      _id?: string;
      id?: string;
      role: "user" | "assistant";
      content: string;
      timestamp?: string | Date;
    }>;
  } | null;
}

export function ScanResults({ scanData }: ScanResultsProps) {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "vulnerabilities" | "threatIntelligence" | "aiInsights" | "recommendations" | "chat">("overview");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [streamingAbortController, setStreamingAbortController] = useState<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Load chat messages when scan data is available
  useEffect(() => {
    if (scanData?.scanId && isAuthenticated && activeTab === "chat") {
      loadChatMessages();
    } else if (scanData?.chatMessages && scanData.chatMessages.length > 0) {
      // Load from scan data if available (for authenticated users)
      const loadedMessages = scanData.chatMessages.map((msg: any) => ({
        id: msg._id || msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
      }));
      setChatMessages(loadedMessages);
    }
  }, [scanData?.scanId, activeTab, isAuthenticated]);

  const loadChatMessages = async () => {
    if (!scanData?.scanId || !isAuthenticated) return;

    try {
      const response = await scanApi.getScanChatMessages(scanData.scanId) as { messages: any[] };
      const loadedMessages = response.messages.map((msg) => ({
        id: msg._id || msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
      }));
      setChatMessages(loadedMessages);
    } catch (error) {
      console.error("Failed to load chat messages:", error);
      // Don't show error toast, just use empty array
    }
  };

  const saveChatMessage = async (role: "user" | "assistant", content: string, messageId?: string) => {
    if (!scanData?.scanId || !isAuthenticated) return null;

    try {
      if (messageId) {
        // Update existing message
        await scanApi.updateScanChatMessage(scanData.scanId, messageId, content);
        return messageId;
      } else {
        // Add new message
        const response = await scanApi.addScanChatMessage(scanData.scanId, role, content) as { messageId: string };
        return response.messageId;
      }
    } catch (error) {
      console.error("Failed to save chat message:", error);
      // Don't show error toast, just return null
      return null;
    }
  };

  const vulnerabilities = scanData?.vulnerabilities || [];
  const summary = scanData?.summary || {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    owaspTop10: 0,
  };
  const aiInsights = scanData?.aiInsights;
  const warning = scanData?.warning;

  // Format AI insights with markdown
  const formatAIInsights = (text: string): string => {
    if (!text) return "";
    
    // Split into lines for better processing
    const lines = text.split('\n');
    const formattedLines: string[] = [];
    let inList = false;
    let listItems: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Headers
      if (line.startsWith('### ')) {
        if (inList) {
          formattedLines.push(`<ul class="list-disc ml-6 mb-3 space-y-1">${listItems.join('')}</ul>`);
          listItems = [];
          inList = false;
        }
        formattedLines.push(`<h3 class="text-lg font-semibold mt-4 mb-2">${line.substring(4)}</h3>`);
        continue;
      }
      if (line.startsWith('## ')) {
        if (inList) {
          formattedLines.push(`<ul class="list-disc ml-6 mb-3 space-y-1">${listItems.join('')}</ul>`);
          listItems = [];
          inList = false;
        }
        formattedLines.push(`<h2 class="text-xl font-semibold mt-5 mb-3">${line.substring(3)}</h2>`);
        continue;
      }
      if (line.startsWith('# ')) {
        if (inList) {
          formattedLines.push(`<ul class="list-disc ml-6 mb-3 space-y-1">${listItems.join('')}</ul>`);
          listItems = [];
          inList = false;
        }
        formattedLines.push(`<h1 class="text-2xl font-bold mt-6 mb-4">${line.substring(2)}</h1>`);
        continue;
      }
      
      // Numbered lists
      const numberedMatch = line.match(/^(\d+)\.\s+(.*)$/);
      if (numberedMatch) {
        if (!inList) {
          inList = true;
          listItems = [];
        }
        const itemText = numberedMatch[2]
          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
          .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
          .replace(/__(.*?)__/g, '<u class="underline">$1</u>');
        listItems.push(`<li class="ml-4 mb-1">${itemText}</li>`);
        continue;
      }
      
      // Bullet points
      const bulletMatch = line.match(/^[-*]\s+(.*)$/);
      if (bulletMatch) {
        if (!inList) {
          inList = true;
          listItems = [];
        }
        const itemText = bulletMatch[1]
          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
          .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
          .replace(/__(.*?)__/g, '<u class="underline">$1</u>');
        listItems.push(`<li class="ml-4 mb-1">${itemText}</li>`);
        continue;
      }
      
      // End of list
      if (inList && line === '') {
        formattedLines.push(`<ul class="list-disc ml-6 mb-3 space-y-1">${listItems.join('')}</ul>`);
        listItems = [];
        inList = false;
        continue;
      }
      
      // Regular paragraph
      if (line) {
        if (inList) {
          formattedLines.push(`<ul class="list-disc ml-6 mb-3 space-y-1">${listItems.join('')}</ul>`);
          listItems = [];
          inList = false;
        }
        let formattedLine = line
          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
          .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
          .replace(/__(.*?)__/g, '<u class="underline">$1</u>');
        formattedLines.push(`<p class="mb-3">${formattedLine}</p>`);
      } else if (!inList) {
        formattedLines.push('<br />');
      }
    }
    
    // Close any remaining list
    if (inList && listItems.length > 0) {
      formattedLines.push(`<ul class="list-disc ml-6 mb-3 space-y-1">${listItems.join('')}</ul>`);
    }
    
    return formattedLines.join('');
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (activeTab === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, activeTab]);

  const handleChatSend = async (contentOverride?: string) => {
    const messageContent = contentOverride || chatInput.trim();
    if (!messageContent || isChatLoading) return;

    // Cancel any ongoing streaming
    if (streamingAbortController) {
      streamingAbortController.abort();
      setStreamingAbortController(null);
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: messageContent,
      timestamp: new Date(),
    };

    // If editing, replace the message; otherwise add new
    if (editingMessageId) {
      setChatMessages((prev) => {
        const updated = [...prev];
        const index = updated.findIndex((m) => m.id === editingMessageId);
        if (index !== -1) {
          updated[index] = { ...updated[index], ...userMessage };
        }
        return updated;
      });
      // Save updated message
      if (isAuthenticated && scanData?.scanId) {
        await saveChatMessage("user", messageContent, editingMessageId);
      }
      setEditingMessageId(null);
      setEditingContent("");
    } else {
      setChatMessages((prev) => [...prev, userMessage]);
      // Save user message
      if (isAuthenticated && scanData?.scanId) {
        const savedId = await saveChatMessage("user", messageContent);
        if (savedId) {
          setChatMessages((prev) => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg && lastMsg.role === "user") {
              lastMsg.id = savedId;
            }
            return updated;
          });
        }
      }
    }

    if (!contentOverride) {
      setChatInput("");
    }
    setIsChatLoading(true);

    // Create abort controller for this request
    const abortController = new AbortController();
    setStreamingAbortController(abortController);

    try {
      // Create context about the scan for the AI
      const scanContext = `
You are helping a user understand security scan results. Here is the scan context:

Scan Results Summary:
- Critical: ${summary.critical}
- High: ${summary.high}
- Medium: ${summary.medium}
- Low: ${summary.low}
- Total Vulnerabilities: ${vulnerabilities.length}

${vulnerabilities.length > 0 ? `Vulnerabilities found:\n${vulnerabilities.map((v, i) => `${i + 1}. ${v.name} (${v.severity}) - ${v.file || "N/A"}:${v.line || "N/A"}\n   Description: ${v.description}\n   ${v.fixCode ? `Fix available: Yes` : ""}`).join("\n")}` : "No vulnerabilities found."}

${aiInsights ? `\nAI Security Insights:\n${aiInsights}` : ""}

Now answer the user's question about these scan results: ${messageContent}
`;

      // Use guest message API for scan-specific chat (works for both authenticated and unauthenticated)
      let fullResponse = "";
      let assistantMessageId: string | null = null;

      await chatApi.sendGuestMessage(
        scanContext,
        "mixtral-8x7b", // Default to Groq model
        (chunk: string) => {
          if (abortController.signal.aborted) return;
          
          fullResponse += chunk;
          // Update the last message with streaming content
          setChatMessages((prev) => {
            const updated = [...prev];
            let lastMsg = updated[updated.length - 1];
            if (lastMsg && lastMsg.role === "assistant") {
              lastMsg.content = fullResponse;
            } else {
              const newMsg: ChatMessage = {
                role: "assistant",
                content: fullResponse,
                timestamp: new Date(),
              };
              updated.push(newMsg);
              lastMsg = newMsg;
            }
            return updated;
          });
        }
      );

      // Ensure final message is set
      if (fullResponse && !abortController.signal.aborted) {
        setChatMessages((prev) => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          if (lastMsg && lastMsg.role === "assistant") {
            lastMsg.content = fullResponse;
            assistantMessageId = lastMsg.id || null;
          }
          return updated;
        });

        // Save assistant message
        if (isAuthenticated && scanData?.scanId && fullResponse) {
          const savedId = await saveChatMessage("assistant", fullResponse);
          if (savedId) {
            setChatMessages((prev) => {
              const updated = [...prev];
              const lastMsg = updated[updated.length - 1];
              if (lastMsg && lastMsg.role === "assistant") {
                lastMsg.id = savedId;
              }
              return updated;
            });
          }
        }
      } else if (!abortController.signal.aborted) {
        // If no response, add error message
        const errorMessage: ChatMessage = {
          role: "assistant",
          content: "I apologize, but I couldn't generate a response. Please try again.",
          timestamp: new Date(),
        };
        setChatMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error: any) {
      if (abortController.signal.aborted) {
        // User canceled, remove the assistant message if it was added
        setChatMessages((prev) => {
          const updated = [...prev];
          if (updated[updated.length - 1]?.role === "assistant") {
            updated.pop();
          }
          return updated;
        });
        return;
      }

      console.error("Chat error:", error);
      toast.error(error.message || "Failed to send message. Please try again.");
      
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: "I apologize, but I encountered an error. Please ensure the AI engine is running and try again.",
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
      setStreamingAbortController(null);
    }
  };

  const handleEditMessage = (messageId: string, currentContent: string) => {
    setEditingMessageId(messageId);
    setEditingContent(currentContent);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent("");
  };

  const handleSaveEdit = (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (editingContent.trim() && editingMessageId) {
      handleChatSend(editingContent.trim());
    }
  };

  const handleCancelStreaming = () => {
    if (streamingAbortController) {
      streamingAbortController.abort();
      setStreamingAbortController(null);
      setIsChatLoading(false);
    }
  };

  const handleDownloadChat = () => {
    if (chatMessages.length === 0) {
      toast.error("No chat messages to download");
      return;
    }

    try {
      const title = `Scan Results Chat - ${scanData?.scanId || "Scan"}`;
      generateChatPDF(chatMessages, title);
      toast.success("Chat downloaded successfully!");
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast.error("Failed to generate PDF. Please try again.");
    }
  };

  const handleDownloadReport = () => {
    if (!scanData) {
      toast.error("No scan data available to download");
      return;
    }

    try {
      generateScanReportPDF({
        scanId: scanData.scanId,
        target: scanData.target || "Unknown",
        type: scanData.type || "file",
        vulnerabilities: vulnerabilities,
        summary: summary,
        aiInsights: aiInsights,
        threatIntelligenceInsights: scanData.threatIntelligenceInsights,
        scanDuration: scanData.scanDuration,
        filesAnalyzed: scanData.filesAnalyzed,
        createdAt: scanData.createdAt || new Date(),
        threatIntelligence: scanData.threatIntelligence,
        overallSecurity: scanData.overallSecurity,
      });
      toast.success("Scan report downloaded successfully!");
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast.error("Failed to generate PDF. Please try again.");
    }
  };

  // Process chat message content for display
  const processMessageContent = (content: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts: Array<{ type: "text" | "code"; content: string; language?: string }> = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: "text",
          content: content.slice(lastIndex, match.index),
        });
      }
      parts.push({
        type: "code",
        content: match[2],
        language: match[1] || "text",
      });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < content.length) {
      parts.push({
        type: "text",
        content: content.slice(lastIndex),
      });
    }
    if (parts.length === 0) {
      parts.push({ type: "text", content });
    }

    return parts;
  };

  return (
    <div className="space-y-6">
      {/* Warning if AI is unavailable */}
      {warning && (
        <div className="p-4 rounded-xl bg-yellow-500/20 border border-yellow-500/50 text-yellow-200">
          <p className="text-sm">{warning}</p>
        </div>
      )}

      {/* Summary */}
      <div className="p-6 rounded-2xl glass">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Scan Results</h3>
          <Button variant="outline" size="sm" onClick={handleDownloadReport}>
            <Download className="h-4 w-4 mr-2" />
            Download Report
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(summary)
            .filter(([key]) => key !== "owaspTop10")
            .map(([severity, count]) => {
            const config = severityConfig[severity as keyof typeof severityConfig];
            return (
              <div key={severity} className={cn("p-4 rounded-xl text-center", config.bg)}>
                <div className={cn("text-3xl font-bold", config.color)}>{count}</div>
                <div className="text-sm text-muted-foreground capitalize">{severity}</div>
              </div>
            );
          })}
          {/* OWASP Top 10 Count */}
          <div className="p-4 rounded-xl text-center bg-purple-500/20 border border-purple-500/30">
            <div className="text-3xl font-bold text-purple-500">{summary.owaspTop10 || 0}</div>
            <div className="text-sm text-muted-foreground">OWASP Top 10</div>
          </div>
        </div>
      </div>

      {/* Tabs for Results and Chat */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "overview" | "vulnerabilities" | "threatIntelligence" | "recommendations" | "aiInsights" | "chat")}>
        <TabsList className="grid w-full grid-cols-6 mb-6 bg-secondary/50 p-1 rounded-xl">
          <TabsTrigger
            value="overview"
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"
          >
            <Shield className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="vulnerabilities"
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"
          >
            <FileText className="h-4 w-4" />
            Vulnerabilities ({vulnerabilities.length})
          </TabsTrigger>
          <TabsTrigger
            value="threatIntelligence"
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"
          >
            <AlertTriangle className="h-4 w-4" />
            Threat Intel
          </TabsTrigger>
          <TabsTrigger
            value="aiInsights"
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"
          >
            <FileText className="h-4 w-4" />
            AI Insights
          </TabsTrigger>
          <TabsTrigger
            value="recommendations"
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"
          >
            <CheckCircle2 className="h-4 w-4" />
            Recommendations
          </TabsTrigger>
          <TabsTrigger
            value="chat"
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"
          >
            <MessageSquare className="h-4 w-4" />
            AI Chat
            {chatMessages.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/20 rounded">
                {chatMessages.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab - Unified Security Assessment */}
        <TabsContent value="overview" className="space-y-6">
          {/* Malware Warning - Display prominently if detected */}
          {scanData?.malwareWarning && (
            <Card className="glass border-red-500/50 bg-red-500/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-500">
                  <AlertTriangle className="h-5 w-5" />
                  Malware Detected - Pre-Scan Warning
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm font-medium text-red-400">
                  {scanData.malwareWarning.message}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Detection Rate</Label>
                    <p className="text-sm font-semibold">
                      {scanData.malwareWarning.positives}/{scanData.malwareWarning.total} ({scanData.malwareWarning.detectionRate}%)
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <Badge variant="destructive" className="mt-1">
                      {scanData.malwareWarning.status}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">File</Label>
                    <p className="text-sm font-mono truncate">{scanData.malwareWarning.file}</p>
                  </div>
                  {scanData.malwareWarning.permalink && (
                    <div>
                      <a
                        href={scanData.malwareWarning.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        View on VirusTotal →
                      </a>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                  ⚠️ This file was flagged by VirusTotal before processing. Analysis continues for security research purposes. The file has been automatically deleted from the server after scanning.
                </p>
              </CardContent>
            </Card>
          )}

          {scanData?.overallSecurity && (
            <>
              {/* Overall Security Score Card */}
              <Card className="glass border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Overall Security Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-4xl font-bold mb-2">
                        {scanData.overallSecurity.score}/100
                      </div>
                      <Badge 
                        variant={
                          scanData.overallSecurity.status === "critical" ? "destructive" :
                          scanData.overallSecurity.status === "high" ? "destructive" :
                          scanData.overallSecurity.status === "medium" ? "default" :
                          scanData.overallSecurity.status === "low" ? "secondary" : "outline"
                        }
                        className="text-sm"
                      >
                        {scanData.overallSecurity.status.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground mb-1">Security Status</p>
                      <p className="text-lg font-semibold">{scanData.overallSecurity.summary}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Threat Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Code Vulnerabilities */}
                <Card className="glass border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base">Code Vulnerabilities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Critical</span>
                        <Badge variant="destructive">{summary.critical}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>High</span>
                        <Badge variant="destructive">{summary.high}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Medium</span>
                        <Badge variant="default">{summary.medium}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Low</span>
                        <Badge variant="secondary">{summary.low}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Threat Intelligence */}
                <Card className="glass border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base">Threat Intelligence</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {scanData.threatIntelligence?.virusTotal?.scanned && (
                        <div className="flex justify-between">
                          <span>VirusTotal</span>
                          <Badge variant={scanData.threatIntelligence.virusTotal.status === "malicious" ? "destructive" : "secondary"}>
                            {scanData.threatIntelligence.virusTotal.status || "Unknown"}
                          </Badge>
                        </div>
                      )}
                      {scanData.threatIntelligence?.malwareBazaar?.scanned && (
                        <div className="flex justify-between">
                          <span>MalwareBazaar</span>
                          <Badge variant={scanData.threatIntelligence.malwareBazaar.found ? "destructive" : "outline"}>
                            {scanData.threatIntelligence.malwareBazaar.found ? "Found" : "Not Found"}
                          </Badge>
                        </div>
                      )}
                      {scanData.threatIntelligence?.urlhaus?.scanned && (
                        <div className="flex justify-between">
                          <span>URLhaus</span>
                          <Badge variant={scanData.threatIntelligence.urlhaus.status === "malicious" ? "destructive" : "secondary"}>
                            {scanData.threatIntelligence.urlhaus.status || "Unknown"}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* File Hashes */}
              {scanData.threatIntelligence?.hashes && (
                <Card className="glass border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base">File Hashes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {scanData.threatIntelligence.hashes.md5 && (
                      <div>
                        <Label className="text-xs text-muted-foreground">MD5</Label>
                        <p className="font-mono text-sm break-all">{scanData.threatIntelligence.hashes.md5}</p>
                      </div>
                    )}
                    {scanData.threatIntelligence.hashes.sha1 && (
                      <div>
                        <Label className="text-xs text-muted-foreground">SHA1</Label>
                        <p className="font-mono text-sm break-all">{scanData.threatIntelligence.hashes.sha1}</p>
                      </div>
                    )}
                    {scanData.threatIntelligence.hashes.sha256 && (
                      <div>
                        <Label className="text-xs text-muted-foreground">SHA256</Label>
                        <p className="font-mono text-sm break-all">{scanData.threatIntelligence.hashes.sha256}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

            </>
          )}
        </TabsContent>

        <TabsContent value="vulnerabilities" className="space-y-3">
          {vulnerabilities.length > 0 ? (
            vulnerabilities.map((vuln, index) => (
              <VulnerabilityCard key={vuln.id || `vuln-${index}-${vuln.name}-${vuln.file}-${vuln.line}`} vuln={vuln} />
            ))
          ) : (
            <div className="p-8 text-center rounded-xl border border-border">
              <p className="text-muted-foreground">
                No vulnerabilities found. Your code appears to be secure! 🎉
              </p>
            </div>
          )}
        </TabsContent>

        {/* Threat Intelligence Tab */}
        <TabsContent value="threatIntelligence" className="space-y-4">
          {(() => {
            // Check if threat intelligence data exists and has at least one scanned service
            const ti = scanData?.threatIntelligence;
            const hasScannedServices = ti && (
              ti.virusTotal?.scanned ||
              ti.malwareBazaar?.scanned ||
              ti.urlhaus?.scanned ||
              ti.hybridAnalysis?.scanned ||
              ti.abuseIPDB?.scanned ||
              ti.threatFox?.scanned ||
              ti.hashes
            );

            if (!hasScannedServices) {
              return (
                <div className="p-8 text-center rounded-xl border border-border">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-2">No threat intelligence data available</p>
                  <p className="text-sm text-muted-foreground">
                    {scanData?.type === "file" 
                      ? "Threat intelligence scanning may not have been performed for this file scan, or all services failed to scan."
                      : scanData?.type === "url"
                      ? "Threat intelligence scanning may not have been performed for this URL scan, or all services failed to scan."
                      : scanData?.type === "ip"
                      ? "Threat intelligence scanning may not have been performed for this IP scan, or all services failed to scan."
                      : "Threat intelligence scanning may not have been performed for this scan, or all services failed to scan."}
                  </p>
                </div>
              );
            }

            return (
              <>
                {/* VirusTotal */}
                {scanData.threatIntelligence.virusTotal?.scanned && (
                <Card className="glass border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      VirusTotal
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {scanData.threatIntelligence.virusTotal.found ? (
                      <>
                        <div className="flex justify-between">
                          <span>Detection Rate</span>
                          <Badge variant={scanData.threatIntelligence.virusTotal.positives && scanData.threatIntelligence.virusTotal.positives > 5 ? "destructive" : "default"}>
                            {scanData.threatIntelligence.virusTotal.positives}/{scanData.threatIntelligence.virusTotal.total} ({scanData.threatIntelligence.virusTotal.detectionRate}%)
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Status</span>
                          <Badge variant={scanData.threatIntelligence.virusTotal.status === "malicious" ? "destructive" : "secondary"}>
                            {scanData.threatIntelligence.virusTotal.status}
                          </Badge>
                        </div>
                        {scanData.threatIntelligence.virusTotal.typeDescription && (
                          <div className="flex justify-between">
                            <span>File Type</span>
                            <span className="text-sm">{scanData.threatIntelligence.virusTotal.typeDescription}</span>
                          </div>
                        )}
                        {scanData.threatIntelligence.virusTotal.meaningfulName && (
                          <div>
                            <Label className="text-xs text-muted-foreground">File Name</Label>
                            <p className="text-sm font-mono truncate">{scanData.threatIntelligence.virusTotal.meaningfulName}</p>
                          </div>
                        )}
                        {scanData.threatIntelligence.virusTotal.tags && scanData.threatIntelligence.virusTotal.tags.length > 0 && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Threat Categories</Label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {scanData.threatIntelligence.virusTotal.tags.map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {scanData.threatIntelligence.virusTotal.permalink && (
                          <div>
                            <a href={scanData.threatIntelligence.virusTotal.permalink} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                              View on VirusTotal →
                            </a>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Hash not found in VirusTotal database</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* MalwareBazaar */}
              {scanData.threatIntelligence.malwareBazaar?.scanned && (
                <Card className="glass border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      MalwareBazaar
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {scanData.threatIntelligence.malwareBazaar.found ? (
                      <>
                        {scanData.threatIntelligence.malwareBazaar.signature && (
                          <div className="flex justify-between">
                            <span>Signature</span>
                            <span className="text-sm font-medium">{scanData.threatIntelligence.malwareBazaar.signature}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>File Type</span>
                          <Badge variant="destructive">{scanData.threatIntelligence.malwareBazaar.fileType || scanData.threatIntelligence.malwareBazaar.malwareType || "Unknown"}</Badge>
                        </div>
                        {scanData.threatIntelligence.malwareBazaar.fileTypeMime && (
                          <div className="flex justify-between">
                            <span>MIME Type</span>
                            <span className="text-sm font-mono">{scanData.threatIntelligence.malwareBazaar.fileTypeMime}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Malware Family</span>
                          <span className="text-sm">{scanData.threatIntelligence.malwareBazaar.malwareFamily || "Unknown"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Threat Level</span>
                          <Badge variant={scanData.threatIntelligence.malwareBazaar.threatLevel === "critical" ? "destructive" : "default"}>
                            {scanData.threatIntelligence.malwareBazaar.threatLevel}
                          </Badge>
                        </div>
                        {scanData.threatIntelligence.malwareBazaar.tags && scanData.threatIntelligence.malwareBazaar.tags.length > 0 && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Tags</Label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {scanData.threatIntelligence.malwareBazaar.tags.map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {scanData.threatIntelligence.malwareBazaar.permalink && (
                          <div>
                            <a href={scanData.threatIntelligence.malwareBazaar.permalink} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                              View on MalwareBazaar →
                            </a>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Hash not found in MalwareBazaar database</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* URLhaus */}
              {scanData.threatIntelligence.urlhaus?.scanned && (
                <Card className="glass border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      URLhaus
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {scanData.threatIntelligence.urlhaus.found ? (
                      <>
                        <div className="flex justify-between">
                          <span>Status</span>
                          <Badge variant={scanData.threatIntelligence.urlhaus.status === "malicious" ? "destructive" : "secondary"}>
                            {scanData.threatIntelligence.urlhaus.status}
                          </Badge>
                        </div>
                        {scanData.threatIntelligence.urlhaus.threat && (
                          <div className="flex justify-between">
                            <span>Threat</span>
                            <span className="text-sm">{scanData.threatIntelligence.urlhaus.threat}</span>
                          </div>
                        )}
                        {scanData.threatIntelligence.urlhaus.permalink && (
                          <div>
                            <a href={scanData.threatIntelligence.urlhaus.permalink} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                              View on URLhaus →
                            </a>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">URL not found in URLhaus database</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Hybrid Analysis */}
              {scanData.threatIntelligence.hybridAnalysis?.scanned && (
                <Card className="glass border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Hybrid Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {scanData.threatIntelligence.hybridAnalysis.found || scanData.threatIntelligence.hybridAnalysis.verdict ? (
                      <>
                        {scanData.threatIntelligence.hybridAnalysis.threatScore !== undefined && (
                          <div className="flex justify-between">
                            <span>Threat Score</span>
                            <Badge variant={scanData.threatIntelligence.hybridAnalysis.threatScore && scanData.threatIntelligence.hybridAnalysis.threatScore >= 80 ? "destructive" : "default"}>
                              {scanData.threatIntelligence.hybridAnalysis.threatScore || 0}/100
                            </Badge>
                          </div>
                        )}
                        {scanData.threatIntelligence.hybridAnalysis.verdict && (
                          <div className="flex justify-between">
                            <span>Verdict</span>
                            <Badge variant={scanData.threatIntelligence.hybridAnalysis.verdict === "malicious" ? "destructive" : scanData.threatIntelligence.hybridAnalysis.verdict === "suspicious" ? "default" : "secondary"}>
                              {scanData.threatIntelligence.hybridAnalysis.verdict}
                            </Badge>
                          </div>
                        )}
                        {scanData.threatIntelligence.hybridAnalysis.malwareFamily && scanData.threatIntelligence.hybridAnalysis.malwareFamily !== "Unknown" && (
                          <div className="flex justify-between">
                            <span>Malware Family</span>
                            <span className="text-sm">{scanData.threatIntelligence.hybridAnalysis.malwareFamily}</span>
                          </div>
                        )}
                        {scanData.threatIntelligence.hybridAnalysis.permalink && (
                          <div>
                            <a href={scanData.threatIntelligence.hybridAnalysis.permalink} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                              View on Hybrid Analysis →
                            </a>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Not found in Hybrid Analysis database</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* AbuseIPDB */}
              {scanData.threatIntelligence.abuseIPDB?.scanned && (
                <Card className="glass border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      AbuseIPDB
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {scanData.threatIntelligence.abuseIPDB.ip && (
                      <div>
                        <Label className="text-xs text-muted-foreground">IP Address</Label>
                        <p className="font-mono text-sm">{scanData.threatIntelligence.abuseIPDB.ip}</p>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Abuse Confidence</span>
                      <Badge variant={scanData.threatIntelligence.abuseIPDB.abuseConfidence && scanData.threatIntelligence.abuseIPDB.abuseConfidence >= 75 ? "destructive" : "secondary"}>
                        {scanData.threatIntelligence.abuseIPDB.abuseConfidence}%
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Status</span>
                      <Badge variant={scanData.threatIntelligence.abuseIPDB.status === "malicious" ? "destructive" : "secondary"}>
                        {scanData.threatIntelligence.abuseIPDB.status}
                      </Badge>
                    </div>
                    {scanData.threatIntelligence.abuseIPDB.totalReports !== undefined && (
                      <div className="flex justify-between">
                        <span>Total Reports</span>
                        <span className="text-sm font-medium">{scanData.threatIntelligence.abuseIPDB.totalReports}</span>
                      </div>
                    )}
                    {scanData.threatIntelligence.abuseIPDB.isp && (
                      <div>
                        <Label className="text-xs text-muted-foreground">ISP</Label>
                        <p className="text-sm">{scanData.threatIntelligence.abuseIPDB.isp}</p>
                      </div>
                    )}
                    {scanData.threatIntelligence.abuseIPDB.countryCode && (
                      <div className="flex justify-between">
                        <span>Country</span>
                        <span className="text-sm">{scanData.threatIntelligence.abuseIPDB.countryCode}</span>
                      </div>
                    )}
                    {scanData.threatIntelligence.abuseIPDB.usageType && (
                      <div className="flex justify-between">
                        <span>Usage Type</span>
                        <span className="text-sm">{scanData.threatIntelligence.abuseIPDB.usageType}</span>
                      </div>
                    )}
                    {scanData.threatIntelligence.abuseIPDB.isWhitelisted !== undefined && (
                      <div className="flex justify-between">
                        <span>Whitelisted</span>
                        <Badge variant={scanData.threatIntelligence.abuseIPDB.isWhitelisted ? "default" : "secondary"}>
                          {scanData.threatIntelligence.abuseIPDB.isWhitelisted ? "Yes" : "No"}
                        </Badge>
                      </div>
                    )}
                    {scanData.threatIntelligence.abuseIPDB.permalink && (
                      <div>
                        <a href={scanData.threatIntelligence.abuseIPDB.permalink} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                          View on AbuseIPDB →
                        </a>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* ThreatFox */}
              {scanData.threatIntelligence.threatFox?.scanned && (
                <Card className="glass border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      ThreatFox
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {scanData.threatIntelligence.threatFox.found ? (
                      <>
                        {scanData.threatIntelligence.threatFox.ioc && (
                          <div>
                            <Label className="text-xs text-muted-foreground">IOC</Label>
                            <p className="font-mono text-sm break-all">{scanData.threatIntelligence.threatFox.ioc}</p>
                          </div>
                        )}
                        {scanData.threatIntelligence.threatFox.iocType && (
                          <div className="flex justify-between">
                            <span>IOC Type</span>
                            <span className="text-sm">{scanData.threatIntelligence.threatFox.iocType}</span>
                          </div>
                        )}
                        {scanData.threatIntelligence.threatFox.threatType && (
                          <div className="flex justify-between">
                            <span>Threat Type</span>
                            <span className="text-sm">{scanData.threatIntelligence.threatFox.threatType}</span>
                          </div>
                        )}
                        {scanData.threatIntelligence.threatFox.malwareFamily && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Malware Family</Label>
                            <p className="text-sm font-medium">{scanData.threatIntelligence.threatFox.malwareFamily}</p>
                          </div>
                        )}
                        {scanData.threatIntelligence.threatFox.confidenceLevel !== undefined && (
                          <div className="flex justify-between">
                            <span>Confidence Level</span>
                            <Badge variant={scanData.threatIntelligence.threatFox.confidenceLevel >= 90 ? "destructive" : "default"}>
                              {scanData.threatIntelligence.threatFox.confidenceLevel}%
                            </Badge>
                          </div>
                        )}
                        {scanData.threatIntelligence.threatFox.firstSeen && (
                          <div className="flex justify-between">
                            <span>First Seen</span>
                            <span className="text-sm">{new Date(scanData.threatIntelligence.threatFox.firstSeen).toLocaleDateString()}</span>
                          </div>
                        )}
                        {scanData.threatIntelligence.threatFox.lastSeen && (
                          <div className="flex justify-between">
                            <span>Last Seen</span>
                            <span className="text-sm">{new Date(scanData.threatIntelligence.threatFox.lastSeen).toLocaleDateString()}</span>
                          </div>
                        )}
                        {scanData.threatIntelligence.threatFox.tags && scanData.threatIntelligence.threatFox.tags.length > 0 && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Tags</Label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {scanData.threatIntelligence.threatFox.tags.map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {scanData.threatIntelligence.threatFox.permalink && (
                          <div>
                            <a href={scanData.threatIntelligence.threatFox.permalink} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                              View on ThreatFox →
                            </a>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">IOC not found in ThreatFox database</p>
                    )}
                  </CardContent>
                </Card>
              )}

                {/* File Hashes - Show even if no services scanned */}
                {scanData.threatIntelligence.hashes && (
                  <Card className="glass border-border/50">
                    <CardHeader>
                      <CardTitle className="text-base">File Hashes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {scanData.threatIntelligence.hashes.md5 && (
                        <div>
                          <Label className="text-xs text-muted-foreground">MD5</Label>
                          <p className="font-mono text-sm break-all">{scanData.threatIntelligence.hashes.md5}</p>
                        </div>
                      )}
                      {scanData.threatIntelligence.hashes.sha1 && (
                        <div>
                          <Label className="text-xs text-muted-foreground">SHA1</Label>
                          <p className="font-mono text-sm break-all">{scanData.threatIntelligence.hashes.sha1}</p>
                        </div>
                      )}
                      {scanData.threatIntelligence.hashes.sha256 && (
                        <div>
                          <Label className="text-xs text-muted-foreground">SHA256</Label>
                          <p className="font-mono text-sm break-all">{scanData.threatIntelligence.hashes.sha256}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

              {/* AI Threat Intelligence Insights */}
              {scanData?.threatIntelligenceInsights && (
                <Card className="glass border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      AI Threat Intelligence Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div 
                      className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: formatAIInsights(scanData.threatIntelligenceInsights) }}
                    />
                  </CardContent>
                </Card>
              )}
              </>
            );
          })()}
        </TabsContent>

        {/* AI Security Insights Tab */}
        <TabsContent value="aiInsights" className="space-y-4">
          {aiInsights ? (
            <Card className="glass border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  AI Security Insights
                </CardTitle>
                <CardDescription>
                  Comprehensive AI-powered security analysis and recommendations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: formatAIInsights(aiInsights) }}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="p-8 text-center rounded-xl border border-border">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                No AI security insights available for this scan
              </p>
            </div>
          )}
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          {scanData?.overallSecurity?.recommendations && scanData.overallSecurity.recommendations.length > 0 ? (
            <Card className="glass border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Security Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {scanData.overallSecurity.recommendations.map((rec, index) => (
                    <RecommendationCard key={index} rec={rec} index={index} />
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : (
            <div className="p-8 text-center rounded-xl border border-border">
              <p className="text-muted-foreground">No recommendations available</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="chat">
          <Card className="rounded-2xl glass border-border">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Ask About Scan Results</h3>
              </div>
              {chatMessages.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleDownloadChat}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Chat
                </Button>
              )}
            </div>

            <ScrollArea className="h-[500px] p-4" ref={scrollAreaRef}>
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground mb-2">Start a conversation about your scan results</p>
                  <p className="text-sm text-muted-foreground">
                    Ask questions about vulnerabilities, get explanations, or request help with remediation
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {chatMessages.map((message, index) => {
                    const isUser = message.role === "user";
                    const isEditing = editingMessageId === message.id;
                    const parts = processMessageContent(message.content);
                    const isLastMessage = index === chatMessages.length - 1;
                    const isStreaming = isChatLoading && isLastMessage && !isUser;

                    return (
                      <div
                        key={message.id || index}
                        className={cn(
                          "flex gap-4 p-4 rounded-lg transition-all group",
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
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium text-muted-foreground">
                              {isUser ? "You" : "IntelliShieldX AI"}
                            </div>
                            {isUser && message.id && !isChatLoading && (
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2"
                                  onClick={() => handleEditMessage(message.id!, message.content)}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                            {isStreaming && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2"
                                onClick={handleCancelStreaming}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          {isEditing ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editingContent}
                                onChange={(e) => setEditingContent(e.target.value)}
                                className="min-h-[80px]"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && e.ctrlKey) {
                                    e.preventDefault();
                                    handleSaveEdit();
                                  }
                                  if (e.key === "Escape") {
                                    handleCancelEdit();
                                  }
                                }}
                              />
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  onClick={handleSaveEdit}
                                  disabled={!editingContent.trim()}
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Save & Resend
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleCancelEdit}
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  Cancel
                                </Button>
                                <span className="text-xs text-muted-foreground">
                                  Ctrl+Enter to save
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="prose prose-invert max-w-none">
                              {parts.map((part, partIndex) => {
                                if (part.type === "code") {
                                  return (
                                    <div key={`part-${message.id || index}-${partIndex}`} className="my-2 rounded-lg overflow-hidden">
                                      <SyntaxHighlighter
                                        language={part.language}
                                        style={vscDarkPlus}
                                        customStyle={{
                                          margin: 0,
                                          borderRadius: "0.5rem",
                                          fontSize: "0.875rem",
                                        }}
                                      >
                                        {part.content}
                                      </SyntaxHighlighter>
                                    </div>
                                  );
                                }
                                return (
                                  <div
                                    key={`part-${message.id || index}-${partIndex}`}
                                    className="whitespace-pre-wrap break-words"
                                    dangerouslySetInnerHTML={{
                                      __html: part.content
                                        .replace(/\n/g, "<br />")
                                        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                                        .replace(/\*(.*?)\*/g, "<em>$1</em>")
                                        .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>'),
                                    }}
                                  />
                                );
                              })}
                              {isStreaming && (
                                <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
                              )}
                            </div>
                          )}
      </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            <div className="border-t border-border bg-card/50 p-4">
              <div className="flex gap-2 items-end max-w-4xl mx-auto">
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
                    placeholder="Ask about vulnerabilities, get explanations, or request help with remediation..."
                    disabled={isChatLoading}
                    className="min-h-[60px] max-h-[200px] resize-none pr-12"
                    rows={1}
                  />
                  <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                    Press Enter to send, Shift+Enter for new line
                  </div>
                </div>
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    handleChatSend();
                  }}
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
    </div>
  );
}
