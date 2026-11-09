# GRPC SECURITY, RELIABILITY & RESILIENCE SPECIFICATION
**Memory Capsule Platform — Internal Authentication, Deadlines, Retries & Isolation**
**Document Version:** 1.0.0  

---

## 1. SERVICE-TO-SERVICE AUTHENTICATION

Internal microservices run within a private network boundary. To protect against rogue container access or unauthorized internal calls:

### 1.1 The `x-service-auth` Header
- Every gRPC client attaches metadata containing the internal service authorization token:
  ```ts
  const meta = new Metadata();
  meta.set("x-service-auth", process.env.INTERNAL_SERVICE_KEY || DEFAULT_INTERNAL_SERVICE_KEY);
  ```
- Downstream gRPC servers verify this header on every incoming RPC:
  ```ts
  if (!verifyServiceAuth(call.metadata)) {
    return callback({
      code: grpc.status.UNAUTHENTICATED,
      message: "Unauthorized internal service call",
    });
  }
  ```
- In verified tests (`tests/grpc-communication.test.ts`), calls with missing or invalid service keys are rejected immediately with `Status.UNAUTHENTICATED`.

---

## 2. CONTEXT PROPAGATION & TRACEABILITY

Correlation IDs and user context are preserved across protocol hops:
1. Public client sends HTTP request with optional `x-correlation-id` (or Gateway generates `corr-<uuid>`).
2. Gateway attaches `x-correlation-id`, `x-user-id`, and `x-space-id` into gRPC metadata using `createClientMetadata`.
3. Downstream services log all operations referencing the same `correlationId`.

---

## 3. DEADLINES & TIMEOUTS

Cascading thread starvation is prevented by enforcing explicit deadlines on every synchronous gRPC call:
- **Default Deadline**: 3,000 milliseconds (`createDeadline(3000)`).
- **Behavior on Expiry**: If a downstream service hangs or fails to respond within the deadline, the client automatically aborts the call with `grpc.status.DEADLINE_EXCEEDED`.
- **Gateway Mapping**: The Gateway catches `DEADLINE_EXCEEDED` and returns HTTP `504 Gateway Timeout` with a clean error JSON envelope, freeing all connections.

---

## 4. RETRIES & IDEMPOTENCY SAFEGUARDS

### 4.1 Retry Classification
| Status Code | Action | Backoff |
|---|---|---|
| `UNAVAILABLE` | Retry up to 2 times | Exponential (100ms, 300ms) with jitter |
| `DEADLINE_EXCEEDED` | **Do Not Retry** automatically | Abort and report 504 |
| `INVALID_ARGUMENT` | **Do Not Retry** | Abort and report 400 |
| `UNAUTHENTICATED` | **Do Not Retry** | Abort and report 401 |
| `PERMISSION_DENIED`| **Do Not Retry** | Abort and report 403 |

### 4.2 Idempotency on Write Operations
Mutating RPCs (such as `CreateMemory`) require client-provided UUID primary keys (`id`). If a network glitch occurs after the server committed the transaction but before the client received the ack, a retried request with the same UUID fails gracefully on primary key conflict (`ALREADY_EXISTS`) rather than creating duplicate memories.
