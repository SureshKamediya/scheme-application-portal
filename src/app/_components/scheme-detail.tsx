"use client";

import React, { useState } from "react";
import { api } from "~/trpc/react";
import { OTPForm } from "./otp";
import Link from "next/link";
import { ApplicationLookup } from "./applicationLookup";

export function SchemeDetail({ schemeId }: { schemeId: number }) {

  const [submittedApplicationData, setSubmittedApplicationData] = useState<{
      mobile_number: string;
      application_number: string;
      scheme_name: string;
      scheme_id: number;
    } | null>(null);

  const { data: scheme, isLoading, error } = api.scheme.getById.useQuery({
    schemeId,
  });
  const [showApplyForm, setShowApplyForm] = useState(false);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-lg text-gray-500">Loading scheme details...</p>
        </div>
      </div>
    );
  }

  if (error || !scheme) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="rounded-md bg-red-50 p-4 mb-4">
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
      <div className="max-w-4xl mx-auto p-6">
        <button
          onClick={() => setShowApplyForm(false)}
          className="mb-4 text-blue-600 hover:text-blue-800 font-medium"
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
        <div className="max-w-4xl mx-auto p-6">
          {/* Back Link */}
          <Link href="/" className="text-blue-600 hover:text-blue-800 mb-6 inline-block">
            ← Back to Schemes
          </Link>

          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <p className="text-sm text-gray-600 mb-1">{scheme.company}</p>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{scheme.name}</h1>
                </div>

                {isApplicationOpen ? (
                    <span className="self-start sm:self-auto inline-flex items-center rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-800">
                        ✓ Applications Open
                    </span>
                ) : (
                    <span className="self-start sm:self-auto inline-flex items-center rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800">
                        ✗ Applications Closed
                    </span>
                )}
            </div>

            {/* Button Group: Apply Now and View Application */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                
                {/* 1. Apply Button (Primary Action) */}
                <button
                    onClick={() => setShowApplyForm(true)}
                    disabled={!isApplicationOpen}
                    className={`
                        w-full sm:w-auto 
                        px-6 py-3 rounded-lg font-medium transition 
                        text-center
                        ${
                            isApplicationOpen
                              ? "bg-blue-600 text-white hover:bg-blue-700"
                              : "bg-gray-300 text-gray-600 cursor-not-allowed"
                        }
                    `}
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
                    className="
                        w-full sm:w-auto 
                        px-6 py-3 rounded-lg font-medium transition 
                        text-center
                        border border-gray-300 bg-white text-gray-700 hover:bg-gray-50
                    "
                >
                    View Application
                </button>
            </div>
          </div>


          {/* Main Content */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column - Details */}
            <div className="md:col-span-2 space-y-6">
              {/* General Information */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
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
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Available Plots
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-600 font-medium">LIG Plots</p>
                    <p className="text-3xl font-bold text-blue-900">
                      {scheme.Lig_plot_count}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-green-600 font-medium">EWS Plots</p>
                    <p className="text-3xl font-bold text-green-900">
                      {scheme.ews_plot_count}
                    </p>
                  </div>
                </div>
              </div>

              {/* Important Dates */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Important Dates
                </h2>
                <div className="space-y-3">
                  {scheme.application_open_date && (
                    <div className="flex justify-between items-center pb-3 border-b">
                      <p className="text-sm text-gray-600">Application Opens</p>
                      <p className="font-medium">
                        {new Date(scheme.application_open_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {scheme.application_close_date && (
                    <div className="flex justify-between items-center pb-3 border-b">
                      <p className="text-sm text-gray-600">Application Closes</p>
                      <p className="font-medium">
                        {new Date(scheme.application_close_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {scheme.lottery_result_date && (
                    <div className="flex justify-between items-center pb-3 border-b">
                      <p className="text-sm text-gray-600">Lottery Result Date</p>
                      <p className="font-medium">
                        {new Date(scheme.lottery_result_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {scheme.successful_applicants_publish_date && (
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-600">Results Publication</p>
                      <p className="font-medium">
                        {new Date(scheme.successful_applicants_publish_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Files */}
            <div>
              {scheme.scheme_schemefiles && scheme.scheme_schemefiles.length > 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Scheme Documents
                  </h2>
                  <div className="space-y-3">
                    {scheme.scheme_schemefiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="text-2xl">📄</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.name ?? file.file_choice}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {file.file_choice}
                          </p>
                          {file.file && (
                            <a
                              href={`/media/${file.file}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 mt-2 inline-block"
                            >
                              Download →
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <p className="text-sm text-gray-500">No documents available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
