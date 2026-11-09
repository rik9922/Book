# DATABASE QUERY GUIDELINES & ANTI-PATTERN DEFENSE
**Memory Capsule Platform — Developer Guidelines for Fast, Safe Relational Queries**
**Document Version:** 1.0.0  
**Target RDBMS:** PostgreSQL 17.x  

---

## 1. CORE RELATIONAL QUERY PRINCIPLES

All engineers and subagents writing database queries for the Memory Capsule ecosystem must follow these mandatory rules:

### Rule 1: Always Bound Queries with `LIMIT`
Never issue open-ended queries like `SELECT * FROM memories WHERE space_id = $1`. Always specify a `LIMIT` (maximum 100). Unbounded queries trigger runaway heap consumption in Node.js Fastify services.

### Rule 2: Use Keyset Pagination Instead of `OFFSET`
- **Forbidden Pattern**: `SELECT * FROM memories WHERE space_id = $1 ORDER BY captured_at DESC OFFSET 5000 LIMIT 20;`
  - *Why*: PostgreSQL must scan 5,020 rows, sort them, and discard 5,000 of them, burning CPU and cache pages.
- **Mandatory Pattern**:
  ```sql
  SELECT id, title, captured_at
  FROM memories
  WHERE space_id = $1 AND deleted_at IS NULL
    AND (captured_at < $cursorTime OR (captured_at = $cursorTime AND id < $cursorId))
  ORDER BY captured_at DESC, id DESC
  LIMIT 21;
  ```

### Rule 3: Avoid N+1 Query Cascades
When fetching a timeline of memories with their attached media, do not query media in a nested loop:
- **Forbidden**:
  ```ts
  // BAD: N+1 queries
  const memories = await memoryRepo.listMemories(spaceId);
  for (const memory of memories) {
    memory.media = await db.query("SELECT * FROM media_assets WHERE id = ANY($1)", [memory.mediaIds]);
  }
  ```
- **Approved**: Join or aggregate in a single query:
  ```sql
  SELECT m.id, m.title, m.captured_at,
         COALESCE(json_agg(
           json_build_object('id', ma.id, 'storageKey', ma.storage_key, 'derivatives', ma.derivatives)
           ORDER BY mm.sort_order ASC
         ) FILTER (WHERE ma.id IS NOT NULL), '[]') as assets
  FROM memories m
  LEFT JOIN memory_media mm ON mm.memory_id = m.id
  LEFT JOIN media_assets ma ON ma.id = mm.media_id
  WHERE m.space_id = $1 AND m.deleted_at IS NULL
  GROUP BY m.id
  ORDER BY m.captured_at DESC, m.id DESC
  LIMIT 20;
  ```

### Rule 4: Always Filter Soft Deletions Explicitly
Every query against `memories`, `memory_spaces`, or `space_profiles` must include `WHERE deleted_at IS NULL` unless explicitly servicing an administrative undelete or audit history endpoint. Failing to filter `deleted_at IS NULL` invalidates index usage on `idx_memories_keyset`.

### Rule 5: Keep Transactions Lean
Never perform asynchronous HTTP calls, file storage operations (`LocalDiskStorageDriver.writeFile`), or Sharp image conversions inside a PostgreSQL transaction (`BEGIN ... COMMIT`).
- Run media conversions and disk I/O **first**.
- Execute the database transaction (`BEGIN; INSERT ...; COMMIT;`) **second**, keeping transaction hold times under 10 milliseconds.

---

## 2. TRANSACTION CONCURRENCY & LOCKING

### Storage Quota Reservation Pattern
To prevent race conditions where two simultaneous uploads exceed the 500MB free quota:
```sql
BEGIN;
SELECT used_bytes, max_bytes 
FROM space_storage_quotas 
WHERE space_id = $1 
FOR UPDATE;

-- Application checks: if (used_bytes + incomingBytes > max_bytes) ROLLBACK & throw 403;

UPDATE space_storage_quotas 
SET used_bytes = used_bytes + $2, updated_at = NOW() 
WHERE space_id = $1;

INSERT INTO media_assets (...) VALUES (...);

COMMIT;
```
`FOR UPDATE` serializes concurrent uploads for the same space while allowing independent spaces to upload simultaneously without lock contention.
