import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import {
  BaseServiceConfigSchema,
  validateServiceConfig,
} from "@memory-capsule/contracts";
import {
  createIdentityClient,
  createMemoryClient,
  createClientMetadata,
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
  const cfg = validateServiceConfig(BaseServiceConfigSchema);
  const JWT_SECRET = cfg.JWT_SECRET;
  const SERVICE_KEY = "test-internal-service-secret-key";

  const identityDbUrl = process.env.IDENTITY_DATABASE_URL || process.env.DATABASE_URL;
  const memoryDbUrl = process.env.MEMORY_DATABASE_URL || process.env.DATABASE_URL;
  assert.ok(identityDbUrl && memoryDbUrl, "IDENTITY_DATABASE_URL and MEMORY_DATABASE_URL must be set");

  const dbIdentity = createDatabaseClient(identityDbUrl);
  const dbMemory = createDatabaseClient(memoryDbUrl);

  const userRepo = new PostgresUserRepository(dbIdentity);
  const memoryRepo = new PostgresMemoryRepository(dbMemory);
  const spaceRepo = new PostgresSpaceRepository(dbMemory);

  const identityGrpcServer = createIdentityGrpcServer({
    userRepo,
    spaceRepo,
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

  const testUserId = crypto.randomUUID();
  const otherUserId = crypto.randomUUID();
  const testEmail = `grpc-user-${Date.now()}@capsule.test`;
  const otherEmail = `grpc-other-${Date.now()}@capsule.test`;
  const testSpaceId = crypto.randomUUID();

  await userRepo.create({
    id: testUserId,
    email: testEmail,
    fullName: "Elena Rostova",
    passwordHash: "dummy:hash",
    avatarUrl: "https://capsule.local/avatars/elena.jpg",
    isVerified: true,
  });

  await userRepo.create({
    id: otherUserId,
    email: otherEmail,
    fullName: "Outsider User",
    passwordHash: "dummy:hash",
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

  // Note: REST signs { sub: userId } without userId field; gRPC ValidateSession must handle { sub }
  const validJwtToken = jwt.sign(
    { sub: testUserId, email: testEmail },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
  const outsiderJwtToken = jwt.sign(
    { sub: otherUserId, email: otherEmail },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  await t.test("1. Identity gRPC: ValidateSession with { sub } JWT & CheckMembership", async () => {
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

    // Owner membership passes
    const ownerMem: any = await new Promise((resolve, reject) => {
      identityClient.checkMembership(
        { user_id: testUserId, space_id: testSpaceId, required_role: "viewer" },
        meta,
        (err: any, res: any) => {
          if (err) return reject(err);
          resolve(res);
        }
      );
    });
    assert.equal(ownerMem.is_member, true);
    assert.equal(ownerMem.role, "owner");

    // Non-member fails checkMembership (not stubbed)
    const outsiderMem: any = await new Promise((resolve, reject) => {
      identityClient.checkMembership(
        { user_id: otherUserId, space_id: testSpaceId, required_role: "viewer" },
        meta,
        (err: any, res: any) => {
          if (err) return reject(err);
          resolve(res);
        }
      );
    });
    assert.equal(outsiderMem.is_member, false);
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

    const getRes: any = await new Promise((resolve, reject) => {
      memoryClient.getMemory({ memory_id: memoryId, space_id: testSpaceId }, meta, (err: any, res: any) => {
        if (err) return reject(err);
        resolve(res);
      });
    });

    assert.equal(getRes.found, true);
    assert.equal(getRes.memory.id, memoryId);
    assert.equal(getRes.memory.location, "Geneva, Switzerland");

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

  await t.test("4. Hybrid Gateway: Authenticated & RBAC-Protected REST -> Internal gRPC", async () => {
    const prevServiceKey = process.env.INTERNAL_SERVICE_KEY;
    process.env.INTERNAL_SERVICE_KEY = SERVICE_KEY;
    const gateway = buildGateway({
      identityGrpcAddress: `127.0.0.1:${identityBoundPort}`,
      memoryGrpcAddress: `127.0.0.1:${memoryBoundPort}`,
      enableGrpcRouting: true,
    });

    try {
      // A. REST GET /api/v1/auth/me
      const authMeRes = await gateway.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        headers: { authorization: `Bearer ${validJwtToken}` },
      });

      assert.equal(authMeRes.statusCode, 200);
      const authMeBody = JSON.parse(authMeRes.body);
      assert.equal(authMeBody.success, true);
      assert.equal(authMeBody.data.user.id, testUserId);
      assert.equal(authMeBody.data.user.fullName, "Elena Rostova");

      // B. Unauthenticated Memory Lookup Rejected (401)
      const unauthMemRes = await gateway.inject({
        method: "GET",
        url: `/api/v1/memories/${memoryId}`,
      });
      assert.equal(unauthMemRes.statusCode, 401);

      // C. Outsider Memory Lookup Rejected (403)
      const forbiddenMemRes = await gateway.inject({
        method: "GET",
        url: `/api/v1/memories/${memoryId}`,
        headers: { authorization: `Bearer ${outsiderJwtToken}` },
      });
      assert.equal(forbiddenMemRes.statusCode, 403);

      // D. Authenticated Owner REST GET /api/v1/memories/:memoryId
      const getMemRes = await gateway.inject({
        method: "GET",
        url: `/api/v1/memories/${memoryId}`,
        headers: { authorization: `Bearer ${validJwtToken}` },
      });

      assert.equal(getMemRes.statusCode, 200);
      const getMemBody = JSON.parse(getMemRes.body);
      assert.equal(getMemBody.success, true);
      assert.equal(getMemBody.data.id, memoryId);
      assert.equal(getMemBody.data.title, "Walking along Lake Geneva");

      // E. Authenticated Owner REST GET /api/v1/spaces/:spaceId/memories
      const listMemRes = await gateway.inject({
        method: "GET",
        url: `/api/v1/spaces/${testSpaceId}/memories?limit=10`,
        headers: { authorization: `Bearer ${validJwtToken}` },
      });

      assert.equal(listMemRes.statusCode, 200);
      const listMemBody = JSON.parse(listMemRes.body);
      assert.equal(listMemBody.success, true);
      assert.equal(listMemBody.data.items.length, 1);
      assert.equal(listMemBody.data.items[0].id, memoryId);

      // F. REST Invalid Token Rejection
      const invalidTokenRes = await gateway.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        headers: { authorization: "Bearer invalid.fake.token" },
      });
      assert.equal(invalidTokenRes.statusCode, 401);
    } finally {
      await gateway.close();
      if (prevServiceKey !== undefined) {
        process.env.INTERNAL_SERVICE_KEY = prevServiceKey;
      } else {
        delete process.env.INTERNAL_SERVICE_KEY;
      }
    }
  });

  // Teardown
  identityClient.close();
  memoryClient.close();
  identityGrpcServer.forceShutdown();
  memoryGrpcServer.forceShutdown();

  await dbMemory.query(`DELETE FROM memory_spaces WHERE id = $1`, [testSpaceId]);
  await dbIdentity.query(`DELETE FROM users WHERE id IN ($1, $2)`, [testUserId, otherUserId]);
  await dbMemory.close();
  await dbIdentity.close();
});
