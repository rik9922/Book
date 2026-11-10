import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import sharp from "sharp";
import { BaseServiceConfigSchema, validateServiceConfig } from "@memory-capsule/contracts";
import { OcrEngine } from "../services/media-service/src/ocr-engine.ts";
import { buildMediaService } from "../services/media-service/src/server.ts";
import { createDatabaseClient, PostgresMediaRepository, PostgresSpaceRepository } from "@memory-capsule/database";

describe("Phase 5 — Tesseract OCR Media Processing Pipeline", () => {
  let ocrEngine: OcrEngine;
  let testImageBuffer: Buffer;
  let mediaApp: any;
  let authToken: string;
  let authUserId: string;

  before(async () => {
    ocrEngine = new OcrEngine();
    const cfg = validateServiceConfig(BaseServiceConfigSchema);
    authUserId = crypto.randomUUID();
    authToken = jwt.sign(
      { sub: authUserId, email: "ocr-test@memoria.internal" },
      cfg.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const svg = `
      <svg width="600" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#ffffff" />
        <text x="40" y="100" font-family="Arial, Helvetica, sans-serif" font-size="36" font-weight="bold" fill="#000000">
          Memoria Archival Preservation 2026
        </text>
      </svg>
    `;
    testImageBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
    mediaApp = await buildMediaService();
  });

  after(async () => {
    if (mediaApp) {
      await mediaApp.close();
    }
  });

  test("1. OCR Engine discovery and status check", () => {
    const status = ocrEngine.getStatus();
    assert.equal(typeof status.isAvailable, "boolean");
    assert.equal(typeof status.tesseractPath, "string");
    assert.equal(typeof status.pdftoppmPath, "string");

    if (status.isAvailable) {
      assert.ok(status.tesseractPath.length > 0, "Tesseract executable path must not be empty");
    }
  });

  test("2. Sharp image preprocessing pipeline", async () => {
    const preprocessed = await ocrEngine.preprocessImage(testImageBuffer);
    assert.ok(preprocessed.length > 0, "Preprocessed buffer must not be empty");

    const metadata = await sharp(preprocessed).metadata();
    assert.equal(metadata.channels, 1, "Image should be converted to single-channel grayscale");
    assert.equal(metadata.format, "png", "Image format should be PNG");
  });

  test("3. Local Tesseract OCR text extraction and word bounding box parsing (single pass)", async () => {
    const status = ocrEngine.getStatus();
    if (!status.isAvailable) {
      return;
    }

    const result = await ocrEngine.processImage(testImageBuffer, "eng");
    assert.ok(result.text.length > 0, "Extracted text must not be empty");
    assert.ok(
      result.text.includes("Memoria") || result.text.includes("Archival") || result.text.includes("Preservation"),
      `Extracted text "${result.text}" must contain key phrase`
    );
    assert.ok(result.confidence > 50, `Confidence should be high (>50), got ${result.confidence}`);
    assert.ok(result.words.length > 0, "Word bounding boxes must be parsed");
    assert.ok(result.words[0].bbox.width > 0, "Word bounding box width must be positive");
  });

  test("4. Document processing wrapper with timing and metrics", async () => {
    const status = ocrEngine.getStatus();
    if (!status.isAvailable) return;

    const docResult = await ocrEngine.processDocument(testImageBuffer, "image/png", "eng");
    assert.equal(docResult.pages.length, 1);
    assert.ok(docResult.durationMs >= 0, "Duration must be non-negative");
    assert.ok(docResult.averageConfidence > 0, "Average confidence must be positive");
    assert.ok(docResult.engine.includes("tesseract"), "Engine identifier must include tesseract");
  });

  test("5. Media Service API OCR endpoints (Async Queue + Authenticated Retrieval)", async () => {
    const statusRes = await mediaApp.inject({
      method: "GET",
      url: "/api/v1/media/ocr/status",
    });
    assert.equal(statusRes.statusCode, 200);
    const statusJson = JSON.parse(statusRes.body);
    assert.equal(statusJson.success, true);
    assert.equal(typeof statusJson.data.isAvailable, "boolean");

    const testSpaceId = crypto.randomUUID();
    const memoryDbUrl = process.env.MEMORY_DATABASE_URL || process.env.DATABASE_URL;
    if (memoryDbUrl) {
      const memDb = createDatabaseClient(memoryDbUrl);
      const spaceRepo = new PostgresSpaceRepository(memDb);
      await spaceRepo.createSpace({
        id: testSpaceId,
        ownerId: authUserId,
        name: "OCR Pipeline Space",
        type: "family",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await memDb.close();
    }
    const sessionRes = await mediaApp.inject({
      method: "POST",
      url: "/api/v1/media/upload-session",
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        spaceId: testSpaceId,
        fileName: "archival_scan.png",
        mimeType: "image/png",
        fileSizeBytes: testImageBuffer.length,
      },
    });
    assert.equal(sessionRes.statusCode, 201);
    const sessionJson = JSON.parse(sessionRes.body);
    const mediaId = sessionJson.data.mediaId;
    const signedUploadPath = new URL(sessionJson.data.uploadUrl).pathname + new URL(sessionJson.data.uploadUrl).search;

    const uploadRes = await mediaApp.inject({
      method: "PUT",
      url: signedUploadPath,
      headers: { "content-type": "image/png" },
      payload: testImageBuffer,
    });
    assert.equal(uploadRes.statusCode, 200);

    const completeRes = await mediaApp.inject({
      method: "POST",
      url: `/api/v1/media/${mediaId}/complete`,
      headers: { authorization: `Bearer ${authToken}` },
    });
    assert.equal(completeRes.statusCode, 200);

    // Trigger on-demand async OCR (202 Queued)
    const ocrRes = await mediaApp.inject({
      method: "POST",
      url: `/api/v1/media/${mediaId}/ocr`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: { language: "eng" },
    });

    if (ocrEngine.getStatus().isAvailable) {
      assert.equal(ocrRes.statusCode, 202);
      const ocrJson = JSON.parse(ocrRes.body);
      assert.equal(ocrJson.success, true);
      assert.equal(ocrJson.data.status, "queued");

      // Wait for BullMQ/InMemory worker to save OCR transcripts
      let transcripts: any[] = [];
      for (let i = 0; i < 40; i++) {
        const getOcrRes = await mediaApp.inject({
          method: "GET",
          url: `/api/v1/media/${mediaId}/ocr`,
          headers: { authorization: `Bearer ${authToken}` },
        });
        assert.equal(getOcrRes.statusCode, 200);
        transcripts = JSON.parse(getOcrRes.body).data;
        if (transcripts.length > 0) break;
        await new Promise((r) => setTimeout(r, 50));
      }
      assert.ok(transcripts.length > 0, "Async OCR worker must persist transcripts");

      const searchRes = await mediaApp.inject({
        method: "GET",
        url: `/api/v1/media/ocr/search?spaceId=${testSpaceId}&q=Memoria`,
        headers: { authorization: `Bearer ${authToken}` },
      });
      assert.equal(searchRes.statusCode, 200);
      const searchJson = JSON.parse(searchRes.body);
      assert.ok(searchJson.data.length > 0);
    }
  });

  test("6. PostgreSQL OCR table & Full-Text Search GIN Index (Live Database)", async () => {
    const dbUrl = process.env.MEDIA_DATABASE_URL || process.env.DATABASE_URL;
    assert.ok(dbUrl, "MEDIA_DATABASE_URL must be configured for live OCR database test");

    const db = createDatabaseClient(dbUrl);
    try {
      const healthy = await db.healthCheck();
      assert.equal(healthy, true, "Live media_db PostgreSQL connection must be healthy");

      const mediaRepo = new PostgresMediaRepository(db);
      const testMediaId = crypto.randomUUID();
      const testSpaceId = crypto.randomUUID();
      const transcriptId = crypto.randomUUID();

      await db.query(
        `INSERT INTO media_assets (id, space_id, original_name, mime_type, size_bytes, status, storage_key, created_at, updated_at)
         VALUES ($1, $2, 'test_scan.png', 'image/png', 1024, 'ready', 'test/scan.png', NOW(), NOW())`,
        [testMediaId, testSpaceId]
      );

      await mediaRepo.saveOcrTranscript({
        id: transcriptId,
        mediaId: testMediaId,
        spaceId: testSpaceId,
        status: "completed",
        extractedText: "Heirloom family photograph from ancestral summer house in Tuscany 1948",
        confidence: 94.5,
        wordCount: 9,
        language: "eng",
        pageNumber: 1,
        metadata: { source: "tesseract-test" },
      });

      const found = await mediaRepo.findOcrTranscriptByMediaId(testMediaId);
      assert.ok(found.some((t) => t.id === transcriptId));

      const searchResults = await mediaRepo.searchTranscripts(testSpaceId, "Tuscany");
      assert.ok(searchResults.length > 0, "PostgreSQL GIN full-text search should match 'Tuscany'");
      assert.ok(searchResults[0].extractedText.includes("Tuscany"));

      await db.query(`DELETE FROM media_ocr_transcripts WHERE id = $1`, [transcriptId]);
      await db.query(`DELETE FROM media_assets WHERE id = $1`, [testMediaId]);
    } finally {
      await db.close();
    }
  });
});
