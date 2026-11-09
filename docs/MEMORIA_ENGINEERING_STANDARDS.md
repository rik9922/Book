# MEMORIA PERMANENT ENGINEERING STANDARDS
**Engineering Governance, Clean Code, Performance, Structured Logging & Quality Gates**
**Document Version:** 1.0.0  
**Status:** Mandatory & Permanently Enforced  
**Product Name:** Memoria  
**Tagline:** Your memories, made timeless.  

---

## 1. CORE ENGINEERING PRINCIPLES

Every engineer and AI agent contributing to the Memoria codebase must adhere to these non-negotiable principles:

### 1.1 Clean Code & Craftsmanship
- **Single Responsibility Principle (SRP)**: Each class, service, and function must have one and only one reason to change. Separate transport controllers, domain business logic, and database persistence.
- **Open/Closed Principle (OCP)**: Build extensible modules via polymorphic interfaces (`DatabaseClient`, `StorageDriver`, `EventBus`, `Repository`) rather than modifying established core abstractions.
- **Liskov Substitution Principle (LSP)**: Alternative implementations (e.g. `PostgresUserRepository` and test repositories) must adhere strictly to identical contract signatures and semantics.
- **Interface Segregation Principle (ISP)**: Prefer lean, focused interfaces over bulky monolithic abstractions.
- **Dependency Inversion Principle (DIP)**: High-level application services must depend on abstract contracts, not concrete database or network clients. Inject dependencies via constructors or factories.
- **DRY without Overcoupling**: Consolidate core domain logic into `@memory-capsule/contracts` or `@memory-capsule/database` without creating tangled cross-dependencies.
- **KISS & YAGNI**: Implement the smallest correct, maintainable solution. Do not introduce speculative abstractions or unrequested architectural layers.
- **Function Brevity & Cognitive Simplicity**: Keep functions under 30 lines. Limit nesting to 3 levels. Use early guard returns (`if (!condition) return;`).
- **Descriptive Naming**: Use intention-revealing names. Booleans must read like assertions (`isFrozenForPrint`, `hasValidToken`).

---

## 2. CONFIGURATION & SECRETS GOVERNANCE

### 2.1 No Unnecessary Hardcoding
- **Forbidden**: Hardcoded database URLs, API secrets, IP addresses, timeouts, rate limits, or credentials.
- **Centralized Validation**: All service configuration must be validated at application startup using Zod (`validateServiceConfig` in `@memory-capsule/contracts`).
- **Fail-Fast Policy**: If mandatory environment variables are missing or malformed, the service must terminate immediately with a descriptive fatal error rather than running with silent insecure fallbacks.
- **$0 Budget Policy**: Never configure external services that require entering credit cards, PayPal, or automated pay-as-you-go transitions. Local-first drivers (`LocalDiskStorageDriver`) and containerized services are standard.

---

## 3. STRUCTURED LOGGING & PRIVACY

### 3.1 Strict Elimination of Raw `console.*`
Production application code must never call `console.log`, `console.error`, `console.warn`, `console.debug`, or `console.info`. Automated quality gates (`pnpm run check:quality`) enforce this on all service and package source code.

### 3.2 Pino Centralized Logging Standards
All logging must use `@memory-capsule/logger`:
```ts
import { createServiceLogger, Logger } from "@memory-capsule/logger";
const logger: Logger = createServiceLogger("memory-service");

// Standard Info
logger.info({ spaceId, memoryId }, "Memory created successfully");

// Error with Serialized Stack
logger.error({ err, correlationId, memoryId }, "Failed to persist memory");
```

### 3.3 Log Levels
- `fatal`: Process-level unrecoverable crash.
- `error`: Operation failed (HTTP 5xx, database error, RPC deadline exceeded).
- `warn`: Unexpected recoverable event (failed auth attempt, retryable network glitch).
- `info`: Key application lifecycle and business milestones.
- `debug`: Diagnostic query timings and execution metrics.
- `trace`: Raw packet/event tracing.

### 3.4 Deep Redaction Invariant
The logger must automatically redact all sensitive fields:
`password`, `passwordHash`, `token`, `refreshToken`, `refreshTokenHash`, `authorization`, `secret`, `cookie`, `creditCard`, `cvv`, `headers.authorization`, `headers.cookie`.
User memory content, narrative letters, and raw binary photo/video payloads must never be printed to stdout.

---

## 4. CENTRALIZED ERROR HANDLING

### 4.1 Typed Error Hierarchy (`@memory-capsule/contracts`)
Services must throw typed application errors extending `AppError`:
- `ValidationError` (400)
- `UnauthorizedError` (401)
- `ForbiddenError` (403)
- `NotFoundError` (404)
- `ConflictError` (409)
- `QuotaExceededError` (429)
- `BadGatewayError` (502 / 504)

### 4.2 Standard Response Envelopes
All REST error responses must strictly conform to:
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
Internal stack traces, SQL syntax errors, and table structures must never leak into client responses.

---

## 5. DATABASE & PERFORMANCE STANDARDS

- **Primary Relational Store**: PostgreSQL 17 is the permanent source of truth.
- **Keyset Pagination**: Timeline browsing must use composite index keyset conditions `(space_id, captured_at DESC, id DESC) WHERE deleted_at IS NULL` instead of high-offset queries.
- **Connection Hygiene**: All pooled connections checked out via `db.transaction` must be released in `finally` blocks.
- **Statement Timeouts**: Default `statement_timeout = 5000ms` circuit breaker on all OLTP queries.
- **Transactional Outbox**: All domain event publishing must be staged in `outbox_events` inside the entity transaction to prevent dual-write inconsistencies.
- **Ephemeral Redis**: Redis is restricted to caching and BullMQ background queues; it is never the permanent primary store.

---

## 6. HYBRID COMMUNICATION ARCHITECTURE

- **Public Client Boundary**: REST + JSON via Fastify API Gateway (CORS, Helmet, rate limiting).
- **Internal Synchronous RPC**: gRPC + Protocol Buffers over persistent HTTP/2 channels with singleton channel reuse, explicit 3,000ms deadlines, and `x-service-auth` token validation.
- **Asynchronous Domain Events**: NATS JetStream stream `CAPSULE_EVENTS` with durable consumers and ack-based retries.
- **Binary Streaming Invariant**: Raw media uploads (`PUT /api/v1/media/local-upload`) stream directly to disk over Fastify REST streams to prevent Node.js V8 heap bloat.

---

## 7. AUTOMATED QUALITY GATES & VERIFICATION

Before marking any task complete, the following gates must be verified:
1. `pnpm run check:quality` (Zero forbidden console calls, zero empty catch blocks).
2. `pnpm build` (Zero TypeScript compilation errors across all 13 workspace projects).
3. `pnpm test` (100% test pass rate across foundation, persistence, database benchmarks, and gRPC suites).
