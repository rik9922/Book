import crypto from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  AuthorEnvironmentSchema,
  ValidationError,
  ChapterSectionTypeSchema,
  ChapterStatusSchema,
  ExportFormatSchema,
  ImportFormatSchema,
  MergeStrategySchema,
  TrimSizeSchema,
  TypographyPresetSchema,
  createErrorResponse,
  createSuccessResponse,
  type BookDocument,
  type BookEditorState,
  type BookRevision,
  type BookSpread,
  type ManuscriptChapter,
  type ManuscriptDocument,
} from "@memory-capsule/contracts";
import type { DatabaseClient } from "@memory-capsule/database";
import {
  MAX_IMPORT_BYTES,
  countWords,
  exportManuscriptArtifact,
  htmlToProseMirrorJson,
  parseImportedManuscript,
  sanitizeManuscriptHtml,
  slugifyTitle,
  stripHtmlToText,
} from "./author-studio-io.js";

export interface AuthorStudioRouteDeps {
  app: FastifyInstance;
  db: DatabaseClient;
  dbUrl?: string;
  bookRepo: {
    findBookById(id: string): Promise<BookDocument | null>;
    saveSpread(bookId: string, spread: BookSpread): Promise<void>;
  };
  requireAuthUser(req: FastifyRequest): Promise<string>;
  assertSpaceAccess(spaceId: string, userId: string, requireWrite?: boolean): Promise<void>;
}

const UpdateManuscriptSchema = z.object({
  trimSize: TrimSizeSchema.optional(),
  typographyPreset: TypographyPresetSchema.optional(),
  themePreset: z.string().min(1).max(64).optional(),
  languageCode: z.string().min(2).max(16).optional(),
  authorName: z.string().max(255).optional(),
  dedication: z.string().max(5000).optional(),
  epigraph: z.string().max(5000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const CreateChapterSchema = z.object({
  title: z.string().min(1).max(255),
  subtitle: z.string().max(255).nullable().optional(),
  sectionType: ChapterSectionTypeSchema.default("chapter"),
  contentHtml: z.string().optional(),
  contentJson: z.record(z.string(), z.unknown()).optional(),
  status: ChapterStatusSchema.default("draft"),
  sortOrder: z.number().int().min(0).optional(),
});

const UpdateChapterSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  subtitle: z.string().max(255).nullable().optional(),
  sectionType: ChapterSectionTypeSchema.optional(),
  contentHtml: z.string().optional(),
  contentJson: z.record(z.string(), z.unknown()).optional(),
  status: ChapterStatusSchema.optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const ReorderChaptersSchema = z.object({
  chapterIds: z.array(z.string().uuid()).min(1),
});

const UpdateEditorStateSchema = z.object({
  activeEnvironment: AuthorEnvironmentSchema.optional(),
  activeChapterId: z.string().uuid().nullable().optional(),
  cursorOffset: z.number().int().min(0).optional(),
  scrollOffset: z.number().int().min(0).optional(),
  panelState: z.record(z.string(), z.unknown()).optional(),
});

const CreateRevisionSchema = z.object({
  label: z.string().min(1).max(255).default("Manual checkpoint"),
  sourceType: z.enum(["manual", "autosave", "import", "publish"]).default("manual"),
});

const ImportManuscriptSchema = z.object({
  format: ImportFormatSchema,
  fileName: z.string().min(1).max(255),
  contentBase64: z.string().optional(),
  contentText: z.string().optional(),
  mergeStrategy: MergeStrategySchema.default("append"),
});

function rowToChapter(row: Record<string, any>): ManuscriptChapter {
  const contentHtml = typeof row.content_html === "string" ? row.content_html : "<p></p>";
  const contentText =
    typeof row.content_text === "string" ? row.content_text : stripHtmlToText(contentHtml);
  const contentJson =
    row.content_json && typeof row.content_json === "object"
      ? (row.content_json as Record<string, unknown>)
      : htmlToProseMirrorJson(contentHtml);
  return {
    id: row.id,
    bookId: row.book_id,
    parentId: row.parent_id ?? null,
    sectionType: row.section_type || "chapter",
    title: row.title || "Untitled Chapter",
    subtitle: row.subtitle ?? null,
    slug: row.slug || slugifyTitle(row.title || "chapter"),
    sortOrder: Number(row.sort_order ?? 0),
    contentJson,
    contentHtml,
    contentText,
    wordCount: Number(row.word_count ?? countWords(contentText)),
    status: row.status || "draft",
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}

function buildSpreadsFromChapters(book: BookDocument, chapters: ManuscriptChapter[]): BookSpread[] {
  const spreads: BookSpread[] = [];
  const bgColor = "#F7F4EE";
  const ordered = [...chapters].sort((a, b) => a.sortOrder - b.sortOrder);

  // Opening title spread
  const firstChapter = ordered[0];
  spreads.push({
    id: crypto.randomUUID(),
    spreadIndex: 0,
    leftPage: {
      id: crypto.randomUUID(),
      pageNumber: 1,
      layoutType: "editorial_chapter_title",
      backgroundColor: bgColor,
      elements: [
        {
          id: crypto.randomUUID(),
          type: "text",
          x: 12,
          y: 28,
          width: 76,
          height: 22,
          rotation: 0,
          zIndex: 1,
          content: book.title,
          style: { fontFamily: "Georgia, serif", fontSize: 28, color: "#20242C" },
        },
        ...(book.subtitle
          ? [
              {
                id: crypto.randomUUID(),
                type: "caption" as const,
                x: 14,
                y: 52,
                width: 72,
                height: 14,
                rotation: 0,
                zIndex: 2,
                content: book.subtitle,
                style: { fontFamily: "Georgia, serif", fontSize: 15, color: "#76556F" },
              },
            ]
          : []),
      ],
    },
    rightPage: firstChapter
      ? {
          id: crypto.randomUUID(),
          pageNumber: 2,
          layoutType: "editorial_chapter_title",
          backgroundColor: bgColor,
          elements: [
            {
              id: crypto.randomUUID(),
              type: "text",
              x: 10,
              y: 12,
              width: 80,
              height: 16,
              rotation: 0,
              zIndex: 1,
              content: firstChapter.title,
              style: { fontFamily: "Georgia, serif", fontSize: 22, color: "#20242C" },
            },
            {
              id: crypto.randomUUID(),
              type: "caption",
              x: 10,
              y: 30,
              width: 80,
              height: 58,
              rotation: 0,
              zIndex: 2,
              content: (firstChapter.contentText || stripHtmlToText(firstChapter.contentHtml)).slice(0, 720),
              style: { fontFamily: "Georgia, serif", fontSize: 14, color: "#20242C" },
            },
          ],
        }
      : null,
  });

  // Subsequent chapter spreads (2 pages per spread)
  const remaining = ordered.slice(1);
  for (let i = 0; i < remaining.length; i += 2) {
    const leftCh = remaining[i];
    const rightCh = remaining[i + 1];
    const spreadIdx = spreads.length;
    spreads.push({
      id: crypto.randomUUID(),
      spreadIndex: spreadIdx,
      leftPage: {
        id: crypto.randomUUID(),
        pageNumber: spreadIdx * 2 + 1,
        layoutType: "editorial_chapter_title",
        backgroundColor: bgColor,
        elements: [
          {
            id: crypto.randomUUID(),
            type: "text",
            x: 10,
            y: 12,
            width: 80,
            height: 16,
            rotation: 0,
            zIndex: 1,
            content: leftCh.title,
            style: { fontFamily: "Georgia, serif", fontSize: 22, color: "#20242C" },
          },
          {
            id: crypto.randomUUID(),
            type: "caption",
            x: 10,
            y: 30,
            width: 80,
            height: 58,
            rotation: 0,
            zIndex: 2,
            content: (leftCh.contentText || stripHtmlToText(leftCh.contentHtml)).slice(0, 720),
            style: { fontFamily: "Georgia, serif", fontSize: 14, color: "#20242C" },
          },
        ],
      },
      rightPage: rightCh
        ? {
            id: crypto.randomUUID(),
            pageNumber: spreadIdx * 2 + 2,
            layoutType: "editorial_chapter_title",
            backgroundColor: bgColor,
            elements: [
              {
                id: crypto.randomUUID(),
                type: "text",
                x: 10,
                y: 12,
                width: 80,
                height: 16,
                rotation: 0,
                zIndex: 1,
                content: rightCh.title,
                style: { fontFamily: "Georgia, serif", fontSize: 22, color: "#20242C" },
              },
              {
                id: crypto.randomUUID(),
                type: "caption",
                x: 10,
                y: 30,
                width: 80,
                height: 58,
                rotation: 0,
                zIndex: 2,
                content: (rightCh.contentText || stripHtmlToText(rightCh.contentHtml)).slice(0, 720),
                style: { fontFamily: "Georgia, serif", fontSize: 14, color: "#20242C" },
              },
            ],
          }
        : null,
    });
  }

  return spreads;
}

export function registerAuthorStudioRoutes(deps: AuthorStudioRouteDeps): void {
  const { app, db, dbUrl, bookRepo, requireAuthUser, assertSpaceAccess } = deps;

  // In-memory fallbacks for unit tests without PostgreSQL
  const memManuscripts = new Map<string, ManuscriptDocument>();
  const memRevisions = new Map<string, Array<BookRevision & { snapshot: Record<string, unknown> }>>();
  const memEditorStates = new Map<string, BookEditorState>();

  async function ensureManuscript(book: BookDocument): Promise<ManuscriptDocument> {
    if (!dbUrl) {
      let existing = memManuscripts.get(book.id);
      if (!existing) {
        const now = new Date().toISOString();
        const chId = crypto.randomUUID();
        const defaultHtml = "<p>Begin writing your heirloom story here.</p>";
        const defaultText = stripHtmlToText(defaultHtml);
        existing = {
          id: crypto.randomUUID(),
          bookId: book.id,
          spaceId: book.spaceId,
          schemaVersion: "1.0.0",
          trimSize: "6x9_trade",
          typographyPreset: "living_archive_serif",
          themePreset: "living_archive_ivory",
          languageCode: "en",
          authorName: "",
          dedication: "",
          epigraph: "",
          metadata: {},
          totalWordCount: countWords(defaultText),
          chapters: [
            {
              id: chId,
              bookId: book.id,
              parentId: null,
              sectionType: "chapter",
              title: "Chapter 1",
              subtitle: null,
              slug: "chapter-1",
              sortOrder: 0,
              contentJson: htmlToProseMirrorJson(defaultHtml),
              contentHtml: defaultHtml,
              contentText: defaultText,
              wordCount: countWords(defaultText),
              status: "draft",
              createdAt: now,
              updatedAt: now,
            },
          ],
          createdAt: now,
          updatedAt: now,
        };
        memManuscripts.set(book.id, existing);
      }
      return existing;
    }

    const msRes = await db.query(`SELECT * FROM book_manuscripts WHERE book_id = $1`, [book.id]);
    let msRow = msRes.rows[0];
    if (!msRow) {
      const msId = crypto.randomUUID();
      const inserted = await db.query(
        `INSERT INTO book_manuscripts (id, book_id, space_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (book_id) DO UPDATE SET updated_at = NOW()
         RETURNING *`,
        [msId, book.id, book.spaceId]
      );
      msRow = inserted.rows[0];
    }

    let chRes = await db.query(
      `SELECT * FROM book_chapters WHERE book_id = $1 ORDER BY sort_order ASC, created_at ASC`,
      [book.id]
    );

    if (chRes.rows.length === 0) {
      const defaultHtml = "<p>Begin writing your heirloom story here.</p>";
      const defaultText = stripHtmlToText(defaultHtml);
      const defaultJson = htmlToProseMirrorJson(defaultHtml);
      const wc = countWords(defaultText);
      await db.query(
        `INSERT INTO book_chapters
          (id, book_id, section_type, title, slug, sort_order, content_json, content_html, content_text, word_count, status)
         VALUES ($1, $2, 'chapter', 'Chapter 1', 'chapter-1', 0, $3::jsonb, $4, $5, $6, 'draft')`,
        [crypto.randomUUID(), book.id, JSON.stringify(defaultJson), defaultHtml, defaultText, wc]
      );
      await db.query(
        `UPDATE book_manuscripts SET total_word_count = $1, updated_at = NOW() WHERE book_id = $2`,
        [wc, book.id]
      );
      chRes = await db.query(
        `SELECT * FROM book_chapters WHERE book_id = $1 ORDER BY sort_order ASC, created_at ASC`,
        [book.id]
      );
    }

    const chapters = chRes.rows.map((r: Record<string, any>) => rowToChapter(r));
    const totalWordCount = chapters.reduce((acc, c) => acc + c.wordCount, 0);

    return {
      id: msRow.id,
      bookId: msRow.book_id,
      spaceId: msRow.space_id,
      schemaVersion: msRow.schema_version || "1.0.0",
      trimSize: msRow.trim_size || "6x9_trade",
      typographyPreset: msRow.typography_preset || "living_archive_serif",
      themePreset: msRow.theme_preset || "living_archive_ivory",
      languageCode: msRow.language_code || "en",
      authorName: msRow.author_name || "",
      dedication: msRow.dedication || "",
      epigraph: msRow.epigraph || "",
      metadata: (msRow.metadata_json && typeof msRow.metadata_json === "object"
        ? msRow.metadata_json
        : {}) as Record<string, unknown>,
      totalWordCount,
      chapters,
      createdAt: msRow.created_at ? new Date(msRow.created_at).toISOString() : new Date().toISOString(),
      updatedAt: msRow.updated_at ? new Date(msRow.updated_at).toISOString() : new Date().toISOString(),
    };
  }

  async function recomputeWordCount(bookId: string): Promise<number> {
    if (!dbUrl) {
      const ms = memManuscripts.get(bookId);
      if (!ms) return 0;
      ms.totalWordCount = ms.chapters.reduce((sum, ch) => sum + ch.wordCount, 0);
      ms.updatedAt = new Date().toISOString();
      return ms.totalWordCount;
    }
    const res = await db.query(
      `SELECT COALESCE(SUM(word_count), 0)::int AS total FROM book_chapters WHERE book_id = $1`,
      [bookId]
    );
    const total = Number(res.rows[0]?.total ?? 0);
    await db.query(
      `UPDATE book_manuscripts SET total_word_count = $1, updated_at = NOW() WHERE book_id = $2`,
      [total, bookId]
    );
    return total;
  }

  async function createRevisionSnapshot(
    book: BookDocument,
    manuscript: ManuscriptDocument,
    userId: string,
    label: string,
    sourceType: "manual" | "autosave" | "import" | "publish"
  ): Promise<BookRevision> {
    const snapshot = {
      manuscript: {
        trimSize: manuscript.trimSize,
        typographyPreset: manuscript.typographyPreset,
        themePreset: manuscript.themePreset,
        languageCode: manuscript.languageCode,
        authorName: manuscript.authorName,
        dedication: manuscript.dedication,
        epigraph: manuscript.epigraph,
        metadata: manuscript.metadata,
      },
      chapters: manuscript.chapters,
    };
    const serialized = JSON.stringify(snapshot);
    const checksumSha256 = crypto.createHash("sha256").update(serialized).digest("hex");
    const revId = crypto.randomUUID();
    const now = new Date().toISOString();

    const revision: BookRevision = {
      id: revId,
      bookId: book.id,
      createdBy: userId,
      label,
      sourceType,
      wordCount: manuscript.totalWordCount,
      checksumSha256,
      createdAt: now,
    };

    if (!dbUrl) {
      const list = memRevisions.get(book.id) || [];
      list.unshift({ ...revision, snapshot });
      memRevisions.set(book.id, list);
      return revision;
    }

    await db.query(
      `INSERT INTO book_revisions (id, book_id, created_by, label, source_type, snapshot_json, word_count, checksum_sha256)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)`,
      [revId, book.id, userId, label, sourceType, serialized, manuscript.totalWordCount, checksumSha256]
    );
    return revision;
  }

  async function getEditorState(bookId: string, userId: string): Promise<BookEditorState | null> {
    if (!dbUrl) {
      return memEditorStates.get(`${bookId}:${userId}`) ?? null;
    }
    const res = await db.query(
      `SELECT * FROM book_editor_state WHERE book_id = $1 AND user_id = $2`,
      [bookId, userId]
    );
    const row = res.rows[0];
    if (!row) return null;
    return {
      bookId: row.book_id,
      userId: row.user_id,
      activeEnvironment: row.active_environment || "write",
      activeChapterId: row.active_chapter_id ?? null,
      cursorOffset: Number(row.cursor_offset ?? 0),
      scrollOffset: Number(row.scroll_offset ?? 0),
      panelState: (row.panel_state_json && typeof row.panel_state_json === "object"
        ? row.panel_state_json
        : {}) as Record<string, unknown>,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    };
  }

  // 1. GET /api/v1/books/:id/manuscript
  app.get("/api/v1/books/:id/manuscript", async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const userId = await requireAuthUser(req);
    const book = await bookRepo.findBookById(req.params.id);
    if (!book) return reply.status(404).send(createErrorResponse("BOOK_NOT_FOUND", "Book does not exist"));
    await assertSpaceAccess(book.spaceId, userId, false);

    const manuscript = await ensureManuscript(book);
    const editorState = await getEditorState(book.id, userId);
    return reply.status(200).send(
      createSuccessResponse({
        book,
        manuscript,
        editorState,
      })
    );
  });

  // 2. PATCH /api/v1/books/:id/manuscript
  app.patch("/api/v1/books/:id/manuscript", async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const userId = await requireAuthUser(req);
    const book = await bookRepo.findBookById(req.params.id);
    if (!book) return reply.status(404).send(createErrorResponse("BOOK_NOT_FOUND", "Book does not exist"));
    await assertSpaceAccess(book.spaceId, userId, true);

    const parsed = UpdateManuscriptSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError("Invalid manuscript metadata update");
    }

    const ms = await ensureManuscript(book);
    const data = parsed.data;

    if (!dbUrl) {
      Object.assign(ms, {
        ...(data.trimSize !== undefined ? { trimSize: data.trimSize } : {}),
        ...(data.typographyPreset !== undefined ? { typographyPreset: data.typographyPreset } : {}),
        ...(data.themePreset !== undefined ? { themePreset: data.themePreset } : {}),
        ...(data.languageCode !== undefined ? { languageCode: data.languageCode } : {}),
        ...(data.authorName !== undefined ? { authorName: data.authorName } : {}),
        ...(data.dedication !== undefined ? { dedication: data.dedication } : {}),
        ...(data.epigraph !== undefined ? { epigraph: data.epigraph } : {}),
        ...(data.metadata !== undefined ? { metadata: data.metadata } : {}),
        updatedAt: new Date().toISOString(),
      });
      return reply.status(200).send(createSuccessResponse(ms));
    }

    await db.query(
      `UPDATE book_manuscripts
       SET trim_size = COALESCE($1, trim_size),
           typography_preset = COALESCE($2, typography_preset),
           theme_preset = COALESCE($3, theme_preset),
           language_code = COALESCE($4, language_code),
           author_name = COALESCE($5, author_name),
           dedication = COALESCE($6, dedication),
           epigraph = COALESCE($7, epigraph),
           metadata_json = COALESCE($8::jsonb, metadata_json),
           updated_at = NOW()
       WHERE book_id = $9`,
      [
        data.trimSize ?? null,
        data.typographyPreset ?? null,
        data.themePreset ?? null,
        data.languageCode ?? null,
        data.authorName ?? null,
        data.dedication ?? null,
        data.epigraph ?? null,
        data.metadata ? JSON.stringify(data.metadata) : null,
        book.id,
      ]
    );

    const updated = await ensureManuscript(book);
    return reply.status(200).send(createSuccessResponse(updated));
  });

  // 3. POST /api/v1/books/:id/manuscript/chapters
  app.post("/api/v1/books/:id/manuscript/chapters", async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const userId = await requireAuthUser(req);
    const book = await bookRepo.findBookById(req.params.id);
    if (!book) return reply.status(404).send(createErrorResponse("BOOK_NOT_FOUND", "Book does not exist"));
    await assertSpaceAccess(book.spaceId, userId, true);

    const parsed = CreateChapterSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError("Invalid chapter payload");
    }

    const ms = await ensureManuscript(book);
    const now = new Date().toISOString();
    const safeHtml = sanitizeManuscriptHtml(parsed.data.contentHtml || "<p></p>");
    const text = stripHtmlToText(safeHtml);
    const contentJson =
      parsed.data.contentJson && parsed.data.contentJson.type === "doc"
        ? parsed.data.contentJson
        : htmlToProseMirrorJson(safeHtml);
    const wordCount = countWords(text);
    const sortOrder = parsed.data.sortOrder ?? ms.chapters.length;
    const chapterId = crypto.randomUUID();
    const slug = slugifyTitle(parsed.data.title, `chapter-${sortOrder + 1}`);

    const chapter: ManuscriptChapter = {
      id: chapterId,
      bookId: book.id,
      parentId: null,
      sectionType: parsed.data.sectionType,
      title: parsed.data.title.trim(),
      subtitle: parsed.data.subtitle ?? null,
      slug,
      sortOrder,
      contentJson,
      contentHtml: safeHtml,
      contentText: text,
      wordCount,
      status: parsed.data.status,
      createdAt: now,
      updatedAt: now,
    };

    if (!dbUrl) {
      ms.chapters.push(chapter);
      await recomputeWordCount(book.id);
      return reply.status(201).send(createSuccessResponse(chapter));
    }

    await db.query(
      `INSERT INTO book_chapters
        (id, book_id, section_type, title, subtitle, slug, sort_order, content_json, content_html, content_text, word_count, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12)`,
      [
        chapter.id,
        book.id,
        chapter.sectionType,
        chapter.title,
        chapter.subtitle,
        chapter.slug,
        chapter.sortOrder,
        JSON.stringify(chapter.contentJson),
        chapter.contentHtml,
        chapter.contentText,
        chapter.wordCount,
        chapter.status,
      ]
    );
    await recomputeWordCount(book.id);
    return reply.status(201).send(createSuccessResponse(chapter));
  });

  // 4. PATCH /api/v1/books/:id/manuscript/chapters/:chapterId
  app.patch(
    "/api/v1/books/:id/manuscript/chapters/:chapterId",
    async (req: FastifyRequest<{ Params: { id: string; chapterId: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      const book = await bookRepo.findBookById(req.params.id);
      if (!book) return reply.status(404).send(createErrorResponse("BOOK_NOT_FOUND", "Book does not exist"));
      await assertSpaceAccess(book.spaceId, userId, true);

      const parsed = UpdateChapterSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError("Invalid chapter update payload");
      }

      const ms = await ensureManuscript(book);
      const existing = ms.chapters.find((c) => c.id === req.params.chapterId);
      if (!existing) {
        return reply.status(404).send(createErrorResponse("CHAPTER_NOT_FOUND", "Chapter does not exist"));
      }

      const nextTitle = parsed.data.title !== undefined ? parsed.data.title.trim() : existing.title;
      const nextSubtitle = parsed.data.subtitle !== undefined ? parsed.data.subtitle : existing.subtitle;
      const nextSectionType = parsed.data.sectionType ?? existing.sectionType;
      const nextStatus = parsed.data.status ?? existing.status;
      const nextSortOrder = parsed.data.sortOrder ?? existing.sortOrder;
      const nextHtml =
        parsed.data.contentHtml !== undefined
          ? sanitizeManuscriptHtml(parsed.data.contentHtml)
          : existing.contentHtml;
      const nextText = stripHtmlToText(nextHtml);
      const nextJson =
        parsed.data.contentJson && parsed.data.contentJson.type === "doc"
          ? parsed.data.contentJson
          : parsed.data.contentHtml !== undefined
            ? htmlToProseMirrorJson(nextHtml)
            : existing.contentJson;
      const nextWordCount = countWords(nextText);
      const nextSlug = slugifyTitle(nextTitle, existing.slug || "chapter");
      const now = new Date().toISOString();

      const updated: ManuscriptChapter = {
        ...existing,
        title: nextTitle,
        subtitle: nextSubtitle ?? null,
        sectionType: nextSectionType,
        status: nextStatus,
        sortOrder: nextSortOrder,
        slug: nextSlug,
        contentHtml: nextHtml,
        contentText: nextText,
        contentJson: nextJson,
        wordCount: nextWordCount,
        updatedAt: now,
      };

      if (!dbUrl) {
        const idx = ms.chapters.findIndex((c) => c.id === existing.id);
        ms.chapters[idx] = updated;
        await recomputeWordCount(book.id);
        return reply.status(200).send(createSuccessResponse(updated));
      }

      await db.query(
        `UPDATE book_chapters
         SET title = $1, subtitle = $2, section_type = $3, slug = $4, sort_order = $5,
             content_json = $6::jsonb, content_html = $7, content_text = $8, word_count = $9,
             status = $10, updated_at = NOW()
         WHERE id = $11 AND book_id = $12`,
        [
          updated.title,
          updated.subtitle,
          updated.sectionType,
          updated.slug,
          updated.sortOrder,
          JSON.stringify(updated.contentJson),
          updated.contentHtml,
          updated.contentText,
          updated.wordCount,
          updated.status,
          existing.id,
          book.id,
        ]
      );
      await recomputeWordCount(book.id);
      return reply.status(200).send(createSuccessResponse(updated));
    }
  );

  // 5. DELETE /api/v1/books/:id/manuscript/chapters/:chapterId
  app.delete(
    "/api/v1/books/:id/manuscript/chapters/:chapterId",
    async (req: FastifyRequest<{ Params: { id: string; chapterId: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      const book = await bookRepo.findBookById(req.params.id);
      if (!book) return reply.status(404).send(createErrorResponse("BOOK_NOT_FOUND", "Book does not exist"));
      await assertSpaceAccess(book.spaceId, userId, true);

      const ms = await ensureManuscript(book);
      if (ms.chapters.length <= 1) {
        return reply
          .status(409)
          .send(createErrorResponse("LAST_CHAPTER_REQUIRED", "A manuscript must retain at least one chapter"));
      }

      if (!dbUrl) {
        ms.chapters = ms.chapters
          .filter((c) => c.id !== req.params.chapterId)
          .map((c, idx) => ({ ...c, sortOrder: idx }));
        await recomputeWordCount(book.id);
        return reply.status(200).send(createSuccessResponse({ deleted: true }));
      }

      await db.query(`DELETE FROM book_chapters WHERE id = $1 AND book_id = $2`, [
        req.params.chapterId,
        book.id,
      ]);
      const remaining = await db.query(
        `SELECT id FROM book_chapters WHERE book_id = $1 ORDER BY sort_order ASC, created_at ASC`,
        [book.id]
      );
      for (let i = 0; i < remaining.rows.length; i += 1) {
        await db.query(`UPDATE book_chapters SET sort_order = $1 WHERE id = $2`, [i, remaining.rows[i].id]);
      }
      await recomputeWordCount(book.id);
      return reply.status(200).send(createSuccessResponse({ deleted: true }));
    }
  );

  // 6. PUT /api/v1/books/:id/manuscript/chapters/reorder
  app.put(
    "/api/v1/books/:id/manuscript/chapters/reorder",
    async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      const book = await bookRepo.findBookById(req.params.id);
      if (!book) return reply.status(404).send(createErrorResponse("BOOK_NOT_FOUND", "Book does not exist"));
      await assertSpaceAccess(book.spaceId, userId, true);

      const parsed = ReorderChaptersSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError("Invalid chapterIds reorder payload");
      }

      const ms = await ensureManuscript(book);
      const map = new Map(ms.chapters.map((c) => [c.id, c]));
      const ordered: ManuscriptChapter[] = [];
      for (const id of parsed.data.chapterIds) {
        const ch = map.get(id);
        if (ch) {
          ordered.push({ ...ch, sortOrder: ordered.length });
          map.delete(id);
        }
      }
      for (const ch of map.values()) {
        ordered.push({ ...ch, sortOrder: ordered.length });
      }

      if (!dbUrl) {
        ms.chapters = ordered;
        return reply.status(200).send(createSuccessResponse(ordered));
      }

      for (const ch of ordered) {
        await db.query(`UPDATE book_chapters SET sort_order = $1, updated_at = NOW() WHERE id = $2 AND book_id = $3`, [
          ch.sortOrder,
          ch.id,
          book.id,
        ]);
      }
      const refreshed = await ensureManuscript(book);
      return reply.status(200).send(createSuccessResponse(refreshed.chapters));
    }
  );

  // 7. POST /api/v1/books/:id/manuscript/sync-spreads (feeds real manuscript chapters into 3D Book Theater)
  app.post(
    "/api/v1/books/:id/manuscript/sync-spreads",
    async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      const book = await bookRepo.findBookById(req.params.id);
      if (!book) return reply.status(404).send(createErrorResponse("BOOK_NOT_FOUND", "Book does not exist"));
      await assertSpaceAccess(book.spaceId, userId, true);

      const ms = await ensureManuscript(book);
      const generatedSpreads = buildSpreadsFromChapters(book, ms.chapters);

      if (dbUrl) {
        await db.query(`DELETE FROM book_spreads WHERE book_id = $1`, [book.id]);
      }
      for (const spread of generatedSpreads) {
        await bookRepo.saveSpread(book.id, spread);
      }

      const updatedBook = (await bookRepo.findBookById(book.id)) || {
        ...book,
        spreads: generatedSpreads,
      };
      return reply.status(200).send(
        createSuccessResponse({
          book: updatedBook,
          spreadsGenerated: generatedSpreads.length,
        })
      );
    }
  );

  // 8. GET & PUT /api/v1/books/:id/manuscript/resume (exact per-user resume checkpoint)
  app.get("/api/v1/books/:id/manuscript/resume", async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const userId = await requireAuthUser(req);
    const book = await bookRepo.findBookById(req.params.id);
    if (!book) return reply.status(404).send(createErrorResponse("BOOK_NOT_FOUND", "Book does not exist"));
    await assertSpaceAccess(book.spaceId, userId, false);

    const state = await getEditorState(book.id, userId);
    return reply.status(200).send(createSuccessResponse(state));
  });

  app.put("/api/v1/books/:id/manuscript/resume", async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const userId = await requireAuthUser(req);
    const book = await bookRepo.findBookById(req.params.id);
    if (!book) return reply.status(404).send(createErrorResponse("BOOK_NOT_FOUND", "Book does not exist"));
    await assertSpaceAccess(book.spaceId, userId, false);

    const parsed = UpdateEditorStateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError("Invalid editor resume state payload");
    }

    const now = new Date().toISOString();
    const state: BookEditorState = {
      bookId: book.id,
      userId,
      activeEnvironment: parsed.data.activeEnvironment ?? "write",
      activeChapterId: parsed.data.activeChapterId ?? null,
      cursorOffset: parsed.data.cursorOffset ?? 0,
      scrollOffset: parsed.data.scrollOffset ?? 0,
      panelState: parsed.data.panelState ?? {},
      updatedAt: now,
    };

    if (!dbUrl) {
      memEditorStates.set(`${book.id}:${userId}`, state);
      return reply.status(200).send(createSuccessResponse(state));
    }

    await db.query(
      `INSERT INTO book_editor_state
        (book_id, user_id, active_environment, active_chapter_id, cursor_offset, scroll_offset, panel_state_json, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW())
       ON CONFLICT (book_id, user_id) DO UPDATE SET
         active_environment = EXCLUDED.active_environment,
         active_chapter_id = EXCLUDED.active_chapter_id,
         cursor_offset = EXCLUDED.cursor_offset,
         scroll_offset = EXCLUDED.scroll_offset,
         panel_state_json = EXCLUDED.panel_state_json,
         updated_at = NOW()`,
      [
        book.id,
        userId,
        state.activeEnvironment,
        state.activeChapterId,
        state.cursorOffset,
        state.scrollOffset,
        JSON.stringify(state.panelState),
      ]
    );
    return reply.status(200).send(createSuccessResponse(state));
  });

  // 9. Revisions: list, create, restore
  app.get("/api/v1/books/:id/manuscript/revisions", async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const userId = await requireAuthUser(req);
    const book = await bookRepo.findBookById(req.params.id);
    if (!book) return reply.status(404).send(createErrorResponse("BOOK_NOT_FOUND", "Book does not exist"));
    await assertSpaceAccess(book.spaceId, userId, false);

    if (!dbUrl) {
      const list = (memRevisions.get(book.id) || []).map(({ snapshot: _snap, ...rev }) => rev);
      return reply.status(200).send(createSuccessResponse(list));
    }

    const res = await db.query(
      `SELECT id, book_id as "bookId", created_by as "createdBy", label, source_type as "sourceType",
              word_count as "wordCount", checksum_sha256 as "checksumSha256", created_at::text as "createdAt"
       FROM book_revisions WHERE book_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [book.id]
    );
    return reply.status(200).send(createSuccessResponse(res.rows));
  });

  app.post("/api/v1/books/:id/manuscript/revisions", async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const userId = await requireAuthUser(req);
    const book = await bookRepo.findBookById(req.params.id);
    if (!book) return reply.status(404).send(createErrorResponse("BOOK_NOT_FOUND", "Book does not exist"));
    await assertSpaceAccess(book.spaceId, userId, true);

    const parsed = CreateRevisionSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new ValidationError("Invalid revision payload");
    }

    const ms = await ensureManuscript(book);
    const rev = await createRevisionSnapshot(book, ms, userId, parsed.data.label, parsed.data.sourceType);
    return reply.status(201).send(createSuccessResponse(rev));
  });

  app.post(
    "/api/v1/books/:id/manuscript/revisions/:revisionId/restore",
    async (req: FastifyRequest<{ Params: { id: string; revisionId: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      const book = await bookRepo.findBookById(req.params.id);
      if (!book) return reply.status(404).send(createErrorResponse("BOOK_NOT_FOUND", "Book does not exist"));
      await assertSpaceAccess(book.spaceId, userId, true);

      let snapshot: { manuscript?: Record<string, any>; chapters?: ManuscriptChapter[] } | null = null;
      if (!dbUrl) {
        const found = (memRevisions.get(book.id) || []).find((r) => r.id === req.params.revisionId);
        if (!found) {
          return reply.status(404).send(createErrorResponse("REVISION_NOT_FOUND", "Revision does not exist"));
        }
        snapshot = found.snapshot as any;
      } else {
        const res = await db.query(
          `SELECT snapshot_json FROM book_revisions WHERE id = $1 AND book_id = $2`,
          [req.params.revisionId, book.id]
        );
        if (res.rows.length === 0) {
          return reply.status(404).send(createErrorResponse("REVISION_NOT_FOUND", "Revision does not exist"));
        }
        snapshot = res.rows[0].snapshot_json;
      }

      const chaptersToRestore = Array.isArray(snapshot?.chapters) ? snapshot.chapters : [];
      if (!dbUrl) {
        const ms = await ensureManuscript(book);
        ms.chapters = chaptersToRestore.map((ch, idx) => ({ ...ch, sortOrder: idx }));
        await recomputeWordCount(book.id);
        return reply.status(200).send(createSuccessResponse(ms));
      }

      await db.query(`DELETE FROM book_chapters WHERE book_id = $1`, [book.id]);
      for (let i = 0; i < chaptersToRestore.length; i += 1) {
        const ch = chaptersToRestore[i];
        await db.query(
          `INSERT INTO book_chapters
            (id, book_id, section_type, title, subtitle, slug, sort_order, content_json, content_html, content_text, word_count, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12)`,
          [
            ch.id || crypto.randomUUID(),
            book.id,
            ch.sectionType || "chapter",
            ch.title || `Chapter ${i + 1}`,
            ch.subtitle ?? null,
            ch.slug || slugifyTitle(ch.title || `chapter-${i + 1}`),
            i,
            JSON.stringify(ch.contentJson || htmlToProseMirrorJson(ch.contentHtml || "<p></p>")),
            sanitizeManuscriptHtml(ch.contentHtml || "<p></p>"),
            ch.contentText || stripHtmlToText(ch.contentHtml || ""),
            ch.wordCount ?? countWords(ch.contentText || ""),
            ch.status || "draft",
          ]
        );
      }
      await recomputeWordCount(book.id);
      const restored = await ensureManuscript(book);
      return reply.status(200).send(createSuccessResponse(restored));
    }
  );

  // 10. POST /api/v1/books/:id/manuscript/import
  app.post(
    "/api/v1/books/:id/manuscript/import",
    { bodyLimit: MAX_IMPORT_BYTES * 2 },
    async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      const book = await bookRepo.findBookById(req.params.id);
      if (!book) return reply.status(404).send(createErrorResponse("BOOK_NOT_FOUND", "Book does not exist"));
      await assertSpaceAccess(book.spaceId, userId, true);

      const parsed = ImportManuscriptSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError("Invalid import payload: format and fileName are required");
      }

      const rawBuffer = parsed.data.contentBase64
        ? Buffer.from(parsed.data.contentBase64, "base64")
        : typeof parsed.data.contentText === "string"
          ? Buffer.from(parsed.data.contentText, "utf-8")
          : null;

      if (!rawBuffer || rawBuffer.length === 0) {
        throw new ValidationError("Import requires contentBase64 or contentText");
      }

      const currentMs = await ensureManuscript(book);
      // Automatically create a safety checkpoint before any import mutation
      await createRevisionSnapshot(
        book,
        currentMs,
        userId,
        `Pre-import checkpoint (${parsed.data.fileName})`,
        "import"
      );

      const imported = await parseImportedManuscript(
        parsed.data.format,
        parsed.data.fileName,
        rawBuffer
      );

      const now = new Date().toISOString();
      const importedWordCount = imported.chapters.reduce((sum, c) => sum + c.wordCount, 0);

      if (!dbUrl) {
        if (parsed.data.mergeStrategy === "replace") {
          currentMs.chapters = [];
        }
        const existingByTitle = new Map(
          currentMs.chapters.map((c) => [c.title.trim().toLowerCase(), c])
        );
        for (const ch of imported.chapters) {
          const match =
            parsed.data.mergeStrategy === "merge_by_title"
              ? existingByTitle.get(ch.title.trim().toLowerCase())
              : undefined;
          if (match) {
            match.contentHtml = ch.contentHtml;
            match.contentText = ch.contentText;
            match.contentJson = ch.contentJson;
            match.wordCount = ch.wordCount;
            match.updatedAt = now;
          } else {
            currentMs.chapters.push({
              id: crypto.randomUUID(),
              bookId: book.id,
              parentId: null,
              sectionType: ch.sectionType,
              title: ch.title,
              subtitle: ch.subtitle ?? null,
              slug: slugifyTitle(ch.title, `chapter-${currentMs.chapters.length + 1}`),
              sortOrder: currentMs.chapters.length,
              contentJson: ch.contentJson,
              contentHtml: ch.contentHtml,
              contentText: ch.contentText,
              wordCount: ch.wordCount,
              status: "draft",
              createdAt: now,
              updatedAt: now,
            });
          }
        }
        if (imported.manuscriptMetadata) {
          Object.assign(currentMs, imported.manuscriptMetadata);
        }
        await recomputeWordCount(book.id);
        return reply.status(200).send(
          createSuccessResponse({
            manuscript: currentMs,
            importedChapters: imported.chapters.length,
            importedWordCount,
            warnings: imported.warnings,
          })
        );
      }

      if (parsed.data.mergeStrategy === "replace") {
        await db.query(`DELETE FROM book_chapters WHERE book_id = $1`, [book.id]);
      }

      const existingRows = await db.query(
        `SELECT id, title, sort_order FROM book_chapters WHERE book_id = $1 ORDER BY sort_order ASC`,
        [book.id]
      );
      const existingByTitle = new Map<string, string>(
        existingRows.rows.map((r: any) => [String(r.title).trim().toLowerCase(), String(r.id)])
      );
      let nextOrder = existingRows.rows.length;

      for (const ch of imported.chapters) {
        const matchId =
          parsed.data.mergeStrategy === "merge_by_title"
            ? existingByTitle.get(ch.title.trim().toLowerCase())
            : undefined;
        if (matchId) {
          await db.query(
            `UPDATE book_chapters
             SET content_json = $1::jsonb, content_html = $2, content_text = $3, word_count = $4, updated_at = NOW()
             WHERE id = $5 AND book_id = $6`,
            [JSON.stringify(ch.contentJson), ch.contentHtml, ch.contentText, ch.wordCount, matchId, book.id]
          );
        } else {
          await db.query(
            `INSERT INTO book_chapters
              (id, book_id, section_type, title, subtitle, slug, sort_order, content_json, content_html, content_text, word_count, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, 'draft')`,
            [
              crypto.randomUUID(),
              book.id,
              ch.sectionType,
              ch.title,
              ch.subtitle ?? null,
              slugifyTitle(ch.title, `chapter-${nextOrder + 1}`),
              nextOrder,
              JSON.stringify(ch.contentJson),
              ch.contentHtml,
              ch.contentText,
              ch.wordCount,
            ]
          );
          nextOrder += 1;
        }
      }

      if (imported.manuscriptMetadata) {
        const meta = imported.manuscriptMetadata;
        await db.query(
          `UPDATE book_manuscripts
           SET trim_size = COALESCE($1, trim_size),
               typography_preset = COALESCE($2, typography_preset),
               theme_preset = COALESCE($3, theme_preset),
               language_code = COALESCE($4, language_code),
               author_name = COALESCE($5, author_name),
               dedication = COALESCE($6, dedication),
               epigraph = COALESCE($7, epigraph),
               updated_at = NOW()
           WHERE book_id = $8`,
          [
            meta.trimSize ?? null,
            meta.typographyPreset ?? null,
            meta.themePreset ?? null,
            meta.languageCode ?? null,
            meta.authorName ?? null,
            meta.dedication ?? null,
            meta.epigraph ?? null,
            book.id,
          ]
        );
      }

      await db.query(
        `INSERT INTO book_import_jobs
          (id, book_id, space_id, created_by, format, source_filename, merge_strategy, status, chapters_imported, word_count, warnings_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', $8, $9, $10::jsonb)`,
        [
          crypto.randomUUID(),
          book.id,
          book.spaceId,
          userId,
          parsed.data.format,
          parsed.data.fileName,
          parsed.data.mergeStrategy,
          imported.chapters.length,
          importedWordCount,
          JSON.stringify(imported.warnings),
        ]
      );

      await recomputeWordCount(book.id);
      const updatedMs = await ensureManuscript(book);
      return reply.status(200).send(
        createSuccessResponse({
          manuscript: updatedMs,
          importedChapters: imported.chapters.length,
          importedWordCount,
          warnings: imported.warnings,
        })
      );
    }
  );

  // 11. GET /api/v1/books/:id/manuscript/export?format=memoria|docx|epub|html|markdown|txt|pdf
  app.get(
    "/api/v1/books/:id/manuscript/export",
    async (req: FastifyRequest<{ Params: { id: string }; Querystring: { format?: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      const book = await bookRepo.findBookById(req.params.id);
      if (!book) return reply.status(404).send(createErrorResponse("BOOK_NOT_FOUND", "Book does not exist"));
      await assertSpaceAccess(book.spaceId, userId, false);

      const formatParsed = ExportFormatSchema.safeParse(req.query?.format || "memoria");
      if (!formatParsed.success) {
        throw new ValidationError("Unsupported export format");
      }

      const ms = await ensureManuscript(book);
      const artifact = await exportManuscriptArtifact(formatParsed.data, book, ms);

      if (dbUrl) {
        await db.query(
          `INSERT INTO book_export_jobs (id, book_id, space_id, created_by, format, status, checksum_sha256, byte_size)
           VALUES ($1, $2, $3, $4, $5, 'completed', $6, $7)`,
          [
            crypto.randomUUID(),
            book.id,
            book.spaceId,
            userId,
            artifact.format,
            artifact.checksumSha256,
            artifact.buffer.byteLength,
          ]
        );
      }

      return reply
        .header("Content-Type", artifact.mimeType)
        .header("Content-Disposition", `attachment; filename="${artifact.fileName}"`)
        .header("X-Memoria-Checksum-Sha256", artifact.checksumSha256)
        .header("Cache-Control", "no-store")
        .status(200)
        .send(artifact.buffer);
    }
  );
}
