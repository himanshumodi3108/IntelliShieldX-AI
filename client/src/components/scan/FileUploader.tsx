import { useState, useCallback } from "react";
import { Upload, FileCode, X, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
}

export function FileUploader({ onFilesSelected }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

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
    setFiles((prev) => [...prev, ...droppedFiles]);
    onFilesSelected([...files, ...droppedFiles]);
  }, [files, onFilesSelected]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selectedFiles]);
      onFilesSelected([...files, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onFilesSelected(newFiles);
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
          accept=".js,.ts,.tsx,.py,.java,.php,.c,.cpp,.go,.rb,.rs,.zip,.txt,.csv,.json"
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
          <div className="flex flex-wrap gap-2 justify-center">
            {[".js", ".py", ".java", ".php", ".ts", ".zip"].map((ext) => (
              <span
                key={ext}
                className="px-2 py-1 rounded-md bg-secondary text-xs font-mono text-muted-foreground"
              >
                {ext}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2 animate-fade-in">
          <p className="text-sm font-medium text-muted-foreground">
            {files.length} file(s) selected
          </p>
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50"
            >
              <FileCode className="h-5 w-5 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
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
          ))}
        </div>
      )}
    </div>
  );
}
