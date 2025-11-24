"use client";

import { useState } from "react";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer?.files?.[0]) {
      setFile(e.dataTransfer.files[0]);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setResult(null);

    try {
      setProgress(30);

      // Create FormData and append the file
      const formData = new FormData();
      formData.append("file", file);

      setProgress(50);

      // Upload to API route (which uploads to S3)
      const response = await fetch("/api/s3uplodertest", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string };
        throw new Error(errorData.error ?? "Failed to upload file");
      }

      const data = (await response.json()) as { fileUrl: string };
      setProgress(100);

      setResult({
        type: "success",
        message: `File uploaded successfully! URL: ${data.fileUrl}`,
      });
      setFile(null);
    } catch (error) {
      setResult({
        type: "error",
        message: error instanceof Error ? error.message : "Upload failed",
      });
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-600 to-indigo-700 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <h1 className="mb-2 text-2xl font-bold text-gray-800">🚀 S3 Upload</h1>
        <p className="mb-6 text-sm text-gray-600">
          Upload files directly to S3
        </p>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => document.getElementById("fileInput")?.click()}
          className="cursor-pointer rounded-xl border-2 border-dashed border-gray-300 p-12 text-center transition-all hover:border-purple-500 hover:bg-purple-50"
        >
          <div className="mb-3 text-5xl">📁</div>
          <p className="font-semibold text-gray-700">
            Click to select or drag and drop
          </p>
          <p className="mt-2 text-xs text-gray-500">Max file size: 10MB</p>
        </div>

        <input
          id="fileInput"
          type="file"
          onChange={handleFileChange}
          className="hidden"
        />

        {file && (
          <div className="mt-4 rounded-lg bg-gray-100 p-4">
            <p className="font-semibold text-gray-800">{file.name}</p>
            <p className="text-sm text-gray-600">{formatFileSize(file.size)}</p>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="mt-4 w-full rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 py-3 font-semibold text-white transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Upload File"}
        </button>

        {progress > 0 && (
          <div className="mt-4 h-1 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {result && (
          <div
            className={`mt-4 rounded-lg p-4 ${
              result.type === "success"
                ? "border border-green-300 bg-green-100 text-green-800"
                : "border border-red-300 bg-red-100 text-red-800"
            }`}
          >
            <p className="text-sm break-words">{result.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
