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

  const downloadPdf = api.application.downloadPdf.useMutation({
    onSuccess: (data) => {
      // Open PDF in new tab
      window.open(data.downloadUrl, "_blank");
      setStatus({
        type: "success",
        message: "PDF downloaded successfully",
      });
    },
    onError: (error) => {
      setStatus({
        type: "error",
        message: error.message || "Failed to download PDF",
      });
    },
  });

  const handleDownloadPdf = async () => {
    const schemeId = application?.scheme_scheme?.id;

    if (!schemeId) {
      setStatus({
        type: "error",
        message: "Scheme id not found for this application",
      });
      return;
    }

    // Download PDF - Can do with applicaiton id too
    try {
      await downloadPdf.mutateAsync({
        application_number: application.application_number,
        mobile_number: application.mobile_number,
        scheme_id: Number(schemeId),
        application_id: applicationId,
      });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to download PDF",
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-linear-to-r from-blue-600 to-blue-800 text-white rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-2">Application Details</h1>
        <p className="text-blue-100">Application Number: {application.application_number}</p>
        <p className="text-blue-100">Status: {application.application_status}</p>
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
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold">Personal Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              {application.dob ? new Date(application.dob).toLocaleDateString() : "N/A"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Email</p>
            <p className="font-medium">{application.email ?? "N/A"}</p>
          </div>
        </div>
      </div>

      {/* Scheme Information */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold">Scheme Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Scheme Name</p>
            <p className="font-medium">{application.scheme_scheme?.name ?? "N/A"}</p>
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
                ? new Date(application.application_submission_date).toLocaleDateString()
                : "N/A"}
            </p>
          </div>
        </div>
      </div>

      {/* Payment Information */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold">Payment Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Payment Mode</p>
            <p className="font-medium">{application.payment_mode ?? "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Payment Status</p>
            <p
              className={`font-medium ${
                application.payment_status === "success" ? "text-green-600" : "text-yellow-600"
              }`}
            >
              {application.payment_status ?? "N/A"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Registration Fees</p>
            <p className="font-medium">₹{application.registration_fees?.toString() ?? "0.00"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Processing Fees</p>
            <p className="font-medium">₹{application.processing_fees?.toString() ?? "0.00"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Payable Amount</p>
            <p className="font-bold text-lg">₹{application.total_payable_amount?.toString() ?? "0.00"}</p>
          </div>
        </div>
      </div>

      {/* Address Information */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold">Address Information</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">Permanent Address</p>
            <p className="font-medium">{application.permanent_address ?? "N/A"}</p>
            {application.permanent_address_pincode && (
              <p className="text-sm text-gray-600">Pincode: {application.permanent_address_pincode}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-600">Postal Address</p>
            <p className="font-medium">{application.postal_address ?? "N/A"}</p>
            {application.postal_address_pincode && (
              <p className="text-sm text-gray-600">Pincode: {application.postal_address_pincode}</p>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleDownloadPdf}
          disabled={downloadPdf.isPending || !application.application_pdf}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
        >
          {downloadPdf.isPending ? "Downloading..." : "Download Application PDF"}
        </button>
        <Link
          href="/"
          className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-center font-medium"
        >
          Back
        </Link>
      </div>
    </div>
  );
}