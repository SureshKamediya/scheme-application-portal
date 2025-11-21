"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { ApplicationForm } from "./application";

interface OTPFormProps {
  schemeId?: number;
  schemeName?: string;
}

export function OTPForm({
  schemeId = 1,
  schemeName = "Default-Scheme",
}: OTPFormProps = {}) {
  const [mobileNumber, setMobileNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsUrl, setTermsUrl] = useState<string | null>(null);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0); // 0: input, 1: verify, 2: verified, 3: application

  // Fetch terms and conditions document on mount
  useEffect(() => {
    const fetchTermsUrl = async () => {
      if (!schemeId) return;

      setLoadingTerms(true);
      try {
        // Query scheme to get T&C document
        const scheme = await (api.scheme.getById as any).query({
          schemeId,
        });

        if (
          scheme?.scheme_schemefiles &&
          scheme.scheme_schemefiles.length > 0
        ) {
          // Find T&C document
          const termsDoc = scheme.scheme_schemefiles.find(
            (file: any) =>
              file.file_choice?.toLowerCase().includes("terms") ||
              file.name?.toLowerCase().includes("terms"),
          );

          if (termsDoc) {
            // Get presigned URL for T&C
            const result = await (api.scheme.getDocumentUrl as any).query({
              schemeId,
              documentId: Number(termsDoc.id),
            });

            if (result.success && result.url) {
              setTermsUrl(result.url);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching terms URL:", err);
      } finally {
        setLoadingTerms(false);
      }
    };

    fetchTermsUrl().catch(console.error);
  }, [schemeId]);

  const generateOtp = api.otp.generate.useMutation({
    onSuccess: () => {
      setStatus({
        type: "success",
        message: "OTP sent to your mobile number.",
      });
      setStep(1);
    },
    onError: (error) => {
      let message = "Failed to generate OTP";

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

  const verifyOtp = api.otp.verify.useMutation({
    onSuccess: () => {
      setStatus({
        type: "success",
        message: "OTP verified successfully!",
      });
      // Directly move to application form after successful verification
      setTimeout(() => {
        setStep(3);
      }, 500);
    },
    onError: (error) => {
      let message = "Invalid OTP. Please try again.";

      if (error.data?.code === "INTERNAL_SERVER_ERROR") {
        message = error.message;
      } else if (error.message) {
        message = error.message;
      }

      setStatus({
        type: "error",
        message,
      });
      // Keep user on verify step so they can retry
    },
  });

  const handleGenerateOtp = async () => {
    if (mobileNumber?.length !== 10) {
      setStatus({
        type: "error",
        message: "Please enter a valid 10-digit mobile number",
      });
      return;
    }

    if (!termsAccepted) {
      setStatus({
        type: "error",
        message: "Please accept the Terms and Conditions to proceed",
      });
      return;
    }

    await generateOtp.mutateAsync({
      mobile_number: mobileNumber,
      scheme_id: schemeId,
    });
  };

  const handleVerifyOtp = async () => {
    if (otp?.length !== 6) {
      setStatus({
        type: "error",
        message: "Please enter a valid 6-digit OTP",
      });
      return;
    }

    await verifyOtp.mutateAsync({
      mobile_number: mobileNumber,
      otp,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (step === 0) {
      await handleGenerateOtp();
    } else if (step === 1) {
      await handleVerifyOtp();
    }
  };

  // Step 3: Show application form after OTP verification
  if (step === 3) {
    return (
      <ApplicationForm
        initialSchemeId={schemeId}
        initialSchemeName={schemeName}
        initialMobileNumber={mobileNumber}
      />
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6"
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="text-lg font-medium">OTP Verification</div>
        <div className="text-sm text-gray-500">Step {step + 1} of 2</div>
      </div>

      <div className="h-2 w-full rounded bg-gray-200">
        <div
          className="h-2 rounded bg-blue-600 transition-all duration-300"
          style={{ width: `${((step + 1) / 2) * 100}%` }}
        />
      </div>

      {/* Status messages */}
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

      {/* Step 0: Enter mobile and scheme */}
      {step === 0 && (
        <section className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                disabled={generateOtp.isPending}
                className="mt-1 w-full rounded border px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                <span className="text-red-500">*</span> Scheme
              </label>
              <p className="mt-1 w-full rounded border bg-gray-50 px-3 py-2">
                {schemeName}
              </p>
            </div>
          </div>

          {/* Terms and Conditions Checkbox */}
          <div className="space-y-3 rounded-lg bg-gray-50 p-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                disabled={generateOtp.isPending || loadingTerms}
                className="mt-1 cursor-pointer disabled:opacity-60"
              />
              <div className="flex-1">
                <div className="text-sm text-gray-700">
                  I have read and accept the{" "}
                  {termsUrl ? (
                    <a
                      href={termsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Terms and Conditions
                    </a>
                  ) : (
                    <span className="font-medium text-gray-600">
                      Terms and Conditions
                    </span>
                  )}
                </div>
                {loadingTerms && (
                  <p className="mt-1 text-xs text-gray-500">
                    Loading document...
                  </p>
                )}
              </div>
            </label>
          </div>
        </section>
      )}

      {/* Step 1: Enter OTP */}
      {step === 1 && (
        <section className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                <span className="text-red-500">*</span> Enter OTP
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                disabled={verifyOtp.isPending}
                className="mt-1 w-full rounded border px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
                required
                autoFocus
              />
            </div>
          </div>
        </section>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between space-x-2 pt-4">
        <div>
          {step === 1 && (
            <button
              onClick={() => {
                setStep(0);
                setOtp("");
                setStatus(null);
              }}
              disabled={verifyOtp.isPending}
              className="rounded bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300 disabled:bg-gray-300 disabled:opacity-60"
              type="button"
            >
              Back
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {step === 0 && (
            <button
              type="submit"
              disabled={generateOtp.isPending || !termsAccepted || loadingTerms}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
            >
              {generateOtp.isPending ? "Sending..." : "Generate OTP"}
            </button>
          )}

          {step === 1 && (
            <button
              type="submit"
              disabled={verifyOtp.isPending}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
            >
              {verifyOtp.isPending ? "Verifying..." : "Verify OTP"}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
