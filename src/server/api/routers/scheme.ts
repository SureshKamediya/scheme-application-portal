import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { getPresignedUrl } from "~/server/utils/s3";

export const schemeRouter = createTRPCRouter({
  /**
   * Get all schemes with their basic information
   */
  getAll: publicProcedure.query(async ({ ctx }) => {
    console.log("Fetching all schemes from the database...");
    const schemes = await ctx.db.scheme_scheme.findMany({
      select: {
        id: true,
        name: true,
        company: true,
        address: true,
        phone: true,
        application_open_date: true,
        application_close_date: true,
        lottery_result_date: true,
        appeal_end_date: true,
        close_date: true,
        Lig_plot_count: true,
        ews_plot_count: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return schemes;
  }),

  /**
   * Get single scheme by ID with all details and files
   */
  getById: publicProcedure
    .input(
      z.object({ schemeId: z.number().int("Scheme ID must be an integer") }),
    )
    .query(async ({ ctx, input }) => {
      const scheme = await ctx.db.scheme_scheme.findUnique({
        where: { id: BigInt(input.schemeId) },
        select: {
          id: true,
          name: true,
          company: true,
          address: true,
          phone: true,
          application_open_date: true,
          application_close_date: true,
          appeal_end_date: true,
          close_date: true,
          lottery_result_date: true,
          successful_applicants_publish_date: true,
          Lig_plot_count: true,
          ews_plot_count: true,
          reserved_rate: true,
          scheme_schemefiles: {
            select: {
              id: true,
              name: true,
              file_choice: true,
              file: true,
            },
          },
        },
      });

      if (!scheme) {
        return null;
      }

      return scheme;
    }),

  /**
   * Get presigned URL for scheme document from S3
   * Used for downloading public scheme documents
   */
  getDocumentUrl: publicProcedure
    .input(
      z.object({
        schemeId: z.number().int("Scheme ID must be an integer"),
        documentId: z.number().int("Document ID must be an integer"),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        // Verify the scheme and document exist
        const schemeFile = await ctx.db.scheme_schemefiles.findUnique({
          where: { id: BigInt(input.documentId) },
          select: {
            file: true,
            scheme_id: true,
          },
        });

        if (!schemeFile) {
          return {
            success: false,
            url: null,
            error: "Document not found",
          };
        }

        // Verify the document belongs to the requested scheme
        if (Number(schemeFile.scheme_id) !== input.schemeId) {
          return {
            success: false,
            url: null,
            error: "Document does not belong to this scheme",
          };
        }

        // Get presigned URL from S3
        if (!schemeFile.file) {
          return {
            success: false,
            url: null,
            error: "Document file path not found",
          };
        }

        const presignedUrl = await getPresignedUrl(schemeFile.file, 3600);

        if (!presignedUrl) {
          return {
            success: false,
            url: null,
            error: "Failed to generate presigned URL",
          };
        }

        return {
          success: true,
          url: presignedUrl,
          error: null,
        };
      } catch (error) {
        console.error("Error getting document URL:", error);
        return {
          success: false,
          url: null,
          error: "Failed to retrieve document",
        };
      }
    }),
});
