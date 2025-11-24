// import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
// import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
// import { NextRequest, NextResponse } from "next/server";
// import crypto from "crypto";

// // Initialize S3 Client
// const s3Client = new S3Client({
//   region: process.env.AWS_REGION || "ap-south-1",
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
//   },
// });

// const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;

// export async function POST(request: NextRequest) {
//   try {
//     const { fileName, fileType } = await request.json();

//     // Validate input
//     if (!fileName || !fileType) {
//       return NextResponse.json(
//         { error: "fileName and fileType are required" },
//         { status: 400 },
//       );
//     }

//     // Validate environment variables
//     if (
//       !BUCKET_NAME ||
//       !process.env.AWS_ACCESS_KEY_ID ||
//       !process.env.AWS_SECRET_ACCESS_KEY
//     ) {
//       console.error("Missing required environment variables");
//       return NextResponse.json(
//         { error: "Server configuration error" },
//         { status: 500 },
//       );
//     }

//     // Generate unique file name in applications folder
//     const fileExtension = fileName.split(".").pop();
//     const uniqueFileName = `${crypto.randomUUID()}.${fileExtension}`;
//     const key = `applications/${new Date().toISOString().split("T")[0]}/${uniqueFileName}`;

//     // Create presigned URL for direct upload to S3
//     const command = new PutObjectCommand({
//       Bucket: BUCKET_NAME,
//       Key: key,
//       ContentType: fileType,
//     });

//     const uploadUrl = await getSignedUrl(s3Client, command, {
//       expiresIn: 300, // URL expires in 5 minutes
//     });

//     console.log("Generated presigned URL for key:", key);

//     // Construct the final file URL
//     const fileUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

//     return NextResponse.json({
//       uploadUrl,
//       fileUrl,
//       key,
//     });
//   } catch (error) {
//     console.error("Error generating presigned URL:", error);
//     return NextResponse.json(
//       {
//         error: "Failed to generate upload URL",
//         details: error instanceof Error ? error.message : "Unknown error",
//       },
//       { status: 500 },
//     );
//   }
// }

// // Health check endpoint
// export async function GET() {
//   return NextResponse.json({
//     status: "ok",
//     method: "presigned-url",
//     environment: process.env.NODE_ENV || "development",
//     bucketConfigured: !!BUCKET_NAME,
//   });
// }
