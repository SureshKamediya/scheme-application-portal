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
};

export function ApplicationForm({
  initialSchemeId = 1,
  initialMobileNumber = "1234567890",
}: {
  initialSchemeId?: number;
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
  });

  const [status, setStatus] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [step, setStep] = useState<number>(0); // 0: personal, 1: payment, 2: refund
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    size: string;
    file: File;
  } | null>(null);

  const createApplication = api.application.create.useMutation({
    onSuccess: async (application) => {
      // Application created successfully, now upload file to S3 if we have one
      if (uploadedFile) {
        try {
          setStatus({
            type: "info",
            message: "Uploading payment proof to cloud storage...",
          });

          // Convert file to base64
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

          // Upload to S3 with real applicationNumber
          const uploadResult = await uploadPaymentProof.mutateAsync({
            applicationId: application.application_number,
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
          message: `Application submitted successfully! Your application number is ${application.application_number}`,
        });
      }

      // Redirect to application lookup with auto-filled fields
      setTimeout(() => {
        const params = new URLSearchParams();
        params.set("mobile", state.mobile_number);
        params.set("appNum", String(application.application_number));
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
      // Validate file
      const error = validateFile(file);
      if (error) {
        setStatus({
          type: "error",
          message: error,
        });
        return;
      }

      // Store file object and display file info
      // File will be uploaded after application is created with applicationNumber
      setState((s) => ({ ...s, payment_proof: file.name }));
      setUploadedFile({
        name: file.name,
        size: formatFileSize(file.size),
        file: file,
      });

      setStatus({
        type: "success",
        message: "Payment proof file selected. Will be uploaded after application submission.",
      });
    }
  };

  const validateStep = (currentStep: number) => {
    if (currentStep === 0) {
      if (!state.applicant_name.trim()) return "Applicant name is required";
      if (!state.father_or_husband_name.trim()) return "Father/Husband name is required";
      if (!state.dob) return "Date of birth is required";
      if (state.mobile_number.length !== 10) return "Mobile number must be 10 digits";
      if (!state.id_type.trim()) return "ID type is required";
      if (!state.id_number.trim()) return "ID number is required";
      if (!state.pan_number.trim()) return "PAN number is required";
      if (!state.permanent_address.trim()) return "Permanent address is required";
      if (!state.permanent_address_pincode.trim()) return "Permanent address pincode is required";
      if (!state.postal_address.trim()) return "Postal address is required";
      if (!state.postal_address_pincode.trim()) return "Postal address pincode is required";
    }

    if (currentStep === 1) {
      if (!state.annual_income.trim()) return "Annual income is required";
      if (!state.payment_mode.trim()) return "Payment mode is required";
      if (!state.dd_id_or_transaction_id.trim()) return "DD/Transaction ID is required";
      if (!state.dd_date_or_transaction_date) return "DD/Transaction date is required";
      if (!state.dd_amount || Number(state.dd_amount) <= 0) return "Enter a valid payment amount";
      if (!state.payee_account_holder_name.trim()) return "Payee account holder name is required";
      if (!state.payee_bank_name.trim()) return "Payee bank name is required";
      if (!state.payment_proof.trim()) return "Payment proof is required";
    }

    if (currentStep === 2) {
      if (!state.refund_account_holder_name.trim()) return "Refund account holder name is required";
      if (!state.refund_account_number.trim()) return "Refund account number is required";
      if (!state.refund_bank_name.trim()) return "Refund bank name is required";
      if (!state.refund_bank_branch_address.trim()) return "Refund bank branch address is required";
      if (!state.refund_bank_ifsc.trim()) return "Refund bank IFSC is required";
    }

    return null;
  };

  const handleNext = (e?: React.FormEvent) => {
    e?.preventDefault();
    setStatus(null);
    const err = validateStep(step);
    if (err) {
      setStatus({
        type: "error",
        message: err,
      });
      return;
    }
    if (step < 2) setStep((s) => s + 1);
  };

  const handleBack = (e?: React.FormEvent) => {
    e?.preventDefault();
    setStatus(null);
    if (step > 0) setStep((s) => s - 1);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    // Validate all steps
    for (let i = 0; i <= 2; i++) {
      const err = validateStep(i);
      if (err) {
        setStatus({
          type: "error",
          message: `Step ${i + 1}: ${err}`,
        });
        setStep(i);
        return;
      }
    }

    // Convert string values to appropriate types for Decimal fields
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
      // Error is already handled by onError callback
      console.error("Application submission error:", error);
    }
  };

  const steps = ["Personal", "Payment", "Refund"];

  return (
    <form onSubmit={onSubmit} className="max-w-3xl mx-auto space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-2">
        <div className="text-lg font-medium">Application Form</div>
        <div className="text-sm text-gray-500">Step {step + 1} of {steps.length}: {steps[step]}</div>
      </div>

      <div className="w-full bg-gray-200 rounded h-2">
        <div
          className="bg-blue-600 h-2 rounded"
          style={{ width: `${((step + 1) / steps.length) * 100}%` }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Mobile</label>
          <p className="mt-1 text-sm">{state.mobile_number}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Scheme ID</label>
          <p className="mt-1 text-sm">{state.scheme_id}</p>
        </div>
      </div>

      {step === 0 && (
        <section className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm"><span className="text-red-500">*</span> Applicant name</label>
              <input
                name="applicant_name"
                value={state.applicant_name}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
                placeholder="Full name"
                required
              />
            </div>

            <div>
              <label className="block text-sm"><span className="text-red-500">*</span> Father / Husband name</label>
              <input
                name="father_or_husband_name"
                value={state.father_or_husband_name}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
                placeholder="Father or Husband name"
                required
              />
            </div>

            <div>
              <label className="block text-sm"><span className="text-red-500">*</span> DOB</label>
              <input
                name="dob"
                type="date"
                value={state.dob}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm">Email</label>
              <input
                name="email"
                type="email"
                value={state.email}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm"><span className="text-red-500">*</span> ID type</label>
              <select
                name="id_type"
                value={state.id_type}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value="">Select</option>
                <option value="aadhaar">Aadhaar</option>
                <option value="voter">Voter ID</option>
                <option value="passport">Passport</option>
                <option value="driving">Driving License</option>
              </select>
            </div>

            <div>
              <label className="block text-sm"><span className="text-red-500">*</span> ID number</label>
              <input
                name="id_number"
                value={state.id_number}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
                placeholder="ID number"
                required
              />
            </div>

            <div>
              <label className="block text-sm"><span className="text-red-500">*</span> PAN number</label>
              <input
                name="pan_number"
                value={state.pan_number}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
                placeholder="PAN number"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm"><span className="text-red-500">*</span> Permanent address</label>
              <textarea
                name="permanent_address"
                value={state.permanent_address}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
                rows={2}
                required
              />
            </div>

            <div>
              <label className="block text-sm"><span className="text-red-500">*</span> Permanent address pincode</label>
              <input
                name="permanent_address_pincode"
                value={state.permanent_address_pincode}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center text-sm">
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
              <label className="block text-sm"><span className="text-red-500">*</span> Postal address</label>
              <textarea
              name="postal_address"
              value={state.postal_address}
              onChange={onChange}
              className="w-full border rounded px-3 py-2"
              rows={2}
              required
              />
            </div>

            <div>
              <label className="block text-sm"><span className="text-red-500">*</span> Postal address pincode</label>
              <input
              name="postal_address_pincode"
              value={state.postal_address_pincode}
              onChange={onChange}
              className="w-full border rounded px-3 py-2"
              required
              />
            </div>
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm"><span className="text-red-500">*</span> Annual income</label>
              <select
                name="annual_income"
                value={state.annual_income}
                required
                onChange={(e) => {
                  const income = e.target.value;
                  let category = "";
                  let regFees = "";
                  
                  if (income === "0-3") {
                    category = "LIG";
                    regFees = "10000.00";
                  } else if (income === "3-6") {
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
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Select</option>
                <option value="0-3">0 to 3 lakh</option>
                <option value="3-6">3 to 6 lakh</option>
              </select>
            </div>

            <div>
              <label className="block text-sm">Plot category</label>
              <p className="mt-1 text-sm">{state.plot_category || "-"}</p>
            </div>

            <div>
              <label className="block text-sm">Registration fees</label>
              <p className="mt-1 text-sm">₹{state.registration_fees || "-"}</p>
            </div>

            <div>
              <label className="block text-sm">Processing fees</label>
              <p className="mt-1 text-sm">₹{state.processing_fees || "-"}</p>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm">Total payable amount</label>
              <p className="mt-1 text-sm font-semibold">₹{state.total_payable_amount || "-"}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm"><span className="text-red-500">*</span> Payment mode</label>
              <select
                name="payment_mode"
                value={state.payment_mode}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value="">Select</option>
                <option value="dd">DD</option>
                <option value="netbanking">Netbanking</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
              </select>
            </div>

            <div>
              <label className="block text-sm"><span className="text-red-500">*</span> DD / Transaction ID</label>
              <input
                name="dd_id_or_transaction_id"
                value={state.dd_id_or_transaction_id}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm"><span className="text-red-500">*</span> DD / Transaction date</label>
              <input
                name="dd_date_or_transaction_date"
                type="date"
                value={state.dd_date_or_transaction_date}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm"><span className="text-red-500">*</span> Amount</label>
              <input
                name="dd_amount"
                type="number"
                step="0.01"
                value={state.dd_amount}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm"><span className="text-red-500">*</span> Payee account holder name</label>
              <input
                name="payee_account_holder_name"
                value={state.payee_account_holder_name}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm"><span className="text-red-500">*</span> Payee bank name</label>
              <input
                name="payee_bank_name"
                value={state.payee_bank_name}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm"><span className="text-red-500">*</span> Payment proof</label>
              <div className="mt-2">
                <input
                  type="file"
                  onChange={onFileChange}
                  required
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  accept=".pdf,.jpg,.jpeg,.png"
                />
              </div>
              {uploadedFile && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded">
                  <div className="text-sm text-green-800">
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
        <section className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm"><span className="text-red-500">*</span> Refund account holder name</label>
              <input
                name="refund_account_holder_name"
                value={state.refund_account_holder_name}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm"><span className="text-red-500">*</span> Refund account number</label>
              <input
                name="refund_account_number"
                value={state.refund_account_number}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm"><span className="text-red-500">*</span> Refund bank name</label>
              <input
                name="refund_bank_name"
                value={state.refund_bank_name}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm"><span className="text-red-500">*</span> Refund bank branch address</label>
              <input
                name="refund_bank_branch_address"
                value={state.refund_bank_branch_address}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm"><span className="text-red-500">*</span> Refund bank IFSC</label>
              <input
                name="refund_bank_ifsc"
                value={state.refund_bank_ifsc}
                onChange={onChange}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
          </div>
        </section>
      )}

      <div className="flex items-center justify-between space-x-2">
        <div>
          {step > 0 && (
            <button
              onClick={handleBack}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              type="button"
            >
              Back
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {step < 2 && (
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              type="button"
            >
              Next
            </button>
          )}

          {step === 2 && (
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Submit
            </button>
          )}
        </div>
      </div>

      {status && (
        <div
          className={`rounded-md p-3 text-sm font-medium ${
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
