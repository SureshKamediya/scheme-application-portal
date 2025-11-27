import {
  LambdaClient,
  InvokeCommand,
  type InvokeCommandInput,
} from "@aws-sdk/client-lambda";
import type { PdfPayload } from "~/types/pdfPayload";
import logger from "~/server/utils/logger";
import { NodeHttpHandler } from "@smithy/node-http-handler";

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

export interface ExternalApiPayload {
  url: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: Record<string, unknown> | string;
  timeout?: number;
}

interface SMSFortiusResponse {
  ErrorCode: string;
  ErrorMessage: string;
  JobId?: string;
  MessageData?: {
    Messages?: Array<{
      Number: string;
      MessageId: string;
    }>;
  };
}

export interface ExternalApiResponse {
  success: boolean;
  httpStatusCode?: number;
  contentType?: string;
  response: SMSFortiusResponse;
  headers?: Record<string, string>;
  error?: string;
  errorType?: string;
}

export interface LambdaInvokeOptions {
  async?: boolean;
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

function createLambdaClient() {
  const config: {
    region: string;
    requestHandler: NodeHttpHandler;
    credentials?: { accessKeyId: string; secretAccessKey: string };
  } = {
    region: process.env.AWS_REGION ?? "ap-south-1",
    requestHandler: new NodeHttpHandler({
      connectionTimeout: 300_000, // 300s
      socketTimeout: 300_000, // 300s
    }),
  };

  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;

  // Only add explicit credentials if both are present
  if (accessKey && secretKey) {
    logger.debug({}, "Using explicit AWS credentials for Lambda client");
    config.credentials = {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    };
  } else {
    logger.warn(
      {},
      "AWS credentials not found in environment variables. Using default credentials provider (IAM role)",
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

  logger.debug(
    { functionName, payloadKeys: Object.keys(payload) },
    "Invoking PDF generator Lambda",
  );

  try {
    const command = new InvokeCommand({
      FunctionName: functionName,
      Payload: JSON.stringify(payload),
    });

    const result = await lambdaClient.send(command);

    logger.info(
      { functionName, statusCode: result.StatusCode },
      "Lambda invoked successfully",
    );

    // Parse the nested JSON response from Lambda
    let parsedBody: unknown = null;

    try {
      // result.Payload is a Uint8Array, convert to string
      let payloadData: unknown = result.Payload;

      if (payloadData instanceof Uint8Array) {
        const decoder = new TextDecoder();
        payloadData = decoder.decode(payloadData);
        logger.debug({}, "Decoded Uint8Array payload from Lambda");
      }

      // First level parse
      if (typeof payloadData === "string") {
        logger.debug({}, "Parsing Lambda payload string");
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
            logger.debug({}, "Parsing body as JSON string");
            bodyContent = JSON.parse(bodyContent);
          }

          parsedBody = bodyContent as Record<string, unknown>;
        } else {
          parsedBody = payloadData;
        }
      }
    } catch (parseError) {
      logger.error(
        {
          error:
            parseError instanceof Error
              ? parseError.message
              : String(parseError),
          payload: String(result.Payload).slice(0, 500),
        },
        "Error parsing Lambda response",
      );
      throw new Error(
        `Failed to parse Lambda PDF generation response: ${parseError instanceof Error ? parseError.message : "Unknown error"}`,
      );
    }

    logger.debug({}, "Parsed Lambda response successfully");

    // Extract file_key from the parsed response
    const fileKey = extractFileKeyFromResponse(parsedBody);
    const bucket = extractBucketFromResponse(parsedBody);

    if (!fileKey) {
      logger.error(
        { parsedBody: JSON.stringify(parsedBody) },
        "Invalid Lambda response structure - missing file_key",
      );
      throw new Error(
        "Lambda returned invalid response structure - missing file_key",
      );
    }

    logger.info({ fileKey, bucket }, "PDF generated successfully by Lambda");

    return {
      success: true,
      file_key: fileKey,
      bucket: bucket ?? process.env.AWS_S3_BUCKET_NAME ?? "default",
    };
  } catch (error) {
    logger.error(
      {
        functionName,
        error: error instanceof Error ? error.message : String(error),
      },
      "Lambda invocation failed",
    );
    throw error;
  } finally {
    lambdaClient.destroy();
  }
}

/**
 * Invoke external API Lambda function
 * This Lambda makes HTTP requests to external APIs and returns the response
 */
export async function invokeExternalApiLambda(
  payload: ExternalApiPayload,
  options: LambdaInvokeOptions = { async: false },
): Promise<ExternalApiResponse> {
  const functionName =
    process.env.EXTERNAL_API_LAMBDA_FUNCTION_NAME ?? "external-api-call";

  logger.debug(
    {
      functionName,
      url: payload.url,
      method: payload.method ?? "GET",
    },
    "Invoking external API Lambda",
  );

  try {
    const params: InvokeCommandInput = {
      FunctionName: functionName,
      InvocationType: options.async ? "Event" : "RequestResponse",
      Payload: JSON.stringify(payload),
    };

    const command = new InvokeCommand(params);
    const result = await lambdaClient.send(command);

    logger.info(
      { functionName, statusCode: result.StatusCode },
      "External API Lambda invoked successfully",
    );

    // Parse response
    let response: ExternalApiResponse;

    if (result.Payload) {
      const payloadString =
        result.Payload instanceof Uint8Array
          ? new TextDecoder().decode(result.Payload)
          : String(result.Payload);

      logger.debug({}, "Parsing Lambda payload");

      const lambdaResponse = JSON.parse(payloadString) as {
        statusCode: number;
        body: string;
      };

      if (lambdaResponse.statusCode !== 200) {
        logger.warn(
          { statusCode: lambdaResponse.statusCode },
          "External API Lambda returned non-200 status",
        );
      }

      // Parse the body which is a JSON string
      const bodyContent = JSON.parse(
        lambdaResponse.body,
      ) as ExternalApiResponse;
      response = bodyContent;
    } else {
      throw new Error("No payload returned from Lambda");
    }

    if (result.FunctionError) {
      logger.error(
        { functionError: result.FunctionError },
        "Lambda function error",
      );
      throw new Error(`Lambda execution error: ${result.FunctionError}`);
    }

    logger.debug(
      { success: response.success, httpStatusCode: response.httpStatusCode },
      "External API Lambda response parsed successfully",
    );

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error(
      {
        functionName,
        url: payload.url,
        error: errorMessage,
      },
      "Error invoking external API Lambda",
    );

    throw error;
  }
}
