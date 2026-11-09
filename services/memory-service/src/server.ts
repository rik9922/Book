import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import cors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import crypto from "node:crypto";
import { z } from "zod";
import { createServiceLogger, Logger } from "@memory-capsule/logger";
import {
  MemorySpace,
  SpaceProfile,
  Memory,
  MemorySpaceSchema,
  SpaceProfileSchema,
  MemorySchema,
  createSuccessResponse,
  createErrorResponse,
  createDomainEvent,
} from "@memory-capsule/contracts";
import { createEventBus, EventBus } from "@memory-capsule/events";
import { createDatabaseClient, DatabaseClient } from "@memory-capsule/database";

const logger: Logger = createServiceLogger("memory-service");

export async function buildMemoryService(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  const db: DatabaseClient = createDatabaseClient(process.env.MEMORY_DATABASE_URL);
  const eventBus: EventBus = await createEventBus();

  // In-memory data store for standalone/testing
  const spaces = new Map<string, MemorySpace>();
  const profiles = new Map<string, SpaceProfile>();
  const memories = new Map<string, Memory>();

  await app.register(cors, { origin: true, credentials: true });
  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || "dev-jwt-insecure-secret-change-in-production-min32chars",
  });

  // Health check
  app.get("/health", async (req, reply) => {
    const isDbHealthy = await db.healthCheck();
    return reply.status(200).send(
      createSuccessResponse({
        service: "memory-service",
        status: isDbHealthy ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
      })
    );
  });

  // 1. Create Memory Space
  const CreateSpaceSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    type: z.enum(["personal", "family", "event", "journey"]).default("family"),
  });

  app.post("/api/v1/spaces", async (req: FastifyRequest, reply: FastifyReply) => {
    let userId = "00000000-0000-0000-0000-000000000000";
    try {
      const claims: any = await req.jwtVerify();
      userId = claims.sub;
    } catch {
      // In dev fallback, allow anonymous or simulated
    }

    const parseResult = CreateSpaceSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send(createErrorResponse("VALIDATION_ERROR", "Invalid space payload"));
    }

    const spaceId = crypto.randomUUID();
    const now = new Date().toISOString();

    const space: MemorySpace = {
      id: spaceId,
      ownerId: userId,
      name: parseResult.data.name,
      description: parseResult.data.description,
      type: parseResult.data.type,
      createdAt: now,
      updatedAt: now,
    };

    spaces.set(spaceId, space);

    await eventBus.publish(
      "memory.space.created",
      createDomainEvent("space.created", "memory-service", { spaceId, ownerId: userId, name: space.name })
    );

    return reply.status(201).send(createSuccessResponse(space));
  });

  // List Spaces
  app.get("/api/v1/spaces", async (req, reply) => {
    return reply.status(200).send(createSuccessResponse(Array.from(spaces.values())));
  });

  // 2. Create Profile inside Space (Child, Parent, Pet, etc.)
  const CreateProfileSchema = z.object({
    spaceId: z.string().uuid(),
    name: z.string().min(1),
    relationship: z.string().optional(),
    type: z.enum(["child", "parent", "pet", "individual", "couple"]),
    birthDate: z.string().optional(),
  });

  app.post("/api/v1/spaces/:spaceId/profiles", async (req: FastifyRequest<{ Params: { spaceId: string } }>, reply) => {
    const space = spaces.get(req.params.spaceId);
    if (!space) {
      return reply.status(404).send(createErrorResponse("SPACE_NOT_FOUND", "Space does not exist"));
    }

    const parseResult = CreateProfileSchema.safeParse({ ...((req.body as object) || {}), spaceId: req.params.spaceId });
    if (!parseResult.success) {
      return reply.status(400).send(createErrorResponse("VALIDATION_ERROR", "Invalid profile parameters"));
    }

    const profileId = crypto.randomUUID();
    const now = new Date().toISOString();

    const profile: SpaceProfile = {
      id: profileId,
      spaceId: req.params.spaceId,
      name: parseResult.data.name,
      relationship: parseResult.data.relationship,
      type: parseResult.data.type,
      birthDate: parseResult.data.birthDate,
      createdAt: now,
      updatedAt: now,
    };

    profiles.set(profileId, profile);
    return reply.status(201).send(createSuccessResponse(profile));
  });

  // List profiles for space
  app.get("/api/v1/spaces/:spaceId/profiles", async (req: FastifyRequest<{ Params: { spaceId: string } }>, reply) => {
    const list = Array.from(profiles.values()).filter((p) => p.spaceId === req.params.spaceId);
    return reply.status(200).send(createSuccessResponse(list));
  });

  // 3. Create Memory
  const CreateMemorySchema = z.object({
    spaceId: z.string().uuid(),
    title: z.string().min(1),
    content: z.string().optional(),
    format: z.enum(["image", "video", "audio", "story", "document", "mixed"]).default("image"),
    capturedAt: z.string().default(() => new Date().toISOString()),
    location: z.string().optional(),
    associatedProfileIds: z.array(z.string().uuid()).default([]),
    mediaIds: z.array(z.string().uuid()).default([]),
    tags: z.array(z.string()).default([]),
  });

  app.post("/api/v1/memories", async (req: FastifyRequest, reply) => {
    let userId = "00000000-0000-0000-0000-000000000000";
    try {
      const claims: any = await req.jwtVerify();
      userId = claims.sub;
    } catch {}

    const parseResult = CreateMemorySchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send(createErrorResponse("VALIDATION_ERROR", "Invalid memory payload", "corr", parseResult.error.issues));
    }

    const memoryId = crypto.randomUUID();
    const now = new Date().toISOString();

    const memory: Memory = {
      id: memoryId,
      spaceId: parseResult.data.spaceId,
      authorId: userId,
      title: parseResult.data.title,
      content: parseResult.data.content,
      format: parseResult.data.format,
      capturedAt: parseResult.data.capturedAt,
      location: parseResult.data.location,
      isFavorite: false,
      associatedProfileIds: parseResult.data.associatedProfileIds,
      mediaIds: parseResult.data.mediaIds,
      tags: parseResult.data.tags,
      createdAt: now,
      updatedAt: now,
    };

    memories.set(memoryId, memory);

    // Publish memory.created event
    await eventBus.publish(
      "memory.created",
      createDomainEvent("memory.created", "memory-service", {
        memoryId,
        spaceId: memory.spaceId,
        authorId: userId,
        format: memory.format,
      })
    );

    return reply.status(201).send(createSuccessResponse(memory));
  });

  // List / Timeline of Memories
  app.get("/api/v1/memories", async (req: FastifyRequest<{ Querystring: { spaceId?: string; favoriteOnly?: string } }>, reply) => {
    let list = Array.from(memories.values());

    if (req.query.spaceId) {
      list = list.filter((m) => m.spaceId === req.query.spaceId);
    }
    if (req.query.favoriteOnly === "true") {
      list = list.filter((m) => m.isFavorite);
    }

    // Sort descending by captured date
    list.sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());

    return reply.status(200).send(createSuccessResponse(list));
  });

  // Get Memory by ID
  app.get("/api/v1/memories/:id", async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const memory = memories.get(req.params.id);
    if (!memory) {
      return reply.status(404).send(createErrorResponse("NOT_FOUND", "Memory not found"));
    }
    return reply.status(200).send(createSuccessResponse(memory));
  });

  return app;
}

if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT_MEMORY || 4002);
  const host = "0.0.0.0";

  buildMemoryService().then((app) => {
    app.listen({ port, host }, (err, address) => {
      if (err) {
        logger.error({ err }, "[MemoryService] Failed to start");
        process.exit(1);
      }
      logger.info({ address, port }, `[MemoryService] Listening at ${address}`);
    });
  });
}
