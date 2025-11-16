import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const schemeRouter = createTRPCRouter({
  /**
   * Get all schemes with their basic information
   */
  getAll: publicProcedure.query(async ({ ctx }) => {
    const schemes = await ctx.db.scheme_scheme.findMany({
      select: {
        id: true,
        name: true,
        company: true,
        address: true,
        phone: true,
        application_open_date: true,
        application_close_date: true,
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
    .input(z.object({ schemeId: z.number().int("Scheme ID must be an integer") }))
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
});
