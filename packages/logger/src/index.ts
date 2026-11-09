import pino, { Logger, LoggerOptions } from "pino";

export interface LogContext {
  correlationId?: string;
  service?: string;
  userId?: string;
  spaceId?: string;
  [key: string]: unknown;
}

const DEFAULT_REDACT_PATHS = [
  "password",
  "passwordHash",
  "token",
  "refreshToken",
  "refreshTokenHash",
  "authorization",
  "secret",
  "cookie",
  "creditCard",
  "cvv",
  "headers.authorization",
  "headers.cookie",
  "*.password",
  "*.passwordHash",
  "*.token",
  "*.refreshToken",
];

export function createServiceLogger(serviceName: string, options?: LoggerOptions): Logger {
  const isProduction = process.env.NODE_ENV === "production";
  return pino({
    level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
    base: {
      service: serviceName,
      env: process.env.NODE_ENV || "development",
    },
    redact: {
      paths: Array.isArray(options?.redact)
        ? [...DEFAULT_REDACT_PATHS, ...options.redact]
        : DEFAULT_REDACT_PATHS,
      censor: "[REDACTED]",
    },
    serializers: {
      err: pino.stdSerializers.err,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    ...options,
  });
}

export function createChildLogger(parent: Logger, context: LogContext): Logger {
  return parent.child(context);
}

export async function logTimedOperation<T>(
  logger: Logger,
  operationName: string,
  meta: Record<string, unknown>,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const durationMs = Date.now() - start;
    logger.debug({ ...meta, durationMs, operation: operationName }, `[${operationName}] Completed successfully`);
    return result;
  } catch (err) {
    const durationMs = Date.now() - start;
    logger.error({ ...meta, durationMs, operation: operationName, err }, `[${operationName}] Failed`);
    throw err;
  }
}

export type { Logger };


