"use client";

import React from "react";
import { api } from "~/trpc/react";
import Link from "next/link";

export function SchemesList() {
  const { data: schemes, isLoading, error } = api.scheme.getAll.useQuery();
  // Unused state removed - scheme navigation handled by Link component

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-lg text-gray-500">Loading schemes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">Failed to load schemes. Please try again later.</p>
        </div>
      </div>
    );
  }

  if (!schemes || schemes.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-lg text-gray-500">No schemes available at this time.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Available Schemes</h1>
        <p className="text-gray-600">Select a scheme to view details and apply</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              <div className="rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-lg transition-shadow p-6 cursor-pointer h-full flex flex-col">
                {/* Scheme Status Badge */}
                <div className="mb-4 flex items-start justify-between">
                  <span className="text-sm font-medium text-gray-600">
                    {scheme.company}
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
                <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {scheme.name}
                </h2>

                {/* Address */}
                {scheme.address && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    📍 {scheme.address}
                  </p>
                )}

                {/* Phone */}
                {scheme.phone && (
                  <p className="text-sm text-gray-600 mb-4">
                    📞 {scheme.phone}
                  </p>
                )}

                {/* Plot Counts */}
                <div className="grid grid-cols-2 gap-2 mb-4 py-3 border-t border-b border-gray-100">
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
                <div className="text-xs text-gray-500 mb-4 space-y-1">
                  {scheme.application_open_date && (
                    <p>
                      Opens: {new Date(scheme.application_open_date).toLocaleDateString()}
                    </p>
                  )}
                  {scheme.application_close_date && (
                    <p>
                      Closes: {new Date(scheme.application_close_date).toLocaleDateString()}
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
