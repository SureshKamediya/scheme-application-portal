"use client";

import Link from "next/link";
import React from "react";
import { useApplicationDetails } from "./hooks/useApplicationDetails";
import type { ApplicationDetailsProps } from "./types";
import { VALUE_TO_LABEL_MAP } from "./utils/applicationConstants";

export function ApplicationDetails({
  application,
  applicationId,
}: ApplicationDetailsProps) {
  const {
    status,
    handleDownloadPdf,
    downloadPdfMutation,
    generatePdfMutation,
  } = useApplicationDetails(applicationId);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="rounded-lg bg-linear-to-r from-blue-600 to-blue-800 p-6 text-white">
        <h1 className="mb-2 text-3xl font-bold">Application Details</h1>
        <p className="text-blue-100">
          Application Number: {application.application_number}
        </p>
        <p className="text-blue-100">
          Applicaiton Submission Date:{" "}
          {application.application_submission_date
            ? new Date(
                application.application_submission_date,
              ).toLocaleDateString()
            : "N/A"}
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

      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-xl font-semibold">Applicant Account Details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-gray-600">Account Number</p>
            <p className="font-medium">
              {application.applicant_account_number ?? "N/A"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Bank Name</p>
            <p className="font-medium">
              {application.applicant_bank_name ?? "N/A"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600">Bank Branch Address</p>
            <p className="font-medium">
              {application.applicant_bank_branch_address ?? "N/A"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600"> Bank IFSC</p>
            <p className="font-medium">
              {application.applicant_bank_ifsc ?? "N/A"}
            </p>
          </div>
        </div>
      </div>

      {/* Payment Information */}
      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-xl font-semibold">Booking Details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-gray-600">Scheme Name</p>
            <p className="font-medium">
              {application.scheme_scheme?.name ?? "N/A"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Plot Category</p>
            <p className="font-medium">
              {VALUE_TO_LABEL_MAP.plotCategory[
                application?.plot_category ?? ""
              ] ?? "N/A"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Sub Category</p>
            <p className="font-medium">
              {VALUE_TO_LABEL_MAP.subCategory[
                application?.sub_category ?? ""
              ] ?? "N/A"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Payment Mode</p>
            <p className="font-medium">
              {VALUE_TO_LABEL_MAP.paymentMode[
                application?.payment_mode ?? ""
              ] ?? "N/A"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">DD/ Transaction Id</p>
            <p className="font-medium">
              {application.dd_id_or_transaction_id ?? "N/A"}
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
          onClick={async () => {
            await handleDownloadPdf(
              application.mobile_number,
              application.application_number,
              Number(application.scheme_scheme?.id ?? 0),
            );
          }}
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
