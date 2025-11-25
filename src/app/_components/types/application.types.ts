/**
 * Types for ApplicationForm component
 */

export interface ApplicationFormProps {
  initialSchemeId?: number;
  initialSchemeName?: string;
  initialMobileNumber?: string;
}

export type FormState = {
  mobile_number: string;
  applicant_name: string;
  father_or_husband_name: string;
  dob: string;
  id_type: string;
  id_number: string;
  aadhar_number: string;
  permanent_address: string;
  permanent_address_pincode: string;
  postal_address: string;
  postal_address_pincode: string;
  email: string;
  annual_income: string;
  plot_category: string;
  sub_category: string;
  registration_fees: string;
  processing_fees: string;
  total_payable_amount: string;
  payment_mode: string;
  dd_id_or_transaction_id: string;
  dd_date_or_transaction_date: string;
  dd_amount_or_transaction_amount: string;
  payer_account_holder_name: string;
  payer_bank_name: string;
  payment_proof: string;
  applicant_account_holder_name: string;
  applicant_account_number: string;
  applicant_bank_name: string;
  applicant_bank_branch_address: string;
  applicant_bank_ifsc: string;
  scheme_id: number;
  scheme_name: string;
};

export type ValidationErrors = Record<string, string>;

export interface ApplicationStatus {
  type: "success" | "error" | "info";
  message: string;
}

export interface SubmittedApplicationData {
  mobile_number: string;
  application_number: string;
  scheme_name: string;
  scheme_id: number;
}

export interface UploadedFile {
  name: string;
  size: string;
  file: File;
}

export interface PresignedUrlResponse {
  success: boolean;
  presignedUrl: string;
  s3Key: string;
  bucket: string;
}
