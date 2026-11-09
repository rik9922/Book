import pino, { Logger, LoggerOptions } from "pino";

export interface LogContext {
  correlationId?: string;
  service?: string;
  userId?: string;
  [key: string]: unknown;
}

export function createServiceLogger(serviceName: string, options?: LoggerOptions): Logger {
  const isProduction = process.env.NODE_ENV === "production";
  return pino({
    level: process.env.LOG_LEVEL || "info",
    base: {
      service: serviceName,
      env: process.env.NODE_ENV || "development",
    },
    redact: ["password", "token", "authorization", "secret", "cookie"],
    timestamp: pino.stdTimeFunctions.isoTime,
    ...options,
  });
}

export type { Logger };

