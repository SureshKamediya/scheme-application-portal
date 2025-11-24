"use client";

import React, { useState } from "react";
import { api } from "~/trpc/react";
import { validateFile, formatFileSize } from "~/utils/fileUpload";
import { ApplicationLookup } from "./applicationLookup";

type FormState = {
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

type ValidationErrors = Record<string, string>;

export function ApplicationForm({
  initialSchemeId = 1,
  initialSchemeName = "Default-Scheme",
  initialMobileNumber = "1234567890",
}: {
  initialSchemeId?: number;
  initialSchemeName?: string;
  initialMobileNumber?: string;
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

  const createApplication = api.application.create.useMutation({
    onSuccess: async (application) => {
      if (uploadedFile) {
        try {
          setStatus({
            type: "info",
            message: "Getting upload URL...",
          });

          // const fileBuffer = await new Promise<string>((resolve, reject) => {
          //   const reader = new FileReader();
          //   reader.onload = () => {
          //     const result = reader.result as string;
          //     const base64Content = result.split(",")[1] ?? "";
          //     resolve(base64Content);
          //   };
          //   reader.onerror = () => reject(new Error("Failed to read file"));
          //   reader.readAsDataURL(uploadedFile.file);
          // });

          // const uploadResult = await uploadPaymentProof.mutateAsync({
          //   applicationNumber: application.application_number,
          //   schemeName: state.scheme_name,
          //   schemeId: state.scheme_id,
          //   filename: uploadedFile.name,
          //   fileBuffer: fileBuffer,
          //   mimeType: uploadedFile.file.type,
          // });

          // Step 1: Get presigned URL from server
          const presignedUrlResponse =
            await getPresignedUrlMutation.mutateAsync({
              filename: uploadedFile.name,
              mimeType: uploadedFile.file.type,
              applicationNumber: application.application_number,
              schemeId: state.scheme_id,
            });

          if (!presignedUrlResponse.success) {
            throw new Error("Failed to get presigned URL");
          }

          setStatus({
            type: "info",
            message: "Uploading payment proof to cloud storage...",
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
              `Failed to upload file to S3: ${uploadResponse.status}`,
            );
          }

          setStatus({
            type: "success",
            message: `Application submitted successfully! Your application number is ${application.application_number}`,
          });

          console.log("File uploaded successfully to S3");
        } catch (uploadError) {
          const errorMessage =
            uploadError instanceof Error
              ? uploadError.message
              : "File upload failed";

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

  // const uploadPaymentProof = api.application.uploadPaymentProof.useMutation();
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
  ) => setState((s) => ({ ...s, [e.target.name]: e.target.value }));

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const error = validateFile(file);
      if (error) {
        setErrors((prev) => ({ ...prev, payment_proof: error }));
        return;
      }

      setState((s) => ({ ...s, payment_proof: file.name }));
      setUploadedFile({
        name: file.name,
        size: formatFileSize(file.size),
        file: file,
      });

      setErrors((prev) => ({ ...prev, payment_proof: "" }));
      setStatus({
        type: "success",
        message: "Payment proof file selected.",
      });
    }
  };

  const validateStep = (currentStep: number): ValidationErrors => {
    const newErrors: ValidationErrors = {};

    const onlyAlpha = /^[A-Za-z\s]+$/;
    const onlyAlphanumeric = /^[A-Za-z0-9\s]+$/;
    const mobileRegex = /^\d{10}$/;
    const pincodeRegex = /^\d{6}$/;
    const aadharRegex = /^\d{12}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (currentStep === 0) {
      if (!state.applicant_name.trim()) {
        newErrors.applicant_name = "Applicant name is required";
      } else if (!onlyAlpha.test(state.applicant_name)) {
        newErrors.applicant_name = "Applicant name should contain only letters";
      }

      if (!state.father_or_husband_name.trim()) {
        newErrors.father_or_husband_name = "Father/Husband name is required";
      } else if (!onlyAlpha.test(state.father_or_husband_name)) {
        newErrors.father_or_husband_name =
          "Father/Husband name should contain only letters";
      }

      if (!state.dob) {
        newErrors.dob = "Date of birth is required";
      }

      if (!mobileRegex.test(state.mobile_number)) {
        newErrors.mobile_number = "Mobile number must be 10 digits";
      }

      if (!state.email.trim()) {
        newErrors.email = "Email is required";
      } else if (!emailRegex.test(state.email)) {
        newErrors.email = "Please enter a valid email address";
      }

      if (!state.id_type.trim()) {
        newErrors.id_type = "ID type is required";
      }

      if (!state.id_number.trim()) {
        newErrors.id_number = "ID number is required";
      } else if (!onlyAlphanumeric.test(state.id_number)) {
        newErrors.id_number = "ID number should be alphanumeric";
      } else if (state.id_number.trim().length > 20) {
        newErrors.id_number = "ID number is too long-max 20 characters allowed";
      }

      if (!state.aadhar_number.trim()) {
        newErrors.aadhar_number = "Aadhar number is required";
      } else if (!aadharRegex.test(state.aadhar_number.toUpperCase())) {
        newErrors.aadhar_number =
          "Enter a valid Aadhar number, it must be 12 digits";
      }

      if (!state.permanent_address.trim()) {
        newErrors.permanent_address = "Permanent address is required";
      }

      if (!state.permanent_address_pincode.trim()) {
        newErrors.permanent_address_pincode =
          "Permanent address pincode is required";
      } else if (!pincodeRegex.test(state.permanent_address_pincode)) {
        newErrors.permanent_address_pincode =
          "Permanent address pincode must be 6 digits";
      }

      if (!state.postal_address.trim()) {
        newErrors.postal_address = "Postal address is required";
      }

      if (!state.postal_address_pincode.trim()) {
        newErrors.postal_address_pincode = "Postal address pincode is required";
      } else if (!pincodeRegex.test(state.postal_address_pincode)) {
        newErrors.postal_address_pincode =
          "Postal address pincode must be 6 digits";
      }
    }

    if (currentStep === 1) {
      if (!state.annual_income.trim()) {
        newErrors.annual_income = "Annual income is required";
      }

      if (!state.payment_mode.trim()) {
        newErrors.payment_mode = "Payment mode is required";
      }

      if (!state.dd_id_or_transaction_id.trim()) {
        newErrors.dd_id_or_transaction_id = "DD/Transaction ID is required";
      } else if (!onlyAlphanumeric.test(state.dd_id_or_transaction_id)) {
        newErrors.dd_id_or_transaction_id =
          "DD/Transaction ID should be alphanumeric";
      }

      if (!state.dd_date_or_transaction_date) {
        newErrors.dd_date_or_transaction_date =
          "DD/Transaction date is required";
      }

      if (
        !state.dd_amount_or_transaction_amount ||
        Number(state.dd_amount_or_transaction_amount) <= 0
      ) {
        newErrors.dd_amount_or_transaction_amount =
          "Enter a valid payment amount";
      } else if (
        Number(state.dd_amount_or_transaction_amount) !==
        Number(state.total_payable_amount)
      ) {
        newErrors.dd_amount_or_transaction_amount = `Payment amount must be ₹${state.total_payable_amount}`;
      }

      if (!state.payer_account_holder_name.trim()) {
        newErrors.payer_account_holder_name =
          "Payer account holder name is required";
      } else if (!onlyAlpha.test(state.payer_account_holder_name)) {
        newErrors.payer_account_holder_name =
          "Payer account holder name should contain only letters";
      }

      if (!state.payer_bank_name.trim()) {
        newErrors.payer_bank_name = "Payer bank name is required";
      } else if (!onlyAlpha.test(state.payer_bank_name)) {
        newErrors.payer_bank_name =
          "Payer bank name should contain only letters";
      }

      if (!state.payment_proof.trim()) {
        newErrors.payment_proof = "Payment proof is required";
      }
    }

    if (currentStep === 2) {
      if (!state.applicant_account_holder_name.trim()) {
        newErrors.applicant_account_holder_name =
          "Applicant account holder name is required";
      } else if (!onlyAlpha.test(state.applicant_account_holder_name)) {
        newErrors.applicant_account_holder_name =
          "Applicant account holder name should contain only letters";
      }

      if (!state.applicant_account_number.trim()) {
        newErrors.applicant_account_number =
          "Applicant account number is required";
      } else if (!onlyAlphanumeric.test(state.applicant_account_number)) {
        newErrors.applicant_account_number =
          "Applicant account number should be alphanumeric";
      }

      if (!state.applicant_bank_name.trim()) {
        newErrors.applicant_bank_name = "Applicant bank name is required";
      } else if (!onlyAlpha.test(state.applicant_bank_name)) {
        newErrors.applicant_bank_name =
          "Applicant bank name should contain only letters";
      }

      if (!state.applicant_bank_branch_address.trim()) {
        newErrors.applicant_bank_branch_address =
          "Applicant bank branch address is required";
      }

      if (!state.applicant_bank_ifsc.trim()) {
        newErrors.applicant_bank_ifsc = "Applicant bank IFSC is required";
      } else if (!onlyAlphanumeric.test(state.applicant_bank_ifsc)) {
        newErrors.applicant_bank_ifsc =
          "Applicant bank IFSC should be alphanumeric";
      } else if (state.applicant_bank_ifsc.trim().length > 11) {
        newErrors.applicant_bank_ifsc =
          "Applicant bank IFSC is too long-max 11 characters allowed";
      }
    }

    return newErrors;
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
                  >
                    <option value="">Select</option>
                    <option value="aadhaar">Pan Card</option>
                    <option value="voter">Voter ID</option>
                    <option value="driving">Driving License</option>
                    <option value="rationCard">Ration Card</option>
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
                          setState((s) => ({
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
                      let category = "";
                      let regFees = "";

                      if (income === "0-3 lakh") {
                        category = "EWS";
                        regFees = "10000.00";
                      } else if (income === "3-6 lakh") {
                        category = "LIG";
                        regFees = "20000.00";
                      }

                      setState((s) => ({
                        ...s,
                        annual_income: income,
                        plot_category: category,
                        registration_fees: regFees,
                        processing_fees: "500.00",
                        total_payable_amount: regFees
                          ? String(Number(regFees) + 500.0)
                          : "",
                      }));
                    }}
                    className="w-full rounded border px-2 py-1.5 text-sm sm:px-3 sm:py-2"
                  >
                    <option value="">Select</option>
                    <option value="0-3 lakh">0 to 3 lakh</option>
                    <option value="3-6 lakh">3 to 6 lakh</option>
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
                    Sub category
                  </label>
                  <select
                    name="sub_category"
                    value={state.sub_category}
                    onChange={onChange}
                    className="w-full rounded border px-2 py-1.5 text-sm sm:px-3 sm:py-2"
                  >
                    <option value="">Select</option>
                    <option value="unReserved">Un-Reserved</option>
                    <option value="unReservedDestituteAndLandlessSingle">
                      Un-Reserved(Destitute & Landless Single)
                    </option>
                    <option value="unReservedHandicapped">
                      Un-Reserved Handicapped
                    </option>
                    <option value="governmentEmployees">
                      Government Employees
                    </option>
                    <option value="journalist">Journalist</option>
                    <option value="otherSoldiers">
                      Other Soldiers(including ex-servicemen)
                    </option>
                    <option value="scheduledCaste">Scheduled Caste</option>
                    <option value="scheduledTribe">Scheduled Tribe</option>
                    <option value="soldierHandicapped">
                      Soldier Handicapped
                    </option>
                    <option value="soldierWidowAndDependent">
                      Soldier(Widow & Dependent)
                    </option>
                    <option value="transgender">Transgender</option>
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
                  <p className="mt-1 text-xs sm:text-sm">
                    ₹{state.registration_fees || "-"}
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-xs sm:text-sm">
                    Processing fees
                  </label>
                  <p className="mt-1 text-xs sm:text-sm">
                    ₹{state.processing_fees || "-"}
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs sm:text-sm">
                    Total payable amount
                  </label>
                  <p className="mt-1 text-xs font-semibold sm:text-sm">
                    ₹{state.total_payable_amount || "-"}
                  </p>
                </div>
              </div>

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
                  >
                    <option value="">Select</option>
                    <option value="dd">DD</option>
                    <option value="upi">UPI</option>
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
                    className="w-full rounded border px-2 py-1.5 text-sm sm:px-3 sm:py-2"
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
                Please provide your bank account details for refund purposes.
                Ensure that the information is accurate to avoid any delays in
                processing refunds.
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
