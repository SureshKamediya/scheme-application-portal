"use client";

import { useState } from "react";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadTime, setUploadTime] = useState<number | null>(null);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   if (e.target.files && e.target.files[0]) {
  //     setFile(e.target.files[0]);
  //     setResult(null);
  //     setUploadTime(null);
  //   }
  // };

  // const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
  //   e.preventDefault();
  //   if (e.dataTransfer.files && e.dataTransfer.files[0]) {
  //     setFile(e.dataTransfer.files[0]);
  //     setResult(null);
  //     setUploadTime(null);
  //   }
  // };

  // const handleUpload = async () => {
  //   if (!file) return;

  //   setUploading(true);
  //   setProgress(0);
  //   setResult(null);

  //   const startTime = performance.now();

  //   try {
  //     setProgress(10);

  //     // Step 1: Get presigned URL from API route
  //     console.log("Requesting presigned URL...");
  //     const response = await fetch("/api/s3-presigned", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         fileName: file.name,
  //         fileType: file.type,
  //       }),
  //     });

  //     if (!response.ok) {
  //       const errorData = await response.json();
  //       throw new Error(errorData.error || "Failed to get upload URL");
  //     }

  //     const { uploadUrl, fileUrl, key } = await response.json();
  //     console.log("Received presigned URL, uploading directly to S3...");
  //     setProgress(30);

  //     // Step 2: Upload directly to S3 using presigned URL
  //     const uploadResponse = await fetch(uploadUrl, {
  //       method: "PUT",
  //       body: file,
  //       headers: {
  //         "Content-Type": file.type,
  //       },
  //     });

  //     if (!uploadResponse.ok) {
  //       const errorText = await uploadResponse.text();
  //       console.error("S3 Upload Error:", errorText);
  //       throw new Error(
  //         `S3 upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`,
  //       );
  //     }

  //     setProgress(100);
  //     const endTime = performance.now();
  //     const timeTaken = ((endTime - startTime) / 1000).toFixed(2);
  //     setUploadTime(parseFloat(timeTaken));

  //     console.log("Upload successful!");
  //     setResult({
  //       type: "success",
  //       message: `File uploaded successfully in ${timeTaken}s! URL: ${fileUrl}`,
  //     });
  //     setFile(null);
  //   } catch (error) {
  //     const endTime = performance.now();
  //     const timeTaken = ((endTime - startTime) / 1000).toFixed(2);
  //     setUploadTime(parseFloat(timeTaken));

  //     console.error("Upload error:", error);
  //     setResult({
  //       type: "error",
  //       message: error instanceof Error ? error.message : "Upload failed",
  //     });
  //   } finally {
  //     setUploading(false);
  //     setTimeout(() => setProgress(0), 1000);
  //   }
  // };

  // const formatFileSize = (bytes: number) => {
  //   if (bytes === 0) return "0 Bytes";
  //   const k = 1024;
  //   const sizes = ["Bytes", "KB", "MB", "GB"];
  //   const i = Math.floor(Math.log(bytes) / Math.log(k));
  //   return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  // };

  return (
    // <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-600 to-cyan-700 p-4">
    //   <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
    //     <div className="mb-2 flex items-center justify-between">
    //       <h1 className="text-2xl font-bold text-gray-800">
    //         ⚡ Presigned URL Upload
    //       </h1>
    //       <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
    //         Direct to S3
    //       </span>
    //     </div>
    //     <p className="mb-6 text-sm text-gray-600">
    //       Upload files directly to S3 without server processing
    //     </p>

    //     {/* Upload Area */}
    //     <div
    //       onDragOver={(e) => e.preventDefault()}
    //       onDrop={handleDrop}
    //       onClick={() => document.getElementById("fileInput")?.click()}
    //       className="cursor-pointer rounded-xl border-2 border-dashed border-gray-300 p-12 text-center transition-all hover:border-blue-500 hover:bg-blue-50"
    //     >
    //       <div className="mb-3 text-5xl">📁</div>
    //       <p className="font-semibold text-gray-700">
    //         Click to select or drag and drop
    //       </p>
    //       <p className="mt-2 text-xs text-gray-500">Max file size: 10MB</p>
    //     </div>

    //     <input
    //       id="fileInput"
    //       type="file"
    //       onChange={handleFileChange}
    //       className="hidden"
    //     />

    //     {/* File Info */}
    //     {file && (
    //       <div className="mt-4 rounded-lg bg-gray-100 p-4">
    //         <p className="font-semibold text-gray-800">{file.name}</p>
    //         <p className="text-sm text-gray-600">{formatFileSize(file.size)}</p>
    //       </div>
    //     )}

    //     {/* Upload Button */}
    //     <button
    //       onClick={handleUpload}
    //       disabled={!file || uploading}
    //       className="mt-4 w-full rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 py-3 font-semibold text-white transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
    //     >
    //       {uploading ? "Uploading..." : "Upload File"}
    //     </button>

    //     {/* Progress Bar */}
    //     {progress > 0 && (
    //       <div className="mt-4 h-1 overflow-hidden rounded-full bg-gray-200">
    //         <div
    //           className="h-full bg-gradient-to-r from-blue-600 to-cyan-600 transition-all duration-300"
    //           style={{ width: `${progress}%` }}
    //         />
    //       </div>
    //     )}

    //     {/* Upload Time */}
    //     {uploadTime !== null && (
    //       <div className="mt-3 text-center">
    //         <span className="inline-block rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">
    //           ⏱️ Upload time: {uploadTime}s
    //         </span>
    //       </div>
    //     )}

    //     {/* Result */}
    //     {result && (
    //       <div
    //         className={`mt-4 rounded-lg p-4 ${
    //           result.type === "success"
    //             ? "border border-green-300 bg-green-100 text-green-800"
    //             : "border border-red-300 bg-red-100 text-red-800"
    //         }`}
    //       >
    //         <p className="text-sm break-words">{result.message}</p>
    //       </div>
    //     )}

    //     {/* Method Info */}
    //     <div className="mt-6 rounded-lg bg-blue-50 p-4">
    //       <p className="mb-2 text-xs font-semibold text-blue-900">
    //         📊 Method: Presigned URL
    //       </p>
    //       <ul className="space-y-1 text-xs text-blue-800">
    //         <li>✓ File uploads directly to S3</li>
    //         <li>✓ Server only generates URL</li>
    //         <li>✓ Zero bandwidth cost on server</li>
    //         <li>✓ Scalable for large files</li>
    //       </ul>
    //     </div>
    //   </div>

    // </div>
    <div></div>
  );
}
