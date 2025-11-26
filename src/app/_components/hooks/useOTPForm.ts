/**
 * Custom hook for OTP form functionality
 */

import { useState, useEffect, useRef } from "react";
import { api } from "~/trpc/react";
import { clientLogger } from "~/utils/clientLogger";
import type {
  OTPStatus,
  OTPStep,
  OTPTimeout,
} from "~/app/_components/types/otp.types";

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
  const [otpTimeout, setOtpTimeout] = useState<OTPTimeout>({
    isActive: false,
    remainingSeconds: 0,
  });
  const timeoutIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const generateOtp = api.otp.generate.useMutation({
    onSuccess: () => {
      clientLogger.info("OTP generated successfully", { mobileNumber });
      setStatus({
        type: "success",
        message: "OTP sent to your mobile number. Valid for 5 minutes.",
      });
      setStep(1);
      startOtpTimeout();
    },
    onError: (error) => {
      clientLogger.error("Failed to generate OTP", error, { mobileNumber });
      let message = "Error sending OTP. Please try later.";

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
    stopOtpTimeout();
  };

  const startOtpTimeout = (): void => {
    const OTP_TIMEOUT_SECONDS = 300; // 5 minutes
    setOtpTimeout({
      isActive: true,
      remainingSeconds: OTP_TIMEOUT_SECONDS,
    });

    if (timeoutIntervalRef.current) {
      clearInterval(timeoutIntervalRef.current);
    }

    timeoutIntervalRef.current = setInterval(() => {
      setOtpTimeout((prev) => {
        if (prev.remainingSeconds <= 1) {
          if (timeoutIntervalRef.current) {
            clearInterval(timeoutIntervalRef.current);
          }
          setStatus({
            type: "error",
            message: "OTP expired. Please generate a new OTP.",
          });
          return {
            isActive: false,
            remainingSeconds: 0,
          };
        }
        return {
          isActive: true,
          remainingSeconds: prev.remainingSeconds - 1,
        };
      });
    }, 1000);
  };

  const stopOtpTimeout = (): void => {
    if (timeoutIntervalRef.current) {
      clearInterval(timeoutIntervalRef.current);
      timeoutIntervalRef.current = null;
    }
    setOtpTimeout({
      isActive: false,
      remainingSeconds: 0,
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutIntervalRef.current) {
        clearInterval(timeoutIntervalRef.current);
      }
    };
  }, []);

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
    otpTimeout,
    // Mutations
    generateOtp,
    verifyOtp,
    // Handlers
    handleGenerateOtp,
    handleVerifyOtp,
    handleBackToInput,
    stopOtpTimeout,
  };
}
