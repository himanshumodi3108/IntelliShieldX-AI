import jsPDF from "jspdf";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

export const generateChatPDF = (
  messages: ChatMessage[],
  conversationTitle?: string
): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Helper function to add a new page if needed
  const checkNewPage = (requiredHeight: number) => {
    if (yPosition + requiredHeight > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Helper function to split text into lines that fit the page width
  const splitText = (text: string, maxWidth: number, fontSize: number): string[] => {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    doc.setFontSize(fontSize);
    const textWidth = doc.getTextWidth("W"); // Approximate character width

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = doc.getTextWidth(testLine);

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    return lines;
  };

  // Header
  doc.setFillColor(29, 78, 137); // Dark blue background
  doc.rect(0, 0, pageWidth, 40, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("IntelliShieldX AI Chat", margin, 25);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 35);

  yPosition = 50;

  // Title
  if (conversationTitle) {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    const titleLines = splitText(conversationTitle, maxWidth, 16);
    titleLines.forEach((line) => {
      checkNewPage(10);
      doc.text(line, margin, yPosition);
      yPosition += 7;
    });
    yPosition += 5;
  }

  // Messages
  messages.forEach((message, index) => {
    const isUser = message.role === "user";
    
    // Add spacing between messages
    if (index > 0) {
      yPosition += 5;
    }

    // Role label
    checkNewPage(15);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    if (isUser) {
      doc.setTextColor(0, 102, 204);
    } else {
      doc.setTextColor(128, 0, 128);
    }
    doc.text(isUser ? "You" : "IntelliShieldX AI", margin, yPosition);
    yPosition += 7;

    // Message content
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);

    // Process content - handle code blocks and formatting
    let content = message.content;
    
    // Extract code blocks
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

    // Render parts
    parts.forEach((part) => {
      if (part.type === "code") {
        // Code block
        checkNewPage(20);
        doc.setFont("courier", "normal");
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        
        // Background for code block
        const codeStartY = yPosition - 3;
        const codeLines = splitText(part.content, maxWidth - 10, 9);
        const codeHeight = codeLines.length * 5 + 4;
        
        checkNewPage(codeHeight);
        doc.setFillColor(240, 240, 240);
        doc.roundedRect(margin, codeStartY - 3, maxWidth, codeHeight, 2, 2, "F");
        
        doc.setTextColor(0, 0, 0);
        codeLines.forEach((line) => {
          checkNewPage(6);
          doc.text(line, margin + 5, yPosition);
          yPosition += 5;
        });
        yPosition += 3;
        doc.setFont("helvetica", "normal");
      } else {
        // Regular text
        const text = part.content
          .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold markdown
          .replace(/\*(.*?)\*/g, "$1") // Remove italic markdown
          .replace(/`(.*?)`/g, "$1"); // Remove inline code markdown

        const textLines = splitText(text, maxWidth, 10);
        textLines.forEach((line) => {
          checkNewPage(6);
          doc.text(line, margin, yPosition);
          yPosition += 5;
        });
      }
    });

    // Timestamp if available
    if (message.timestamp) {
      yPosition += 2;
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        new Date(message.timestamp).toLocaleString(),
        margin,
        yPosition
      );
      yPosition += 5;
    }
  });

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
    doc.text(
      "IntelliShieldX - AI Security Analysis Platform",
      pageWidth / 2,
      pageHeight - 5,
      { align: "center" }
    );
  }

  // Generate filename
  const timestamp = new Date().toISOString().split("T")[0];
  const filename = conversationTitle
    ? `IntelliShieldX-Chat-${conversationTitle.substring(0, 30)}-${timestamp}.pdf`
    : `IntelliShieldX-Chat-${timestamp}.pdf`;

  // Save PDF
  doc.save(filename);
};

export interface Vulnerability {
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
  owaspTop10?: string;
  complianceImpact?: string;
}

export interface ThreatIntelligence {
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
    tags?: string[];
  };
  urlhaus?: {
    scanned: boolean;
    found?: boolean;
    status?: "malicious" | "suspicious" | "clean" | "unknown";
    threat?: string;
  };
  hybridAnalysis?: {
    scanned: boolean;
    found?: boolean;
    threatScore?: number;
    verdict?: string;
    malwareFamily?: string;
  };
  abuseIPDB?: {
    scanned: boolean;
    abuseConfidence?: number;
    status?: "malicious" | "suspicious" | "clean" | "unknown";
  };
  threatFox?: {
    scanned: boolean;
    found?: boolean;
  };
}

export interface OverallSecurity {
  status: "critical" | "high" | "medium" | "low" | "safe";
  score: number;
  summary: string;
  recommendations?: Array<string | {
    title: string;
    type?: string;
    severity?: string;
    symptoms?: string[];
    removalSteps?: string[];
    prevention?: string[];
    description?: string;
    impact?: string;
    malwareFamily?: string;
    [key: string]: any;
  }>;
}

export interface ScanReportData {
  scanId?: string;
  target?: string;
  type?: string;
  vulnerabilities: Vulnerability[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    owaspTop10?: number;
  };
  aiInsights?: string;
  threatIntelligenceInsights?: string;
  scanDuration?: number;
  filesAnalyzed?: number;
  createdAt?: string | Date;
  threatIntelligence?: ThreatIntelligence;
  overallSecurity?: OverallSecurity;
}

export interface DocumentationReportData {
  repositoryName?: string;
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
  generatedBy?: string;
  modelName?: string;
  provider?: string;
}

export const generateDocumentationPDF = (docData: DocumentationReportData): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Helper function to add a new page if needed
  const checkNewPage = (requiredHeight: number) => {
    if (yPosition + requiredHeight > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Helper function to split text into lines
  const splitText = (text: string, maxWidth: number, fontSize: number): string[] => {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    doc.setFontSize(fontSize);
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = doc.getTextWidth(testLine);

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    return lines;
  };

  // Header
  doc.setFillColor(29, 78, 137);
  doc.rect(0, 0, pageWidth, 40, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("IntelliShieldX Documentation", margin, 25);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${docData.generatedAt ? new Date(docData.generatedAt).toLocaleString() : new Date().toLocaleString()}`, margin, 35);

  yPosition = 50;

  // Repository Name
  if (docData.repositoryName) {
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    const titleLines = splitText(docData.repositoryName, maxWidth, 16);
    titleLines.forEach((line) => {
      checkNewPage(10);
      doc.text(line, margin, yPosition);
      yPosition += 7;
    });
    yPosition += 5;
  }

  // Model Info
  if (docData.generatedBy || docData.modelName || docData.provider) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    let modelInfo = "Generated by: ";
    if (docData.modelName) modelInfo += docData.modelName;
    if (docData.provider) modelInfo += ` (${docData.provider})`;
    checkNewPage(8);
    doc.text(modelInfo, margin, yPosition);
    yPosition += 8;
  }

  // Overview
  if (docData.overview) {
    checkNewPage(15);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Overview", margin, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const overviewLines = splitText(docData.overview, maxWidth, 10);
    overviewLines.forEach((line) => {
      checkNewPage(6);
      doc.text(line, margin, yPosition);
      yPosition += 5;
    });
    yPosition += 5;
  }

  // File Structure
  if (docData.fileStructure) {
    checkNewPage(15);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("File Structure", margin, yPosition);
    yPosition += 8;

    doc.setFontSize(9);
    doc.setFont("courier", "normal");
    const structureLines = docData.fileStructure.split("\n");
    structureLines.forEach((line) => {
      checkNewPage(5);
      doc.text(line.substring(0, 80), margin, yPosition);
      yPosition += 5;
    });
    yPosition += 5;
  }

  // Detailed Explanations
  if (docData.detailedExplanations) {
    checkNewPage(15);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Detailed Function Explanations", margin, yPosition);
    yPosition += 8;

    doc.setFontSize(9);
    doc.setFont("courier", "normal");
    const explanationLines = docData.detailedExplanations.split("\n");
    explanationLines.forEach((line) => {
      checkNewPage(5);
      doc.text(line.substring(0, 80), margin, yPosition);
      yPosition += 5;
    });
    yPosition += 5;
  }

  // Code Flow Analysis
  if (docData.codeFlowAnalysis) {
    checkNewPage(15);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Code Flow Analysis", margin, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const flowLines = splitText(docData.codeFlowAnalysis, maxWidth, 10);
    flowLines.forEach((line) => {
      checkNewPage(6);
      doc.text(line, margin, yPosition);
      yPosition += 5;
    });
    yPosition += 5;
  }

  // Architecture Description
  if (docData.architectureDescription) {
    checkNewPage(15);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Architecture Description", margin, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const archLines = splitText(docData.architectureDescription, maxWidth, 10);
    archLines.forEach((line) => {
      checkNewPage(6);
      doc.text(line, margin, yPosition);
      yPosition += 5;
    });
    yPosition += 5;
  }

  // API Endpoints
  if (docData.apiEndpoints && docData.apiEndpoints.length > 0) {
    checkNewPage(15);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`API Endpoints (${docData.apiEndpoints.length})`, margin, yPosition);
    yPosition += 8;

    docData.apiEndpoints.forEach((endpoint, idx) => {
      checkNewPage(20);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`${endpoint.method} ${endpoint.path}`, margin, yPosition);
      yPosition += 6;

      if (endpoint.description) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        const descLines = splitText(endpoint.description, maxWidth, 9);
        descLines.forEach((line) => {
          checkNewPage(5);
          doc.text(line, margin + 5, yPosition);
          yPosition += 4;
        });
      }

      if (endpoint.parameters && endpoint.parameters.length > 0) {
        checkNewPage(10);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("Parameters:", margin + 5, yPosition);
        yPosition += 5;
        endpoint.parameters.slice(0, 5).forEach((param) => {
          checkNewPage(5);
          doc.setFont("helvetica", "normal");
          doc.text(`  • ${param.name} (${param.type})${param.required ? " *" : ""}`, margin + 10, yPosition);
          yPosition += 4;
        });
      }

      yPosition += 3;
      if (idx < docData.apiEndpoints.length - 1) {
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 5;
      }
    });
    yPosition += 5;
  }

  // Schemas
  if (docData.schemas && docData.schemas.length > 0) {
    checkNewPage(15);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Schemas (${docData.schemas.length})`, margin, yPosition);
    yPosition += 8;

    docData.schemas.forEach((schema, idx) => {
      checkNewPage(15);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`${schema.name} (${schema.type})`, margin, yPosition);
      yPosition += 6;

      if (schema.description) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        const descLines = splitText(schema.description, maxWidth, 9);
        descLines.forEach((line) => {
          checkNewPage(5);
          doc.text(line, margin + 5, yPosition);
          yPosition += 4;
        });
      }

      if (schema.properties && schema.properties.length > 0) {
        checkNewPage(10);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("Properties:", margin + 5, yPosition);
        yPosition += 5;
        schema.properties.slice(0, 5).forEach((prop) => {
          checkNewPage(5);
          doc.setFont("helvetica", "normal");
          doc.text(`  • ${prop.name} (${prop.type})${prop.required ? " *" : ""}`, margin + 10, yPosition);
          yPosition += 4;
        });
      }

      yPosition += 3;
      if (idx < docData.schemas.length - 1) {
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 5;
      }
    });
    yPosition += 5;
  }

  // Dependencies
  if (docData.dependencies && docData.dependencies.length > 0) {
    checkNewPage(15);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Dependencies (${docData.dependencies.length})`, margin, yPosition);
    yPosition += 8;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    docData.dependencies.forEach((dep) => {
      checkNewPage(5);
      let depText = dep.name;
      if (dep.version) depText += ` (${dep.version})`;
      if (dep.type) depText += ` [${dep.type}]`;
      doc.text(depText, margin, yPosition);
      yPosition += 5;
    });
  }

  // Save PDF
  const fileName = `documentation-${docData.repositoryName?.replace(/[^a-z0-9]/gi, "-") || "report"}-${Date.now()}.pdf`;
  doc.save(fileName);
};

export const generateScanReportPDF = (scanData: ScanReportData): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Helper function to add a new page if needed
  const checkNewPage = (requiredHeight: number) => {
    if (yPosition + requiredHeight > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Helper function to split text into lines that fit the page width
  const splitText = (text: string, maxWidth: number, fontSize: number): string[] => {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    doc.setFontSize(fontSize);
    const textWidth = doc.getTextWidth("W");

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = doc.getTextWidth(testLine);

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    return lines;
  };

  // Header
  doc.setFillColor(29, 78, 137);
  doc.rect(0, 0, pageWidth, 40, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("IntelliShieldX Security Scan Report", margin, 25);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 35);

  yPosition = 50;

  // Scan Information
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Scan Information", margin, yPosition);
  yPosition += 12;

  // Add a subtle background box for scan info
  const infoStartY = yPosition - 2;
  let infoHeight = 0;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  if (scanData.scanId) {
    doc.text(`Scan ID: ${scanData.scanId}`, margin + 3, yPosition);
    yPosition += 7;
    infoHeight += 7;
  }
  if (scanData.target) {
    const targetLines = splitText(`Target: ${scanData.target}`, maxWidth - 6, 10);
    targetLines.forEach((line) => {
      doc.text(line, margin + 3, yPosition);
      yPosition += 7;
      infoHeight += 7;
    });
  }
  if (scanData.type) {
    doc.text(`Type: ${scanData.type.charAt(0).toUpperCase() + scanData.type.slice(1)}`, margin + 3, yPosition);
    yPosition += 7;
    infoHeight += 7;
  }
  if (scanData.filesAnalyzed) {
    doc.text(`Files Analyzed: ${scanData.filesAnalyzed}`, margin + 3, yPosition);
    yPosition += 7;
    infoHeight += 7;
  }
  if (scanData.scanDuration) {
    doc.text(`Scan Duration: ${scanData.scanDuration}s`, margin + 3, yPosition);
    yPosition += 7;
    infoHeight += 7;
  }
  if (scanData.createdAt) {
    const date = typeof scanData.createdAt === "string" ? new Date(scanData.createdAt) : scanData.createdAt;
    doc.text(`Scan Date: ${date.toLocaleString()}`, margin + 3, yPosition);
    yPosition += 7;
    infoHeight += 7;
  }

  // Draw background box
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, infoStartY - 2, maxWidth, infoHeight + 4, 2, 2, "F");
  
  // Redraw text on top of background
  doc.setTextColor(0, 0, 0);
  yPosition = infoStartY;
  if (scanData.scanId) {
    doc.text(`Scan ID: ${scanData.scanId}`, margin + 3, yPosition);
    yPosition += 7;
  }
  if (scanData.target) {
    const targetLines = splitText(`Target: ${scanData.target}`, maxWidth - 6, 10);
    targetLines.forEach((line) => {
      doc.text(line, margin + 3, yPosition);
      yPosition += 7;
    });
  }
  if (scanData.type) {
    doc.text(`Type: ${scanData.type.charAt(0).toUpperCase() + scanData.type.slice(1)}`, margin + 3, yPosition);
    yPosition += 7;
  }
  if (scanData.filesAnalyzed) {
    doc.text(`Files Analyzed: ${scanData.filesAnalyzed}`, margin + 3, yPosition);
    yPosition += 7;
  }
  if (scanData.scanDuration) {
    doc.text(`Scan Duration: ${scanData.scanDuration}s`, margin + 3, yPosition);
    yPosition += 7;
  }
  if (scanData.createdAt) {
    const date = typeof scanData.createdAt === "string" ? new Date(scanData.createdAt) : scanData.createdAt;
    doc.text(`Scan Date: ${date.toLocaleString()}`, margin + 3, yPosition);
    yPosition += 7;
  }

  yPosition += 8;

  // Summary Section
  checkNewPage(40);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Vulnerability Summary", margin, yPosition);
  yPosition += 12;

  const severityColors = {
    critical: [220, 53, 69],
    high: [255, 152, 0],
    medium: [255, 193, 7],
    low: [0, 123, 255],
  };

  const severities = [
    { key: "critical", label: "Critical", count: scanData.summary.critical },
    { key: "high", label: "High", count: scanData.summary.high },
    { key: "medium", label: "Medium", count: scanData.summary.medium },
    { key: "low", label: "Low", count: scanData.summary.low },
  ];

  // Draw summary box
  const summaryStartY = yPosition;
  const summaryBoxHeight = (severities.length + (scanData.summary.owaspTop10 !== undefined ? 1 : 0)) * 8 + 4;
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(margin, summaryStartY - 2, maxWidth, summaryBoxHeight, 2, 2, "F");

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  severities.forEach((sev) => {
    checkNewPage(8);
    const color = severityColors[sev.key as keyof typeof severityColors];
    doc.setFillColor(color[0], color[1], color[2]);
    doc.circle(margin + 5, yPosition - 2, 2.5, "F");
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text(`${sev.label}:`, margin + 12, yPosition);
    doc.setFont("helvetica", "normal");
    doc.text(`${sev.count}`, margin + 50, yPosition);
    yPosition += 8;
  });

  if (scanData.summary.owaspTop10 !== undefined) {
    checkNewPage(8);
    doc.setFont("helvetica", "bold");
    doc.text(`OWASP Top 10:`, margin + 3, yPosition);
    doc.setFont("helvetica", "normal");
    doc.text(`${scanData.summary.owaspTop10}`, margin + 50, yPosition);
    yPosition += 8;
  }

  yPosition += 8;

  // AI Insights
  if (scanData.aiInsights) {
    checkNewPage(40);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("AI Security Insights", margin, yPosition);
    yPosition += 12;

    // Parse and format markdown content
    const insights = scanData.aiInsights;
    const lines = insights.split('\n');
    
    let inList = false;
    let listItems: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) {
        if (inList && listItems.length > 0) {
          // Render list
          listItems.forEach((item) => {
            checkNewPage(6);
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.text(`• ${item}`, margin + 5, yPosition);
            yPosition += 5;
          });
          listItems = [];
          inList = false;
        }
        yPosition += 3; // Extra space between paragraphs
        continue;
      }

      // Headers
      if (line.startsWith('### ')) {
        if (inList) {
          listItems.forEach((item) => {
            checkNewPage(6);
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.text(`• ${item}`, margin + 5, yPosition);
            yPosition += 5;
          });
          listItems = [];
          inList = false;
        }
        checkNewPage(10);
        yPosition += 3;
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        const headerText = line.substring(4).replace(/\*\*/g, '').replace(/\*/g, '');
        doc.text(headerText, margin, yPosition);
        yPosition += 7;
        continue;
      }
      
      if (line.startsWith('## ')) {
        if (inList) {
          listItems.forEach((item) => {
            checkNewPage(6);
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.text(`• ${item}`, margin + 5, yPosition);
            yPosition += 5;
          });
          listItems = [];
          inList = false;
        }
        checkNewPage(12);
        yPosition += 5;
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        const headerText = line.substring(3).replace(/\*\*/g, '').replace(/\*/g, '');
        doc.text(headerText, margin, yPosition);
        yPosition += 8;
        continue;
      }
      
      if (line.startsWith('# ')) {
        if (inList) {
          listItems.forEach((item) => {
            checkNewPage(6);
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.text(`• ${item}`, margin + 5, yPosition);
            yPosition += 5;
          });
          listItems = [];
          inList = false;
        }
        checkNewPage(14);
        yPosition += 5;
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        const headerText = line.substring(2).replace(/\*\*/g, '').replace(/\*/g, '');
        doc.text(headerText, margin, yPosition);
        yPosition += 9;
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
          .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold
          .replace(/\*(.*?)\*/g, "$1") // Remove italic
          .replace(/`(.*?)`/g, "$1"); // Remove inline code
        listItems.push(itemText);
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
          .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold
          .replace(/\*(.*?)\*/g, "$1") // Remove italic
          .replace(/`(.*?)`/g, "$1"); // Remove inline code
        listItems.push(itemText);
        continue;
      }

      // Regular paragraph
      if (inList) {
        // Render accumulated list items
        listItems.forEach((item) => {
          checkNewPage(6);
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.text(`• ${item}`, margin + 5, yPosition);
          yPosition += 5;
        });
        listItems = [];
        inList = false;
        yPosition += 2;
      }

      // Clean up formatting
      const cleanLine = line
        .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold
        .replace(/\*(.*?)\*/g, "$1") // Remove italic
        .replace(/`(.*?)`/g, "$1") // Remove inline code
        .replace(/```[\s\S]*?```/g, ""); // Remove code blocks

      if (cleanLine.trim()) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const textLines = splitText(cleanLine, maxWidth, 10);
        textLines.forEach((textLine) => {
          checkNewPage(6);
          doc.text(textLine, margin, yPosition);
          yPosition += 5;
        });
        yPosition += 2; // Space after paragraph
      }
    }

    // Render any remaining list items
    if (inList && listItems.length > 0) {
      listItems.forEach((item) => {
        checkNewPage(6);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`• ${item}`, margin + 5, yPosition);
        yPosition += 5;
      });
    }

    yPosition += 5;
  }

  // Overall Security Assessment
  if (scanData.overallSecurity) {
    checkNewPage(30);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Overall Security Assessment", margin, yPosition);
    yPosition += 12;

    const securityBoxStartY = yPosition;
    let securityBoxHeight = 0;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    // Security Score
    doc.setFont("helvetica", "bold");
    doc.text("Security Score:", margin + 3, yPosition);
    doc.setFont("helvetica", "normal");
    doc.text(`${scanData.overallSecurity.score}/100`, margin + 60, yPosition);
    yPosition += 7;
    securityBoxHeight += 7;

    // Status
    doc.setFont("helvetica", "bold");
    doc.text("Status:", margin + 3, yPosition);
    doc.setFont("helvetica", "normal");
    doc.text(scanData.overallSecurity.status.toUpperCase(), margin + 60, yPosition);
    yPosition += 7;
    securityBoxHeight += 7;

    // Summary
    if (scanData.overallSecurity.summary) {
      doc.setFont("helvetica", "bold");
      doc.text("Summary:", margin + 3, yPosition);
      yPosition += 7;
      securityBoxHeight += 7;
      doc.setFont("helvetica", "normal");
      const summaryLines = splitText(scanData.overallSecurity.summary, maxWidth - 6, 10);
      summaryLines.forEach((line) => {
        checkNewPage(6);
        doc.text(line, margin + 3, yPosition);
        yPosition += 6;
        securityBoxHeight += 6;
      });
    }

    // Draw background box
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(margin, securityBoxStartY - 2, maxWidth, securityBoxHeight + 4, 2, 2, "F");
    
    // Redraw text
    doc.setTextColor(0, 0, 0);
    yPosition = securityBoxStartY;
    doc.setFont("helvetica", "bold");
    doc.text("Security Score:", margin + 3, yPosition);
    doc.setFont("helvetica", "normal");
    doc.text(`${scanData.overallSecurity.score}/100`, margin + 60, yPosition);
    yPosition += 7;
    doc.setFont("helvetica", "bold");
    doc.text("Status:", margin + 3, yPosition);
    doc.setFont("helvetica", "normal");
    doc.text(scanData.overallSecurity.status.toUpperCase(), margin + 60, yPosition);
    yPosition += 7;
    if (scanData.overallSecurity.summary) {
      doc.setFont("helvetica", "bold");
      doc.text("Summary:", margin + 3, yPosition);
      yPosition += 7;
      doc.setFont("helvetica", "normal");
      const summaryLines = splitText(scanData.overallSecurity.summary, maxWidth - 6, 10);
      summaryLines.forEach((line) => {
        doc.text(line, margin + 3, yPosition);
        yPosition += 6;
      });
    }

    yPosition += 8;
  }

  // Threat Intelligence Section
  if (scanData.threatIntelligence) {
    checkNewPage(40);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Threat Intelligence Results", margin, yPosition);
    yPosition += 12;

    const ti = scanData.threatIntelligence;

    // File Hashes
    if (ti.hashes) {
      checkNewPage(30);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("File Hashes", margin, yPosition);
      yPosition += 8;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      if (ti.hashes.md5) {
        doc.text(`MD5: ${ti.hashes.md5}`, margin + 3, yPosition);
        yPosition += 6;
      }
      if (ti.hashes.sha1) {
        doc.text(`SHA1: ${ti.hashes.sha1}`, margin + 3, yPosition);
        yPosition += 6;
      }
      if (ti.hashes.sha256) {
        doc.text(`SHA256: ${ti.hashes.sha256}`, margin + 3, yPosition);
        yPosition += 6;
      }
      yPosition += 5;
    }

    // VirusTotal
    if (ti.virusTotal?.scanned) {
      checkNewPage(40);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("VirusTotal", margin, yPosition);
      yPosition += 8;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      if (ti.virusTotal.found) {
        doc.text(`Detection Rate: ${ti.virusTotal.positives}/${ti.virusTotal.total} (${ti.virusTotal.detectionRate}%)`, margin + 3, yPosition);
        yPosition += 6;
        doc.text(`Status: ${ti.virusTotal.status || "Unknown"}`, margin + 3, yPosition);
        yPosition += 6;
        if (ti.virusTotal.typeDescription) {
          doc.text(`File Type: ${ti.virusTotal.typeDescription}`, margin + 3, yPosition);
          yPosition += 6;
        }
        if (ti.virusTotal.meaningfulName) {
          const nameLines = splitText(`File Name: ${ti.virusTotal.meaningfulName}`, maxWidth - 6, 9);
          nameLines.forEach((line) => {
            doc.text(line, margin + 3, yPosition);
            yPosition += 5;
          });
        }
        if (ti.virusTotal.tags && ti.virusTotal.tags.length > 0) {
          doc.text(`Threat Categories: ${ti.virusTotal.tags.join(", ")}`, margin + 3, yPosition);
          yPosition += 6;
        }
      } else {
        doc.text("Hash not found in VirusTotal database", margin + 3, yPosition);
        yPosition += 6;
      }
      yPosition += 5;
    }

    // MalwareBazaar
    if (ti.malwareBazaar?.scanned && ti.malwareBazaar.found) {
      checkNewPage(40);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("MalwareBazaar", margin, yPosition);
      yPosition += 8;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      if (ti.malwareBazaar.signature) {
        doc.text(`Signature: ${ti.malwareBazaar.signature}`, margin + 3, yPosition);
        yPosition += 6;
      }
      doc.text(`File Type: ${ti.malwareBazaar.fileType || ti.malwareBazaar.malwareType || "Unknown"}`, margin + 3, yPosition);
      yPosition += 6;
      if (ti.malwareBazaar.fileTypeMime) {
        doc.text(`MIME Type: ${ti.malwareBazaar.fileTypeMime}`, margin + 3, yPosition);
        yPosition += 6;
      }
      doc.text(`Malware Family: ${ti.malwareBazaar.malwareFamily || "Unknown"}`, margin + 3, yPosition);
      yPosition += 6;
      doc.text(`Threat Level: ${ti.malwareBazaar.threatLevel || "Unknown"}`, margin + 3, yPosition);
      yPosition += 6;
      if (ti.malwareBazaar.tags && ti.malwareBazaar.tags.length > 0) {
        doc.text(`Tags: ${ti.malwareBazaar.tags.join(", ")}`, margin + 3, yPosition);
        yPosition += 6;
      }
      yPosition += 5;
    }

    // URLhaus
    if (ti.urlhaus?.scanned && ti.urlhaus.found) {
      checkNewPage(20);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("URLhaus", margin, yPosition);
      yPosition += 8;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Status: ${ti.urlhaus.status || "Unknown"}`, margin + 3, yPosition);
      yPosition += 6;
      if (ti.urlhaus.threat) {
        doc.text(`Threat: ${ti.urlhaus.threat}`, margin + 3, yPosition);
        yPosition += 6;
      }
      yPosition += 5;
    }

    // Hybrid Analysis
    if (ti.hybridAnalysis?.scanned && (ti.hybridAnalysis.found || ti.hybridAnalysis.verdict)) {
      checkNewPage(25);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Hybrid Analysis", margin, yPosition);
      yPosition += 8;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      if (ti.hybridAnalysis.threatScore !== undefined) {
        doc.text(`Threat Score: ${ti.hybridAnalysis.threatScore}/100`, margin + 3, yPosition);
        yPosition += 6;
      }
      if (ti.hybridAnalysis.verdict) {
        doc.text(`Verdict: ${ti.hybridAnalysis.verdict}`, margin + 3, yPosition);
        yPosition += 6;
      }
      if (ti.hybridAnalysis.malwareFamily && ti.hybridAnalysis.malwareFamily !== "Unknown") {
        doc.text(`Malware Family: ${ti.hybridAnalysis.malwareFamily}`, margin + 3, yPosition);
        yPosition += 6;
      }
      yPosition += 5;
    }

    // AbuseIPDB
    if (ti.abuseIPDB?.scanned) {
      checkNewPage(20);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("AbuseIPDB", margin, yPosition);
      yPosition += 8;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      if (ti.abuseIPDB.abuseConfidence !== undefined) {
        doc.text(`Abuse Confidence: ${ti.abuseIPDB.abuseConfidence}%`, margin + 3, yPosition);
        yPosition += 6;
      }
      if (ti.abuseIPDB.status) {
        doc.text(`Status: ${ti.abuseIPDB.status}`, margin + 3, yPosition);
        yPosition += 6;
      }
      yPosition += 5;
    }

    yPosition += 5;
  }

  // Threat Intelligence Insights
  if (scanData.threatIntelligenceInsights) {
    checkNewPage(40);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("AI Threat Intelligence Analysis", margin, yPosition);
    yPosition += 12;

    // Parse and format markdown content (similar to AI Insights)
    const insights = scanData.threatIntelligenceInsights;
    const lines = insights.split('\n');
    
    let inList = false;
    let listItems: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) {
        if (inList && listItems.length > 0) {
          listItems.forEach((item) => {
            checkNewPage(6);
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.text(`• ${item}`, margin + 5, yPosition);
            yPosition += 5;
          });
          listItems = [];
          inList = false;
        }
        yPosition += 3;
        continue;
      }

      // Headers
      if (line.startsWith('### ')) {
        if (inList) {
          listItems.forEach((item) => {
            checkNewPage(6);
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.text(`• ${item}`, margin + 5, yPosition);
            yPosition += 5;
          });
          listItems = [];
          inList = false;
        }
        checkNewPage(10);
        yPosition += 3;
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        const headerText = line.substring(4).replace(/\*\*/g, '').replace(/\*/g, '');
        doc.text(headerText, margin, yPosition);
        yPosition += 7;
        continue;
      }
      
      if (line.startsWith('## ')) {
        if (inList) {
          listItems.forEach((item) => {
            checkNewPage(6);
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.text(`• ${item}`, margin + 5, yPosition);
            yPosition += 5;
          });
          listItems = [];
          inList = false;
        }
        checkNewPage(12);
        yPosition += 5;
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        const headerText = line.substring(3).replace(/\*\*/g, '').replace(/\*/g, '');
        doc.text(headerText, margin, yPosition);
        yPosition += 8;
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
          .replace(/\*\*(.*?)\*\*/g, "$1")
          .replace(/\*(.*?)\*/g, "$1")
          .replace(/`(.*?)`/g, "$1");
        listItems.push(itemText);
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
          .replace(/\*\*(.*?)\*\*/g, "$1")
          .replace(/\*(.*?)\*/g, "$1")
          .replace(/`(.*?)`/g, "$1");
        listItems.push(itemText);
        continue;
      }

      // Regular paragraph
      if (inList) {
        listItems.forEach((item) => {
          checkNewPage(6);
          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.text(`• ${item}`, margin + 5, yPosition);
          yPosition += 5;
        });
        listItems = [];
        inList = false;
        yPosition += 2;
      }

      const cleanLine = line
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/`(.*?)`/g, "$1")
        .replace(/```[\s\S]*?```/g, "");

      if (cleanLine.trim()) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const textLines = splitText(cleanLine, maxWidth, 10);
        textLines.forEach((textLine) => {
          checkNewPage(6);
          doc.text(textLine, margin, yPosition);
          yPosition += 5;
        });
        yPosition += 2;
      }
    }

    // Render any remaining list items
    if (inList && listItems.length > 0) {
      listItems.forEach((item) => {
        checkNewPage(6);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`• ${item}`, margin + 5, yPosition);
        yPosition += 5;
      });
    }

    yPosition += 5;
  }

  // Recommendations
  if (scanData.overallSecurity?.recommendations && scanData.overallSecurity.recommendations.length > 0) {
    checkNewPage(40);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Security Recommendations", margin, yPosition);
    yPosition += 12;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    scanData.overallSecurity.recommendations.forEach((rec, index) => {
      const recTitle = typeof rec === 'string' ? rec : rec.title;
      const recData = typeof rec === 'string' ? null : rec;

      // Recommendation title
      checkNewPage(10);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(`${index + 1}. ${recTitle}`, margin + 3, yPosition);
      yPosition += 7;

      // Severity badge if available
      if (recData?.severity) {
        const severityColors: Record<string, [number, number, number]> = {
          critical: [220, 53, 69],
          high: [255, 152, 0],
          medium: [255, 193, 7],
          low: [0, 123, 255],
        };
        const color = severityColors[recData.severity] || [128, 128, 128];
        doc.setFillColor(color[0], color[1], color[2]);
        doc.roundedRect(margin + 3, yPosition - 4, 30, 5, 1, 1, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text(recData.severity.toUpperCase(), margin + 5, yPosition);
        doc.setTextColor(0, 0, 0);
        yPosition += 8;
      }

      // Description
      if (recData?.description) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        const descLines = splitText(recData.description, maxWidth - 6, 9);
        descLines.forEach((line) => {
          checkNewPage(5);
          doc.text(line, margin + 6, yPosition);
          yPosition += 5;
        });
        yPosition += 2;
      }

      // Symptoms
      if (recData?.symptoms && recData.symptoms.length > 0) {
        checkNewPage(15);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text("Symptoms:", margin + 6, yPosition);
        yPosition += 6;
        doc.setFont("helvetica", "normal");
        recData.symptoms.forEach((symptom) => {
          checkNewPage(5);
          doc.text(`• ${symptom}`, margin + 10, yPosition);
          yPosition += 5;
        });
        yPosition += 2;
      }

      // Impact
      if (recData?.impact) {
        checkNewPage(10);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text("Potential Impact:", margin + 6, yPosition);
        yPosition += 6;
        doc.setFont("helvetica", "normal");
        const impactLines = splitText(recData.impact, maxWidth - 6, 9);
        impactLines.forEach((line) => {
          checkNewPage(5);
          doc.text(line, margin + 10, yPosition);
          yPosition += 5;
        });
        yPosition += 2;
      }

      // Removal Steps
      if (recData?.removalSteps && recData.removalSteps.length > 0) {
        checkNewPage(15);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text("Removal Steps:", margin + 6, yPosition);
        yPosition += 6;
        doc.setFont("helvetica", "normal");
        recData.removalSteps.forEach((step, stepIdx) => {
          checkNewPage(5);
          doc.text(`${stepIdx + 1}. ${step}`, margin + 10, yPosition);
          yPosition += 5;
        });
        yPosition += 2;
      }

      // Prevention
      if (recData?.prevention && recData.prevention.length > 0) {
        checkNewPage(15);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text("Prevention:", margin + 6, yPosition);
        yPosition += 6;
        doc.setFont("helvetica", "normal");
        recData.prevention.forEach((prevent) => {
          checkNewPage(5);
          doc.text(`• ${prevent}`, margin + 10, yPosition);
          yPosition += 5;
        });
        yPosition += 2;
      }

      // Malware Family
      if (recData?.malwareFamily) {
        checkNewPage(6);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Malware Family: ${recData.malwareFamily}`, margin + 6, yPosition);
        doc.setTextColor(0, 0, 0);
        yPosition += 6;
      }

      yPosition += 5;
      
      // Separator line between recommendations
      if (index < scanData.overallSecurity.recommendations.length - 1) {
        checkNewPage(3);
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 5;
      }
    });
    yPosition += 5;
  }

  // Vulnerabilities Section
  if (scanData.vulnerabilities.length > 0) {
    checkNewPage(20);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Vulnerabilities", margin, yPosition);
    yPosition += 10;

    scanData.vulnerabilities.forEach((vuln, index) => {
      checkNewPage(50);
      
      // Add spacing between vulnerabilities
      if (index > 0) {
        yPosition += 8;
        // Draw separator line
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPosition - 4, pageWidth - margin, yPosition - 4);
        yPosition += 4;
      }
      
      // Vulnerability header
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      const headerLines = splitText(`${index + 1}. ${vuln.name}`, maxWidth, 11);
      headerLines.forEach((line) => {
        checkNewPage(7);
        doc.text(line, margin, yPosition);
        yPosition += 7;
      });
      
      yPosition += 2;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      
      // Severity badge
      const color = severityColors[vuln.severity];
      doc.setFillColor(color[0], color[1], color[2]);
      doc.roundedRect(margin, yPosition - 4, 20, 5, 1, 1, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text(vuln.severity.toUpperCase(), margin + 2, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += 8;

      // CWE
      doc.setFontSize(9);
      doc.text(`CWE: ${vuln.cwe}`, margin, yPosition);
      yPosition += 5;

      // Location
      if (vuln.file && vuln.line !== undefined) {
        doc.text(`Location: ${vuln.file}:${vuln.line}`, margin, yPosition);
        yPosition += 5;
      } else if (vuln.url) {
        doc.text(`URL: ${vuln.url}`, margin, yPosition);
        yPosition += 5;
      }

      // OWASP Top 10
      if (vuln.owaspTop10 && vuln.owaspTop10 !== "N/A") {
        doc.text(`OWASP Top 10: ${vuln.owaspTop10}`, margin, yPosition);
        yPosition += 5;
      }

      // Compliance Impact
      if (vuln.complianceImpact && vuln.complianceImpact !== "N/A") {
        doc.text(`Compliance Impact: ${vuln.complianceImpact}`, margin, yPosition);
        yPosition += 5;
      }

      // Description
      yPosition += 2;
      checkNewPage(15);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Description:", margin, yPosition);
      yPosition += 6;

      doc.setFont("helvetica", "normal");
      const descLines = splitText(vuln.description, maxWidth, 9);
      descLines.forEach((line) => {
        checkNewPage(5);
        doc.text(line, margin, yPosition);
        yPosition += 5;
      });

      // Original Code
      if (vuln.originalCode) {
        yPosition += 4;
        checkNewPage(30);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("Original Code:", margin, yPosition);
        yPosition += 6;

        // Code block background
        const codeStartY = yPosition - 2;
        doc.setFillColor(248, 248, 248);
        doc.setDrawColor(220, 220, 220);
        doc.roundedRect(margin, codeStartY, maxWidth, 45, 2, 2, "FD");

        doc.setFont("courier", "normal");
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        const codeLines = splitText(vuln.originalCode, maxWidth - 10, 8);
        codeLines.slice(0, 10).forEach((line, idx) => { // Limit to 10 lines
          checkNewPage(5);
          doc.text(line, margin + 5, yPosition);
          yPosition += 4.5;
        });
        if (codeLines.length > 10) {
          doc.setFont("helvetica", "italic");
          doc.setFontSize(8);
          doc.text("... (truncated)", margin + 5, yPosition);
          yPosition += 4.5;
        }
        yPosition += 3;
      }

      // Fixed Code
      if (vuln.fixCode) {
        yPosition += 4;
        checkNewPage(30);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("AI Remediated Code:", margin, yPosition);
        yPosition += 6;

        // Code block background with green tint
        const codeStartY = yPosition - 2;
        doc.setFillColor(240, 255, 240);
        doc.setDrawColor(200, 230, 200);
        doc.roundedRect(margin, codeStartY, maxWidth, 45, 2, 2, "FD");

        doc.setFont("courier", "normal");
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        const fixLines = splitText(vuln.fixCode, maxWidth - 10, 8);
        fixLines.slice(0, 10).forEach((line) => { // Limit to 10 lines
          checkNewPage(5);
          doc.text(line, margin + 5, yPosition);
          yPosition += 4.5;
        });
        if (fixLines.length > 10) {
          doc.setFont("helvetica", "italic");
          doc.setFontSize(8);
          doc.text("... (truncated)", margin + 5, yPosition);
          yPosition += 4.5;
        }
        yPosition += 3;
      }

      // Recommendation
      if (vuln.recommendation) {
        yPosition += 4;
        checkNewPage(15);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("Recommendation:", margin, yPosition);
        yPosition += 6;

        doc.setFont("helvetica", "normal");
        const recLines = splitText(vuln.recommendation, maxWidth, 9);
        recLines.forEach((line) => {
          checkNewPage(5);
          doc.text(line, margin, yPosition);
          yPosition += 5;
        });
      }

      yPosition += 3;
    });
  } else {
    checkNewPage(10);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("No vulnerabilities found. Your code appears to be secure!", margin, yPosition);
    yPosition += 10;
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
    doc.text(
      "IntelliShieldX - AI Security Analysis Platform",
      pageWidth / 2,
      pageHeight - 5,
      { align: "center" }
    );
  }

  // Generate filename
  const timestamp = new Date().toISOString().split("T")[0];
  const targetName = scanData.target ? scanData.target.substring(0, 30).replace(/[^a-z0-9]/gi, "_") : "Scan";
  const filename = `IntelliShieldX-Scan-Report-${targetName}-${timestamp}.pdf`;

  // Save PDF
  doc.save(filename);
};

