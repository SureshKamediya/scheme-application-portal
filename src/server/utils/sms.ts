/**
 * SMS Messaging Service
 * Handles sending SMS notifications via SMSForTius API
 */

import logger from "~/server/utils/logger";
import { invokeExternalApiLambda } from "./lambda";

export interface SendSMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface SMSConfig {
  username: string;
  password: string;
  senderId: string;
  channel: string;
  route: string;
  peid: string;
  dltTemplateIdForOtp: string;
  dlTemplateIdForApplication: string;
  baseUrl: string;
}

interface SMSResponse {
  success: boolean;
  messageId?: string;
  jobId?: string;
  errorCode?: string;
  errorMessage?: string;
  error?: string;
}

// SMS Service Configuration
const SMS_CONFIG: SMSConfig = {
  username: process.env.SMS_USERNAME ?? "demo",
  password: process.env.SMS_PASSWORD ?? "demo123",
  senderId: process.env.SMS_SENDER_ID ?? "WEBSMS",
  channel: process.env.SMS_CHANNEL ?? "Promo",
  route: process.env.SMS_ROUTE ?? "14",
  peid: process.env.SMS_PEID ?? "##",
  dltTemplateIdForOtp: process.env.SMS_DLT_TEMPLATE_ID_OTP ?? "##",
  dlTemplateIdForApplication:
    process.env.SMS_DLT_TEMPLATE_ID_APPLICATION ?? "##",
  baseUrl:
    process.env.SMS_API_BASE_URL ?? "http://www.smsfortius.in/api/mt/SendSMS",
};

/**
 * Send OTP SMS notification
 */
export async function sendOTPSMS(
  phoneNumber: string,
  otp: string,
): Promise<SMSResponse> {
  const message = `OTP to verify your mobile number is ${otp}. Valid for 5 min. Do not share it with anyone.\nRiyasat Group`;

  logger.debug(
    {
      phoneNumber,
      otp,
      messageContent: message,
      messageLength: message.length,
    },
    "Preparing to send OTP SMS",
  );

  return sendSMS(phoneNumber, message, "OTP_VERIFICATION");
}

/**
 * Send application success SMS notification
 */
export async function sendApplicationSuccessSMS(
  phoneNumber: string,
  applicantName: string,
  plotCategory: string,
  schemeName: string,
  applicationNumber: number,
): Promise<SMSResponse> {
  const message = `Dear ${applicantName}, Your application for ${plotCategory} plot is submitted successfully in ${schemeName}. Your Application number is ${applicationNumber}. Riyasat Group.`;

  logger.debug(
    {
      phoneNumber,
      applicantName,
      plotCategory,
      schemeName,
      applicationNumber,
      messageContent: message,
      messageLength: message.length,
    },
    "Preparing to send application success SMS",
  );

  return sendSMS(phoneNumber, message, "APPLICATION_SUCCESS");
}

/**
 * Generic SMS sending function
 */
async function sendSMS(
  phoneNumber: string,
  message: string,
  messageType: string,
): Promise<SMSResponse> {
  try {
    // Validate phone number
    if (!validatePhoneNumber(phoneNumber)) {
      logger.warn({ phoneNumber, messageType }, "Invalid phone number format");
      return {
        success: false,
        error: "Invalid phone number format",
      };
    }

    // Ensure phone number starts with 91 (India country code)
    const formattedPhoneNumber = phoneNumber;

    // Build the URL with query parameters
    const url = new URL(SMS_CONFIG.baseUrl);
    url.searchParams.append("user", SMS_CONFIG.username);
    url.searchParams.append("password", SMS_CONFIG.password);
    url.searchParams.append("senderid", SMS_CONFIG.senderId);
    url.searchParams.append("channel", "Trans");
    url.searchParams.append("DCS", "0");
    url.searchParams.append("flashsms", "0");
    url.searchParams.append("number", formattedPhoneNumber);
    url.searchParams.append("text", message);
    url.searchParams.append("route", SMS_CONFIG.route);
    url.searchParams.append("peid", SMS_CONFIG.peid);
    url.searchParams.append(
      "templateid",
      messageType === "OTP_VERIFICATION"
        ? SMS_CONFIG.dltTemplateIdForOtp
        : SMS_CONFIG.dlTemplateIdForApplication,
    );

    logger.debug(
      {
        phoneNumber: formattedPhoneNumber,
        messageType,
        messageLength: message.length,
        smsConfig: {
          username: SMS_CONFIG.username,
          senderId: SMS_CONFIG.senderId,
          channel: "Trans",
          route: SMS_CONFIG.route,
          peid: SMS_CONFIG.peid,
          templateId:
            messageType === "OTP_VERIFICATION"
              ? SMS_CONFIG.dltTemplateIdForOtp
              : SMS_CONFIG.dlTemplateIdForApplication,
        },
        fullUrl: url.toString(),
      },
      "Sending SMS with full URL",
    );

    // Call Lambda with the full SMS provider URL
    const response = await invokeExternalApiLambda({
      url: url.toString(),
      method: "GET",
      timeout: 30,
    });

    if (!response.success) {
      logger.warn(
        {
          phoneNumber: formattedPhoneNumber,
          error: response.error,
          errorType: response.errorType,
          messageType,
        },
        "SMS Lambda returned error",
      );

      return {
        success: false,
        error: response.error ?? "Unknown error from SMS provider",
      };
    }

    // if (!response.ok) {
    //   const errorText = await response.text();
    //   logger.error(
    //     {
    //       phoneNumber: formattedPhoneNumber,
    //       messageType,
    //       status: response.status,
    //       error: errorText,
    //     },
    //     "SMS API HTTP error",
    //   );
    //   return {
    //     success: false,
    //     error: `SMS API error: ${response.status}`,
    //   };
    // }

    const responseText = response.response;

    logger.debug(
      {
        phoneNumber: formattedPhoneNumber,
        messageType,
        rawResponse: responseText,
      },
      "SMS API response received",
    );

    // Parse XML response
    const parsedResponse = responseText;

    logger.info(
      {
        phoneNumber: formattedPhoneNumber,
        messageType,
        errorCode: parsedResponse.ErrorCode,
        errorMessage: parsedResponse.ErrorMessage,
        jobId: parsedResponse.JobId,
        messageId: parsedResponse.MessageData?.Messages?.[0]?.MessageId,
      },
      "SMS response parsed",
    );

    if (parsedResponse.ErrorCode === "000") {
      logger.info(
        {
          phoneNumber: formattedPhoneNumber,
          messageType,
          jobId: parsedResponse.JobId,
          messageId: parsedResponse.MessageData?.Messages?.[0]?.MessageId,
        },
        "SMS sent successfully",
      );

      return {
        success: true,
        messageId: parsedResponse.MessageData?.Messages?.[0]?.MessageId,
        jobId: parsedResponse.JobId,
        errorCode: parsedResponse.ErrorCode,
        errorMessage: parsedResponse.ErrorMessage,
      };
    } else {
      logger.warn(
        {
          phoneNumber: formattedPhoneNumber,
          messageType,
          errorCode: parsedResponse.ErrorCode,
          errorMessage: parsedResponse.ErrorMessage,
        },
        "SMS API returned error response",
      );

      return {
        success: false,
        errorCode: parsedResponse.ErrorCode,
        errorMessage: parsedResponse.ErrorMessage,
        error: `SMS API Error: ${parsedResponse.ErrorMessage}`,
      };
    }
  } catch (error) {
    logger.error(
      {
        phoneNumber,
        messageType,
        error: error instanceof Error ? error.message : String(error),
      },
      "Error sending SMS",
    );

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Validate phone number format (10 digits for India)
 */
function validatePhoneNumber(phoneNumber: string): boolean {
  // Remove any non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, "");

  // Should be 10 digits (without country code) or 12 digits (with 91 country code)
  return cleaned.length === 10 || cleaned.length === 12;
}

/**
 * Parse JSON/XML response from SMSForTius API
 */
// function parseXMLResponse(responseText: string): SMSFortiusResponse {
//   try {
//     logger.debug(
//       {
//         responseLength: responseText.length,
//         responseSample: responseText.substring(0, 500),
//       },
//       "Starting response parsing",
//     );

//     let parsedData: unknown;

//     // Try parsing as JSON first
//     if (responseText.trim().startsWith("{")) {
//       logger.debug("Attempting to parse as JSON");
//       parsedData = JSON.parse(responseText) as unknown;
//     } else {
//       // Fall back to XML parsing
//       logger.debug("Attempting to parse as XML");
//       parsedData = parseXMLToJson(responseText);
//     }

//     logger.debug({ parsedData }, "Response successfully parsed into object");

//     // Type guard and extraction
//     if (!parsedData || typeof parsedData !== "object") {
//       throw new Error("Invalid response format");
//     }

//     const data = parsedData as Record<string, unknown>;

//     // Helper function to safely convert to string
//     const toString = (value: unknown, defaultValue: string): string => {
//       if (typeof value === "string") return value;
//       if (typeof value === "number") return String(value);
//       return defaultValue;
//     };

//     const errorCode = toString(data.ErrorCode, "999");
//     const errorMessage = toString(data.ErrorMessage, "Unknown error");
//     const jobId = toString(data.JobId, "");

//     logger.debug({ errorCode, errorMessage, jobId }, "Extracted core fields");

//     // Extract message data
//     let messageData: SMSFortiusResponse["MessageData"] | undefined;

//     if (Array.isArray(data.MessageData)) {
//       // JSON format: MessageData is an array
//       const messages = (data.MessageData as Array<unknown>).map(
//         (msg: unknown) => {
//           if (typeof msg !== "object" || !msg) {
//             return { Number: "", MessageId: "" };
//           }
//           const msgObj = msg as Record<string, unknown>;
//           return {
//             Number: toString(msgObj.Number, ""),
//             MessageId: toString(msgObj.MessageId, ""),
//           };
//         },
//       );
//       messageData = { Messages: messages };
//       logger.debug(
//         { messageCount: messages.length },
//         "Extracted message data from JSON array",
//       );
//     } else if (data.MessageData && typeof data.MessageData === "object") {
//       // XML format wrapped in MessageData object
//       const msgDataObj = data.MessageData as Record<string, unknown>;
//       if (Array.isArray(msgDataObj.Messages)) {
//         const messages = (msgDataObj.Messages as Array<unknown>).map(
//           (msg: unknown) => {
//             if (typeof msg !== "object" || !msg) {
//               return { Number: "", MessageId: "" };
//             }
//             const msgObj = msg as Record<string, unknown>;
//             return {
//               Number: toString(msgObj.Number, ""),
//               MessageId: toString(msgObj.MessageId, ""),
//             };
//           },
//         );
//         messageData = { Messages: messages };
//         logger.debug(
//           { messageCount: messages.length },
//           "Extracted message data from MessageData.Messages",
//         );
//       }
//     }

//     const result: SMSFortiusResponse = {
//       ErrorCode: errorCode,
//       ErrorMessage: errorMessage,
//       JobId: jobId,
//       MessageData: messageData,
//     };

//     logger.debug(result, "Response parsing completed successfully");

//     return result;
//   } catch (error) {
//     logger.error(
//       {
//         error: error instanceof Error ? error.message : String(error),
//         responseText: responseText.substring(0, 500),
//         stackTrace: error instanceof Error ? error.stack : undefined,
//       },
//       "Error parsing SMS response",
//     );

//     return {
//       ErrorCode: "999",
//       ErrorMessage: "Error parsing response",
//     };
//   }
// }

// /**
//  * Parse XML string to JSON object
//  */
// function parseXMLToJson(xmlText: string): Record<string, unknown> {
//   logger.debug({ xmlLength: xmlText.length }, "Parsing XML to JSON");

//   const result: Record<string, unknown> = {};

//   // Extract ErrorCode
//   const errorCodeRegex = /<ErrorCode>(.*?)<\/ErrorCode>/;
//   const errorCodeMatch = errorCodeRegex.exec(xmlText);
//   result.ErrorCode = errorCodeMatch?.[1] ?? "999";

//   // Extract ErrorMessage
//   const errorMessageRegex = /<ErrorMessage>(.*?)<\/ErrorMessage>/;
//   const errorMessageMatch = errorMessageRegex.exec(xmlText);
//   result.ErrorMessage = errorMessageMatch?.[1] ?? "Unknown error";

//   // Extract JobId
//   const jobIdRegex = /<JobId>(.*?)<\/JobId>/;
//   const jobIdMatch = jobIdRegex.exec(xmlText);
//   result.JobId = jobIdMatch?.[1] ?? "";

//   // Extract message data
//   const numberRegex = /<Number>(.*?)<\/Number>/g;
//   const messageIdRegex = /<MessageId>(.*?)<\/MessageId>/g;

//   const numberMatches = Array.from(xmlText.matchAll(numberRegex));
//   const messageIdMatches = Array.from(xmlText.matchAll(messageIdRegex));

//   logger.debug(
//     {
//       numberMatchCount: numberMatches.length,
//       messageIdMatchCount: messageIdMatches.length,
//     },
//     "XML regex matches found",
//   );

//   if (numberMatches.length > 0 && messageIdMatches.length > 0) {
//     const messages = numberMatches.map((match, index) => ({
//       Number: match[1] ?? "",
//       MessageId: messageIdMatches[index]?.[1] ?? "",
//     }));
//     result.MessageData = { Messages: messages };
//   }

//   logger.debug({ result }, "XML to JSON conversion completed");

//   return result;
// }
