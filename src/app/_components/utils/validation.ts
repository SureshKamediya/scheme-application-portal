/**
 * Validation utilities for Application Form
 */
/* eslint-disable @typescript-eslint/no-base-to-string */

import type { ValidationErrors } from "~/app/_components/types";

const REGEX = {
  onlyAlpha: /^[A-Za-z\s]+$/,
  onlyAlphanumeric: /^[A-Za-z0-9\s]+$/,
  mobile: /^\d{10}$/,
  pincode: /^\d{6}$/,
  aadhar: /^\d{12}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  onlyNumeric: /^\d+$/,
  panCard: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  voterId: /^[A-Z]{3}[0-9]{7}$/,
  ifsc: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  drivingLicense: /^[A-Z]{2}[0-9]{2}\s?[0-9]{11}$/,
  rationCard: /^[A-Z0-9]{8,15}$/,
  upi: /^\d{12}$/,
  dd: /^\d{6}$/,
};

export function validateStep(
  step: number,
  formState: Record<string, unknown>,
): ValidationErrors {
  const newErrors: ValidationErrors = {};

  if (step === 0) {
    validatePersonalStep(formState, newErrors);
  }

  if (step === 1) {
    validatePaymentStep(formState, newErrors);
  }

  if (step === 2) {
    validateRefundStep(formState, newErrors);
  }

  return newErrors;
}

function validatePersonalStep(
  state: Record<string, unknown>,
  errors: ValidationErrors,
): void {
  const applicant_name = String(state.applicant_name ?? "");
  const father_or_husband_name = String(state.father_or_husband_name ?? "");
  const dob = String(state.dob ?? "");
  const mobile_number = String(state.mobile_number ?? "");
  const email = String(state.email ?? "");
  const id_type = String(state.id_type ?? "");
  const id_number = String(state.id_number ?? "");
  const aadhar_number = String(state.aadhar_number ?? "");
  const permanent_address = String(state.permanent_address ?? "");
  const permanent_address_pincode = String(
    state.permanent_address_pincode ?? "",
  );
  const postal_address = String(state.postal_address ?? "");
  const postal_address_pincode = String(state.postal_address_pincode ?? "");

  if (!applicant_name.trim()) {
    errors.applicant_name = "Applicant name is required";
  } else if (!REGEX.onlyAlpha.test(applicant_name)) {
    errors.applicant_name = "Applicant name should contain only letters";
  }

  if (!father_or_husband_name.trim()) {
    errors.father_or_husband_name = "Father/Husband name is required";
  } else if (!REGEX.onlyAlpha.test(father_or_husband_name)) {
    errors.father_or_husband_name =
      "Father/Husband name should contain only letters";
  }

  if (!dob) {
    errors.dob = "Date of birth is required";
  }

  if (!REGEX.mobile.test(mobile_number)) {
    errors.mobile_number = "Mobile number must be 10 digits";
  }

  if (!email.trim()) {
    errors.email = "Email is required";
  } else if (!REGEX.email.test(email)) {
    errors.email = "Please enter a valid email address";
  }

  if (!id_type.trim()) {
    errors.id_type = "ID type is required";
  }

  if (!id_number.trim()) {
    errors.id_number = "ID number is required";
  } else {
    let isValid = false;
    let errorMessage = "ID number format is invalid";

    switch (id_type.toLowerCase()) {
      case "pancard":
        isValid = REGEX.panCard.test(id_number.toUpperCase());
        errorMessage = "Enter a valid PAN card number";
        break;
      case "voterid":
        isValid = REGEX.voterId.test(id_number.toUpperCase());
        errorMessage = "Enter a valid Voter ID number";
        break;
      case "rationcard":
        isValid = REGEX.rationCard.test(id_number.toUpperCase());
        errorMessage = "Enter a valid Ration card number";
        break;
      case "drivinglicense":
        isValid = REGEX.drivingLicense.test(id_number.toUpperCase());
        errorMessage = "Enter a valid Driving License number";
        break;
      default:
        isValid = REGEX.onlyAlphanumeric.test(id_number);
    }

    if (!isValid) {
      errors.id_number = errorMessage;
    }
  }

  if (!aadhar_number.trim()) {
    errors.aadhar_number = "Aadhar number is required";
  } else if (!REGEX.aadhar.test(aadhar_number.toUpperCase())) {
    errors.aadhar_number = "Enter a valid Aadhar number, it must be 12 digits";
  }

  if (!permanent_address.trim()) {
    errors.permanent_address = "Permanent address is required";
  }

  if (!permanent_address_pincode.trim()) {
    errors.permanent_address_pincode = "Permanent address pincode is required";
  } else if (!REGEX.pincode.test(permanent_address_pincode)) {
    errors.permanent_address_pincode =
      "Permanent address pincode must be 6 digits";
  }

  if (!postal_address.trim()) {
    errors.postal_address = "Postal address is required";
  }

  if (!postal_address_pincode.trim()) {
    errors.postal_address_pincode = "Postal address pincode is required";
  } else if (!REGEX.pincode.test(postal_address_pincode)) {
    errors.postal_address_pincode = "Postal address pincode must be 6 digits";
  }
}

function validatePaymentStep(
  state: Record<string, unknown>,
  errors: ValidationErrors,
): void {
  const annual_income = String(state.annual_income ?? "");
  const payment_mode = String(state.payment_mode ?? "");
  const dd_id_or_transaction_id = String(state.dd_id_or_transaction_id ?? "");
  const dd_date_or_transaction_date = String(
    state.dd_date_or_transaction_date ?? "",
  );
  const dd_amount_or_transaction_amount = String(
    state.dd_amount_or_transaction_amount ?? "",
  );
  const total_payable_amount = String(state.total_payable_amount ?? "");
  const payer_account_holder_name = String(
    state.payer_account_holder_name ?? "",
  );
  const payer_bank_name = String(state.payer_bank_name ?? "");
  const payment_proof = String(state.payment_proof ?? "");
  const sub_category = String(state.sub_category ?? "");

  if (!annual_income.trim()) {
    errors.annual_income = "Annual income is required";
  }

  if (!sub_category.trim()) {
    errors.sub_category = "Sub category is required";
  }

  if (!payment_mode.trim()) {
    errors.payment_mode = "Payment mode is required";
  }

  if (!dd_id_or_transaction_id.trim()) {
    errors.dd_id_or_transaction_id = "DD/Transaction ID is required";
  } else {
    let isValid = false;
    let errorMessage = "DD/Transaction id is invalid";

    switch (payment_mode.toLowerCase()) {
      case "dd":
        isValid = REGEX.dd.test(dd_id_or_transaction_id);
        errorMessage = "Enter a valid 6 digit dd number";
        break;
      case "upi":
        isValid = REGEX.upi.test(dd_id_or_transaction_id);
        errorMessage = "Enter a valid 12 digit transaction/UTR number";
        break;
      default:
        isValid = REGEX.onlyNumeric.test(dd_id_or_transaction_id);
    }

    if (!isValid) {
      errors.dd_id_or_transaction_id = errorMessage;
    }
  }

  if (!dd_date_or_transaction_date) {
    errors.dd_date_or_transaction_date = "DD/Transaction date is required";
  }

  if (
    !dd_amount_or_transaction_amount ||
    Number(dd_amount_or_transaction_amount) <= 0
  ) {
    errors.dd_amount_or_transaction_amount = "Enter a valid payment amount";
  } else if (
    Number(dd_amount_or_transaction_amount) !== Number(total_payable_amount)
  ) {
    errors.dd_amount_or_transaction_amount = `Payment amount must be ₹${total_payable_amount}`;
  }

  if (!payer_account_holder_name.trim()) {
    errors.payer_account_holder_name = "Payer account holder name is required";
  } else if (!REGEX.onlyAlpha.test(payer_account_holder_name)) {
    errors.payer_account_holder_name =
      "Payer account holder name should contain only letters";
  }

  if (!payer_bank_name.trim()) {
    errors.payer_bank_name = "Payer bank name is required";
  } else if (!REGEX.onlyAlpha.test(payer_bank_name)) {
    errors.payer_bank_name = "Payer bank name should contain only letters";
  }

  if (!payment_proof.trim()) {
    errors.payment_proof = "Payment proof is required";
  }
}

function validateRefundStep(
  state: Record<string, unknown>,
  errors: ValidationErrors,
): void {
  const applicant_account_holder_name = String(
    state.applicant_account_holder_name ?? "",
  );
  const applicant_account_number = String(state.applicant_account_number ?? "");
  const applicant_bank_name = String(state.applicant_bank_name ?? "");
  const applicant_bank_branch_address = String(
    state.applicant_bank_branch_address ?? "",
  );
  const applicant_bank_ifsc = String(state.applicant_bank_ifsc ?? "");

  if (!applicant_account_holder_name.trim()) {
    errors.applicant_account_holder_name =
      "Applicant account holder name is required";
  } else if (!REGEX.onlyAlpha.test(applicant_account_holder_name)) {
    errors.applicant_account_holder_name =
      "Applicant account holder name should contain only letters";
  }

  if (!applicant_account_number.trim()) {
    errors.applicant_account_number = "Applicant account number is required";
  } else if (!REGEX.onlyAlphanumeric.test(applicant_account_number)) {
    errors.applicant_account_number =
      "Applicant account number should be alphanumeric";
  }

  if (!applicant_bank_name.trim()) {
    errors.applicant_bank_name = "Applicant bank name is required";
  } else if (!REGEX.onlyAlpha.test(applicant_bank_name)) {
    errors.applicant_bank_name =
      "Applicant bank name should contain only letters";
  }

  if (!applicant_bank_branch_address.trim()) {
    errors.applicant_bank_branch_address =
      "Applicant bank branch address is required";
  }

  const ifsc = applicant_bank_ifsc.trim().replace(/\s+/g, "").toUpperCase();

  if (!ifsc) {
    errors.applicant_bank_ifsc = "Applicant bank IFSC is required";
  } else if (!REGEX.ifsc.test(ifsc)) {
    errors.applicant_bank_ifsc = "Enter a valid IFSC code (e.g. ABCD0E12345)";
  }
}
