/**
 * Custom hook for Application Form functionality
 */

import { useState } from "react";
import { api } from "~/trpc/react";
import { clientLogger } from "~/utils/clientLogger";
import { validateStep } from "~/app/_components/utils/validation";
import { calculateFeesAndCategory } from "~/app/_components/utils/fees";
import type {
  FormState,
  ValidationErrors,
  ApplicationStatus,
  SubmittedApplicationData,
  UploadedFile,
  PresignedUrlResponse,
} from "~/app/_components/types";

interface UseApplicationFormOptions {
  initialSchemeId?: number;
  initialSchemeName?: string;
  initialMobileNumber?: string;
}

const defaultFormState: FormState = {
  mobile_number: "",
  applicant_name: "",
  father_or_husband_name: "",
  dob: "",
  id_type: "",
  id_number: "",
  aadhar_number: "",
  permanent_address: "",
  permanent_address_pincode: "",
  postal_address: "",
  postal_address_pincode: "",
  email: "",
  annual_income: "",
  plot_category: "",
  sub_category: "",
  registration_fees: "",
  processing_fees: "",
  total_payable_amount: "",
  payment_mode: "",
  dd_id_or_transaction_id: "",
  dd_date_or_transaction_date: "",
  dd_amount_or_transaction_amount: "0.00",
  payer_account_holder_name: "",
  payer_bank_name: "",
  payment_proof: "",
  applicant_account_holder_name: "",
  applicant_account_number: "",
  applicant_bank_name: "",
  applicant_bank_branch_address: "",
  applicant_bank_ifsc: "",
  scheme_id: 1,
  scheme_name: "Default-Scheme",
};

export function useApplicationForm(options: UseApplicationFormOptions = {}) {
  const {
    initialSchemeId = 1,
    initialSchemeName = "Default-Scheme",
    initialMobileNumber = "",
  } = options;

  const [state, setState] = useState<FormState>({
    ...defaultFormState,
    mobile_number: initialMobileNumber,
    scheme_id: initialSchemeId,
    scheme_name: initialSchemeName,
  });

  const [submittedApplicationData, setSubmittedApplicationData] =
    useState<SubmittedApplicationData | null>(null);
  const [status, setStatus] = useState<ApplicationStatus | null>(null);
  const [step, setStep] = useState<number>(0);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});

  const createApplication = api.application.create.useMutation({
    onSuccess: async (application: unknown) => {
      const app = application as { application_number: number };

      if (uploadedFile) {
        await handleFileUpload(app, state, uploadedFile, setStatus);
      } else {
        setStatus({
          type: "success",
          message: `Application submitted successfully without payment proof! Your application number is ${app.application_number}`,
        });
      }

      setTimeout(() => {
        setSubmittedApplicationData({
          mobile_number: state.mobile_number,
          application_number: String(app.application_number),
          scheme_name: state.scheme_name,
          scheme_id: Number(state.scheme_id),
        });
      }, 2000);
    },
    onError: (error) => {
      clientLogger.error("Application submission error", error);
      let message = "Failed to submit application";

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

  const getPresignedUrlMutation =
    api.application.getPresignedUploadUrl.useMutation({
      onError: (error) => {
        clientLogger.error("Presigned URL error", error);
      },
    });

  const onChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ): void => {
    setState((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  const handleAnnualIncomeChange = (incomeRange: string): void => {
    const calculation = calculateFeesAndCategory(incomeRange);
    if (calculation) {
      setState((s) => ({
        ...s,
        annual_income: incomeRange,
        plot_category: calculation.category,
        registration_fees: calculation.registrationFees,
        processing_fees: calculation.processingFees,
        total_payable_amount: calculation.totalAmount,
      }));
    }
  };

  const handleNext = (e?: React.FormEvent): void => {
    e?.preventDefault();
    setStatus(null);

    const newErrors = validateStep(step, state);
    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      if (step < 2) setStep((s) => s + 1);
    }
  };

  const handleBack = (e?: React.FormEvent): void => {
    e?.preventDefault();
    setStatus(null);
    setErrors({});
    if (step > 0) setStep((s) => s - 1);
  };

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setStatus(null);

    let allErrors: ValidationErrors = {};
    for (let i = 0; i <= 2; i++) {
      const stepErrors = validateStep(i, state);
      allErrors = { ...allErrors, ...stepErrors };
    }

    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      for (let i = 0; i <= 2; i++) {
        const stepErrors = validateStep(i, state);
        if (Object.keys(stepErrors).length > 0) {
          setStep(i);
          setStatus({
            type: "error",
            message: `Please fix the errors in Step ${i + 1}`,
          });
          return;
        }
      }
      return;
    }

    const applicationData = {
      ...state,
      registration_fees: state.registration_fees || "0.00",
      processing_fees: state.processing_fees || "0.00",
      total_payable_amount: state.total_payable_amount || "0.00",
      dd_amount_or_transaction_amount:
        state.dd_amount_or_transaction_amount || "0.00",
    };

    try {
      await createApplication.mutateAsync(applicationData);
    } catch (error) {
      clientLogger.error("Application submission error", error);
    }
  };

  return {
    // State
    state,
    setState,
    submittedApplicationData,
    setSubmittedApplicationData,
    status,
    setStatus,
    step,
    setStep,
    uploadedFile,
    setUploadedFile,
    errors,
    setErrors,
    // Mutations
    createApplication,
    getPresignedUrlMutation,
    // Handlers
    onChange,
    handleAnnualIncomeChange,
    handleNext,
    handleBack,
    onSubmit,
  };
}

async function handleFileUpload(
  application: { application_number: number },
  state: FormState,
  uploadedFile: UploadedFile,
  setStatus: (status: ApplicationStatus) => void,
): Promise<void> {
  try {
    setStatus({
      type: "info",
      message: "Getting upload URL...",
    });

    const getPresignedUrlMutation =
      api.application.getPresignedUploadUrl.useMutation();

    const presignedUrlResponse = await getPresignedUrlMutation.mutateAsync({
      filename: uploadedFile.name,
      mimeType: uploadedFile.file.type,
      applicationNumber: application.application_number,
      schemeId: state.scheme_id,
    });

    if (!(presignedUrlResponse as PresignedUrlResponse).success) {
      throw new Error("Failed to get presigned URL");
    }

    setStatus({
      type: "info",
      message: "Uploading payment proof to cloud storage...",
    });

    const uploadResponse = await fetch(
      (presignedUrlResponse as PresignedUrlResponse).presignedUrl,
      {
        method: "PUT",
        headers: {
          "Content-Type": uploadedFile.file.type,
        },
        body: uploadedFile.file,
      },
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      clientLogger.error("S3 upload failed", new Error(errorText), {
        status: uploadResponse.status,
      });
      throw new Error(`Failed to upload file to S3: ${uploadResponse.status}`);
    }

    setStatus({
      type: "success",
      message: `Application submitted successfully! Your application number is ${application.application_number}`,
    });

    clientLogger.info("File uploaded successfully to S3", {
      applicationNumber: application.application_number,
    });
  } catch (uploadError) {
    const errorMessage =
      uploadError instanceof Error ? uploadError.message : "File upload failed";

    clientLogger.error("File upload error", uploadError);

    setStatus({
      type: "error",
      message: errorMessage,
    });
  }
}
