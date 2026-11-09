import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  RegisterRequestSchema,
  MemorySpaceSchema,
  CreateUploadSessionRequestSchema,
  BookDocumentSchema,
  createDomainEvent,
} from "@memory-capsule/contracts";
import { createEventBus } from "@memory-capsule/events";
import { buildIdentityService } from "../services/identity-service/src/server.ts";
import { buildMemoryService } from "../services/memory-service/src/server.ts";
import { buildMediaService } from "../services/media-service/src/server.ts";
import { buildBookService } from "../services/book-service/src/server.ts";

describe("Stage 1 — Engineering Foundation Verification Suite", () => {
  test("1. Contracts & Schema Validation", () => {
    // Valid registration
    const reg = RegisterRequestSchema.parse({
      email: "elena@example.com",
      password: "SuperSecretPassword123!",
      fullName: "Elena Rostova",
    });
    assert.equal(reg.email, "elena@example.com");

    // Invalid upload session (negative size)
    assert.throws(() => {
      CreateUploadSessionRequestSchema.parse({
        spaceId: "12345678-1234-4234-8234-123456789012",
        fileName: "photo.jpg",
        mimeType: "image/jpeg",
        fileSizeBytes: -50,
      });
    });

    // Domain event creation
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

  test("3. Identity Service Registration & Auth Flow", async () => {
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

    await app.close();
  });

  test("4. Memory Service Spaces, Profiles & Memory Persistence", async () => {
    const app = await buildMemoryService();

    // Create space
    const spaceRes = await app.inject({
      method: "POST",
      url: "/api/v1/spaces",
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
    });
    assert.equal(listRes.statusCode, 200);
    const list = JSON.parse(listRes.body).data;
    assert.equal(list.length, 1);
    assert.equal(list[0].id, memory.id);

    await app.close();
  });

  test("5. Media Service Upload Session & Confirmation", async () => {
    const app = await buildMediaService();

    const testSpaceId = crypto.randomUUID();

    // Create upload session
    const sessionRes = await app.inject({
      method: "POST",
      url: "/api/v1/media/upload-session",
      payload: {
        spaceId: testSpaceId,
        fileName: "first-steps.jpg",
        mimeType: "image/jpeg",
        fileSizeBytes: 4500000,
      },
    });
    assert.equal(sessionRes.statusCode, 201);
    const session = JSON.parse(sessionRes.body).data;
    assert.ok(session.uploadUrl);
    assert.ok(session.mediaId);

    // Confirm upload completed
    const completeRes = await app.inject({
      method: "POST",
      url: `/api/v1/media/${session.mediaId}/complete`,
    });
    assert.equal(completeRes.statusCode, 200);
    const completedAsset = JSON.parse(completeRes.body).data;
    assert.equal(completedAsset.status, "processing");

    // Zero-Budget Quota verification
    const quotaRes = await app.inject({
      method: "GET",
      url: `/api/v1/media/spaces/${testSpaceId}/quota`,
    });
    assert.equal(quotaRes.statusCode, 200);
    const quotaData = JSON.parse(quotaRes.body).data;
    assert.equal(quotaData.usedBytes, 4500000);
    assert.equal(quotaData.isQuotaExceeded, false);

    // Over-limit file rejection (exceeding 50MB zero-cost threshold)
    const overLimitRes = await app.inject({
      method: "POST",
      url: "/api/v1/media/upload-session",
      payload: {
        spaceId: testSpaceId,
        fileName: "giant-video.raw",
        mimeType: "video/raw",
        fileSizeBytes: 60 * 1024 * 1024,
      },
    });
    assert.equal(overLimitRes.statusCode, 413);

    await app.close();
  });

  test("6. Book Service Creation & Digital Edition Freeze", async () => {
    const app = await buildBookService();

    // Create Book
    const bookRes = await app.inject({
      method: "POST",
      url: "/api/v1/books",
      payload: {
        spaceId: "12345678-1234-4234-8234-123456789012",
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

    // Freeze for print
    const freezeRes = await app.inject({
      method: "POST",
      url: `/api/v1/books/${book.id}/freeze`,
    });
    assert.equal(freezeRes.statusCode, 200);
    const frozenBook = JSON.parse(freezeRes.body).data;
    assert.equal(frozenBook.isFrozenForPrint, true);
    assert.ok(frozenBook.frozenEditionHash);

    await app.close();
  });
});
