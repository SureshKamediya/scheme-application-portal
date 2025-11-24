import {
  LambdaClient,
  InvokeCommand,
  // type LambdaClientConfig,
} from "@aws-sdk/client-lambda";
import type { PdfPayload } from "~/types/pdfPayload";
// import { env } from "~/env";

export interface LambdaPdfResponse {
  statusCode: number;
  body: string;
}

export interface LambdaResponseBody {
  message: string;
  responce: {
    statusCode: number;
    body: {
      success: boolean;
      file_key: string;
      bucket: string;
      version_id: string;
      etag: string;
    };
  };
}

export interface ExtractedPdfData {
  success: boolean;
  file_key: string;
  bucket: string;
}

/**
 * Extract file_key from various Lambda response structures
 */
function extractFileKeyFromResponse(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;

  const obj = data as Record<string, unknown>;

  // Try nested structure: responce.body.file_key
  if (obj.responce && typeof obj.responce === "object") {
    const responce = obj.responce as Record<string, unknown>;
    if (responce.body && typeof responce.body === "object") {
      const body = responce.body as Record<string, unknown>;
      if (typeof body.file_key === "string") {
        return body.file_key;
      }
    }
  }

  // Try direct structure: body.file_key
  if (obj.body && typeof obj.body === "object") {
    const body = obj.body as Record<string, unknown>;
    if (typeof body.file_key === "string") {
      return body.file_key;
    }
  }

  // Try flat structure: file_key
  if (typeof obj.file_key === "string") {
    return obj.file_key;
  }

  return null;
}

/**
 * Extract bucket from various Lambda response structures
 */
function extractBucketFromResponse(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;

  const obj = data as Record<string, unknown>;

  // Try nested structure: responce.body.bucket
  if (obj.responce && typeof obj.responce === "object") {
    const responce = obj.responce as Record<string, unknown>;
    if (responce.body && typeof responce.body === "object") {
      const body = responce.body as Record<string, unknown>;
      if (typeof body.bucket === "string") {
        return body.bucket;
      }
    }
  }

  // Try direct structure: body.bucket
  if (obj.body && typeof obj.body === "object") {
    const body = obj.body as Record<string, unknown>;
    if (typeof body.bucket === "string") {
      return body.bucket;
    }
  }

  // Try flat structure: bucket
  if (typeof obj.bucket === "string") {
    return obj.bucket;
  }

  return null;
}

// let lambdaClient: LambdaClient = null as unknown as LambdaClient;

// if(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
//   console.log("AWS credentials found in environment variables. Using explicit credentials provider.");
//   lambdaClient = new LambdaClient({
//     region: process.env.AWS_REGION ?? "ap-south-1",
//     credentials: {
//       accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//       secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//     },
//   });
// } else{
//   console.warn("AWS credentials not found in environment variables. Using default credentials provider.");
//   lambdaClient = new LambdaClient({
//     region: process.env.AWS_REGION ?? "ap-south-1",
//   });
// }

function createLambdaClient() {
  const config: {
    region: string;
    credentials?: { accessKeyId: string; secretAccessKey: string };
  } = {
    region: process.env.AWS_REGION ?? "ap-south-1",
  };

  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;

  // Only add explicit credentials if both are present
  if (accessKey && secretKey) {
    console.log("Using explicit AWS credentials for Lambda client.");
    config.credentials = {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    };
  } else {
    console.warn(
      "AWS credentials not found in environment variables. Using default credentials provider (IAM role).",
    );
  }

  return new LambdaClient(config);
}

const lambdaClient = createLambdaClient();
/**
 * invokePdfGenerator - wrapper to invoke the PDF generator Lambda.
 * Uses AWS SDK v3 LambdaClient.
 * Reads AWS credentials from env.
 * Extracts file_key from nested Lambda response structure.
 */
export async function invokePdfGenerator(
  payload: PdfPayload,
): Promise<ExtractedPdfData> {
  const functionName =
    process.env.LAMBDA_FUNCTION_NAME ??
    "application_acknowledgement_pdf_generator_2";

  try {
    const command = new InvokeCommand({
      FunctionName: functionName,
      Payload: JSON.stringify(payload),
    });

    const result = await lambdaClient.send(command);

    console.log(
      `Lambda invoked: ${functionName}, StatusCode: ${result.StatusCode}`,
    );

    // Parse the nested JSON response from Lambda
    let parsedBody: unknown = null;

    try {
      // result.Payload is a Uint8Array, convert to string
      let payloadData: unknown = result.Payload;

      if (payloadData instanceof Uint8Array) {
        const decoder = new TextDecoder();
        payloadData = decoder.decode(payloadData);
        console.log("Decoded Uint8Array payload:", payloadData);
      }

      // First level parse
      if (typeof payloadData === "string") {
        console.log("Parsing Lambda payload string");
        payloadData = JSON.parse(payloadData);
      }

      // Handle both response structures:
      // Structure 1: { body: "{...json...}" } - when body is a JSON string
      // Structure 2: { body: {...} } - when body is already an object
      // Structure 3: { responce: { body: {...} } } - nested structure
      if (payloadData && typeof payloadData === "object") {
        const obj = payloadData as Record<string, unknown>;

        // Check for nested responce structure first
        if (obj.responce && typeof obj.responce === "object") {
          parsedBody = obj.responce;
        } else if (obj.body) {
          let bodyContent: unknown = obj.body;

          // Parse body if it's a JSON string
          if (typeof bodyContent === "string") {
            console.log("Parsing body as JSON string");
            bodyContent = JSON.parse(bodyContent);
          }

          parsedBody = bodyContent as Record<string, unknown>;
        } else {
          parsedBody = payloadData;
        }
      }
    } catch (parseError) {
      console.error("Error parsing Lambda response:", parseError);
      console.error("Raw payload:", result.Payload);
      throw new Error(
        `Failed to parse Lambda PDF generation response: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
      );
    }

    console.log("Parsed Lambda response:", JSON.stringify(parsedBody));

    // Extract file_key from the parsed response
    const fileKey = extractFileKeyFromResponse(parsedBody);
    const bucket = extractBucketFromResponse(parsedBody);

    if (!fileKey) {
      console.error(
        "Invalid Lambda response structure - missing file_key:",
        parsedBody,
      );
      throw new Error(
        "Lambda returned invalid response structure - missing file_key",
      );
    }

    return {
      success: true,
      file_key: fileKey,
      bucket: bucket ?? process.env.AWS_S3_BUCKET_NAME ?? "default",
    };
  } finally {
    lambdaClient.destroy();
  }
}
