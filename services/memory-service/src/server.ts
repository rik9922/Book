import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import cors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import crypto from "node:crypto";
import { z } from "zod";
import { createServiceLogger, Logger } from "@memory-capsule/logger";
import {
  BaseServiceConfigSchema,
  validateServiceConfig,
  createFastifyErrorHandler,
  UnauthorizedError,
  ForbiddenError,
  MemorySpace,
  SpaceProfile,
  Memory,
  createSuccessResponse,
  createErrorResponse,
  createDomainEvent,
  startServiceServer,
} from "@memory-capsule/contracts";
import { startMemoryGrpcServer } from "./grpc-server.js";
import { createEventBus, EventBus } from "@memory-capsule/events";
import {
  createDatabaseClient,
  DatabaseClient,
  PostgresSpaceRepository,
  PostgresMemoryRepository,
  PostgresCollaborationRepository,
  PostgresOutboxRepository,
  SpaceRepository,
  MemoryRepository,
  CollaborationRepository,
  OutboxRepository,
} from "@memory-capsule/database";

const logger: Logger = createServiceLogger("memory-service");

// Fallback in-memory repositories for isolated unit tests
class InMemorySpaceTestRepo implements SpaceRepository {
  private spaces = new Map<string, MemorySpace>();
  private profiles = new Map<string, SpaceProfile>();

  async createSpace(space: MemorySpace): Promise<MemorySpace> {
    this.spaces.set(space.id, space);
    return space;
  }
  async findSpaceById(id: string): Promise<MemorySpace | null> {
    return this.spaces.get(id) || null;
  }
  async listSpaces(ownerId?: string): Promise<MemorySpace[]> {
    const list = Array.from(this.spaces.values());
    return ownerId ? list.filter((s) => s.ownerId === ownerId) : list;
  }
  async createProfile(profile: SpaceProfile): Promise<SpaceProfile> {
    this.profiles.set(profile.id, profile);
    return profile;
  }
  async listProfiles(spaceId: string): Promise<SpaceProfile[]> {
    return Array.from(this.profiles.values()).filter((p) => p.spaceId === spaceId);
  }
  async findProfileById(id: string): Promise<SpaceProfile | null> {
    return this.profiles.get(id) || null;
  }
}

class InMemoryMemoryTestRepo implements MemoryRepository {
  private memories = new Map<string, Memory>();

  async createMemory(memory: Memory): Promise<Memory> {
    this.memories.set(memory.id, memory);
    return memory;
  }
  async findMemoryById(id: string): Promise<Memory | null> {
    return this.memories.get(id) || null;
  }
  async listMemories(
    spaceId: string,
    options?: { profileId?: string; isFavorite?: boolean }
  ): Promise<Memory[]> {
    let list = Array.from(this.memories.values()).filter((m) => m.spaceId === spaceId);
    if (options?.profileId) {
      list = list.filter((m) => m.associatedProfileIds.includes(options.profileId!));
    }
    if (options?.isFavorite !== undefined) {
      list = list.filter((m) => m.isFavorite === options.isFavorite);
    }
    return list;
  }
  async listMemoriesKeyset(spaceId: string, options?: any): Promise<any> {
    const list = await this.listMemories(spaceId, options);
    return {
      items: list.slice(0, options?.limit || 20),
      nextCursor: null,
      hasMore: false,
    };
  }
  async searchMemories(spaceId: string, queryText: string, limit = 20): Promise<Memory[]> {
    const q = queryText.toLowerCase();
    return Array.from(this.memories.values())
      .filter(
        (m) =>
          m.spaceId === spaceId &&
          (m.title.toLowerCase().includes(q) || (m.content && m.content.toLowerCase().includes(q)))
      )
      .slice(0, limit);
  }
  async updateMemory(id: string, updates: Partial<Memory>): Promise<Memory | null> {
    const existing = this.memories.get(id);
    if (!existing) return null;
    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.memories.set(id, merged);
    return merged;
  }
  async softDeleteMemory(id: string): Promise<boolean> {
    return this.memories.delete(id);
  }
}

export async function buildMemoryService(): Promise<FastifyInstance> {
  const cfg = validateServiceConfig(BaseServiceConfigSchema);
  const app = Fastify({ logger: false });
  app.setErrorHandler(createFastifyErrorHandler(logger));

  const dbUrl = cfg.MEMORY_DATABASE_URL || cfg.DATABASE_URL;
  if (!dbUrl && cfg.NODE_ENV !== "test") {
    throw new Error(
      "[memory-service] Database connection string required in non-test mode. Set MEMORY_DATABASE_URL or DATABASE_URL."
    );
  }
  const db: DatabaseClient = createDatabaseClient(dbUrl);
  if (cfg.NODE_ENV !== "test") {
    const isHealthy = await db.healthCheck();
    if (!isHealthy) {
      throw new Error(
        "[memory-service] PostgreSQL database health check failed during service initialization."
      );
    }
  }
  const eventBus: EventBus = await createEventBus(cfg.NATS_URL);

  const spaceRepo: SpaceRepository = dbUrl
    ? new PostgresSpaceRepository(db)
    : new InMemorySpaceTestRepo();

  const memoryRepo: MemoryRepository = dbUrl
    ? new PostgresMemoryRepository(db)
    : new InMemoryMemoryTestRepo();

  const collabDb: DatabaseClient | null = cfg.COLLAB_DATABASE_URL
    ? createDatabaseClient(cfg.COLLAB_DATABASE_URL)
    : null;
  const collabRepo: CollaborationRepository | null = collabDb
    ? new PostgresCollaborationRepository(collabDb)
    : null;

  const outboxRepo: OutboxRepository | null = dbUrl ? new PostgresOutboxRepository(db) : null;
  let outboxTimer: NodeJS.Timeout | null = null;
  if (outboxRepo && outboxRepo.relayPending) {
    outboxTimer = setInterval(() => {
      outboxRepo
        .relayPending!(async (evt) => {
          await eventBus.publish(
            evt.eventType,
            createDomainEvent(evt.eventType, "memory-service", evt.payload)
          );
        })
        .catch((err) => {
          logger.warn({ err }, "[Memory Outbox] Relay cycle warning");
        });
    }, 1000);
    outboxTimer.unref();
  }

  app.addHook("onClose", async () => {
    if (outboxTimer) clearInterval(outboxTimer);
    await eventBus.close().catch((err) => logger.warn({ err }, "[Memory] EventBus close warning"));
    if (collabDb) {
      await collabDb.close().catch((err) => logger.warn({ err }, "[Memory] Collab DB close warning"));
    }
    await db.close().catch((err) => logger.warn({ err }, "[Memory] DB close warning"));
  });

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

  await app.register(fastifyJwt, { secret: cfg.JWT_SECRET });

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

  // Strict authenticated user extraction (zero test bypasses)
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
  ): Promise<MemorySpace> {
    const space = await spaceRepo.findSpaceById(spaceId);
    if (!space) {
      throw new ForbiddenError("Space not found or access denied");
    }
    if (space.ownerId === userId) {
      return space;
    }
    if (collabRepo) {
      const member = await collabRepo.getMember(spaceId, userId);
      if (member) {
        if (requireWrite && member.role === "viewer") {
          throw new ForbiddenError("Viewer role does not permit write operations");
        }
        return space;
      }
    }
    throw new ForbiddenError("You do not have access to this memory space");
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
        aggregateType: "memory",
        aggregateId,
        payload,
      });
      if (outboxRepo.relayPending) {
        await outboxRepo.relayPending(async (evt) => {
          await eventBus.publish(
            evt.eventType,
            createDomainEvent(eventType, "memory-service", evt.payload)
          );
        });
      }
    } else {
      await eventBus.publish(subject, createDomainEvent(eventType, "memory-service", payload));
    }
  }

  // 1. Create Memory Space
  const CreateSpaceSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    type: z.enum(["personal", "family", "event", "journey"]).default("family"),
  });

  app.post("/api/v1/spaces", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = await requireAuthUser(req);
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

    await spaceRepo.createSpace(space);
    await publishDomainEvent("memory.space.created", "space.created", spaceId, {
      spaceId,
      ownerId: userId,
      name: space.name,
    });

    return reply.status(201).send(createSuccessResponse(space));
  });

  // List Spaces for current user (owned + collaborated via collab_db)
  app.get("/api/v1/spaces", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = await requireAuthUser(req);
    const ownedSpaces = await spaceRepo.listSpaces(userId);
    if (!collabDb) {
      return reply.status(200).send(createSuccessResponse(ownedSpaces));
    }

    const memberRes = await collabDb.query<{ space_id: string }>(
      `SELECT space_id FROM space_members WHERE user_id = $1`,
      [userId]
    );
    const seen = new Set(ownedSpaces.map((s) => s.id));
    const combined = [...ownedSpaces];
    for (const row of memberRes.rows) {
      if (!seen.has(row.space_id)) {
        const memberSpace = await spaceRepo.findSpaceById(row.space_id);
        if (memberSpace) {
          seen.add(memberSpace.id);
          combined.push(memberSpace);
        }
      }
    }
    return reply.status(200).send(createSuccessResponse(combined));
  });

  // Get Space by ID (requires membership/ownership)
  app.get(
    "/api/v1/spaces/:spaceId",
    async (req: FastifyRequest<{ Params: { spaceId: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      const space = await spaceRepo.findSpaceById(req.params.spaceId);
      if (!space) {
        return reply.status(404).send(createErrorResponse("SPACE_NOT_FOUND", "Space does not exist"));
      }
      await assertSpaceAccess(space.id, userId, false);
      return reply.status(200).send(createSuccessResponse(space));
    }
  );

  // 2. Create Profile inside Space
  const CreateProfileSchema = z.object({
    name: z.string().min(1),
    relationship: z.string().optional(),
    type: z.enum(["child", "parent", "pet", "individual", "couple"]).default("individual"),
    birthDate: z.string().optional(),
  });

  app.post(
    "/api/v1/spaces/:spaceId/profiles",
    async (req: FastifyRequest<{ Params: { spaceId: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      const space = await spaceRepo.findSpaceById(req.params.spaceId);
      if (!space) {
        return reply.status(404).send(createErrorResponse("SPACE_NOT_FOUND", "Space does not exist"));
      }
      await assertSpaceAccess(space.id, userId, true);

      const parseResult = CreateProfileSchema.safeParse(req.body);
      if (!parseResult.success) {
        return reply.status(400).send(createErrorResponse("VALIDATION_ERROR", "Invalid profile payload"));
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

      await spaceRepo.createProfile(profile);
      await publishDomainEvent("memory.profile.created", "profile.created", profileId, {
        profileId,
        spaceId: req.params.spaceId,
        name: profile.name,
      });

      return reply.status(201).send(createSuccessResponse(profile));
    }
  );

  // List Profiles in Space
  app.get(
    "/api/v1/spaces/:spaceId/profiles",
    async (req: FastifyRequest<{ Params: { spaceId: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      const space = await spaceRepo.findSpaceById(req.params.spaceId);
      if (!space) {
        return reply.status(404).send(createErrorResponse("SPACE_NOT_FOUND", "Space does not exist"));
      }
      await assertSpaceAccess(space.id, userId, false);
      const list = await spaceRepo.listProfiles(req.params.spaceId);
      return reply.status(200).send(createSuccessResponse(list));
    }
  );

  // 3. Create Memory (Story, Photo, Audio Note, Video)
  const CreateMemoryPayloadSchema = z.object({
    title: z.string().min(1),
    content: z.string().optional().nullable(),
    format: z.enum(["image", "video", "audio", "story", "document", "mixed"]).default("image"),
    capturedAt: z.string().optional(),
    location: z.string().optional().nullable(),
    associatedProfileIds: z.array(z.string().uuid()).optional(),
    mediaIds: z.array(z.string().uuid()).optional(),
    tags: z.array(z.string()).optional(),
  });

  app.post(
    "/api/v1/spaces/:spaceId/memories",
    async (req: FastifyRequest<{ Params: { spaceId: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      const space = await spaceRepo.findSpaceById(req.params.spaceId);
      if (!space) {
        return reply.status(404).send(createErrorResponse("SPACE_NOT_FOUND", "Space does not exist"));
      }
      await assertSpaceAccess(space.id, userId, true);

      const parseResult = CreateMemoryPayloadSchema.safeParse(req.body);
      if (!parseResult.success) {
        return reply.status(400).send(createErrorResponse("VALIDATION_ERROR", "Invalid memory payload"));
      }

      const memoryId = crypto.randomUUID();
      const now = new Date().toISOString();

      const memory: Memory = {
        id: memoryId,
        spaceId: req.params.spaceId,
        authorId: userId,
        title: parseResult.data.title,
        content: parseResult.data.content || undefined,
        format: parseResult.data.format,
        capturedAt: parseResult.data.capturedAt || now,
        location: parseResult.data.location || undefined,
        isFavorite: false,
        associatedProfileIds: parseResult.data.associatedProfileIds || [],
        mediaIds: parseResult.data.mediaIds || [],
        tags: parseResult.data.tags || [],
        createdAt: now,
        updatedAt: now,
      };

      await memoryRepo.createMemory(memory);
      await publishDomainEvent("memory.memory.created", "memory.created", memoryId, {
        memoryId,
        spaceId: req.params.spaceId,
        authorId: userId,
        format: memory.format,
      });

      return reply.status(201).send(createSuccessResponse(memory));
    }
  );

  // POST /api/v1/memories (alias accepting spaceId in body)
  app.post("/api/v1/memories", async (req: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
    const userId = await requireAuthUser(req);
    const body = (req.body as any) || {};
    const spaceId = body.spaceId;
    if (!spaceId) {
      return reply.status(400).send(createErrorResponse("VALIDATION_ERROR", "spaceId is required"));
    }

    const space = await spaceRepo.findSpaceById(spaceId);
    if (!space) {
      return reply.status(404).send(createErrorResponse("SPACE_NOT_FOUND", "Space does not exist"));
    }
    await assertSpaceAccess(space.id, userId, true);

    const parseResult = CreateMemoryPayloadSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send(createErrorResponse("VALIDATION_ERROR", "Invalid memory payload"));
    }

    const memoryId = crypto.randomUUID();
    const now = new Date().toISOString();

    const memory: Memory = {
      id: memoryId,
      spaceId,
      authorId: userId,
      title: parseResult.data.title,
      content: parseResult.data.content || undefined,
      format: parseResult.data.format,
      capturedAt: parseResult.data.capturedAt || now,
      location: parseResult.data.location || undefined,
      isFavorite: false,
      associatedProfileIds: parseResult.data.associatedProfileIds || [],
      mediaIds: parseResult.data.mediaIds || [],
      tags: parseResult.data.tags || [],
      createdAt: now,
      updatedAt: now,
    };

    await memoryRepo.createMemory(memory);
    await publishDomainEvent("memory.memory.created", "memory.created", memoryId, {
      memoryId,
      spaceId,
      authorId: userId,
      format: memory.format,
    });

    return reply.status(201).send(createSuccessResponse(memory));
  });

  // GET /api/v1/memories?spaceId=... (alias)
  app.get(
    "/api/v1/memories",
    async (
      req: FastifyRequest<{ Querystring: { spaceId?: string; profileId?: string; isFavorite?: string } }>,
      reply
    ) => {
      const userId = await requireAuthUser(req);
      const spaceId = req.query.spaceId;
      if (!spaceId) {
        return reply
          .status(400)
          .send(createErrorResponse("MISSING_SPACE_ID", "spaceId query parameter required"));
      }
      await assertSpaceAccess(spaceId, userId, false);
      const list = await memoryRepo.listMemories(spaceId, {
        profileId: req.query.profileId,
        isFavorite: req.query.isFavorite !== undefined ? req.query.isFavorite === "true" : undefined,
      });
      return reply.status(200).send(createSuccessResponse(list));
    }
  );

  // Query Memories (Chronological Timeline or Filtered)
  app.get(
    "/api/v1/spaces/:spaceId/memories",
    async (
      req: FastifyRequest<{
        Params: { spaceId: string };
        Querystring: { profileId?: string; isFavorite?: string };
      }>,
      reply
    ) => {
      const userId = await requireAuthUser(req);
      await assertSpaceAccess(req.params.spaceId, userId, false);
      const list = await memoryRepo.listMemories(req.params.spaceId, {
        profileId: req.query.profileId,
        isFavorite: req.query.isFavorite !== undefined ? req.query.isFavorite === "true" : undefined,
      });
      return reply.status(200).send(createSuccessResponse(list));
    }
  );

  // Search Memories in Space (FTS)
  app.get(
    "/api/v1/spaces/:spaceId/memories/search",
    async (
      req: FastifyRequest<{ Params: { spaceId: string }; Querystring: { q?: string; limit?: string } }>,
      reply
    ) => {
      const userId = await requireAuthUser(req);
      await assertSpaceAccess(req.params.spaceId, userId, false);
      const q = req.query.q?.trim();
      if (!q) {
        return reply.status(400).send(createErrorResponse("INVALID_QUERY", "q query parameter required"));
      }
      const limit = req.query.limit ? Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100) : 20;
      const results = await memoryRepo.searchMemories(req.params.spaceId, q, limit);
      return reply.status(200).send(createSuccessResponse(results));
    }
  );

  // Get Single Memory
  app.get(
    "/api/v1/memories/:memoryId",
    async (req: FastifyRequest<{ Params: { memoryId: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      const memory = await memoryRepo.findMemoryById(req.params.memoryId);
      if (!memory) {
        return reply.status(404).send(createErrorResponse("MEMORY_NOT_FOUND", "Memory not found"));
      }
      await assertSpaceAccess(memory.spaceId, userId, false);
      return reply.status(200).send(createSuccessResponse(memory));
    }
  );

  // Update Memory
  const UpdateMemoryPayloadSchema = z.object({
    title: z.string().min(1).optional(),
    content: z.string().optional().nullable(),
    capturedAt: z.string().optional(),
    location: z.string().optional().nullable(),
    isFavorite: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    associatedProfileIds: z.array(z.string().uuid()).optional(),
    mediaIds: z.array(z.string().uuid()).optional(),
  });

  app.patch(
    "/api/v1/memories/:memoryId",
    async (req: FastifyRequest<{ Params: { memoryId: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      const memory = await memoryRepo.findMemoryById(req.params.memoryId);
      if (!memory) {
        return reply.status(404).send(createErrorResponse("MEMORY_NOT_FOUND", "Memory not found"));
      }
      await assertSpaceAccess(memory.spaceId, userId, true);

      const parseResult = UpdateMemoryPayloadSchema.safeParse(req.body);
      if (!parseResult.success) {
        return reply.status(400).send(createErrorResponse("VALIDATION_ERROR", "Invalid memory update payload"));
      }

      const updated = await memoryRepo.updateMemory(memory.id, {
        ...parseResult.data,
        content: parseResult.data.content === null ? undefined : parseResult.data.content,
        location: parseResult.data.location === null ? undefined : parseResult.data.location,
      });

      return reply.status(200).send(createSuccessResponse(updated));
    }
  );

  // Soft-Delete Memory
  app.delete(
    "/api/v1/memories/:memoryId",
    async (req: FastifyRequest<{ Params: { memoryId: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      const memory = await memoryRepo.findMemoryById(req.params.memoryId);
      if (!memory) {
        return reply.status(404).send(createErrorResponse("MEMORY_NOT_FOUND", "Memory not found"));
      }
      await assertSpaceAccess(memory.spaceId, userId, true);

      const deleted = await memoryRepo.softDeleteMemory(memory.id);
      if (deleted) {
        await publishDomainEvent("memory.memory.deleted", "memory.deleted", memory.id, {
          memoryId: memory.id,
          spaceId: memory.spaceId,
          deletedBy: userId,
        });
      }
      return reply.status(200).send(createSuccessResponse({ deleted, memoryId: memory.id }));
    }
  );

  return app;
}

export * from "./grpc-server.js";

if (process.env.NODE_ENV !== "test") {
  (async () => {
    try {
      const app = await buildMemoryService();
      const { server: grpcServer } = await startMemoryGrpcServer();
      await startServiceServer({
        serviceId: "memory-service",
        app,
        logger,
        grpcServer,
      });
    } catch (err) {
      logger.error({ err }, "[Memory] Unexpected startup failure");
      process.exit(1);
    }
  })();
}
