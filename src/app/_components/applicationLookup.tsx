"use client";

import { useState } from "react";
import Link from "next/link";

import { useApplicationLookup } from "./hooks/useApplicationLookup";
import type { ApplicationLookupProps, ApplicationResponse } from "./types";

export function ApplicationLookup({
  initialMobileNumber,
  initialApplicationNumber,
  initialSchemeName,
  initialSchemeId,
}: ApplicationLookupProps) {
  // Initialize state directly from props
  const [mobileNumber, setMobileNumber] = useState(initialMobileNumber);
  const [applicationNumber, setApplicationNumber] = useState(
    initialApplicationNumber,
  );
  const { status, setStatus, getApplication } = useApplicationLookup();

  const handleGetApplication = async (): Promise<void> => {
    const app = await getApplication?.mutateAsync({
      mobile_number: mobileNumber,
      application_number: parseInt(applicationNumber),
      scheme_id: initialSchemeId,
    });

    if ((app as ApplicationResponse)?.id) {
      // Redirect to application details page
      window.location.href = `/application/${(app as ApplicationResponse).id}?mobile=${mobileNumber}&schemeName=${initialSchemeName}&applicationNumber=${applicationNumber}`;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (mobileNumber.length !== 10) {
      setStatus({
        type: "error",
        message: "Please enter a valid 10-digit mobile number",
      });
      return;
    }

    if (!applicationNumber.trim()) {
      setStatus({
        type: "error",
        message: "Please enter an application number",
      });
      return;
    }

    void handleGetApplication();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-md space-y-6 p-4 sm:p-6"
    >
      <div>
        <h1 className="mb-2 text-2xl font-bold">Access Your Application</h1>
        <p className="text-gray-600">
          Enter your details to view and download your application
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            <span className="text-red-500">*</span> Scheme Name
          </label>
          <p className="mt-1 w-full rounded border bg-gray-50 px-3 py-2">
            {initialSchemeName}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            <span className="text-red-500">*</span> Mobile Number
          </label>
          <input
            type="tel"
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
            placeholder="Enter 10-digit mobile number"
            maxLength={10}
            disabled={getApplication?.isPending ?? false}
            className="mt-1 w-full rounded border px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            <span className="text-red-500">*</span> Application Number
          </label>
          <input
            type="text"
            value={applicationNumber}
            onChange={(e) => setApplicationNumber(e.target.value)}
            placeholder="Enter your application number"
            disabled={getApplication?.isPending ?? false}
            className="mt-1 w-full rounded border px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
            required
          />
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

      <button
        type="submit"
        disabled={getApplication?.isPending ?? false}
        className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
      >
        {getApplication?.isPending ? "Loading..." : "Access Application"}
      </button>

      <div className="text-center">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          Back to Home
        </Link>
      </div>
    </form>
  );
}
