import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

console.log(
  "Check — DATABASE_URL exists:",
  process.env.DATABASE_URL ? "YES" : "NO",
);
export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    // AWS S3 Configuration
    AWS_REGION: z.string().default("ap-south-1"),
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    AWS_S3_BUCKET_NAME: z.string().optional(),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("debug"),
    SMS_USERNAME: z.string(),
    SMS_PASSWORD: z.string(),
    SMS_SENDER_ID: z.string(),
    SMS_CHANNEL: z.string().default("Trans"), // 1 - Promotional, 2 - Transactional
    SMS_ROUTE: z.string().default("##"), // Route for transactional SMS
    SMS_PEID: z.string().default("##"), // PE ID for transactional SMS
    SMS_DLT_TEMPLATE_ID_OTP: z.string().default("##"),
    SMS_DLT_TEMPLATE_ID_APPLICATION: z.string().default("##"),
    SMS_API_BASE_URL: z.string().url(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // Logging Configuration
    NEXT_PUBLIC_ENABLE_CLIENT_LOGS: z
      .enum(["true", "false"])
      .default("true")
      .transform((val) => val === "true"),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    AWS_REGION: process.env.AWS_REGION,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
    LOG_LEVEL: process.env.LOG_LEVEL,
    SMS_USERNAME: process.env.SMS_USERNAME,
    SMS_PASSWORD: process.env.SMS_PASSWORD,
    SMS_SENDER_ID: process.env.SMS_SENDER_ID,
    SMS_API_BASE_URL: process.env.SMS_API_BASE_URL,
    SMS_CHANNEL: process.env.SMS_CHANNEL,
    SMS_ROUTE: process.env.SMS_ROUTE,
    SMS_PEID: process.env.SMS_PEID,
    SMS_DLT_TEMPLATE_ID_OTP: process.env.SMS_DLT_TEMPLATE_ID_OTP,
    SMS_DLT_TEMPLATE_ID_APPLICATION:
      process.env.SMS_DLT_TEMPLATE_ID_APPLICATION,
    NEXT_PUBLIC_ENABLE_CLIENT_LOGS: process.env.NEXT_PUBLIC_ENABLE_CLIENT_LOGS,
    // NEXT_PUBLIC_CLIENTVAR: process.env.NEXT_PUBLIC_CLIENTVAR,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
