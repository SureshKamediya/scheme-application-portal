"use client";

import React from "react";
import { api } from "~/trpc/react";
import Link from "next/link";
import { VALUE_TO_LABEL_MAP } from "./utils/applicationConstants";

export function SchemesList() {
  const { data: schemes, isLoading, error } = api.scheme.getAll.useQuery();
  // Unused state removed - scheme navigation handled by Link component

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <div className="py-12 text-center">
          <p className="text-lg text-gray-500">Loading schemes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">
            Failed to load schemes. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  if (!schemes || schemes.length === 0) {
    return (
      <div className="mx-auto max-w-7xl p-6">
        <div className="py-12 text-center">
          <p className="text-lg text-gray-500">
            No schemes available at this time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          Available Schemes
        </h1>
        <p className="text-gray-600">
          Select a scheme to view details and apply
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {schemes.map((scheme) => {
          const isOpen =
            scheme.application_open_date &&
            scheme.application_close_date &&
            new Date() >= new Date(scheme.application_open_date) &&
            new Date() <= new Date(scheme.application_close_date);

          return (
            <Link
              key={scheme.id}
              href={`/schemes/${scheme.id}`}
              className="group"
            >
              <div className="flex h-full cursor-pointer flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-lg">
                {/* Scheme Status Badge */}
                <div className="mb-4 flex items-start justify-between">
                  <span className="text-sm font-medium text-gray-600">
                    {VALUE_TO_LABEL_MAP.company[scheme?.company ?? ""] ?? ""}
                  </span>
                  {isOpen ? (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                      Open
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800">
                      Closed
                    </span>
                  )}
                </div>

                {/* Scheme Name */}
                <h2 className="mb-2 text-xl font-semibold text-gray-900 transition-colors group-hover:text-blue-600">
                  {scheme.name}
                </h2>

                {/* Address */}
                {scheme.address && (
                  <p className="mb-3 line-clamp-2 text-sm text-gray-600">
                    📍 {scheme.address}
                  </p>
                )}

                {/* Phone */}
                {scheme.phone && (
                  <p className="mb-4 text-sm text-gray-600">
                    📞 {scheme.phone}
                  </p>
                )}

                {/* Plot Counts */}
                <div className="mb-4 grid grid-cols-2 gap-2 border-t border-b border-gray-100 py-3">
                  <div>
                    <p className="text-xs text-gray-500">LIG Plots</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {scheme.Lig_plot_count}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">EWS Plots</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {scheme.ews_plot_count}
                    </p>
                  </div>
                </div>

                {/* Dates */}
                <div className="mb-4 space-y-1 text-xs text-gray-500">
                  {scheme.application_open_date && (
                    <p>
                      Opens:{" "}
                      {new Date(
                        scheme.application_open_date,
                      ).toLocaleDateString()}
                    </p>
                  )}
                  {scheme.application_close_date && (
                    <p>
                      Closes:{" "}
                      {new Date(
                        scheme.application_close_date,
                      ).toLocaleDateString()}
                    </p>
                  )}
                  {scheme.lottery_result_date && (
                    <p>
                      Lottery Result Date:{" "}
                      {new Date(
                        scheme.lottery_result_date,
                      ).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* View Details Link */}
                <div className="mt-auto">
                  <span className="inline-flex items-center text-sm font-medium text-blue-600 group-hover:text-blue-800">
                    View Details →
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
