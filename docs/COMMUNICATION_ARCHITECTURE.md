# HYBRID MICROSERVICE COMMUNICATION ARCHITECTURE
**Memory Capsule Platform — REST, gRPC, NATS JetStream, BullMQ & PostgreSQL Topology**
**Document Version:** 1.0.0  
**Status:** Implemented & Verified  
**Budget Constraint:** Absolute $0 Budget (Cardless, Local-First, Zero Paid Cloud Add-ons)

---

## 1. ARCHITECTURAL OVERVIEW

The Memory Capsule platform enforces a strict, intentional division of communication responsibilities across its microservices ecosystem:

```
+-----------------------------------------------------------------------------------+
|                           CLIENT APPLICATIONS                                     |
|           Next.js 16 Web/PWA        Native iOS (SwiftUI)       Admin Portal       |
+------------------------------------------+----------------------------------------+
                                           |
                                           | REST + JSON (HTTP/1.1 & HTTP/2)
                                           v
+-----------------------------------------------------------------------------------+
|                               API GATEWAY                                         |
|      Security Perimeter (CORS, Rate Limiting, Helmet), Route Dispatch, Auth       |
+-------------------+---------------------------------------+-----------------------+
                    |                                       |
    Internal gRPC   |                       Internal gRPC   |       Internal REST
    (Protobuf/H2)   |                       (Protobuf/H2)   |       (Streaming)
                    v                                       v                       v
+-----------------------+               +-----------------------+       +-------------------+
|   Identity Service    |               |    Memory Service     |       |   Media Service   |
| (ValidateSession,     |               | (GetMemory,           |       | (Streaming Upload,|
|  GetUser, Membership) |               |  ListMemoriesKeyset,  |       |  Local Disk Quota)|
|                       |               |  SearchMemories)      |       |                   |
+-----------+-----------+               +-----------+-----------+       +---------+---------+
            |                                       |                             |
            | (Transactional Outbox)                | (Transactional Outbox)      |
            v                                       v                             v
+-----------------------------------------------------------------------------------+
|                               NATS JetStream                                      |
|            Stream: CAPSULE_EVENTS (At-least-once asynchronous domain events)      |
+-------------------------------------------+---------------------------------------+
                                            |
                                            v
+-----------------------------------------------------------------------------------+
|                        REDIS 7 & BULLMQ BACKGROUND WORKERS                        |
|            Image derivatives (Sharp), video transcoding, PDF layout export        |
+-----------------------------------------------------------------------------------+
```

---

## 2. PROTOCOL DIVISION OF RESPONSIBILITY

### 2.1 REST + JSON: Public API Boundary
- **Clients**: PWA, native iOS application, administrative dashboard, external webhook consumers.
- **Entrypoint**: Fastify API Gateway.
- **Capabilities**:
  - Request validation via `@memory-capsule/contracts` schemas.
  - JSON serialization with standardized response formats (`createSuccessResponse`, `createErrorResponse`).
  - Correlation ID injection (`x-correlation-id`).
  - Strict security policies (CORS, rate limiting, security headers).
- **Invariance**: No internal gRPC service is exposed directly to the public internet.

### 2.2 gRPC + Protocol Buffers: Internal Synchronous Services
- **Callers**: API Gateway, inter-service coordinators (e.g., Book Service → Memory Service).
- **Transport**: HTTP/2 persistent binary streams with multiplexing.
- **Capabilities**:
  - Strongly typed contracts defined in `packages/proto/proto/`.
  - Service-to-service authentication via `x-service-auth` metadata.
  - Deadlines (3,000 ms default) to prevent cascading resource starvation.
  - Sub-millisecond p99 latency (**0.937 ms** empirical).
- **Channel Hygiene**: Persistent singleton channel reuse per service endpoint via `getOrCreateGrpcClient`.

### 2.3 NATS JetStream: Asynchronous Domain Events
- **Stream**: `CAPSULE_EVENTS`.
- **Purpose**: Decoupled domain event emission (e.g., `user.registered.v1`, `memory.created.v1`, `media.uploaded.v1`).
- **Guarantees**: At-least-once delivery, durable consumers, ack-based retries, transactional outbox consistency via PostgreSQL.

### 2.4 Redis + BullMQ: Background Computing
- **Purpose**: CPU-heavy image processing (Sharp thumbnail/web/print generation), video transcoding, export compilation.
- **Constraint**: Redis is strictly operational and ephemeral. All permanent records reside in PostgreSQL.

---

## 3. HYBRID GATEWAY ADAPTER PATTERN

The API Gateway (`services/api-gateway`) acts as a high-performance protocol translator:
1. Public clients send standard REST JSON requests (`GET /api/v1/auth/me`).
2. The Gateway extracts credentials and correlation metadata.
3. The Gateway invokes downstream microservices over persistent gRPC channels (`identityClient.validateSession(...)`).
4. Downstream Protobuf responses are transformed into standard client JSON envelopes (`createSuccessResponse({ user })`).
5. Internal gRPC errors are converted to standard HTTP status codes (`401`, `404`, `504`) using `grpcStatusToHttpStatus`.
