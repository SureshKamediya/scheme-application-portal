import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { uploadToS3 } from "~/server/utils/s3";
import { generateS3Key } from "~/utils/fileUpload";

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
  dob: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid date format"),
  id_type: z
    .string()
    .max(20, "ID type max 20 characters")
    .optional()
    .or(z.literal(""))
    .default(""),
  id_number: z.string().max(20, "ID number max 20 characters").optional().or(z.literal("")).default(""),
  pan_number: z.string().max(10, "PAN number max 10 characters").optional().or(z.literal("")).default(""),
  permanent_address: z
    .string()
    .optional()
    .or(z.literal(""))
    .default(""),
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
  email: z.string().email("Invalid email").optional().or(z.literal("")).default(""),
  annual_income: z.string().optional().or(z.literal("")).default(""),
  plot_category: z.string().max(10, "Plot category max 10 characters").optional().or(z.literal("")).default(""),
  registration_fees: z.string().optional().or(z.literal("0.00")).default("0.00"),
  processing_fees: z.string().optional().or(z.literal("0.00")).default("0.00"),
  total_payable_amount: z.string().optional().or(z.literal("0.00")).default("0.00"),
  payment_mode: z.string().max(10, "Payment mode max 10 characters").optional().or(z.literal("")).default(""),
  dd_id_or_transaction_id: z
    .string()
    .max(100, "Transaction ID max 100 characters")
    .optional()
    .or(z.literal(""))
    .default(""),
  dd_date_or_transaction_date: z.string().optional().or(z.literal("")).default(""),
  dd_amount: z.string().optional().or(z.literal("0.00")).default("0.00"),
  payee_account_holder_name: z
    .string()
    .max(200, "Payee name max 200 characters")
    .optional()
    .or(z.literal(""))
    .default(""),
  payee_bank_name: z
    .string()
    .max(200, "Bank name max 200 characters")
    .optional()
    .or(z.literal(""))
    .default(""),
  payment_proof: z.string().max(100, "Payment proof max 100 characters").optional().or(z.literal("")).default(""),
  payment_status: z.string().max(20, "Payment status max 20 characters").optional().or(z.literal("pending")).default("pending"),
  refund_account_holder_name: z
    .string()
    .max(200, "Refund account holder name max 200 characters")
    .optional()
    .or(z.literal(""))
    .default(""),
  refund_account_number: z
    .string()
    .max(20, "Refund account number max 20 characters")
    .optional()
    .or(z.literal(""))
    .default(""),
  refund_bank_name: z
    .string()
    .max(200, "Refund bank name max 200 characters")
    .optional()
    .or(z.literal(""))
    .default(""),
  refund_bank_branch_address: z.string().optional().or(z.literal("")).default(""),
  refund_bank_ifsc: z
    .string()
    .max(11, "IFSC max 11 characters")
    .optional()
    .or(z.literal(""))
    .default(""),
  scheme_id: z.number().int("Scheme ID must be an integer"),
  // optional fields the server will set
  application_pdf: z.string().optional(),
});

export const applicationRouter = createTRPCRouter({
  create: publicProcedure
    .input(ApplicationInput)
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify the scheme exists
        const scheme = await ctx.db.scheme_scheme.findUnique({
          where: { id: input.scheme_id },
        });

        if (!scheme) {
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
          throw new TRPCError({
            code: "CONFLICT",
            message: "An application already exists for this mobile number and scheme",
          });
        }

        // Transactionally reserve an application number from the scheme and create the application.
        const application = await ctx.db.$transaction(async (prisma) => {
          const schemeData = await prisma.scheme_scheme.findUnique({
            where: { id: input.scheme_id },
            select: { id: true, next_application_number: true },
          });

          if (!schemeData?.id || typeof schemeData.next_application_number !== "number") {
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
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Transaction failed, application not created",
          });
        }

        return application;
      } catch (error) {
        // Re-throw TRPC errors as-is
        if (error instanceof TRPCError) {
          throw error;
        }

        // Log unexpected errors
        console.error("Application creation error:", error);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to create application",
        });
      }
    }),

  /**
   * Upload payment proof file to S3
   * Input: applicationId, filename, fileBuffer (base64), mimeType
   * Output: S3 URL or filename if S3 not configured
   */
  uploadPaymentProof: publicProcedure
    .input(
      z.object({
        applicationId: z.number().int("Application ID must be an integer"),
        schemeName: z.string().max(255, "Scheme name too long"),
        schemeId: z.number().int("Scheme ID must be an integer"),
        filename: z.string().max(255, "Filename too long"),
        fileBuffer: z.string().describe("File content as base64 string"),
        mimeType: z.string().max(50, "MIME type too long"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Validate file type
        console.log("Validating file MIME type:", input.mimeType);
        const allowedMimeTypes = ["application/pdf", "image/jpeg", "image/png"];
        if (!allowedMimeTypes.includes(input.mimeType)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "File type not allowed. Only PDF, JPEG, and PNG are supported.",
          });
        }

        // Convert base64 to buffer
        const buffer = Buffer.from(input.fileBuffer, "base64");

        // Validate file size (max 5MB)
        const maxSizeBytes = 5 * 1024 * 1024; // 5MB
        if (buffer.length > maxSizeBytes) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "File size exceeds 5MB limit",
          });
        }
        console.log("File buffer size (bytes):", buffer.length);
        // Generate S3 key
        const s3Key = generateS3Key(input.applicationId, input.filename, input.schemeId);

        console.log("Uploading payment proof to S3 with key:", s3Key);
        // Upload to S3
        const s3Url = await uploadToS3(s3Key, buffer, input.mimeType);

        if (!s3Url) {
          // S3 not configured, return filename as fallback
          console.warn("S3 not configured, returning filename as payment_proof");
          return {
            success: true,
            url: input.filename,
            key: s3Key,
            bucket: null,
          };
        }

        return {
          success: true,
          url: s3Url,
          key: s3Key,
          bucket: true, // Indicates file was uploaded to S3
        };
      } catch (error) {
        // Re-throw TRPC errors as-is
        if (error instanceof TRPCError) {
          throw error;
        }

        // Log unexpected errors
        console.error("Payment proof upload error:", error);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to upload payment proof",
        });
      }
    }),

  /**
   * Get application by mobile number and application number and scheme name
   * Used for application lookup/verification
   */
  getByMobileAndApplicationNumberAndSchemeId: publicProcedure
    .input(
      z.object({
        mobile_number: z.string().length(10, "Mobile number must be 10 digits"),
        application_number: z.number().int("Application number must be an integer"),
        scheme_id: z.number().int("Scheme ID must be an integer"),
      })
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
          message: error instanceof Error ? error.message : "Failed to fetch application",
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
          message: error instanceof Error ? error.message : "Failed to fetch application",
        });
      }
    }),

  /**
   * Download application PDF
   * Returns presigned S3 URL if available, or stored URL
   */
  downloadPdf: publicProcedure
    .input(
      z.object({
        mobile_number: z.string().length(10, "Mobile number must be 10 digits"),
        application_number: z.number().int("Application number must be an integer"),
        scheme_id: z.number().int("Scheme ID must be an integer"),
        application_id: z.number().int("Application ID must be an integer"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const application = await ctx.db.scheme_application.findUnique({
          where: { id: input.application_id },
        });

        if (!application) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Application not found",
          });
        }

        // Return the payment proof URL if available
        if (!application.application_pdf) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Application PDF not available for download",
          });
        }

        return {
          downloadUrl: application.application_pdf,
          filename: `mobile_${application.mobile_number}_scheme_${application.scheme_id}_application_${application.application_number}.pdf`,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error("Download PDF error:", error);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to generate download link",
        });
      }
    }),
});
