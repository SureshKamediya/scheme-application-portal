/**
 * AWS S3 integration for file uploads
 * Server-side utility for uploading files to AWS S3 bucket
 * Note: Using dynamic imports to avoid TypeScript issues with AWS SDK
 */

import { env } from "~/env";
import {
  S3Client,
  type S3ClientConfig,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// let s3Client: S3Client = null as unknown as S3Client;

// if(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
//   console.log("AWS credentials found in environment variables. Using explicit credentials provider.");
//   s3Client = new S3Client({
//     region: process.env.AWS_REGION ?? "ap-south-1",
//     credentials: {
//       accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//       secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//     },
//   });
// } else{
//   console.warn("AWS credentials not found in environment variables. Using default credentials provider.");
//   s3Client = new S3Client({
//     region: process.env.AWS_REGION ?? "ap-south-1",
//   });
// }

function getS3Client(): S3Client {
  const config: S3ClientConfig = {
    region: process.env.AWS_REGION ?? "ap-south-1",
  };

  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (accessKey && secretKey) {
    console.log("Using explicit AWS credentials for S3 client.");
    config.credentials = {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    };
  }
  // If keys are missing, the 'credentials' property is omitted,
  // allowing the SDK to fall back to the IAM role (the next step in the chain).

  return new S3Client(config);
}

/**
 * Upload file to S3
 * @param key - S3 object key (path)
 * @param buffer - File content as Buffer
 * @param contentType - MIME type
 * @returns Presigned URL or null if S3 not configured
 */
export async function uploadToS3(
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<string | null> {
  const bucketName = process.env.AWS_S3_BUCKET_NAME ?? "scheme-application-files";

  if (!bucketName) {
    console.warn("AWS_S3_BUCKET_NAME not configured, skipping S3 upload");
    return null;
  }

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await getS3Client().send(command);

    console.log(`File uploaded to S3: s3://${bucketName}/${key}`);

    // Return presigned URL for the uploaded file
    return await getPresignedUrl(key, 3600);
  } catch (error) {
    console.error("S3 upload error:", error);
    throw error;
  }
}

/**
 * Get presigned URL for S3 object
 * @param key - S3 object key (path)
 * @param expirationSeconds - URL expiration time in seconds (default: 3600)
 * @returns Presigned URL or null if S3 not configured
 */
export async function getPresignedUrl(
  key: string,
  expirationSeconds = 3600,
): Promise<string | null> {
  const bucketName = process.env.AWS_S3_BUCKET_NAME ?? "scheme-application-files";

  if (!bucketName) {
    console.warn(
      "AWS_S3_BUCKET_NAME not configured, cannot generate presigned URL",
    );
    return null;
  }
  console.log(`Generating presigned URL for s3://${bucketName}/${key}`);
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const url = await getSignedUrl(getS3Client(), command, {
      expiresIn: expirationSeconds,
    });
    console.log(`Presigned URL generated: ${url}`);
    return url;
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    throw error;
  }
}

/**
 * Check if AWS S3 is configured
 */
export function isS3Configured(): boolean {
  return Boolean(env.AWS_REGION && env.AWS_S3_BUCKET_NAME);
}

/**
 * Delete file from S3
 * @param key - S3 object key (path)
 */
export async function deleteFromS3(key: string): Promise<void> {
  const bucketName = process.env.AWS_S3_BUCKET_NAME ?? "scheme-application-files";
  if (!isS3Configured()) {
    console.warn("AWS S3 not configured");
    return;
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    await getS3Client().send(command);
  } catch (error) {
    console.error("Error deleting file from S3:", error);
    throw new Error("Failed to delete file from S3");
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
  const pathname = urlObj.pathname.startsWith("/")
    ? urlObj.pathname.slice(1)
    : urlObj.pathname;
  return pathname;
}
