"use client";

import React, { useState } from "react";

import { OTPForm } from "./otp";
import Link from "next/link";
import { ApplicationLookup } from "./applicationLookup";
import { useSchemeDetail } from "./hooks/useSchemeDetail";
import type { SchemeDetailProps, SchemeFile } from "./types";
import { VALUE_TO_LABEL_MAP } from "./utils/applicationConstants";
import Image from "next/image";

const S3_BUCKET = "scheme-application-files";
const S3_REGION = "ap-south-1";

export function SchemeDetail({ schemeId }: SchemeDetailProps) {
  const [submittedApplicationData, setSubmittedApplicationData] = useState<{
    mobile_number: string;
    application_number: string;
    scheme_name: string;
    scheme_id: number;
  } | null>(null);

  const {
    scheme,
    isLoading,
    error,
    termsAndConditionsFileName,
    paymentQRCodeFileName,
    isApplicationOpen,
  } = useSchemeDetail(schemeId);

  const [showApplyForm, setShowApplyForm] = useState(false);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="py-12 text-center">
          <p className="text-lg text-gray-500">Loading scheme details...</p>
        </div>
      </div>
    );
  }

  if (error || !scheme) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">Failed to load scheme details.</p>
        </div>
        <Link href="/" className="text-blue-600 hover:text-blue-800">
          ← Back to Schemes
        </Link>
      </div>
    );
  }

  if (showApplyForm) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <button
          onClick={() => setShowApplyForm(false)}
          className="mb-4 font-medium text-blue-600 hover:text-blue-800"
        >
          ← Back to Scheme Details
        </button>
        <OTPForm
          schemeId={Number(scheme.id)}
          schemeName={scheme.name}
          termsAndConditionsFileName={termsAndConditionsFileName ?? ""}
        />
      </div>
    );
  }

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
        <div className="mx-auto max-w-4xl p-6">
          {/* Back Link */}
          <Link
            href="/"
            className="mb-6 inline-block text-blue-600 hover:text-blue-800"
          >
            ← Back to Schemes
          </Link>

          {/* Header */}
          <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="mb-1 text-sm text-gray-600">
                  {VALUE_TO_LABEL_MAP.company[scheme?.company ?? ""] ?? ""}
                </p>
                <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                  {scheme.name}
                </h1>
              </div>

              {isApplicationOpen ? (
                <span className="inline-flex items-center self-start rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-800 sm:self-auto">
                  ✓ Applications Open
                </span>
              ) : (
                <span className="inline-flex items-center self-start rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 sm:self-auto">
                  ✗ Applications Closed
                </span>
              )}
            </div>

            {/* Button Group: Apply Now and View Application */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* 1. Apply Button (Primary Action) */}
              <button
                onClick={() => setShowApplyForm(true)}
                disabled={!isApplicationOpen}
                className={`w-full rounded-lg px-6 py-3 text-center font-medium transition sm:w-auto ${
                  isApplicationOpen
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "cursor-not-allowed bg-gray-300 text-gray-600"
                } `}
              >
                {isApplicationOpen ? "Apply Now" : "Applications Closed"}
              </button>

              {/* 2. View Application Button (Secondary Action) */}
              <button
                onClick={() => {
                  setSubmittedApplicationData({
                    mobile_number: "",
                    application_number: "",
                    scheme_name: scheme.name,
                    scheme_id: Number(scheme.id),
                  });
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-6 py-3 text-center font-medium text-gray-700 transition hover:bg-gray-50 sm:w-auto"
              >
                View Application
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Left Column - Details */}
            <div className="space-y-6 md:col-span-2">

              {/* Payment QR Code (if exists) */}
              {paymentQRCodeFileName && (
                <div className="rounded-lg bg-white p-6 shadow-sm flex flex-col items-center gap-4">
                  <h2 className="text-xl font-semibold text-gray-900 text-center">
                    Payment QR Code
                  </h2>

                  {/* QR Image */}
                  <Image
                    src={paymentQRCodeFileName}
                    alt="Payment QR Code"
                    width={600}
                    height={300}
                    className="w-60 h-60 object-contain rounded-lg border shadow-sm 
                              sm:w-72 sm:h-72 md:w-80 md:h-80"
                  />

                  <p className="text-sm text-gray-600 text-center">
                    Scan the QR code to pay the scheme amount.
                  </p>

                  {/* Download button */}
                  <a
                    href={paymentQRCodeFileName}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-blue-600 text-white px-6 py-2 text-sm font-medium hover:bg-blue-700"
                  >
                    Download QR Code
                  </a>
                </div>
              )}

              {/* General Information */}
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-semibold text-gray-900">
                  General Information
                </h2>
                <div className="space-y-3">
                  {scheme.address && (
                    <div>
                      <p className="text-sm text-gray-600">Address</p>
                      <p className="text-gray-900">{scheme.address}</p>
                    </div>
                  )}
                  {scheme.phone && (
                    <div>
                      <p className="text-sm text-gray-600">Contact</p>
                      <p className="text-gray-900">{scheme.phone}</p>
                    </div>
                  )}
                  {scheme.reserved_price !== undefined && (
                    <div>
                      <p className="text-sm text-gray-600">Reserved Price</p>
                      <p className="text-gray-900">
                        {`${scheme.reserved_price}`}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Plot Information */}
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-semibold text-gray-900">
                  Available Plots
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-blue-50 p-4">
                    <p className="text-sm font-medium text-blue-600">
                      LIG Plots
                    </p>
                    <p className="text-3xl font-bold text-blue-900">
                      {scheme.Lig_plot_count}
                    </p>
                  </div>
                  <div className="rounded-lg bg-green-50 p-4">
                    <p className="text-sm font-medium text-green-600">
                      EWS Plots
                    </p>
                    <p className="text-3xl font-bold text-green-900">
                      {scheme.ews_plot_count}
                    </p>
                  </div>
                </div>
              </div>

              {/* Important Dates */}
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-semibold text-gray-900">
                  Important Dates
                </h2>
                <div className="space-y-3">
                  {scheme.application_open_date && (
                    <div className="flex items-center justify-between border-b pb-3">
                      <p className="text-sm text-gray-600">Application Opens</p>
                      <p className="font-medium">
                        {new Date(
                          scheme.application_open_date,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {scheme.application_close_date && (
                    <div className="flex items-center justify-between border-b pb-3">
                      <p className="text-sm text-gray-600">
                        Application Closes
                      </p>
                      <p className="font-medium">
                        {new Date(
                          scheme.application_close_date,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {scheme.lottery_result_date && (
                    <div className="flex items-center justify-between border-b pb-3">
                      <p className="text-sm text-gray-600">
                        Lottery Result Date
                      </p>
                      <p className="font-medium">
                        {new Date(
                          scheme.lottery_result_date,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {scheme.successful_applicants_publish_date && (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600">
                        Results Publication
                      </p>
                      <p className="font-medium">
                        {new Date(
                          scheme.successful_applicants_publish_date,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              

            </div>

            {/* Right Column - Files */}
            <div>
              {scheme.scheme_schemefiles &&
              scheme.scheme_schemefiles.length > 0 ? (
                <div className="sticky top-6 rounded-lg bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-xl font-semibold text-gray-900">
                    Scheme Documents
                  </h2>
                  <div className="space-y-3">
                    {scheme.scheme_schemefiles.map((file: SchemeFile) => {
                      let fullS3Url = "";

                      // Check for existence before constructing the URL
                      const hasFileAndEnv = file.file && S3_BUCKET && S3_REGION;

                      if (hasFileAndEnv) {
                        const s3BaseUrl = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/`;
                        fullS3Url = `${s3BaseUrl}${file.file}`;
                      }

                      return (
                        <div
                          key={file.id}
                          className="flex items-start gap-3 rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100"
                        >
                          <div className="text-2xl">📄</div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-900">
                              {file.name ?? file.file_choice}
                            </p>
                            {hasFileAndEnv ? (
                              <a
                                href={fullS3Url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-block text-xs text-blue-600 hover:text-blue-800"
                              >
                                Download →
                              </a>
                            ) : (
                              <p className="mt-2 text-xs text-gray-400">
                                Loading...
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-white p-6 shadow-sm">
                  <p className="text-sm text-gray-500">
                    No documents available
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
