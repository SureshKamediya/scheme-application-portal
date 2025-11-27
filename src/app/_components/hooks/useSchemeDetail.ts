/**
 * Custom hook for SchemeDetail functionality
 */

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import type {
  SchemeDetailsData,
  SchemeFileArray,
  SchemeFile,
} from "~/app/_components/types/schemeDetail.types";

const S3_BUCKET = "scheme-application-files";
const S3_REGION = "ap-south-1";

export function useSchemeDetail(schemeId: number) {
  const [termsAndConditionsFileName, setTermsAndConditionsFileName] = useState<
    string | null
  >(null);
  const [paymentQRCodeFileName, setPaymentQRCodeFileName] = useState<
    string | null
  >(null);

  const {
    data: scheme,
    isLoading,
    error,
  } = api.scheme.getById.useQuery({
    schemeId,
  });

  useEffect(() => {
    const schemeFiles: SchemeFileArray =
      (scheme as SchemeDetailsData)?.scheme_schemefiles ?? [];
    if (schemeFiles.length > 0) {
      const termsDoc = schemeFiles.find((file: SchemeFile) => {
        const isMatchByName = file.name?.toLowerCase().includes("terms");
        const isMatchByChoice = file.file_choice
          ?.toLowerCase()
          .includes("terms");

        return isMatchByName ?? isMatchByChoice ?? false;
      });

      const paymentQRCodeDoc = schemeFiles.find((file: SchemeFile) => {
        const isMatchByName = file.name?.toLowerCase().includes("qr");
        const isMatchByChoice = file.file_choice
          ?.toLowerCase()
          .includes("qr");

        return isMatchByName ?? isMatchByChoice ?? false;
      });

      const hasTermsFileAndEnv = termsDoc?.file && S3_BUCKET && S3_REGION;
      if (hasTermsFileAndEnv) {
        const s3BaseUrl = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/`;
        const fullS3Url = `${s3BaseUrl}${termsDoc.file ?? ""}`;
        setTermsAndConditionsFileName(fullS3Url);
      } else {
        setTermsAndConditionsFileName(null);
      }

      const hasPaymentQRCodeFileAndEnv = paymentQRCodeDoc?.file && S3_BUCKET && S3_REGION;
      if (hasPaymentQRCodeFileAndEnv) {
        const s3BaseUrl = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/`;
        const fullS3Url = `${s3BaseUrl}${paymentQRCodeDoc.file ?? ""}`;
        setPaymentQRCodeFileName(fullS3Url);
      } else {
        setPaymentQRCodeFileName(null);
      }
    }
  }, [scheme]);

  const isApplicationOpen =
    (scheme as SchemeDetailsData)?.application_open_date &&
    (scheme as SchemeDetailsData)?.application_close_date &&
    new Date() >=
      new Date((scheme as SchemeDetailsData).application_open_date ?? "") &&
    new Date() <=
      new Date((scheme as SchemeDetailsData).application_close_date ?? "");

  return {
    scheme: scheme as SchemeDetailsData,
    isLoading,
    error,
    termsAndConditionsFileName,
    paymentQRCodeFileName,
    isApplicationOpen,
    S3_BUCKET,
    S3_REGION,
  };
}
