import { LambdaClient, InvokeCommand, type LambdaClientConfig } from "@aws-sdk/client-lambda";
import type { PdfPayload } from "~/types/pdfPayload";

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

function getLambdaClient(): LambdaClient {
  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
  
  // Start with the basic configuration
  const config: LambdaClientConfig = {
    region: process.env.AWS_REGION ?? "ap-south-1",
  };

  // Explicitly check if both keys are present (non-null, non-undefined, non-empty)
  if (accessKey && secretKey) {
    console.log("Using explicit AWS credentials for Lambda client.");
    config.credentials = {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    };
  } 
  // If keys are missing, the 'credentials' property is not added to the config, 
  // and the SDK falls back to the IAM role or other provider chain methods.

  return new LambdaClient(config);
}

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

    const result = await getLambdaClient().send(command);

    console.log(`Lambda invoked: ${functionName}, StatusCode: ${result.StatusCode}, Result: ${JSON.stringify(result)}`);

    // Parse the nested JSON response from Lambda
    let parsedBody: LambdaResponseBody | null = null;

    try {
      // result.Payload is a Uint8Array, convert to string
      let payloadData: unknown = result.Payload;

      if (payloadData instanceof Uint8Array) {
        const decoder = new TextDecoder();
        payloadData = decoder.decode(payloadData);
      }

      if (typeof payloadData === "string") {
        console.log("Parsing Lambda payload string:", payloadData);
        payloadData = JSON.parse(payloadData);
      }

      // Extract the body field which is itself a JSON string
      if (
        payloadData &&
        typeof payloadData === "object" &&
        "body" in payloadData
      ) {
        let bodyContent = (payloadData as { body: unknown }).body;

        if (typeof bodyContent === "string") {
          bodyContent = JSON.parse(bodyContent);
        }

        parsedBody = bodyContent as LambdaResponseBody;
      }
    } catch (parseError) {
      console.error("Error parsing Lambda response:", parseError);
      throw new Error("Failed to parse Lambda PDF generation response");
    }

    if (!parsedBody?.responce?.body?.file_key) {
      console.error("Invalid Lambda response structure:", parsedBody);
      throw new Error(
        "Lambda returned invalid response structure - missing file_key",
      );
    }

    return {
      success: parsedBody.responce.body.success,
      file_key: parsedBody.responce.body.file_key,
      bucket: parsedBody.responce.body.bucket,
    };
  } finally {
    getLambdaClient().destroy();
  }
}
