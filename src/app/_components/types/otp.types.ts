/**
 * Types for OTPForm component
 */

export type OTPStep = 0 | 1 | 2 | 3; // 0: input, 1: verify, 2: verified, 3: application

export interface OTPFormProps {
  schemeId?: number;
  schemeName?: string;
  termsAndConditionsFileName?: string;
}

export interface OTPStatus {
  type: "success" | "error" | "info";
  message: string;
}
