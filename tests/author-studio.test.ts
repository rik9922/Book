import { describe, test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import JSZip from "jszip";
import { buildBookService } from "../services/book-service/src/server.ts";
import { createDatabaseClient, PostgresSpaceRepository } from "@memory-capsule/database";

const JWT_SECRET =
  process.env.JWT_SECRET || "dev-jwt-secret-change-in-production-32-chars-min";

function signToken(userId: string, email = "author@memoria.internal"): string {
  return jwt.sign({ sub: userId, userId, email, role: "user" }, JWT_SECRET, {
    expiresIn: "1h",
  });
}

async function seedSpace(spaceId: string, ownerId: string): Promise<void> {
  const memoryDbUrl = process.env.MEMORY_DATABASE_URL || process.env.DATABASE_URL;
  if (!memoryDbUrl) return;
  const memDb = createDatabaseClient(memoryDbUrl);
  try {
    const spaceRepo = new PostgresSpaceRepository(memDb);
    await spaceRepo.createSpace({
      id: spaceId,
      ownerId,
      name: "Author Studio Test Space",
      type: "family",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } finally {
    await memDb.close();
  }
}

describe("Memoria Author Studio — Manuscript, Resume, Revisions, 3D Sync & Import/Export Suite", () => {
  test("1. Manuscript CRUD, Chapter Reordering, Resume State, Revisions & 3D Spread Sync with BOLA Isolation", async () => {
    const app = await buildBookService();
    try {
      const ownerId = crypto.randomUUID();
      const outsiderId = crypto.randomUUID();
      const spaceId = crypto.randomUUID();
      const ownerToken = signToken(ownerId, "author-owner@memoria.internal");
      const outsiderToken = signToken(outsiderId, "outsider@memoria.internal");
      await seedSpace(spaceId, ownerId);

      // Create book
      const bookRes = await app.inject({
        method: "POST",
        url: "/api/v1/books",
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: {
          spaceId,
          title: "Chronicles of Maple Ridge",
          subtitle: "Three Generations of Letters",
          coverTitle: "Chronicles of Maple Ridge",
          spineText: "MAPLE RIDGE",
        },
      });
      assert.equal(bookRes.statusCode, 201);
      const book = JSON.parse(bookRes.body).data;

      // Outsider cannot read manuscript (BOLA protection)
      const outsiderGet = await app.inject({
        method: "GET",
        url: `/api/v1/books/${book.id}/manuscript`,
        headers: { authorization: `Bearer ${outsiderToken}` },
      });
      assert.equal(outsiderGet.statusCode, 403);

      // Unauthenticated request rejected with 401
      const unauthGet = await app.inject({
        method: "GET",
        url: `/api/v1/books/${book.id}/manuscript`,
      });
      assert.equal(unauthGet.statusCode, 401);

      // Owner loads manuscript (auto-initializes default chapter)
      const msRes = await app.inject({
        method: "GET",
        url: `/api/v1/books/${book.id}/manuscript`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });
      assert.equal(msRes.statusCode, 200);
      const msPayload = JSON.parse(msRes.body).data;
      assert.equal(msPayload.manuscript.chapters.length, 1);
      const ch1Id = msPayload.manuscript.chapters[0].id;

      // Last chapter cannot be deleted (409)
      const delLastRes = await app.inject({
        method: "DELETE",
        url: `/api/v1/books/${book.id}/manuscript/chapters/${ch1Id}`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });
      assert.equal(delLastRes.statusCode, 409);

      // Update manuscript design metadata
      const patchMsRes = await app.inject({
        method: "PATCH",
        url: `/api/v1/books/${book.id}/manuscript`,
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: {
          trimSize: "8x10_heirloom",
          typographyPreset: "editorial_classic",
          authorName: "Eleanor Vance",
          dedication: "For Clara and Samuel.",
        },
      });
      assert.equal(patchMsRes.statusCode, 200);
      assert.equal(JSON.parse(patchMsRes.body).data.trimSize, "8x10_heirloom");
      assert.equal(JSON.parse(patchMsRes.body).data.authorName, "Eleanor Vance");

      // Update chapter 1 prose (verifying XSS script stripping on persistence)
      const patchCh1 = await app.inject({
        method: "PATCH",
        url: `/api/v1/books/${book.id}/manuscript/chapters/${ch1Id}`,
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: {
          title: "Chapter 1: Winter Arrival",
          status: "revised",
          contentHtml:
            "<p>Snow fell softly across the cedar roof.</p><script>alert(1)</script><p onclick='evil()'>Grandmother lit the hearth.</p>",
        },
      });
      assert.equal(patchCh1.statusCode, 200);
      const ch1Updated = JSON.parse(patchCh1.body).data;
      assert.ok(!ch1Updated.contentHtml.includes("<script>"));
      assert.ok(!ch1Updated.contentHtml.includes("onclick"));
      assert.ok(ch1Updated.wordCount >= 10);

      // Add Chapter 2
      const addCh2 = await app.inject({
        method: "POST",
        url: `/api/v1/books/${book.id}/manuscript/chapters`,
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: {
          title: "Chapter 2: The Orchard",
          sectionType: "chapter",
          contentHtml: "<p>Spring brought blossoms to every row of apple trees.</p>",
        },
      });
      assert.equal(addCh2.statusCode, 201);
      const ch2 = JSON.parse(addCh2.body).data;

      // Reorder chapters (Chapter 2 before Chapter 1)
      const reorderRes = await app.inject({
        method: "PUT",
        url: `/api/v1/books/${book.id}/manuscript/chapters/reorder`,
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { chapterIds: [ch2.id, ch1Id] },
      });
      assert.equal(reorderRes.statusCode, 200);
      const reordered = JSON.parse(reorderRes.body).data;
      assert.equal(reordered[0].id, ch2.id);
      assert.equal(reordered[1].id, ch1Id);

      // Save & retrieve exact resume checkpoint
      const saveResume = await app.inject({
        method: "PUT",
        url: `/api/v1/books/${book.id}/manuscript/resume`,
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: {
          activeEnvironment: "write",
          activeChapterId: ch2.id,
          cursorOffset: 42,
          scrollOffset: 180,
          panelState: { binderOpen: true },
        },
      });
      assert.equal(saveResume.statusCode, 200);

      const getResume = await app.inject({
        method: "GET",
        url: `/api/v1/books/${book.id}/manuscript/resume`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });
      assert.equal(getResume.statusCode, 200);
      const resumeState = JSON.parse(getResume.body).data;
      assert.equal(resumeState.activeChapterId, ch2.id);
      assert.equal(resumeState.cursorOffset, 42);
      assert.equal(resumeState.scrollOffset, 180);

      // Create immutable revision snapshot
      const createRev = await app.inject({
        method: "POST",
        url: `/api/v1/books/${book.id}/manuscript/revisions`,
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { label: "Before deleting chapter 2", sourceType: "manual" },
      });
      assert.equal(createRev.statusCode, 201);
      const rev = JSON.parse(createRev.body).data;
      assert.ok(rev.checksumSha256.length === 64);

      // Delete chapter 2, then restore revision
      const delCh2 = await app.inject({
        method: "DELETE",
        url: `/api/v1/books/${book.id}/manuscript/chapters/${ch2.id}`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });
      assert.equal(delCh2.statusCode, 200);

      const restoreRev = await app.inject({
        method: "POST",
        url: `/api/v1/books/${book.id}/manuscript/revisions/${rev.id}/restore`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });
      assert.equal(restoreRev.statusCode, 200);
      const restoredMs = JSON.parse(restoreRev.body).data;
      assert.equal(restoredMs.chapters.length, 2);

      // Sync manuscript to live 3D Book Theater spreads
      const syncRes = await app.inject({
        method: "POST",
        url: `/api/v1/books/${book.id}/manuscript/sync-spreads`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });
      assert.equal(syncRes.statusCode, 200);
      const syncData = JSON.parse(syncRes.body).data;
      assert.ok(syncData.spreadsGenerated >= 2);
      assert.ok(syncData.book.spreads.length >= 2);
    } finally {
      await app.close();
    }
  });

  test("2. Lossless .memoria, DOCX (Mammoth), EPUB 3.3, Markdown, HTML, TXT & Assisted PDF Import/Export Round-Trip", async () => {
    const app = await buildBookService();
    try {
      const ownerId = crypto.randomUUID();
      const spaceId = crypto.randomUUID();
      const token = signToken(ownerId, "roundtrip@memoria.internal");
      await seedSpace(spaceId, ownerId);

      // Source book
      const srcBookRes = await app.inject({
        method: "POST",
        url: "/api/v1/books",
        headers: { authorization: `Bearer ${token}` },
        payload: {
          spaceId,
          title: "Heirloom Roundtrip Volume",
          subtitle: "Complete Export Fidelity Test",
          coverTitle: "Heirloom Roundtrip Volume",
        },
      });
      const srcBook = JSON.parse(srcBookRes.body).data;

      // Seed 2 rich chapters via Markdown import (replace)
      const mdContent = [
        "# Prologue: The Harbor",
        "Fog drifted past the wooden pier at dawn.",
        "",
        "# Chapter 1: Lantern Light",
        "We carried brass lanterns along the **stone path** and remembered every story.",
      ].join("\n");

      const mdImport = await app.inject({
        method: "POST",
        url: `/api/v1/books/${srcBook.id}/manuscript/import`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          format: "markdown",
          fileName: "harbor-draft.md",
          contentText: mdContent,
          mergeStrategy: "replace",
        },
      });
      assert.equal(mdImport.statusCode, 200);
      const mdData = JSON.parse(mdImport.body).data;
      assert.equal(mdData.importedChapters, 2);
      assert.equal(mdData.manuscript.chapters[0].title, "Prologue: The Harbor");

      // Export .memoria native archive
      const memoriaExport = await app.inject({
        method: "GET",
        url: `/api/v1/books/${srcBook.id}/manuscript/export?format=memoria`,
        headers: { authorization: `Bearer ${token}` },
      });
      assert.equal(memoriaExport.statusCode, 200);
      assert.ok(memoriaExport.headers["x-memoria-checksum-sha256"]);
      const memoriaBuf = memoriaExport.rawPayload;
      assert.equal(memoriaBuf[0], 0x50); // 'P'
      assert.equal(memoriaBuf[1], 0x4b); // 'K'

      // Re-import .memoria into a brand-new book (lossless round-trip)
      const dstBookRes = await app.inject({
        method: "POST",
        url: "/api/v1/books",
        headers: { authorization: `Bearer ${token}` },
        payload: {
          spaceId,
          title: "Destination Book",
          coverTitle: "Destination Book",
        },
      });
      const dstBook = JSON.parse(dstBookRes.body).data;

      const memoriaReimport = await app.inject({
        method: "POST",
        url: `/api/v1/books/${dstBook.id}/manuscript/import`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          format: "memoria",
          fileName: "heirloom.memoria",
          contentBase64: memoriaBuf.toString("base64"),
          mergeStrategy: "replace",
        },
      });
      assert.equal(memoriaReimport.statusCode, 200);
      const reimportedMs = JSON.parse(memoriaReimport.body).data.manuscript;
      assert.equal(reimportedMs.chapters.length, 2);
      assert.equal(reimportedMs.chapters[1].title, "Chapter 1: Lantern Light");

      // Export DOCX -> re-import via Mammoth.js
      const docxExport = await app.inject({
        method: "GET",
        url: `/api/v1/books/${srcBook.id}/manuscript/export?format=docx`,
        headers: { authorization: `Bearer ${token}` },
      });
      assert.equal(docxExport.statusCode, 200);
      const docxReimport = await app.inject({
        method: "POST",
        url: `/api/v1/books/${dstBook.id}/manuscript/import`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          format: "docx",
          fileName: "roundtrip.docx",
          contentBase64: docxExport.rawPayload.toString("base64"),
          mergeStrategy: "replace",
        },
      });
      assert.equal(docxReimport.statusCode, 200);
      assert.ok(JSON.parse(docxReimport.body).data.importedWordCount >= 12);

      // Export EPUB 3.3 -> re-import EPUB
      const epubExport = await app.inject({
        method: "GET",
        url: `/api/v1/books/${srcBook.id}/manuscript/export?format=epub`,
        headers: { authorization: `Bearer ${token}` },
      });
      assert.equal(epubExport.statusCode, 200);
      const epubReimport = await app.inject({
        method: "POST",
        url: `/api/v1/books/${dstBook.id}/manuscript/import`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          format: "epub",
          fileName: "roundtrip.epub",
          contentBase64: epubExport.rawPayload.toString("base64"),
          mergeStrategy: "replace",
        },
      });
      assert.equal(epubReimport.statusCode, 200);
      assert.equal(JSON.parse(epubReimport.body).data.importedChapters, 2);

      // Export PDF -> Assisted PDF import with explicit fidelity warning
      const pdfExport = await app.inject({
        method: "GET",
        url: `/api/v1/books/${srcBook.id}/manuscript/export?format=pdf`,
        headers: { authorization: `Bearer ${token}` },
      });
      assert.equal(pdfExport.statusCode, 200);
      assert.equal(pdfExport.rawPayload.subarray(0, 5).toString("ascii"), "%PDF-");

      const pdfImport = await app.inject({
        method: "POST",
        url: `/api/v1/books/${dstBook.id}/manuscript/import`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          format: "pdf",
          fileName: "proof.pdf",
          contentBase64: pdfExport.rawPayload.toString("base64"),
          mergeStrategy: "append",
        },
      });
      assert.equal(pdfImport.statusCode, 200);
      const pdfData = JSON.parse(pdfImport.body).data;
      assert.ok(pdfData.warnings.length >= 1, "Assisted PDF import must return explicit fidelity warning");

      // Export HTML, Markdown, and TXT
      for (const fmt of ["html", "markdown", "txt"] as const) {
        const res = await app.inject({
          method: "GET",
          url: `/api/v1/books/${srcBook.id}/manuscript/export?format=${fmt}`,
          headers: { authorization: `Bearer ${token}` },
        });
        assert.equal(res.statusCode, 200);
        assert.ok(res.rawPayload.byteLength > 20);
      }
    } finally {
      await app.close();
    }
  });

  test("3. Security Guards: Reject Zip-Slip Path Traversal, Spoofed Magic Bytes & Empty Imports", async () => {
    const app = await buildBookService();
    try {
      const ownerId = crypto.randomUUID();
      const spaceId = crypto.randomUUID();
      const token = signToken(ownerId, "sec@memoria.internal");
      await seedSpace(spaceId, ownerId);

      const bookRes = await app.inject({
        method: "POST",
        url: "/api/v1/books",
        headers: { authorization: `Bearer ${token}` },
        payload: {
          spaceId,
          title: "Security Guard Book",
          coverTitle: "Security Guard Book",
        },
      });
      const book = JSON.parse(bookRes.body).data;

      // Craft a malicious ZIP with zip-slip entry path
      const evilZip = new JSZip();
      evilZip.file("../../etc/passwd", "root:x:0:0");
      const evilBuf = await evilZip.generateAsync({ type: "nodebuffer" });

      const zipSlipRes = await app.inject({
        method: "POST",
        url: `/api/v1/books/${book.id}/manuscript/import`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          format: "memoria",
          fileName: "evil.memoria",
          contentBase64: evilBuf.toString("base64"),
        },
      });
      assert.equal(zipSlipRes.statusCode, 400);

      // Spoofed PDF without %PDF- header
      const spoofedPdf = await app.inject({
        method: "POST",
        url: `/api/v1/books/${book.id}/manuscript/import`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          format: "pdf",
          fileName: "not-a-pdf.pdf",
          contentBase64: Buffer.from("<html><script>alert(1)</script></html>").toString("base64"),
        },
      });
      assert.equal(spoofedPdf.statusCode, 400);

      // Spoofed DOCX without PK ZIP signature
      const spoofedDocx = await app.inject({
        method: "POST",
        url: `/api/v1/books/${book.id}/manuscript/import`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          format: "docx",
          fileName: "fake.docx",
          contentBase64: Buffer.from("not a zip archive").toString("base64"),
        },
      });
      assert.equal(spoofedDocx.statusCode, 400);

      // Empty import rejected
      const emptyImport = await app.inject({
        method: "POST",
        url: `/api/v1/books/${book.id}/manuscript/import`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          format: "txt",
          fileName: "empty.txt",
          contentText: "",
        },
      });
      assert.equal(emptyImport.statusCode, 400);

      // Corrupted ZIP with valid PK magic header returns 400 (never 500)
      const corruptZip = await app.inject({
        method: "POST",
        url: `/api/v1/books/${book.id}/manuscript/import`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          format: "docx",
          fileName: "corrupt.docx",
          contentBase64: Buffer.from("PK\x03\x04corrupted-garbage-bytes").toString("base64"),
        },
      });
      assert.equal(corruptZip.statusCode, 400);

      // Malformed manifest.json inside .memoria returns 400 (never 500)
      const badJsonZip = new JSZip();
      badJsonZip.file("manifest.json", "{not valid json");
      const badJsonBuf = await badJsonZip.generateAsync({ type: "nodebuffer" });
      const badManifestRes = await app.inject({
        method: "POST",
        url: `/api/v1/books/${book.id}/manuscript/import`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          format: "memoria",
          fileName: "bad-manifest.memoria",
          contentBase64: badJsonBuf.toString("base64"),
        },
      });
      assert.equal(badManifestRes.statusCode, 400);

      // None of the rejected imports should have polluted book_revisions with pre-import checkpoints
      const revsAfterRejected = await app.inject({
        method: "GET",
        url: `/api/v1/books/${book.id}/manuscript/revisions`,
        headers: { authorization: `Bearer ${token}` },
      });
      assert.equal(revsAfterRejected.statusCode, 200);
      assert.equal(
        JSON.parse(revsAfterRejected.body).data.length,
        0,
        "Rejected imports must not create pre-import revision checkpoints"
      );
    } finally {
      await app.close();
    }
  });

  test("4. Regression: Multi-Page PDF Export, EPUB No-Duplicate Heading, Inline Marks/Lists, Metadata Restore & 404 Delete", async () => {
    const app = await buildBookService();
    try {
      const ownerId = crypto.randomUUID();
      const spaceId = crypto.randomUUID();
      const token = signToken(ownerId, "regression@memoria.internal");
      await seedSpace(spaceId, ownerId);

      const bookRes = await app.inject({
        method: "POST",
        url: "/api/v1/books",
        headers: { authorization: `Bearer ${token}` },
        payload: {
          spaceId,
          title: "Longform Archival Volume",
          coverTitle: "Longform Archival Volume",
        },
      });
      const book = JSON.parse(bookRes.body).data;

      // Initialize manuscript and update metadata
      const initMs = JSON.parse(
        (
          await app.inject({
            method: "GET",
            url: `/api/v1/books/${book.id}/manuscript`,
            headers: { authorization: `Bearer ${token}` },
          })
        ).body
      ).data.manuscript;
      const ch1Id = initMs.chapters[0].id;

      await app.inject({
        method: "PATCH",
        url: `/api/v1/books/${book.id}/manuscript`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          trimSize: "8x10_heirloom",
          authorName: "Original Author",
          dedication: "Original Dedication",
        },
      });

      // Verify inline marks & bullet lists are preserved in ProseMirror JSON
      const richHtml =
        "<p>A <strong>bold</strong> and <em>italic</em> <code>snippet</code>.</p><ul><li>First heirloom item</li><li>Second heirloom item</li></ul><hr />";
      const patchRich = await app.inject({
        method: "PATCH",
        url: `/api/v1/books/${book.id}/manuscript/chapters/${ch1Id}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { title: "Opening Chronicle", contentHtml: richHtml },
      });
      assert.equal(patchRich.statusCode, 200);
      const richChapter = JSON.parse(patchRich.body).data;
      const docContent = richChapter.contentJson.content as Array<Record<string, any>>;
      assert.ok(
        docContent[0].content.some(
          (n: any) => n.text === "bold" && Array.isArray(n.marks) && n.marks.some((m: any) => m.type === "bold")
        ),
        "ProseMirror JSON must preserve bold mark"
      );
      assert.ok(
        docContent.some((n) => n.type === "bulletList"),
        "ProseMirror JSON must preserve bulletList node"
      );
      assert.ok(
        docContent.some((n) => n.type === "horizontalRule"),
        "ProseMirror JSON must preserve horizontalRule node"
      );

      // Save revision checkpoint with original metadata, then mutate metadata and restore
      const revRes = await app.inject({
        method: "POST",
        url: `/api/v1/books/${book.id}/manuscript/revisions`,
        headers: { authorization: `Bearer ${token}` },
        payload: { label: "Metadata Checkpoint" },
      });
      assert.equal(revRes.statusCode, 201);
      const revId = JSON.parse(revRes.body).data.id;

      await app.inject({
        method: "PATCH",
        url: `/api/v1/books/${book.id}/manuscript`,
        headers: { authorization: `Bearer ${token}` },
        payload: { trimSize: "5x8_pocket", authorName: "Mutated Author" },
      });

      const restoreRes = await app.inject({
        method: "POST",
        url: `/api/v1/books/${book.id}/manuscript/revisions/${revId}/restore`,
        headers: { authorization: `Bearer ${token}` },
      });
      assert.equal(restoreRes.statusCode, 200);
      const restoredMs = JSON.parse(restoreRes.body).data;
      assert.equal(restoredMs.trimSize, "8x10_heirloom", "Revision restore must restore trimSize");
      assert.equal(restoredMs.authorName, "Original Author", "Revision restore must restore authorName");

      // Add a long second chapter (> 60 lines) to verify multi-page PDF export (no 48-line truncation)
      const longParagraphs = Array.from(
        { length: 40 },
        (_, i) =>
          `<p>Paragraph ${i + 1}: Archival family record documenting the autumn harvest along Cedar Ridge and the letters preserved in the cedar chest.</p>`
      ).join("\n");
      const sentinel = "FINAL_SENTINEL_PAGE_TWO_MARKER";
      const ch2Res = await app.inject({
        method: "POST",
        url: `/api/v1/books/${book.id}/manuscript/chapters`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          title: "Chapter 2: Longform Archive",
          contentHtml: `${longParagraphs}\n<p>${sentinel}</p>`,
        },
      });
      assert.equal(ch2Res.statusCode, 201);

      // Deleting a nonexistent chapter must return 404 (not 200)
      const delMissing = await app.inject({
        method: "DELETE",
        url: `/api/v1/books/${book.id}/manuscript/chapters/${crypto.randomUUID()}`,
        headers: { authorization: `Bearer ${token}` },
      });
      assert.equal(delMissing.statusCode, 404);

      // Export PDF and verify multi-page output + sentinel presence
      const pdfExport = await app.inject({
        method: "GET",
        url: `/api/v1/books/${book.id}/manuscript/export?format=pdf`,
        headers: { authorization: `Bearer ${token}` },
      });
      assert.equal(pdfExport.statusCode, 200);
      const pdfText = pdfExport.rawPayload.toString("latin1");
      assert.ok(pdfText.startsWith("%PDF-1.4"));
      const countMatch = pdfText.match(/\/Count\s+(\d+)/);
      assert.ok(countMatch && Number(countMatch[1]) >= 2, `Expected >= 2 PDF pages, got ${countMatch?.[0]}`);
      assert.ok(pdfText.includes(sentinel), "Multi-page PDF must not truncate trailing manuscript content");

      // Export EPUB and re-import to verify chapter title is NOT duplicated as <h1> inside body
      const epubExport = await app.inject({
        method: "GET",
        url: `/api/v1/books/${book.id}/manuscript/export?format=epub`,
        headers: { authorization: `Bearer ${token}` },
      });
      assert.equal(epubExport.statusCode, 200);
      const epubReimport = await app.inject({
        method: "POST",
        url: `/api/v1/books/${book.id}/manuscript/import`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          format: "epub",
          fileName: "roundtrip.epub",
          contentBase64: epubExport.rawPayload.toString("base64"),
          mergeStrategy: "replace",
        },
      });
      assert.equal(epubReimport.statusCode, 200);
      const reimportedCh1 = JSON.parse(epubReimport.body).data.manuscript.chapters[0];
      assert.ok(
        !reimportedCh1.contentHtml.includes(`<h1>${reimportedCh1.title}</h1>`),
        "EPUB round-trip must not duplicate chapter title as <h1> inside chapter body"
      );
    } finally {
      await app.close();
    }
  });
});
