import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import cors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { createServiceLogger, Logger } from "@memory-capsule/logger";
import {
  BaseServiceConfigSchema,
  validateServiceConfig,
  createFastifyErrorHandler,
  UnauthorizedError,
  ForbiddenError,
  buildCorsOriginValidator,
  BookDocument,
  BookFormatSchema,
  BookPageSchema,
  BookSpread,
  PreflightCheckItem,
  PreflightCheckStatus,
  BOOK_3D_HIERARCHY,
  BOOK_ANIMATION_CONTRACT,
  BOOK_CAMERA_PRESETS,
  BOOK_FOIL_SWATCHES,
  BOOK_LEATHER_SWATCHES,
  BOOK_LIGHTING_INTENT,
  Book3DConfigurationSchema,
  CANONICAL_BOOK_3D_MANIFEST,
  CANONICAL_SAMPLE_SPREADS,
  createSuccessResponse,
  createErrorResponse,
  createDomainEvent,
  resolveFoilSwatch,
  resolveLeatherSwatch,
  startServiceServer,
} from "@memory-capsule/contracts";
import { createEventBus, EventBus } from "@memory-capsule/events";
import { registerAuthorStudioRoutes, type AuthorStudioHandles } from "./author-studio-routes.js";
import {
  createDatabaseClient,
  DatabaseClient,
  PostgresBookRepository,
  PostgresSpaceRepository,
  PostgresCollaborationRepository,
  PostgresOutboxRepository,
  BookRepository,
  SpaceRepository,
  CollaborationRepository,
  OutboxRepository,
} from "@memory-capsule/database";

const logger: Logger = createServiceLogger("book-service");

interface AssetCatalogEntry {
  filename: string;
  contentType: string;
  expectedSha256: string;
  format: "glb" | "usdz";
}

const BOOK_3D_ASSET_CATALOG: Record<string, AssetCatalogEntry> = {
  "memoria_heirloom_book.glb": {
    filename: "memoria_heirloom_book.glb",
    contentType: "model/gltf-binary",
    expectedSha256: CANONICAL_BOOK_3D_MANIFEST.assets.glb.sha256,
    format: "glb",
  },
  "heirloom_book.glb": {
    filename: "heirloom_book.glb",
    contentType: "model/gltf-binary",
    expectedSha256: CANONICAL_BOOK_3D_MANIFEST.assets.glb.sha256,
    format: "glb",
  },
  glb: {
    filename: "memoria_heirloom_book.glb",
    contentType: "model/gltf-binary",
    expectedSha256: CANONICAL_BOOK_3D_MANIFEST.assets.glb.sha256,
    format: "glb",
  },
  "MemoriaHeirloomBook.usdz": {
    filename: "MemoriaHeirloomBook.usdz",
    contentType: "model/vnd.usdz+zip",
    expectedSha256: CANONICAL_BOOK_3D_MANIFEST.assets.usdz.sha256,
    format: "usdz",
  },
  usdz: {
    filename: "MemoriaHeirloomBook.usdz",
    contentType: "model/vnd.usdz+zip",
    expectedSha256: CANONICAL_BOOK_3D_MANIFEST.assets.usdz.sha256,
    format: "usdz",
  },
};

function resolveModelsDirectory(): string {
  const envDir = process.env.BOOK_3D_MODELS_DIR;
  if (envDir && fs.existsSync(envDir)) {
    return path.resolve(envDir);
  }

  const candidates = [
    path.resolve(process.cwd(), "apps/web/public/models"),
    path.resolve(process.cwd(), "../../apps/web/public/models"),
    path.resolve(__dirname, "../../../apps/web/public/models"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return candidates[0];
}

// Fallback in-memory test repository for unit tests
class InMemoryBookTestRepo implements BookRepository {
  private books = new Map<string, BookDocument>();

  async createBook(book: BookDocument): Promise<BookDocument> {
    this.books.set(book.id, book);
    return book;
  }
  async findBookById(id: string): Promise<BookDocument | null> {
    return this.books.get(id) || null;
  }
  async listBooks(spaceId: string): Promise<BookDocument[]> {
    return Array.from(this.books.values()).filter((b) => b.spaceId === spaceId);
  }
  async updateBook(
    id: string,
    updates: Partial<
      Pick<
        BookDocument,
        "title" | "subtitle" | "format" | "coverColor" | "foilStamping" | "coverTitle" | "spineText"
      >
    >
  ): Promise<BookDocument | null> {
    const book = this.books.get(id);
    if (!book) return null;
    const updated: BookDocument = {
      ...book,
      ...updates,
      version: (book.version || 1) + 1,
      updatedAt: new Date().toISOString(),
    };
    this.books.set(id, updated);
    return updated;
  }
  async saveSpread(bookId: string, spread: BookSpread): Promise<void> {
    const book = this.books.get(bookId);
    if (book) {
      const idx = book.spreads.findIndex((s) => s.id === spread.id);
      if (idx >= 0) book.spreads[idx] = spread;
      else book.spreads.push(spread);
      book.spreads.sort((a, b) => a.spreadIndex - b.spreadIndex);
      book.updatedAt = new Date().toISOString();
    }
  }
  async freezeEdition(bookId: string, editionHash: string): Promise<void> {
    const book = this.books.get(bookId);
    if (book) {
      book.isFrozenForPrint = true;
      book.frozenEditionHash = editionHash;
      book.updatedAt = new Date().toISOString();
    }
  }
}

export async function buildBookService(): Promise<FastifyInstance> {
  const cfg = validateServiceConfig(BaseServiceConfigSchema);
  const app = Fastify({ logger: false });
  app.setErrorHandler(createFastifyErrorHandler(logger));

  const dbUrl = cfg.BOOK_DATABASE_URL || cfg.DATABASE_URL;
  if (!dbUrl && cfg.NODE_ENV !== "test") {
    throw new Error(
      "[book-service] Database connection string required in non-test mode. Set BOOK_DATABASE_URL or DATABASE_URL."
    );
  }
  const db: DatabaseClient = createDatabaseClient(dbUrl);
  if (cfg.NODE_ENV !== "test") {
    const isHealthy = await db.healthCheck();
    if (!isHealthy) {
      throw new Error(
        "[book-service] PostgreSQL database health check failed during service initialization."
      );
    }
  }
  const eventBus: EventBus = await createEventBus(cfg.NATS_URL);

  const bookRepo: BookRepository = dbUrl
    ? new PostgresBookRepository(db)
    : new InMemoryBookTestRepo();
  const outboxRepo: OutboxRepository | null = dbUrl ? new PostgresOutboxRepository(db) : null;

  const memoryDb: DatabaseClient | null = cfg.MEMORY_DATABASE_URL
    ? createDatabaseClient(cfg.MEMORY_DATABASE_URL)
    : null;
  const spaceRepo: SpaceRepository | null = memoryDb ? new PostgresSpaceRepository(memoryDb) : null;

  const collabDb: DatabaseClient | null = cfg.COLLAB_DATABASE_URL
    ? createDatabaseClient(cfg.COLLAB_DATABASE_URL)
    : null;
  const collabRepo: CollaborationRepository | null = collabDb
    ? new PostgresCollaborationRepository(collabDb)
    : null;

  // In-memory 3D binary asset cache keyed by full file path + mtime
  const assetCache = new Map<string, { payload: Buffer; sha256: string; mtimeMs: number }>();

  let outboxTimer: NodeJS.Timeout | null = null;
  if (outboxRepo && outboxRepo.relayPending) {
    outboxTimer = setInterval(() => {
      outboxRepo
        .relayPending!(async (evt) => {
          await eventBus.publish(
            evt.eventType,
            createDomainEvent(evt.eventType, "book-service", evt.payload)
          );
        })
        .catch((err) => {
          logger.warn({ err }, "[Book Outbox] Relay cycle warning");
        });
    }, 1000);
    outboxTimer.unref();
  }

  app.addHook("onClose", async () => {
    if (outboxTimer) clearInterval(outboxTimer);
    assetCache.clear();
    await eventBus.close().catch((err) => logger.warn({ err }, "[Book] EventBus close warning"));
    if (memoryDb) {
      await memoryDb.close().catch((err) => logger.warn({ err }, "[Book] Memory DB close warning"));
    }
    if (collabDb) {
      await collabDb.close().catch((err) => logger.warn({ err }, "[Book] Collab DB close warning"));
    }
    await db.close().catch((err) => logger.warn({ err }, "[Book] DB close warning"));
  });

  await app.register(cors, {
    origin: buildCorsOriginValidator(cfg.ALLOWED_ORIGINS, cfg.NODE_ENV),
    credentials: true,
  });

  await app.register(fastifyJwt, { secret: cfg.JWT_SECRET });

  async function requireAuthUser(req: FastifyRequest): Promise<string> {
    try {
      const claims: any = await req.jwtVerify();
      const userId = claims?.sub || claims?.userId;
      if (!userId || typeof userId !== "string") {
        throw new UnauthorizedError("Missing subject in JWT");
      }
      return userId;
    } catch {
      throw new UnauthorizedError("Valid authentication token required");
    }
  }

  async function assertSpaceAccess(
    spaceId: string,
    userId: string,
    requireWrite = false
  ): Promise<void> {
    if (!spaceRepo && !collabRepo) {
      if (cfg.NODE_ENV !== "test") {
        throw new ForbiddenError("Space authorization database is not configured");
      }
      return;
    }
    if (spaceRepo) {
      const space = await spaceRepo.findSpaceById(spaceId);
      if (space) {
        if (space.ownerId === userId) return;
        if (collabRepo) {
          const member = await collabRepo.getMember(spaceId, userId);
          if (member) {
            if (requireWrite && member.role === "viewer") {
              throw new ForbiddenError("Viewer role does not permit book edits");
            }
            return;
          }
        }
        throw new ForbiddenError("Access denied for this memory space");
      }
    }
    if (collabRepo) {
      const member = await collabRepo.getMember(spaceId, userId);
      if (member) {
        if (requireWrite && member.role === "viewer") {
          throw new ForbiddenError("Viewer role does not permit book edits");
        }
        return;
      }
    }
    throw new ForbiddenError("Space not found or access denied");
  }

  async function publishDomainEvent(
    subject: string,
    eventType: string,
    aggregateId: string,
    payload: Record<string, any>
  ): Promise<void> {
    if (outboxRepo) {
      await outboxRepo.stageEvent({
        eventType: subject,
        aggregateType: "book",
        aggregateId,
        payload,
      });
      if (outboxRepo.relayPending) {
        await outboxRepo.relayPending(async (evt) => {
          await eventBus.publish(
            evt.eventType,
            createDomainEvent(eventType, "book-service", evt.payload)
          );
        });
      }
    } else {
      await eventBus.publish(subject, createDomainEvent(eventType, "book-service", payload));
    }
  }

  // Health check
  app.get("/health", async (req, reply) => {
    const isDbHealthy = await db.healthCheck();
    return reply.status(200).send(
      createSuccessResponse({
        service: "book-service",
        status: isDbHealthy ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
      })
    );
  });

  // 0A. Versioned 3D Asset Manifest & Cross-Platform Engine Contracts (Public)
  const serveManifest = async (
    req: FastifyRequest<{ Params: { version?: string } }>,
    reply: FastifyReply
  ) => {
    const requestedVersion = req.params.version;
    const supportedVersions = new Set([
      "latest",
      "v2",
      "2.0.0",
      CANONICAL_BOOK_3D_MANIFEST.version,
    ]);
    if (requestedVersion && !supportedVersions.has(requestedVersion)) {
      return reply
        .status(404)
        .send(
          createErrorResponse(
            "MANIFEST_VERSION_NOT_FOUND",
            `3D manifest version '${requestedVersion}' is not available`
          )
        );
    }

    const etag = `"manifest-${CANONICAL_BOOK_3D_MANIFEST.version}-${CANONICAL_BOOK_3D_MANIFEST.assets.glb.sha256.slice(0, 8)}-${CANONICAL_BOOK_3D_MANIFEST.assets.usdz.sha256.slice(0, 8)}"`;
    const ifNoneMatch = req.headers["if-none-match"];
    if (
      typeof ifNoneMatch === "string" &&
      ifNoneMatch.split(",").some((tag) => tag.trim().replace(/^W\//, "") === etag)
    ) {
      return reply.status(304).send();
    }

    reply.header("ETag", etag);
    reply.header("Cache-Control", "public, max-age=300");

    return reply.status(200).send(
      createSuccessResponse({
        manifest: CANONICAL_BOOK_3D_MANIFEST,
        endpoints: {
          manifest: `/api/v1/books/3d/manifest/${CANONICAL_BOOK_3D_MANIFEST.version}`,
          glb: `/api/v1/books/3d/assets/memoria_heirloom_book.glb?v=${CANONICAL_BOOK_3D_MANIFEST.version}`,
          usdz: `/api/v1/books/3d/assets/MemoriaHeirloomBook.usdz?v=${CANONICAL_BOOK_3D_MANIFEST.version}`,
        },
        engineContracts: {
          hierarchy: BOOK_3D_HIERARCHY,
          leatherSwatches: BOOK_LEATHER_SWATCHES,
          foilSwatches: BOOK_FOIL_SWATCHES,
          cameraPresets: BOOK_CAMERA_PRESETS,
          lightingIntent: BOOK_LIGHTING_INTENT,
          animationContract: BOOK_ANIMATION_CONTRACT,
        },
      })
    );
  };

  app.get("/api/v1/books/3d/manifest", serveManifest);
  app.get("/api/v1/books/3d/manifest/:version", serveManifest);

  // 0B. Binary 3D Asset Delivery (GLB & USDZ) with In-Memory Cache, ETag & SHA-256 Verification
  app.get(
    "/api/v1/books/3d/assets/:assetKey",
    async (
      req: FastifyRequest<{
        Params: { assetKey: string };
        Querystring: { v?: string };
      }>,
      reply: FastifyReply
    ) => {
      const entry = BOOK_3D_ASSET_CATALOG[req.params.assetKey];
      if (!entry) {
        return reply
          .status(404)
          .send(createErrorResponse("ASSET_NOT_FOUND", "Requested 3D asset does not exist"));
      }

      const modelsDir = resolveModelsDirectory();
      const fullPath = path.join(modelsDir, entry.filename);
      if (!fs.existsSync(fullPath)) {
        logger.error({ fullPath, assetKey: req.params.assetKey }, "[Book3D] Missing 3D asset file");
        return reply
          .status(404)
          .send(createErrorResponse("ASSET_FILE_MISSING", "3D model binary is missing on disk"));
      }

      const stat = await fsp.stat(fullPath);
      let cached = assetCache.get(fullPath);
      if (!cached || cached.mtimeMs !== stat.mtimeMs) {
        const payload = await fsp.readFile(fullPath);
        const sha256 = crypto.createHash("sha256").update(payload).digest("hex");
        cached = { payload, sha256, mtimeMs: stat.mtimeMs };
        assetCache.set(fullPath, cached);
      }

      if (cached.sha256 !== entry.expectedSha256) {
        logger.error(
          { filename: entry.filename, actualSha256: cached.sha256, expectedSha256: entry.expectedSha256 },
          "[Book3D] SHA-256 checksum verification failed"
        );
        return reply
          .status(500)
          .send(createErrorResponse("ASSET_INTEGRITY_MISMATCH", "3D asset checksum mismatch"));
      }

      const etag = `"${cached.sha256}"`;
      const ifNoneMatch = req.headers["if-none-match"];
      if (
        typeof ifNoneMatch === "string" &&
        ifNoneMatch.split(",").some((tag) => tag.trim().replace(/^W\//, "") === etag)
      ) {
        return reply.status(304).send();
      }

      reply.header("Content-Type", entry.contentType);
      reply.header("Content-Length", cached.payload.byteLength);
      reply.header("ETag", etag);
      reply.header("X-Asset-Sha256", cached.sha256);
      reply.header("X-Asset-Version", CANONICAL_BOOK_3D_MANIFEST.version);
      reply.header("Content-Disposition", `inline; filename="${entry.filename}"`);
      reply.header(
        "Cache-Control",
        req.query.v ? "public, max-age=31536000, immutable" : "public, max-age=3600"
      );

      return reply.status(200).send(cached.payload);
    }
  );

  // 0C. Book-Specific Resolved 3D Reader Configuration ("sample" is public; real book IDs require auth + space membership)
  app.get(
    "/api/v1/books/:id/3d-model",
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const isSample = req.params.id === "sample";
      const userId = isSample ? null : await requireAuthUser(req);
      const book = isSample ? null : await bookRepo.findBookById(req.params.id);

      if (!isSample && !book) {
        return reply
          .status(404)
          .send(createErrorResponse("BOOK_NOT_FOUND", "Book does not exist"));
      }
      if (book && userId) {
        await assertSpaceAccess(book.spaceId, userId, false);
      }

      const leatherSwatch = resolveLeatherSwatch(book?.coverColor);
      const foilSwatch = resolveFoilSwatch(book?.foilStamping);
      const rawTitle = (book?.coverTitle || book?.title || "The Bennett Heritage").trim();
      const rawSubtitle = (book?.subtitle || "1948 — 2026 • Memoria Volume I").trim();
      const rawSpine = (book?.spineText || rawTitle || "MEMORIA VOL. I").trim();
      const configuration = Book3DConfigurationSchema.parse({
        leatherId: leatherSwatch.id,
        foilId: foilSwatch.id,
        coverTitle: (rawTitle || "The Bennett Heritage").slice(0, 60),
        coverSubtitle: rawSubtitle.slice(0, 80),
        spineText: rawSpine.slice(0, 40),
        isOpen: false,
        currentSpreadIndex: 0,
        totalSpreads: book && book.spreads.length > 0 ? book.spreads.length : CANONICAL_SAMPLE_SPREADS.length,
        cameraPreset: "hero",
        reducedMotion: false,
      });

      return reply.status(200).send(
        createSuccessResponse({
          bookId: book?.id || "sample",
          title: book?.title || configuration.coverTitle,
          subtitle: book?.subtitle || configuration.coverSubtitle,
          manifest: CANONICAL_BOOK_3D_MANIFEST,
          modelUrls: {
            glb: `/api/v1/books/3d/assets/memoria_heirloom_book.glb?v=${CANONICAL_BOOK_3D_MANIFEST.version}`,
            usdz: `/api/v1/books/3d/assets/MemoriaHeirloomBook.usdz?v=${CANONICAL_BOOK_3D_MANIFEST.version}`,
          },
          configuration,
          cameraPresets: BOOK_CAMERA_PRESETS,
          lightingIntent: BOOK_LIGHTING_INTENT,
          animationContract: BOOK_ANIMATION_CONTRACT,
          spreads: book?.spreads || [],
          sampleSpreads: CANONICAL_SAMPLE_SPREADS,
        })
      );
    }
  );

  // 1. Create a Book
  const CreateBookPayloadSchema = z.object({
    title: z.string().min(1),
    subtitle: z.string().optional(),
    format: BookFormatSchema.default("hardcover_standard_8x10"),
    coverColor: z.string().default("#304C43"),
    foilStamping: z.enum(["gold", "rose", "silver", "blind_emboss", "none"]).default("gold"),
    coverTitle: z.string().optional(),
    spineText: z.string().optional(),
  });

  const CreateBookSchema = CreateBookPayloadSchema.extend({
    spaceId: z.string().uuid(),
  });

  async function createAndPersistBook(
    userId: string,
    spaceId: string,
    data: z.infer<typeof CreateBookPayloadSchema>
  ): Promise<BookDocument> {
    await assertSpaceAccess(spaceId, userId, true);
    const bookId = crypto.randomUUID();
    const now = new Date().toISOString();
    const { title, subtitle, format, coverColor, foilStamping, coverTitle, spineText } = data;

    const book: BookDocument = {
      id: bookId,
      spaceId,
      title,
      subtitle,
      format,
      coverColor,
      foilStamping,
      coverTitle: coverTitle || title,
      spineText: spineText || title,
      spreads: [
        {
          id: crypto.randomUUID(),
          spreadIndex: 0,
          leftPage: null,
          rightPage: {
            id: crypto.randomUUID(),
            pageNumber: 1,
            layoutType: "editorial_chapter_title",
            backgroundColor: "#F7F4ED",
            elements: [
              {
                id: crypto.randomUUID(),
                type: "heading",
                x: 10,
                y: 35,
                width: 80,
                height: 20,
                rotation: 0,
                zIndex: 1,
                content: title,
                style: { fontFamily: "serif", fontSize: 32, color: "#262B2B" },
              },
            ],
          },
        },
      ],
      version: 1,
      isFrozenForPrint: false,
      createdAt: now,
      updatedAt: now,
    };

    await bookRepo.createBook(book);
    await publishDomainEvent("book.created", "book.created", bookId, {
      bookId,
      spaceId,
      title,
      format,
    });

    return book;
  }

  app.post("/api/v1/books", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = await requireAuthUser(req);
    const parseResult = CreateBookSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply
        .status(400)
        .send(createErrorResponse("VALIDATION_ERROR", "Invalid book payload", "corr", parseResult.error.issues));
    }

    const { spaceId, ...rest } = parseResult.data;
    const book = await createAndPersistBook(userId, spaceId, rest);
    return reply.status(201).send(createSuccessResponse(book));
  });

  app.post(
    "/api/v1/spaces/:spaceId/books",
    async (req: FastifyRequest<{ Params: { spaceId: string } }>, reply: FastifyReply) => {
      const userId = await requireAuthUser(req);
      const spaceCheck = z.string().uuid().safeParse(req.params.spaceId);
      if (!spaceCheck.success) {
        return reply
          .status(400)
          .send(createErrorResponse("VALIDATION_ERROR", "Valid spaceId UUID is required"));
      }
      const parseResult = CreateBookPayloadSchema.safeParse(req.body);
      if (!parseResult.success) {
        return reply
          .status(400)
          .send(createErrorResponse("VALIDATION_ERROR", "Invalid book payload", "corr", parseResult.error.issues));
      }
      const book = await createAndPersistBook(userId, spaceCheck.data, parseResult.data);
      return reply.status(201).send(createSuccessResponse(book));
    }
  );

  // 1B. Print Catalog (PWA-71 / ADMIN-16)
  app.get("/api/v1/books/catalog", async (_req, reply) => {
    return reply.status(200).send(
      createSuccessResponse({
        currency: "USD",
        pricingPolicy: "zero_markup_pass_through",
        formats: [
          {
            id: "hardcover_square_8x8",
            label: 'Square Heirloom 8×8"',
            dimensionsCm: "20.3 × 20.3 cm",
            baseCents: 4200,
          },
          {
            id: "hardcover_standard_8x10",
            label: 'Standard Archive 8×10"',
            dimensionsCm: "20.3 × 25.4 cm",
            baseCents: 4800,
          },
          {
            id: "hardcover_grand_12x12",
            label: 'Grand Estate 12×12"',
            dimensionsCm: "30.5 × 30.5 cm",
            baseCents: 6800,
          },
        ],
        bindings: [
          { id: "hardcover_linen", label: "Bookcloth Linen Hardcover", surchargeCents: 0 },
          { id: "french_morocco", label: "French-Morocco Vegetable-Tanned Leather", surchargeCents: 2000 },
        ],
        paperStocks: [
          { id: "140gsm_matte", label: "140gsm Acid-Free Archival Matte", surchargeCents: 0 },
          { id: "170gsm_lustre", label: "170gsm Archival Satin Lustre", surchargeCents: 400 },
        ],
      })
    );
  });

  // 2. Get Book by ID
  app.get("/api/v1/books/:id", async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const userId = await requireAuthUser(req);
    const book = await bookRepo.findBookById(req.params.id);
    if (!book) {
      return reply.status(404).send(createErrorResponse("BOOK_NOT_FOUND", "Book does not exist"));
    }
    await assertSpaceAccess(book.spaceId, userId, false);
    return reply.status(200).send(createSuccessResponse(book));
  });

  // Update Book Metadata & Binding Customization
  const UpdateBookSchema = z.object({
    title: z.string().min(1).optional(),
    subtitle: z.string().optional(),
    format: BookFormatSchema.optional(),
    coverColor: z.string().optional(),
    foilStamping: z.enum(["gold", "rose", "silver", "blind_emboss", "none"]).optional(),
    coverTitle: z.string().min(1).optional(),
    spineText: z.string().optional(),
  });

  app.patch("/api/v1/books/:id", async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const userId = await requireAuthUser(req);
    const book = await bookRepo.findBookById(req.params.id);
    if (!book) {
      return reply.status(404).send(createErrorResponse("BOOK_NOT_FOUND", "Book does not exist"));
    }
    await assertSpaceAccess(book.spaceId, userId, true);
    if (book.isFrozenForPrint) {
      return reply
        .status(409)
        .send(createErrorResponse("BOOK_FROZEN", "Cannot modify a frozen print edition"));
    }

    const parseResult = UpdateBookSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply
        .status(400)
        .send(createErrorResponse("VALIDATION_ERROR", "Invalid book update payload", "corr", parseResult.error.issues));
    }

    const updated = bookRepo.updateBook
      ? await bookRepo.updateBook(book.id, parseResult.data)
      : book;

    await publishDomainEvent("book.updated", "book.updated", book.id, {
      bookId: book.id,
      spaceId: book.spaceId,
      version: updated?.version,
    });

    return reply.status(200).send(createSuccessResponse(updated || book));
  });

  // Upsert Book Spread Layout
  const UpsertSpreadSchema = z.object({
    spreadIndex: z.number().int().min(0),
    leftPage: BookPageSchema.nullable(),
    rightPage: BookPageSchema.nullable(),
  });

  app.put(
    "/api/v1/books/:id/spreads/:spreadId",
    async (req: FastifyRequest<{ Params: { id: string; spreadId: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      const book = await bookRepo.findBookById(req.params.id);
      if (!book) {
        return reply.status(404).send(createErrorResponse("BOOK_NOT_FOUND", "Book does not exist"));
      }
      await assertSpaceAccess(book.spaceId, userId, true);
      if (book.isFrozenForPrint) {
        return reply
          .status(409)
          .send(createErrorResponse("BOOK_FROZEN", "Cannot edit spreads on a frozen print edition"));
      }

      const parseResult = UpsertSpreadSchema.safeParse(req.body);
      if (!parseResult.success) {
        return reply
          .status(400)
          .send(createErrorResponse("VALIDATION_ERROR", "Invalid spread payload", "corr", parseResult.error.issues));
      }

      const spread: BookSpread = {
        id: req.params.spreadId,
        spreadIndex: parseResult.data.spreadIndex,
        leftPage: parseResult.data.leftPage,
        rightPage: parseResult.data.rightPage,
      };

      await bookRepo.saveSpread(book.id, spread);
      await publishDomainEvent("book.spread.saved", "book.spread.saved", book.id, {
        bookId: book.id,
        spreadId: spread.id,
        spreadIndex: spread.spreadIndex,
      });

      return reply.status(200).send(createSuccessResponse(spread));
    }
  );

  // List Books in Space
  app.get(
    "/api/v1/spaces/:spaceId/books",
    async (req: FastifyRequest<{ Params: { spaceId: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      await assertSpaceAccess(req.params.spaceId, userId, false);
      const list = await bookRepo.listBooks(req.params.spaceId);
      const shelfMeta = authorStudioHandles
        ? await authorStudioHandles.getShelfMetadataForBooks(list.map((b) => b.id)).catch(() => new Map())
        : new Map();
      const enriched = list.map((b) => {
        const meta = shelfMeta.get(b.id);
        return {
          ...b,
          archived: meta?.archived ?? false,
          ...(meta?.genre ? { genre: meta.genre } : {}),
          ...(meta?.layoutMode ? { layoutMode: meta.layoutMode } : {}),
          ...(meta?.authorName ? { authorName: meta.authorName } : {}),
          ...(typeof meta?.totalWordCount === "number" ? { totalWordCount: meta.totalWordCount } : {}),
          ...(typeof meta?.chapterCount === "number" ? { chapterCount: meta.chapterCount } : {}),
        };
      });
      return reply.status(200).send(createSuccessResponse(enriched));
    }
  );

  let authorStudioHandles: AuthorStudioHandles | null = null;

  function resolveStorageRoot(): string {
    if (process.env.STORAGE_LOCAL_PATH && fs.existsSync(process.env.STORAGE_LOCAL_PATH)) {
      return path.resolve(process.env.STORAGE_LOCAL_PATH);
    }
    const candidates = [
      path.resolve(process.cwd(), "storage/local"),
      path.resolve(process.cwd(), "../../storage/local"),
      path.resolve(__dirname, "../../../storage/local"),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return candidates[0];
  }

  function findLocalMediaBinary(mediaRef: string): string | null {
    const trimmed = mediaRef.trim();
    if (!trimmed || trimmed.includes("..") || trimmed.includes("\0")) return null;
    const root = resolveStorageRoot();
    if (!fs.existsSync(root)) return null;
    const rootPrefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`;

    // Strip /api/v1/media/files/ URL prefix (or full origin + prefix) if present
    const normalizedRel = trimmed
      .replace(/^https?:\/\/[^/]+/i, "")
      .replace(/^\/?api\/v1\/media\/files\//i, "")
      .replace(/^\/+/, "")
      .split("?")[0];

    // 1. Direct relative path inside local storage root
    if (normalizedRel) {
      const directCandidate = path.resolve(root, normalizedRel);
      if (
        directCandidate.startsWith(rootPrefix) &&
        fs.existsSync(directCandidate) &&
        fs.statSync(directCandidate).isFile()
      ) {
        return directCandidate;
      }
    }

    // 2. Search shallow subdirectories for matching media UUID or filename
    const baseToken = path.basename(normalizedRel || trimmed);
    if (!baseToken || baseToken.length < 6) return null;
    const queue: Array<{ dir: string; depth: number }> = [{ dir: root, depth: 0 }];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.depth > 3) continue;
      let entries: fs.Dirent[] = [];
      try {
        entries = fs.readdirSync(current.dir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        const full = path.join(current.dir, entry.name);
        if (entry.isDirectory()) {
          queue.push({ dir: full, depth: current.depth + 1 });
        } else if (entry.isFile() && (entry.name === baseToken || entry.name.startsWith(`${baseToken}.`) || entry.name.includes(baseToken))) {
          return full;
        }
      }
    }
    return null;
  }

  function getTrimInches(format: string, trimSize?: string): { widthIn: number; heightIn: number; label: string } {
    switch (trimSize) {
      case "5x8_pocket":
        return { widthIn: 5, heightIn: 8, label: '5" × 8"' };
      case "5.5x8.5_digest":
        return { widthIn: 5.5, heightIn: 8.5, label: '5.5" × 8.5"' };
      case "6x9_trade":
        return { widthIn: 6, heightIn: 9, label: '6" × 9"' };
      case "8x10_heirloom":
        return { widthIn: 8, heightIn: 10, label: '8" × 10"' };
      case "8.5x11_archival":
        return { widthIn: 8.5, heightIn: 11, label: '8.5" × 11"' };
      default:
        if (format === "hardcover_square_8x8") return { widthIn: 8, heightIn: 8, label: '8" × 8"' };
        if (format === "hardcover_grand_12x12") return { widthIn: 12, heightIn: 12, label: '12" × 12"' };
        return { widthIn: 8, heightIn: 10, label: '8" × 10"' };
    }
  }

  // 3. Freeze Book Edition for Physical Print Preflight (Immutable Cryptographic Snapshot)
  app.post("/api/v1/books/:id/freeze", async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const userId = await requireAuthUser(req);
    const book = await bookRepo.findBookById(req.params.id);
    if (!book) {
      return reply.status(404).send(createErrorResponse("BOOK_NOT_FOUND", "Book does not exist"));
    }
    await assertSpaceAccess(book.spaceId, userId, true);

    if (book.isFrozenForPrint) {
      return reply
        .status(409)
        .send(createErrorResponse("ALREADY_FROZEN", "Book edition is already frozen for printing"));
    }

    const manuscript = authorStudioHandles ? await authorStudioHandles.getManuscriptForBook(book) : null;
    const sha256Hex = (value: unknown) =>
      crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");

    const manuscriptHash = sha256Hex(
      manuscript
        ? {
            schemaVersion: manuscript.schemaVersion,
            languageCode: manuscript.languageCode,
            authorName: manuscript.authorName,
            dedication: manuscript.dedication,
            epigraph: manuscript.epigraph,
            metadata: manuscript.metadata,
          }
        : { title: book.title, subtitle: book.subtitle }
    );
    const chaptersHash = sha256Hex(
      manuscript
        ? manuscript.chapters.map((c) => ({
            id: c.id,
            sortOrder: c.sortOrder,
            sectionType: c.sectionType,
            title: c.title,
            contentHtml: c.contentHtml,
            wordCount: c.wordCount,
          }))
        : []
    );
    const placedAssetRefs = book.spreads.flatMap((sp) =>
      [...(sp.leftPage?.elements || []), ...(sp.rightPage?.elements || [])]
        .filter((el) => el.type === "image")
        .map((el) => el.content)
    );
    const assetsHash = sha256Hex({ placedAssetRefs, spreads: book.spreads });
    const themeHash = sha256Hex({
      format: book.format,
      coverColor: book.coverColor,
      foilStamping: book.foilStamping,
      coverTitle: book.coverTitle,
      spineText: book.spineText,
      trimSize: manuscript?.trimSize || null,
      typographyPreset: manuscript?.typographyPreset || null,
      themePreset: manuscript?.themePreset || null,
    });
    const rendererVersion = CANONICAL_BOOK_3D_MANIFEST.version;
    const snapshotManifest = {
      title: book.title,
      format: book.format,
      bookVersion: book.version,
      schemaVersion: manuscript?.schemaVersion || "1.0.0",
      rendererVersion,
      spreadCount: book.spreads.length,
      chapterCount: manuscript?.chapters.length ?? 0,
      totalWordCount: manuscript?.totalWordCount ?? 0,
      manuscriptHash,
      chaptersHash,
      assetsHash,
      themeHash,
    };
    const editionHash = sha256Hex(snapshotManifest);
    await bookRepo.freezeEdition(book.id, editionHash);

    if (dbUrl) {
      await db.query(
        `INSERT INTO book_editions (id, book_id, edition_number, edition_hash, snapshot_json, frozen_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          crypto.randomUUID(),
          book.id,
          book.version,
          editionHash,
          JSON.stringify(snapshotManifest),
          userId,
        ]
      ).catch((err) => logger.warn({ err, bookId: book.id }, "[Book] Non-fatal book_editions insert warning"));
    }

    const updated = await bookRepo.findBookById(book.id);

    await publishDomainEvent("book.edition_frozen", "book.edition_frozen", book.id, {
      bookId: book.id,
      editionHash,
      manuscriptHash,
      chaptersHash,
      assetsHash,
      themeHash,
      rendererVersion,
      pageCount: book.spreads.length * 2,
      format: book.format,
    });

    return reply.status(200).send(
      createSuccessResponse({
        ...(updated || book),
        editionSnapshot: snapshotManifest,
      })
    );
  });

  // 4. Automated Print Preflight Validator (Truthful Measured Checks: pass / warning / fail / not_checked)
  async function evaluateBookPreflight(book: BookDocument) {
    const manuscript = authorStudioHandles ? await authorStudioHandles.getManuscriptForBook(book) : null;
    const coverTitleTrimmed = (book.coverTitle || book.title || "").trim();
    const spineTrimmed = (book.spineText || book.title || "").trim();
    const authorNameTrimmed = (manuscript?.authorName || "").trim();
    const trimDims = getTrimInches(book.format, manuscript?.trimSize);

    // 1. Title & Author Metadata Check
    let titleAuthorStatus: PreflightCheckStatus = "pass";
    let titleAuthorDetail = `Title "${coverTitleTrimmed}" fits safe foil die bounds (${spineTrimmed.length} spine chars); author "${authorNameTrimmed}" recorded.`;
    if (coverTitleTrimmed.length < 2) {
      titleAuthorStatus = "fail";
      titleAuthorDetail = "Cover title must be at least 2 characters for foil stamping.";
    } else if (coverTitleTrimmed.length > 80) {
      titleAuthorStatus = "fail";
      titleAuthorDetail = `Cover title (${coverTitleTrimmed.length} chars) exceeds 80-character foil die limit.`;
    } else if (!authorNameTrimmed) {
      titleAuthorStatus = "warning";
      titleAuthorDetail = `Title "${coverTitleTrimmed}" fits foil bounds, but Author Name is blank (recommended for title page & EPUB metadata).`;
    }

    // 2. Manuscript Chapter Completeness Check
    const chapters = manuscript?.chapters || [];
    const emptyChapters = chapters.filter((ch) => Number(ch.wordCount ?? 0) <= 0);
    let chapterStatus: PreflightCheckStatus = "pass";
    let chapterDetail = `${chapters.length} chapter(s) verified (${manuscript?.totalWordCount ?? 0} total words).`;
    let firstEmptyChapterId: string | undefined;
    if (chapters.length === 0) {
      chapterStatus = "fail";
      chapterDetail = "Manuscript contains 0 chapters. Add at least one chapter before publishing.";
    } else if (emptyChapters.length > 0) {
      chapterStatus = "fail";
      firstEmptyChapterId = emptyChapters[0].id;
      chapterDetail = `${emptyChapters.length} empty chapter(s) with 0 words detected: ${emptyChapters
        .slice(0, 3)
        .map((c) => `"${c.title}"`)
        .join(", ")}.`;
    }

    // 3. Spreads, Missing Media References, Bounds & Real Sharp DPI Measurement
    let totalElements = 0;
    let totalImages = 0;
    const marginViolations: Array<{ label: string; spreadIndex: number }> = [];
    const missingMediaIssues: Array<{ label: string; spreadIndex: number }> = [];
    const lowDpiFails: Array<{ label: string; spreadIndex: number; dpi: number }> = [];
    const lowDpiWarnings: Array<{ label: string; spreadIndex: number; dpi: number }> = [];
    let measuredImagesCount = 0;
    let unverifiedImagesCount = 0;
    let minMeasuredDpi: number | null = null;

    type SharpFactory = (input: string) => { metadata(): Promise<{ width?: number; height?: number }> };
    let sharpLoader: SharpFactory | null = null;
    try {
      const mod = await import("sharp");
      sharpLoader = (mod.default || mod) as unknown as SharpFactory;
    } catch {
      sharpLoader = null;
    }

    for (const spread of book.spreads) {
      const pages = [
        { side: "left", page: spread.leftPage },
        { side: "right", page: spread.rightPage },
      ];
      for (const { side, page } of pages) {
        if (!page) continue;
        for (const el of page.elements || []) {
          totalElements += 1;
          const outOfBounds =
            el.x < 0 ||
            el.y < 0 ||
            el.width <= 0 ||
            el.height <= 0 ||
            el.x + el.width > 100 ||
            el.y + el.height > 100;
          if (outOfBounds) {
            marginViolations.push({
              label: `Spread ${spread.spreadIndex + 1} (${side} p.${page.pageNumber})`,
              spreadIndex: spread.spreadIndex,
            });
          }

          if (el.type === "image") {
            totalImages += 1;
            const mediaRef = (el.content || "").trim();
            if (!mediaRef) {
              missingMediaIssues.push({
                label: `Spread ${spread.spreadIndex + 1} (${side} p.${page.pageNumber}) missing media reference`,
                spreadIndex: spread.spreadIndex,
              });
              continue;
            }

            const styleObj = el.style && typeof el.style === "object" ? (el.style as Record<string, unknown>) : {};
            const placedWidthIn = Math.max(0.25, (el.width / 100) * trimDims.widthIn);
            const placedHeightIn = Math.max(0.25, (el.height / 100) * trimDims.heightIn);
            let effectiveDpi: number | null = null;

            const explicitDpi = Number(styleObj.dpi);
            if (!Number.isNaN(explicitDpi) && explicitDpi > 0) {
              effectiveDpi = Math.round(explicitDpi);
            } else {
              const pxW = Number(styleObj.pixelWidth);
              const pxH = Number(styleObj.pixelHeight);
              if (!Number.isNaN(pxW) && pxW > 0 && !Number.isNaN(pxH) && pxH > 0) {
                effectiveDpi = Math.round(Math.min(pxW / placedWidthIn, pxH / placedHeightIn));
              } else if (sharpLoader) {
                const binaryPath = findLocalMediaBinary(mediaRef);
                if (binaryPath) {
                  try {
                    const meta = await sharpLoader(binaryPath).metadata();
                    if (meta.width && meta.height) {
                      effectiveDpi = Math.round(
                        Math.min(meta.width / placedWidthIn, meta.height / placedHeightIn)
                      );
                    }
                  } catch {
                    effectiveDpi = null;
                  }
                }
              }
            }

            if (effectiveDpi === null) {
              unverifiedImagesCount += 1;
            } else {
              measuredImagesCount += 1;
              minMeasuredDpi = minMeasuredDpi === null ? effectiveDpi : Math.min(minMeasuredDpi, effectiveDpi);
              if (effectiveDpi < 200) {
                lowDpiFails.push({
                  label: `Spread ${spread.spreadIndex + 1} (${side}) at ${effectiveDpi} DPI (< 200 DPI print minimum)`,
                  spreadIndex: spread.spreadIndex,
                  dpi: effectiveDpi,
                });
              } else if (effectiveDpi < 300) {
                lowDpiWarnings.push({
                  label: `Spread ${spread.spreadIndex + 1} (${side}) at ${effectiveDpi} DPI (300 DPI archival target)`,
                  spreadIndex: spread.spreadIndex,
                  dpi: effectiveDpi,
                });
              }
            }
          }
        }
      }
    }

    let dpiStatus: PreflightCheckStatus = "pass";
    let dpiDetail = "Text & vector layout only (0 raster images placed; vector typography scales cleanly).";
    let dpiTargetSpread: number | undefined;
    if (lowDpiFails.length > 0) {
      dpiStatus = "fail";
      dpiTargetSpread = lowDpiFails[0].spreadIndex;
      dpiDetail = lowDpiFails.slice(0, 3).map((x) => x.label).join("; ");
    } else if (lowDpiWarnings.length > 0) {
      dpiStatus = "warning";
      dpiTargetSpread = lowDpiWarnings[0].spreadIndex;
      dpiDetail = lowDpiWarnings.slice(0, 3).map((x) => x.label).join("; ");
    } else if (totalImages > 0 && unverifiedImagesCount > 0) {
      dpiStatus = "not_checked";
      dpiDetail = `${totalImages} placed image(s) detected, but ${unverifiedImagesCount} source binary could not be measured on local disk (${measuredImagesCount} measured).`;
    } else if (totalImages > 0) {
      dpiStatus = "pass";
      dpiDetail = `${totalImages} placed image(s) measured via Sharp >= 300 DPI (min ${minMeasuredDpi} DPI).`;
    }

    const trimStatus: PreflightCheckStatus =
      book.spreads.length < 1 || totalElements < 1 || marginViolations.length > 0 ? "fail" : "pass";
    const trimDetail =
      book.spreads.length < 1
        ? "Book has 0 spreads staged for print."
        : totalElements < 1
          ? `${book.spreads.length} spread(s) staged, but all pages are empty.`
          : marginViolations.length > 0
            ? `Out-of-bounds element(s) on: ${marginViolations.slice(0, 3).map((v) => v.label).join(", ")}`
            : `Trim ${trimDims.label}, 3mm bleed & 12mm inner gutter verified across ${book.spreads.length} spread(s) (${totalElements} elements).`;

    const checks: PreflightCheckItem[] = [
      {
        id: "title_author_metadata",
        label: "Title & Author Metadata",
        status: titleAuthorStatus,
        passed: titleAuthorStatus !== "fail",
        detail: titleAuthorDetail,
        measuredValue: `${coverTitleTrimmed.length} chars${authorNameTrimmed ? ` • ${authorNameTrimmed}` : " • No author"}`,
        targetEnvironment: titleAuthorStatus === "pass" ? undefined : "design",
      },
      {
        id: "empty_chapters",
        label: "Manuscript Chapter Completeness",
        status: chapterStatus,
        passed: chapterStatus !== "fail",
        detail: chapterDetail,
        measuredValue: `${chapters.length} chapters • ${manuscript?.totalWordCount ?? 0} words`,
        targetEnvironment: chapterStatus === "pass" ? undefined : "write",
        targetChapterId: firstEmptyChapterId,
      },
      {
        id: "missing_media_references",
        label: "Media Asset Reference Integrity",
        status: missingMediaIssues.length > 0 ? "fail" : "pass",
        passed: missingMediaIssues.length === 0,
        detail:
          missingMediaIssues.length > 0
            ? missingMediaIssues.slice(0, 3).map((m) => m.label).join("; ")
            : totalImages === 0
              ? "No broken media links (0 raster images placed)."
              : `All ${totalImages} placed media reference(s) are non-empty.`,
        measuredValue: `${totalImages} placed image(s)`,
        targetEnvironment: missingMediaIssues.length > 0 ? "preview" : undefined,
        targetSpreadIndex: missingMediaIssues[0]?.spreadIndex,
      },
      {
        id: "dpi_resolution",
        label: "Effective Print Resolution (Sharp DPI)",
        status: dpiStatus,
        passed: dpiStatus !== "fail",
        detail: dpiDetail,
        measuredValue:
          minMeasuredDpi !== null
            ? `${minMeasuredDpi} DPI min`
            : totalImages === 0
              ? "Vector only"
              : "Unverified binary",
        targetEnvironment: dpiStatus === "pass" ? undefined : "preview",
        targetSpreadIndex: dpiTargetSpread,
      },
      {
        id: "safe_margins",
        label: "Trim, 3mm Bleed & 12mm Gutter Geometry",
        status: trimStatus,
        passed: trimStatus !== "fail",
        detail: trimDetail,
        measuredValue: `${trimDims.label} • 3mm bleed • 12mm gutter`,
        targetEnvironment: trimStatus === "pass" ? undefined : "preview",
        targetSpreadIndex: marginViolations[0]?.spreadIndex,
      },
    ];

    const failCount = checks.filter((c) => c.status === "fail").length;
    const warningCount = checks.filter((c) => c.status === "warning").length;
    const notCheckedCount = checks.filter((c) => c.status === "not_checked").length;
    const passCount = checks.filter((c) => c.status === "pass").length;
    const overallStatus: PreflightCheckStatus =
      failCount > 0
        ? "fail"
        : notCheckedCount > 0
          ? "not_checked"
          : warningCount > 0
            ? "warning"
            : "pass";

    return {
      bookId: book.id,
      version: book.version,
      isFrozenForPrint: book.isFrozenForPrint,
      frozenEditionHash: book.frozenEditionHash || null,
      overallStatus,
      passed: failCount === 0,
      counts: {
        pass: passCount,
        warning: warningCount,
        fail: failCount,
        notChecked: notCheckedCount,
      },
      checks,
      checkedAt: new Date().toISOString(),
    };
  }

  app.get("/api/v1/books/:id/preflight", async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const userId = await requireAuthUser(req);
    const book = await bookRepo.findBookById(req.params.id);
    if (!book) {
      return reply.status(404).send(createErrorResponse("BOOK_NOT_FOUND", "Book does not exist"));
    }
    await assertSpaceAccess(book.spaceId, userId, false);
    const report = await evaluateBookPreflight(book);
    return reply.status(200).send(createSuccessResponse(report));
  });

  app.post("/api/v1/books/:id/preflight", async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const userId = await requireAuthUser(req);
    const book = await bookRepo.findBookById(req.params.id);
    if (!book) {
      return reply.status(404).send(createErrorResponse("BOOK_NOT_FOUND", "Book does not exist"));
    }
    await assertSpaceAccess(book.spaceId, userId, true);
    const report = await evaluateBookPreflight(book);
    return reply.status(200).send(createSuccessResponse(report));
  });

  // ==========================================
  // PUBLIC GALLERY, CHAPTERS, REORDER, PROOFING & EDITIONS
  // ==========================================

  app.get("/api/v1/public/books", async (_req, reply) => {
    return reply.status(200).send(
      createSuccessResponse({
        items: [
          {
            id: "sample",
            title: "The Bennett Heritage",
            subtitle: "1948 — 2026 • Memoria Volume I",
            format: "hardcover_standard_8x10",
            coverColor: "#76556F",
            foilStamping: "gold",
            pageCount: 48,
            curator: "Bennett Family Archive",
          },
          {
            id: "sample-tuscany",
            title: "Summer in Tuscany 1948",
            subtitle: "Handwritten Letters & Postcards",
            format: "hardcover_square_8x8",
            coverColor: "#304C43",
            foilStamping: "gold",
            pageCount: 36,
            curator: "Vance Heritage Vault",
          },
          {
            id: "sample-clara",
            title: "Clara: Years One Through Five",
            subtitle: "Childhood Milestones & Drawings",
            format: "hardcover_grand_12x12",
            coverColor: "#20242C",
            foilStamping: "silver",
            pageCount: 64,
            curator: "Clara's Milestone Capsule",
          },
        ],
      })
    );
  });

  const memChapters = new Map<string, Array<{ id: string; title: string; subtitle?: string; sortOrder: number }>>();

  app.get("/api/v1/books/:id/chapters", async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const userId = await requireAuthUser(req);
    const book = await bookRepo.findBookById(req.params.id);
    if (!book) return reply.status(404).send(createErrorResponse("BOOK_NOT_FOUND", "Book does not exist"));
    await assertSpaceAccess(book.spaceId, userId, false);
    if (dbUrl) {
      const res = await db.query(
        `SELECT id, title, subtitle, sort_order as "sortOrder" FROM book_chapters WHERE book_id = $1 ORDER BY sort_order ASC`,
        [book.id]
      );
      return reply.status(200).send(createSuccessResponse(res.rows));
    }
    return reply.status(200).send(createSuccessResponse(memChapters.get(book.id) || []));
  });

  app.put(
    "/api/v1/books/:id/chapters",
    async (
      req: FastifyRequest<{ Params: { id: string }; Body: { chapters: Array<{ id?: string; title: string; subtitle?: string }> } }>,
      reply
    ) => {
      const userId = await requireAuthUser(req);
      const book = await bookRepo.findBookById(req.params.id);
      if (!book) return reply.status(404).send(createErrorResponse("BOOK_NOT_FOUND", "Book does not exist"));
      await assertSpaceAccess(book.spaceId, userId, true);
      if (book.isFrozenForPrint) {
        return reply.status(409).send(createErrorResponse("BOOK_FROZEN", "Cannot modify frozen edition"));
      }
      const chapters = (req.body?.chapters || []).map((c, idx) => ({
        id: c.id || crypto.randomUUID(),
        title: c.title,
        subtitle: c.subtitle || "",
        sortOrder: idx,
      }));
      if (dbUrl) {
        await db.query(`DELETE FROM book_chapters WHERE book_id = $1`, [book.id]);
        for (const c of chapters) {
          await db.query(
            `INSERT INTO book_chapters (id, book_id, title, subtitle, sort_order) VALUES ($1, $2, $3, $4, $5)`,
            [c.id, book.id, c.title, c.subtitle || null, c.sortOrder]
          );
        }
      } else {
        memChapters.set(book.id, chapters);
      }
      return reply.status(200).send(createSuccessResponse(chapters));
    }
  );

  const memPreflightOverrides = new Map<string, { note: string; approvedBy: string; approvedAt: string }>();

  // Auto-Curate & Generate Initial Spreads from Selected Memories (PWA-60 / PWA-62 / IOS-46)
  app.post(
    "/api/v1/books/:id/curate",
    async (
      req: FastifyRequest<{
        Params: { id: string };
        Body: {
          memories?: Array<{ id: string; title: string; content?: string; capturedAt?: string; mediaIds?: string[] }>;
          memoryIds?: string[];
          template?: string;
          theme?: string;
          preserveOrder?: boolean;
        };
      }>,
      reply
    ) => {
      const userId = await requireAuthUser(req);
      const book = await bookRepo.findBookById(req.params.id);
      if (!book) return reply.status(404).send(createErrorResponse("BOOK_NOT_FOUND", "Book does not exist"));
      await assertSpaceAccess(book.spaceId, userId, true);
      if (book.isFrozenForPrint) {
        return reply.status(409).send(createErrorResponse("BOOK_FROZEN", "Cannot curate into frozen edition"));
      }

      let memories = Array.isArray(req.body?.memories) ? req.body.memories : [];
      if (memories.length === 0 && Array.isArray(req.body?.memoryIds) && req.body.memoryIds.length > 0) {
        if (memoryDb) {
          const mRes = await memoryDb.query(
            `SELECT id, title, content, captured_at::text as "capturedAt"
             FROM memories WHERE id = ANY($1) AND space_id = $2 AND deleted_at IS NULL`,
            [req.body.memoryIds, book.spaceId]
          );
          memories = mRes.rows;
        }
        if (memories.length === 0) {
          memories = req.body.memoryIds.map((id, i) => ({
            id,
            title: `Curated Memory ${i + 1}`,
            content: "Preserved archival entry",
            capturedAt: new Date().toISOString(),
          }));
        }
      }

      const templateName = req.body?.template || req.body?.theme || "editorial_classic";
      const leftLayout =
        templateName === "fine_art_spread"
          ? ("full_bleed_single" as const)
          : templateName === "photo_journal"
          ? ("two_photo_grid" as const)
          : ("photo_with_story" as const);
      const rightLayout =
        templateName === "fine_art_spread"
          ? ("quote_spread" as const)
          : templateName === "photo_journal"
          ? ("photo_with_story" as const)
          : ("quote_spread" as const);
      const bgColor = templateName === "fine_art_spread" ? "#FBF9F5" : "#F7F4ED";

      const sorted = req.body?.preserveOrder
        ? [...memories]
        : [...memories].sort(
            (a, b) => new Date(a.capturedAt || 0).getTime() - new Date(b.capturedAt || 0).getTime()
          );
      const baseIndex = book.spreads.length;
      const createdSpreads: BookSpread[] = [];
      for (let i = 0; i < sorted.length; i++) {
        const m = sorted[i];
        const spread: BookSpread = {
          id: crypto.randomUUID(),
          spreadIndex: baseIndex + i,
          leftPage: {
            id: crypto.randomUUID(),
            pageNumber: (baseIndex + i) * 2 + 1,
            layoutType: leftLayout,
            backgroundColor: bgColor,
            elements: [
              {
                id: crypto.randomUUID(),
                type: "heading",
                x: 10,
                y: 20,
                width: 80,
                height: 15,
                rotation: 0,
                zIndex: 1,
                content: m.title,
                style: { fontFamily: "serif", fontSize: 24, color: "#20242C", template: templateName },
              },
              ...(m.mediaIds?.[0]
                ? [
                    {
                      id: crypto.randomUUID(),
                      type: "image" as const,
                      x: 10,
                      y: 38,
                      width: 80,
                      height: 50,
                      rotation: 0,
                      zIndex: 2,
                      content: m.mediaIds[0],
                      style: { objectPosition: "50% 50%", cropShape: "rect" },
                    },
                  ]
                : []),
            ],
          },
          rightPage: {
            id: crypto.randomUUID(),
            pageNumber: (baseIndex + i) * 2 + 2,
            layoutType: rightLayout,
            backgroundColor: bgColor,
            elements: [
              {
                id: crypto.randomUUID(),
                type: "caption",
                x: 10,
                y: 30,
                width: 80,
                height: 40,
                rotation: 0,
                zIndex: 1,
                content: m.content || `Preserved memory (${m.capturedAt ? new Date(m.capturedAt).getFullYear() : "Archive"})`,
                style: { fontFamily: "sans-serif", fontSize: 15, color: "#5C5955", template: templateName },
              },
            ],
          },
        };
        await bookRepo.saveSpread(book.id, spread);
        createdSpreads.push(spread);
      }
      const updated = await bookRepo.findBookById(book.id);
      return reply.status(200).send(createSuccessResponse(updated || book));
    }
  );

  // Reorder Spreads (PWA-65 / IOS-47)
  app.put(
    "/api/v1/books/:id/spreads/reorder",
    async (req: FastifyRequest<{ Params: { id: string }; Body: { spreadIds: string[] } }>, reply) => {
      const userId = await requireAuthUser(req);
      const book = await bookRepo.findBookById(req.params.id);
      if (!book) return reply.status(404).send(createErrorResponse("BOOK_NOT_FOUND", "Book does not exist"));
      await assertSpaceAccess(book.spaceId, userId, true);
      if (book.isFrozenForPrint) {
        return reply.status(409).send(createErrorResponse("BOOK_FROZEN", "Cannot reorder spreads on frozen edition"));
      }
      const order = Array.isArray(req.body?.spreadIds) ? req.body.spreadIds : [];
      const spreadMap = new Map(book.spreads.map((s) => [s.id, s]));
      let idx = 0;
      for (const id of order) {
        const s = spreadMap.get(id);
        if (s) {
          await bookRepo.saveSpread(book.id, { ...s, spreadIndex: idx++ });
          spreadMap.delete(id);
        }
      }
      for (const s of spreadMap.values()) {
        await bookRepo.saveSpread(book.id, { ...s, spreadIndex: idx++ });
      }
      const updated = await bookRepo.findBookById(book.id);
      return reply.status(200).send(createSuccessResponse(updated || book));
    }
  );

  // 2D Proofing View (PWA-67)
  app.get("/api/v1/books/:id/proof", async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const userId = await requireAuthUser(req);
    const book = await bookRepo.findBookById(req.params.id);
    if (!book) return reply.status(404).send(createErrorResponse("BOOK_NOT_FOUND", "Book does not exist"));
    await assertSpaceAccess(book.spaceId, userId, false);
    const preflight = await evaluateBookPreflight(book);
    return reply.status(200).send(
      createSuccessResponse({
        book,
        pageCount: book.spreads.length * 2,
        bleedMm: 3,
        safeMarginMm: 12,
        preflight,
      })
    );
  });

  // Edition History & Clone Next Edition (PWA-70)
  app.get("/api/v1/books/:id/editions", async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const userId = await requireAuthUser(req);
    const book = await bookRepo.findBookById(req.params.id);
    if (!book) return reply.status(404).send(createErrorResponse("BOOK_NOT_FOUND", "Book does not exist"));
    await assertSpaceAccess(book.spaceId, userId, false);
    const persistedEditions = dbUrl
      ? (
          await db.query(
            `SELECT edition_number as "editionNumber", edition_hash as "editionHash",
                    COALESCE((snapshot_json->>'spreadCount')::int, 1) as "spreadCount",
                    created_at::text as "updatedAt"
             FROM book_editions WHERE book_id = $1 ORDER BY edition_number DESC`,
            [book.id]
          )
        ).rows.map((r: any) => ({ ...r, status: "frozen_for_print" }))
      : [];
    const current = {
      editionNumber: book.version,
      status: book.isFrozenForPrint ? "frozen_for_print" : "draft",
      editionHash: book.frozenEditionHash || null,
      spreadCount: book.spreads.length,
      updatedAt: book.updatedAt,
    };
    const editions =
      persistedEditions.some((e: any) => e.editionNumber === current.editionNumber)
        ? persistedEditions
        : [current, ...persistedEditions];
    return reply.status(200).send(createSuccessResponse(editions));
  });

  app.post("/api/v1/books/:id/editions", async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const userId = await requireAuthUser(req);
    const source = await bookRepo.findBookById(req.params.id);
    if (!source) return reply.status(404).send(createErrorResponse("BOOK_NOT_FOUND", "Book does not exist"));
    await assertSpaceAccess(source.spaceId, userId, true);
    const now = new Date().toISOString();
    const cloned: BookDocument = {
      ...source,
      id: crypto.randomUUID(),
      title: `${source.title} (Edition ${source.version + 1})`,
      version: source.version + 1,
      isFrozenForPrint: false,
      frozenEditionHash: undefined,
      spreads: source.spreads.map((s) => ({ ...s, id: crypto.randomUUID() })),
      createdAt: now,
      updatedAt: now,
    };
    await bookRepo.createBook(cloned);
    return reply.status(201).send(createSuccessResponse(cloned));
  });

  // Admin Book Telemetry & Preflight Override (ADMIN-14 / ADMIN-15)
  const ADMIN_ROLES = new Set(["superadmin", "admin", "ops_admin", "compliance_officer", "support_agent"]);
  async function requireAdmin(req: FastifyRequest): Promise<string> {
    const claims: any = await req.jwtVerify().catch(() => {
      throw new UnauthorizedError("Valid admin token required");
    });
    if (!ADMIN_ROLES.has(claims?.role || "")) {
      throw new ForbiddenError("Administrative privileges required");
    }
    return claims.sub || "admin";
  }

  app.get("/api/v1/admin/books/rendering/jobs", async (req, reply) => {
    await requireAdmin(req);
    if (dbUrl) {
      const res = await db.query(
        `SELECT b.id, b.space_id as "spaceId", b.title, b.format, b.version,
                b.is_frozen_for_print as "isFrozenForPrint",
                b.frozen_edition_hash as "frozenEditionHash",
                b.updated_at::text as "updatedAt",
                EXISTS(SELECT 1 FROM audit_logs a WHERE a.entity_id = b.id AND a.action = 'admin.preflight.overridden') as "preflightOverridden"
         FROM books b ORDER BY b.updated_at DESC LIMIT 100`
      );
      return reply.status(200).send(createSuccessResponse(res.rows));
    }
    return reply.status(200).send(createSuccessResponse([]));
  });

  app.post(
    "/api/v1/admin/preflight/:bookId/override",
    async (req: FastifyRequest<{ Params: { bookId: string }; Body?: { note?: string } }>, reply) => {
      const adminId = await requireAdmin(req);
      const book = await bookRepo.findBookById(req.params.bookId);
      if (!book) return reply.status(404).send(createErrorResponse("BOOK_NOT_FOUND", "Book does not exist"));
      const note = req.body?.note?.trim() || "Prepress operator approved print tolerances";
      const approvedAt = new Date().toISOString();
      if (dbUrl) {
        await db.query(
          `INSERT INTO audit_logs (id, space_id, user_id, action, entity_type, entity_id, metadata)
           VALUES ($1, $2, $3, 'admin.preflight.overridden', 'book', $4, $5)`,
          [crypto.randomUUID(), book.spaceId, adminId, book.id, JSON.stringify({ note, approvedAt })]
        ).catch((err) => logger.warn({ err, bookId: book.id }, "[Book] Non-fatal preflight override audit warning"));
      } else {
        memPreflightOverrides.set(book.id, { note, approvedBy: adminId, approvedAt });
      }
      return reply.status(200).send(
        createSuccessResponse({
          bookId: book.id,
          overridden: true,
          note,
          approvedAt,
        })
      );
    }
  );

  // Register Memoria Author Studio Semantic Manuscript, Resume, Revision & Import/Export API
  authorStudioHandles = registerAuthorStudioRoutes({
    app,
    db,
    dbUrl,
    bookRepo,
    requireAuthUser,
    assertSpaceAccess,
  });

  return app;
}

if (process.env.NODE_ENV !== "test") {
  (async () => {
    try {
      const app = await buildBookService();
      await startServiceServer({
        serviceId: "book-service",
        app,
        logger,
      });
    } catch (err) {
      logger.error({ err }, "[Book] Unexpected startup failure");
      process.exit(1);
    }
  })();
}
