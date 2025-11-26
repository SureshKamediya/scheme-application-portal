"use client";

import { ApplicationForm } from "./application";
import { useOTPForm } from "./hooks/useOTPForm";
import type { OTPFormProps } from "./types";

export function OTPForm({
  schemeId = 1,
  schemeName = "Default-Scheme",
  termsAndConditionsFileName = "",
}: OTPFormProps = {}) {
  const {
    mobileNumber,
    setMobileNumber,
    otp,
    setOtp,
    termsAccepted,
    setTermsAccepted,
    status,
    setStatus,
    step,
    setStep,
    otpTimeout,
    generateOtp,
    verifyOtp,
    handleGenerateOtp,
    handleVerifyOtp,
    stopOtpTimeout,
  } = useOTPForm({ schemeId, schemeName, termsAndConditionsFileName });

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
                : status.type === "warning"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-blue-100 text-blue-800"
          }`}
        >
          {status.message}
        </div>
      )}

      {/* OTP Timeout Indicator */}
      {otpTimeout.isActive && step === 1 && (
        <div className="rounded-md bg-blue-50 p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-blue-900">
              OTP Expires in:
            </div>
            <div className="text-lg font-bold text-blue-600">
              {Math.floor(otpTimeout.remainingSeconds / 60)}:
              {String(otpTimeout.remainingSeconds % 60).padStart(2, "0")}
            </div>
          </div>
          <div className="mt-2 h-1 w-full rounded-full bg-blue-200">
            <div
              className="h-1 rounded-full bg-blue-600 transition-all duration-300"
              style={{
                width: `${(otpTimeout.remainingSeconds / 300) * 100}%`,
              }}
            />
          </div>
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
                disabled={generateOtp.isPending}
                className="mt-1 cursor-pointer disabled:opacity-60"
              />
              <div className="flex-1">
                <div className="text-sm text-gray-700">
                  I have read and accept the{" "}
                  {termsAndConditionsFileName ? (
                    <a
                      href={termsAndConditionsFileName}
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
                stopOtpTimeout();
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
              disabled={generateOtp.isPending || !termsAccepted}
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
