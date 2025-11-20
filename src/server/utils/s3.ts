/**
 * AWS S3 integration for file uploads
 * Server-side utility for uploading files to AWS S3 bucket
 * Note: Using dynamic imports to avoid TypeScript issues with AWS SDK
 */

import { env } from "~/env";

let s3Client: unknown = null;

/**
 * Get or create S3 client
 */
async function getS3Client() {
  const { S3Client } = await import("@aws-sdk/client-s3");

  process.stderr.write("=== S3 Client Configuration Debug ===\n");
  process.stderr.write(`AWS_REGION: ${env.AWS_REGION}\n`);
  process.stderr.write(`AWS_ACCESS_KEY_ID exists: ${!!env.AWS_ACCESS_KEY_ID}\n`);
  process.stderr.write(`AWS_SECRET_ACCESS_KEY exists: ${!!env.AWS_SECRET_ACCESS_KEY}\n`);
  process.stderr.write(`AWS_S3_BUCKET_NAME: ${env.AWS_S3_BUCKET_NAME}\n`);

  if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
    process.stderr.write("Using explicit access keys from environment variables.\n");
    s3Client = new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    });
  } else {
    process.stderr.write("Using default credential provider chain (IAM Role).\n");
    s3Client = new S3Client({ region: env.AWS_REGION });
  }
  
  return s3Client;
}

/**
 * Check if AWS S3 is configured
 */
export function isS3Configured(): boolean {
  return !!(
    env.AWS_REGION &&
    env.AWS_S3_BUCKET_NAME
  );
}

/**
 * Upload file to S3
 * @param key - S3 object key (path)
 * @param body - File content (Buffer or Uint8Array)
 * @param contentType - MIME type
 * @returns S3 URL or null if not configured
 */
/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any */

export async function uploadToS3(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string | null> {
  
  // Force stderr output
  process.stderr.write(`\n[S3-UPLOAD] Starting upload: ${key}\n`);
  
  if (!isS3Configured()) {
    process.stderr.write(`[S3-UPLOAD] Not configured\n`);
    return null;
  }

  try {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await getS3Client();
    
    process.stderr.write(`[S3-UPLOAD] Sending to S3...\n`);
    
    const command = new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET_NAME!,
      Key: key,
      Body: body,
      ContentType: contentType,
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    await (client as any).send(command);
    
    const s3Url = `https://${env.AWS_S3_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
    
    process.stderr.write(`[S3-UPLOAD] SUCCESS: ${s3Url}\n`);
    return s3Url;
    
  } catch (error) {
    process.stderr.write(`[S3-UPLOAD] ERROR: ${JSON.stringify(error)}\n`);
    throw error;
  }
}


/**
 * Delete file from S3
 * @param key - S3 object key (path)
 */
/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any */
export async function deleteFromS3(key: string): Promise<void> {
  if (!isS3Configured()) {
    console.warn("AWS S3 not configured");
    return;
  }

  try {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await getS3Client();
    const command = new DeleteObjectCommand({
      Bucket: env.AWS_S3_BUCKET_NAME!,
      Key: key,
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    await (client as any).send(command);
  } catch (error) {
    console.error("Error deleting file from S3:", error);
    throw new Error("Failed to delete file from S3");
  }
}

/**
 * Generate presigned URL for downloading file from S3
 * @param key - S3 object key (path)
 * @param expiresIn - URL expiration in seconds (default: 1 hour)
 * @returns Presigned URL
 */
export async function getPresignedUrl(
  key: string,
  expiresIn = 3600
): Promise<string | null> {
  if (!isS3Configured()) {
    console.warn("AWS S3 not configured");
    return null;
  }

  try {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    const client = await getS3Client();
    const command = new GetObjectCommand({
      Bucket: env.AWS_S3_BUCKET_NAME!,
      Key: key,
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const url = await getSignedUrl(client as any, command, { expiresIn });
    return url;
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    throw new Error("Failed to generate presigned URL");
  }
}

/**
 * Extract S3 key from S3 URL
 * @param url - Full S3 URL
 * @returns S3 key
 */
export function extractKeyFromUrl(url: string): string {
  // Format: https://bucket.s3.region.amazonaws.com/key
  const parts = url.split(".amazonaws.com/");
  if (parts.length > 1) {
    return parts[1] ?? "";
  }
  // Fallback: try to extract from URL path
  const urlObj = new URL(url);
  const pathname = urlObj.pathname.startsWith("/") ? urlObj.pathname.slice(1) : urlObj.pathname;
  return pathname;
}
