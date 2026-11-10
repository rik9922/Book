import { test, describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import {
  BaseServiceConfigSchema,
  validateServiceConfig,
  RegisterRequestSchema,
  CreateUploadSessionRequestSchema,
  createDomainEvent,
} from "@memory-capsule/contracts";
import { createEventBus } from "@memory-capsule/events";
import { createDatabaseClient, PostgresSpaceRepository } from "@memory-capsule/database";
import { buildIdentityService } from "../services/identity-service/src/server.ts";
import { buildMemoryService } from "../services/memory-service/src/server.ts";
import { buildMediaService } from "../services/media-service/src/server.ts";
import { buildBookService } from "../services/book-service/src/server.ts";

describe("Stage 1 — Engineering Foundation Verification Suite", () => {
  const cfg = validateServiceConfig(BaseServiceConfigSchema);
  const signToken = (userId: string, email = "foundation-test@memoria.internal") =>
    jwt.sign({ sub: userId, email }, cfg.JWT_SECRET, { expiresIn: "1h" });

  test("1. Contracts & Schema Validation", () => {
    const reg = RegisterRequestSchema.parse({
      email: "elena@example.com",
      password: "SuperSecretPassword123!",
      fullName: "Elena Rostova",
    });
    assert.equal(reg.email, "elena@example.com");

    assert.throws(() => {
      CreateUploadSessionRequestSchema.parse({
        spaceId: "12345678-1234-4234-8234-123456789012",
        fileName: "photo.jpg",
        mimeType: "image/jpeg",
        fileSizeBytes: -50,
      });
    });

    const event = createDomainEvent("test.event", "test-producer", { value: 42 });
    assert.equal(event.producer, "test-producer");
    assert.equal(event.eventType, "test.event");
    assert.equal(event.data.value, 42);
  });

  test("2. Event Bus Publish & Subscribe Lifecycle", async () => {
    const bus = await createEventBus();
    let received = false;

    await bus.subscribe("test.lifecycle", async (event) => {
      assert.equal(event.data.msg, "capsule-init");
      received = true;
    });

    await bus.publish(
      "test.lifecycle",
      createDomainEvent("test.lifecycle", "test-service", { msg: "capsule-init" })
    );

    assert.equal(received, true);
    await bus.close();
  });

  test("3. Identity Service Registration, Auth Lifecycle & Refresh Rotation", async () => {
    const app = await buildIdentityService();

    const testEmail = `sarah_${Date.now()}@familycapsule.com`;

    // Register
    const regRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: testEmail,
        password: "FamilyPassword99!",
        fullName: "Sarah Jenkins",
      },
    });

    assert.equal(regRes.statusCode, 201);
    const regBody = JSON.parse(regRes.body);
    assert.equal(regBody.success, true);
    assert.equal(regBody.data.user.email, testEmail);
    assert.ok(regBody.data.accessToken);
    assert.ok(regBody.data.refreshToken);

    // Duplicate rejection
    const dupRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: testEmail,
        password: "AnotherPassword123!",
        fullName: "Duplicate Sarah",
      },
    });
    assert.equal(dupRes.statusCode, 409);

    // Login
    const loginRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: testEmail,
        password: "FamilyPassword99!",
      },
    });
    assert.equal(loginRes.statusCode, 200);
    const loginBody = JSON.parse(loginRes.body);
    assert.ok(loginBody.data.accessToken);
    assert.ok(loginBody.data.refreshToken);

    // Refresh Token Rotation
    const refreshRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      payload: { refreshToken: loginBody.data.refreshToken },
    });
    assert.equal(refreshRes.statusCode, 200);
    const refreshBody = JSON.parse(refreshRes.body);
    assert.ok(refreshBody.data.accessToken);
    assert.notEqual(refreshBody.data.refreshToken, loginBody.data.refreshToken);

    // Old refresh token is now revoked
    const replayRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      payload: { refreshToken: loginBody.data.refreshToken },
    });
    assert.equal(replayRes.statusCode, 401);

    // Logout revokes active refresh token
    const logoutRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      payload: { refreshToken: refreshBody.data.refreshToken },
    });
    assert.equal(logoutRes.statusCode, 200);

    const postLogoutRefresh = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      payload: { refreshToken: refreshBody.data.refreshToken },
    });
    assert.equal(postLogoutRefresh.statusCode, 401);

    await app.close();
  });

  test("4. Memory Service Spaces, Profiles & Memory Persistence (Authenticated)", async () => {
    const app = await buildMemoryService();
    const userId = crypto.randomUUID();
    const token = signToken(userId);

    // Unauthenticated request must fail with 401
    const unauthRes = await app.inject({
      method: "POST",
      url: "/api/v1/spaces",
      payload: { name: "Unauthorized Space", type: "family" },
    });
    assert.equal(unauthRes.statusCode, 401);

    // Create space
    const spaceRes = await app.inject({
      method: "POST",
      url: "/api/v1/spaces",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: "Jenkins Family Heritage",
        description: "Three generations of memories",
        type: "family",
      },
    });
    assert.equal(spaceRes.statusCode, 201);
    const space = JSON.parse(spaceRes.body).data;
    assert.equal(space.name, "Jenkins Family Heritage");

    // Create child profile
    const profileRes = await app.inject({
      method: "POST",
      url: `/api/v1/spaces/${space.id}/profiles`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: "Liam Jenkins",
        relationship: "Son",
        type: "child",
        birthDate: "2020-04-12",
      },
    });
    assert.equal(profileRes.statusCode, 201);
    const profile = JSON.parse(profileRes.body).data;
    assert.equal(profile.name, "Liam Jenkins");

    // Create Memory
    const memoryRes = await app.inject({
      method: "POST",
      url: "/api/v1/memories",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        spaceId: space.id,
        title: "Liam's First Day of School",
        content: "A bright autumn morning walking down Elm Street.",
        format: "image",
        capturedAt: "2025-09-01T08:30:00Z",
        associatedProfileIds: [profile.id],
        tags: ["milestone", "school"],
      },
    });
    assert.equal(memoryRes.statusCode, 201);
    const memory = JSON.parse(memoryRes.body).data;
    assert.equal(memory.title, "Liam's First Day of School");

    // List memories timeline
    const listRes = await app.inject({
      method: "GET",
      url: `/api/v1/memories?spaceId=${space.id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(listRes.statusCode, 200);
    const list = JSON.parse(listRes.body).data;
    assert.equal(list.length, 1);
    assert.equal(list[0].id, memory.id);

    // Cross-user access must return 403
    const otherUserToken = signToken(crypto.randomUUID(), "other@memoria.internal");
    const forbiddenRes = await app.inject({
      method: "GET",
      url: `/api/v1/memories?spaceId=${space.id}`,
      headers: { authorization: `Bearer ${otherUserToken}` },
    });
    assert.equal(forbiddenRes.statusCode, 403);

    await app.close();
  });

  test("5. Media Service Signed Upload Session, Streaming Upload, Range & Confirmation", async () => {
    const app = await buildMediaService();
    const userId = crypto.randomUUID();
    const token = signToken(userId);
    const testSpaceId = crypto.randomUUID();
    const memoryDbUrl = process.env.MEMORY_DATABASE_URL || process.env.DATABASE_URL;
    if (memoryDbUrl) {
      const memDb = createDatabaseClient(memoryDbUrl);
      const spaceRepo = new PostgresSpaceRepository(memDb);
      await spaceRepo.createSpace({
        id: testSpaceId,
        ownerId: userId,
        name: "Foundation Media Space",
        type: "family",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await memDb.close();
    }
    const samplePayload = Buffer.from("MEMORIA-JPEG-BINARY-SAMPLE-PAYLOAD-2026");

    // Create upload session
    const sessionRes = await app.inject({
      method: "POST",
      url: "/api/v1/media/upload-session",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        spaceId: testSpaceId,
        fileName: "first-steps.jpg",
        mimeType: "image/jpeg",
        fileSizeBytes: samplePayload.length,
      },
    });
    assert.equal(sessionRes.statusCode, 201);
    const session = JSON.parse(sessionRes.body).data;
    assert.ok(session.uploadUrl);
    assert.ok(session.uploadUrl.includes("sig="));
    assert.ok(session.mediaId);

    // Unsigned upload must be rejected with 401
    const unsignedUpload = await app.inject({
      method: "PUT",
      url: `/api/v1/media/local-upload?key=${encodeURIComponent(session.storageKey)}`,
      headers: { "content-type": "image/jpeg" },
      payload: samplePayload,
    });
    assert.equal(unsignedUpload.statusCode, 401);

    // Signed streaming upload succeeds
    const signedUrl = new URL(session.uploadUrl);
    const uploadRes = await app.inject({
      method: "PUT",
      url: signedUrl.pathname + signedUrl.search,
      headers: { "content-type": "image/jpeg" },
      payload: samplePayload,
    });
    assert.equal(uploadRes.statusCode, 200);

    // Confirm upload completed
    const completeRes = await app.inject({
      method: "POST",
      url: `/api/v1/media/${session.mediaId}/complete`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(completeRes.statusCode, 200);
    const completedAsset = JSON.parse(completeRes.body).data;
    assert.equal(completedAsset.status, "processing");

    // HTTP 206 Partial Content Range support
    const rangeRes = await app.inject({
      method: "GET",
      url: `/api/v1/media/files/${session.storageKey}`,
      headers: {
        authorization: `Bearer ${token}`,
        range: "bytes=0-6",
      },
    });
    assert.equal(rangeRes.statusCode, 206);
    assert.equal(rangeRes.body, "MEMORIA");

    // Zero-Budget Quota verification
    const quotaRes = await app.inject({
      method: "GET",
      url: `/api/v1/media/spaces/${testSpaceId}/quota`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(quotaRes.statusCode, 200);
    const quotaData = JSON.parse(quotaRes.body).data;
    assert.equal(quotaData.usedBytes, samplePayload.length);
    assert.equal(quotaData.isQuotaExceeded, false);

    // Over-limit file rejection (exceeding 50MB zero-cost threshold)
    const overLimitRes = await app.inject({
      method: "POST",
      url: "/api/v1/media/upload-session",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        spaceId: testSpaceId,
        fileName: "giant-video.mp4",
        mimeType: "video/mp4",
        fileSizeBytes: 60 * 1024 * 1024,
      },
    });
    assert.equal(overLimitRes.statusCode, 413);

    // Disallowed MIME type rejection
    const badMimeRes = await app.inject({
      method: "POST",
      url: "/api/v1/media/upload-session",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        spaceId: testSpaceId,
        fileName: "script.exe",
        mimeType: "application/x-msdownload",
        fileSizeBytes: 1024,
      },
    });
    assert.equal(badMimeRes.statusCode, 415);

    await app.close();
  });

  test("6. Book Service Creation, Spread Editing & Digital Edition Freeze", async () => {
    const app = await buildBookService();
    const userId = crypto.randomUUID();
    const token = signToken(userId);
    const testSpaceId = crypto.randomUUID();
    const memoryDbUrl = process.env.MEMORY_DATABASE_URL || process.env.DATABASE_URL;
    if (memoryDbUrl) {
      const memDb = createDatabaseClient(memoryDbUrl);
      const spaceRepo = new PostgresSpaceRepository(memDb);
      await spaceRepo.createSpace({
        id: testSpaceId,
        ownerId: userId,
        name: "Foundation Book Space",
        type: "family",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await memDb.close();
    }

    // Create Book
    const bookRes = await app.inject({
      method: "POST",
      url: "/api/v1/books",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        spaceId: testSpaceId,
        title: "The Jenkins Chronicle: Volume I",
        subtitle: "2020-2025",
        format: "hardcover_standard_8x10",
        coverColor: "#304C43",
        foilStamping: "gold",
      },
    });
    assert.equal(bookRes.statusCode, 201);
    const book = JSON.parse(bookRes.body).data;
    assert.equal(book.title, "The Jenkins Chronicle: Volume I");
    assert.equal(book.isFrozenForPrint, false);

    // Update Book customization (PATCH)
    const patchRes = await app.inject({
      method: "PATCH",
      url: `/api/v1/books/${book.id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { coverColor: "#76556F", foilStamping: "rose" },
    });
    assert.equal(patchRes.statusCode, 200);
    const patched = JSON.parse(patchRes.body).data;
    assert.equal(patched.coverColor, "#76556F");

    // Save Spread (PUT)
    const spreadId = crypto.randomUUID();
    const spreadRes = await app.inject({
      method: "PUT",
      url: `/api/v1/books/${book.id}/spreads/${spreadId}`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        spreadIndex: 1,
        leftPage: {
          id: crypto.randomUUID(),
          pageNumber: 2,
          layoutType: "photo_with_story",
          backgroundColor: "#F7F4ED",
          elements: [],
        },
        rightPage: null,
      },
    });
    assert.equal(spreadRes.statusCode, 200);

    // Freeze for print
    const freezeRes = await app.inject({
      method: "POST",
      url: `/api/v1/books/${book.id}/freeze`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(freezeRes.statusCode, 200);
    const frozenBook = JSON.parse(freezeRes.body).data;
    assert.equal(frozenBook.isFrozenForPrint, true);
    assert.ok(frozenBook.frozenEditionHash);

    // Frozen book rejects further edits
    const frozenPatchRes = await app.inject({
      method: "PATCH",
      url: `/api/v1/books/${book.id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { title: "Mutated After Freeze" },
    });
    assert.equal(frozenPatchRes.statusCode, 409);

    await app.close();
  });
});
