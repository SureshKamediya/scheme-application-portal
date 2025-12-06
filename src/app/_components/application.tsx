"use client";

import React, { useState } from "react";
import { api } from "~/trpc/react";
import { validateFile, formatFileSize } from "~/utils/fileUpload";
import { ApplicationLookup } from "./applicationLookup";
import { validateStep as validateFormStep } from "./utils/validation";
import { calculateFeesAndCategory } from "./utils/fees";
import {
  ID_TYPES,
  INCOME_RANGES,
  SUB_CATEGORIES,
  PAYMENT_MODES,
  STATUS_MESSAGES,
} from "./utils/applicationConstants";
import type { FormState, ValidationErrors } from "./types";
import Image from "next/image";

export function ApplicationForm({
  initialSchemeId = 1,
  initialSchemeName = "Default-Scheme",
  initialMobileNumber = "1234567890",
  paymentQRCodeFileName = "",
}: {
  initialSchemeId?: number;
  initialSchemeName?: string;
  initialMobileNumber?: string;
  paymentQRCodeFileName?: string;
}) {
  const [state, setState] = useState<FormState>({
    mobile_number: initialMobileNumber,
    applicant_name: "",
    father_or_husband_name: "",
    dob: "",
    id_type: "",
    id_number: "",
    aadhar_number: "",
    permanent_address: "",
    permanent_address_pincode: "",
    postal_address: "",
    postal_address_pincode: "",
    email: "",
    annual_income: "",
    plot_category: "",
    sub_category: "",
    registration_fees: "",
    processing_fees: "",
    total_payable_amount: "",
    payment_mode: "",
    dd_id_or_transaction_id: "",
    dd_date_or_transaction_date: "",
    dd_amount_or_transaction_amount: "0.00",
    payer_account_holder_name: "",
    payer_bank_name: "",
    payment_proof: "",
    applicant_account_holder_name: "",
    applicant_account_number: "",
    applicant_bank_name: "",
    applicant_bank_branch_address: "",
    applicant_bank_ifsc: "",
    scheme_id: initialSchemeId,
    scheme_name: initialSchemeName,
  });

  const [submittedApplicationData, setSubmittedApplicationData] = useState<{
    mobile_number: string;
    application_number: string;
    scheme_name: string;
    scheme_id: number;
  } | null>(null);

  const [status, setStatus] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [step, setStep] = useState<number>(0);
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: string;
    file: File;
  } | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const today = new Date().toISOString().split("T")[0];

  const createApplication = api.application.create.useMutation({
    onSuccess: async (application) => {
      if (uploadedFile) {
        try {
          setStatus({
            type: "info",
            message: STATUS_MESSAGES.GETTING_UPLOAD_URL,
          });

          // Step 1: Get presigned URL from server
          const presignedUrlResponse =
            await getPresignedUrlMutation.mutateAsync({
              filename: uploadedFile.name,
              mimeType: uploadedFile.file.type,
              applicationNumber: application.application_number,
              schemeId: state.scheme_id,
            });

          if (!presignedUrlResponse.success) {
            throw new Error(STATUS_MESSAGES.ERROR_GETTING_URL);
          }

          setStatus({
            type: "info",
            message: STATUS_MESSAGES.UPLOADING,
          });

          // Step 2: Upload file directly to S3 using presigned URL
          const uploadResponse = await fetch(
            presignedUrlResponse.presignedUrl,
            {
              method: "PUT",
              headers: {
                "Content-Type": uploadedFile.file.type,
              },
              body: uploadedFile.file,
            },
          );

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error(
              "S3 upload failed:",
              uploadResponse.status,
              errorText,
            );
            throw new Error(
              STATUS_MESSAGES.ERROR_UPLOADING(uploadResponse.status),
            );
          }

          setStatus({
            type: "success",
            message: STATUS_MESSAGES.SUCCESS(
              String(application.application_number),
            ),
          });

          console.log(STATUS_MESSAGES.FILE_UPLOAD_SUCCESS);
        } catch (uploadError) {
          const errorMessage =
            uploadError instanceof Error
              ? uploadError.message
              : STATUS_MESSAGES.ERROR_UPLOAD;

          console.error("File upload error:", uploadError);

          setStatus({
            type: "error",
            message: errorMessage,
          });

          // Still show success for application creation
          setTimeout(() => {
            setSubmittedApplicationData({
              mobile_number: state.mobile_number,
              application_number: String(application.application_number),
              scheme_name: state.scheme_name,
              scheme_id: Number(state.scheme_id),
            });
          }, 2000);
          return;
        }
      } else {
        setStatus({
          type: "success",
          message: `Application submitted successfully without payment proof! Your application number is ${application.application_number}`,
        });
      }

      setTimeout(() => {
        setSubmittedApplicationData({
          mobile_number: state.mobile_number,
          application_number: String(application.application_number),
          scheme_name: state.scheme_name,
          scheme_id: Number(state.scheme_id),
        });
      }, 2000);
    },
    onError: (error) => {
      let message = "Failed to submit application";

      if (error.data?.code === "INTERNAL_SERVER_ERROR") {
        message = error.message;
      } else if (error.message) {
        message = error.message;
      }

      setStatus({
        type: "error",
        message,
      });
    },
  });

  // Add mutation for getting presigned URL
  const getPresignedUrlMutation =
    api.application.getPresignedUploadUrl.useMutation({
      onError: (error) => {
        console.error("Presigned URL error:", error);
      },
    });

  const onChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ): void =>
    setState((s: FormState) => ({ ...s, [e.target.name]: e.target.value }));

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      const error = validateFile(file);
      if (error) {
        setErrors((prev: ValidationErrors) => ({
          ...prev,
          payment_proof: error,
        }));
        return;
      }

      setState((s: FormState) => ({ ...s, payment_proof: file.name }));
      setUploadedFile({
        name: file.name,
        size: formatFileSize(file.size),
        file: file,
      });

      setErrors((prev: ValidationErrors) => ({ ...prev, payment_proof: "" }));
      setStatus({
        type: "success",
        message: STATUS_MESSAGES.FILE_SELECTED,
      });
    }
  };

  const validateStep = (currentStep: number): ValidationErrors => {
    return validateFormStep(currentStep, state);
  };

  const handleNext = (e?: React.FormEvent) => {
    e?.preventDefault();
    setStatus(null);

    const newErrors = validateStep(step);
    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      if (step < 2) setStep((s) => s + 1);
    }
  };

  const handleBack = (e?: React.FormEvent) => {
    e?.preventDefault();
    setStatus(null);
    setErrors({});
    if (step > 0) setStep((s) => s - 1);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    // Validate all steps
    let allErrors: ValidationErrors = {};
    for (let i = 0; i <= 2; i++) {
      const stepErrors = validateStep(i);
      allErrors = { ...allErrors, ...stepErrors };
    }

    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      // Find first step with errors
      for (let i = 0; i <= 2; i++) {
        const stepErrors = validateStep(i);
        if (Object.keys(stepErrors).length > 0) {
          setStep(i);
          setStatus({
            type: "error",
            message: `Please fix the errors in Step ${i + 1}`,
          });
          return;
        }
      }
      return;
    }

    const applicationData = {
      ...state,
      registration_fees: state.registration_fees || "0.00",
      processing_fees: state.processing_fees || "0.00",
      total_payable_amount: state.total_payable_amount || "0.00",
      dd_amount_or_transaction_amount:
        state.dd_amount_or_transaction_amount || "0.00",
    };

    try {
      await createApplication.mutateAsync(applicationData);
    } catch (error) {
      console.error("Application submission error:", error);
    }
  };

  const steps = ["Personal", "Payment", "Refund"];

  return (
    <div>
      {submittedApplicationData ? (
        <ApplicationLookup
          initialMobileNumber={submittedApplicationData.mobile_number}
          initialApplicationNumber={submittedApplicationData.application_number}
          initialSchemeName={submittedApplicationData.scheme_name}
          initialSchemeId={submittedApplicationData.scheme_id}
        />
      ) : (
        <form
          onSubmit={onSubmit}
          className="mx-auto w-full max-w-3xl space-y-4 p-3 sm:space-y-6 sm:p-4 md:p-6"
        >
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-base font-medium sm:text-lg">
              Application Form
            </div>
            <div className="text-xs text-gray-500 sm:text-sm">
              Step {step + 1} of {steps.length}: {steps[step]}
            </div>
          </div>

          <div className="h-2 w-full rounded bg-gray-200">
            <div
              className="h-2 rounded bg-blue-600 transition-all duration-300"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 sm:text-sm">
                Mobile
              </label>
              <p className="mt-1 text-xs sm:text-sm">{state.mobile_number}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 sm:text-sm">
                Scheme Name
              </label>
              <p className="mt-1 text-xs sm:text-sm">{state.scheme_name}</p>
            </div>
          </div>

          {step === 0 && (
            <section className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <div>
                  <label className="mb-1 block text-xs sm:text-sm">
                    <span className="text-red-500">*</span> Applicant name
                  </label>
                  <input
                    name="applicant_name"
                    value={state.applicant_name}
                    onChange={onChange}
                    className="w-full rounded border px-2 py-1.5 text-sm sm:px-3 sm:py-2"
                    placeholder="Full name"
                    required
                  />
                  {errors.applicant_name && (
                    <p className="mt-1 text-xs text-red-600 sm:text-sm">
                      {errors.applicant_name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs sm:text-sm">
                    <span className="text-red-500">*</span> Father / Husband
                    name
                  </label>
                  <input
                    name="father_or_husband_name"
                    value={state.father_or_husband_name}
                    onChange={onChange}
                    className="w-full rounded border px-2 py-1.5 text-sm sm:px-3 sm:py-2"
                    placeholder="Father or Husband name"
                    required
                  />
                  {errors.father_or_husband_name && (
                    <p className="mt-1 text-xs text-red-600 sm:text-sm">
                      {errors.father_or_husband_name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs sm:text-sm">
                    <span className="text-red-500">*</span> DOB
                  </label>
                  <input
                    name="dob"
                    type="date"
                    value={state.dob}
                    onChange={onChange}
                    max={today}
                    required
                    className="w-full rounded border px-2 py-1.5 text-sm sm:px-3 sm:py-2"
                  />
                  {errors.dob && (
                    <p className="mt-1 text-xs text-red-600 sm:text-sm">
                      {errors.dob}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs sm:text-sm">
                    <span className="text-red-500">*</span> Email
                  </label>
                  <input
                    name="email"
                    type="email"
                    value={state.email}
                    onChange={onChange}
                    className="w-full rounded border px-2 py-1.5 text-sm sm:px-3 sm:py-2"
                    placeholder="you@example.com"
                    required
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-600 sm:text-sm">
                      {errors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs sm:text-sm">
                    <span className="text-red-500">*</span> ID type
                  </label>
                  <select
                    name="id_type"
                    value={state.id_type}
                    onChange={onChange}
                    className="w-full rounded border px-2 py-1.5 text-sm sm:px-3 sm:py-2"
                    required
                  >
                    <option value="">Select</option>
                    {ID_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  {errors.id_type && (
                    <p className="mt-1 text-xs text-red-600 sm:text-sm">
                      {errors.id_type}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs sm:text-sm">
                    <span className="text-red-500">*</span> ID number
                  </label>
                  <input
                    name="id_number"
                    value={state.id_number}
                    onChange={onChange}
                    className="w-full rounded border px-2 py-1.5 text-sm sm:px-3 sm:py-2"
                    placeholder="ID number"
                    required
                  />
                  {errors.id_number && (
                    <p className="mt-1 text-xs text-red-600 sm:text-sm">
                      {errors.id_number}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs sm:text-sm">
                    <span className="text-red-500">*</span> Aadhar number
                  </label>
                  <input
                    name="aadhar_number"
                    value={state.aadhar_number}
                    onChange={onChange}
                    className="w-full rounded border px-2 py-1.5 text-sm sm:px-3 sm:py-2"
                    placeholder="Aadhar number"
                    required
                  />
                  {errors.aadhar_number && (
                    <p className="mt-1 text-xs text-red-600 sm:text-sm">
                      {errors.aadhar_number}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs sm:text-sm">
                    <span className="text-red-500">*</span> Permanent address
                  </label>
                  <textarea
                    name="permanent_address"
                    value={state.permanent_address}
                    onChange={onChange}
                    className="w-full rounded border px-2 py-1.5 text-sm sm:px-3 sm:py-2"
                    rows={2}
                    required
                  />
                  {errors.permanent_address && (
                    <p className="mt-1 text-xs text-red-600 sm:text-sm">
                      {errors.permanent_address}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs sm:text-sm">
                    <span className="text-red-500">*</span> Permanent address
                    pincode
                  </label>
                  <input
                    name="permanent_address_pincode"
                    value={state.permanent_address_pincode}
                    onChange={onChange}
                    className="w-full rounded border px-2 py-1.5 text-sm sm:px-3 sm:py-2"
                    required
                  />
                  {errors.permanent_address_pincode && (
                    <p className="mt-1 text-xs text-red-600 sm:text-sm">
                      {errors.permanent_address_pincode}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="flex items-center text-xs sm:text-sm">
                    <input
                      type="checkbox"
                      checked={
                        state.postal_address === state.permanent_address &&
                        state.postal_address_pincode ===
                          state.permanent_address_pincode
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setState((s: FormState) => ({
                            ...s,
                            postal_address: s.permanent_address,
                            postal_address_pincode: s.permanent_address_pincode,
                          }));
                        }
                      }}
                      className="mr-2"
                    />
                    Postal address is same as permanent address
                  </label>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs sm:text-sm">
                    <span className="text-red-500">*</span> Postal address
                  </label>
                  <textarea
                    name="postal_address"
                    value={state.postal_address}
                    onChange={onChange}
                    className="w-full rounded border px-2 py-1.5 text-sm sm:px-3 sm:py-2"
                    rows={2}
                    required
                  />
                  {errors.postal_address && (
                    <p className="mt-1 text-xs text-red-600 sm:text-sm">
                      {errors.postal_address}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs sm:text-sm">
                    <span className="text-red-500">*</span> Postal address
                    pincode
                  </label>
                  <input
                    name="postal_address_pincode"
                    value={state.postal_address_pincode}
                    onChange={onChange}
                    className="w-full rounded border px-2 py-1.5 text-sm sm:px-3 sm:py-2"
                    required
                  />
                  {errors.postal_address_pincode && (
                    <p className="mt-1 text-xs text-red-600 sm:text-sm">
                      {errors.postal_address_pincode}
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <div>
                  <label className="mb-1 block text-xs sm:text-sm">
                    <span className="text-red-500">*</span> Annual income
                  </label>
                  <select
                    name="annual_income"
                    value={state.annual_income}
                    onChange={(e) => {
                      const income = e.target.value;
                      const calculation = calculateFeesAndCategory(income);
                      if (calculation) {
                        setState((s: FormState) => ({
                          ...s,
                          annual_income: income,
                          plot_category: calculation.category,
                          registration_fees: calculation.registrationFees,
                          processing_fees: calculation.processingFees,
                          total_payable_amount: calculation.totalAmount,
                        }));
                      }
                    }}
                    className="w-full rounded border px-2 py-1.5 text-sm sm:px-3 sm:py-2"
                    required
                  >
                    <option value="">Select</option>
                    {INCOME_RANGES.map((income) => (
                      <option key={income.value} value={income.value}>
                        {income.label}
                      </option>
                    ))}
                  </select>
                  {errors.annual_income && (
                    <p className="mt-1 text-xs text-red-600 sm:text-sm">
                      {errors.annual_income}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs sm:text-sm">
                    Plot category
                  </label>
                  <p className="mt-1 text-xs sm:text-sm">
                    {state.plot_category || "-"}
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-xs sm:text-sm">
                    <span className="text-red-500">*</span> Sub category
                  </label>
                  <select
                    name="sub_category"
                    value={state.sub_category}
                    onChange={onChange}
                    className="w-full rounded border px-2 py-1.5 text-sm sm:px-3 sm:py-2"
                    required
                  >
                    <option value="">Select</option>
                    {SUB_CATEGORIES.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                  {errors.id_type && (
                    <p className="mt-1 text-xs text-red-600 sm:text-sm">
                      {errors.id_type}
                    </p>
                  )}
                  {errors.sub_category && (
                    <p className="mt-1 text-xs text-red-600 sm:text-sm">
                      {errors.sub_category}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs sm:text-sm">
                    Registration fees
                  </label>
                  <p className="w-full rounded border px-2 py-1.5 text-xs sm:text-sm">
                    ₹{state.registration_fees || "-"}
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-xs sm:text-sm">
                    Processing fees
                  </label>
                  <p className="w-full rounded border px-2 py-1.5 text-xs sm:text-sm">
                    ₹{state.processing_fees || "-"}
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-xs sm:text-sm">
                    Total payable amount
                  </label>
                  <p className="w-full rounded border px-2 py-1.5 text-xs sm:text-sm">
                    ₹{state.total_payable_amount || "-"}
                  </p>
                </div>
              </div>

              {paymentQRCodeFileName && (
                <div className="rounded-lg bg-white p-6 shadow-sm flex flex-col items-center gap-4">
                  <h2 className="text-xl font-semibold text-gray-900 text-center">
                    Payment QR Code
                  </h2>

                  {/* QR Image */}
                  <Image
                    src={paymentQRCodeFileName}
                    alt="Payment QR Code"
                    width={400}
                    height={200}
                    className="w-48 h-48 object-contain rounded-lg border shadow-sm 
                              sm:w-60 sm:h-60 md:w-72 md:h-72"
                  />

                  <p className="text-sm text-gray-600 text-center">
                    Scan the QR code to pay the scheme amount.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <div>
                  <label className="mb-1 block text-xs sm:text-sm">
                    <span className="text-red-500">*</span> Payment mode
                  </label>
                  <select
                    name="payment_mode"
                    value={state.payment_mode}
                    onChange={onChange}
                    className="w-full rounded border px-2 py-1.5 text-sm sm:px-3 sm:py-2"
                    required
                  >
                    <option value="">Select</option>
                    {PAYMENT_MODES.map((mode) => (
                      <option key={mode.value} value={mode.value}>
                        {mode.label}
                      </option>
                    ))}
                  </select>
                  {errors.payment_mode && (
                    <p className="mt-1 text-xs text-red-600 sm:text-sm">
                      {errors.payment_mode}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs sm:text-sm">
                    <span className="text-red-500">*</span> DD / Transaction ID
                  </label>
                  <input
                    name="dd_id_or_transaction_id"
                    value={state.dd_id_or_transaction_id}
                    onChange={onChange}
                    className="w-full rounded border px-2 py-1.5 text-sm sm:px-3 sm:py-2"
                    required
                  />
                  {errors.dd_id_or_transaction_id && (
                    <p className="mt-1 text-xs text-red-600 sm:text-sm">
                      {errors.dd_id_or_transaction_id}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs sm:text-sm">
                    <span className="text-red-500">*</span> DD / Transaction
                    date
                  </label>
                  <input
                    name="dd_date_or_transaction_date"
                    type="date"
                    value={state.dd_date_or_transaction_date}
                    onChange={onChange}
                    max={today}
                    className="w-full rounded border px-2 py-1.5 text-sm sm:px-3 sm:py-2"
                    required
                  />
                  {errors.dd_date_or_transaction_date && (
                    <p className="mt-1 text-xs text-red-600 sm:text-sm">
                      {errors.dd_date_or_transaction_date}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs sm:text-sm">
                    <span className="text-red-500">*</span> Amount
                  </label>
                  <input
                    name="dd_amount_or_transaction_amount"
                    type="number"
                    step="0.01"
                    value={state.dd_amount_or_transaction_amount}
                    onChange={onChange}
                    className="w-full rounded border px-2 py-1.5 text-sm sm:px-3 sm:py-2"
                    required
                  />
                  {errors.dd_amount && (
                    <p className="mt-1 text-xs text-red-600 sm:text-sm">
                      {errors.dd_amount}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs sm:text-sm">
                    <span className="text-red-500">*</span> Payer account holder
                    name
                  </label>
                  <input
                    name="payer_account_holder_name"
                    value={state.payer_account_holder_name}
                    onChange={onChange}
                    className="w-full rounded border px-2 py-1.5 text-sm sm:px-3 sm:py-2"
                    required
                  />
                  {errors.payer_account_holder_name && (
                    <p className="mt-1 text-xs text-red-600 sm:text-sm">
                      {errors.payer_account_holder_name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs sm:text-sm">
                    <span className="text-red-500">*</span> Payer bank name
                  </label>
                  <input
                    name="payer_bank_name"
                    value={state.payer_bank_name}
                    onChange={onChange}
                    className="w-full rounded border px-2 py-1.5 text-sm sm:px-3 sm:py-2"
                    required
                  />
                  {errors.payer_bank_name && (
                    <p className="mt-1 text-xs text-red-600 sm:text-sm">
                      {errors.payer_bank_name}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs sm:text-sm">
                    <span className="text-red-500">*</span> Payment proof
                  </label>
                  <div className="mt-2">
                    <input
                      type="file"
                      onChange={onFileChange}
                      className="block w-full text-xs text-gray-500 file:mr-3 file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100 sm:text-sm sm:file:mr-4 sm:file:px-4 sm:file:py-2 sm:file:text-sm"
                      accept=".pdf,.jpg,.jpeg,.png"
                      required
                    />
                  </div>
                  {errors.payment_proof && (
                    <p className="mt-1 text-xs text-red-600 sm:text-sm">
                      {errors.payment_proof}
                    </p>
                  )}
                  {uploadedFile && (
                    <div className="mt-2 rounded border border-green-200 bg-green-50 p-2 sm:p-3">
                      <div className="text-xs text-green-800 sm:text-sm">
                        <div className="font-medium">✓ File uploaded</div>
                        <div className="mt-1">Name: {uploadedFile.name}</div>
                        <div>Size: {uploadedFile.size}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-3 sm:space-y-4">
              <div className="mb-3 text-xs text-gray-700 sm:mb-4 sm:text-sm">
                Please provide the applicant bank account details for refund
                purposes. Ensure that the information is accurate to avoid any
                delays in processing refunds.
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <div>
                  <label className="mb-1 block text-xs sm:text-sm">
                    <span className="text-red-500">*</span> Account holder name
                  </label>
                  <input
                    name="applicant_account_holder_name"
                    value={state.applicant_account_holder_name}
                    onChange={onChange}
                    className="w-full rounded border px-2 py-1.5 text-sm sm:px-3 sm:py-2"
                    required
                  />
                  {errors.applicant_account_holder_name && (
                    <p className="mt-1 text-xs text-red-600 sm:text-sm">
                      {errors.applicant_account_holder_name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs sm:text-sm">
                    <span className="text-red-500">*</span> Account number
                  </label>
                  <input
                    name="applicant_account_number"
                    value={state.applicant_account_number}
                    onChange={onChange}
                    className="w-full rounded border px-2 py-1.5 text-sm sm:px-3 sm:py-2"
                    required
                  />
                  {errors.applicant_account_number && (
                    <p className="mt-1 text-xs text-red-600 sm:text-sm">
                      {errors.applicant_account_number}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs sm:text-sm">
                    <span className="text-red-500">*</span> Bank name
                  </label>
                  <input
                    name="applicant_bank_name"
                    value={state.applicant_bank_name}
                    onChange={onChange}
                    className="w-full rounded border px-2 py-1.5 text-sm sm:px-3 sm:py-2"
                    required
                  />
                  {errors.applicant_bank_name && (
                    <p className="mt-1 text-xs text-red-600 sm:text-sm">
                      {errors.applicant_bank_name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs sm:text-sm">
                    <span className="text-red-500">*</span> Bank branch address
                  </label>
                  <input
                    name="applicant_bank_branch_address"
                    value={state.applicant_bank_branch_address}
                    onChange={onChange}
                    className="w-full rounded border px-2 py-1.5 text-sm sm:px-3 sm:py-2"
                    required
                  />
                  {errors.applicant_bank_branch_address && (
                    <p className="mt-1 text-xs text-red-600 sm:text-sm">
                      {errors.applicant_bank_branch_address}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs sm:text-sm">
                    <span className="text-red-500">*</span> Bank IFSC
                  </label>
                  <input
                    name="applicant_bank_ifsc"
                    value={state.applicant_bank_ifsc}
                    onChange={onChange}
                    className="w-full rounded border px-2 py-1.5 text-sm sm:px-3 sm:py-2"
                    required
                  />
                  {errors.applicant_bank_ifsc && (
                    <p className="mt-1 text-xs text-red-600 sm:text-sm">
                      {errors.applicant_bank_ifsc}
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {step > 0 && (
                <button
                  onClick={handleBack}
                  className="w-full rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300 sm:w-auto"
                  type="button"
                >
                  Back
                </button>
              )}
            </div>

            <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
              {step < 2 && (
                <button
                  onClick={handleNext}
                  className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 sm:w-auto"
                  type="button"
                >
                  Next
                </button>
              )}

              {step === 2 && (
                <button
                  type="submit"
                  className="w-full rounded bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 sm:w-auto"
                >
                  Submit
                </button>
              )}
            </div>
          </div>

          {status && (
            <div
              className={`rounded-md p-2 text-xs font-medium sm:p-3 sm:text-sm ${
                status.type === "success"
                  ? "bg-green-100 text-green-800"
                  : status.type === "error"
                    ? "bg-red-100 text-red-800"
                    : "bg-blue-100 text-blue-800"
              }`}
            >
              {status.message}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
