/**
 * Types for SchemeDetail component
 */

export interface SchemeDetailProps {
  schemeId: number;
}

export interface SchemeFile {
  id: bigint;
  name: string | null;
  file_choice: string;
  file: string | null;
}

export type SchemeFileArray = SchemeFile[] | undefined;

export interface SchemeDetailApplicationData {
  mobile_number: string;
  application_number: string;
  scheme_name: string;
  scheme_id: number;
}

export interface SchemeDetailsData {
  id: bigint;
  name: string;
  company: string;
  address?: string;
  phone?: string;
  reserved_price?: number;
  Lig_plot_count?: number;
  ews_plot_count?: number;
  application_open_date?: Date | string | null;
  application_close_date?: Date | string | null;
  lottery_result_date?: Date | string | null;
  successful_applicants_publish_date?: Date | string | null;
  scheme_schemefiles?: SchemeFile[];
}

// Shared types
export interface SchemeData {
  scheme_schemefiles?: SchemeFile[];
}

export interface DocumentUrlResult {
  success: boolean;
  url?: string;
}
