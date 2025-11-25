/**
 * Application Form Constants and Options
 * Centralized place for all dropdown options, labels, and configuration values
 * Edit these values here instead of changing them in the UI components
 */

// ID Types for applicant identification
export const ID_TYPES = [
  { value: "panCard", label: "Pan Card" },
  { value: "voterId", label: "Voter ID" },
  { value: "drivingLicense", label: "Driving License" },
  { value: "rationCard", label: "Ration Card" },
];

// Annual Income ranges
export const INCOME_RANGES = [
  { value: "0-3 lakh", label: "0 to 3 lakh" },
  { value: "3-6 lakh", label: "3 to 6 lakh" },
];

// Applicant Sub Categories
export const SUB_CATEGORIES = [
  { value: "unReserved", label: "Un-Reserved" },
  {
    value: "unReservedDestituteAndLandlessSingle",
    label: "Un-Reserved(Destitute & Landless Single)",
  },
  { value: "unReservedHandicapped", label: "Un-Reserved Handicapped" },
  { value: "governmentEmployees", label: "Government Employees" },
  { value: "journalist", label: "Journalist" },
  {
    value: "otherSoldiers",
    label: "Other Soldiers(including ex-servicemen)",
  },
  { value: "scheduledCaste", label: "Scheduled Caste" },
  { value: "scheduledTribe", label: "Scheduled Tribe" },
  { value: "soldierHandicapped", label: "Soldier Handicapped" },
  {
    value: "soldierWidowAndDependent",
    label: "Soldier(Widow & Dependent)",
  },
  { value: "transgender", label: "Transgender" },
];

// Payment Modes
export const PAYMENT_MODES = [
  { value: "dd", label: "DD" },
  { value: "upi", label: "UPI" },
];

// Application Form Steps
export const FORM_STEPS = [
  {
    step: 0,
    title: "Personal Information",
    description: "Enter your basic details",
  },
  {
    step: 1,
    title: "Payment Information",
    description: "Enter payment details",
  },
  {
    step: 2,
    title: "Refund Information",
    description: "Enter bank details for refund",
  },
] as const;

// File upload configuration
export const FILE_UPLOAD_CONFIG = {
  maxSizeInMB: 5,
  allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/jpg"],
  allowedExtensions: [".pdf", ".jpg", ".jpeg", ".png"],
};

// Validation messages
export const VALIDATION_MESSAGES = {
  REQUIRED_FIELD: "This field is required",
  INVALID_EMAIL: "Please enter a valid email address",
  INVALID_MOBILE: "Mobile number must be 10 digits",
  INVALID_PINCODE: "Pincode must be 6 digits",
  INVALID_AADHAR: "Aadhar number must be 12 digits",
  ONLY_LETTERS: "This field should contain only letters",
  ONLY_ALPHANUMERIC: "This field should be alphanumeric",
  FILE_TOO_LARGE: "File size exceeds maximum allowed size",
  INVALID_FILE_TYPE: "File type not allowed",
};

// Placeholder texts for form fields
export const PLACEHOLDERS = {
  APPLICANT_NAME: "Full name",
  FATHER_OR_HUSBAND_NAME: "Father or Husband name",
  ID_NUMBER: "ID number",
  AADHAR_NUMBER: "Aadhar number",
  EMAIL: "Email address",
  MOBILE: "10-digit mobile number",
  PINCODE: "6-digit pincode",
  DD_ID: "DD number or Transaction ID",
  ACCOUNT_NUMBER: "Account number",
  IFSC_CODE: "IFSC code",
};

// Bank branch address character limits
export const CHAR_LIMITS = {
  APPLICANT_NAME: 200,
  FATHER_OR_HUSBAND_NAME: 200,
  ID_TYPE: 20,
  ID_NUMBER: 20,
  EMAIL: 254,
  PERMANENT_ADDRESS: 500,
  POSTAL_ADDRESS: 500,
  PAYER_ACCOUNT_HOLDER_NAME: 200,
  PAYER_BANK_NAME: 200,
  PAYMENT_PROOF: 100,
  DD_ID_OR_TRANSACTION_ID: 100,
  APPLICANT_ACCOUNT_HOLDER_NAME: 200,
  APPLICANT_ACCOUNT_NUMBER: 20,
  APPLICANT_BANK_NAME: 200,
  APPLICANT_BANK_IFSC: 11,
};

// Status messages for different form states
export const STATUS_MESSAGES = {
  SUBMITTING: "Submitting your application...",
  GETTING_UPLOAD_URL: "Getting upload URL...",
  UPLOADING: "Uploading payment proof to cloud storage...",
  SUCCESS: (applicationNumber: string) =>
    `Application submitted successfully! Your application number is ${applicationNumber}`,
  FILE_UPLOAD_SUCCESS: "File uploaded successfully",
  FILE_SELECTED: "Payment proof file selected.",
  ERROR_GETTING_URL: "Failed to get presigned URL",
  ERROR_UPLOADING: (status: number) => `Failed to upload file to S3: ${status}`,
  ERROR_UPLOAD: "File upload failed",
};

// Helper function to get label from value
export function getIdTypeLabel(value: string): string {
  return ID_TYPES.find((item) => item.value === value)?.label ?? value;
}

export function getIncomeRangeLabel(value: string): string {
  return INCOME_RANGES.find((item) => item.value === value)?.label ?? value;
}

export function getSubCategoryLabel(value: string): string {
  return SUB_CATEGORIES.find((item) => item.value === value)?.label ?? value;
}

export function getPaymentModeLabel(value: string): string {
  return PAYMENT_MODES.find((item) => item.value === value)?.label ?? value;
}
