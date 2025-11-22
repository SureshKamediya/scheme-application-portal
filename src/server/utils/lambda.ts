import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
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

/**
 * invokePdfGenerator - wrapper to invoke the PDF generator Lambda.
 * Uses AWS SDK v3 LambdaClient.
 * Reads AWS credentials from env.
 * Extracts file_key from nested Lambda response structure.
 */
export async function invokePdfGenerator(
  payload: PdfPayload,
): Promise<ExtractedPdfData> {
  const client = new LambdaClient({
    region: process.env.AWS_REGION ?? "ap-south-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
    },
  });

  const functionName =
    process.env.LAMBDA_FUNCTION_NAME ??
    "application_acknowledgement_pdf_generator_2";

  try {
    const command = new InvokeCommand({
      FunctionName: functionName,
      Payload: JSON.stringify(payload),
    });

    const result = await client.send(command);

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
    client.destroy();
  }
}
