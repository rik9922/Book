# DATABASE ARCHITECTURE SPECIFICATION
**Memory Capsule Platform — Relational Data Layer, Microservice Topology & Concurrency**
**Document Version:** 1.0.0  
**Status:** Approved & Implemented  
**Primary Database:** PostgreSQL 17.x  
**Financial Constraint:** Absolute $0 Budget (Cardless, Local-First, Zero Paid Cloud Add-ons)

---

## 1. ARCHITECTURAL OVERVIEW

The Memory Capsule data tier is built upon an event-driven, bounded-context relational architecture. Each domain owns its operational database with dedicated schema contracts, strict referential integrity, and isolated connection pools.

```
                      +-----------------------------+
                      |       Clients (PWA/iOS)     |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |   Fastify Microservices     |
                      | (Identity, Memory, Media,   |
                      |  Book, Commerce, Collab)    |
                      +--------------+--------------+
                                     |
       +-----------------------------+-----------------------------+
       | (PostgreSQL Driver with Transaction Management & Pooling) |
       v                             v                             v
+---------------+             +---------------+             +---------------+
|  identity_db  |             |   memory_db   |             |   media_db    |
| (Users, Sess) |             | (Spaces, Mem) |             | (Assets, Quo) |
+-------+-------+             +-------+-------+             +-------+-------+
        |                             |                             |
        | (Transactional Outbox)      | (Transactional Outbox)      | (Transactional Outbox)
        v                             v                             v
+---------------------------------------------------------------------------+
|                          outbox_events Table                              |
+-------------------------------------+-------------------------------------+
                                      |
                           (Dispatcher Daemon)
                                      v
                        +---------------------------+
                        |     NATS JetStream        |
                        |    (CAPSULE_EVENTS)       |
                        +---------------------------+
```

---

## 2. BOUNDED CONTEXTS & DATABASE MAPPING

| Database | Service Owner | Primary Entities | Key Invariants |
|---|---|---|---|
| `identity_db` | `identity-service` | `users`, `user_sessions` | Unique emails, scrypt salt+hash, indexed sessions, zero plaintext auth tokens. |
| `memory_db` | `memory-service` | `memory_spaces`, `space_profiles`, `memories`, `memory_media`, `memory_profiles`, `tags`, `memory_tags` | Cascade on space delete, soft-deletion support (`deleted_at`), composite keyset pagination indexes. |
| `media_db` | `media-service` | `media_assets`, `space_storage_quotas` | `SELECT FOR UPDATE` on storage quotas to enforce strictly 500MB free tier cap. |
| `collab_db` | `collab-service` | `space_members`, `space_invitations` | Unique `(space_id, user_id)`, hashed invitation tokens with TTL. |
| `book_db` | `book-service` | `books`, `book_spreads` | Frozen edition hashes for print immutability; JSONB page schema nodes. |
| `commerce_db` | `commerce-service` | `print_orders`, `order_items`, `fulfilment_records` | Immutable print specs; tracking lifecycle records. |
| Operational | Shared | `outbox_events`, `audit_logs` | At-least-once domain event dispatch; immutable append-only audit trail. |

---

## 3. RELATIONAL INTEGRITY & JUNCTION NORMALIZATION

In prior iterations, profile attachments and tags were stored exclusively in flat arrays (`associated_profile_ids UUID[]`, `tags TEXT[]`). While flat arrays are retained for rapid single-row reads, they are now complemented by normalized junction tables:

### 3.1 Memory Media Junction (`memory_media`)
```sql
CREATE TABLE memory_media (
    memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    media_id UUID NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (memory_id, media_id)
);
```
- Guarantees referential deletion of media links when a memory is deleted.
- Preserves explicit multi-asset display order (`sort_order`).

### 3.2 Memory Profiles Junction (`memory_profiles`)
```sql
CREATE TABLE memory_profiles (
    memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES space_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (memory_id, profile_id)
);
```
- Enforces referential integrity to `space_profiles`.
- Replaces unindexed `$1 = ANY(associated_profile_ids)` table scans with index-assisted inner joins:
  ```sql
  SELECT m.* FROM memories m
  JOIN memory_profiles mp ON mp.memory_id = m.id
  WHERE mp.profile_id = $1 AND m.deleted_at IS NULL
  ORDER BY m.captured_at DESC, m.id DESC;
  ```

---

## 4. TRANSACTIONAL OUTBOX PATTERN

To guarantee cross-boundary consistency without distributed 2-phase commit (2PC) or third-party card-gated CDC services:

1. **Atomic Write**: Any domain mutation (e.g., creating a memory or uploading media) writes its entity row and an `outbox_events` record within a single PostgreSQL transaction (`BEGIN ... COMMIT`).
2. **Schema**:
   ```sql
   CREATE TABLE outbox_events (
       id UUID PRIMARY KEY,
       event_type VARCHAR(255) NOT NULL,
       aggregate_type VARCHAR(100) NOT NULL,
       aggregate_id UUID NOT NULL,
       payload JSONB NOT NULL,
       status VARCHAR(50) NOT NULL DEFAULT 'pending',
       retry_count INTEGER NOT NULL DEFAULT 0,
       error_message TEXT,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       processed_at TIMESTAMPTZ
   );
   CREATE INDEX idx_outbox_pending ON outbox_events (created_at ASC) WHERE status = 'pending';
   ```
3. **Dispatch Worker**: An in-process worker polls `SELECT * FROM outbox_events WHERE status = 'pending' ORDER BY created_at ASC LIMIT 50 FOR UPDATE SKIP LOCKED`, publishes to NATS JetStream, and marks the record `published`.

---

## 5. CONNECTION POOLING ARCHITECTURE

Connection pooling is implemented via `pg.Pool` in `@memory-capsule/database`:

- **Client Limits**:
  - `DB_POOL_MAX` per service instance (defaults to 10 for memory service, 5 for others).
  - Maximum cluster connections: 100 on PostgreSQL 17.
- **Statement Timeout**:
  - `statement_timeout = 5000` (5 seconds) prevents long-running unindexed queries from holding pool resources.
- **Connection Timeout**:
  - `connectionTimeoutMillis = 2000` prevents HTTP workers from hanging indefinitely during connection spikes.
- **Client Checkout Hygiene**:
  - Guaranteed `client.release()` in `finally` blocks inside `transaction<T>(fn)`.
