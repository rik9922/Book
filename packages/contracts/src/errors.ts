import { createErrorResponse, ApiResponse } from "./index.js";

export class AppError extends Error {
  public readonly isOperational = true;

  constructor(
    public readonly message: string,
    public readonly statusCode: number = 500,
    public readonly code: string = "INTERNAL_SERVER_ERROR",
    public readonly details?: unknown[]
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
    if ("captureStackTrace" in Error) {
      (Error as any).captureStackTrace(this, this.constructor);
    }
  }
}

export class ValidationError extends AppError {
  constructor(message = "Request validation failed", details?: unknown[]) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Missing or invalid authentication credentials") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Insufficient permissions to perform this operation") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "The requested entity was not found") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message = "Entity conflict or duplicate key") {
    super(message, 409, "CONFLICT");
  }
}

export class QuotaExceededError extends AppError {
  constructor(message = "Free tier storage quota exceeded (500MB cap)") {
    super(message, 429, "QUOTA_EXCEEDED");
  }
}

export class BadGatewayError extends AppError {
  constructor(message = "Upstream microservice unavailable or timed out") {
    super(message, 502, "BAD_GATEWAY");
  }
}

export class ConfigurationError extends AppError {
  constructor(message = "Service configuration error", details?: unknown) {
    super(message, 500, "CONFIGURATION_ERROR", details ? [details] : undefined);
  }
}

export class PortConflictError extends AppError {
  constructor(public readonly port: number, message = `Port ${port} is already occupied`, details?: unknown) {
    super(message, 500, "PORT_CONFLICT_ERROR", details ? [details] : undefined);
    this.name = "PortConflictError";
  }
}


export function toHttpStatus(error: unknown): number {
  if (error instanceof AppError) return error.statusCode;
  return 500;
}

export function toErrorResponse(error: unknown, correlationId = "corr-unknown"): ApiResponse<null> {
  if (error instanceof AppError) {
    return createErrorResponse(error.code, error.message, correlationId, error.details as any[]);
  }
  const message = error instanceof Error ? error.message : "An unexpected server error occurred";
  return createErrorResponse("INTERNAL_SERVER_ERROR", message, correlationId);
}

export function createFastifyErrorHandler(logger: any) {
  return async (error: any, request: any, reply: any) => {
    const correlationId = (request.headers?.["x-correlation-id"] as string) || "corr-unknown";
    const statusCode = error.statusCode || (error instanceof AppError ? error.statusCode : 500);

    if (statusCode >= 500) {
      logger.error({ err: error, correlationId, url: request.url, method: request.method }, "[Server] Unhandled Exception");
    } else {
      logger.warn({ err: error, correlationId, statusCode, url: request.url }, `[Server] Client Error (${statusCode})`);
    }

    const errorBody = error instanceof AppError
      ? toErrorResponse(error, correlationId)
      : createErrorResponse(
          error.code || "INTERNAL_SERVER_ERROR",
          statusCode === 500 ? "Internal server error" : (error.message || "Request failed"),
          correlationId,
          error.validation ? error.validation : undefined
        );

    return reply.status(statusCode).send(errorBody);
  };
}
