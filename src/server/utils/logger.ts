import pino from "pino";

// Determine environment
const isProduction = process.env.NODE_ENV === "production";

// Create logger instance
// In development, pino outputs pretty-printed JSON
// In production, it outputs structured JSON for CloudWatch
const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug"),
  base: {
    service: "scheme-application-portal",
    environment: process.env.NODE_ENV ?? "development",
    region: process.env.AWS_REGION ?? "ap-south-1",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
});

export default logger;
