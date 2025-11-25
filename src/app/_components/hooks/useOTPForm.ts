/**
 * Custom hook for OTP form functionality
 */

import { useState } from "react";
import { api } from "~/trpc/react";
import { clientLogger } from "~/utils/clientLogger";
import type { OTPStatus, OTPStep } from "~/app/_components/types/otp.types";

interface UseOTPFormOptions {
  schemeId?: number;
  schemeName?: string;
  termsAndConditionsFileName?: string;
}

export function useOTPForm(options: UseOTPFormOptions = {}) {
  const { schemeId = 1 } = options;
  const [mobileNumber, setMobileNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [status, setStatus] = useState<OTPStatus | null>(null);
  const [step, setStep] = useState<OTPStep>(0);

  const generateOtp = api.otp.generate.useMutation({
    onSuccess: () => {
      clientLogger.info("OTP generated successfully", { mobileNumber });
      setStatus({
        type: "success",
        message: "OTP sent to your mobile number.",
      });
      setStep(1);
    },
    onError: (error) => {
      clientLogger.error("Failed to generate OTP", error, { mobileNumber });
      let message = "Failed to generate OTP";

      if (
        (error.data as Record<string, unknown>)?.code ===
        "INTERNAL_SERVER_ERROR"
      ) {
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
      clientLogger.info("OTP verified successfully", { mobileNumber });
      setStatus({
        type: "success",
        message: "OTP verified successfully!",
      });
      setTimeout(() => {
        setStep(3);
      }, 500);
    },
    onError: (error) => {
      clientLogger.error("Failed to verify OTP", error, { mobileNumber });
      let message = "Invalid OTP. Please try again.";

      if (
        (error.data as Record<string, unknown>)?.code ===
        "INTERNAL_SERVER_ERROR"
      ) {
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

  const handleGenerateOtp = async (): Promise<void> => {
    if ((mobileNumber?.length ?? 0) !== 10) {
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

  const handleVerifyOtp = async (): Promise<void> => {
    if ((otp?.length ?? 0) !== 6) {
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

  const handleBackToInput = (): void => {
    setStep(0);
    setOtp("");
    setStatus(null);
  };

  return {
    // State
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
    // Mutations
    generateOtp,
    verifyOtp,
    // Handlers
    handleGenerateOtp,
    handleVerifyOtp,
    handleBackToInput,
  };
}
