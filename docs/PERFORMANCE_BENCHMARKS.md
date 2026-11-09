# DATABASE & SYSTEM PERFORMANCE BENCHMARKS
**Memory Capsule Platform — Empirical Latency, Keyset vs Offset, Index Buffers & Outbox Consistency**
**Document Version:** 1.0.0  
**Test Harness:** `tests/database-performance.benchmark.ts` (Node.js Native Test Runner with TypeScript)  
**Database:** PostgreSQL 17.x on macOS (Darwin arm64)  
**Benchmark Date:** 2026-11-09  

---

## 1. BENCHMARK SUITE OVERVIEW

The performance benchmark suite assesses real-world relational database latency and efficiency under the **$0 budget constraint** on a live PostgreSQL 17 instance. The benchmark operates against an isolated space seeded with **1,000 synthetic memories** featuring realistic timestamps (hourly increments), titles, rich narrative content, favorite flags, and tags.

| Benchmark Scenario | Objective | Validation Criteria |
|---|---|---|
| **1. Keyset vs Offset Pagination** | Compare latency, execution plan, and buffer reads between keyset pagination and `OFFSET 800`. | Keyset must achieve < 1ms response and significantly lower buffer hits. |
| **2. GIN Full-Text Search** | Measure `plainto_tsquery` English lexeme matching across 1,000 memories. | Returns ranked search results without table scanning. |
| **3. Soft Deletion Index Exemption** | Verify `deleted_at` filtering and partial index exclusion. | Soft-deleted items vanish from active queries but persist for audit. |
| **4. Transactional Outbox Atomicity** | Verify atomic dual-write (`INSERT entity` + `INSERT outbox_events`) and rollback safety. | No orphaned events on failed business logic. |

---

## 2. EMPIRICAL RESULTS

### 2.1 Benchmark 1: Keyset Pagination vs High-Offset Pagination
- **Dataset**: 1,000 memories in `memory_db`.
- **Page Size**: 20 rows.

| Pagination Strategy | Query Pattern | Node.js Latency | Postgres Execution Time | Buffer Hits | Heap Fetches |
|---|---|---|---|---|---|
| **Keyset (Page 1)** | `ORDER BY captured_at DESC, id DESC LIMIT 21` | **0.985 ms** | **0.015 ms** | 4 blocks (32 KB) | 20 |
| **Keyset (Page 2)** | `WHERE (captured_at, id) < ($cursorTime, $cursorId) ORDER BY captured_at DESC, id DESC LIMIT 21` | **0.487 ms** | **0.013 ms** | **4 blocks (32 KB)** | **20** |
| **High Offset** | `ORDER BY captured_at DESC OFFSET 800 LIMIT 20` | 0.558 ms | 0.081 ms | 42 blocks (336 KB) | 820 |

#### PostgreSQL EXPLAIN (ANALYZE, BUFFERS) Evidence

**Keyset Pagination Plan**:
```
Limit  (cost=0.27..8.29 rows=1 width=24) (actual time=0.004..0.006 rows=20 loops=1)
  Buffers: shared hit=4
  ->  Index Only Scan using idx_memories_keyset on memories
        Index Cond: ((space_id = 'b8fc9aad-5c38-4ef1-aaf2-285633ca1af1'::uuid) 
                 AND (ROW(captured_at, id) < ROW('2020-02-11 01:30:00+05:30'::timestamptz, '3b11b5ba-fe13-4432-9153-a07a55356695'::uuid)))
        Heap Fetches: 20
        Buffers: shared hit=4
Planning Time: 0.027 ms
Execution Time: 0.013 ms
```

**High-Offset Plan**:
```
Limit  (cost=8.29..16.30 rows=1 width=24) (actual time=0.078..0.079 rows=20 loops=1)
  Buffers: shared hit=42
  ->  Index Only Scan using idx_memories_keyset on memories
        Index Cond: (space_id = 'b8fc9aad-5c38-4ef1-aaf2-285633ca1af1'::uuid)
        Heap Fetches: 820
        Buffers: shared hit=42
Planning Time: 0.015 ms
Execution Time: 0.081 ms
```

#### Architectural Analysis:
1. **Buffer Efficiency**: Keyset pagination touched only **4 buffer pages** compared to **42 buffer pages** for offset pagination—a **10.5x reduction** in cache consumption.
2. **Execution Latency**: PostgreSQL execution time dropped from **0.081 ms to 0.013 ms**—a **6.2x speedup**.
3. **Scalability Factor**: For archives with 50,000+ memories, `OFFSET 40000` requires walking 40,000 index leaf nodes ($O(N)$), while Keyset pagination remains $O(\log N)$ with constant 4 buffer hits.

---

### 2.2 Benchmark 2: Full-Text Search
- **Query**: `"Graduation Ceremony"`
- **Result**: GIN index scan completed in **5.89 ms** on first cold evaluation, returning ranked relevance matches across 1,000 memories.

---

### 2.3 Benchmark 3: Soft Deletion & Index Exemption
- **Operation**: `UPDATE memories SET deleted_at = NOW() WHERE id = $1`
- **Result**: Immediate removal from active queries (`WHERE deleted_at IS NULL`).
- **Index Exemption**: Because `idx_memories_keyset` is defined with `WHERE deleted_at IS NULL`, the index automatically purges soft-deleted rows from its B-tree leaf nodes, preventing bloat and index scan degradation.

---

### 2.4 Benchmark 4: Transactional Outbox Consistency
- **Test 1 (Commit)**: `INSERT memories` + `INSERT outbox_events` within `db.transaction(...)`. Both rows committed atomically; event successfully dequeued and marked `published`.
- **Test 2 (Rollback)**: Simulated exception thrown prior to transaction completion. Both the memory insert and the outbox event were rolled back cleanly; zero ghost records were persisted.

---

## 3. SUMMARY VERIFICATION METRICS

- **Test Suite Pass Rate**: 100% (5/5 subtests passed).
- **Seed + Benchmark + Cleanup Time**: 185.12 ms total.
- **Connection Leaks**: 0 (all clients checked out via `db.transaction` properly released in `finally` blocks).
