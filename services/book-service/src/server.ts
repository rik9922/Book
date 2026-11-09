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
  createSuccessResponse,
  createErrorResponse,
  createDomainEvent,
} from "@memory-capsule/contracts";
import { createEventBus, EventBus } from "@memory-capsule/events";
import { createDatabaseClient, DatabaseClient } from "@memory-capsule/database";

const logger: Logger = createServiceLogger("book-service");

export async function buildBookService(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  const db: DatabaseClient = createDatabaseClient(process.env.BOOK_DATABASE_URL);
  const eventBus: EventBus = await createEventBus();

  const books = new Map<string, BookDocument>();

  await app.register(cors, { origin: true, credentials: true });
  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || "dev-jwt-insecure-secret-change-in-production-min32chars",
  });

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

    books.set(bookId, book);

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
    const book = books.get(req.params.id);
    if (!book) {
      return reply.status(404).send(createErrorResponse("BOOK_NOT_FOUND", "Book does not exist"));
    }
    return reply.status(200).send(createSuccessResponse(book));
  });

  // 3. Freeze Book Edition for Physical Print Preflight
  app.post("/api/v1/books/:id/freeze", async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const book = books.get(req.params.id);
    if (!book) {
      return reply.status(404).send(createErrorResponse("BOOK_NOT_FOUND", "Book does not exist"));
    }

    if (book.isFrozenForPrint) {
      return reply.status(409).send(createErrorResponse("ALREADY_FROZEN", "Book edition is already frozen for printing"));
    }

    const editionHash = crypto.createHash("sha256").update(JSON.stringify(book)).digest("hex");
    book.isFrozenForPrint = true;
    book.frozenEditionHash = editionHash;
    book.updatedAt = new Date().toISOString();

    books.set(book.id, book);

    await eventBus.publish(
      "book.edition_frozen",
      createDomainEvent("book.edition_frozen", "book-service", {
        bookId: book.id,
        editionHash,
        pageCount: book.spreads.length * 2,
        format: book.format,
      })
    );

    return reply.status(200).send(createSuccessResponse(book));
  });

  return app;
}

if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT_BOOK || 4005);
  const host = "0.0.0.0";

  buildBookService().then((app) => {
    app.listen({ port, host }, (err, address) => {
      if (err) {
        logger.error({ err }, "[BookService] Failed to start");
        process.exit(1);
      }
      logger.info({ address, port }, `[BookService] Listening at ${address}`);
    });
  });
}
