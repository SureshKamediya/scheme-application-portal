/**
 * Custom hook for ApplicationDetails functionality
 */

import { useState } from "react";
import { api } from "~/trpc/react";
import { clientLogger } from "~/utils/clientLogger";
import type {
  ApplicationStatus,
  DownloadPdfResponse,
  GeneratePdfPayload,
} from "~/app/_components/types";

export function useApplicationDetails(applicationId: number) {
  const [status, setStatus] = useState<ApplicationStatus | null>(null);

  const downloadPdfMutation = api.application.downloadPdf.useMutation();
  const generatePdfMutation = api.application.generatePdf.useMutation();
  const getByIdQuery = api.application.getById.useQuery(applicationId);

  const handleDownloadPdf = async (
    mobileNumber: string,
    applicationNumber: number,
    schemeId: number,
  ): Promise<void> => {
    setStatus({
      type: "info",
      message: "Attempting to download PDF...",
    });

    try {
      clientLogger.debug("Attempting to download existing PDF", {
        applicationNumber,
      });

      const response = await downloadPdfMutation.mutateAsync({
        mobile_number: mobileNumber,
        application_number: applicationNumber,
        scheme_id: schemeId,
        application_id: applicationId,
      });

      const { downloadUrl } = response as DownloadPdfResponse;

      if (downloadUrl) {
        window.open(downloadUrl, "_blank");
        setStatus({
          type: "success",
          message: "PDF opened successfully",
        });
        return;
      }
    } catch (err) {
      const error = err as { data?: { code?: string; httpStatus?: number } };
      if (error.data?.code !== "NOT_FOUND") {
        clientLogger.error("downloadPdf error (non-404)", err);
        setStatus({
          type: "error",
          message: "Failed to download PDF",
        });
        return;
      }
    }

    // If not found, generate PDF
    await generateAndDownloadPdf(mobileNumber, applicationNumber, schemeId);
  };

  const generateAndDownloadPdf = async (
    mobileNumber: string,
    applicationNumber: number,
    schemeId: number,
  ): Promise<void> => {
    try {
      clientLogger.debug("PDF not found, requesting generation");
      setStatus({
        type: "info",
        message: "Generating PDF acknowledgement...",
      });

      const fullApplication = getByIdQuery.data;

      if (!fullApplication) {
        throw new Error("Could not fetch full application data");
      }

      let dobString = "1990-01-01";
      if (fullApplication.dob) {
        const dobDate = new Date(fullApplication.dob);
        dobString = dobDate.toISOString().split("T")[0] ?? "1990-01-01";
      }

      let ddDateString = "";
      if (fullApplication.dd_date_or_transaction_date) {
        const ddDate = new Date(fullApplication.dd_date_or_transaction_date);
        ddDateString = ddDate.toISOString().split("T")[0] ?? "";
      }

      let applicationSubmissionString = "2023-01-01";
      if (fullApplication.application_submission_date) {
        const appSubDate = new Date(
          fullApplication.application_submission_date,
        );
        applicationSubmissionString =
          appSubDate.toISOString().split("T")[0] ?? "2023-01-01";
      }

      const generatePayload: GeneratePdfPayload = {
        mobile_number: String(fullApplication.mobile_number ?? ""),
        applicant_name: String(fullApplication.applicant_name ?? ""),
        father_or_husband_name: String(
          fullApplication.father_or_husband_name ?? "",
        ),
        dob: dobString,
        id_type: String(fullApplication.id_type ?? ""),
        id_number: String(fullApplication.id_number ?? ""),
        aadhar_number: String(fullApplication.aadhar_number ?? ""),
        permanent_address: String(fullApplication.permanent_address ?? ""),
        permanent_address_pincode: String(
          fullApplication.permanent_address_pincode ?? "",
        ),
        postal_address: String(fullApplication.postal_address ?? ""),
        postal_address_pincode: String(
          fullApplication.postal_address_pincode ?? "",
        ),
        email: String(fullApplication.email ?? ""),
        annual_income: String(fullApplication.annual_income ?? ""),
        plot_category: String(fullApplication.plot_category ?? ""),
        sub_category: String(fullApplication.sub_category ?? ""),
        registration_fees: String(fullApplication.registration_fees ?? "0.00"),
        processing_fees: String(fullApplication.processing_fees ?? "0.00"),
        total_payable_amount: String(
          fullApplication.total_payable_amount ?? "0.00",
        ),
        payment_mode: String(fullApplication.payment_mode ?? ""),
        dd_id_or_transaction_id: String(
          fullApplication.dd_id_or_transaction_id ?? "",
        ),
        dd_date_or_transaction_date: ddDateString,
        dd_amount_or_transaction_amount: String(
          fullApplication.dd_amount_or_transaction_amount ?? "0.00",
        ),
        payer_account_holder_name: String(
          fullApplication.payer_account_holder_name ?? "",
        ),
        payer_bank_name: String(fullApplication.payer_bank_name ?? ""),
        payment_status: String(fullApplication.payment_status ?? "pending"),
        applicant_account_holder_name: String(
          fullApplication.applicant_account_holder_name ?? "",
        ),
        applicant_account_number: String(
          fullApplication.applicant_account_number ?? "",
        ),
        applicant_bank_name: String(fullApplication.applicant_bank_name ?? ""),
        applicant_bank_branch_address: String(
          fullApplication.applicant_bank_branch_address ?? "",
        ),
        applicant_bank_ifsc: String(fullApplication.applicant_bank_ifsc ?? ""),
        scheme_id: schemeId,
        application_id: applicationId,
        application_submission_date: applicationSubmissionString,
      };

      await generatePdfMutation.mutateAsync(generatePayload);

      clientLogger.debug("PDF generated, attempting to download");
      setStatus({
        type: "info",
        message: "PDF generated, downloading...",
      });

      const response = await downloadPdfMutation.mutateAsync({
        mobile_number: mobileNumber,
        application_number: applicationNumber,
        scheme_id: schemeId,
        application_id: applicationId,
      });

      const { downloadUrl } = response as DownloadPdfResponse;

      if (downloadUrl) {
        window.open(downloadUrl, "_blank");
        setStatus({
          type: "success",
          message: "PDF generated and opened successfully",
        });
        return;
      }

      clientLogger.error("PDF download URL missing after generation");
      setStatus({
        type: "error",
        message:
          "PDF was generated but still not available yet; try again in a few seconds.",
      });
    } catch (err) {
      clientLogger.error("PDF generate/download flow error", err);
      setStatus({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Failed to generate or download PDF",
      });
    }
  };

  return {
    status,
    setStatus,
    downloadPdfMutation,
    generatePdfMutation,
    handleDownloadPdf,
  };
}
