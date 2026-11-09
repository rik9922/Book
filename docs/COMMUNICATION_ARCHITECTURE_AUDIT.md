# COMMUNICATION ARCHITECTURE AUDIT & HYBRID STRATEGY
**Memory Capsule Platform — REST, gRPC, NATS JetStream & BullMQ Assessment**
**Document Version:** 1.0.0  
**Date:** 2026-11-09  
**Status:** Approved & Implementation Baseline  
**Budget Constraint:** Absolute $0 Budget (Cardless, Local-First, Zero Paid Cloud Add-ons)

---

## 1. EXECUTIVE SUMMARY & AUDIT SCOPE

This audit assesses the communication topology, protocol efficiency, payload serialization overhead, reliability patterns, and inter-service boundaries across the **Memory Capsule** ecosystem:

1. **Client Tier**: Web PWA (Next.js 16), Native iOS (SwiftUI), Admin Portal.
2. **API Gateway**: Fastify-based public reverse proxy and security perimeter.
3. **Internal Microservices**: `identity-service`, `memory-service`, `media-service`, `book-service`, `collab-service`, `commerce-service`.
4. **Event Bus & Storage**: NATS JetStream (`CAPSULE_EVENTS`), Redis 7, LocalDiskStorageDriver, PostgreSQL 17.

### Current Architectural State
- **Public API Boundary**: Well-structured REST JSON endpoints behind Fastify with CORS, Helmet, and rate limiting.
- **Internal Service Communication**: The API Gateway currently forwards traffic to downstream services via `@fastify/http-proxy` over standard HTTP/1.1 with text JSON encoding.
- **Inter-Service Gaps**:
  - Services lack a strongly typed, binary-serialized Remote Procedure Call (RPC) layer for high-throughput synchronous queries.
  - Inter-service queries suffer from HTTP/1.1 TCP head-of-line blocking and repetitive JSON parse/stringify serialization cycles.
  - Inconsistent inter-service authentication: internal services relied solely on duplicate JWT decoding rather than explicit service-to-service authentication tokens (`x-service-auth`).
  - No unified Protocol Buffers contract registry existed in the monorepo.

---

## 2. DETAILED SERVICE-BY-SERVICE AUDIT

### 2.1 API Gateway (`services/api-gateway`)
- **Port**: 4000 (HTTP)
- **Current Behavior**: Acts as a reverse proxy using `@fastify/http-proxy` to forward requests to ports 4001 (`identity`), 4002 (`memory`), 4003 (`media`), and 4005 (`book`).
- **Audit Findings**:
  - Every proxied request creates a fresh HTTP/1.1 request upstream, parsing and reserializing JSON payloads.
  - Lacks deadline management: an upstream hang can tie up Gateway connections until client timeouts trigger.
  - **Remediation**: Transform API Gateway into a hybrid gateway. High-throughput internal queries (`ValidateSession`, `GetUser`, `GetMemory`, `ListMemoriesKeyset`, `SearchMemories`) will be executed over persistent **gRPC** HTTP/2 multiplexed channels with strict deadlines (3000ms), while raw binary file streaming (`/api/v1/media/local-upload`) remains HTTP REST streaming.

### 2.2 Identity Service (`services/identity-service`)
- **Port**: 4001 (HTTP)
- **Primary Entities**: `users`, `user_sessions`.
- **Public Endpoints**: `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/me`.
- **Candidate gRPC Methods**:
  - `ValidateSession(ValidateSessionRequest) -> ValidateSessionResponse`: Rapid session validation and token verification.
  - `GetUser(GetUserRequest) -> GetUserResponse`: Fetch user profile by ID without HTTP header overhead.
  - `CheckMembership(CheckMembershipRequest) -> CheckMembershipResponse`: Fast role and permission checks for family spaces.
- **Justification**: Called on virtually every authenticated request by the Gateway and other services. Binary Protobuf serialization reduces auth check latency to sub-millisecond ranges.

### 2.3 Memory Service (`services/memory-service`)
- **Port**: 4002 (HTTP)
- **Primary Entities**: `memory_spaces`, `space_profiles`, `memories`, `tags`.
- **Candidate gRPC Methods**:
  - `GetMemory(GetMemoryRequest) -> GetMemoryResponse`: High-frequency memory fetch.
  - `ListMemoriesKeyset(ListMemoriesKeysetRequest) -> ListMemoriesKeysetResponse`: Chronological timeline browsing with typed pagination cursors.
  - `CreateMemory(CreateMemoryRequest) -> CreateMemoryResponse`: Fast transactional memory creation.
  - `SearchMemories(SearchMemoriesRequest) -> SearchMemoriesResponse`: Full-text search with relevance ranking.
- **Justification**: Timeline and memory browsing are the highest-read operations in the product. gRPC multiplexing over a single connection drastically reduces latency for mobile and PWA users.

### 2.4 Media Service (`services/media-service`)
- **Port**: 4003 (HTTP)
- **Candidate gRPC Methods**: `GetAssetMetadata`, `ValidateStorageAccess`.
- **REST-Only Boundary**:
  - **CRITICAL**: Binary upload streaming (`PUT /api/v1/media/local-upload`) and file serving (`GET /api/v1/media/files/*`) **MUST REMAIN REST**.
  - Loading large 10MB–50MB binary buffers into gRPC Protobuf payloads causes severe V8 garbage collection spikes and CPU thrashing. REST streaming directly to `LocalDiskStorageDriver` is mathematically optimal.

### 2.5 Book Service (`services/book-service`)
- **Port**: 4005 (HTTP)
- **Candidate gRPC Methods**: `GetBookSummary`, `GetBookStructure`, `ValidateEditionReadiness`.
- **Cross-Service Dependency**: Book Service needs memory details when auto-populating spreads. Instead of making outbound HTTP calls to Memory Service, Book Service calls Memory Service via internal gRPC!

---

## 3. PROTOCOL MATRIX & DIVISION OF RESPONSIBILITY

| Layer | Protocol & Transport | Intended Traffic | Key Constraints |
|---|---|---|---|
| **Public Edge** | **REST + JSON** (HTTP/1.1 & HTTP/2) | PWA, iOS app, Admin Portal → API Gateway. | OpenAPI/Contract conformity, browser compatibility, JSON serialization. |
| **Internal RPC** | **gRPC + Protobuf** (HTTP/2 Multiplexed) | API Gateway → Microservices; Service-to-Service synchronous queries. | Sub-millisecond latency, static type safety, explicit 3s deadlines, connection pooling. |
| **Domain Events** | **NATS JetStream** (`CAPSULE_EVENTS`) | Asynchronous lifecycle notifications (`memory.created`, `media.uploaded`). | At-least-once delivery, durable consumers, transactional outbox staging. |
| **Background Jobs** | **Redis + BullMQ** | Heavy compute: Sharp derivative generation, video transcoding, PDF layout. | In-memory queues, concurrency limits, non-blocking asynchronous workers. |
| **Data Store** | **PostgreSQL 17** | Relational source of truth across bounded contexts. | Acid transactions, keyset composite indexing, 500MB free quota locks. |
| **Real-Time UI** | **SSE / WebSockets** | Media processing progress, book export status updates. | Lightweight push, auto-reconnect, zero polling. |

---

## 4. RELIABILITY & SECURITY PRINCIPLES

1. **Service-to-Service Authentication**:
   - All internal gRPC calls require an internal service token passed in metadata: `x-service-auth`.
   - Calls with missing or invalid service tokens are rejected with `Status.UNAUTHENTICATED`.
2. **Context Propagation**:
   - Correlation IDs (`x-correlation-id`), User IDs (`x-user-id`), and Space IDs (`x-space-id`) are automatically propagated across gRPC metadata.
3. **Deadlines & Timeouts**:
   - Default RPC deadline: **3,000 ms**.
   - If a downstream service hangs, the client aborts cleanly with `Status.DEADLINE_EXCEEDED` and returns a standard 504 Gateway Timeout without cascading thread starvation.
4. **Channel Reuse**:
   - gRPC clients reuse a single persistent HTTP/2 channel per target service. Microservices never create a new gRPC connection per request.

---

## 5. PHASED IMPLEMENTATION PLAN

- **Phase 1**: Audit and Strategy Document (`docs/COMMUNICATION_ARCHITECTURE_AUDIT.md`) — *Completed*.
- **Phase 2**: Author Protocol Buffers Contracts in `packages/proto/`:
  - `proto/common/v1/common.proto`
  - `proto/identity/v1/identity.proto`
  - `proto/memory/v1/memory.proto`
  - `proto/media/v1/media.proto`
  - `proto/book/v1/book.proto`
  - Dynamic & static loader package with TypeScript types.
- **Phase 3**: Shared gRPC Utilities & Interceptors (`packages/proto/src/grpc-common.ts`):
  - Service credentials, metadata propagation, deadlines, error mapper.
- **Phase 4**: Implement gRPC Server in `services/identity-service` & `services/memory-service`.
- **Phase 5**: Implement gRPC Client in `services/api-gateway` and migrate synchronous routes.
- **Phase 6**: Performance benchmark script (`tests/communication-performance.benchmark.ts`) measuring REST vs gRPC latency, throughput, and error rates.
- **Phase 7**: Comprehensive documentation suite and end-to-end verification.
