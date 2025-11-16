import { z } from "zod";
import { randomUUID } from "crypto";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import sendSms from "~/utils/sms";

const OTPInput = z.object({
  mobile_number: z.string().length(10),
  scheme_id: z.number().int(),
});

export const otpRouter = createTRPCRouter({
  generate: publicProcedure
    .input(OTPInput)
    .mutation(async ({ ctx, input }) => {
      const { mobile_number, scheme_id } = input;

      // If application already exists, stop
      const existing = await ctx.db.scheme_application.findFirst({
        where: { mobile_number, scheme_id },
      });
      if (existing) {
        throw new Error(
          "Application already exists for this mobile number and scheme."
        );
      }

      // Limit OTP requests — 5 OTPs max within 30 mins for this mobile
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
      const otpCount = await ctx.db.oTP_otp.count({
        where: {
          mobile_number,
          created_at: { gte: thirtyMinAgo },
        },
      });
      if (otpCount >= 5) throw new Error("Too many OTP requests. Try later.");

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

      const otpRecord = await ctx.db.oTP_otp.create({
        data: {
          id: randomUUID(),
          code,
          mobile_number,
          expires_at: expires,
          is_used: false,
          created_at: new Date(),
        },
      });

      await sendSms(mobile_number, `Your OTP is ${code}`);

      return { otp_id: otpRecord.id, message: "OTP sent successfully" };
    }),

  verify: publicProcedure
    .input(
      z.object({
        mobile_number: z.string().length(10),
        otp: z.string().length(6),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { mobile_number, otp } = input;

      // Rate limit — only 7 verify attempts allowed in 30 mins
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
      const attempts = await ctx.db.otp_attempt.count({
        where: {
          identifier: mobile_number,
          timestamp: { gte: thirtyMinAgo },
        },
      });
      if (attempts >= 7) throw new Error("Too many OTP attempts. Try later.");

      const otpRecord = await ctx.db.oTP_otp.findFirst({
        where: { mobile_number },
        orderBy: { created_at: "desc" }, // latest OTP
      });

      if (!otpRecord) throw new Error("OTP not found");
      if (otpRecord.is_used) throw new Error("OTP already used");
      if (otpRecord.expires_at < new Date()) throw new Error("OTP expired");

      const success = otpRecord.code === otp;

      // 1. Get the raw header value
      const xForwardedFor = ctx.headers.get("x-forwarded-for");

      // 2. Safely extract the first IP address from the comma-separated list.
      //    If the header is null/empty, fall back to "0.0.0.0" as a placeholder.
      const clientIp = xForwardedFor?.split(',')[0]?.trim() ?? "0.0.0.0";

      await ctx.db.otp_attempt.create({
        data: {
          id: randomUUID(),
          otp_id: otpRecord.id,
          identifier: mobile_number,
          attempt_type: "VERIFY",
          ip_address: clientIp,
          user_agent: ctx.headers.get("user-agent") ?? null,
          timestamp: new Date(),
          success,
          error_message: success ? null : "Invalid OTP",
          metadata: {},
        },
      });

      if (!success) throw new Error("Invalid OTP");

      await ctx.db.oTP_otp.update({
        where: { id: otpRecord.id },
        data: { is_used: true },
      });

      return { message: "OTP verified successfully" };
    }),
});
