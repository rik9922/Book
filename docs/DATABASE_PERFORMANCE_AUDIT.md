# DATABASE PERFORMANCE AUDIT & ARCHITECTURAL BASELINE
**Memory Capsule Platform — Relational Engineering & Optimization Assessment**
**Document Version:** 1.0.0  
**Date:** 2026-11-09  
**Database System:** PostgreSQL 17.x (Local-First, Absolute $0 Budget Constraint)  
**Author:** Senior Database Architect & Backend Performance Engineer

---

## 1. EXECUTIVE SUMMARY & AUDIT SCOPE

This audit provides an evidence-based assessment of the relational schema, query access patterns, indexing strategy, transaction boundaries, and connection management across all microservices comprising the **Memory Capsule** ecosystem:

1. **Identity & Authentication Service** (`identity_db`)
2. **Memory Archive Service** (`memory_db`)
3. **Media Pipeline & Quotas Service** (`media_db`)
4. **Collaboration & Permissions Service** (`collab_db`)
5. **Book Engine & Document Studio** (`book_db`)
6. **Publishing & Fulfilment Service** (`commerce_db`)
7. **Operational Infrastructure & Outbox** (`notification_db` / shared operational tables)

### Key Audit Verdict
The foundational schema definitions (`001_identity_schema.sql` through `004_book_schema.sql`) correctly established basic entity tables, primary keys, and rudimentary single-column indexes. However, several critical architectural vulnerabilities and performance bottlenecks exist that will degrade latency and scalability under real-world usage:

- **Flat Array Anti-Patterns**: Storage of profile associations (`associated_profile_ids UUID[]`), media attachments (`media_ids UUID[]`), and tags (`tags TEXT[]`) as unindexed PostgreSQL arrays in `memories`. This impedes relational integrity, prevents foreign-key cascade deletes, and precludes index-supported join traversals.
- **Missing Soft Deletes (`deleted_at`)**: Soft deletion flags are absent on `memories`, `memory_spaces`, and `space_profiles`, risking irrecoverable data loss and preventing audit trail recovery.
- **Unbounded Memory Scans & Inefficient Pagination**: Archive queries currently perform full scans on `memories WHERE space_id = $1 ORDER BY captured_at DESC` without cursor bounds or keyset pagination. High-offset pagination (`OFFSET 10000`) causes linear $O(N)$ page walks.
- **Absence of GIN Full-Text Search**: Keyword searches on `title` and `content` are forced to execute unindexed `ILIKE '%term%'` sequential table scans.
- **Transactional Outbox Gap**: Domain events emitted across NATS JetStream during memory creation, media uploads, and book freezing were not bound to the PostgreSQL transaction lifecycle, creating dual-write inconsistency risks during network partitions or crashes.
- **Connection Pool Sizing**: Connection pool parameters defaulted to arbitrary thresholds (`max: 10` per service) without statement timeouts or a calculated global connection budget.

---

## 2. COMPONENT-BY-COMPONENT DETAILED FINDINGS

### 2.1 Identity & Session Management (`identity_db`)
- **Current State**:
  - `users`: Indexed on `email` (B-tree unique). Password hashes stored using scrypt with random salt.
  - `user_sessions`: Indexed on `user_id`. Refresh tokens hashed using SHA-256.
- **Vulnerabilities / Gaps**:
  - `user_sessions` lacks an index on `(user_id, expires_at)` to support rapid session cleanup and revocation.
  - Lack of an explicit statement timeout could permit malicious slow queries to monopolize client pools.
- **Remediation**:
  - Add composite index `idx_sessions_cleanup ON user_sessions (expires_at) WHERE expires_at < NOW()`.
  - Enforce strict `statement_timeout = 5000` (5 seconds) on all identity queries.

### 2.2 Memory Archive & Relational Integrity (`memory_db`)
- **Current State**:
  - `memory_spaces`: Basic CRUD metadata with `owner_id`.
  - `space_profiles`: Represents family members, children, pets with `space_id` foreign key.
  - `memories`: Stores memories with flat arrays: `associated_profile_ids UUID[]`, `media_ids UUID[]`, `tags TEXT[]`.
- **Bottlenecks Identified**:
  1. *Junction Inefficiency*: Checking if a memory belongs to a child profile currently evaluates `$1 = ANY(associated_profile_ids)`. PostgreSQL must unpack array elements for every row matching `space_id`, preventing B-tree index seeks.
  2. *Cascade Delete Failure*: If a `space_profile` is deleted, references in `associated_profile_ids` remain orphaned.
  3. *Full-Text Search Vacuum*: Users searching for `"birthday at grandparents"` cannot utilize indexed search; sequential table scan is mandatory.
  4. *Missing Keyset Pagination*: Sorting by `captured_at DESC` without a secondary deterministic tie-breaker (`id DESC`) causes unstable page boundaries when multiple memories share the same timestamp.
- **Remediation**:
  - Retain array columns for backward compatibility while introducing normalized junction tables: `memory_media`, `memory_profiles`, `tags`, and `memory_tags`.
  - Add `deleted_at TIMESTAMPTZ` with partial index:
    `CREATE INDEX idx_memories_keyset ON memories (space_id, captured_at DESC, id DESC) WHERE deleted_at IS NULL;`
  - Add GIN full-text index:
    `CREATE INDEX idx_memories_fts ON memories USING gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))) WHERE deleted_at IS NULL;`

### 2.3 Media Pipeline & Quotas (`media_db`)
- **Current State**:
  - `media_assets`: Upload metadata, mime type, size, storage key, derivatives JSONB.
  - `space_storage_quotas`: Fast, lockable row for storage tracking (`used_bytes`, `max_bytes = 524288000`).
- **Audit Findings**:
  - Quota verification correctly executes `SELECT used_bytes FROM space_storage_quotas WHERE space_id = $1 FOR UPDATE`. This guarantees serializable byte reservation and strictly enforces the $0 budget zero-overage constraint.
  - Need a composite index on `(space_id, created_at DESC)` for media gallery timeline browsing.

### 2.4 Collaboration & Multi-User Workspaces (`collab_db`)
- **Current State**:
  - Space memberships were partially simulated or managed in-memory.
- **Gaps**:
  - Missing normalized `space_members` table linking `(space_id, user_id, role, permissions, joined_at)`.
  - Missing `space_invitations` table with cryptographically secure token hashes and expiration timestamps.
- **Remediation**:
  - Introduce migration `005_collaboration_schema.sql` with unique index `(space_id, user_id)`.

### 2.5 Book Engine & Document Studio (`book_db`)
- **Current State**:
  - `books`: Master book record with format, cover styling, and print freeze metadata (`is_frozen_for_print`, `frozen_edition_hash`).
  - `book_spreads`: Spreads with `spread_index` and JSONB page schemas.
- **Audit Findings**:
  - Excellent use of JSONB for layout page nodes allowing flexible coordinate grids while keeping spread ordering indexed (`(book_id, spread_index ASC)`).
  - Add partial index `idx_books_frozen ON books (id) WHERE is_frozen_for_print = TRUE;` for print pipeline workers.

### 2.6 Publishing & Fulfilment (`commerce_db`)
- **Gaps**:
  - Tables for physical orders, print specs, addresses, and fulfilment tracking were missing from migrations.
- **Remediation**:
  - Introduce migration `007_commerce_and_orders_schema.sql` establishing `print_orders`, `order_items`, and `fulfilment_records`.

### 2.7 Transactional Outbox & Audit Logging (`notification_db` / Operational)
- **Gaps**:
  - Writing to the database and publishing to NATS JetStream were executed as separate uncoordinated steps. If the Node.js process crashed after `INSERT INTO memories` but before `nats.publish(...)`, the event was lost forever.
- **Remediation**:
  - Introduce migration `008_operations_and_outbox_schema.sql` with `outbox_events` table and partial index on pending events:
    `CREATE INDEX idx_outbox_pending ON outbox_events (created_at ASC) WHERE status = 'pending';`
  - All mutating service operations write their domain events to `outbox_events` within the same PostgreSQL transaction (`BEGIN ... COMMIT`).
  - An outbox dispatcher background worker reliably dequeues pending events and delivers them to NATS JetStream with at-least-once delivery guarantees.

---

## 3. CONNECTION POOLING & CONCURRENCY BUDGET

Under the strict **$0 budget constraint**, all services run locally or on a single multi-tenant PostgreSQL 17 instance. Default PostgreSQL installations permit up to `max_connections = 100`.

### Global Connection Budget Allocation
| Component | Instances | Max Connections Per Instance | Total Max Connections |
|---|---|---|---|
| `identity-service` | 1 | 5 | 5 |
| `memory-service` | 1 | 10 | 10 |
| `media-service` | 1 | 5 | 5 |
| `book-service` | 1 | 5 | 5 |
| `publishing-service` | 1 | 3 | 3 |
| Outbox Dispatcher Worker | 1 | 2 | 2 |
| Background Media Worker | 1 | 2 | 2 |
| DBA / Migrations / CLI | - | 5 | 5 |
| **Reserved Safety Buffer** | - | - | **63** |
| **Total Max Connections** | | | **100** |

### Client Hygiene & Statement Timeouts
- **Idle Timeout**: Set to 10,000ms. Idle connections are pruned promptly.
- **Connection Timeout**: Set to 2,000ms. If the database is unresponsive, fail fast rather than hanging HTTP requests.
- **Statement Timeout**: Global default `SET statement_timeout = '5000'`. No OLTP query is permitted to run longer than 5 seconds.

---

## 4. PRIORITIZED REMEDIATION ROADMAP

1. **Step 1**: Author forward SQL migrations:
   - `005_collaboration_schema.sql`
   - `006_performance_and_archive_schema.sql`
   - `007_commerce_and_orders_schema.sql`
   - `008_operations_and_outbox_schema.sql`
2. **Step 2**: Apply all migrations to local PostgreSQL databases and inspect with `psql`.
3. **Step 3**: Upgrade `packages/database`:
   - Add transaction helper `db.transaction<T>(async (client) => { ... })`.
   - Add `OutboxRepository` for transactional outbox pattern.
   - Implement keyset pagination `listMemoriesKeyset()` and full-text search in `PostgresMemoryRepository`.
4. **Step 4**: Complete documentation suite (`DATABASE_ARCHITECTURE.md`, `DATABASE_SCHEMA_REFERENCE.md`, `DATABASE_INDEX_STRATEGY.md`, `DATABASE_QUERY_GUIDELINES.md`, `PERFORMANCE_BENCHMARKS.md`, `BACKUP_AND_RECOVERY.md`).
5. **Step 5**: Write and execute rigorous benchmark script (`tests/database-performance.benchmark.ts`) measuring keyset vs offset pagination execution times with real `EXPLAIN (ANALYZE, BUFFERS)` evidence.
