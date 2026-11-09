---
name: error-handling-and-resilience
description: Enforces centralized typed error hierarchies, safe client response envelopes, HTTP and gRPC status mapping, transaction rollback safety, and zero unhandled rejections.
---

# Error Handling & Distributed Resilience Skill
*GitLab Open-Source Distributed Systems Engineering Standards*
*Source: GitLab Open-Source Error Handling Frameworks*
*License: MIT / Apache 2.0 Open Source*

## 1. Typed Application Error Hierarchy

Never throw raw strings or generic untyped `new Error("failed")`. Use structured application errors:

- `AppError`: Base error class with `statusCode`, `code`, `isOperational`, and `details`.
- `ValidationError` (400 / `INVALID_ARGUMENT`): Request payload failed Zod schema checks.
- `UnauthorizedError` (401 / `UNAUTHENTICATED`): Missing, expired, or invalid session token.
- `ForbiddenError` (403 / `PERMISSION_DENIED`): Authenticated user lacks permission in space.
- `NotFoundError` (404 / `NOT_FOUND`): Entity does not exist or has been soft-deleted.
- `ConflictError` (409 / `ALREADY_EXISTS`): Duplicate unique constraint (e.g., email, slug).
- `QuotaExceededError` (429 / `RESOURCE_EXHAUSTED`): Storage limit exceeded (e.g., 500MB cap).
- `BadGatewayError` (502 / 504 / `DEADLINE_EXCEEDED`): Upstream service failure or RPC timeout.

## 2. Safe Error Propagation & Zero Leakage

1. **Client Envelope**: All HTTP errors returned to clients must match the standard envelope:
   ```json
   {
     "success": false,
     "data": null,
     "error": {
       "code": "NOT_FOUND",
       "message": "Memory not found",
       "details": []
     },
     "meta": {
       "correlationId": "corr-uuid",
       "timestamp": 1794234500000
     }
   }
   ```
2. **Zero Internal Leakage**: Never expose SQL queries, table names, file system paths, or raw V8 stack traces in client response bodies.
3. **Log Once at Boundary**: Errors must be logged once at the service perimeter (in the Fastify error handler or gRPC callback) rather than repeatedly at every internal layer.

## 3. Transaction Safety & Clean Rollbacks

- Any business operation that alters multiple database rows or staging tables must execute inside `db.transaction(async (client) => { ... })`.
- If an unhandled exception occurs inside the transaction block, an automatic `ROLLBACK` must execute before rethrowing the error.
- Never swallow exceptions inside empty `catch {}` blocks. If an error is caught for cleanup, rethrow or propagate it to the centralized handler.
