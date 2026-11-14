import { test, describe, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { BaseServiceConfigSchema, validateServiceConfig } from "@memory-capsule/contracts";
import { LocalDiskStorageDriver } from "@memory-capsule/storage";
import { InMemoryJobManager } from "@memory-capsule/jobs";
import { createDatabaseClient, PostgresMediaRepository, PostgresSpaceRepository } from "@memory-capsule/database";
import { buildMemoryService } from "../services/memory-service/src/server.ts";
import { buildMediaService } from "../services/media-service/src/server.ts";
import { buildGateway } from "../services/api-gateway/src/server.ts";

describe("Phase B/D/E — Security, Idempotency, Conflict Detection & Storage Containment", () => {
  const tempDirs: string[] = [];
  const cfg = validateServiceConfig(BaseServiceConfigSchema);

  const signUserToken = (userId: string, email = "member@memoria.internal") =>
    jwt.sign({ sub: userId, email, role: "user" }, cfg.JWT_SECRET, { expiresIn: "1h" });

  after(async () => {
    for (const dir of tempDirs) {
      await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  });

  test("1. LocalDiskStorageDriver blocks path traversal, null bytes, and symlink escapes", async () => {
    const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "memoria-storage-sec-"));
    tempDirs.push(tmpRoot);
    const baseDir = path.join(tmpRoot, "vault");
    const outsideDir = path.join(tmpRoot, "outside");
    await fs.mkdir(baseDir, { recursive: true });
    await fs.mkdir(outsideDir, { recursive: true });
    await fs.writeFile(path.join(outsideDir, "secret.txt"), "top-secret");

    const driver = new LocalDiskStorageDriver(baseDir);

    await assert.rejects(() => driver.saveObject("../escape.txt", Buffer.from("x")), /traversal/i);
    await assert.rejects(() => driver.saveObject("a/../../escape.txt", Buffer.from("x")), /traversal/i);
    await assert.rejects(() => driver.saveObject("bad\0key.txt", Buffer.from("x")), /Invalid storage key/i);

    // Symlink inside baseDir pointing outside baseDir
    const symlinkPath = path.join(baseDir, "linked-outside");
    await fs.symlink(outsideDir, symlinkPath);
    await assert.rejects(
      () => driver.getObject("linked-outside/secret.txt"),
      /symlink escape/i
    );
    await assert.rejects(
      () => driver.saveObject("linked-outside/pwned.txt", Buffer.from("nope")),
      /symlink escape/i
    );

    // Valid key still succeeds
    await driver.saveObject("originals/space-1/photo.bin", Buffer.from("ok"));
    const readBack = await driver.getObject("originals/space-1/photo.bin");
    assert.equal(readBack.toString("utf8"), "ok");
  });

  test("2. InMemoryJobManager deduplicates jobId and awaits in-flight jobs on close()", async () => {
    const jobs = new InMemoryJobManager();
    let runs = 0;
    let completed = false;

    jobs.registerWorker("ocr", async () => {
      runs += 1;
      await new Promise((r) => setTimeout(r, 80));
      completed = true;
    });

    await Promise.all([
      jobs.addJob("ocr", "run-ocr", { id: 1 }, { jobId: "ocr_media1_eng" }),
      jobs.addJob("ocr", "run-ocr", { id: 1 }, { jobId: "ocr_media1_eng" }),
      jobs.addJob("ocr", "run-ocr", { id: 1 }, { jobId: "ocr_media1_eng" }),
    ]);

    await new Promise((r) => setTimeout(r, 25));
    await jobs.close();
    assert.equal(runs, 1, "Duplicate jobId must only execute once");
    assert.equal(completed, true, "close() must await in-flight job completion");
  });

  test("3. Memory POST clientMutationId idempotency and PATCH 409 VERSION_CONFLICT", async () => {
    const app = await buildMemoryService();
    const userId = crypto.randomUUID();
    const token = signUserToken(userId);
    try {
      const spaceRes = await app.inject({
        method: "POST",
        url: "/api/v1/spaces",
        headers: { authorization: `Bearer ${token}` },
        payload: { name: "Idempotency Family Vault" },
      });
      assert.equal(spaceRes.statusCode, 201);
      const spaceId = JSON.parse(spaceRes.body).data.id;

      const mutationId = crypto.randomUUID();
      const create1 = await app.inject({
        method: "POST",
        url: `/api/v1/spaces/${spaceId}/memories`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          title: "Grandfather's Pocket Watch",
          storyText: "Saved offline first.",
          clientMutationId: mutationId,
        },
      });
      assert.equal(create1.statusCode, 201);
      const mem1 = JSON.parse(create1.body).data;
      assert.equal(mem1.revision, 1);
      assert.equal(mem1.clientMutationId, mutationId);

      // Replay exact same clientMutationId -> must return existing memory, not create duplicate
      const create2 = await app.inject({
        method: "POST",
        url: `/api/v1/spaces/${spaceId}/memories`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          title: "Grandfather's Pocket Watch",
          storyText: "Saved offline first.",
          clientMutationId: mutationId,
        },
      });
      assert.ok(create2.statusCode === 200 || create2.statusCode === 201);
      const mem2 = JSON.parse(create2.body).data;
      assert.equal(mem2.id, mem1.id);

      // Update with valid revision 1 -> succeeds and increments to revision 2
      const patchOk = await app.inject({
        method: "PATCH",
        url: `/api/v1/memories/${mem1.id}`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          title: "Grandfather's Pocket Watch (Updated)",
          expectedRevision: 1,
        },
      });
      assert.equal(patchOk.statusCode, 200);
      const memUpdated = JSON.parse(patchOk.body).data;
      assert.equal(memUpdated.revision, 2);

      // Stale update with expectedRevision 1 -> must fail closed with 409 VERSION_CONFLICT
      const patchStale = await app.inject({
        method: "PATCH",
        url: `/api/v1/memories/${mem1.id}`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          title: "Stale Offline Overwrite Attempt",
          expectedRevision: 1,
        },
      });
      assert.equal(patchStale.statusCode, 409);
      const conflictBody = JSON.parse(patchStale.body);
      assert.equal(conflictBody.error.code, "VERSION_CONFLICT");
    } finally {
      await app.close();
    }
  });

  test("4. Media upload-session idempotency and OCR transcript upsert idempotency", async () => {
    const mediaApp = await buildMediaService();
    const mediaDbUrl = process.env.MEDIA_DATABASE_URL || process.env.DATABASE_URL;
    const memoryDbUrl = process.env.MEMORY_DATABASE_URL || process.env.DATABASE_URL;
    const db = mediaDbUrl ? createDatabaseClient(mediaDbUrl) : null;
    const memoryDb = memoryDbUrl ? createDatabaseClient(memoryDbUrl) : null;

    const userId = crypto.randomUUID();
    const token = signUserToken(userId);
    const spaceId = crypto.randomUUID();
    const idempotencyKey = `idem_${crypto.randomUUID()}`;

    try {
      if (memoryDb) {
        const spaceRepo = new PostgresSpaceRepository(memoryDb);
        const now = new Date().toISOString();
        await spaceRepo.createSpace({
          id: spaceId,
          ownerId: userId,
          name: "Media Idempotency Space",
          type: "family",
          createdAt: now,
          updatedAt: now,
        });
      }

      const s1 = await mediaApp.inject({
        method: "POST",
        url: "/api/v1/media/upload-session",
        headers: { authorization: `Bearer ${token}`, "idempotency-key": idempotencyKey },
        payload: {
          spaceId,
          fileName: "heirloom.jpg",
          mimeType: "image/jpeg",
          fileSizeBytes: 1024,
          idempotencyKey,
        },
      });
      assert.equal(s1.statusCode, 201);
      const data1 = JSON.parse(s1.body).data;

      const s2 = await mediaApp.inject({
        method: "POST",
        url: "/api/v1/media/upload-session",
        headers: { authorization: `Bearer ${token}`, "idempotency-key": idempotencyKey },
        payload: {
          spaceId,
          fileName: "heirloom.jpg",
          mimeType: "image/jpeg",
          fileSizeBytes: 1024,
          idempotencyKey,
        },
      });
      assert.equal(s2.statusCode, 200);
      const data2 = JSON.parse(s2.body).data;
      assert.equal(data2.mediaId, data1.mediaId, "Duplicate upload-session must return same mediaId");

      if (db) {
        const mediaRepo = new PostgresMediaRepository(db);
        const now = new Date().toISOString();
        await mediaRepo.saveOcrTranscript({
          id: crypto.randomUUID(),
          mediaId: data1.mediaId,
          spaceId,
          status: "completed",
          extractedText: "First Pass Text",
          confidence: 0.88,
          wordCount: 3,
          language: "eng",
          pageNumber: 1,
          metadata: {},
          createdAt: now,
        });
        await mediaRepo.saveOcrTranscript({
          id: crypto.randomUUID(),
          mediaId: data1.mediaId,
          spaceId,
          status: "completed",
          extractedText: "Updated Idempotent Text",
          confidence: 0.94,
          wordCount: 3,
          language: "eng",
          pageNumber: 1,
          metadata: {},
          createdAt: now,
        });
        const rows = await db.query<{ extracted_text: string }>(
          `SELECT extracted_text FROM media_ocr_transcripts WHERE media_id = $1 AND page_number = 1 AND language = 'eng'`,
          [data1.mediaId]
        );
        assert.equal(rows.rows.length, 1, "ON CONFLICT upsert must prevent duplicate OCR rows");
        assert.equal(rows.rows[0].extracted_text, "Updated Idempotent Text");
      }
    } finally {
      await mediaApp.close();
      if (db) await db.close();
      if (memoryDb) await memoryDb.close();
    }
  });

  test("5. Admin routes reject unauthenticated and non-admin callers", async () => {
    const gateway = await buildGateway();
    const regularUserToken = signUserToken(crypto.randomUUID(), "normal-user@memoria.internal");
    try {
      const unauthOverview = await gateway.inject({
        method: "GET",
        url: "/api/v1/admin/overview/metrics",
      });
      assert.equal(unauthOverview.statusCode, 401);

      const nonAdminOverview = await gateway.inject({
        method: "GET",
        url: "/api/v1/admin/overview/metrics",
        headers: { authorization: `Bearer ${regularUserToken}` },
      });
      assert.equal(nonAdminOverview.statusCode, 403);

      const nonAdminHealth = await gateway.inject({
        method: "GET",
        url: "/api/v1/admin/services/health",
        headers: { authorization: `Bearer ${regularUserToken}` },
      });
      assert.equal(nonAdminHealth.statusCode, 403);
    } finally {
      await gateway.close();
    }
  });
});
