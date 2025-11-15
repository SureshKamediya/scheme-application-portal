# AWS S3 Integration Setup Guide

This document outlines the AWS S3 integration for file uploads in the Scheme Application Portal.

## Overview

Files uploaded through the application form (particularly payment proof documents) are uploaded to AWS S3 for secure cloud storage. The system supports PDF, JPEG, and PNG files with a maximum size of 5MB.

## Architecture

### Components

1. **Client-Side** (`src/app/_components/application.tsx`)
   - File input with validation
   - Base64 encoding of file content
   - TRPC call to upload endpoint

2. **Server-Side** (`src/server/utils/s3.ts`)
   - S3 client initialization
   - Upload/delete operations
   - Presigned URL generation for downloads

3. **TRPC Router** (`src/server/api/routers/application.ts`)
   - `uploadPaymentProof` mutation for handling file uploads
   - File type and size validation
   - S3 upload integration

4. **Utilities** (`src/utils/fileUpload.ts`)
   - `validateFile()` - Client-side file validation
   - `generateS3Key()` - S3 key naming convention
   - `formatFileSize()` - Human-readable file sizes

## Setup Instructions

### 1. AWS Configuration

You need AWS credentials with S3 access. Follow these steps:

1. **Create AWS Account**: Visit https://aws.amazon.com
2. **Create IAM User**:
   - Go to IAM → Users → Create User
   - Attach policy: `AmazonS3FullAccess` (for development)
   - For production, use a restrictive policy (see below)
3. **Create S3 Bucket**:
   - Go to S3 → Create Bucket
   - Name format: `scheme-app-payments-{your-name}`
   - Region: Choose closest to your users
   - Keep default settings or customize as needed

### 2. Production IAM Policy

For production, use this restrictive policy instead of `AmazonS3FullAccess`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::your-bucket-name/applications/*"
    }
  ]
}
```

### 3. Environment Configuration

Create a `.env.local` file in the project root:

```env
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_S3_BUCKET_NAME=your-bucket-name
```

**IMPORTANT**: Never commit `.env.local` to version control!

### 4. Bucket Public Access (Optional)

To allow direct file access without authentication:

1. Go to S3 → Your Bucket → Permissions
2. Edit Block Public Access settings
3. Uncheck all "Block public access" options
4. Add Bucket Policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/applications/*"
    }
  ]
}
```

Alternatively, use CloudFront distribution for better performance.

## File Upload Flow

1. **User selects file** in the application form
2. **Client-side validation** checks:
   - File type (PDF, JPEG, PNG)
   - File size (≤ 5MB)
3. **File is encoded** to base64
4. **TRPC endpoint** receives file:
   - Re-validates file type and size
   - Converts base64 to Buffer
   - Uploads to S3
5. **S3 URL is returned** and stored in application record
6. **Application is submitted** with S3 URL as payment_proof

## S3 Key Naming Convention

Files are organized in S3 using the following pattern:

```
applications/{applicationId}/payment_proof_{timestamp}.{extension}
```

Example: `applications/12345/payment_proof_1703001234567.pdf`

This ensures:
- Files are organized by application
- Multiple versions can be stored if needed
- Easy retrieval and management

## File Size and Type Limits

| Property | Limit | Notes |
|----------|-------|-------|
| Max Size | 5 MB | Configurable in `fileUpload.ts` |
| Allowed Types | PDF, JPEG, PNG | Configurable in `application.ts` |
| Max Filename | 255 characters | OS and S3 limits |

## Fallback Behavior

If S3 is not configured (missing credentials):
- File upload endpoint returns filename as fallback
- Application can still be submitted
- Payment proof is stored as filename only

To disable fallback and require S3, modify `uploadToS3()` function.

## API Endpoints

### Upload Payment Proof

**Endpoint**: `POST /api/trpc/application.uploadPaymentProof`

**Input**:
```typescript
{
  applicationId: number;
  filename: string;
  fileBuffer: string;      // base64 encoded
  mimeType: string;
}
```

**Output**:
```typescript
{
  success: boolean;
  url: string;             // S3 URL or filename
  key: string;             // S3 key
  bucket: boolean | null;  // true if S3, null if fallback
}
```

## Error Handling

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| "File type not allowed" | Wrong file format | Use PDF, JPEG, or PNG |
| "File size exceeds 5MB" | File too large | Compress file or reduce size |
| "AWS credentials not configured" | Missing env vars | Check `.env.local` |
| "Failed to upload file to S3" | S3 permission issue | Check IAM policy and bucket |

## Monitoring and Logs

Check server logs for file upload issues:

```bash
# Watch for S3 upload errors
grep -i "upload\|s3" /var/log/application.log
```

Server-side logging in `src/server/utils/s3.ts`:
- Warnings when S3 not configured
- Errors during upload/delete operations
- Debug info about uploads

## Cost Estimation

AWS S3 pricing (us-east-1):
- Storage: $0.023 per GB/month
- PUT requests: $0.005 per 1,000 requests
- GET requests: $0.0004 per 1,000 requests

For 1,000 users submitting 5MB files:
- Storage: ~5GB = $0.12/month
- Requests: ~$0.01/month
- **Total: ~$0.13/month** (minimal cost)

## Security Considerations

1. **Credentials**: Never expose AWS credentials in client code
2. **Presigned URLs**: Use for temporary download access
3. **File Validation**: Always validate on server-side
4. **Encryption**: Enable S3 default encryption
5. **Versioning**: Enable bucket versioning for recovery
6. **Access Logs**: Enable S3 access logging for auditing

## Troubleshooting

### Test S3 Connection

```typescript
// In a server-side function
import { uploadToS3 } from "~/server/utils/s3";

const testBuffer = Buffer.from("test content");
const url = await uploadToS3(
  "test/test-file.txt",
  testBuffer,
  "text/plain"
);
console.log("S3 Upload Test:", url);
```

### Environment Variable Check

```bash
echo $AWS_ACCESS_KEY_ID
echo $AWS_SECRET_ACCESS_KEY
echo $AWS_S3_BUCKET_NAME
```

### View S3 Files

```bash
# AWS CLI
aws s3 ls s3://your-bucket-name/applications/

# List with sizes
aws s3 ls s3://your-bucket-name/applications/ --recursive --human-readable --summarize
```

## Additional Resources

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [AWS SDK for JavaScript](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/)
- [AWS Pricing Calculator](https://calculator.aws/#/)
- [S3 Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/BestPractices.html)

## Support

For issues or questions:
1. Check server logs
2. Verify AWS credentials in `.env.local`
3. Test S3 bucket access via AWS Console
4. Check TRPC error messages in client logs
