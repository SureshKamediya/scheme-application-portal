# Logging Configuration Guide

## Overview

This application uses **Pino** for server-side logging and a custom **Client Logger** for browser-side logging. All logs are centralized and can be viewed in AWS CloudWatch in production.

## Architecture

### Server-Side Logging

- **Logger**: Pino (`src/server/utils/logger.ts`)
- **Output Format**: Structured JSON
- **Destinations**:
  - Console (development)
  - AWS CloudWatch (production via stdout)
- **Log Level**: Configurable via `LOG_LEVEL` environment variable

### Client-Side Logging

- **Logger**: Custom Client Logger (`src/utils/clientLogger.ts`)
- **Output Format**: JSON payloads sent to server
- **Endpoint**: `/api/logs` (route handler in `src/app/api/logs/route.ts`)
- **Transport**: `sendBeacon` (primary) or `fetch` with `keepalive` (fallback)
- **Enable/Disable**: Via `NEXT_PUBLIC_ENABLE_CLIENT_LOGS` environment variable

## Environment Variables

### Logging Configuration

```env
# Log Level (debug, info, warn, error)
# Default: "debug" in development, "info" in production
LOG_LEVEL=debug

# Enable client-side logging
# Set to true to send browser logs to server
NEXT_PUBLIC_ENABLE_CLIENT_LOGS=true
```

## Usage Examples

### Server-Side Logging

```typescript
import logger from "~/server/utils/logger";

// Debug
logger.debug({ userId: 123 }, "User action started");

// Info
logger.info({ applicationId: 456 }, "Application created successfully");

// Warning
logger.warn({ schemeId: 789 }, "No documents available");

// Error
logger.error(
  { error: error.message, stack: error.stack },
  "Failed to upload file",
);
```

### Client-Side Logging

```typescript
import { clientLogger } from "~/utils/clientLogger";

// Debug
clientLogger.debug("Component mounted", { componentName: "ApplicationForm" });

// Info
clientLogger.info("User submitted form", { formId: "app-form-1" });

// Warning
clientLogger.warn("File size exceeds recommended limit", { size: "15MB" });

// Error
clientLogger.error("Upload failed", error, { retryCount: 3 });
```

## Log Format

### Server-Side Log Output

```json
{
  "level": "INFO",
  "time": "2025-11-24T18:14:00.846Z",
  "service": "scheme-application-portal",
  "environment": "production",
  "region": "ap-south-1",
  "applicationNumber": 12345,
  "mobileNumber": "9876543210",
  "msg": "Application created successfully"
}
```

### Client-Side Log Output

```json
{
  "level": "info",
  "message": "User submitted form",
  "data": {
    "formId": "app-form-1"
  },
  "timestamp": "2025-11-24T18:14:00.846Z",
  "source": "client"
}
```

## AWS CloudWatch Integration

### Viewing Logs in CloudWatch

1. Navigate to **AWS CloudWatch** console
2. Go to **Logs** → **Log Groups**
3. Filter by application name (default: `scheme-application-portal`)
4. Click on the log stream for your App Runner service

### CloudWatch Insights Query Examples

```sql
# All ERROR level logs
fields @timestamp, level, msg, error
| filter level = "ERROR"
| stats count() by msg

# Application creation logs
fields @timestamp, applicationNumber, mobileNumber, msg
| filter msg like /Application/

# Performance analysis - slow requests
fields @timestamp, duration, endpoint
| filter duration > 5000
| stats avg(duration), max(duration) by endpoint

# Error rate by endpoint
fields @timestamp, endpoint, level
| filter level = "ERROR"
| stats count() as errors by endpoint
```

## Log Levels

| Level     | Use Case                                         | Shown In                              |
| --------- | ------------------------------------------------ | ------------------------------------- |
| **DEBUG** | Detailed diagnostic info, function entry/exit    | Development only (or LOG_LEVEL=debug) |
| **INFO**  | General informational messages, important events | All environments (default production) |
| **WARN**  | Warning conditions, potential issues             | All environments                      |
| **ERROR** | Error conditions, exceptions                     | All environments                      |

## Modules with Logging

### `src/server/utils/s3.ts`

- S3 file uploads
- Presigned URL generation (read & write)
- File deletions
- Configuration status

### `src/server/utils/lambda.ts`

- Lambda invocation start/end
- Response parsing
- PDF generation status
- Error handling with context

### `src/server/api/routers/application.ts`

- Application creation
- PDF generation requests
- PDF downloads
- Presigned upload URL requests
- Error tracking

### `src/server/api/routers/scheme.ts`

- Scheme fetching (all/by ID)
- Document retrieval
- Error handling

### `src/app/api/logs/route.ts`

- Receives and logs client-side events
- Validates log payload
- Stores in server logger

### `src/app/_components/*` (Client Components)

- User interactions
- Form submissions
- File uploads
- Navigation events
- Error boundaries

## Development vs Production

### Development Mode

```
LOG_LEVEL=debug
NEXT_PUBLIC_ENABLE_CLIENT_LOGS=true
```

**Output**: Pretty-printed logs to console with colors and formatting

```
[DEBUG] scheme-application-portal development ap-south-1
  Creating new application
  mobileNumber: "9876543210"
  schemeId: 1
```

### Production Mode

```
LOG_LEVEL=info
NEXT_PUBLIC_ENABLE_CLIENT_LOGS=true
```

**Output**: Structured JSON logs to stdout → CloudWatch

```json
{
  "level": "INFO",
  "time": "2025-11-24T18:14:00.846Z",
  "service": "scheme-application-portal",
  "environment": "production",
  "region": "ap-south-1",
  "mobileNumber": "9876543210",
  "schemeId": 1,
  "msg": "Creating new application"
}
```

## Best Practices

### ✅ DO

- Include relevant context in logs (IDs, names, status)
- Use appropriate log levels
- Log both start and completion of important operations
- Include error details in error logs
- Use structured data (objects) for context

### ❌ DON'T

- Log sensitive data (passwords, API keys, full credit cards)
- Use generic messages without context
- Log to console instead of logger
- Create excessive debug logs in production
- Log the same information multiple times

## Example Log Flows

### Application Creation Flow

```typescript
// 1. Start
logger.debug({ mobileNumber, schemeId }, "Creating new application");

// 2. Validation
logger.warn({ schemeId }, "Scheme not found");

// 3. Duplicate check
logger.warn({ mobileNumber, schemeId }, "Duplicate application attempt");

// 4. Success
logger.info(
  { applicationNumber, mobileNumber, schemeId },
  "Application created successfully",
);

// 5. Error
logger.error(
  { mobileNumber, schemeId, error: err.message },
  "Failed to create application",
);
```

### PDF Generation Flow

```typescript
// 1. Start
logger.debug({ mobileNumber, schemeId }, "Starting PDF generation process");

// 2. Enrichment
logger.debug({}, "Enriching PDF payload with scheme data");

// 3. Lambda invocation
logger.debug({ functionName }, "Invoking PDF generator Lambda");

// 4. Success
logger.info(
  { fileKey, bucket, applicationId },
  "PDF generated by Lambda successfully",
);

// 5. Database update
logger.info(
  { fileKey, applicationId },
  "Application updated with PDF file key in database",
);

// 6. Error
logger.error({ applicationId, error: err.message }, "PDF generation error");
```

## Troubleshooting

### Logs Not Appearing in CloudWatch

1. **Check Log Level**: Ensure `LOG_LEVEL` is not set to a level higher than your log calls
2. **Check Environment**: Verify `NEXT_PUBLIC_ENABLE_CLIENT_LOGS=true`
3. **Check IAM Permissions**: Ensure App Runner has CloudWatch write permissions
4. **Check Log Group**: Verify log group exists and is named correctly

### Client Logs Not Received

1. **Verify Endpoint**: Check `/api/logs` is accessible
2. **Check Network**: Ensure no CORS or network blocking
3. **Check Enable Flag**: Verify `NEXT_PUBLIC_ENABLE_CLIENT_LOGS=true`
4. **Check Browser Console**: Look for any fetch errors

### Performance Impact

- Server logging has minimal impact (< 1ms per call)
- Client logging uses `sendBeacon` for non-blocking async requests
- Production logs are optimized for CloudWatch parsing
- No logs are cached in memory

## Migration Guide

If migrating from `console.log()`:

```typescript
// Before
console.log("User created:", userId);
console.error("Error:", error);

// After
logger.info({ userId }, "User created");
logger.error({ error: error.message }, "Error occurred");
```

## Additional Resources

- [Pino Documentation](https://getpino.io/)
- [AWS CloudWatch Logs](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/)
- [CloudWatch Insights Queries](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html)
