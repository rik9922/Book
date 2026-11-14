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
  PostgresCollectionRepository,
  PostgresMemoryCommentRepository,
  PostgresMemoryReactionRepository,
  SpaceRepository,
  MemoryRepository,
  CollaborationRepository,
  OutboxRepository,
  CollectionRepository,
  MemoryCommentRepository,
  MemoryReactionRepository,
  MemoryReactionKind,
  MemoryReactionState,
  CollectionRecord,
  MemoryCommentRecord,
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
  async updateSpace(
    id: string,
    updates: Partial<Pick<MemorySpace, "name" | "description" | "type" | "coverUrl">>
  ): Promise<MemorySpace | null> {
    const existing = this.spaces.get(id);
    if (!existing) return null;
    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.spaces.set(id, merged);
    return merged;
  }
  async softDeleteSpace(id: string): Promise<boolean> {
    return this.spaces.delete(id);
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
  async updateProfile(
    id: string,
    updates: Partial<Pick<SpaceProfile, "name" | "relationship" | "type" | "birthDate" | "avatarMediaId">>
  ): Promise<SpaceProfile | null> {
    const existing = this.profiles.get(id);
    if (!existing) return null;
    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.profiles.set(id, merged);
    return merged;
  }
  async softDeleteProfile(id: string): Promise<boolean> {
    return this.profiles.delete(id);
  }
}

class InMemoryMemoryTestRepo implements MemoryRepository {
  private memories = new Map<string, Memory>();
  private deletedMemories = new Map<string, Memory>();

  async createMemory(memory: Memory): Promise<Memory> {
    this.memories.set(memory.id, memory);
    return memory;
  }
  async findMemoryById(id: string, includeDeleted = false): Promise<Memory | null> {
    return this.memories.get(id) || (includeDeleted ? this.deletedMemories.get(id) || null : null);
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
  async listDeletedMemories(spaceId: string): Promise<Memory[]> {
    return Array.from(this.deletedMemories.values()).filter((m) => m.spaceId === spaceId);
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
    const existing = this.memories.get(id);
    if (!existing) return false;
    this.memories.delete(id);
    this.deletedMemories.set(id, existing);
    return true;
  }
  async restoreMemory(id: string): Promise<Memory | null> {
    const existing = this.deletedMemories.get(id);
    if (!existing) return null;
    this.deletedMemories.delete(id);
    const restored = { ...existing, updatedAt: new Date().toISOString() };
    this.memories.set(id, restored);
    return restored;
  }
  async hardDeleteMemory(id: string): Promise<boolean> {
    return this.deletedMemories.delete(id);
  }
}

class InMemoryCollectionTestRepo implements CollectionRepository {
  private collections = new Map<string, CollectionRecord>();
  private sortOrders = new Map<string, Map<string, number>>();
  async createCollection(col: Omit<CollectionRecord, "createdAt" | "updatedAt" | "memoryIds">): Promise<CollectionRecord> {
    const now = new Date().toISOString();
    const record: CollectionRecord = { ...col, memoryIds: [], createdAt: now, updatedAt: now };
    this.collections.set(col.id, record);
    return record;
  }
  async listCollections(spaceId: string): Promise<CollectionRecord[]> {
    return Array.from(this.collections.values()).filter((c) => c.spaceId === spaceId);
  }
  async findCollectionById(id: string): Promise<CollectionRecord | null> {
    return this.collections.get(id) || null;
  }
  async updateCollection(id: string, updates: Partial<Pick<CollectionRecord, "title" | "description" | "coverMemoryId">>): Promise<CollectionRecord | null> {
    const existing = this.collections.get(id);
    if (!existing) return null;
    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.collections.set(id, merged);
    return merged;
  }
  async deleteCollection(id: string): Promise<boolean> {
    this.sortOrders.delete(id);
    return this.collections.delete(id);
  }
  async addMemory(collectionId: string, memoryId: string, sortOrder = 0): Promise<void> {
    const existing = this.collections.get(collectionId);
    if (!existing) return;
    const orderMap = this.sortOrders.get(collectionId) || new Map<string, number>();
    orderMap.set(memoryId, sortOrder);
    this.sortOrders.set(collectionId, orderMap);
    const ids = Array.from(new Set([...(existing.memoryIds || []), memoryId]));
    ids.sort((a, b) => (orderMap.get(a) ?? 0) - (orderMap.get(b) ?? 0));
    this.collections.set(collectionId, { ...existing, memoryIds: ids, updatedAt: new Date().toISOString() });
  }
  async removeMemory(collectionId: string, memoryId: string): Promise<boolean> {
    const existing = this.collections.get(collectionId);
    if (!existing) return false;
    this.sortOrders.get(collectionId)?.delete(memoryId);
    const next = (existing.memoryIds || []).filter((id) => id !== memoryId);
    this.collections.set(collectionId, { ...existing, memoryIds: next });
    return true;
  }
}

class InMemoryCommentTestRepo implements MemoryCommentRepository {
  private comments = new Map<string, MemoryCommentRecord>();
  async createComment(comment: Omit<MemoryCommentRecord, "createdAt">): Promise<MemoryCommentRecord> {
    const record: MemoryCommentRecord = { ...comment, createdAt: new Date().toISOString() };
    this.comments.set(comment.id, record);
    return record;
  }
  async listComments(memoryId: string): Promise<MemoryCommentRecord[]> {
    return Array.from(this.comments.values()).filter((c) => c.memoryId === memoryId);
  }
  async deleteComment(id: string, authorId: string): Promise<boolean> {
    const existing = this.comments.get(id);
    if (!existing || existing.authorId !== authorId) return false;
    return this.comments.delete(id);
  }
}

class InMemoryReactionTestRepo implements MemoryReactionRepository {
  // memoryId -> kind -> Set<userId>
  private store = new Map<string, Map<MemoryReactionKind, Set<string>>>();

  async getReactionState(memoryId: string, userId: string): Promise<MemoryReactionState> {
    const byKind = this.store.get(memoryId);
    const counts: Record<string, number> = {};
    const selectedKinds: MemoryReactionKind[] = [];
    if (byKind) {
      for (const [kind, users] of byKind.entries()) {
        if (users.size > 0) {
          counts[kind] = users.size;
          if (users.has(userId)) {
            selectedKinds.push(kind);
          }
        }
      }
    }
    return { memoryId, counts, selectedKinds };
  }

  async toggleReaction(
    memoryId: string,
    _spaceId: string,
    userId: string,
    kind: MemoryReactionKind
  ): Promise<{ state: MemoryReactionState; active: boolean }> {
    const byKind = this.store.get(memoryId) || new Map<MemoryReactionKind, Set<string>>();
    const users = byKind.get(kind) || new Set<string>();
    let active = false;
    if (users.has(userId)) {
      users.delete(userId);
      active = false;
    } else {
      users.add(userId);
      active = true;
    }
    byKind.set(kind, users);
    this.store.set(memoryId, byKind);
    const state = await this.getReactionState(memoryId, userId);
    return { state, active };
  }

  async setReaction(
    memoryId: string,
    _spaceId: string,
    userId: string,
    kind: MemoryReactionKind,
    active: boolean
  ): Promise<MemoryReactionState> {
    const byKind = this.store.get(memoryId) || new Map<MemoryReactionKind, Set<string>>();
    const users = byKind.get(kind) || new Set<string>();
    if (active) {
      users.add(userId);
    } else {
      users.delete(userId);
    }
    byKind.set(kind, users);
    this.store.set(memoryId, byKind);
    return this.getReactionState(memoryId, userId);
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

  const collectionRepo: CollectionRepository = dbUrl
    ? new PostgresCollectionRepository(db)
    : new InMemoryCollectionTestRepo();

  const commentRepo: MemoryCommentRepository = dbUrl
    ? new PostgresMemoryCommentRepository(db)
    : new InMemoryCommentTestRepo();

  const reactionRepo: MemoryReactionRepository = dbUrl
    ? new PostgresMemoryReactionRepository(db)
    : new InMemoryReactionTestRepo();

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
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
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
    if (collabRepo) {
      await collabRepo.addMember({
        id: crypto.randomUUID(),
        spaceId,
        userId,
        role: "owner",
        permissions: {
          can_create_memories: true,
          can_edit_books: true,
          can_invite: true,
        },
      });
    }
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

  // Update Space Settings
  const UpdateSpaceSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().nullable().optional(),
    type: z.enum(["personal", "family", "event", "journey"]).optional(),
  });

  app.patch(
    "/api/v1/spaces/:spaceId",
    async (req: FastifyRequest<{ Params: { spaceId: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      const space = await spaceRepo.findSpaceById(req.params.spaceId);
      if (!space) {
        return reply.status(404).send(createErrorResponse("SPACE_NOT_FOUND", "Space does not exist"));
      }
      await assertSpaceAccess(space.id, userId, true);
      const parseResult = UpdateSpaceSchema.safeParse(req.body);
      if (!parseResult.success) {
        return reply.status(400).send(createErrorResponse("VALIDATION_ERROR", "Invalid space update payload"));
      }
      const updated = spaceRepo.updateSpace
        ? await spaceRepo.updateSpace(space.id, {
            ...parseResult.data,
            description: parseResult.data.description === null ? undefined : parseResult.data.description,
          })
        : space;
      return reply.status(200).send(createSuccessResponse(updated));
    }
  );

  // Soft-Delete / Archive Space (Owner only)
  app.delete(
    "/api/v1/spaces/:spaceId",
    async (req: FastifyRequest<{ Params: { spaceId: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      const space = await spaceRepo.findSpaceById(req.params.spaceId);
      if (!space) {
        return reply.status(404).send(createErrorResponse("SPACE_NOT_FOUND", "Space does not exist"));
      }
      if (space.ownerId !== userId) {
        throw new ForbiddenError("Only the space owner can archive or delete a memory space");
      }
      const deleted = spaceRepo.softDeleteSpace ? await spaceRepo.softDeleteSpace(space.id) : false;
      return reply.status(200).send(createSuccessResponse({ deleted, spaceId: space.id }));
    }
  );

  // 2. Create Profile inside Space
  const CreateProfileSchema = z.object({
    name: z.string().min(1),
    relationship: z.string().nullable().optional(),
    type: z.enum(["child", "parent", "pet", "individual", "couple"]).default("individual"),
    birthDate: z.string().nullable().optional(),
  });

  const UpdateProfileSchema = z.object({
    name: z.string().min(1).optional(),
    relationship: z.string().nullable().optional(),
    type: z.enum(["child", "parent", "pet", "individual", "couple"]).optional(),
    birthDate: z.string().nullable().optional(),
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
        relationship: parseResult.data.relationship || undefined,
        type: parseResult.data.type,
        birthDate: parseResult.data.birthDate || undefined,
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

  app.patch(
    "/api/v1/spaces/:spaceId/profiles/:profileId",
    async (req: FastifyRequest<{ Params: { spaceId: string; profileId: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      await assertSpaceAccess(req.params.spaceId, userId, true);
      const existing = await spaceRepo.findProfileById(req.params.profileId);
      if (!existing || existing.spaceId !== req.params.spaceId) {
        return reply.status(404).send(createErrorResponse("PROFILE_NOT_FOUND", "Profile not found"));
      }
      const parsed = UpdateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send(createErrorResponse("VALIDATION_ERROR", "Invalid profile update payload"));
      }
      const updates: Partial<Pick<SpaceProfile, "name" | "relationship" | "type" | "birthDate" | "avatarMediaId">> = {};
      if (parsed.data.name !== undefined) updates.name = parsed.data.name;
      if (parsed.data.type !== undefined) updates.type = parsed.data.type;
      if (parsed.data.relationship !== undefined) updates.relationship = parsed.data.relationship || undefined;
      if (parsed.data.birthDate !== undefined) updates.birthDate = parsed.data.birthDate || undefined;
      const updated = spaceRepo.updateProfile
        ? await spaceRepo.updateProfile(existing.id, updates)
        : existing;
      return reply.status(200).send(createSuccessResponse(updated));
    }
  );

  app.delete(
    "/api/v1/spaces/:spaceId/profiles/:profileId",
    async (req: FastifyRequest<{ Params: { spaceId: string; profileId: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      await assertSpaceAccess(req.params.spaceId, userId, true);
      const existing = await spaceRepo.findProfileById(req.params.profileId);
      if (!existing || existing.spaceId !== req.params.spaceId) {
        return reply.status(404).send(createErrorResponse("PROFILE_NOT_FOUND", "Profile not found"));
      }
      const deleted = spaceRepo.softDeleteProfile ? await spaceRepo.softDeleteProfile(existing.id) : false;
      return reply.status(200).send(createSuccessResponse({ deleted, profileId: existing.id }));
    }
  );

  // 3. Create Memory (Story, Photo, Audio Note, Video)
  const CreateMemoryPayloadSchema = z.object({
    id: z.string().uuid().optional(),
    clientMutationId: z.string().max(128).optional(),
    title: z.string().min(1),
    content: z.string().optional().nullable(),
    format: z.enum(["image", "video", "audio", "story", "document", "mixed"]).default("image"),
    capturedAt: z.string().optional(),
    location: z.string().optional().nullable(),
    associatedProfileIds: z.array(z.string().uuid()).optional(),
    mediaIds: z.array(z.string().uuid()).optional(),
    tags: z.array(z.string()).optional(),
  });

  async function createMemoryIdempotent(
    req: FastifyRequest,
    reply: FastifyReply,
    spaceId: string,
    userId: string,
    data: z.infer<typeof CreateMemoryPayloadSchema>
  ) {
    const headerIdempotencyKey =
      typeof req.headers["idempotency-key"] === "string"
        ? req.headers["idempotency-key"].trim()
        : undefined;
    const clientMutationId = data.clientMutationId || headerIdempotencyKey || undefined;

    if (clientMutationId && memoryRepo.findMemoryByClientMutationId) {
      const existingByMutation = await memoryRepo.findMemoryByClientMutationId(spaceId, clientMutationId);
      if (existingByMutation) {
        return reply.status(200).send(createSuccessResponse(existingByMutation));
      }
    }

    if (data.id) {
      const existingById = await memoryRepo.findMemoryById(data.id, true);
      if (existingById) {
        if (existingById.spaceId !== spaceId) {
          return reply
            .status(409)
            .send(createErrorResponse("MEMORY_ID_CONFLICT", "Memory ID already exists in another space"));
        }
        return reply.status(200).send(createSuccessResponse(existingById));
      }
    }

    const memoryId = data.id || crypto.randomUUID();
    const now = new Date().toISOString();

    const memory: Memory = {
      id: memoryId,
      spaceId,
      authorId: userId,
      title: data.title,
      content: data.content || undefined,
      format: data.format,
      capturedAt: data.capturedAt || now,
      location: data.location || undefined,
      isFavorite: false,
      associatedProfileIds: data.associatedProfileIds || [],
      mediaIds: data.mediaIds || [],
      tags: data.tags || [],
      revision: 1,
      clientMutationId,
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
  }

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

      return createMemoryIdempotent(req, reply, req.params.spaceId, userId, parseResult.data);
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

    return createMemoryIdempotent(req, reply, spaceId, userId, parseResult.data);
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
    expectedRevision: z.number().int().positive().optional(),
    expectedUpdatedAt: z.string().optional(),
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

      const { expectedRevision, expectedUpdatedAt, ...updateFields } = parseResult.data;
      const currentRevision = memory.revision ?? 1;
      if (
        (expectedRevision !== undefined && currentRevision !== expectedRevision) ||
        (expectedUpdatedAt !== undefined && memory.updatedAt !== expectedUpdatedAt)
      ) {
        return reply.status(409).send(
          createErrorResponse("VERSION_CONFLICT", "Memory has been modified on another device", "corr-unknown", [{
            serverMemory: memory,
            expectedRevision,
            currentRevision,
          }])
        );
      }

      const updated = await memoryRepo.updateMemory(memory.id, {
        ...updateFields,
        content: updateFields.content === null ? undefined : updateFields.content,
        location: updateFields.location === null ? undefined : updateFields.location,
      });

      if (updated) {
        const changeSummary = `Updated fields: ${Object.keys(parseResult.data).join(", ")}`;
        if (dbUrl) {
          await db.query(
            `INSERT INTO memory_revisions (id, memory_id, space_id, editor_id, title, content, captured_at, change_summary)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              crypto.randomUUID(),
              memory.id,
              memory.spaceId,
              userId,
              updated.title,
              updated.content || null,
              updated.capturedAt || null,
              changeSummary,
            ]
          ).catch((err) => logger.warn({ err }, "[Memory] Non-fatal revision insert warning"));
        } else {
          const list = memRevisions.get(memory.id) || [];
          list.unshift({
            id: crypto.randomUUID(),
            memoryId: memory.id,
            editorId: userId,
            title: updated.title,
            content: updated.content || "",
            capturedAt: updated.capturedAt,
            changeSummary,
            createdAt: new Date().toISOString(),
          });
          memRevisions.set(memory.id, list);
        }
      }

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

  // Trash & Recovery (PWA-48 / IOS-34)
  app.get(
    "/api/v1/spaces/:spaceId/memories/trash",
    async (req: FastifyRequest<{ Params: { spaceId: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      await assertSpaceAccess(req.params.spaceId, userId, false);
      const items = memoryRepo.listDeletedMemories
        ? await memoryRepo.listDeletedMemories(req.params.spaceId)
        : [];
      return reply.status(200).send(createSuccessResponse(items));
    }
  );

  app.post(
    "/api/v1/memories/:memoryId/restore",
    async (req: FastifyRequest<{ Params: { memoryId: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      const existing = await memoryRepo.findMemoryById(req.params.memoryId, true);
      if (!existing) {
        return reply.status(404).send(createErrorResponse("MEMORY_NOT_FOUND", "Deleted memory not found"));
      }
      await assertSpaceAccess(existing.spaceId, userId, true);
      const restored = memoryRepo.restoreMemory ? await memoryRepo.restoreMemory(existing.id) : existing;
      return reply.status(200).send(createSuccessResponse(restored));
    }
  );

  app.delete(
    "/api/v1/memories/:memoryId/permanent",
    async (req: FastifyRequest<{ Params: { memoryId: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      const existing = await memoryRepo.findMemoryById(req.params.memoryId, true);
      if (!existing) {
        return reply.status(404).send(createErrorResponse("MEMORY_NOT_FOUND", "Deleted memory not found"));
      }
      await assertSpaceAccess(existing.spaceId, userId, true);
      const deleted = memoryRepo.hardDeleteMemory ? await memoryRepo.hardDeleteMemory(existing.id) : false;
      return reply.status(200).send(createSuccessResponse({ permanentlyDeleted: deleted, memoryId: existing.id }));
    }
  );

  // Curated Collections (PWA-29/30/31 & IOS-32/33)
  const CreateCollectionSchema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().optional().nullable(),
    coverMemoryId: z.string().uuid().optional().nullable(),
  });

  app.post(
    "/api/v1/spaces/:spaceId/collections",
    async (req: FastifyRequest<{ Params: { spaceId: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      await assertSpaceAccess(req.params.spaceId, userId, true);
      const parsed = CreateCollectionSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send(createErrorResponse("VALIDATION_ERROR", "Invalid collection payload"));
      }
      const created = await collectionRepo.createCollection({
        id: crypto.randomUUID(),
        spaceId: req.params.spaceId,
        title: parsed.data.title,
        description: parsed.data.description || null,
        coverMemoryId: parsed.data.coverMemoryId || null,
      });
      return reply.status(201).send(createSuccessResponse(created));
    }
  );

  app.get(
    "/api/v1/spaces/:spaceId/collections",
    async (req: FastifyRequest<{ Params: { spaceId: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      await assertSpaceAccess(req.params.spaceId, userId, false);
      const list = await collectionRepo.listCollections(req.params.spaceId);
      return reply.status(200).send(createSuccessResponse(list));
    }
  );

  app.patch(
    "/api/v1/spaces/:spaceId/collections/:collectionId",
    async (req: FastifyRequest<{ Params: { spaceId: string; collectionId: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      await assertSpaceAccess(req.params.spaceId, userId, true);
      const col = await collectionRepo.findCollectionById(req.params.collectionId);
      if (!col || col.spaceId !== req.params.spaceId) {
        return reply.status(404).send(createErrorResponse("COLLECTION_NOT_FOUND", "Collection not found"));
      }
      const parsed = CreateCollectionSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send(createErrorResponse("VALIDATION_ERROR", "Invalid collection update"));
      }
      const updated = await collectionRepo.updateCollection(col.id, parsed.data);
      return reply.status(200).send(createSuccessResponse(updated));
    }
  );

  app.delete(
    "/api/v1/spaces/:spaceId/collections/:collectionId",
    async (req: FastifyRequest<{ Params: { spaceId: string; collectionId: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      await assertSpaceAccess(req.params.spaceId, userId, true);
      const col = await collectionRepo.findCollectionById(req.params.collectionId);
      if (!col || col.spaceId !== req.params.spaceId) {
        return reply.status(404).send(createErrorResponse("COLLECTION_NOT_FOUND", "Collection not found"));
      }
      const deleted = await collectionRepo.deleteCollection(col.id);
      return reply.status(200).send(createSuccessResponse({ deleted, collectionId: col.id }));
    }
  );

  app.post(
    "/api/v1/spaces/:spaceId/collections/:collectionId/memories",
    async (req: FastifyRequest<{ Params: { spaceId: string; collectionId: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      await assertSpaceAccess(req.params.spaceId, userId, true);
      const col = await collectionRepo.findCollectionById(req.params.collectionId);
      if (!col || col.spaceId !== req.params.spaceId) {
        return reply.status(404).send(createErrorResponse("COLLECTION_NOT_FOUND", "Collection not found"));
      }
      const body = (req.body as { memoryId?: string; sortOrder?: number }) || {};
      if (!body.memoryId) {
        return reply.status(400).send(createErrorResponse("VALIDATION_ERROR", "memoryId is required"));
      }
      const mem = await memoryRepo.findMemoryById(body.memoryId);
      if (!mem || mem.spaceId !== req.params.spaceId) {
        return reply.status(404).send(createErrorResponse("MEMORY_NOT_FOUND", "Memory not found in space"));
      }
      await collectionRepo.addMemory(col.id, mem.id, body.sortOrder ?? 0);
      const updated = await collectionRepo.findCollectionById(col.id);
      return reply.status(200).send(createSuccessResponse(updated));
    }
  );

  app.delete(
    "/api/v1/spaces/:spaceId/collections/:collectionId/memories/:memoryId",
    async (
      req: FastifyRequest<{ Params: { spaceId: string; collectionId: string; memoryId: string } }>,
      reply
    ) => {
      const userId = await requireAuthUser(req);
      await assertSpaceAccess(req.params.spaceId, userId, true);
      const removed = await collectionRepo.removeMemory(req.params.collectionId, req.params.memoryId);
      return reply.status(200).send(createSuccessResponse({ removed }));
    }
  );

  // Memory Discussion Comments & Annotations (PWA-55 / IOS-42)
  app.get(
    "/api/v1/memories/:memoryId/comments",
    async (req: FastifyRequest<{ Params: { memoryId: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      const mem = await memoryRepo.findMemoryById(req.params.memoryId);
      if (!mem) {
        return reply.status(404).send(createErrorResponse("MEMORY_NOT_FOUND", "Memory not found"));
      }
      await assertSpaceAccess(mem.spaceId, userId, false);
      const comments = await commentRepo.listComments(mem.id);
      return reply.status(200).send(createSuccessResponse(comments));
    }
  );

  app.post(
    "/api/v1/memories/:memoryId/comments",
    async (req: FastifyRequest<{ Params: { memoryId: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      const mem = await memoryRepo.findMemoryById(req.params.memoryId);
      if (!mem) {
        return reply.status(404).send(createErrorResponse("MEMORY_NOT_FOUND", "Memory not found"));
      }
      await assertSpaceAccess(mem.spaceId, userId, false);
      const body = (req.body as { body?: string; authorName?: string }) || {};
      const text = body.body?.trim();
      if (!text) {
        return reply.status(400).send(createErrorResponse("VALIDATION_ERROR", "Comment body is required"));
      }
      const created = await commentRepo.createComment({
        id: crypto.randomUUID(),
        memoryId: mem.id,
        spaceId: mem.spaceId,
        authorId: userId,
        authorName: body.authorName?.trim() || "Family Member",
        body: text,
      });
      await publishDomainEvent("memory.comment.created", "memory.comment.created", created.id, {
        memoryId: mem.id,
        spaceId: mem.spaceId,
        authorId: userId,
      });
      return reply.status(201).send(createSuccessResponse(created));
    }
  );

  app.delete(
    "/api/v1/memories/:memoryId/comments/:commentId",
    async (req: FastifyRequest<{ Params: { memoryId: string; commentId: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      const mem = await memoryRepo.findMemoryById(req.params.memoryId);
      if (!mem) {
        return reply.status(404).send(createErrorResponse("MEMORY_NOT_FOUND", "Memory not found"));
      }
      await assertSpaceAccess(mem.spaceId, userId, false);
      const deleted = await commentRepo.deleteComment(req.params.commentId, userId);
      return reply.status(200).send(createSuccessResponse({ deleted }));
    }
  );

  // Server-Backed Emotional Reactions (IOS-42 & Web Parity)
  const ReactionKindSchema = z.enum(["heart", "warmth", "tearsOfJoy", "gratitude"]);
  const ToggleReactionSchema = z.object({
    kind: ReactionKindSchema,
  });
  const SetReactionSchema = z.object({
    kind: ReactionKindSchema,
    active: z.boolean().default(true),
  });

  app.get(
    "/api/v1/memories/:memoryId/reactions",
    async (req: FastifyRequest<{ Params: { memoryId: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      const mem = await memoryRepo.findMemoryById(req.params.memoryId);
      if (!mem) {
        return reply.status(404).send(createErrorResponse("MEMORY_NOT_FOUND", "Memory not found"));
      }
      await assertSpaceAccess(mem.spaceId, userId, false);
      const state = await reactionRepo.getReactionState(mem.id, userId);
      return reply.status(200).send(createSuccessResponse(state));
    }
  );

  app.post(
    "/api/v1/memories/:memoryId/reactions",
    async (req: FastifyRequest<{ Params: { memoryId: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      const mem = await memoryRepo.findMemoryById(req.params.memoryId);
      if (!mem) {
        return reply.status(404).send(createErrorResponse("MEMORY_NOT_FOUND", "Memory not found"));
      }
      await assertSpaceAccess(mem.spaceId, userId, false);
      const parsed = ToggleReactionSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send(createErrorResponse("VALIDATION_ERROR", "Invalid reaction kind"));
      }
      const { state, active } = await reactionRepo.toggleReaction(mem.id, mem.spaceId, userId, parsed.data.kind);
      if (active) {
        await publishDomainEvent("memory.reaction.added", "memory.reaction_added", mem.id, {
          memoryId: mem.id,
          spaceId: mem.spaceId,
          userId,
          kind: parsed.data.kind,
        });
      }
      return reply.status(200).send(createSuccessResponse({ ...state, toggledKind: parsed.data.kind, active }));
    }
  );

  app.put(
    "/api/v1/memories/:memoryId/reactions",
    async (req: FastifyRequest<{ Params: { memoryId: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      const mem = await memoryRepo.findMemoryById(req.params.memoryId);
      if (!mem) {
        return reply.status(404).send(createErrorResponse("MEMORY_NOT_FOUND", "Memory not found"));
      }
      await assertSpaceAccess(mem.spaceId, userId, false);
      const parsed = SetReactionSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send(createErrorResponse("VALIDATION_ERROR", "Invalid reaction payload"));
      }
      const state = await reactionRepo.setReaction(
        mem.id,
        mem.spaceId,
        userId,
        parsed.data.kind,
        parsed.data.active
      );
      if (parsed.data.active) {
        await publishDomainEvent("memory.reaction.added", "memory.reaction_added", mem.id, {
          memoryId: mem.id,
          spaceId: mem.spaceId,
          userId,
          kind: parsed.data.kind,
        });
      }
      return reply.status(200).send(createSuccessResponse(state));
    }
  );

  // Full Space Archive Export Bundle (PWA-81 / IOS-55)
  app.get(
    "/api/v1/spaces/:spaceId/export",
    async (req: FastifyRequest<{ Params: { spaceId: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      const space = await spaceRepo.findSpaceById(req.params.spaceId);
      if (!space) {
        return reply.status(404).send(createErrorResponse("SPACE_NOT_FOUND", "Space does not exist"));
      }
      await assertSpaceAccess(space.id, userId, false);
      const [profiles, memories, collections] = await Promise.all([
        spaceRepo.listProfiles(space.id),
        memoryRepo.listMemories(space.id),
        collectionRepo.listCollections(space.id),
      ]);
      const payload = {
        schemaVersion: "memoria-export-v1",
        exportedAt: new Date().toISOString(),
        space,
        profiles,
        collections,
        memories,
      };
      const sha256 = crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
      return reply.status(200).send(createSuccessResponse({ ...payload, integritySha256: sha256 }));
    }
  );

  // ==========================================
  // TIMELINE, CALENDAR, ACTIVITY, HISTORY & COLLECTION REORDER
  // ==========================================

  const ADMIN_ROLES = new Set(["superadmin", "admin", "ops_admin", "compliance_officer", "support_agent"]);
  const memRevisions = new Map<string, Array<Record<string, any>>>();
  const memModerationFlags: Array<Record<string, any>> = [];

  async function requireAdminUser(req: FastifyRequest): Promise<string> {
    try {
      const claims: any = await req.jwtVerify();
      const userId = claims?.sub || claims?.userId;
      const role = typeof claims?.role === "string" ? claims.role : "member";
      if (!userId || !ADMIN_ROLES.has(role)) {
        throw new ForbiddenError("Administrative privileges required");
      }
      return userId;
    } catch (err) {
      if (err instanceof ForbiddenError) throw err;
      throw new UnauthorizedError("Valid admin token required");
    }
  }

  // Chronological Year/Month Timeline (PWA-23 / PWA-34 / IOS-23)
  app.get(
    "/api/v1/spaces/:spaceId/timeline",
    async (req: FastifyRequest<{ Params: { spaceId: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      await assertSpaceAccess(req.params.spaceId, userId, false);
      const memories = await memoryRepo.listMemories(req.params.spaceId);
      const sorted = [...memories].sort(
        (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime()
      );
      const groupsMap = new Map<string, Memory[]>();
      for (const m of sorted) {
        const key = new Date(m.capturedAt).toISOString().slice(0, 7); // YYYY-MM
        const bucket = groupsMap.get(key) || [];
        bucket.push(m);
        groupsMap.set(key, bucket);
      }
      const groups = Array.from(groupsMap.entries()).map(([yearMonth, items]) => ({
        yearMonth,
        year: yearMonth.slice(0, 4),
        items,
      }));
      return reply.status(200).send(createSuccessResponse({ total: sorted.length, groups }));
    }
  );

  // Calendar Heatmap & Anniversaries (PWA-35 / IOS-25)
  app.get(
    "/api/v1/spaces/:spaceId/calendar",
    async (
      req: FastifyRequest<{ Params: { spaceId: string }; Querystring: { year?: string; month?: string } }>,
      reply
    ) => {
      const userId = await requireAuthUser(req);
      await assertSpaceAccess(req.params.spaceId, userId, false);
      const [memories, profiles] = await Promise.all([
        memoryRepo.listMemories(req.params.spaceId),
        spaceRepo.listProfiles(req.params.spaceId),
      ]);
      const days: Record<string, Memory[]> = {};
      for (const m of memories) {
        const d = new Date(m.capturedAt).toISOString().slice(0, 10);
        if (req.query.year && !d.startsWith(req.query.year)) continue;
        if (req.query.month && d.slice(5, 7) !== req.query.month.padStart(2, "0")) continue;
        days[d] = days[d] || [];
        days[d].push(m);
      }
      const anniversaries = profiles
        .filter((p) => Boolean(p.birthDate))
        .map((p) => ({
          profileId: p.id,
          name: p.name,
          relationship: p.relationship,
          birthDate: p.birthDate,
        }));
      return reply.status(200).send(createSuccessResponse({ days, anniversaries, totalMemories: memories.length }));
    }
  );

  // Space Activity Stream (PWA-53 / IOS-41)
  app.get(
    "/api/v1/spaces/:spaceId/activity",
    async (req: FastifyRequest<{ Params: { spaceId: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      await assertSpaceAccess(req.params.spaceId, userId, false);
      const [memories, collections, profiles] = await Promise.all([
        memoryRepo.listMemories(req.params.spaceId),
        collectionRepo.listCollections(req.params.spaceId),
        spaceRepo.listProfiles(req.params.spaceId),
      ]);
      const feed = [
        ...memories.map((m) => ({
          id: `mem-${m.id}`,
          kind: "memory_created",
          title: m.title,
          actorId: m.authorId,
          timestamp: m.createdAt,
        })),
        ...collections.map((c) => ({
          id: `col-${c.id}`,
          kind: "collection_updated",
          title: c.title,
          actorId: userId,
          timestamp: c.updatedAt,
        })),
        ...profiles.map((p) => ({
          id: `prof-${p.id}`,
          kind: "profile_added",
          title: p.name,
          actorId: userId,
          timestamp: p.createdAt,
        })),
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return reply.status(200).send(createSuccessResponse(feed.slice(0, 50)));
    }
  );

  // Memory Change History (PWA-54)
  app.get(
    "/api/v1/memories/:memoryId/history",
    async (req: FastifyRequest<{ Params: { memoryId: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      const mem = await memoryRepo.findMemoryById(req.params.memoryId);
      if (!mem) {
        return reply.status(404).send(createErrorResponse("MEMORY_NOT_FOUND", "Memory not found"));
      }
      await assertSpaceAccess(mem.spaceId, userId, false);
      if (dbUrl) {
        const res = await db.query(
          `SELECT id, memory_id as "memoryId", editor_id as "editorId", title, content,
                  captured_at::text as "capturedAt", change_summary as "changeSummary", created_at::text as "createdAt"
           FROM memory_revisions WHERE memory_id = $1 ORDER BY created_at DESC`,
          [mem.id]
        );
        return reply.status(200).send(
          createSuccessResponse([
            ...res.rows,
            {
              id: `initial-${mem.id}`,
              memoryId: mem.id,
              editorId: mem.authorId,
              title: mem.title,
              content: mem.content || "",
              capturedAt: mem.capturedAt,
              changeSummary: "Initial preservation",
              createdAt: mem.createdAt,
            },
          ])
        );
      }
      return reply.status(200).send(
        createSuccessResponse([
          ...(memRevisions.get(mem.id) || []),
          {
            id: `initial-${mem.id}`,
            memoryId: mem.id,
            editorId: mem.authorId,
            title: mem.title,
            content: mem.content || "",
            capturedAt: mem.capturedAt,
            changeSummary: "Initial preservation",
            createdAt: mem.createdAt,
          },
        ])
      );
    }
  );

  // Offline Batch Sync Endpoint (IOS-22)
  app.post(
    "/api/v1/memories/sync/batch",
    async (
      req: FastifyRequest<{
        Body: { mutations: Array<{ spaceId: string; title: string; content?: string; format?: Memory["format"]; capturedAt?: string }> };
      }>,
      reply
    ) => {
      const userId = await requireAuthUser(req);
      const mutations = Array.isArray(req.body?.mutations) ? req.body.mutations : [];
      const synced: Memory[] = [];
      for (const item of mutations.slice(0, 25)) {
        if (!item.spaceId || !item.title) continue;
        await assertSpaceAccess(item.spaceId, userId, true);
        const now = new Date().toISOString();
        const mem: Memory = {
          id: crypto.randomUUID(),
          spaceId: item.spaceId,
          authorId: userId,
          title: item.title,
          content: item.content,
          format: item.format || "story",
          capturedAt: item.capturedAt || now,
          isFavorite: false,
          associatedProfileIds: [],
          mediaIds: [],
          tags: ["offline-synced"],
          createdAt: now,
          updatedAt: now,
        };
        await memoryRepo.createMemory(mem);
        synced.push(mem);
      }
      return reply.status(200).send(createSuccessResponse({ syncedCount: synced.length, items: synced }));
    }
  );

  // Single Collection Detail & Reorder (PWA-30 / IOS-33)
  app.get(
    "/api/v1/spaces/:spaceId/collections/:collectionId",
    async (req: FastifyRequest<{ Params: { spaceId: string; collectionId: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      await assertSpaceAccess(req.params.spaceId, userId, false);
      const col = await collectionRepo.findCollectionById(req.params.collectionId);
      if (!col || col.spaceId !== req.params.spaceId) {
        return reply.status(404).send(createErrorResponse("COLLECTION_NOT_FOUND", "Collection not found"));
      }
      const allMemories = await memoryRepo.listMemories(req.params.spaceId);
      const memMap = new Map(allMemories.map((m) => [m.id, m]));
      const orderedMemories = (col.memoryIds || []).map((id) => memMap.get(id)).filter(Boolean);
      return reply.status(200).send(createSuccessResponse({ ...col, memories: orderedMemories }));
    }
  );

  app.put(
    "/api/v1/spaces/:spaceId/collections/:collectionId/reorder",
    async (
      req: FastifyRequest<{ Params: { spaceId: string; collectionId: string }; Body: { memoryIds: string[] } }>,
      reply
    ) => {
      const userId = await requireAuthUser(req);
      await assertSpaceAccess(req.params.spaceId, userId, true);
      const col = await collectionRepo.findCollectionById(req.params.collectionId);
      if (!col || col.spaceId !== req.params.spaceId) {
        return reply.status(404).send(createErrorResponse("COLLECTION_NOT_FOUND", "Collection not found"));
      }
      const ids = Array.isArray(req.body?.memoryIds) ? req.body.memoryIds : [];
      for (let i = 0; i < ids.length; i++) {
        await collectionRepo.addMemory(col.id, ids[i], i);
      }
      const updated = await collectionRepo.findCollectionById(col.id);
      return reply.status(200).send(createSuccessResponse(updated));
    }
  );

  app.post(
    "/api/v1/memories/:memoryId/flag",
    async (req: FastifyRequest<{ Params: { memoryId: string }; Body: { reason?: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      const mem = await memoryRepo.findMemoryById(req.params.memoryId);
      if (!mem) {
        return reply.status(404).send(createErrorResponse("MEMORY_NOT_FOUND", "Memory not found"));
      }
      await assertSpaceAccess(mem.spaceId, userId, false);
      const reason = req.body?.reason?.trim() || "Flagged for archival review";
      const flag = {
        id: crypto.randomUUID(),
        spaceId: mem.spaceId,
        memoryId: mem.id,
        mediaId: mem.mediaIds?.[0] || null,
        reason,
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      if (dbUrl) {
        await db.query(
          `INSERT INTO moderation_flags (id, space_id, memory_id, media_id, reason, status)
           VALUES ($1, $2, $3, $4, $5, 'pending')`,
          [flag.id, flag.spaceId, flag.memoryId, flag.mediaId, flag.reason]
        );
      } else {
        memModerationFlags.unshift(flag);
      }
      return reply.status(201).send(createSuccessResponse(flag));
    }
  );

  // ==========================================
  // ADMIN SPACES & CONTENT MODERATION (ADMIN-04 / ADMIN-06)
  // ==========================================

  app.get("/api/v1/admin/spaces", async (req: FastifyRequest, reply) => {
    await requireAdminUser(req);
    const spaces = await spaceRepo.listSpaces();

    const memoryCounts = new Map<string, number>();
    const memberCounts = new Map<string, number>();
    let memberCountsAvailable = false;

    if (dbUrl) {
      const memRes = await db.query<{ space_id: string; count: string }>(
        `SELECT space_id, COUNT(*)::text as count FROM memories WHERE deleted_at IS NULL GROUP BY space_id`
      );
      for (const row of memRes.rows) {
        memoryCounts.set(row.space_id, parseInt(row.count, 10) || 0);
      }
    }

    if (collabDb) {
      try {
        const membsRes = await collabDb.query<{ space_id: string; count: string }>(
          `SELECT space_id, COUNT(*)::text as count FROM space_members GROUP BY space_id`
        );
        memberCountsAvailable = true;
        for (const row of membsRes.rows) {
          memberCounts.set(row.space_id, parseInt(row.count, 10) || 0);
        }
      } catch (err) {
        logger.warn({ err }, "[Admin] Unable to query collab_db member counts");
      }
    }

    const enriched = spaces.map((s) => ({
      ...s,
      memoryCount: dbUrl ? (memoryCounts.get(s.id) ?? 0) : null,
      memberCount: memberCountsAvailable ? (memberCounts.get(s.id) ?? 0) : null,
    }));

    return reply.status(200).send(createSuccessResponse(enriched));
  });

  app.get("/api/v1/admin/moderation", async (req: FastifyRequest, reply) => {
    await requireAdminUser(req);
    if (dbUrl) {
      const res = await db.query(
        `SELECT id, space_id as "spaceId", memory_id as "memoryId", media_id as "mediaId",
                reason, status, resolved_by as "resolvedBy", resolved_at::text as "resolvedAt", created_at::text as "createdAt"
         FROM moderation_flags ORDER BY created_at DESC LIMIT 100`
      );
      return reply.status(200).send(createSuccessResponse(res.rows));
    }
    return reply.status(200).send(createSuccessResponse(memModerationFlags));
  });

  app.post(
    "/api/v1/admin/moderation/:flagId/resolve",
    async (req: FastifyRequest<{ Params: { flagId: string }; Body: { decision: "approved" | "quarantined" } }>, reply) => {
      const adminId = await requireAdminUser(req);
      const decision = req.body?.decision === "quarantined" ? "quarantined" : "approved";
      if (dbUrl) {
        const res = await db.query(
          `UPDATE moderation_flags SET status = $1, resolved_by = $2, resolved_at = NOW() WHERE id = $3
           RETURNING id, status, resolved_by as "resolvedBy", resolved_at::text as "resolvedAt"`,
          [decision, adminId, req.params.flagId]
        );
        if (!res.rows[0]) {
          return reply.status(404).send(createErrorResponse("FLAG_NOT_FOUND", "Moderation flag not found"));
        }
        return reply.status(200).send(createSuccessResponse(res.rows[0]));
      }
      const flag = memModerationFlags.find((f) => f.id === req.params.flagId);
      if (flag) {
        flag.status = decision;
        flag.resolvedBy = adminId;
        flag.resolvedAt = new Date().toISOString();
      }
      return reply.status(200).send(createSuccessResponse({ id: req.params.flagId, status: decision, resolvedBy: adminId }));
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
