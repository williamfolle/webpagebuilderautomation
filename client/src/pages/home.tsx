import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import FileUploader from "@/components/FileUploader";
import ProcessingStatus from "@/components/ProcessingStatus";
import HowItWorks from "@/components/HowItWorks";
import JSFileChecker from "@/components/JSFileChecker";
import { FileUploadState, ProcessingStatus as ProcessStatus, ProcessingStats } from "@shared/types";
import { downloadProcessedZip } from "@/lib/fileUtils";
import wpbLogo from "@/assets/wpb-logo.png";
import { processFilesInBrowser } from "@/utils/clientSideProcessor";

export default function Home() {
  const { toast } = useToast();
  const [status, setStatus] = useState<ProcessStatus>("idle");
  const [stats, setStats] = useState<ProcessingStats>({
    elementsProcessed: 0,
    attributesAdded: 0,
  });
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [fileState, setFileState] = useState<FileUploadState>({
    zipFile: null,
    csvFiles: [],
  });

  // Mutation for processing files
  const mutation = useMutation({
    mutationFn: async () => {
      if (!fileState.zipFile || fileState.csvFiles.length === 0) {
        throw new Error("ZIP file and at least one CSV file are required");
      }

      console.log("Preparing to process files:", {
        zipFile: fileState.zipFile ? { name: fileState.zipFile.name, size: fileState.zipFile.size } : null,
        csvFiles: fileState.csvFiles.map(f => ({ name: f.name, size: f.size }))
      });

      // Try client-side processing first
      try {
        setStatus("processing");
        console.log("Starting client-side processing...");
        
        const result = await processFilesInBrowser(fileState.zipFile, fileState.csvFiles);
        
        console.log("Client-side processing completed:", result.stats);
        
        // Convert ArrayBuffer to Blob for download
        const zipBlob = new Blob([result.zipBuffer], { type: "application/zip" });
        
        setStats(result.stats);
        
        return {
          stats: result.stats,
          zipBlob
        };
      } catch (clientError) {
        console.error("Client-side processing failed:", clientError);
        console.log("Falling back to server-side processing...");
        
        // Fall back to server-side processing if client-side fails
        const formData = new FormData();
        formData.append("zip", fileState.zipFile);
        
        fileState.csvFiles.forEach((file) => {
          formData.append("csv", file);
        });
        
        setStatus("uploading");
        const response = await apiRequest("POST", "/api/process-files", formData);
        
        const jsonResponse = await response.json();
        
        // Read the ZIP file as an ArrayBuffer
        const zipBlob = new Blob(
          [new Uint8Array(jsonResponse.zipBuffer.data)], 
          { type: "application/zip" }
        );
        
        setStats(jsonResponse.stats);
        
        return {
          stats: jsonResponse.stats,
          zipBlob
        };
      }
    },
    onSuccess: (data) => {
      setStatus("success");
      toast({
        title: "Processing completed",
        description: `${data.stats.elementsProcessed} elements processed successfully.`,
      });
    },
    onError: (error: Error) => {
      setStatus("error");
      setErrorMessage(error.message);
      toast({
        variant: "destructive",
        title: "Processing error",
        description: error.message,
      });
    },
  });

  // Handle file uploads
  const handleFileChange = (newState: Partial<FileUploadState>) => {
    setFileState((prev) => ({
      ...prev,
      ...newState,
    }));
  };

  // Handle process button click
  const handleProcess = () => {
    mutation.mutate();
  };

  // Handle download button click
  const handleDownload = () => {
    if (mutation.data?.zipBlob) {
      // Use the fixed name "website.zip" as requested
      downloadProcessedZip(mutation.data.zipBlob, "website.zip");
      
      toast({
        title: "Download started",
        description: "The processed ZIP file is being downloaded.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <header className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <img src={wpbLogo} alt="WPB 1.1 Logo" className="h-24" />
          </div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Upload ZIP and CSV files for automatic processing of custom HTML attributes.
          </p>
        </header>

        {/* Main Content Area */}
        <main>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column - Upload Section */}
            <div className="lg:col-span-7">
              <FileUploader
                fileState={fileState}
                onFileChange={handleFileChange}
                onProcess={handleProcess}
                isProcessing={status === "processing" || status === "uploading"}
                disabled={status === "processing" || status === "uploading"}
              />
            </div>

            {/* Right Column - Status and Results */}
            <div className="lg:col-span-5">
              <ProcessingStatus
                status={status}
                stats={stats}
                errorMessage={errorMessage}
                onDownload={handleDownload}
              />
              <HowItWorks />
              
              {/* Debug Tool */}
              <div className="mt-6">
                <JSFileChecker />
              </div>
            </div>
          </div>
        </main>
        
        <footer className="mt-12 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} WPB 1.1. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
