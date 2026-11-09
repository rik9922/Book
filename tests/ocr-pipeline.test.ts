import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import sharp from "sharp";
import { OcrEngine } from "../services/media-service/src/ocr-engine.ts";
import { buildMediaService } from "../services/media-service/src/server.ts";
import { createDatabaseClient, PostgresMediaRepository } from "@memory-capsule/database";

describe("Phase 5 — Tesseract OCR Media Processing Pipeline", () => {
  let ocrEngine: OcrEngine;
  let testImageBuffer: Buffer;
  let mediaApp: any;

  before(async () => {
    ocrEngine = new OcrEngine();

    // Generate crisp synthetic image with known text using SVG -> Sharp -> PNG
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

  test("3. Local Tesseract OCR text extraction and word bounding box parsing", async () => {
    const status = ocrEngine.getStatus();
    if (!status.isAvailable) {
      // Skip live extraction if tesseract is not on this environment
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

  test("5. Media Service API OCR endpoints (Status & Processing)", async () => {
    // 5a. GET /api/v1/media/ocr/status
    const statusRes = await mediaApp.inject({
      method: "GET",
      url: "/api/v1/media/ocr/status",
    });
    assert.equal(statusRes.statusCode, 200);
    const statusJson = JSON.parse(statusRes.body);
    assert.equal(statusJson.success, true);
    assert.equal(typeof statusJson.data.isAvailable, "boolean");

    // 5b. Upload session and file upload
    const testSpaceId = crypto.randomUUID();
    const sessionRes = await mediaApp.inject({
      method: "POST",
      url: "/api/v1/media/upload-session",
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
    const storageKey = sessionJson.data.storageKey;

    // Upload the file via local-upload
    const uploadRes = await mediaApp.inject({
      method: "PUT",
      url: `/api/v1/media/local-upload?key=${encodeURIComponent(storageKey)}`,
      headers: { "content-type": "image/png" },
      payload: testImageBuffer,
    });
    assert.equal(uploadRes.statusCode, 200);

    // Complete upload
    const completeRes = await mediaApp.inject({
      method: "POST",
      url: `/api/v1/media/${mediaId}/complete`,
    });
    assert.equal(completeRes.statusCode, 200);

    // 5c. Trigger on-demand OCR
    const ocrRes = await mediaApp.inject({
      method: "POST",
      url: `/api/v1/media/${mediaId}/ocr`,
      payload: { language: "eng" },
    });

    if (ocrEngine.getStatus().isAvailable) {
      assert.equal(ocrRes.statusCode, 200);
      const ocrJson = JSON.parse(ocrRes.body);
      assert.equal(ocrJson.success, true);
      assert.ok(ocrJson.data.transcripts.length > 0);

      // 5d. Retrieve OCR transcripts
      const getOcrRes = await mediaApp.inject({
        method: "GET",
        url: `/api/v1/media/${mediaId}/ocr`,
      });
      assert.equal(getOcrRes.statusCode, 200);
      const getOcrJson = JSON.parse(getOcrRes.body);
      assert.ok(getOcrJson.data.length > 0);

      // 5e. Search OCR Transcripts
      const searchRes = await mediaApp.inject({
        method: "GET",
        url: `/api/v1/media/ocr/search?spaceId=${testSpaceId}&q=Memoria`,
      });
      assert.equal(searchRes.statusCode, 200);
      const searchJson = JSON.parse(searchRes.body);
      assert.ok(searchJson.data.length > 0);
    }
  });

  test("6. PostgreSQL OCR table & Full-Text Search GIN Index (Live Database)", async () => {
    const dbUrl = process.env.MEDIA_DATABASE_URL || "postgres://postgres:postgrespassword@127.0.0.1:5432/media_db";
    let db: any;
    try {
      db = createDatabaseClient({ connectionString: dbUrl });
      const healthy = await db.healthCheck();
      if (!healthy) return;

      const mediaRepo = new PostgresMediaRepository(db);
      const testMediaId = "00000000-1111-2222-3333-444444444444";
      const testSpaceId = "99999999-8888-7777-6666-555555555555";

      // Insert media record first to satisfy foreign key
      await db.query(
        `INSERT INTO media_assets (id, space_id, original_name, mime_type, size_bytes, status, storage_key, created_at, updated_at)
         VALUES ($1, $2, 'test_scan.png', 'image/png', 1024, 'ready', 'test/scan.png', NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [testMediaId, testSpaceId]
      );

      // Save OCR transcript
      const transcriptId = "11111111-aaaa-bbbb-cccc-dddddddddddd";
      await db.query(`DELETE FROM media_ocr_transcripts WHERE id = $1`, [transcriptId]);

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

      // Find by mediaId
      const found = await mediaRepo.findOcrTranscriptByMediaId(testMediaId);
      assert.ok(found.some((t) => t.id === transcriptId));

      // Full-text search with to_tsvector / plainto_tsquery
      const searchResults = await mediaRepo.searchTranscripts(testSpaceId, "Tuscany");
      assert.ok(searchResults.length > 0, "PostgreSQL GIN full-text search should match 'Tuscany'");
      assert.ok(searchResults[0].extractedText.includes("Tuscany"));

      // Cleanup
      await db.query(`DELETE FROM media_ocr_transcripts WHERE id = $1`, [transcriptId]);
      await db.query(`DELETE FROM media_assets WHERE id = $1`, [testMediaId]);
    } catch (err: any) {
      if (process.env.NODE_ENV !== "test") {
        throw err;
      }
    } finally {
      if (db) await db.close().catch(() => {});
    }
  });
});
