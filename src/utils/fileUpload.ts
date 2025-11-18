/**
 * File upload utilities for handling form submissions with AWS S3
 * Integrates with AWS S3 for secure cloud storage
 */

export interface UploadedFile {
  filename: string;
  size: number;
  type: string;
  lastModified: number;
}

export interface S3UploadResult {
  url: string;
  key: string;
  bucket: string;
}

/**
 * Convert File to base64 for preview or transmission
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Validate file before upload
 * @param file - File to validate
 * @param maxSizeMB - Maximum file size in MB
 * @param allowedTypes - Allowed MIME types
 * @returns Error message if invalid, empty string if valid
 */
export function validateFile(
  file: File,
  maxSizeMB = 5,
  allowedTypes: string[] = ["application/pdf", "image/jpeg", "image/png"]
): string {
  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return `File size must be less than ${maxSizeMB}MB`;
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return `File type must be one of: ${allowedTypes.join(", ")}`;
  }

  return "";
}

/**
 * Get file info for display
 */
export function getFileInfo(file: File): UploadedFile {
  return {
    filename: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
  };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Generate a unique S3 key for the file
 * @param applicationId - Application ID from database
 * @param originalFilename - Original filename
 * @returns S3 object key
 */
export function generateS3Key(
  applicationId: number | string,
  originalFilename: string,
  schemeName: string
): string {
  const timestamp = Date.now();
  const ext = originalFilename.split(".").pop() ?? "bin";
  return `applications/${schemeName}/${applicationId}/payment_proof_${timestamp}.${ext}`;
}
