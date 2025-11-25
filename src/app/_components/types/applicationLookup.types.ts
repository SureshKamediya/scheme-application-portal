/**
 * Types for ApplicationLookup component
 */

export interface ApplicationLookupProps {
  initialMobileNumber: string;
  initialApplicationNumber: string;
  initialSchemeName: string;
  initialSchemeId: number;
}

export interface ApplicationResponse {
  id: number | bigint;
  [key: string]: unknown;
}

export interface ErrorResponse {
  message?: string;
  [key: string]: unknown;
}

export interface ApplicationStatus {
  type: "success" | "error" | "info";
  message: string;
}
