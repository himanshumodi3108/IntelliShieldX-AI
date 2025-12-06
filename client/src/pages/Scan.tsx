import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { FileUploader } from "@/components/scan/FileUploader";
import { UrlScanner } from "@/components/scan/UrlScanner";
import { ScanResults } from "@/components/scan/ScanResults";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileCode, Globe, Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { scanApi } from "@/lib/api";
import { useSearchParams } from "react-router-dom";

const Scan = () => {
  const [searchParams] = useSearchParams();
  const [files, setFiles] = useState<File[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoadingScan, setIsLoadingScan] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [scanData, setScanData] = useState<any>(null);

  // Load scan results if scanId is in query params
  useEffect(() => {
    const scanId = searchParams.get("scanId");
    if (scanId) {
      loadScanResults(scanId);
    }
  }, [searchParams]);

  const handleFileScan = async () => {
    if (files.length === 0) {
      toast.error("Please upload at least one file to scan");
      return;
    }
    
    setIsScanning(true);
    try {
      const result = await scanApi.uploadFiles(files);
      setScanData(result);
      setShowResults(true);
      toast.success("AI-powered scan completed successfully!");
    } catch (error: any) {
      console.error("Scan error:", error);
      toast.error(error.message || "Failed to scan files. Please try again.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleUrlScan = async (url: string) => {
    setIsScanning(true);
    try {
      const result = await scanApi.scanUrl(url);
      setScanData(result);
      setShowResults(true);
      toast.success(`AI-powered scan of ${url} completed!`);
    } catch (error: any) {
      console.error("Scan error:", error);
      toast.error(error.message || "Failed to scan URL. Please try again.");
    } finally {
      setIsScanning(false);
    }
  };

  const loadScanResults = async (scanId: string) => {
    setIsLoadingScan(true);
    try {
      const result = await scanApi.getScanResults(scanId);
      setScanData(result);
      setShowResults(true);
    } catch (error: any) {
      console.error("Failed to load scan results:", error);
      toast.error(error.message || "Failed to load scan results");
      // Clear the scanId from URL if loading fails
      window.history.replaceState({}, "", "/scan");
    } finally {
      setIsLoadingScan(false);
    }
  };

  if (isLoadingScan) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-12">
          <div className="container px-4 max-w-4xl">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (showResults) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-12">
          <div className="container px-4 max-w-4xl">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold">Scan Results</h1>
                <p className="text-muted-foreground mt-1">
                  AI-powered vulnerability analysis complete
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setShowResults(false);
                  setScanData(null);
                  window.history.replaceState({}, "", "/scan");
                }}
              >
                New Scan
              </Button>
            </div>
            <ScanResults scanData={scanData} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-12">
        <div className="container px-4 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Start a <span className="text-gradient">Security Scan</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Upload source code files or enter a URL to analyze for security vulnerabilities.
              Our AI will detect issues and generate secure code fixes.
            </p>
          </div>

          {/* Scan Options */}
          <Tabs defaultValue="file" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-secondary/50 p-1 rounded-xl">
              <TabsTrigger
                value="file"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"
              >
                <FileCode className="h-4 w-4" />
                File Analysis
              </TabsTrigger>
              <TabsTrigger
                value="url"
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"
              >
                <Globe className="h-4 w-4" />
                URL Scanner
              </TabsTrigger>
            </TabsList>

            <TabsContent value="file" className="space-y-6">
              <FileUploader onFilesSelected={setFiles} />
              
              {files.length > 0 && (
                <Button
                  variant="cyber"
                  size="lg"
                  className="w-full"
                  onClick={handleFileScan}
                  disabled={isScanning}
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Analyzing {files.length} file(s)...
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5" />
                      Start Security Analysis
                    </>
                  )}
                </Button>
              )}
            </TabsContent>

            <TabsContent value="url">
              <UrlScanner onScan={handleUrlScan} isScanning={isScanning} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Scan;
