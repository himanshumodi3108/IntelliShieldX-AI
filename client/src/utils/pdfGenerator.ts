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
  scanDuration?: number;
  filesAnalyzed?: number;
  createdAt?: string | Date;
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

