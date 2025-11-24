import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { getPresignedUrl, getPresignedUploadUrl } from "~/server/utils/s3";
import { generateS3Key } from "~/utils/fileUpload";
import { invokePdfGenerator } from "~/server/utils/lambda";
import type { PdfPayload } from "~/types/pdfPayload";
import logger from "~/server/utils/logger";

/**
 * Input mirrors the prisma `scheme_application` fields used here.
 * Keep types conservative (strings for many fields) to avoid parsing issues on the client.
 */
const ApplicationInput = z.object({
  mobile_number: z.string().length(10, "Mobile number must be 10 digits"),
  applicant_name: z.string().max(200, "Applicant name max 200 characters"),
  father_or_husband_name: z
    .string()
    .max(200, "Father/Husband name max 200 characters")
    .optional()
    .or(z.literal(""))
    .default(""),
  dob: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), "Invalid date format"),
  id_type: z
    .string()
    .max(20, "ID type max 20 characters")
    .optional()
    .or(z.literal(""))
    .default(""),
  id_number: z
    .string()
    .max(20, "ID number max 20 characters")
    .optional()
    .or(z.literal(""))
    .default(""),
  aadhar_number: z.string().length(12, "Aadhar number must be 12 digits"),
  permanent_address: z.string().optional().or(z.literal("")).default(""),
  permanent_address_pincode: z
    .string()
    .max(6, "Pincode max 6 characters")
    .optional()
    .or(z.literal(""))
    .default(""),
  postal_address: z.string().optional().or(z.literal("")).default(""),
  postal_address_pincode: z
    .string()
    .max(6, "Pincode max 6 characters")
    .optional()
    .or(z.literal(""))
    .default(""),
  email: z
    .string()
    .email("Invalid email")
    .optional()
    .or(z.literal(""))
    .default(""),
  annual_income: z.string().optional().or(z.literal("")).default(""),
  plot_category: z
    .string()
    .max(10, "Plot category max 10 characters")
    .optional()
    .or(z.literal(""))
    .default(""),
  sub_category: z
    .string()
    .max(100, "Sub-category max 100 characters")
    .optional()
    .or(z.literal(""))
    .default(""),
  registration_fees: z
    .string()
    .optional()
    .or(z.literal("0.00"))
    .default("0.00"),
  processing_fees: z.string().optional().or(z.literal("0.00")).default("0.00"),
  total_payable_amount: z
    .string()
    .optional()
    .or(z.literal("0.00"))
    .default("0.00"),
  payment_mode: z
    .string()
    .max(10, "Payment mode max 10 characters")
    .optional()
    .or(z.literal(""))
    .default(""),
  dd_id_or_transaction_id: z
    .string()
    .max(100, "Transaction ID max 100 characters")
    .optional()
    .or(z.literal(""))
    .default(""),
  dd_date_or_transaction_date: z
    .string()
    .optional()
    .or(z.literal(""))
    .default(""),
  dd_amount_or_transaction_amount: z
    .string()
    .optional()
    .or(z.literal("0.00"))
    .default("0.00"),
  payer_account_holder_name: z
    .string()
    .max(200, "Payer name max 200 characters")
    .optional()
    .or(z.literal(""))
    .default(""),
  payer_bank_name: z
    .string()
    .max(200, "Bank name max 200 characters")
    .optional()
    .or(z.literal(""))
    .default(""),
  payment_proof: z
    .string()
    .max(100, "Payment proof max 100 characters")
    .optional()
    .or(z.literal(""))
    .default(""),
  payment_status: z
    .string()
    .max(20, "Payment status max 20 characters")
    .optional()
    .or(z.literal("pending"))
    .default("pending"),
  applicant_account_holder_name: z
    .string()
    .max(200, "Applicant account holder name max 200 characters")
    .optional()
    .or(z.literal(""))
    .default(""),
  applicant_account_number: z
    .string()
    .max(20, "Applicant account number max 20 characters")
    .optional()
    .or(z.literal(""))
    .default(""),
  applicant_bank_name: z
    .string()
    .max(200, "Applicant bank name max 200 characters")
    .optional()
    .or(z.literal(""))
    .default(""),
  applicant_bank_branch_address: z
    .string()
    .optional()
    .or(z.literal(""))
    .default(""),
  applicant_bank_ifsc: z
    .string()
    .max(11, "IFSC max 11 characters")
    .optional()
    .or(z.literal(""))
    .default(""),
  scheme_id: z.number().int("Scheme ID must be an integer"),
  // optional fields the server will set
  application_submission_date: z.string().optional(),
  application_number: z.number().int().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  lottery_status: z.string().optional(),
  rejection_remark: z.string().optional(),
  application_status: z.string().optional(),
  application_pdf: z.string().optional(),
});

export const applicationRouter = createTRPCRouter({
  create: publicProcedure
    .input(ApplicationInput)
    .mutation(async ({ ctx, input }) => {
      try {
        logger.debug(
          { mobileNumber: input.mobile_number, schemeId: input.scheme_id },
          "Creating new application",
        );

        // Verify the scheme exists
        const scheme = await ctx.db.scheme_scheme.findUnique({
          where: { id: input.scheme_id },
        });

        if (!scheme) {
          logger.warn(
            { schemeId: input.scheme_id },
            "Scheme not found for application creation",
          );
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Scheme not found",
          });
        }

        // Check if an application already exists for this mobile and scheme
        const existingApp = await ctx.db.scheme_application.findFirst({
          where: {
            mobile_number: input.mobile_number,
            scheme_id: input.scheme_id,
          },
        });

        if (existingApp) {
          logger.warn(
            {
              mobileNumber: input.mobile_number,
              schemeId: input.scheme_id,
              existingApplicationNumber: existingApp.application_number,
            },
            "Duplicate application attempt for mobile and scheme",
          );
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "An application already exists for this mobile number and scheme",
          });
        }

        // Transactionally reserve an application number from the scheme and create the application.
        const application = await ctx.db.$transaction(async (prisma) => {
          const schemeData = await prisma.scheme_scheme.findUnique({
            where: { id: input.scheme_id },
            select: { id: true, next_application_number: true },
          });

          if (
            !schemeData?.id ||
            typeof schemeData.next_application_number !== "number"
          ) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to retrieve scheme data",
            });
          }

          const applicationNumber: number = schemeData.next_application_number;

          // Increment the scheme.next_application_number
          await prisma.scheme_scheme.update({
            where: { id: input.scheme_id },
            data: { next_application_number: applicationNumber + 1 },
          });

          // Create application with timestamps and computed application_number
          const created = await prisma.scheme_application.create({
            data: {
              ...input,
              // Convert date string (YYYY-MM-DD) to Date object for DateTime @db.Date field
              dob: new Date(input.dob + "T00:00:00Z"),
              // Convert transaction date string to Date object
              dd_date_or_transaction_date: input.dd_date_or_transaction_date
                ? new Date(input.dd_date_or_transaction_date + "T00:00:00Z")
                : new Date(),
              application_number: applicationNumber,
              application_submission_date: new Date(),
              created_at: new Date(),
              updated_at: new Date(),
              application_status: "pending",
              rejection_remark: "",
              lottery_status: "pending",
            },
          });

          return created;
        });

        if (!application) {
          logger.error(
            { schemeId: input.scheme_id },
            "Transaction failed, application not created",
          );
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Transaction failed, application not created",
          });
        }

        logger.info(
          {
            applicationNumber: application.application_number,
            mobileNumber: input.mobile_number,
            schemeId: input.scheme_id,
          },
          "Application created successfully",
        );

        return application;
      } catch (error) {
        // Re-throw TRPC errors as-is
        if (error instanceof TRPCError) {
          throw error;
        }

        logger.error(
          {
            mobileNumber: input.mobile_number,
            schemeId: input.scheme_id,
            error: error instanceof Error ? error.message : String(error),
          },
          "Failed to create application",
        ); // Log unexpected errors
        console.error("Application creation error:", error);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to create application",
        });
      }
    }),

  /**
   * Upload payment proof file to S3
   * Input: applicationId, filename, fileBuffer (base64), mimeType
   * Output: S3 URL or filename if S3 not configured
   */
  // uploadPaymentProof: publicProcedure
  //   .input(
  //     z.object({
  //       applicationNumber: z.number().int("Application number must be an integer"),
  //       schemeName: z.string().max(255, "Scheme name too long"),
  //       schemeId: z.number().int("Scheme ID must be an integer"),
  //       filename: z.string().max(255, "Filename too long"),
  //       fileBuffer: z.string().describe("File content as base64 string"),
  //       mimeType: z.string().max(50, "MIME type too long"),
  //     }),
  //   )
  //   .mutation(async ({ input }) => {
  //     try {
  //       // Validate file type
  //       console.log("Validating file MIME type:", input.mimeType);
  //       const allowedMimeTypes = ["application/pdf", "image/jpeg", "image/png","image/jpg"];
  //       if (!allowedMimeTypes.includes(input.mimeType)) {
  //         throw new TRPCError({
  //           code: "BAD_REQUEST",
  //           message:
  //             "File type not allowed. Only PDF, JPEG, JPG, and PNG are supported.",
  //         });
  //       }

  //       // Convert base64 to buffer
  //       const buffer = Buffer.from(input.fileBuffer, "base64");

  //       // Validate file size (max 5MB)
  //       const maxSizeBytes = 5 * 1024 * 1024; // 5MB
  //       if (buffer.length > maxSizeBytes) {
  //         throw new TRPCError({
  //           code: "BAD_REQUEST",
  //           message: "File size exceeds 5MB limit",
  //         });
  //       }
  //       console.log("File buffer size (bytes):", buffer.length);
  //       // Generate S3 key
  //       const s3Key = generateS3Key(
  //         input.applicationNumber,
  //         input.filename,
  //         input.schemeId,
  //       );

  //       console.log("Uploading payment proof to S3 with key:", s3Key);
  //       // Upload to S3
  //       const s3Url = await uploadToS3(s3Key, buffer, input.mimeType);

  //       if (!s3Url) {
  //         // S3 not configured, return filename as fallback
  //         console.warn(
  //           "S3 not configured, returning filename as payment_proof",
  //         );
  //         return {
  //           success: true,
  //           url: input.filename,
  //           key: s3Key,
  //           bucket: null,
  //         };
  //       }

  //       return {
  //         success: true,
  //         url: s3Url,
  //         key: s3Key,
  //         bucket: true, // Indicates file was uploaded to S3
  //       };
  //     } catch (error) {
  //       // Re-throw TRPC errors as-is
  //       if (error instanceof TRPCError) {
  //         throw error;
  //       }

  //       // Log unexpected errors
  //       console.error("Payment proof upload error:", error);

  //       throw new TRPCError({
  //         code: "INTERNAL_SERVER_ERROR",
  //         message:
  //           error instanceof Error
  //             ? error.message
  //             : "Failed to upload payment proof",
  //       });
  //     }
  //   }),

  /**
   * Get application by mobile number and application number and scheme name
   * Used for application lookup/verification
   */
  getByMobileAndApplicationNumberAndSchemeId: publicProcedure
    .input(
      z.object({
        mobile_number: z.string().length(10, "Mobile number must be 10 digits"),
        application_number: z
          .number()
          .int("Application number must be an integer"),
        scheme_id: z.number().int("Scheme ID must be an integer"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const application = await ctx.db.scheme_application.findFirst({
          where: {
            mobile_number: input.mobile_number,
            application_number: input.application_number,
            scheme_id: input.scheme_id,
          },
          include: {
            scheme_scheme: true,
          },
        });

        if (!application) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Application not found with the provided details",
          });
        }

        return application;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error("Get application error:", error);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to fetch application",
        });
      }
    }),

  /**
   * Get application by ID with scheme details
   */
  getById: publicProcedure
    .input(z.number().int("Application ID must be an integer"))
    .query(async ({ ctx, input }) => {
      try {
        const application = await ctx.db.scheme_application.findUnique({
          where: { id: input },
          include: {
            scheme_scheme: true,
          },
        });

        if (!application) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Application not found",
          });
        }

        return application;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error("Get application by ID error:", error);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to fetch application",
        });
      }
    }),

  /**
   * Download application PDF
   * Returns presigned S3 URL for the stored PDF file
   */
  downloadPdf: publicProcedure
    .input(
      z.object({
        mobile_number: z.string().length(10, "Mobile number must be 10 digits"),
        application_number: z
          .number()
          .int("Application number must be an integer"),
        scheme_id: z.number().int("Scheme ID must be an integer"),
        application_id: z.number().int("Application ID must be an integer"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        logger.debug(
          { applicationId: input.application_id },
          "Starting PDF download process",
        );

        const application = await ctx.db.scheme_application.findUnique({
          where: { id: BigInt(input.application_id) },
        });

        if (!application) {
          logger.warn(
            { applicationId: input.application_id },
            "Application not found for PDF download",
          );
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Application not found",
          });
        }

        // Check if PDF has been generated and stored
        if (!application.application_pdf) {
          logger.info(
            { applicationId: input.application_id },
            "PDF not yet generated, returning NOT_FOUND",
          );
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Application PDF not available for download",
          });
        }

        logger.debug(
          { fileKey: application.application_pdf },
          "Application PDF key found, generating presigned URL",
        );

        // Get presigned URL from S3 for the stored file key
        const presignedUrl = await getPresignedUrl(
          application.application_pdf,
          3600, // 1 hour expiration
        );

        if (!presignedUrl) {
          logger.error(
            { fileKey: application.application_pdf },
            "Failed to generate presigned URL",
          );
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to generate presigned URL",
          });
        }

        logger.info(
          {
            applicationId: input.application_id,
            applicationNumber: application.application_number,
          },
          "Presigned URL generated successfully",
        );

        return {
          downloadUrl: presignedUrl,
          filename: `application_${application.application_number}.pdf`,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        logger.error(
          {
            applicationId: input.application_id,
            error: error instanceof Error ? error.message : String(error),
          },
          "Download PDF error",
        );

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to generate download link",
        });
      }
    }),

  generatePdf: publicProcedure
    .input(
      ApplicationInput.extend({
        application_id: z
          .number()
          .int("Application ID must be an integer")
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        logger.debug(
          {
            mobileNumber: input.mobile_number,
            schemeId: input.scheme_id,
          },
          "Starting PDF generation process",
        );

        // Determine application ID from input or query database
        let applicationId = input.application_id;

        if (!applicationId) {
          // Query database to find the application
          const application = await ctx.db.scheme_application.findFirst({
            where: {
              mobile_number: input.mobile_number,
              scheme_id: BigInt(input.scheme_id),
            },
            select: { id: true },
          });

          if (!application) {
            logger.warn(
              {
                mobileNumber: input.mobile_number,
                schemeId: input.scheme_id,
              },
              "Application not found for PDF generation",
            );
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Application not found",
            });
          }

          applicationId = Number(application.id);
        }

        logger.debug(
          { applicationId },
          "Enriching PDF payload with scheme data",
        );

        // Enrich payload with scheme data
        const scheme = await ctx.db.scheme_scheme.findUnique({
          where: { id: input.scheme_id },
        });

        const payload: PdfPayload = {
          scheme_company: scheme?.company,
          scheme_id: input.scheme_id,
          scheme_name: scheme?.name ?? "",
          scheme_address: scheme?.address ?? "",
          application_number: applicationId,
          application_submission_date: new Date().toISOString().split("T")[0],
          applicant_name: input.applicant_name,
          father_or_husband_name: input.father_or_husband_name,
          dob: input.dob,
          mobile_number: input.mobile_number,
          id_type: input.id_type,
          id_number: input.id_number,
          pan_number: "ABCDE1234F", // PAN not collected currently, have to replace with aadhar number
          permanent_address: "abcd", // temporary placeholder
          permanent_address_pincode: input.permanent_address_pincode,
          postal_address: "abcd", // temporary placeholder
          postal_address_pincode: input.postal_address_pincode,
          annual_income: input.annual_income,
          plot_category: input.plot_category,
          registration_fees:
            parseFloat(String(input.registration_fees || 0)) || 0,
          processing_fees: parseFloat(String(input.processing_fees || 0)) || 0,
          total_payable_amount:
            parseFloat(String(input.total_payable_amount || 0)) || 0,
          payment_mode: input.payment_mode,
          payment_status: input.payment_status,
          dd_id_or_transaction_id: input.dd_id_or_transaction_id,
          dd_date_or_transaction_date: input.dd_date_or_transaction_date,
          dd_amount:
            parseFloat(String(input.dd_amount_or_transaction_amount || 0)) || 0,
          dd_amount_or_transaction_amount:
            parseFloat(String(input.dd_amount_or_transaction_amount || 0)) || 0,
          payee_account_holder_name: input.payer_account_holder_name, // have to change names in pdf payload
          payee_bank_name: input.payer_bank_name,
          refund_account_holder: input.applicant_account_holder_name,
          refund_account_number: input.applicant_account_number,
          refund_bank_name: input.applicant_bank_name,
          refund_bank_ifsc: input.applicant_bank_ifsc,
          payer_account_holder_name: input.applicant_account_holder_name,
          payer_bank_name: input.applicant_bank_name,
          applicant_account_holder_name: input.applicant_account_holder_name,
          applicant_account_number: input.applicant_account_number,
          applicant_bank_name: input.applicant_bank_name,
          applicant_bank_ifsc: input.applicant_bank_ifsc,
          applicant_bank_branch_address: input.applicant_bank_branch_address,
          print_date: new Date().toISOString().split("T")[0],
        };

        logger.debug({}, "Invoking Lambda to generate PDF");

        // Invoke Lambda to generate PDF
        const lambdaResult = await invokePdfGenerator(payload);

        if (!lambdaResult.success || !lambdaResult.file_key) {
          logger.error({ applicationId }, "Lambda failed to generate PDF");
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Lambda failed to generate PDF",
          });
        }

        logger.info(
          {
            fileKey: lambdaResult.file_key,
            bucket: lambdaResult.bucket,
            applicationId,
          },
          "PDF generated by Lambda successfully",
        );

        // Update application with the S3 file key path
        await ctx.db.scheme_application.update({
          where: { id: BigInt(applicationId) },
          data: { application_pdf: lambdaResult.file_key },
        });

        logger.info(
          { fileKey: lambdaResult.file_key, applicationId },
          "Application updated with PDF file key in database",
        );

        return {
          success: true,
          file_key: lambdaResult.file_key,
          bucket: lambdaResult.bucket,
          message: "PDF generated successfully and saved to application",
        };
      } catch (error: unknown) {
        if (error instanceof TRPCError) {
          throw error;
        }

        logger.error(
          {
            error: error instanceof Error ? error.message : String(error),
          },
          "PDF generation error",
        );

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "PDF generation failed",
        });
      }
    }),

  /**
   * Get presigned URL for direct S3 upload
   * Client uploads directly to S3 using this URL
   */
  getPresignedUploadUrl: publicProcedure
    .input(
      z.object({
        filename: z.string().max(255, "Filename too long"),
        mimeType: z.string().max(50, "MIME type too long"),
        applicationNumber: z
          .number()
          .int("Application number must be an integer"),
        schemeId: z.number().int("Scheme ID must be an integer"),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        logger.debug(
          {
            filename: input.filename,
            mimeType: input.mimeType,
            applicationNumber: input.applicationNumber,
          },
          "Requesting presigned upload URL",
        );

        // Validate file type
        const allowedMimeTypes = [
          "application/pdf",
          "image/jpeg",
          "image/png",
          "image/jpg",
        ];
        if (!allowedMimeTypes.includes(input.mimeType)) {
          logger.warn(
            { mimeType: input.mimeType },
            "Unsupported file type requested",
          );
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "File type not allowed. Only PDF, JPEG, JPG, and PNG are supported.",
          });
        }

        // Generate S3 key
        const s3Key = generateS3Key(
          input.applicationNumber,
          input.filename,
          input.schemeId,
        );

        logger.debug({ s3Key }, "Generated S3 key for upload");

        // Get presigned URL for upload
        const presignedUrl = await getPresignedUploadUrl(s3Key, input.mimeType);

        if (!presignedUrl) {
          logger.error({ s3Key }, "Failed to generate presigned upload URL");
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to generate presigned upload URL",
          });
        }

        logger.info(
          {
            applicationNumber: input.applicationNumber,
            filename: input.filename,
          },
          "Presigned upload URL generated successfully",
        );

        return {
          success: true,
          presignedUrl,
          s3Key,
          bucket: process.env.AWS_S3_BUCKET_NAME ?? "scheme-application-files",
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        logger.error(
          {
            applicationNumber: input.applicationNumber,
            error: error instanceof Error ? error.message : String(error),
          },
          "Failed to get presigned upload URL",
        );

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to generate presigned URL",
        });
      }
    }),
});
