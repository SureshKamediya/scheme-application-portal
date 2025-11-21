"use client";

import React, { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { OTPForm } from "./otp";
import Link from "next/link";
import { ApplicationLookup } from "./applicationLookup";

interface DocumentWithUrl {
  id: bigint;
  name: string | null;
  file_choice: string;
  file: string | null;
  url?: string | null;
}

interface DocumentUrlResult {
  success: boolean;
  url?: string;
}

export function SchemeDetail({ schemeId }: { schemeId: number }) {
  const [submittedApplicationData, setSubmittedApplicationData] = useState<{
    mobile_number: string;
    application_number: string;
    scheme_name: string;
    scheme_id: number;
  } | null>(null);

  const [documentsWithUrls, setDocumentsWithUrls] = useState<DocumentWithUrl[]>(
    [],
  );

  const {
    data: scheme,
    isLoading,
    error,
  } = api.scheme.getById.useQuery({
    schemeId,
  });

  // Fetch presigned URLs when scheme data loads
  useEffect(() => {
    const fetchDocumentUrls = async () => {
      const files = scheme?.scheme_schemefiles ?? [];
      if (files.length > 0 && documentsWithUrls.length === 0) {
        const docsWithUrls = await Promise.all(
          files.map(async (file: DocumentWithUrl) => {
            try {
              // Use tRPC client directly to query presigned URL
              // eslint-disable-next-line @typescript-eslint/no-unsafe-call
              const result = await (
                api.scheme.getDocumentUrl as unknown as (input: {
                  schemeId: number;
                  documentId: number;
                }) => Promise<DocumentUrlResult>
              )({
                schemeId,
                documentId: Number(file.id),
              });
              return {
                ...file,
                url: result.success ? result.url : null,
              };
            } catch (err) {
              console.error("Error fetching document URL:", err);
              return {
                ...file,
                url: null,
              };
            }
          }),
        );
        setDocumentsWithUrls(docsWithUrls);
      }
    };

    void fetchDocumentUrls();
  }, [scheme?.scheme_schemefiles, schemeId, documentsWithUrls.length]);

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
        <OTPForm schemeId={Number(scheme.id)} schemeName={scheme.name} />
      </div>
    );
  }

  const isApplicationOpen =
    scheme.application_open_date &&
    scheme.application_close_date &&
    new Date() >= new Date(scheme.application_open_date) &&
    new Date() <= new Date(scheme.application_close_date);

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
                <p className="mb-1 text-sm text-gray-600">{scheme.company}</p>
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
                  {scheme.reserved_rate !== undefined && (
                    <div>
                      <p className="text-sm text-gray-600">Reserved Rate (%)</p>
                      <p className="text-gray-900">{scheme.reserved_rate}%</p>
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
                    {documentsWithUrls.length > 0
                      ? documentsWithUrls.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-start gap-3 rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100"
                          >
                            <div className="text-2xl">📄</div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-gray-900">
                                {file.name ?? file.file_choice}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                {file.file_choice}
                              </p>
                              {file.url ? (
                                <a
                                  href={file.url}
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
                        ))
                      : scheme.scheme_schemefiles.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-start gap-3 rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100"
                          >
                            <div className="text-2xl">📄</div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-gray-900">
                                {file.name ?? file.file_choice}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                {file.file_choice}
                              </p>
                              <p className="mt-2 text-xs text-gray-400">
                                Loading...
                              </p>
                            </div>
                          </div>
                        ))}
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
