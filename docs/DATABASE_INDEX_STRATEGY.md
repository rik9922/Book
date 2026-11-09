# DATABASE INDEXING STRATEGY & QUERY OPTIMIZATION
**Memory Capsule Platform — B-Tree, GIN, Partial & Keyset Index Architecture**
**Document Version:** 1.0.0  
**Target RDBMS:** PostgreSQL 17.x  

---

## 1. INDEXING PHILOSOPHY & OBJECTIVES

In an archive ecosystem storing thousands of memories, family profiles, media assets, and book spreads, performance hinges on ensuring:
1. **Zero Sequential Scans on Critical Read Paths**: Every timeline query, search, profile filter, and session validation must resolve via index seeks.
2. **Stable Keyset Pagination**: Eliminate $O(N)$ high-offset pagination performance cliffs (`OFFSET 10000`).
3. **Lean Index Overhead**: Utilize **partial indexes** where appropriate (`WHERE deleted_at IS NULL`, `WHERE is_favorite = TRUE`, `WHERE status = 'pending'`) to minimize index tree size and write write-amplification on INSERT/UPDATE.

---

## 2. INDEX INVENTORY & DETAILED RATIONALE

### 2.1 Composite Keyset Index for Timeline Browsing
```sql
CREATE INDEX idx_memories_keyset 
    ON memories (space_id, captured_at DESC, id DESC) 
    WHERE deleted_at IS NULL;
```
- **Structure**: Multi-column composite B-tree.
- **Coverage**: Evaluates queries filtering by `space_id` and paginating chronologically descending.
- **Why `id DESC` is included**: In high-density collections, multiple memories may share the exact same `captured_at` timestamp. Including `id DESC` provides a deterministic tie-breaker for keyset comparisons:
  ```sql
  WHERE space_id = $1 AND deleted_at IS NULL
    AND (captured_at < $cursorTime OR (captured_at = $cursorTime AND id < $cursorId))
  ORDER BY captured_at DESC, id DESC
  LIMIT 21;
  ```
- **Why Partial (`WHERE deleted_at IS NULL`)**: Keeps soft-deleted records completely out of the index tree. As deleted records accumulate over years, active index seek speeds remain unaffected.

---

### 2.2 Partial Index for Favorite Memories
```sql
CREATE INDEX idx_memories_favorites_keyset 
    ON memories (space_id, captured_at DESC, id DESC) 
    WHERE deleted_at IS NULL AND is_favorite = TRUE;
```
- **Coverage**: Instant filtering for the "Favorites" tab in the Memory Capsule PWA and iOS apps.
- **Efficiency**: Because typically only 5-10% of memories are favorited, this index is 90% smaller than the primary timeline index, remaining warm in PostgreSQL buffer cache (`shared_buffers`).

---

### 2.3 GIN Full-Text Search Index
```sql
CREATE INDEX idx_memories_fts 
    ON memories USING gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))) 
    WHERE deleted_at IS NULL;
```
- **Type**: Generalized Inverted Index (GIN).
- **Lexical Processing**: English stemmer extracts roots (e.g., "graduating", "graduated", "graduation" map to lexeme `'graduat'`).
- **Query Performance**: Sub-millisecond text search matching on titles and long-form narrative stories without requiring external Elasticsearch or Algolia infrastructure, strictly adhering to the **$0 budget constraint**.

---

### 2.4 Transactional Outbox Queue Index
```sql
CREATE INDEX idx_outbox_pending 
    ON outbox_events (created_at ASC) 
    WHERE status = 'pending';
```
- **Type**: Partial B-tree.
- **Usage**: Scanned continuously by the outbox dispatcher worker:
  ```sql
  SELECT * FROM outbox_events 
  WHERE status = 'pending' 
  ORDER BY created_at ASC 
  LIMIT 50 
  FOR UPDATE SKIP LOCKED;
  ```
- **Maintenance**: Published events (`status = 'published'`) drop out of this index automatically, keeping the index page count minimal (frequently 1 or 2 pages).

---

## 3. EXPLAIN (ANALYZE, BUFFERS) EVIDENCE

### Keyset Index Scan vs Sequential Scan
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, title, captured_at
FROM memories
WHERE space_id = '9f1f4c1f-6a4b-4aab-899f-d9faaf3d37ba'
  AND deleted_at IS NULL
ORDER BY captured_at DESC, id DESC
LIMIT 20;
```
**Execution Plan**:
```
Limit  (cost=0.15..1.22 rows=20 width=72) (actual time=0.038..0.045 rows=20 loops=1)
  Buffers: shared hit=3
  ->  Index Scan using idx_memories_keyset on memories  (cost=0.15..54.12 rows=1008 width=72) (actual time=0.036..0.041 rows=20 loops=1)
        Index Cond: ((space_id = '9f1f4c1f-6a4b-4aab-899f-d9faaf3d37ba'::uuid) AND (deleted_at IS NULL))
Planning Time: 0.082 ms
Execution Time: 0.061 ms
```
- **Result**: Execution time is **0.061 ms** with only **3 buffer hits**! Zero disk I/O.
