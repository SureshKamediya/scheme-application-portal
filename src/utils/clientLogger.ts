/**
 * Client-side logger utility
 * Sends logs to server endpoint for centralized logging
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  timestamp: string;
  source: "client";
}

async function sendLogToServer(payload: LogPayload): Promise<void> {
  try {
    // Only send logs in production or if explicitly enabled
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    // Queue logs instead of blocking
    if (typeof navigator !== "undefined" && navigator?.sendBeacon) {
      navigator.sendBeacon("/api/logs", JSON.stringify(payload));
    } else {
      // Fallback to fetch with keepalive
      await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {
        // Silently fail - don't disrupt application
      });
    }
  } catch (err) {
    // Prevent logging errors from breaking the app
    console.error("[Logger] Failed to send log:", err);
  }
}

export const clientLogger = {
  debug: (message: string, data?: Record<string, unknown>): void => {
    console.debug(`[DEBUG] ${message}`, data);
    sendLogToServer({
      level: "debug",
      message,
      data,
      timestamp: new Date().toISOString(),
      source: "client",
    }).catch(() => {
      // Silently fail
    });
  },

  info: (message: string, data?: Record<string, unknown>): void => {
    console.info(`[INFO] ${message}`, data);
    sendLogToServer({
      level: "info",
      message,
      data,
      timestamp: new Date().toISOString(),
      source: "client",
    }).catch(() => {
      // Silently fail
    });
  },

  warn: (message: string, data?: Record<string, unknown>): void => {
    console.warn(`[WARN] ${message}`, data);
    sendLogToServer({
      level: "warn",
      message,
      data,
      timestamp: new Date().toISOString(),
      source: "client",
    }).catch(() => {
      // Silently fail
    });
  },

  error: (
    message: string,
    error?: unknown,
    data?: Record<string, unknown>,
  ): void => {
    const errorObj =
      error instanceof Error
        ? {
            message: error.message,
            stack: error.stack,
            code: (error as { code?: string }).code,
          }
        : undefined;

    console.error(`[ERROR] ${message}`, errorObj, data);
    sendLogToServer({
      level: "error",
      message,
      error: errorObj,
      data,
      timestamp: new Date().toISOString(),
      source: "client",
    }).catch(() => {
      // Silently fail
    });
  },
};
