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
  createSuccessResponse,
  createErrorResponse,
  createDomainEvent,
  startServiceServer,
} from "@memory-capsule/contracts";
import { createEventBus, EventBus } from "@memory-capsule/events";
import {
  createDatabaseClient,
  DatabaseClient,
  CollaborationRepository,
  PostgresCollaborationRepository,
  PostgresSpaceRepository,
  PostgresOutboxRepository,
  SpaceRepository,
  OutboxRepository,
  SpaceMemberRecord,
  SpaceInvitationRecord,
} from "@memory-capsule/database";

const logger: Logger = createServiceLogger("collab-service");

class InMemoryCollabTestRepo implements CollaborationRepository {
  private members = new Map<string, SpaceMemberRecord>();
  private invitations = new Map<string, SpaceInvitationRecord>();

  async addMember(
    member: Omit<SpaceMemberRecord, "joinedAt" | "updatedAt">
  ): Promise<SpaceMemberRecord> {
    const now = new Date().toISOString();
    const record: SpaceMemberRecord = { ...member, joinedAt: now, updatedAt: now };
    this.members.set(`${member.spaceId}:${member.userId}`, record);
    return record;
  }
  async getMembers(spaceId: string): Promise<SpaceMemberRecord[]> {
    return Array.from(this.members.values()).filter((m) => m.spaceId === spaceId);
  }
  async getMember(spaceId: string, userId: string): Promise<SpaceMemberRecord | null> {
    return this.members.get(`${spaceId}:${userId}`) || null;
  }
  async removeMember(spaceId: string, userId: string): Promise<boolean> {
    return this.members.delete(`${spaceId}:${userId}`);
  }
  async updateMemberRole(
    spaceId: string,
    userId: string,
    role: SpaceMemberRecord["role"],
    permissions: Record<string, boolean>
  ): Promise<SpaceMemberRecord | null> {
    const existing = this.members.get(`${spaceId}:${userId}`);
    if (!existing) return null;
    const updated = { ...existing, role, permissions, updatedAt: new Date().toISOString() };
    this.members.set(`${spaceId}:${userId}`, updated);
    return updated;
  }
  async createInvitation(
    invitation: Omit<SpaceInvitationRecord, "createdAt">
  ): Promise<SpaceInvitationRecord> {
    const record: SpaceInvitationRecord = { ...invitation, createdAt: new Date().toISOString() };
    this.invitations.set(invitation.tokenHash, record);
    return record;
  }
  async listInvitations(spaceId: string): Promise<SpaceInvitationRecord[]> {
    return Array.from(this.invitations.values()).filter((i) => i.spaceId === spaceId);
  }
  async revokeInvitation(id: string, spaceId: string): Promise<boolean> {
    for (const [k, inv] of this.invitations.entries()) {
      if (inv.id === id && inv.spaceId === spaceId && inv.status === "pending") {
        this.invitations.set(k, { ...inv, status: "revoked" });
        return true;
      }
    }
    return false;
  }
  async getInvitationByTokenHash(tokenHash: string): Promise<SpaceInvitationRecord | null> {
    return this.invitations.get(tokenHash) || null;
  }
  async acceptInvitation(id: string): Promise<void> {
    for (const [key, inv] of this.invitations.entries()) {
      if (inv.id === id) {
        this.invitations.set(key, { ...inv, status: "accepted" });
      }
    }
  }
}

export async function buildCollabService(): Promise<FastifyInstance> {
  const cfg = validateServiceConfig(BaseServiceConfigSchema);
  const app = Fastify({ logger: false });
  app.setErrorHandler(createFastifyErrorHandler(logger));

  const dbUrl = cfg.COLLAB_DATABASE_URL || cfg.DATABASE_URL;
  if (!dbUrl && cfg.NODE_ENV !== "test") {
    throw new Error("[collab-service] COLLAB_DATABASE_URL or DATABASE_URL is required in non-test mode.");
  }
  const db: DatabaseClient = createDatabaseClient(dbUrl);
  if (cfg.NODE_ENV !== "test") {
    const healthy = await db.healthCheck();
    if (!healthy) {
      throw new Error("[collab-service] PostgreSQL health check failed.");
    }
  }

  const eventBus: EventBus = await createEventBus(cfg.NATS_URL);
  const collabRepo: CollaborationRepository = dbUrl
    ? new PostgresCollaborationRepository(db)
    : new InMemoryCollabTestRepo();
  const outboxRepo: OutboxRepository | null = dbUrl ? new PostgresOutboxRepository(db) : null;

  const memoryDb: DatabaseClient | null = cfg.MEMORY_DATABASE_URL
    ? createDatabaseClient(cfg.MEMORY_DATABASE_URL)
    : null;
  const spaceRepo: SpaceRepository | null = memoryDb ? new PostgresSpaceRepository(memoryDb) : null;

  await eventBus.subscribe<{ spaceId?: string; ownerId?: string }>(
    "memory.space.created",
    async (evt) => {
      if (!evt.data?.spaceId || !evt.data?.ownerId) return;
      const existing = await collabRepo.getMember(evt.data.spaceId, evt.data.ownerId);
      if (!existing) {
        await collabRepo.addMember({
          id: crypto.randomUUID(),
          spaceId: evt.data.spaceId,
          userId: evt.data.ownerId,
          role: "owner",
          permissions: {
            can_create_memories: true,
            can_edit_books: true,
            can_invite: true,
          },
        });
      }
    },
    { durableName: "collab_space_owner_seed" }
  );

  let outboxTimer: NodeJS.Timeout | null = null;
  if (outboxRepo?.relayPending) {
    outboxTimer = setInterval(() => {
      outboxRepo
        .relayPending!(async (evt) => {
          await eventBus.publish(
            evt.eventType,
            createDomainEvent(evt.eventType, "collab-service", evt.payload)
          );
        })
        .catch((err) => logger.warn({ err }, "[Collab Outbox] Relay cycle warning"));
    }, 1000);
    outboxTimer.unref();
  }

  app.addHook("onClose", async () => {
    if (outboxTimer) clearInterval(outboxTimer);
    await eventBus.close().catch((err) => logger.warn({ err }, "[Collab] EventBus close warning"));
    if (memoryDb) {
      await memoryDb.close().catch((err) => logger.warn({ err }, "[Collab] Memory DB close warning"));
    }
    await db.close().catch((err) => logger.warn({ err }, "[Collab] DB close warning"));
  });

  await app.register(cors, { origin: true, credentials: true });
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

  async function publishDomainEvent(
    subject: string,
    eventType: string,
    aggregateId: string,
    payload: Record<string, any>
  ) {
    if (outboxRepo) {
      await outboxRepo.stageEvent({
        eventType: subject,
        aggregateType: "collab",
        aggregateId,
        payload,
      });
      if (outboxRepo.relayPending) {
        await outboxRepo.relayPending(async (evt) => {
          await eventBus.publish(evt.eventType, createDomainEvent(eventType, "collab-service", evt.payload));
        });
      }
    } else {
      await eventBus.publish(subject, createDomainEvent(eventType, "collab-service", payload));
    }
  }

  app.get("/health", async (_req, reply) => {
    const healthy = await db.healthCheck();
    return reply.status(200).send(
      createSuccessResponse({
        service: "collab-service",
        status: healthy ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
      })
    );
  });

  async function getOrSeedActorMember(
    spaceId: string,
    actorId: string
  ): Promise<SpaceMemberRecord | null> {
    const existing = await collabRepo.getMember(spaceId, actorId);
    if (existing) return existing;
    if (spaceRepo) {
      const space = await spaceRepo.findSpaceById(spaceId);
      if (space && space.ownerId === actorId) {
        return collabRepo.addMember({
          id: crypto.randomUUID(),
          spaceId,
          userId: actorId,
          role: "owner",
          permissions: {
            can_create_memories: true,
            can_edit_books: true,
            can_invite: true,
          },
        });
      }
    }
    return null;
  }

  const UpsertMemberSchema = z.object({
    userId: z.string().uuid(),
    role: z.enum(["owner", "admin", "contributor", "viewer"]).default("contributor"),
    permissions: z.record(z.string(), z.boolean()).optional(),
  });

  app.post(
    "/api/v1/collab/spaces/:spaceId/members",
    async (req: FastifyRequest<{ Params: { spaceId: string } }>, reply: FastifyReply) => {
      const actorId = await requireAuthUser(req);
      const parseResult = UpsertMemberSchema.safeParse(req.body);
      if (!parseResult.success) {
        return reply.status(400).send(createErrorResponse("VALIDATION_ERROR", "Invalid member payload"));
      }

      const existingMembers = await collabRepo.getMembers(req.params.spaceId);
      if (existingMembers.length > 0) {
        const actor = await getOrSeedActorMember(req.params.spaceId, actorId);
        if (!actor || (actor.role !== "owner" && actor.role !== "admin")) {
          throw new ForbiddenError("Only space owners or admins can manage members");
        }
      } else if (spaceRepo) {
        const space = await spaceRepo.findSpaceById(req.params.spaceId);
        if (space && space.ownerId !== actorId) {
          throw new ForbiddenError("Only the space owner can initialize space members");
        }
      }

      const role = parseResult.data.role;
      const defaultPermissions = {
        can_create_memories: role !== "viewer",
        can_edit_books: role === "owner" || role === "admin",
        can_invite: role === "owner" || role === "admin",
      };

      const member = await collabRepo.addMember({
        id: crypto.randomUUID(),
        spaceId: req.params.spaceId,
        userId: parseResult.data.userId,
        role,
        permissions: parseResult.data.permissions || defaultPermissions,
      });

      await publishDomainEvent("collab.member.added", "collab.member.added", member.id, {
        spaceId: member.spaceId,
        userId: member.userId,
        role: member.role,
      });

      return reply.status(201).send(createSuccessResponse(member));
    }
  );

  app.get(
    "/api/v1/collab/spaces/:spaceId/members",
    async (req: FastifyRequest<{ Params: { spaceId: string } }>, reply: FastifyReply) => {
      const actorId = await requireAuthUser(req);
      const actor = await getOrSeedActorMember(req.params.spaceId, actorId);
      if (!actor) {
        throw new ForbiddenError("Space membership required to view members");
      }
      const members = await collabRepo.getMembers(req.params.spaceId);
      return reply.status(200).send(createSuccessResponse(members));
    }
  );

  app.delete(
    "/api/v1/collab/spaces/:spaceId/members/:userId",
    async (req: FastifyRequest<{ Params: { spaceId: string; userId: string } }>, reply: FastifyReply) => {
      const actorId = await requireAuthUser(req);
      const actor = await getOrSeedActorMember(req.params.spaceId, actorId);
      if (!actor || (actor.role !== "owner" && actor.role !== "admin" && actorId !== req.params.userId)) {
        throw new ForbiddenError("Insufficient permissions to remove member");
      }
      const removed = await collabRepo.removeMember(req.params.spaceId, req.params.userId);
      return reply.status(200).send(createSuccessResponse({ removed }));
    }
  );

  // Update Member Role & Fine-Grained Permissions (PWA-50 / PWA-51)
  app.patch(
    "/api/v1/collab/spaces/:spaceId/members/:userId",
    async (req: FastifyRequest<{ Params: { spaceId: string; userId: string } }>, reply: FastifyReply) => {
      const actorId = await requireAuthUser(req);
      const actor = await getOrSeedActorMember(req.params.spaceId, actorId);
      if (!actor || (actor.role !== "owner" && actor.role !== "admin")) {
        throw new ForbiddenError("Only space owners or admins can update member permissions");
      }
      const parsed = UpsertMemberSchema.omit({ userId: true }).safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send(createErrorResponse("VALIDATION_ERROR", "Invalid role update payload"));
      }
      const role = parsed.data.role;
      const permissions = parsed.data.permissions || {
        can_create_memories: role !== "viewer",
        can_edit_books: role === "owner" || role === "admin",
        can_invite: role === "owner" || role === "admin",
      };
      const updated = collabRepo.updateMemberRole
        ? await collabRepo.updateMemberRole(req.params.spaceId, req.params.userId, role, permissions)
        : null;
      if (!updated) {
        return reply.status(404).send(createErrorResponse("MEMBER_NOT_FOUND", "Space member not found"));
      }
      return reply.status(200).send(createSuccessResponse(updated));
    }
  );

  // List & Revoke Space Invitations (PWA-49)
  app.get(
    "/api/v1/collab/spaces/:spaceId/invitations",
    async (req: FastifyRequest<{ Params: { spaceId: string } }>, reply: FastifyReply) => {
      const actorId = await requireAuthUser(req);
      const actor = await getOrSeedActorMember(req.params.spaceId, actorId);
      if (!actor || (actor.role !== "owner" && actor.role !== "admin" && !actor.permissions?.can_invite)) {
        throw new ForbiddenError("Invite management permission required");
      }
      const list = collabRepo.listInvitations ? await collabRepo.listInvitations(req.params.spaceId) : [];
      return reply.status(200).send(
        createSuccessResponse(
          list.map((inv) => ({
            id: inv.id,
            spaceId: inv.spaceId,
            inviteeEmail: inv.inviteeEmail,
            role: inv.role,
            status: inv.status,
            expiresAt: inv.expiresAt,
            createdAt: inv.createdAt,
          }))
        )
      );
    }
  );

  app.delete(
    "/api/v1/collab/spaces/:spaceId/invitations/:invitationId",
    async (
      req: FastifyRequest<{ Params: { spaceId: string; invitationId: string } }>,
      reply: FastifyReply
    ) => {
      const actorId = await requireAuthUser(req);
      const actor = await getOrSeedActorMember(req.params.spaceId, actorId);
      if (!actor || (actor.role !== "owner" && actor.role !== "admin")) {
        throw new ForbiddenError("Only space owners or admins can revoke invitations");
      }
      const revoked = collabRepo.revokeInvitation
        ? await collabRepo.revokeInvitation(req.params.invitationId, req.params.spaceId)
        : false;
      return reply.status(200).send(createSuccessResponse({ revoked }));
    }
  );

  const CreateInviteSchema = z.object({
    inviteeEmail: z.string().email(),
    role: z.enum(["admin", "contributor", "viewer"]).default("contributor"),
  });

  app.post(
    "/api/v1/collab/spaces/:spaceId/invitations",
    async (req: FastifyRequest<{ Params: { spaceId: string } }>, reply: FastifyReply) => {
      const inviterId = await requireAuthUser(req);
      const inviter = await getOrSeedActorMember(req.params.spaceId, inviterId);
      if (!inviter || (inviter.role !== "owner" && inviter.role !== "admin" && !inviter.permissions?.can_invite)) {
        throw new ForbiddenError("Invite permission required");
      }

      const parseResult = CreateInviteSchema.safeParse(req.body);
      if (!parseResult.success) {
        return reply.status(400).send(createErrorResponse("VALIDATION_ERROR", "Invalid invitation payload"));
      }

      const rawToken = crypto.randomBytes(24).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const invitation = await collabRepo.createInvitation({
        id: crypto.randomUUID(),
        spaceId: req.params.spaceId,
        inviterId,
        inviteeEmail: parseResult.data.inviteeEmail.toLowerCase().trim(),
        role: parseResult.data.role,
        tokenHash,
        status: "pending",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      await publishDomainEvent("collab.invitation.created", "collab.invitation.created", invitation.id, {
        invitationId: invitation.id,
        spaceId: invitation.spaceId,
        inviterId,
        inviteeEmail: invitation.inviteeEmail,
        role: invitation.role,
      });

      return reply.status(201).send(
        createSuccessResponse({
          invitation: {
            id: invitation.id,
            spaceId: invitation.spaceId,
            inviteeEmail: invitation.inviteeEmail,
            role: invitation.role,
            status: invitation.status,
            expiresAt: invitation.expiresAt,
          },
          inviteToken: rawToken,
        })
      );
    }
  );

  const AcceptInviteSchema = z.object({
    token: z.string().min(16),
  });

  app.post("/api/v1/collab/invitations/accept", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = await requireAuthUser(req);
    const parseResult = AcceptInviteSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send(createErrorResponse("VALIDATION_ERROR", "Valid invitation token required"));
    }

    const tokenHash = crypto.createHash("sha256").update(parseResult.data.token).digest("hex");
    const invitation = await collabRepo.getInvitationByTokenHash(tokenHash);
    if (!invitation || invitation.status !== "pending" || new Date(invitation.expiresAt).getTime() <= Date.now()) {
      return reply.status(400).send(createErrorResponse("INVALID_INVITATION", "Invitation is invalid or expired"));
    }

    await collabRepo.acceptInvitation(invitation.id);
    const role = (invitation.role as SpaceMemberRecord["role"]) || "contributor";
    const member = await collabRepo.addMember({
      id: crypto.randomUUID(),
      spaceId: invitation.spaceId,
      userId,
      role,
      permissions: {
        can_create_memories: role !== "viewer",
        can_edit_books: role === "admin",
        can_invite: role === "admin",
      },
    });

    await publishDomainEvent("collab.invitation.accepted", "collab.invitation.accepted", invitation.id, {
      invitationId: invitation.id,
      spaceId: invitation.spaceId,
      userId,
      role,
    });

    return reply.status(200).send(createSuccessResponse({ accepted: true, member }));
  });

  // Resend Pending Invitation (PWA-49)
  app.post(
    "/api/v1/collab/spaces/:spaceId/invitations/:invitationId/resend",
    async (req: FastifyRequest<{ Params: { spaceId: string; invitationId: string } }>, reply) => {
      const actorId = await requireAuthUser(req);
      const actor = await getOrSeedActorMember(req.params.spaceId, actorId);
      if (!actor || (actor.role !== "owner" && actor.role !== "admin" && !actor.permissions?.can_invite)) {
        throw new ForbiddenError("Invite management permission required");
      }
      const list = collabRepo.listInvitations ? await collabRepo.listInvitations(req.params.spaceId) : [];
      const target = list.find((i) => i.id === req.params.invitationId);
      if (!target) {
        return reply.status(404).send(createErrorResponse("INVITATION_NOT_FOUND", "Invitation not found"));
      }
      await publishDomainEvent("collab.invitation.resent", "collab.invitation.resent", target.id, {
        invitationId: target.id,
        spaceId: req.params.spaceId,
        inviteeEmail: target.inviteeEmail,
      });
      return reply.status(200).send(createSuccessResponse({ resent: true, invitationId: target.id }));
    }
  );

  // Custom Space Roles (PWA-51)
  const memRoles = new Map<string, Array<Record<string, any>>>();
  app.get(
    "/api/v1/collab/spaces/:spaceId/roles",
    async (req: FastifyRequest<{ Params: { spaceId: string } }>, reply) => {
      const actorId = await requireAuthUser(req);
      const actor = await getOrSeedActorMember(req.params.spaceId, actorId);
      if (!actor) throw new ForbiddenError("Space membership required");
      if (dbUrl) {
        const res = await db.query(
          `SELECT id, space_id as "spaceId", name, description, permissions, created_at::text as "createdAt"
           FROM space_roles WHERE space_id = $1 ORDER BY created_at DESC`,
          [req.params.spaceId]
        );
        return reply.status(200).send(createSuccessResponse(res.rows));
      }
      return reply.status(200).send(createSuccessResponse(memRoles.get(req.params.spaceId) || []));
    }
  );

  app.post(
    "/api/v1/collab/spaces/:spaceId/roles",
    async (
      req: FastifyRequest<{ Params: { spaceId: string }; Body: { name: string; description?: string; permissions?: Record<string, boolean> } }>,
      reply
    ) => {
      const actorId = await requireAuthUser(req);
      const actor = await getOrSeedActorMember(req.params.spaceId, actorId);
      if (!actor || (actor.role !== "owner" && actor.role !== "admin")) {
        throw new ForbiddenError("Only space owners or admins can create custom roles");
      }
      const name = req.body?.name?.trim();
      if (!name) {
        return reply.status(400).send(createErrorResponse("VALIDATION_ERROR", "Role name is required"));
      }
      const roleRecord = {
        id: crypto.randomUUID(),
        spaceId: req.params.spaceId,
        name,
        description: req.body?.description?.trim() || "",
        permissions: req.body?.permissions || { can_create_memories: true, can_edit_books: false, can_invite: false },
        createdAt: new Date().toISOString(),
      };
      if (dbUrl) {
        await db.query(
          `INSERT INTO space_roles (id, space_id, name, description, permissions) VALUES ($1, $2, $3, $4, $5)`,
          [roleRecord.id, roleRecord.spaceId, roleRecord.name, roleRecord.description, JSON.stringify(roleRecord.permissions)]
        );
      } else {
        const existing = memRoles.get(req.params.spaceId) || [];
        existing.unshift(roleRecord);
        memRoles.set(req.params.spaceId, existing);
      }
      return reply.status(201).send(createSuccessResponse(roleRecord));
    }
  );

  // Passphrase-Protected Public Share Links (PWA-52)
  const memShareLinks = new Map<string, Record<string, any>>();
  app.get(
    "/api/v1/collab/spaces/:spaceId/share-links",
    async (req: FastifyRequest<{ Params: { spaceId: string } }>, reply) => {
      const actorId = await requireAuthUser(req);
      const actor = await getOrSeedActorMember(req.params.spaceId, actorId);
      if (!actor) throw new ForbiddenError("Space membership required");
      if (dbUrl) {
        const res = await db.query(
          `SELECT id, space_id as "spaceId", token, (passphrase_hash IS NOT NULL) as "hasPassphrase",
                  allow_downloads as "allowDownloads", expires_at::text as "expiresAt",
                  access_count as "accessCount", created_at::text as "createdAt"
           FROM space_share_links WHERE space_id = $1 AND revoked_at IS NULL ORDER BY created_at DESC`,
          [req.params.spaceId]
        );
        return reply.status(200).send(createSuccessResponse(res.rows));
      }
      return reply.status(200).send(
        createSuccessResponse(Array.from(memShareLinks.values()).filter((l) => l.spaceId === req.params.spaceId && !l.revokedAt))
      );
    }
  );

  app.post(
    "/api/v1/collab/spaces/:spaceId/share-links",
    async (
      req: FastifyRequest<{ Params: { spaceId: string }; Body: { passphrase?: string; allowDownloads?: boolean; expiresInDays?: number } }>,
      reply
    ) => {
      const actorId = await requireAuthUser(req);
      const actor = await getOrSeedActorMember(req.params.spaceId, actorId);
      if (!actor || (actor.role !== "owner" && actor.role !== "admin")) {
        throw new ForbiddenError("Only space owners or admins can generate share links");
      }
      const token = crypto.randomBytes(16).toString("hex");
      const passphraseHash = req.body?.passphrase?.trim()
        ? crypto.createHash("sha256").update(req.body.passphrase.trim()).digest("hex")
        : null;
      const days = Math.min(Math.max(Number(req.body?.expiresInDays || 30), 1), 365);
      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      const record = {
        id: crypto.randomUUID(),
        spaceId: req.params.spaceId,
        createdBy: actorId,
        token,
        hasPassphrase: Boolean(passphraseHash),
        allowDownloads: Boolean(req.body?.allowDownloads),
        expiresAt,
        accessCount: 0,
        createdAt: new Date().toISOString(),
      };
      if (dbUrl) {
        await db.query(
          `INSERT INTO space_share_links (id, space_id, created_by, token, passphrase_hash, allow_downloads, expires_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [record.id, record.spaceId, actorId, token, passphraseHash, record.allowDownloads, expiresAt]
        );
      } else {
        memShareLinks.set(token, { ...record, passphraseHash });
      }
      return reply.status(201).send(createSuccessResponse(record));
    }
  );

  async function buildSharedPreview(spaceId: string) {
    if (!memoryDb) return { space: null, memories: [] };
    const [spRes, memRes] = await Promise.all([
      memoryDb.query(`SELECT id, name, description, space_type as "type" FROM memory_spaces WHERE id = $1 AND deleted_at IS NULL LIMIT 1`, [spaceId]),
      memoryDb.query(
        `SELECT id, title, content, format, location, captured_at::text as "capturedAt"
         FROM memories WHERE space_id = $1 AND deleted_at IS NULL ORDER BY captured_at DESC LIMIT 24`,
        [spaceId]
      ),
    ]);
    return { space: spRes.rows[0] || null, memories: memRes.rows || [] };
  }

  app.post(
    "/api/v1/collab/share-links/:token/verify",
    async (req: FastifyRequest<{ Params: { token: string }; Body?: { passphrase?: string } }>, reply) => {
      const { token } = req.params;
      const providedHash = req.body?.passphrase?.trim()
        ? crypto.createHash("sha256").update(req.body.passphrase.trim()).digest("hex")
        : null;
      if (dbUrl) {
        const res = await db.query(
          `SELECT id, space_id as "spaceId", passphrase_hash as "passphraseHash", allow_downloads as "allowDownloads",
                  expires_at::text as "expiresAt", revoked_at as "revokedAt"
           FROM space_share_links WHERE token = $1 LIMIT 1`,
          [token]
        );
        const link = res.rows[0];
        if (!link || link.revokedAt || (link.expiresAt && new Date(link.expiresAt).getTime() <= Date.now())) {
          return reply.status(404).send(createErrorResponse("SHARE_LINK_INVALID", "Share link is invalid or expired"));
        }
        if (link.passphraseHash && link.passphraseHash !== providedHash) {
          return reply.status(403).send(createErrorResponse("PASSPHRASE_REQUIRED", "Valid passphrase required"));
        }
        await db.query(`UPDATE space_share_links SET access_count = access_count + 1 WHERE id = $1`, [link.id]);
        const preview = await buildSharedPreview(link.spaceId);
        return reply.status(200).send(
          createSuccessResponse({
            valid: true,
            spaceId: link.spaceId,
            allowDownloads: link.allowDownloads,
            expiresAt: link.expiresAt,
            ...preview,
          })
        );
      }
      const link = memShareLinks.get(token);
      if (!link || link.revokedAt) {
        return reply.status(404).send(createErrorResponse("SHARE_LINK_INVALID", "Share link not found"));
      }
      if (link.passphraseHash && link.passphraseHash !== providedHash) {
        return reply.status(403).send(createErrorResponse("PASSPHRASE_REQUIRED", "Valid passphrase required"));
      }
      link.accessCount = (link.accessCount || 0) + 1;
      return reply.status(200).send(
        createSuccessResponse({
          valid: true,
          spaceId: link.spaceId,
          allowDownloads: link.allowDownloads,
          expiresAt: link.expiresAt,
          space: null,
          memories: [],
        })
      );
    }
  );

  return app;
}

if (process.env.NODE_ENV !== "test") {
  (async () => {
    try {
      const app = await buildCollabService();
      await startServiceServer({
        serviceId: "collab-service",
        app,
        logger,
      });
    } catch (err) {
      logger.error({ err }, "[Collab] Unexpected startup failure");
      process.exit(1);
    }
  })();
}
