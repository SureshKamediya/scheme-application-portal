/**
 * Utility functions for calculating fees and categories
 */

export interface IncomeCalculation {
  category: string;
  registrationFees: string;
  processingFees: string;
  totalAmount: string;
}

const PROCESSING_FEES = "500.00";

const INCOME_CATEGORIES: Record<string, IncomeCalculation> = {
  "0-3 lakh": {
    category: "EWS",
    registrationFees: "10000.00",
    processingFees: PROCESSING_FEES,
    totalAmount: "10500.00",
  },
  "3-6 lakh": {
    category: "LIG",
    registrationFees: "20000.00",
    processingFees: PROCESSING_FEES,
    totalAmount: "20500.00",
  },
};

export function calculateFeesAndCategory(
  incomeRange: string,
): IncomeCalculation | null {
  return INCOME_CATEGORIES[incomeRange] ?? null;
}

export function getProcessingFees(): string {
  return PROCESSING_FEES;
}

export function getIncomeOptions(): string[] {
  return Object.keys(INCOME_CATEGORIES);
}

export function isValidIncomeRange(income: string): boolean {
  return income in INCOME_CATEGORIES;
}
