import { useState, useCallback } from "react";
import { Upload, FileCode, X, CheckCircle, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FileUploaderProps {
  onFilesSelected: (files: File[], passwords: Record<string, string>) => void;
}

export function FileUploader({ onFilesSelected }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  // Check if file type potentially requires password
  const isPotentiallyPasswordProtected = (filename: string): boolean => {
    const ext = filename.toLowerCase().split('.').pop();
    return ['zip', 'rar', '7z', 'pdf', 'docx', 'xlsx', 'pptx', 'doc', 'xls', 'ppt'].includes(ext || '');
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    const newFiles = [...files, ...droppedFiles];
    setFiles(newFiles);
    onFilesSelected(newFiles, passwords);
  }, [files, passwords, onFilesSelected]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const newFiles = [...files, ...selectedFiles];
      setFiles(newFiles);
      onFilesSelected(newFiles, passwords);
    }
  };

  const removeFile = (index: number) => {
    const fileToRemove = files[index];
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    
    // Remove password for this file
    const newPasswords = { ...passwords };
    delete newPasswords[fileToRemove.name];
    setPasswords(newPasswords);
    
    // Remove show password state
    const newShowPasswords = { ...showPasswords };
    delete newShowPasswords[fileToRemove.name];
    setShowPasswords(newShowPasswords);
    
    onFilesSelected(newFiles, newPasswords);
  };

  const updatePassword = (filename: string, password: string) => {
    const newPasswords = { ...passwords };
    if (password) {
      newPasswords[filename] = password;
    } else {
      delete newPasswords[filename];
    }
    setPasswords(newPasswords);
    onFilesSelected(files, newPasswords);
  };

  const toggleShowPassword = (filename: string) => {
    setShowPasswords((prev) => ({
      ...prev,
      [filename]: !prev[filename],
    }));
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-2xl p-12 transition-all duration-300 cursor-pointer",
          isDragging
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-border hover:border-primary/50 hover:bg-secondary/30"
        )}
      >
        <input
          type="file"
          multiple
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          // Accept all file types for threat intelligence analysis
        />

        <div className="flex flex-col items-center text-center">
          <div className={cn(
            "p-4 rounded-2xl mb-4 transition-all",
            isDragging ? "bg-primary/20 scale-110" : "bg-secondary"
          )}>
            <Upload className={cn(
              "h-8 w-8 transition-colors",
              isDragging ? "text-primary" : "text-muted-foreground"
            )} />
          </div>
          <h3 className="text-lg font-semibold mb-1">
            {isDragging ? "Drop files here" : "Upload Files for Analysis"}
          </h3>
          <p className="text-muted-foreground text-sm mb-4">
            Drag & drop files or click to browse
          </p>
          <p className="text-xs text-muted-foreground mb-2">
            <span className="font-semibold">Any file type supported:</span> Code files (.js, .py, .java, etc.), 
            Documents (.pdf, .docx), Executables (.exe, .dmg), Archives (.zip, .tar), and more
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {[".js", ".py", ".pdf", ".exe", ".zip", ".dmg"].map((ext) => (
              <span
                key={ext}
                className="px-2 py-1 rounded-md bg-secondary text-xs font-mono text-muted-foreground"
              >
                {ext}
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Code files: AI security analysis + Threat intelligence | Other files: Threat intelligence only
          </p>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2 animate-fade-in">
          <p className="text-sm font-medium text-muted-foreground">
            {files.length} file(s) selected
          </p>
          {files.map((file, index) => {
            const needsPassword = isPotentiallyPasswordProtected(file.name);
            const showPassword = showPasswords[file.name] || false;
            
            return (
              <div
                key={index}
                className="space-y-2 p-3 rounded-xl bg-secondary/50 border border-border"
              >
                <div className="flex items-center gap-3">
                  {needsPassword ? (
                    <Lock className="h-5 w-5 text-warning" />
                  ) : (
                    <FileCode className="h-5 w-5 text-primary" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                      {needsPassword && (
                        <span className="ml-2 text-warning">• Password may be required</span>
                      )}
                    </p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-success" />
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1 hover:bg-destructive/20 rounded-lg transition-colors"
                  >
                    <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
                
                {/* Password input for potentially password-protected files */}
                {needsPassword && (
                  <div className="pt-2 border-t border-border">
                    <Label htmlFor={`password-${index}`} className="text-xs text-muted-foreground mb-1 block">
                      Password (if file is password-protected)
                    </Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id={`password-${index}`}
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter password if required"
                          value={passwords[file.name] || ""}
                          onChange={(e) => updatePassword(file.name, e.target.value)}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => toggleShowPassword(file.name)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-secondary rounded"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Required for password-protected ZIP, PDF, DOCX, XLSX files
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
