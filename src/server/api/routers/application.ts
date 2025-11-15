import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

/**
 * Input mirrors the prisma `scheme_application` fields used here.
 * Keep types conservative (strings for many fields) to avoid parsing issues on the client.
 */
const ApplicationInput = z.object({
  mobile_number: z.string().min(10).max(10),
  applicant_name: z.string().max(200),
  father_or_husband_name: z.string().max(200).optional().or(z.literal("")).default(""),
  dob: z.string(), // ISO date
  id_type: z.string().max(20).optional().or(z.literal("")).default(""),
  id_number: z.string().max(20).optional().or(z.literal("")).default(""),
  pan_number: z.string().max(10).optional().or(z.literal("")).default(""),
  permanent_address: z.string().optional().or(z.literal("")).default(""),
  permanent_address_pincode: z.string().max(6).optional().or(z.literal("")).default(""),
  postal_address: z.string().optional().or(z.literal("")).default(""),
  postal_address_pincode: z.string().max(6).optional().or(z.literal("")).default(""),
  email: z.string().email().optional().or(z.literal("")).default(""),
  annual_income: z.string().optional().or(z.literal("")).default(""),
  plot_category: z.string().max(10).optional().or(z.literal("")).default(""),
  registration_fees: z.string().optional().or(z.literal("0.00")).default("0.00"),
  processing_fees: z.string().optional().or(z.literal("0.00")).default("0.00"),
  total_payable_amount: z.string().optional().or(z.literal("0.00")).default("0.00"),
  payment_mode: z.string().max(10).optional().or(z.literal("")).default(""),
  dd_id_or_transaction_id: z.string().max(100).optional().or(z.literal("")).default(""),
  dd_date_or_transaction_date: z.string().optional().or(z.literal("")).default(""),
  dd_amount: z.string().optional().or(z.literal("0.00")).default("0.00"),
  payee_account_holder_name: z.string().max(200).optional().or(z.literal("")).default(""),
  payee_bank_name: z.string().max(200).optional().or(z.literal("")).default(""),
  payment_proof: z.string().max(100).optional().or(z.literal("")).default(""),
  payment_status: z.string().max(20).optional().or(z.literal("pending")).default("pending"),
  refund_account_holder_name: z.string().max(200).optional().or(z.literal("")).default(""),
  refund_account_number: z.string().max(20).optional().or(z.literal("")).default(""),
  refund_bank_name: z.string().max(200).optional().or(z.literal("")).default(""),
  refund_bank_branch_address: z.string().optional().or(z.literal("")).default(""),
  refund_bank_ifsc: z.string().max(11).optional().or(z.literal("")).default(""),
  scheme_id: z.number().int(),
  // optional fields the server will set
  application_pdf: z.string().optional(),
});

export const applicationRouter = createTRPCRouter({
  // create: publicProcedure
  //   .input(ApplicationInput)
  //   .mutation(async ({ ctx, input }) => {
  //     // Transactionally reserve an application number from the scheme and create the application.
  //     const application = await ctx.db.$transaction(async (prisma: typeof ctx.db) => {
  //       const scheme = await prisma.scheme_scheme.findUnique({
  //         where: { id: input.scheme_id },
  //         select: { id: true, next_application_number: true },
  //       }) as { id: number; next_application_number: number } | null;

  //       if (!scheme || typeof scheme.next_application_number !== "number") {
  //         throw new Error("Scheme not found or invalid scheme data");
  //       }

  //       const applicationNumber: number = scheme.next_application_number;

  //       // increment the scheme.next_application_number
  //       await prisma.scheme_scheme.update({
  //         where: { id: input.scheme_id },
  //         data: { next_application_number: applicationNumber + 1 },
  //       });

  //       // create application with timestamps and computed application_number
  //       const created = await prisma.scheme_application.create({
  //         data: {
  //           ...input,
  //           application_number: applicationNumber,
  //           application_submission_date: new Date(),
  //           created_at: new Date(),
  //           updated_at: new Date(),
  //           application_status: "pending", // or your default value
  //           rejection_remark: "",
  //           lottery_status: "pending", // or your default value
  //         },
  //       }) as Record<string, unknown>;

  //       if (!created) {
  //         throw new Error("Application creation failed");
  //       }

  //       return created;
  //     });

  //     if (!application) {
  //       throw new Error("Transaction failed, application not created");
  //     }
  //     return application;
  //   }),
});