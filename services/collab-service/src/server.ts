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
  PostgresOutboxRepository,
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
        const actor = await collabRepo.getMember(req.params.spaceId, actorId);
        if (!actor || (actor.role !== "owner" && actor.role !== "admin")) {
          throw new ForbiddenError("Only space owners or admins can manage members");
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
      const actor = await collabRepo.getMember(req.params.spaceId, actorId);
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
      const actor = await collabRepo.getMember(req.params.spaceId, actorId);
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
      const actor = await collabRepo.getMember(req.params.spaceId, actorId);
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
      const actor = await collabRepo.getMember(req.params.spaceId, actorId);
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
      const actor = await collabRepo.getMember(req.params.spaceId, actorId);
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
      const inviter = await collabRepo.getMember(req.params.spaceId, inviterId);
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
