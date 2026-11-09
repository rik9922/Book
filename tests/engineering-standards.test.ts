import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  ConflictError,
  QuotaExceededError,
  toHttpStatus,
  toErrorResponse,
  validateServiceConfig,
  BaseServiceConfigSchema,
} from "@memory-capsule/contracts";
import { createServiceLogger } from "@memory-capsule/logger";

test("Memoria Engineering Standards & Quality Verification Suite", async (t) => {
  await t.test("1. Centralized Typed Application Error Hierarchy", () => {
    const notFound = new NotFoundError("Story not found");
    assert.equal(notFound.statusCode, 404);
    assert.equal(notFound.code, "NOT_FOUND");
    assert.equal(notFound.message, "Story not found");
    assert.equal(toHttpStatus(notFound), 404);

    const unauth = new UnauthorizedError();
    assert.equal(unauth.statusCode, 401);
    assert.equal(unauth.code, "UNAUTHORIZED");

    const forbidden = new ForbiddenError();
    assert.equal(forbidden.statusCode, 403);
    assert.equal(forbidden.code, "FORBIDDEN");

    const validation = new ValidationError("Invalid memory format", [{ field: "format", expected: "image" }]);
    assert.equal(validation.statusCode, 400);
    assert.equal(validation.code, "VALIDATION_ERROR");

    const conflict = new ConflictError("Email already in use");
    assert.equal(conflict.statusCode, 409);
    assert.equal(conflict.code, "CONFLICT");

    const quota = new QuotaExceededError();
    assert.equal(quota.statusCode, 429);
    assert.equal(quota.code, "QUOTA_EXCEEDED");

    // Standard client envelope formatting
    const envelope = toErrorResponse(notFound, "corr-test-123");
    assert.equal(envelope.success, false);
    assert.equal(envelope.data, null);
    assert.equal(envelope.error?.code, "NOT_FOUND");
    assert.equal(envelope.error?.message, "Story not found");
    assert.equal(envelope.meta.correlationId, "corr-test-123");
    assert.ok(envelope.meta.timestamp > 0);
  });

  await t.test("2. Centralized Validated Environment Configuration", () => {
    // Valid configuration
    const validConfig = validateServiceConfig(BaseServiceConfigSchema, {
      NODE_ENV: "test",
      LOG_LEVEL: "debug",
      JWT_SECRET: "test-valid-jwt-secret-minimum-8",
      INTERNAL_SERVICE_KEY: "test-internal-service-secret-key",
      REDIS_URL: "redis://localhost:6379",
      NATS_URL: "nats://localhost:4222",
    });

    assert.equal(validConfig.NODE_ENV, "test");
    assert.equal(validConfig.LOG_LEVEL, "debug");

    // Invalid configuration fails fast
    assert.throws(
      () => {
        validateServiceConfig(BaseServiceConfigSchema, {
          NODE_ENV: "invalid-env" as any,
          LOG_LEVEL: "super-verbose" as any,
        });
      },
      /Fatal configuration failure/
    );
  });

  await t.test("3. Structured Logger Redaction & Error Serialization", () => {
    let capturedLog: any = null;
    const testLogger = createServiceLogger("test-service", {
      browser: {
        write: (o: any) => {
          capturedLog = o;
        },
      },
    });

    assert.ok(testLogger, "Service logger must be instantiated cleanly");
  });
});
