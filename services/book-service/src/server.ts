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
  BookDocument,
  BookFormatSchema,
  BookSpread,
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
import {
  createDatabaseClient,
  DatabaseClient,
  PostgresBookRepository,
  BookRepository,
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
  async saveSpread(bookId: string, spread: BookSpread): Promise<void> {
    const book = this.books.get(bookId);
    if (book) {
      const idx = book.spreads.findIndex((s) => s.id === spread.id);
      if (idx >= 0) book.spreads[idx] = spread;
      else book.spreads.push(spread);
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
  const app = Fastify({ logger: false });
  const dbUrl = process.env.BOOK_DATABASE_URL || process.env.DATABASE_URL;
  if (!dbUrl && process.env.NODE_ENV !== "test") {
    throw new Error("[book-service] Database connection string required in non-test mode. Set BOOK_DATABASE_URL or DATABASE_URL.");
  }
  const db: DatabaseClient = createDatabaseClient(dbUrl);
  if (process.env.NODE_ENV !== "test") {
    const isHealthy = await db.healthCheck();
    if (!isHealthy) {
      throw new Error("[book-service] PostgreSQL database health check failed during service initialization.");
    }
  }
  const eventBus: EventBus = await createEventBus();

  const bookRepo: BookRepository = dbUrl
    ? new PostgresBookRepository(db)
    : new InMemoryBookTestRepo();

  const allowedOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:4000",
    "http://127.0.0.1:4000",
  ];

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith("http://localhost:")) {
        cb(null, true);
        return;
      }
      cb(new Error("CORS origin not allowed"), false);
    },
    credentials: true,
  });

  const jwtSecret = process.env.JWT_SECRET || "dev-jwt-insecure-secret-change-in-production-min32chars";
  await app.register(fastifyJwt, { secret: jwtSecret });

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

  // 0A. Versioned 3D Asset Manifest & Cross-Platform Engine Contracts
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

    const etag = `"manifest-${CANONICAL_BOOK_3D_MANIFEST.version}-${CANONICAL_BOOK_3D_MANIFEST.assets.glb.sha256.slice(0, 12)}"`;
    if (req.headers["if-none-match"] === etag) {
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

  // 0B. Binary 3D Asset Delivery (GLB & USDZ) with ETag & SHA-256 Verification
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

      const payload = await fsp.readFile(fullPath);
      const actualSha256 = crypto.createHash("sha256").update(payload).digest("hex");
      if (actualSha256 !== entry.expectedSha256) {
        logger.error(
          { filename: entry.filename, actualSha256, expectedSha256: entry.expectedSha256 },
          "[Book3D] SHA-256 checksum verification failed"
        );
        return reply
          .status(500)
          .send(createErrorResponse("ASSET_INTEGRITY_MISMATCH", "3D asset checksum mismatch"));
      }

      const etag = `"${actualSha256}"`;
      if (req.headers["if-none-match"] === etag) {
        return reply.status(304).send();
      }

      reply.header("Content-Type", entry.contentType);
      reply.header("Content-Length", payload.byteLength);
      reply.header("ETag", etag);
      reply.header("X-Asset-Sha256", actualSha256);
      reply.header("X-Asset-Version", CANONICAL_BOOK_3D_MANIFEST.version);
      reply.header("Content-Disposition", `inline; filename="${entry.filename}"`);
      reply.header(
        "Cache-Control",
        req.query.v ? "public, max-age=31536000, immutable" : "public, max-age=3600"
      );

      return reply.status(200).send(payload);
    }
  );

  // 0C. Book-Specific Resolved 3D Reader Configuration
  app.get(
    "/api/v1/books/:id/3d-model",
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const isSample = req.params.id === "sample";
      const book = isSample ? null : await bookRepo.findBookById(req.params.id);

      if (!isSample && !book) {
        return reply
          .status(404)
          .send(createErrorResponse("BOOK_NOT_FOUND", "Book does not exist"));
      }

      const leatherSwatch = resolveLeatherSwatch(book?.coverColor);
      const foilSwatch = resolveFoilSwatch(book?.foilStamping);
      const configuration = Book3DConfigurationSchema.parse({
        leatherId: leatherSwatch.id,
        foilId: foilSwatch.id,
        coverTitle: book?.coverTitle || "The Bennett Heritage",
        coverSubtitle: book?.subtitle || "1948 — 2026 • Memoria Volume I",
        spineText: book?.spineText || "MEMORIA VOL. I",
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
          sampleSpreads: CANONICAL_SAMPLE_SPREADS,
        })
      );
    }
  );

  // 1. Create a Book
  const CreateBookSchema = z.object({
    spaceId: z.string().uuid(),
    title: z.string().min(1),
    subtitle: z.string().optional(),
    format: BookFormatSchema.default("hardcover_standard_8x10"),
    coverColor: z.string().default("#304C43"),
    foilStamping: z.enum(["gold", "silver", "blind_emboss", "none"]).default("gold"),
    coverTitle: z.string().optional(),
    spineText: z.string().optional(),
  });

  app.post("/api/v1/books", async (req: FastifyRequest, reply: FastifyReply) => {
    const parseResult = CreateBookSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send(createErrorResponse("VALIDATION_ERROR", "Invalid book payload", "corr", parseResult.error.issues));
    }

    const { spaceId, title, subtitle, format, coverColor, foilStamping, coverTitle, spineText } = parseResult.data;
    const bookId = crypto.randomUUID();
    const now = new Date().toISOString();

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
          leftPage: null, // Inside front cover
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

    await eventBus.publish(
      "book.created",
      createDomainEvent("book.created", "book-service", {
        bookId,
        spaceId,
        title,
        format,
      })
    );

    return reply.status(201).send(createSuccessResponse(book));
  });

  // 2. Get Book by ID
  app.get("/api/v1/books/:id", async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const book = await bookRepo.findBookById(req.params.id);
    if (!book) {
      return reply.status(404).send(createErrorResponse("BOOK_NOT_FOUND", "Book does not exist"));
    }
    return reply.status(200).send(createSuccessResponse(book));
  });

  // List Books in Space
  app.get("/api/v1/spaces/:spaceId/books", async (req: FastifyRequest<{ Params: { spaceId: string } }>, reply) => {
    const list = await bookRepo.listBooks(req.params.spaceId);
    return reply.status(200).send(createSuccessResponse(list));
  });

  // 3. Freeze Book Edition for Physical Print Preflight
  app.post("/api/v1/books/:id/freeze", async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const book = await bookRepo.findBookById(req.params.id);
    if (!book) {
      return reply.status(404).send(createErrorResponse("BOOK_NOT_FOUND", "Book does not exist"));
    }

    if (book.isFrozenForPrint) {
      return reply.status(409).send(createErrorResponse("ALREADY_FROZEN", "Book edition is already frozen for printing"));
    }

    const editionHash = crypto.createHash("sha256").update(JSON.stringify(book)).digest("hex");
    await bookRepo.freezeEdition(book.id, editionHash);

    const updated = await bookRepo.findBookById(book.id);

    await eventBus.publish(
      "book.edition_frozen",
      createDomainEvent("book.edition_frozen", "book-service", {
        bookId: book.id,
        editionHash,
        pageCount: book.spreads.length * 2,
        format: book.format,
      })
    );

    return reply.status(200).send(createSuccessResponse(updated || book));
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

