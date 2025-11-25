/**
 * Custom hook for ApplicationLookup functionality
 */

import { useState } from "react";
import { api } from "~/trpc/react";
import { clientLogger } from "~/utils/clientLogger";
import type {
  ApplicationStatus,
  ApplicationResponse,
  ErrorResponse,
} from "~/app/_components/types";

export function useApplicationLookup() {
  const [status, setStatus] = useState<ApplicationStatus | null>(null);

  const getApplication =
    api.application.getByMobileAndApplicationNumberAndSchemeId?.useMutation({
      onSuccess: (application: unknown) => {
        const app = application as ApplicationResponse;
        clientLogger.info("Application found successfully", {
          applicationId: app.id,
        });
        setStatus({
          type: "success",
          message: "Application found!",
        });
      },
      onError: (error: unknown) => {
        const err = error as ErrorResponse;
        clientLogger.error("Error fetching application", err, {
          errorType: typeof err,
        });
        setStatus({
          type: "error",
          message: "Application not found",
        });
      },
    });

  return {
    status,
    setStatus,
    getApplication,
  };
}
