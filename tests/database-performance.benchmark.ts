import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  createDatabaseClient,
  PostgresMemoryRepository,
  PostgresOutboxRepository,
} from "@memory-capsule/database";

test("Database Performance & Architecture Benchmark Suite", async (t) => {
  const dbUrl = process.env.MEMORY_DATABASE_URL || process.env.DATABASE_URL;
  assert.ok(dbUrl, "MEMORY_DATABASE_URL or DATABASE_URL must be configured");
  const db = createDatabaseClient(dbUrl);
  const memoryRepo = new PostgresMemoryRepository(db);
  const outboxRepo = new PostgresOutboxRepository(db);

  const benchmarkSpaceId = crypto.randomUUID();
  const authorId = crypto.randomUUID();

  // Create isolated benchmark space
  await db.query(
    `INSERT INTO memory_spaces (id, owner_id, name, description)
     VALUES ($1, $2, 'Benchmark Memory Space', 'Synthetic space for database latency analysis')`,
    [benchmarkSpaceId, authorId]
  );

  const TOTAL_MEMORIES = 1000;
  console.log(`\n--- Seeding ${TOTAL_MEMORIES} synthetic memories into memory_db ---`);
  const startTime = Date.now();

  const baseDate = new Date("2020-01-01T00:00:00Z").getTime();
  for (let i = 0; i < TOTAL_MEMORIES; i++) {
    const memoryId = crypto.randomUUID();
    const capturedAt = new Date(baseDate + i * 3600000).toISOString(); // 1 hour intervals
    const title = i % 50 === 0
      ? `Graduation Ceremony Milestone Day ${i}`
      : `Family Summer Holiday Moment #${i}`;
    const content = `Preserving heartfelt memories of laughter, travel, and togetherness during milestone event ${i}.`;

    await db.query(
      `INSERT INTO memories (id, space_id, author_id, title, content, format, captured_at, is_favorite, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'image', $6, $7, NOW(), NOW())`,
      [memoryId, benchmarkSpaceId, authorId, title, content, capturedAt, i % 10 === 0]
    );
  }

  const seedDuration = Date.now() - startTime;
  console.log(`Seeded ${TOTAL_MEMORIES} memories in ${seedDuration}ms`);

  await t.test("Benchmark 1: Keyset Pagination vs High-Offset Pagination", async () => {
    // 1. Keyset Pagination (Page 1)
    const t0 = performance.now();
    const page1 = await memoryRepo.listMemoriesKeyset(benchmarkSpaceId, { limit: 20 });
    const keysetP1Time = performance.now() - t0;

    assert.equal(page1.items.length, 20);
    assert.ok(page1.nextCursor, "Must return nextCursor for pagination");

    // 2. Keyset Pagination (Page 2 using cursor)
    const t1 = performance.now();
    const page2 = await memoryRepo.listMemoriesKeyset(benchmarkSpaceId, {
      cursorTime: page1.nextCursor!.cursorTime,
      cursorId: page1.nextCursor!.cursorId,
      limit: 20,
    });
    const keysetP2Time = performance.now() - t1;

    assert.equal(page2.items.length, 20);
    assert.notEqual(page1.items[0].id, page2.items[0].id, "Page 2 must have distinct rows");

    // 3. High-Offset Pagination (OFFSET 800 LIMIT 20)
    const t2 = performance.now();
    const offsetRes = await db.query(
      `SELECT id, captured_at FROM memories
       WHERE space_id = $1 AND deleted_at IS NULL
       ORDER BY captured_at DESC
       OFFSET 800 LIMIT 20`,
      [benchmarkSpaceId]
    );
    const offsetTime = performance.now() - t2;
    assert.equal(offsetRes.rows.length, 20);

    // 4. EXPLAIN ANALYZE comparison
    const explainKeyset = await db.query(
      `EXPLAIN (ANALYZE, BUFFERS)
       SELECT id, captured_at FROM memories
       WHERE space_id = $1 AND deleted_at IS NULL
         AND (captured_at, id) < ($2, $3)
       ORDER BY captured_at DESC, id DESC
       LIMIT 20`,
      [benchmarkSpaceId, page1.nextCursor!.cursorTime, page1.nextCursor!.cursorId]
    );

    const explainOffset = await db.query(
      `EXPLAIN (ANALYZE, BUFFERS)
       SELECT id, captured_at FROM memories
       WHERE space_id = $1 AND deleted_at IS NULL
       ORDER BY captured_at DESC
       OFFSET 800 LIMIT 20`,
      [benchmarkSpaceId]
    );

    console.log(`\n[Benchmark 1 Results]`);
    console.log(`- Keyset Page 1 Latency: ${keysetP1Time.toFixed(3)}ms`);
    console.log(`- Keyset Page 2 Latency: ${keysetP2Time.toFixed(3)}ms`);
    console.log(`- High Offset (OFFSET 800) Latency: ${offsetTime.toFixed(3)}ms`);
    console.log(`- Keyset Execution Plan:\n  ${explainKeyset.rows.map((r: any) => r["QUERY PLAN"]).join("\n  ")}`);
    console.log(`- High-Offset Execution Plan:\n  ${explainOffset.rows.map((r: any) => r["QUERY PLAN"]).join("\n  ")}`);
  });

  await t.test("Benchmark 2: Full-Text Search via GIN Index vs ILIKE Table Scan", async () => {
    // 1. GIN Full-Text Search
    const t0 = performance.now();
    const ftsResults = await memoryRepo.searchMemories(benchmarkSpaceId, "Graduation Ceremony");
    const ftsTime = performance.now() - t0;

    assert.ok(ftsResults.length > 0, "FTS must find matching memories");

    // 2. Unindexed ILIKE Sequential Scan
    const t1 = performance.now();
    const ilikeResults = await db.query(
      `SELECT id, title FROM memories
       WHERE space_id = $1 AND deleted_at IS NULL
         AND (title ILIKE '%Graduation Ceremony%' OR content ILIKE '%Graduation Ceremony%')
       LIMIT 20`,
      [benchmarkSpaceId]
    );
    const ilikeTime = performance.now() - t1;

    console.log(`\n[Benchmark 2 Results]`);
    console.log(`- GIN Full-Text Search Latency: ${ftsTime.toFixed(3)}ms (found ${ftsResults.length} matches)`);
    console.log(`- ILIKE Substring Scan Latency: ${ilikeTime.toFixed(3)}ms (found ${ilikeResults.rows.length} matches)`);
  });

  await t.test("Benchmark 3: Soft Deletion and Index Exemption", async () => {
    const memoryToDelete = (await memoryRepo.listMemoriesKeyset(benchmarkSpaceId, { limit: 1 })).items[0];

    const deleted = await memoryRepo.softDeleteMemory(memoryToDelete.id);
    assert.equal(deleted, true);

    const activeCheck = await memoryRepo.findMemoryById(memoryToDelete.id);
    assert.equal(activeCheck, null, "Soft-deleted memory must not appear in active lookup");

    const auditCheck = await memoryRepo.findMemoryById(memoryToDelete.id, true);
    assert.ok(auditCheck, "Soft-deleted memory must still exist in historical lookup");
  });

  await t.test("Benchmark 4: Transactional Outbox Pattern & Rollback Safety", async () => {
    // 1. Successful Transaction with Outbox Staging
    const memoryId = crypto.randomUUID();
    await db.transaction(async (client) => {
      await client.query(
        `INSERT INTO memories (id, space_id, author_id, title, format, captured_at)
         VALUES ($1, $2, $3, 'Outbox Test Memory', 'story', NOW())`,
        [memoryId, benchmarkSpaceId, authorId]
      );
      await outboxRepo.stageEvent(
        {
          eventType: "memory.created.v1",
          aggregateType: "memory",
          aggregateId: memoryId,
          payload: { title: "Outbox Test Memory" },
        },
        client
      );
    });

    const pendingEvents = await outboxRepo.fetchPending(10);
    const event = pendingEvents.find((e) => e.aggregateId === memoryId);
    assert.ok(event, "Outbox event must be staged upon transaction commit");

    // Mark as published
    await outboxRepo.markPublished(event.id);
    const afterPublish = await outboxRepo.fetchPending(10);
    assert.ok(!afterPublish.some((e) => e.id === event.id), "Published event must not appear in pending queue");

    // 2. Failed Transaction with Automatic Rollback
    const failingMemoryId = crypto.randomUUID();
    let caughtError = false;
    try {
      await db.transaction(async (client) => {
        await client.query(
          `INSERT INTO memories (id, space_id, author_id, title, format, captured_at)
           VALUES ($1, $2, $3, 'Failing Memory', 'story', NOW())`,
          [failingMemoryId, benchmarkSpaceId, authorId]
        );
        await outboxRepo.stageEvent(
          {
            eventType: "memory.created.v1",
            aggregateType: "memory",
            aggregateId: failingMemoryId,
            payload: { title: "Failing Memory" },
          },
          client
        );
        throw new Error("Simulated downstream business validation failure");
      });
    } catch {
      caughtError = true;
    }

    assert.equal(caughtError, true);
    const memoryRolledBack = await memoryRepo.findMemoryById(failingMemoryId);
    assert.equal(memoryRolledBack, null, "Rolled-back memory must not exist");

    const eventsAfterRollback = await outboxRepo.fetchPending(50);
    assert.ok(
      !eventsAfterRollback.some((e) => e.aggregateId === failingMemoryId),
      "Rolled-back outbox event must not exist"
    );
  });

  // Cleanup benchmark synthetic data
  await db.query(`DELETE FROM memory_spaces WHERE id = $1`, [benchmarkSpaceId]);
  await db.close();
  console.log(`\n--- Cleaned up benchmark synthetic records from database ---\n`);
});
