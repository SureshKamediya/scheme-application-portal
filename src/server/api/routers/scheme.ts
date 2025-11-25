import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import logger from "~/server/utils/logger";

export const schemeRouter = createTRPCRouter({
  /**
   * Get all schemes with their basic information
   */
  getAll: publicProcedure.query(async ({ ctx }) => {
    logger.debug({}, "Fetching all schemes from the database");
    try {
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

      logger.info({ count: schemes.length }, "Schemes fetched successfully");
      return schemes;
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
        },
        "Failed to fetch schemes",
      );
      throw error;
    }
  }),

  /**
   * Get single scheme by ID with all details and files
   */
  getById: publicProcedure
    .input(
      z.object({ schemeId: z.number().int("Scheme ID must be an integer") }),
    )
    .query(async ({ ctx, input }) => {
      try {
        logger.debug({ schemeId: input.schemeId }, "Fetching scheme by ID");

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
            reserved_price: true,
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
          logger.warn({ schemeId: input.schemeId }, "Scheme not found");
          return null;
        }

        logger.info(
          {
            schemeId: input.schemeId,
            schemeName: scheme.name,
            fileCount: scheme.scheme_schemefiles?.length ?? 0,
          },
          "Scheme fetched successfully",
        );

        return scheme;
      } catch (error) {
        logger.error(
          {
            schemeId: input.schemeId,
            error: error instanceof Error ? error.message : String(error),
          },
          "Failed to fetch scheme by ID",
        );
        throw error;
      }
    }),
});
