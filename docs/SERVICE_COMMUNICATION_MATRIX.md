# SERVICE COMMUNICATION MATRIX
**Memory Capsule Platform — Exhaustive Caller, Callee, Protocol & Transport Mapping**
**Document Version:** 1.0.0  

---

## 1. COMPREHENSIVE INTER-SERVICE MATRIX

| Source Service | Target Service | Interaction Type | Protocol & Transport | Purpose / Payload |
|---|---|---|---|---|
| **Client (PWA/iOS)** | **API Gateway** | Synchronous | REST + JSON (HTTP/1.1 or HTTP/2) | Public user authentication, timeline queries, media uploads, book edits. |
| **API Gateway** | **Identity Service** | Synchronous | **gRPC** (HTTP/2 Multiplexed) | `ValidateSession`, `GetUser`, `CheckMembership`. |
| **API Gateway** | **Memory Service** | Synchronous | **gRPC** (HTTP/2 Multiplexed) | `GetMemory`, `ListMemoriesKeyset`, `CreateMemory`, `SearchMemories`. |
| **API Gateway** | **Media Service** | Synchronous Streaming | REST (HTTP/1.1 or HTTP/2) | High-throughput binary file upload streaming to `LocalDiskStorageDriver`. |
| **API Gateway** | **Book Service** | Synchronous | REST / gRPC | Book document management, spread creation, and edition freeze. |
| **Book Service** | **Memory Service** | Synchronous | **gRPC** (HTTP/2 Multiplexed) | Fetching memory stories and asset IDs to auto-generate book spreads. |
| **Identity Service** | **NATS JetStream** | Asynchronous Event | NATS TCP (`CAPSULE_EVENTS`) | Publishing `user.registered.v1` via Transactional Outbox. |
| **Memory Service** | **NATS JetStream** | Asynchronous Event | NATS TCP (`CAPSULE_EVENTS`) | Publishing `memory.created.v1`, `memory.deleted.v1` via Outbox. |
| **Media Service** | **NATS JetStream** | Asynchronous Event | NATS TCP (`CAPSULE_EVENTS`) | Publishing `media.uploaded.v1`, `media.processed.v1`. |
| **Media Service** | **BullMQ / Redis** | Asynchronous Queue | Redis In-Memory Queue | Enqueuing heavy Sharp image derivative generation tasks. |
| **Background Workers** | **PostgreSQL 17** | Relational CRUD | TCP Pool (Port 5432) | Updating media derivative paths, quota tracking, outbox event dispatch. |

---

## 2. WHY CHOSEN TRANSPORTS ARE OPTIMAL

1. **Why gRPC for API Gateway → Identity Service**:
   - `ValidateSession` executes on almost every authenticated user action. Binary serialization and HTTP/2 connection pooling eliminate HTTP/1.1 handshake and header overhead.
2. **Why gRPC for API Gateway → Memory Service**:
   - Timeline loading is the primary content consumption view. Returning structured Protobuf messages reduces deserialization CPU cycles in Node.js.
3. **Why REST for Media File Uploads**:
   - Large raw image buffers (up to 50MB) stream directly to disk without Protobuf Base64/Byte parsing overhead, preventing V8 memory bloat.
4. **Why NATS JetStream for Lifecycle Events**:
   - Guarantees loose coupling between domains and prevents cascading failures when downstream notification or analytics services are temporarily offline.
