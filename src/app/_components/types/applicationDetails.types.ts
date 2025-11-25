/**
 * Types for ApplicationDetails component
 */

import type { Decimal } from "generated/prisma/runtime/library";

export interface ApplicationData {
  id: bigint;
  application_number: number;
  application_status: string | null;
  applicant_name: string;
  mobile_number: string;
  dob: Date | null;
  email: string | null;
  plot_category: string | null;
  annual_income: string | null;
  application_submission_date: Date | null;
  payment_mode: string | null;
  payment_status: string | null;
  registration_fees: Decimal | null;
  processing_fees: Decimal | null;
  total_payable_amount: Decimal | null;
  permanent_address: string | null;
  permanent_address_pincode: string | null;
  postal_address: string | null;
  postal_address_pincode: string | null;
  application_pdf: string | null;
  scheme_scheme: { id: bigint; name: string } | null;
  father_or_husband_name?: string | null;
  id_type?: string | null;
  id_number?: string | null;
  aadhar_number?: string | null;
  dd_date_or_transaction_date?: Date | null;
  dd_id_or_transaction_id?: string | null;
  dd_amount_or_transaction_amount?: Decimal | null;
  payer_account_holder_name?: string | null;
  payer_bank_name?: string | null;
  applicant_account_holder_name?: string | null;
  applicant_account_number?: string | null;
  applicant_bank_name?: string | null;
  applicant_bank_branch_address?: string | null;
  applicant_bank_ifsc?: string | null;
  scheme_id?: bigint | null;
}

export interface ApplicationDetailsProps {
  application: ApplicationData;
  applicationId: number;
}

export interface ApplicationStatus {
  type: "success" | "error" | "info";
  message: string;
}

export interface GeneratePdfPayload {
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
  registration_fees: string;
  processing_fees: string;
  total_payable_amount: string;
  payment_mode: string;
  dd_id_or_transaction_id: string;
  dd_date_or_transaction_date: string;
  dd_amount_or_transaction_amount: string;
  payer_account_holder_name: string;
  payer_bank_name: string;
  payment_status: string;
  applicant_account_holder_name: string;
  applicant_account_number: string;
  applicant_bank_name: string;
  applicant_bank_branch_address: string;
  applicant_bank_ifsc: string;
  scheme_id: number;
  application_id: number;
  application_submission_date: string;
}

export interface DownloadPdfResponse {
  downloadUrl: string;
}
