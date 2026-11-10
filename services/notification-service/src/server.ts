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
  createSuccessResponse,
  createErrorResponse,
  startServiceServer,
} from "@memory-capsule/contracts";
import { createEventBus, EventBus } from "@memory-capsule/events";
import {
  createDatabaseClient,
  DatabaseClient,
  NotificationRepository,
  PostgresNotificationRepository,
  NotificationRecord,
} from "@memory-capsule/database";

const logger: Logger = createServiceLogger("notification-service");

class InMemoryNotificationTestRepo implements NotificationRepository {
  private items: NotificationRecord[] = [];

  async createNotification(
    notification: Omit<NotificationRecord, "createdAt" | "isRead" | "readAt">
  ): Promise<NotificationRecord> {
    const record: NotificationRecord = {
      ...notification,
      isRead: false,
      readAt: null,
      createdAt: new Date().toISOString(),
    };
    this.items.unshift(record);
    return record;
  }
  async listNotifications(userId: string, unreadOnly = false): Promise<NotificationRecord[]> {
    return this.items.filter((n) => n.userId === userId && (!unreadOnly || !n.isRead));
  }
  async markRead(id: string, userId: string): Promise<boolean> {
    const item = this.items.find((n) => n.id === id && n.userId === userId && !n.isRead);
    if (!item) return false;
    item.isRead = true;
    item.readAt = new Date().toISOString();
    return true;
  }
  async markAllRead(userId: string): Promise<number> {
    let count = 0;
    const now = new Date().toISOString();
    for (const item of this.items) {
      if (item.userId === userId && !item.isRead) {
        item.isRead = true;
        item.readAt = now;
        count++;
      }
    }
    return count;
  }
}

export async function buildNotificationService(): Promise<FastifyInstance> {
  const cfg = validateServiceConfig(BaseServiceConfigSchema);
  const app = Fastify({ logger: false });
  app.setErrorHandler(createFastifyErrorHandler(logger));

  const dbUrl = cfg.NOTIFICATION_DATABASE_URL || cfg.DATABASE_URL;
  if (!dbUrl && cfg.NODE_ENV !== "test") {
    throw new Error(
      "[notification-service] NOTIFICATION_DATABASE_URL or DATABASE_URL is required in non-test mode."
    );
  }
  const db: DatabaseClient = createDatabaseClient(dbUrl);
  if (cfg.NODE_ENV !== "test") {
    const healthy = await db.healthCheck();
    if (!healthy) {
      throw new Error("[notification-service] PostgreSQL health check failed.");
    }
  }

  const eventBus: EventBus = await createEventBus(cfg.NATS_URL);
  const notificationRepo: NotificationRepository = dbUrl
    ? new PostgresNotificationRepository(db)
    : new InMemoryNotificationTestRepo();

  // Subscribe to domain events to materialize user notifications
  await eventBus.subscribe<{ userId?: string; spaceId?: string; status?: string; orderId?: string }>(
    "commerce.order.status_updated",
    async (evt) => {
      if (!evt.data?.userId) return;
      await notificationRepo.createNotification({
        id: crypto.randomUUID(),
        userId: evt.data.userId,
        spaceId: evt.data.spaceId,
        type: "order_status",
        title: "Print Order Update",
        body: `Your heirloom book order status is now '${evt.data.status}'.`,
        data: evt.data as Record<string, any>,
      });
    },
    { durableName: "notification_commerce_order_status" }
  );

  app.addHook("onClose", async () => {
    await eventBus.close().catch((err) => logger.warn({ err }, "[Notification] EventBus close warning"));
    await db.close().catch((err) => logger.warn({ err }, "[Notification] DB close warning"));
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

  app.get("/health", async (_req, reply) => {
    const healthy = await db.healthCheck();
    return reply.status(200).send(
      createSuccessResponse({
        service: "notification-service",
        status: healthy ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
      })
    );
  });

  app.get(
    "/api/v1/notifications",
    async (req: FastifyRequest<{ Querystring: { unreadOnly?: string } }>, reply: FastifyReply) => {
      const userId = await requireAuthUser(req);
      const unreadOnly = req.query.unreadOnly === "true";
      const items = await notificationRepo.listNotifications(userId, unreadOnly);
      return reply.status(200).send(createSuccessResponse(items));
    }
  );

  const CreateNotificationSchema = z.object({
    userId: z.string().uuid(),
    spaceId: z.string().uuid().optional(),
    type: z.string().min(1),
    title: z.string().min(1),
    body: z.string().min(1),
    data: z.record(z.string(), z.any()).optional(),
  });

  app.post("/api/v1/notifications", async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAuthUser(req);
    const parseResult = CreateNotificationSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply
        .status(400)
        .send(createErrorResponse("VALIDATION_ERROR", "Invalid notification payload"));
    }
    const created = await notificationRepo.createNotification({
      id: crypto.randomUUID(),
      userId: parseResult.data.userId,
      spaceId: parseResult.data.spaceId,
      type: parseResult.data.type,
      title: parseResult.data.title,
      body: parseResult.data.body,
      data: parseResult.data.data || {},
    });
    return reply.status(201).send(createSuccessResponse(created));
  });

  app.patch(
    "/api/v1/notifications/:id/read",
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const userId = await requireAuthUser(req);
      const updated = await notificationRepo.markRead(req.params.id, userId);
      if (!updated) {
        return reply
          .status(404)
          .send(createErrorResponse("NOTIFICATION_NOT_FOUND", "Unread notification not found"));
      }
      return reply.status(200).send(createSuccessResponse({ read: true, id: req.params.id }));
    }
  );

  app.post("/api/v1/notifications/read-all", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = await requireAuthUser(req);
    const count = await notificationRepo.markAllRead(userId);
    return reply.status(200).send(createSuccessResponse({ markedReadCount: count }));
  });

  return app;
}

if (process.env.NODE_ENV !== "test") {
  (async () => {
    try {
      const app = await buildNotificationService();
      await startServiceServer({
        serviceId: "notification-service",
        app,
        logger,
      });
    } catch (err) {
      logger.error({ err }, "[Notification] Unexpected startup failure");
      process.exit(1);
    }
  })();
}
