"use client";

import type { Decimal } from "generated/prisma/runtime/library";
import Link from "next/link";
import React, { useState } from "react";
import { api } from "~/trpc/react";

interface ApplicationDetailsProps {
  application: {
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
  };
  applicationId: number;
}

export function ApplicationDetails({
  application,
  applicationId,
}: ApplicationDetailsProps) {
  const [status, setStatus] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Queries and mutations
  const downloadPdfMutation = api.application.downloadPdf.useMutation();
  const generatePdfMutation = api.application.generatePdf.useMutation();
  const getByIdQuery = api.application.getById.useQuery(applicationId);

  const handleDownloadPdf = async () => {
    setStatus({
      type: "info",
      message: "Attempting to download PDF...",
    });

    try {
      // 1) Try to get stored PDF url from server
      const { downloadUrl } = await downloadPdfMutation.mutateAsync({
        mobile_number: application.mobile_number,
        application_number: application.application_number,
        scheme_id: Number(application.scheme_scheme?.id),
        application_id: applicationId,
      });

      if (downloadUrl) {
        // open presigned URL
        window.open(downloadUrl, "_blank");
        setStatus({
          type: "success",
          message: "PDF opened successfully",
        });
        return;
      }
    } catch (err) {
      // if NOT_FOUND (404), fall through to generate step, otherwise rethrow
      const error = err as { data?: { code?: string; httpStatus?: number } };
      if (error.data?.code !== "NOT_FOUND") {
        console.error("downloadPdf error (non-404):", err);
        setStatus({
          type: "error",
          message: "Failed to download PDF",
        });
        return;
      }
    }

    // 2) If not available, ask server to generate
    try {
      setStatus({
        type: "info",
        message: "Generating PDF acknowledgement...",
      });

      // Get the full application details from the query
      const fullApplication = getByIdQuery.data;

      if (!fullApplication) {
        throw new Error("Could not fetch full application data");
      }

      // Format dob to YYYY-MM-DD string
      let dobString = "1990-01-01";
      if (fullApplication.dob) {
        const dobDate = new Date(fullApplication.dob);
        dobString = dobDate.toISOString().split("T")[0] ?? "1990-01-01";
      }

      // Format dd_date_or_transaction_date to YYYY-MM-DD string
      let ddDateString = "";
      if (fullApplication.dd_date_or_transaction_date) {
        const ddDate = new Date(fullApplication.dd_date_or_transaction_date);
        ddDateString = ddDate.toISOString().split("T")[0] ?? "";
      }

      const generatePayload = {
        mobile_number: fullApplication.mobile_number,
        applicant_name: fullApplication.applicant_name,
        father_or_husband_name: fullApplication.father_or_husband_name || "",
        dob: dobString,
        id_type: fullApplication.id_type || "",
        id_number: fullApplication.id_number || "",
        pan_number: fullApplication.pan_number || "",
        permanent_address: fullApplication.permanent_address || "",
        permanent_address_pincode:
          fullApplication.permanent_address_pincode || "",
        postal_address: fullApplication.postal_address || "",
        postal_address_pincode: fullApplication.postal_address_pincode || "",
        email: fullApplication.email || "",
        annual_income: fullApplication.annual_income || "",
        plot_category: fullApplication.plot_category || "",
        registration_fees:
          fullApplication.registration_fees?.toString() || "0.00",
        processing_fees: fullApplication.processing_fees?.toString() || "0.00",
        total_payable_amount:
          fullApplication.total_payable_amount?.toString() || "0.00",
        payment_mode: fullApplication.payment_mode || "",
        dd_id_or_transaction_id: fullApplication.dd_id_or_transaction_id || "",
        dd_date_or_transaction_date: ddDateString,
        dd_amount: fullApplication.dd_amount?.toString() || "0.00",
        payee_account_holder_name:
          fullApplication.payee_account_holder_name || "",
        payee_bank_name: fullApplication.payee_bank_name || "",
        payment_status: fullApplication.payment_status || "pending",
        refund_account_holder_name:
          fullApplication.refund_account_holder_name || "",
        refund_account_number: fullApplication.refund_account_number || "",
        refund_bank_name: fullApplication.refund_bank_name || "",
        refund_bank_branch_address:
          fullApplication.refund_bank_branch_address || "",
        refund_bank_ifsc: fullApplication.refund_bank_ifsc || "",
        scheme_id: Number(fullApplication.scheme_id),
        application_id: applicationId,
      };

      await generatePdfMutation.mutateAsync(generatePayload);

      // 3) Retry download after generation (Lambda uploads to S3)
      setStatus({
        type: "info",
        message: "PDF generated, downloading...",
      });

      const { downloadUrl } = await downloadPdfMutation.mutateAsync({
        mobile_number: application.mobile_number,
        application_number: application.application_number,
        scheme_id: Number(application.scheme_scheme?.id),
        application_id: applicationId,
      });

      if (downloadUrl) {
        window.open(downloadUrl, "_blank");
        setStatus({
          type: "success",
          message: "PDF generated and opened successfully",
        });
        return;
      }

      // final fallback
      setStatus({
        type: "error",
        message:
          "PDF was generated but still not available yet; try again in a few seconds.",
      });
    } catch (err) {
      console.error("PDF generate/download flow error:", err);
      setStatus({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Failed to generate or download PDF",
      });
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="rounded-lg bg-linear-to-r from-blue-600 to-blue-800 p-6 text-white">
        <h1 className="mb-2 text-3xl font-bold">Application Details</h1>
        <p className="text-blue-100">
          Application Number: {application.application_number}
        </p>
        <p className="text-blue-100">
          Status: {application.application_status}
        </p>
      </div>

      {status && (
        <div
          className={`rounded-md p-4 text-sm font-medium ${
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

      {/* Summary Card */}
      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-xl font-semibold">Personal Information</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-gray-600">Applicant Name</p>
            <p className="font-medium">{application.applicant_name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Mobile Number</p>
            <p className="font-medium">{application.mobile_number}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Date of Birth</p>
            <p className="font-medium">
              {application.dob
                ? new Date(application.dob).toLocaleDateString()
                : "N/A"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Email</p>
            <p className="font-medium">{application.email ?? "N/A"}</p>
          </div>
        </div>
      </div>

      {/* Scheme Information */}
      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-xl font-semibold">Scheme Information</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-gray-600">Scheme Name</p>
            <p className="font-medium">
              {application.scheme_scheme?.name ?? "N/A"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Plot Category</p>
            <p className="font-medium">{application.plot_category ?? "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Annual Income</p>
            <p className="font-medium">{application.annual_income ?? "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Submission Date</p>
            <p className="font-medium">
              {application.application_submission_date
                ? new Date(
                    application.application_submission_date,
                  ).toLocaleDateString()
                : "N/A"}
            </p>
          </div>
        </div>
      </div>

      {/* Payment Information */}
      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-xl font-semibold">Payment Information</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-gray-600">Payment Mode</p>
            <p className="font-medium">{application.payment_mode ?? "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Payment Status</p>
            <p
              className={`font-medium ${
                application.payment_status === "success"
                  ? "text-green-600"
                  : "text-yellow-600"
              }`}
            >
              {application.payment_status ?? "N/A"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Registration Fees</p>
            <p className="font-medium">
              ₹{application.registration_fees?.toString() ?? "0.00"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Processing Fees</p>
            <p className="font-medium">
              ₹{application.processing_fees?.toString() ?? "0.00"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Payable Amount</p>
            <p className="text-lg font-bold">
              ₹{application.total_payable_amount?.toString() ?? "0.00"}
            </p>
          </div>
        </div>
      </div>

      {/* Address Information */}
      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-xl font-semibold">Address Information</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">Permanent Address</p>
            <p className="font-medium">
              {application.permanent_address ?? "N/A"}
            </p>
            {application.permanent_address_pincode && (
              <p className="text-sm text-gray-600">
                Pincode: {application.permanent_address_pincode}
              </p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-600">Postal Address</p>
            <p className="font-medium">{application.postal_address ?? "N/A"}</p>
            {application.postal_address_pincode && (
              <p className="text-sm text-gray-600">
                Pincode: {application.postal_address_pincode}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleDownloadPdf}
          disabled={
            downloadPdfMutation.isPending || generatePdfMutation.isPending
          }
          className="flex-1 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:bg-gray-400"
        >
          {downloadPdfMutation.isPending || generatePdfMutation.isPending
            ? "Processing..."
            : "Download Acknowledgement PDF"}
        </button>
        <Link
          href="/"
          className="flex-1 rounded-lg bg-gray-600 px-6 py-3 text-center font-medium text-white hover:bg-gray-700"
        >
          Back
        </Link>
      </div>
    </div>
  );
}
