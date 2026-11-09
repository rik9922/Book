---
name: structured-logging-and-observability
description: Governs centralized structured JSON logging using Pino, sensitive field redaction, correlation ID propagation, standard log levels, and zero console.log in production code.
---

# Structured Logging & Observability Skill
*GitLab Open-Source Standards for Cloud-Native Distributed Microservices*
*Source: GitLab Duo Open-Source Observability Standards*
*License: MIT / Apache 2.0 Open Source*

## 1. Absolute Logging Standards

### Zero `console.*` in Production Application Code
- Production code must NEVER call `console.log`, `console.error`, `console.warn`, `console.debug`, or `console.info`.
- All logging must flow through the centralized structured logger:
  ```ts
  import { createServiceLogger, Logger } from "@memory-capsule/logger";
  const logger: Logger = createServiceLogger("service-name");
  ```

### Standard Log Levels & Semantics
| Level | When to Use | Example |
|---|---|---|
| `fatal` | Process or unrecoverable system crash | Database host unreachable, memory allocation failure |
| `error` | Operation failed; client received 5xx | Query execution error, unhandled rejection |
| `warn` | Unexpected but handled condition | Invalid auth attempt, fallback to mock driver |
| `info` | Normal lifecycle & business milestones | Service started, user registered, edition published |
| `debug` | Diagnostic detail for troubleshooting | Query executed with duration and row count |
| `trace` | Fine-grained execution flow | Raw frame packet receipt |

## 2. Redaction & Privacy Invariants

Never log sensitive personal information or credentials:
- Passwords and password hashes (`password`, `passwordHash`)
- JWTs, access tokens, refresh token hashes
- Session cookies, authorization headers (`headers.authorization`)
- User memory narratives, private letters, or raw photo/video buffer payloads
- Payment card data or bank credentials

The logger must automatically configure deep redaction paths on initialization.

## 3. Distributed Context & Traceability

1. **Correlation IDs**: Every incoming request must carry or generate an `x-correlation-id` and include it in all log entries:
   ```ts
   logger.info({ correlationId, userId, spaceId }, "Memory created");
   ```
2. **Context Child Loggers**: Use `logger.child({ correlationId, requestId })` to automatically attach tracing context throughout asynchronous execution lifecycles.
3. **Structured Error Serialization**: Always log errors as structured objects under the `err` property (`logger.error({ err, userId }, "Failed to load timeline")`) so Pino standard serializers serialize name, message, and stack trace cleanly.
