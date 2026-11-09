import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import cors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import crypto from "node:crypto";
import { z } from "zod";
import { createServiceLogger, Logger } from "@memory-capsule/logger";
import {
  BookDocument,
  BookDocumentSchema,
  BookFormatSchema,
  BookSpread,
  createSuccessResponse,
  createErrorResponse,
  createDomainEvent,
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
  const db: DatabaseClient = createDatabaseClient(dbUrl);
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

