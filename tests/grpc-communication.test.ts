import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import {
  createIdentityClient,
  createMemoryClient,
  createClientMetadata,
  createDeadline,
  grpc,
} from "@memory-capsule/proto";
import {
  createDatabaseClient,
  PostgresUserRepository,
  PostgresMemoryRepository,
  PostgresSpaceRepository,
} from "@memory-capsule/database";
import { createIdentityGrpcServer } from "../services/identity-service/src/grpc-server.js";
import { createMemoryGrpcServer } from "../services/memory-service/src/grpc-server.js";
import { buildGateway } from "../services/api-gateway/src/server.js";

test("Hybrid Microservice Communication Suite: REST + gRPC + JetStream", async (t) => {
  const JWT_SECRET = "test-jwt-secret-communication-2026";
  const SERVICE_KEY = "test-internal-service-secret-key";

  const dbIdentity = createDatabaseClient(process.env.IDENTITY_DATABASE_URL || "postgres://ritik@localhost:5432/identity_db");
  const dbMemory = createDatabaseClient(process.env.MEMORY_DATABASE_URL || "postgres://ritik@localhost:5432/memory_db");

  const userRepo = new PostgresUserRepository(dbIdentity);
  const memoryRepo = new PostgresMemoryRepository(dbMemory);
  const spaceRepo = new PostgresSpaceRepository(dbMemory);

  const IDENTITY_PORT = 50151;
  const MEMORY_PORT = 50152;

  // 1. Initialize and start gRPC Servers
  const identityGrpcServer = createIdentityGrpcServer({
    userRepo,
    jwtSecret: JWT_SECRET,
    expectedServiceKey: SERVICE_KEY,
  });

  const memoryGrpcServer = createMemoryGrpcServer({
    memoryRepo,
    expectedServiceKey: SERVICE_KEY,
  });

  const identityBoundPort: number = await new Promise((resolve, reject) => {
    identityGrpcServer.bindAsync(`127.0.0.1:0`, grpc.ServerCredentials.createInsecure(), (err, port) => {
      if (err) return reject(err);
      resolve(port);
    });
  });

  const memoryBoundPort: number = await new Promise((resolve, reject) => {
    memoryGrpcServer.bindAsync(`127.0.0.1:0`, grpc.ServerCredentials.createInsecure(), (err, port) => {
      if (err) return reject(err);
      resolve(port);
    });
  });

  const identityClient = createIdentityClient(`127.0.0.1:${identityBoundPort}`);
  const memoryClient = createMemoryClient(`127.0.0.1:${memoryBoundPort}`);

  // Test Entities
  const testUserId = crypto.randomUUID();
  const testEmail = `grpc-user-${Date.now()}@capsule.test`;
  const testSpaceId = crypto.randomUUID();

  // Seed user & space in PostgreSQL
  await userRepo.create({
    id: testUserId,
    email: testEmail,
    fullName: "Elena Rostova",
    passwordHash: "dummy:hash",
    avatarUrl: "https://capsule.local/avatars/elena.jpg",
    isVerified: true,
  });

  await spaceRepo.createSpace({
    id: testSpaceId,
    ownerId: testUserId,
    name: "Elena's Life Story",
    type: "family",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const validJwtToken = jwt.sign(
    { sub: testUserId, userId: testUserId, email: testEmail },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  await t.test("1. Identity gRPC: ValidateSession with Valid Token", async () => {
    const meta = createClientMetadata({ serviceToken: SERVICE_KEY, correlationId: "test-corr-1" });
    const response: any = await new Promise((resolve, reject) => {
      identityClient.validateSession({ token: validJwtToken }, meta, (err: any, res: any) => {
        if (err) return reject(err);
        resolve(res);
      });
    });

    assert.equal(response.is_valid, true);
    assert.equal(response.user_id, testUserId);
    assert.equal(response.email, testEmail);
    assert.equal(response.full_name, "Elena Rostova");
    assert.equal(response.is_verified, true);
  });

  await t.test("2. Identity gRPC: Rejection on Missing or Invalid Internal Service Key", async () => {
    const invalidMeta = createClientMetadata({ serviceToken: "unauthorized-rogue-key" });
    let caughtError: any = null;

    try {
      await new Promise((resolve, reject) => {
        identityClient.validateSession({ token: validJwtToken }, invalidMeta, (err: any, res: any) => {
          if (err) return reject(err);
          resolve(res);
        });
      });
    } catch (err: any) {
      caughtError = err;
    }

    assert.ok(caughtError, "Must reject call without valid internal service auth key");
    assert.equal(caughtError.code, grpc.status.UNAUTHENTICATED);
  });

  const memoryId = crypto.randomUUID();
  await t.test("3. Memory gRPC: Create, Get, and List Memories over HTTP/2", async () => {
    const meta = createClientMetadata({ serviceToken: SERVICE_KEY, correlationId: "test-corr-3" });

    // A. Create Memory via gRPC
    const createRes: any = await new Promise((resolve, reject) => {
      memoryClient.createMemory(
        {
          id: memoryId,
          space_id: testSpaceId,
          author_id: testUserId,
          title: "Walking along Lake Geneva",
          content: "A serene afternoon watching sailboats gliding across the pristine water.",
          format: "image",
          captured_at: new Date().toISOString(),
          location: "Geneva, Switzerland",
          is_favorite: true,
          tags: ["travel", "switzerland", "peace"],
          associated_profile_ids: [],
          media_ids: [],
        },
        meta,
        (err: any, res: any) => {
          if (err) return reject(err);
          resolve(res);
        }
      );
    });

    assert.equal(createRes.success, true);
    assert.equal(createRes.memory.title, "Walking along Lake Geneva");

    // B. Get Memory via gRPC
    const getRes: any = await new Promise((resolve, reject) => {
      memoryClient.getMemory({ memory_id: memoryId, space_id: testSpaceId }, meta, (err: any, res: any) => {
        if (err) return reject(err);
        resolve(res);
      });
    });

    assert.equal(getRes.found, true);
    assert.equal(getRes.memory.id, memoryId);
    assert.equal(getRes.memory.location, "Geneva, Switzerland");

    // C. List Memories with Keyset Pagination via gRPC
    const listRes: any = await new Promise((resolve, reject) => {
      memoryClient.listMemoriesKeyset(
        { space_id: testSpaceId, limit: 10 },
        meta,
        (err: any, res: any) => {
          if (err) return reject(err);
          resolve(res);
        }
      );
    });

    assert.equal(listRes.items.length, 1);
    assert.equal(listRes.items[0].id, memoryId);
  });

  await t.test("4. Hybrid Gateway: Translating Public REST Requests to Internal gRPC", async () => {
    process.env.INTERNAL_SERVICE_KEY = SERVICE_KEY;
    const gateway = buildGateway({
      identityGrpcAddress: `127.0.0.1:${identityBoundPort}`,
      memoryGrpcAddress: `127.0.0.1:${memoryBoundPort}`,
      enableGrpcRouting: true,
    });

    // A. REST GET /api/v1/auth/me (Gateway -> Identity gRPC ValidateSession)
    const authMeRes = await gateway.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: {
        authorization: `Bearer ${validJwtToken}`,
      },
    });

    assert.equal(authMeRes.statusCode, 200);
    const authMeBody = JSON.parse(authMeRes.body);
    assert.equal(authMeBody.success, true);
    assert.equal(authMeBody.data.user.id, testUserId);
    assert.equal(authMeBody.data.user.fullName, "Elena Rostova");

    // B. REST GET /api/v1/memories/:memoryId (Gateway -> Memory gRPC GetMemory)
    const getMemRes = await gateway.inject({
      method: "GET",
      url: `/api/v1/memories/${memoryId}`,
    });

    assert.equal(getMemRes.statusCode, 200);
    const getMemBody = JSON.parse(getMemRes.body);
    assert.equal(getMemBody.success, true);
    assert.equal(getMemBody.data.id, memoryId);
    assert.equal(getMemBody.data.title, "Walking along Lake Geneva");

    // C. REST GET /api/v1/spaces/:spaceId/memories (Gateway -> Memory gRPC ListMemoriesKeyset)
    const listMemRes = await gateway.inject({
      method: "GET",
      url: `/api/v1/spaces/${testSpaceId}/memories?limit=10`,
    });

    assert.equal(listMemRes.statusCode, 200);
    const listMemBody = JSON.parse(listMemRes.body);
    assert.equal(listMemBody.success, true);
    assert.equal(listMemBody.data.items.length, 1);
    assert.equal(listMemBody.data.items[0].id, memoryId);

    // D. REST Invalid Token Rejection
    const invalidTokenRes = await gateway.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: {
        authorization: "Bearer invalid.fake.token",
      },
    });
    assert.equal(invalidTokenRes.statusCode, 401);

    await gateway.close();
  });

  // Teardown
  identityClient.close();
  memoryClient.close();
  identityGrpcServer.forceShutdown();
  memoryGrpcServer.forceShutdown();

  // Cleanup DB records
  await dbMemory.query(`DELETE FROM memory_spaces WHERE id = $1`, [testSpaceId]);
  await dbIdentity.query(`DELETE FROM users WHERE id = $1`, [testUserId]);
  await dbMemory.close();
  await dbIdentity.close();
});
