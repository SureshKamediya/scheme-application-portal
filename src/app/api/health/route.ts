import { db } from "~/server/db";

const getErrorMessage = (err: unknown): string => {
  // Type Guard: Check if the error is an object and has a 'message' property
  if (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof (err as { message: unknown }).message === "string"
  ) {
    // If it's a standard Error object with a string message, return the message.
    return (err as { message: string }).message;
  }

  // Fallback: If it's not a standard object, convert the whole error to a string.
  if (typeof err === "string") {
    return err;
  }

  return "An unknown error occurred";
};

// This function handles the incoming GET request from App Runner's health checker.
export async function GET(_request: Request) {
  // Added explicit type for 'request' too
  try {
    await db.$queryRaw`SELECT 1`; // Simple query to check DB connectivity

    // 2. If the query succeeds, return 200 OK
    return Response.json(
      {
        status: "ok",
        service: "Next.js App Runner",
        db_status: "connected",
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    // ⬅️ FIX: Explicitly type 'error' as 'unknown'
    // 3. If the database connection or any other critical dependency fails, return 500
    console.error("Health check failed due to database error:", error);

    // Returning a 500 status code tells App Runner that the service is unhealthy
    return Response.json(
      {
        status: "error",
        message: "Database connection failed",
        details: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
