"use client";

import React, { useState } from "react";
import { api } from "~/trpc/react";
import { validateFile, formatFileSize } from "~/utils/fileUpload";

type FormState = {
  mobile_number: string;
  applicant_name: string;
  father_or_husband_name: string;
  dob: string;
  id_type: string;
  id_number: string;
  pan_number: string;
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
  dd_amount: string;
  payee_account_holder_name: string;
  payee_bank_name: string;
  payment_proof: string;
  refund_account_holder_name: string;
  refund_account_number: string;
  refund_bank_name: string;
  refund_bank_branch_address: string;
  refund_bank_ifsc: string;
  scheme_id: number;
  scheme_name: string;
};

type ValidationErrors = Record<string, string>;

export function ApplicationForm({
  initialSchemeId = 1,
  initialSchemeName = "Default-Scheme",
  initialMobileNumber = "1234567890"
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
    pan_number: "",
    permanent_address: "",
    permanent_address_pincode: "",
    postal_address: "",
    postal_address_pincode: "",
    email: "",
    annual_income: "",
    plot_category: "",
    registration_fees: "",
    processing_fees: "",
    total_payable_amount: "",
    payment_mode: "",
    dd_id_or_transaction_id: "",
    dd_date_or_transaction_date: "",
    dd_amount: "0.00",
    payee_account_holder_name: "",
    payee_bank_name: "",
    payment_proof: "",
    refund_account_holder_name: "",
    refund_account_number: "",
    refund_bank_name: "",
    refund_bank_branch_address: "",
    refund_bank_ifsc: "",
    scheme_id: initialSchemeId,
    scheme_name: initialSchemeName
  });

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
            message: "Uploading payment proof to cloud storage...",
          });

          const fileBuffer = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              const base64Content = result.split(",")[1] ?? "";
              resolve(base64Content);
            };
            reader.onerror = () => reject(new Error("Failed to read file"));
            reader.readAsDataURL(uploadedFile.file);
          });

          const uploadResult = await uploadPaymentProof.mutateAsync({
            applicationId: application.application_number,
            schemeName: state.scheme_name,
            schemeId: state.scheme_id,
            filename: uploadedFile.name,
            fileBuffer: fileBuffer,
            mimeType: uploadedFile.file.type,
          });

          setStatus({
            type: "success",
            message: `Application submitted and payment proof uploaded successfully! Your application number is ${application.application_number}`,
          });

          console.log("S3 Upload Result:", uploadResult);
        } catch (uploadError) {
          console.error("File upload error:", uploadError);
          setStatus({
            type: "success",
            message: `Application submitted successfully! (Payment Proof file upload pending) Your application number is ${application.application_number}`,
          });
        }
      } else {
        setStatus({
          type: "success",
          message: `Application submitted successfully without payment proof file! Your application number is ${application.application_number}`,
        });
      }

      setTimeout(() => {
        const params = new URLSearchParams();
        params.set("mobile", state.mobile_number);
        params.set("appNum", String(application.application_number));
        params.set("schemeName", state.scheme_name);
        params.set("schemeId", String(state.scheme_id));
        window.location.href = `/application-lookup?${params.toString()}`;
      }, 2500);
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

  const uploadPaymentProof = api.application.uploadPaymentProof.useMutation();

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setState((s) => ({ ...s, [e.target.name]: e.target.value }));

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
        message: "Payment proof file selected. Will be uploaded after application submission.",
      });
    }
  };

  const validateStep = (currentStep: number): ValidationErrors => {
    const newErrors: ValidationErrors = {};
    
    const onlyAlpha = /^[A-Za-z\s]+$/;
    const onlyAlphanumeric = /^[A-Za-z0-9\s]+$/;
    const mobileRegex = /^\d{10}$/;
    const pincodeRegex = /^\d{6}$/;
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
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
        newErrors.father_or_husband_name = "Father/Husband name should contain only letters";
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
      } else if(state.id_number.trim().length > 20){
        newErrors.id_number = "ID number is too long-max 20 characters allowed";
      }

      if (!state.pan_number.trim()) {
        newErrors.pan_number = "PAN number is required";
      } else if (!panRegex.test(state.pan_number.toUpperCase())) {
        newErrors.pan_number = "Enter a valid PAN number (e.g., ABCDE1234F)";
      }

      if (!state.permanent_address.trim()) {
        newErrors.permanent_address = "Permanent address is required";
      }

      if(!state.permanent_address_pincode.trim()) {
        newErrors.permanent_address_pincode = "Permanent address pincode is required";
      } else if (!pincodeRegex.test(state.permanent_address_pincode)) {
        newErrors.permanent_address_pincode = "Permanent address pincode must be 6 digits";
      }

      if (!state.postal_address.trim()) {
        newErrors.postal_address = "Postal address is required";
      }

      if(!state.postal_address_pincode.trim()) {  
        newErrors.postal_address_pincode = "Postal address pincode is required";
      } else if (!pincodeRegex.test(state.postal_address_pincode)) {
        newErrors.postal_address_pincode = "Postal address pincode must be 6 digits";
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
        newErrors.dd_id_or_transaction_id = "DD/Transaction ID should be alphanumeric";
      }

      if (!state.dd_date_or_transaction_date) {
        newErrors.dd_date_or_transaction_date = "DD/Transaction date is required";
      }

      if (!state.dd_amount || Number(state.dd_amount) <= 0) {
        newErrors.dd_amount = "Enter a valid payment amount";
      } else if (Number(state.dd_amount) !== Number(state.total_payable_amount)) {
        newErrors.dd_amount = `Payment amount must be ₹${state.total_payable_amount}`;
      }

      if (!state.payee_account_holder_name.trim()) {
        newErrors.payee_account_holder_name = "Payer account holder name is required";
      } else if (!onlyAlpha.test(state.payee_account_holder_name)) {
        newErrors.payee_account_holder_name = "Payer account holder name should contain only letters";
      }

      if (!state.payee_bank_name.trim()) {
        newErrors.payee_bank_name = "Payer bank name is required";
      } else if (!onlyAlpha.test(state.payee_bank_name)) {
        newErrors.payee_bank_name = "Payer bank name should contain only letters";
      }

      if (!state.payment_proof.trim()) {
        newErrors.payment_proof = "Payment proof is required";
      }
    }

    if (currentStep === 2) {
      if (!state.refund_account_holder_name.trim()) {
        newErrors.refund_account_holder_name = "Refund account holder name is required";
      } else if (!onlyAlpha.test(state.refund_account_holder_name)) {
        newErrors.refund_account_holder_name = "Refund account holder name should contain only letters";
      }

      if (!state.refund_account_number.trim()) {
        newErrors.refund_account_number = "Refund account number is required";
      } else if (!onlyAlphanumeric.test(state.refund_account_number)) {
        newErrors.refund_account_number = "Refund account number should be alphanumeric";
      }

      if (!state.refund_bank_name.trim()) {
        newErrors.refund_bank_name = "Refund bank name is required";
      } else if (!onlyAlpha.test(state.refund_bank_name)) {
        newErrors.refund_bank_name = "Refund bank name should contain only letters";
      }

      if (!state.refund_bank_branch_address.trim()) {
        newErrors.refund_bank_branch_address = "Refund bank branch address is required";
      }

      if (!state.refund_bank_ifsc.trim()) {
        newErrors.refund_bank_ifsc = "Refund bank IFSC is required";
      } else if (!onlyAlphanumeric.test(state.refund_bank_ifsc)) {
        newErrors.refund_bank_ifsc = "Refund bank IFSC should be alphanumeric";
      } else if(state.refund_bank_ifsc.trim().length > 11){
        newErrors.refund_bank_ifsc = "Refund bank IFSC is too long-max 11 characters allowed";
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
      dd_amount: state.dd_amount || "0.00",
    };

    try {
      await createApplication.mutateAsync(applicationData);
    } catch (error) {
      console.error("Application submission error:", error);
    }
  };

  const steps = ["Personal", "Payment", "Refund"];

  return (
    <form onSubmit={onSubmit} className="w-full max-w-3xl mx-auto space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
        <div className="text-base sm:text-lg font-medium">Application Form</div>
        <div className="text-xs sm:text-sm text-gray-500">Step {step + 1} of {steps.length}: {steps[step]}</div>
      </div>

      <div className="w-full bg-gray-200 rounded h-2">
        <div
          className="bg-blue-600 h-2 rounded transition-all duration-300"
          style={{ width: `${((step + 1) / steps.length) * 100}%` }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700">Mobile</label>
          <p className="mt-1 text-xs sm:text-sm">{state.mobile_number}</p>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700">Scheme Name</label>
          <p className="mt-1 text-xs sm:text-sm">{state.scheme_name}</p>
        </div>
      </div>

      {step === 0 && (
        <section className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm mb-1"><span className="text-red-500">*</span> Applicant name</label>
              <input
                name="applicant_name"
                value={state.applicant_name}
                onChange={onChange}
                className="w-full border rounded px-2 sm:px-3 py-1.5 sm:py-2 text-sm"
                placeholder="Full name"
              />
              {errors.applicant_name && (
                <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.applicant_name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm mb-1"><span className="text-red-500">*</span> Father / Husband name</label>
              <input
                name="father_or_husband_name"
                value={state.father_or_husband_name}
                onChange={onChange}
                className="w-full border rounded px-2 sm:px-3 py-1.5 sm:py-2 text-sm"
                placeholder="Father or Husband name"
              />
              {errors.father_or_husband_name && (
                <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.father_or_husband_name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm mb-1"><span className="text-red-500">*</span> DOB</label>
              <input
                name="dob"
                type="date"
                value={state.dob}
                onChange={onChange}
                className="w-full border rounded px-2 sm:px-3 py-1.5 sm:py-2 text-sm"
              />
              {errors.dob && (
                <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.dob}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm mb-1"><span className="text-red-500">*</span> Email</label>
              <input
                name="email"
                type="email"
                value={state.email}
                onChange={onChange}
                className="w-full border rounded px-2 sm:px-3 py-1.5 sm:py-2 text-sm"
                placeholder="you@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm mb-1"><span className="text-red-500">*</span> ID type</label>
              <select
                name="id_type"
                value={state.id_type}
                onChange={onChange}
                className="w-full border rounded px-2 sm:px-3 py-1.5 sm:py-2 text-sm"
              >
                <option value="">Select</option>
                <option value="aadhaar">Aadhaar</option>
                <option value="voter">Voter ID</option>
                <option value="passport">Passport</option>
                <option value="driving">Driving License</option>
              </select>
              {errors.id_type && (
                <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.id_type}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm mb-1"><span className="text-red-500">*</span> ID number</label>
              <input
                name="id_number"
                value={state.id_number}
                onChange={onChange}
                className="w-full border rounded px-2 sm:px-3 py-1.5 sm:py-2 text-sm"
                placeholder="ID number"
              />
              {errors.id_number && (
                <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.id_number}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm mb-1"><span className="text-red-500">*</span> PAN number</label>
              <input
                name="pan_number"
                value={state.pan_number}
                onChange={onChange}
                className="w-full border rounded px-2 sm:px-3 py-1.5 sm:py-2 text-sm"
                placeholder="PAN number"
              />
              {errors.pan_number && (
                <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.pan_number}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm mb-1"><span className="text-red-500">*</span> Permanent address</label>
              <textarea
                name="permanent_address"
                value={state.permanent_address}
                onChange={onChange}
                className="w-full border rounded px-2 sm:px-3 py-1.5 sm:py-2 text-sm"
                rows={2}
              />
              {errors.permanent_address && (
                <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.permanent_address}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm mb-1"><span className="text-red-500">*</span> Permanent address pincode</label>
              <input
                name="permanent_address_pincode"
                value={state.permanent_address_pincode}
                onChange={onChange}
                className="w-full border rounded px-2 sm:px-3 py-1.5 sm:py-2 text-sm"
              />
              {errors.permanent_address_pincode && (
                <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.permanent_address_pincode}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center text-xs sm:text-sm">
                <input
                  type="checkbox"
                  checked={state.postal_address === state.permanent_address && state.postal_address_pincode === state.permanent_address_pincode}
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
              <label className="block text-xs sm:text-sm mb-1"><span className="text-red-500">*</span> Postal address</label>
              <textarea
                name="postal_address"
                value={state.postal_address}
                onChange={onChange}
                className="w-full border rounded px-2 sm:px-3 py-1.5 sm:py-2 text-sm"
                rows={2}
              />
              {errors.postal_address && (
                <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.postal_address}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm mb-1"><span className="text-red-500">*</span> Postal address pincode</label>
              <input
                name="postal_address_pincode"
                value={state.postal_address_pincode}
                onChange={onChange}
                className="w-full border rounded px-2 sm:px-3 py-1.5 sm:py-2 text-sm"
              />
              {errors.postal_address_pincode && (
                <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.postal_address_pincode}</p>
              )}
            </div>
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm mb-1"><span className="text-red-500">*</span> Annual income</label>
              <select
                name="annual_income"
                value={state.annual_income}
                onChange={(e) => {
                  const income = e.target.value;
                  let category = "";
                  let regFees = "";
                  
                  if (income === "0-3 lakh") {
                    category = "LIG";
                    regFees = "10000.00";
                  } else if (income === "3-6 lakh") {
                    category = "EWS";
                    regFees = "20000.00";
                  }
                  
                  setState((s) => ({
                    ...s,
                    annual_income: income,
                    plot_category: category,
                    registration_fees: regFees,
                    processing_fees: "500.00",
                    total_payable_amount: regFees ? String(Number(regFees) + 500.00) : "",
                  }));
                }}
                className="w-full border rounded px-2 sm:px-3 py-1.5 sm:py-2 text-sm"
              >
                <option value="">Select</option>
                <option value="0-3 lakh">0 to 3 lakh</option>
                <option value="3-6 lakh">3 to 6 lakh</option>
              </select>
              {errors.annual_income && (
                <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.annual_income}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm mb-1">Plot category</label>
              <p className="mt-1 text-xs sm:text-sm">{state.plot_category || "-"}</p>
            </div>

            <div>
              <label className="block text-xs sm:text-sm mb-1">Registration fees</label>
              <p className="mt-1 text-xs sm:text-sm">₹{state.registration_fees || "-"}</p>
            </div>

            <div>
              <label className="block text-xs sm:text-sm mb-1">Processing fees</label>
              <p className="mt-1 text-xs sm:text-sm">₹{state.processing_fees || "-"}</p>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm mb-1">Total payable amount</label>
              <p className="mt-1 text-xs sm:text-sm font-semibold">₹{state.total_payable_amount || "-"}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm mb-1"><span className="text-red-500">*</span> Payment mode</label>
              <select
                name="payment_mode"
                value={state.payment_mode}
                onChange={onChange}
                className="w-full border rounded px-2 sm:px-3 py-1.5 sm:py-2 text-sm"
              >
                <option value="">Select</option>
                <option value="dd">DD</option>
                <option value="netbanking">Netbanking</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
              </select>
              {errors.payment_mode && (
                <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.payment_mode}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm mb-1"><span className="text-red-500">*</span> DD / Transaction ID</label>
              <input
                name="dd_id_or_transaction_id"
                value={state.dd_id_or_transaction_id}
                onChange={onChange}
                className="w-full border rounded px-2 sm:px-3 py-1.5 sm:py-2 text-sm"
              />
              {errors.dd_id_or_transaction_id && (
                <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.dd_id_or_transaction_id}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm mb-1"><span className="text-red-500">*</span> DD / Transaction date</label>
              <input
                name="dd_date_or_transaction_date"
                type="date"
                value={state.dd_date_or_transaction_date}
                onChange={onChange}
                className="w-full border rounded px-2 sm:px-3 py-1.5 sm:py-2 text-sm"
              />
              {errors.dd_date_or_transaction_date && (
                <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.dd_date_or_transaction_date}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm mb-1"><span className="text-red-500">*</span> Amount</label>
              <input
                name="dd_amount"
                type="number"
                step="0.01"
                value={state.dd_amount}
                onChange={onChange}
                className="w-full border rounded px-2 sm:px-3 py-1.5 sm:py-2 text-sm"
              />
              {errors.dd_amount && (
                <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.dd_amount}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm mb-1"><span className="text-red-500">*</span> Payer account holder name</label>
              <input
                name="payee_account_holder_name"
                value={state.payee_account_holder_name}
                onChange={onChange}
                className="w-full border rounded px-2 sm:px-3 py-1.5 sm:py-2 text-sm"
              />
              {errors.payee_account_holder_name && (
                <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.payee_account_holder_name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm mb-1"><span className="text-red-500">*</span> Payer bank name</label>
              <input
                name="payee_bank_name"
                value={state.payee_bank_name}
                onChange={onChange}
                className="w-full border rounded px-2 sm:px-3 py-1.5 sm:py-2 text-sm"
              />
              {errors.payee_bank_name && (
                <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.payee_bank_name}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm mb-1"><span className="text-red-500">*</span> Payment proof</label>
              <div className="mt-2">
                <input
                  type="file"
                  onChange={onFileChange}
                  className="block w-full text-xs sm:text-sm text-gray-500 file:mr-3 sm:file:mr-4 file:py-1.5 sm:file:py-2 file:px-3 sm:file:px-4 file:rounded file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  accept=".pdf,.jpg,.jpeg,.png"
                />
              </div>
              {errors.payment_proof && (
                <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.payment_proof}</p>
              )}
              {uploadedFile && (
                <div className="mt-2 p-2 sm:p-3 bg-green-50 border border-green-200 rounded">
                  <div className="text-xs sm:text-sm text-green-800">
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
          <div className="text-xs sm:text-sm text-gray-700 mb-3 sm:mb-4">
            Please provide your bank account details for refund purposes. Ensure that the information is accurate to avoid any delays in processing refunds.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm mb-1"><span className="text-red-500">*</span> Account holder name</label>
              <input
                name="refund_account_holder_name"
                value={state.refund_account_holder_name}
                onChange={onChange}
                className="w-full border rounded px-2 sm:px-3 py-1.5 sm:py-2 text-sm"
              />
              {errors.refund_account_holder_name && (
                <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.refund_account_holder_name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm mb-1"><span className="text-red-500">*</span> Account number</label>
              <input
                name="refund_account_number"
                value={state.refund_account_number}
                onChange={onChange}
                className="w-full border rounded px-2 sm:px-3 py-1.5 sm:py-2 text-sm"
              />
              {errors.refund_account_number && (
                <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.refund_account_number}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm mb-1"><span className="text-red-500">*</span> Bank name</label>
              <input
                name="refund_bank_name"
                value={state.refund_bank_name}
                onChange={onChange}
                className="w-full border rounded px-2 sm:px-3 py-1.5 sm:py-2 text-sm"
              />
              {errors.refund_bank_name && (
                <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.refund_bank_name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs sm:text-sm mb-1"><span className="text-red-500">*</span> Bank branch address</label>
              <input
                name="refund_bank_branch_address"
                value={state.refund_bank_branch_address}
                onChange={onChange}
                className="w-full border rounded px-2 sm:px-3 py-1.5 sm:py-2 text-sm"
              />
              {errors.refund_bank_branch_address && (
                <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.refund_bank_branch_address}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm mb-1"><span className="text-red-500">*</span> Bank IFSC</label>
              <input
                name="refund_bank_ifsc"
                value={state.refund_bank_ifsc}
                onChange={onChange}
                className="w-full border rounded px-2 sm:px-3 py-1.5 sm:py-2 text-sm"
              />
              {errors.refund_bank_ifsc && (
                <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.refund_bank_ifsc}</p>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <div>
          {step > 0 && (
            <button
              onClick={handleBack}
              className="w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm font-medium transition-colors"
              type="button"
            >
              Back
            </button>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          {step < 2 && (
            <button
              onClick={handleNext}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium transition-colors"
              type="button"
            >
              Next
            </button>
          )}

          {step === 2 && (
            <button
              type="submit"
              className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium transition-colors"
            >
              Submit
            </button>
          )}
        </div>
      </div>

      {status && (
        <div
          className={`rounded-md p-2 sm:p-3 text-xs sm:text-sm font-medium ${
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
  );
}