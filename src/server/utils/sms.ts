/**
 * SMS Messaging Service
 * Handles sending SMS notifications via SMSForTius API
 */

import logger from "~/server/utils/logger";

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
  const message = `Dear ${applicantName}, Your application for ${plotCategory} plot in ${schemeName} is submitted successfully. Your Application number is ${applicationNumber}. Riyasat Group.`;

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
      },
      "Sending SMS",
    );

    // Make the API call
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    logger.debug(response, "SMS API response received");

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        {
          phoneNumber: formattedPhoneNumber,
          messageType,
          status: response.status,
          error: errorText,
        },
        "SMS API returned error",
      );
      return {
        success: false,
        error: `SMS API error: ${response.status}`,
      };
    }

    const responseText = await response.text();

    // Parse XML response
    const parsedResponse = parseXMLResponse(responseText);

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
        "SMS API returned error",
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
 * Format phone number to include country code
 */
function formatPhoneNumber(phoneNumber: string): string {
  // Remove any non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, "");

  // If it's 10 digits, add country code 91
  if (cleaned.length === 10) {
    cleaned = `91${cleaned}`;
  }

  // Remove leading 91 and re-add to ensure consistent format
  if (cleaned.startsWith("91")) {
    return cleaned;
  }

  return `91${cleaned}`;
}

/**
 * Parse XML response from SMSForTius API
 */
function parseXMLResponse(xmlText: string): SMSFortiusResponse {
  try {
    // Extract ErrorCode
    const errorCodeRegex = /<ErrorCode>(.*?)<\/ErrorCode>/;
    const errorCodeMatch = errorCodeRegex.exec(xmlText);
    const errorCode = errorCodeMatch?.[1] ?? "999";

    // Extract ErrorMessage
    const errorMessageRegex = /<ErrorMessage>(.*?)<\/ErrorMessage>/;
    const errorMessageMatch = errorMessageRegex.exec(xmlText);
    const errorMessage = errorMessageMatch?.[1] ?? "Unknown error";

    // Extract JobId
    const jobIdRegex = /<JobId>(.*?)<\/JobId>/;
    const jobIdMatch = jobIdRegex.exec(xmlText);
    const jobId = jobIdMatch?.[1];

    // Extract message data
    let messageData: SMSFortiusResponse["MessageData"] | undefined;
    const numberRegex = /<Number>(.*?)<\/Number>/;
    const numberMatch = numberRegex.exec(xmlText);
    const messageIdRegex = /<MessageId>(.*?)<\/MessageId>/;
    const messageIdMatch = messageIdRegex.exec(xmlText);

    if (numberMatch && messageIdMatch) {
      messageData = {
        Messages: [
          {
            Number: numberMatch[1] ?? "",
            MessageId: messageIdMatch[1] ?? "",
          },
        ],
      };
    }

    return {
      ErrorCode: errorCode,
      ErrorMessage: errorMessage,
      JobId: jobId,
      MessageData: messageData,
    };
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        xmlText: xmlText.substring(0, 200),
      },
      "Error parsing SMS response XML",
    );

    return {
      ErrorCode: "999",
      ErrorMessage: "Error parsing response",
    };
  }
}
