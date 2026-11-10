import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import {
  BaseServiceConfigSchema,
  validateServiceConfig,
} from "@memory-capsule/contracts";
import {
  createMemoryClient,
  createClientMetadata,
  grpc,
} from "@memory-capsule/proto";
import {
  createDatabaseClient,
  PostgresMemoryRepository,
} from "@memory-capsule/database";
import { createMemoryGrpcServer } from "../services/memory-service/src/grpc-server.js";
import { buildMemoryService } from "../services/memory-service/src/server.js";

function calculatePercentiles(latencies: number[]): { p50: number; p95: number; p99: number; avg: number } {
  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const p99 = latencies[Math.floor(latencies.length * 0.99)];
  const sum = latencies.reduce((acc, v) => acc + v, 0);
  return { p50, p95, p99, avg: sum / latencies.length };
}

test("Communication Performance Benchmark: Internal HTTP/REST vs gRPC/HTTP2", async (t) => {
  const cfg = validateServiceConfig(BaseServiceConfigSchema);
  const SERVICE_KEY = "test-internal-benchmark-key";
  process.env.INTERNAL_SERVICE_KEY = SERVICE_KEY;

  const memoryDbUrl = process.env.MEMORY_DATABASE_URL || process.env.DATABASE_URL;
  assert.ok(memoryDbUrl, "MEMORY_DATABASE_URL or DATABASE_URL must be configured");
  const dbMemory = createDatabaseClient(memoryDbUrl);
  const memoryRepo = new PostgresMemoryRepository(dbMemory);

  const testSpaceId = crypto.randomUUID();
  const ownerId = crypto.randomUUID();
  const testMemoryId = crypto.randomUUID();
  const restAuthToken = jwt.sign(
    { sub: ownerId, email: "benchmark@memoria.internal" },
    cfg.JWT_SECRET,
    { expiresIn: "1h" }
  );

  // Seed benchmark space & memory
  await dbMemory.query(
    `INSERT INTO memory_spaces (id, owner_id, name, description, space_type)
     VALUES ($1, $2, 'Benchmark Space', 'Benchmarking REST vs gRPC', 'family')`,
    [testSpaceId, ownerId]
  );

  await memoryRepo.createMemory({
    id: testMemoryId,
    spaceId: testSpaceId,
    authorId: ownerId,
    title: "Benchmark Autumn Sunset in the Bavarian Alps",
    content: "Golden light casting long silhouettes across the mountain ridgeline with fresh pine fragrance.",
    format: "image",
    capturedAt: new Date().toISOString(),
    location: "Garmisch-Partenkirchen, Germany",
    isFavorite: true,
    associatedProfileIds: [],
    mediaIds: [],
    tags: ["alps", "autumn", "sunset", "hiking"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // 1. Start gRPC Server on ephemeral port
  const grpcServer = createMemoryGrpcServer({
    memoryRepo,
    expectedServiceKey: SERVICE_KEY,
  });

  const grpcBoundPort: number = await new Promise((resolve, reject) => {
    grpcServer.bindAsync("127.0.0.1:0", grpc.ServerCredentials.createInsecure(), (err, port) => {
      if (err) return reject(err);
      resolve(port);
    });
  });

  const grpcClient = createMemoryClient(`127.0.0.1:${grpcBoundPort}`);

  // 2. Start Fastify REST Memory Service instance
  const restApp = await buildMemoryService();

  const ITERATIONS = 300;
  console.log(`\n--- Starting Benchmark: ${ITERATIONS} Iterations of Memory Fetch ---`);

  await t.test("Benchmark: Internal Fastify REST vs Internal gRPC over HTTP/2", async () => {
    const meta = createClientMetadata({ serviceToken: SERVICE_KEY, correlationId: "bench-corr" });

    // --- Warmup ---
    for (let i = 0; i < 20; i++) {
      await restApp.inject({
        method: "GET",
        url: `/api/v1/memories/${testMemoryId}`,
        headers: { authorization: `Bearer ${restAuthToken}` },
      });
      await new Promise((resolve) => {
        grpcClient.getMemory({ memory_id: testMemoryId, space_id: testSpaceId }, meta, resolve);
      });
    }

    // --- Benchmark REST ---
    const restLatencies: number[] = [];
    const restStart = performance.now();
    for (let i = 0; i < ITERATIONS; i++) {
      const t0 = performance.now();
      const res = await restApp.inject({
        method: "GET",
        url: `/api/v1/memories/${testMemoryId}`,
        headers: { authorization: `Bearer ${restAuthToken}` },
      });
      assert.equal(res.statusCode, 200);
      restLatencies.push(performance.now() - t0);
    }
    const restTotalTime = performance.now() - restStart;
    const restStats = calculatePercentiles(restLatencies);
    const restThroughput = (ITERATIONS / (restTotalTime / 1000)).toFixed(0);

    // --- Benchmark gRPC ---
    const grpcLatencies: number[] = [];
    const grpcStart = performance.now();
    for (let i = 0; i < ITERATIONS; i++) {
      const t0 = performance.now();
      const res: any = await new Promise((resolve, reject) => {
        grpcClient.getMemory(
          { memory_id: testMemoryId, space_id: testSpaceId },
          meta,
          (err: any, response: any) => {
            if (err) return reject(err);
            resolve(response);
          }
        );
      });
      assert.equal(res.found, true);
      grpcLatencies.push(performance.now() - t0);
    }
    const grpcTotalTime = performance.now() - grpcStart;
    const grpcStats = calculatePercentiles(grpcLatencies);
    const grpcThroughput = (ITERATIONS / (grpcTotalTime / 1000)).toFixed(0);

    console.log(`\n======================================================`);
    console.log(`BENCHMARK RESULTS (${ITERATIONS} Sequential Calls)`);
    console.log(`======================================================`);
    console.log(`[REST (HTTP/1.1 JSON)]`);
    console.log(`  Total Duration : ${restTotalTime.toFixed(2)} ms`);
    console.log(`  Throughput     : ${restThroughput} ops/sec`);
    console.log(`  Average Latency: ${restStats.avg.toFixed(3)} ms`);
    console.log(`  p50 (Median)   : ${restStats.p50.toFixed(3)} ms`);
    console.log(`  p95            : ${restStats.p95.toFixed(3)} ms`);
    console.log(`  p99            : ${restStats.p99.toFixed(3)} ms`);
    console.log(`------------------------------------------------------`);
    console.log(`[gRPC (HTTP/2 Protocol Buffers)]`);
    console.log(`  Total Duration : ${grpcTotalTime.toFixed(2)} ms`);
    console.log(`  Throughput     : ${grpcThroughput} ops/sec`);
    console.log(`  Average Latency: ${grpcStats.avg.toFixed(3)} ms`);
    console.log(`  p50 (Median)   : ${grpcStats.p50.toFixed(3)} ms`);
    console.log(`  p95            : ${grpcStats.p95.toFixed(3)} ms`);
    console.log(`  p99            : ${grpcStats.p99.toFixed(3)} ms`);
    console.log(`======================================================\n`);
  });

  // Teardown
  grpcClient.close();
  grpcServer.forceShutdown();
  await restApp.close();

  // Cleanup DB
  await dbMemory.query(`DELETE FROM memory_spaces WHERE id = $1`, [testSpaceId]);
  await dbMemory.close();
});

