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
  CommerceRepository,
  PostgresCommerceRepository,
  PostgresSpaceRepository,
  PostgresCollaborationRepository,
  PostgresOutboxRepository,
  SpaceRepository,
  CollaborationRepository,
  OutboxRepository,
  PrintOrderRecord,
} from "@memory-capsule/database";

const logger: Logger = createServiceLogger("commerce-service");

class InMemoryCommerceTestRepo implements CommerceRepository {
  private orders = new Map<string, PrintOrderRecord>();

  async createOrder(
    order: Omit<PrintOrderRecord, "createdAt" | "updatedAt">
  ): Promise<PrintOrderRecord> {
    const now = new Date().toISOString();
    const record: PrintOrderRecord = { ...order, createdAt: now, updatedAt: now };
    this.orders.set(order.id, record);
    return record;
  }
  async getOrderById(id: string): Promise<PrintOrderRecord | null> {
    return this.orders.get(id) || null;
  }
  async listOrders(spaceId: string): Promise<PrintOrderRecord[]> {
    return Array.from(this.orders.values()).filter((o) => o.spaceId === spaceId);
  }
  async listOrdersByUser(userId: string): Promise<PrintOrderRecord[]> {
    return Array.from(this.orders.values()).filter((o) => o.userId === userId);
  }
  async updateOrderStatus(id: string, status: string): Promise<void> {
    const order = this.orders.get(id);
    if (order) {
      this.orders.set(id, { ...order, status, updatedAt: new Date().toISOString() });
    }
  }
}

export async function buildCommerceService(): Promise<FastifyInstance> {
  const cfg = validateServiceConfig(BaseServiceConfigSchema);
  const app = Fastify({ logger: false });
  app.setErrorHandler(createFastifyErrorHandler(logger));

  const dbUrl = cfg.COMMERCE_DATABASE_URL || cfg.DATABASE_URL;
  if (!dbUrl && cfg.NODE_ENV !== "test") {
    throw new Error("[commerce-service] COMMERCE_DATABASE_URL or DATABASE_URL is required in non-test mode.");
  }
  const db: DatabaseClient = createDatabaseClient(dbUrl);
  if (cfg.NODE_ENV !== "test") {
    const healthy = await db.healthCheck();
    if (!healthy) {
      throw new Error("[commerce-service] PostgreSQL health check failed.");
    }
  }

  const eventBus: EventBus = await createEventBus(cfg.NATS_URL);
  const commerceRepo: CommerceRepository = dbUrl
    ? new PostgresCommerceRepository(db)
    : new InMemoryCommerceTestRepo();
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

  let outboxTimer: NodeJS.Timeout | null = null;
  if (outboxRepo?.relayPending) {
    outboxTimer = setInterval(() => {
      outboxRepo
        .relayPending!(async (evt) => {
          await eventBus.publish(
            evt.eventType,
            createDomainEvent(evt.eventType, "commerce-service", evt.payload)
          );
        })
        .catch((err) => logger.warn({ err }, "[Commerce Outbox] Relay cycle warning"));
    }, 1000);
    outboxTimer.unref();
  }

  app.addHook("onClose", async () => {
    if (outboxTimer) clearInterval(outboxTimer);
    await eventBus.close().catch((err) => logger.warn({ err }, "[Commerce] EventBus close warning"));
    if (memoryDb) {
      await memoryDb.close().catch((err) => logger.warn({ err }, "[Commerce] Memory DB close warning"));
    }
    if (collabDb) {
      await collabDb.close().catch((err) => logger.warn({ err }, "[Commerce] Collab DB close warning"));
    }
    await db.close().catch((err) => logger.warn({ err }, "[Commerce] DB close warning"));
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

  async function assertSpaceAccess(
    spaceId: string,
    userId: string,
    requireWrite = false
  ): Promise<void> {
    if (!spaceRepo && !collabRepo) {
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
              throw new ForbiddenError("Viewer role cannot place print orders");
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
          throw new ForbiddenError("Viewer role cannot place print orders");
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
  ) {
    if (outboxRepo) {
      await outboxRepo.stageEvent({
        eventType: subject,
        aggregateType: "commerce",
        aggregateId,
        payload,
      });
      if (outboxRepo.relayPending) {
        await outboxRepo.relayPending(async (evt) => {
          await eventBus.publish(evt.eventType, createDomainEvent(eventType, "commerce-service", evt.payload));
        });
      }
    } else {
      await eventBus.publish(subject, createDomainEvent(eventType, "commerce-service", payload));
    }
  }

  app.get("/health", async (_req, reply) => {
    const healthy = await db.healthCheck();
    return reply.status(200).send(
      createSuccessResponse({
        service: "commerce-service",
        status: healthy ? "healthy" : "degraded",
        sandboxPolicy: "zero-budget-local-fulfillment",
        timestamp: new Date().toISOString(),
      })
    );
  });

  const CreateOrderSchema = z.object({
    spaceId: z.string().uuid(),
    bookId: z.string().uuid(),
    quantity: z.number().int().min(1).max(20).default(1),
    shippingAddress: z.object({
      recipientName: z.string().min(1),
      line1: z.string().min(1),
      city: z.string().min(1),
      postalCode: z.string().min(2),
      country: z.string().min(2).default("US"),
    }),
    printSpec: z.object({
      paperWeight: z.enum(["140gsm_matte", "170gsm_lustre"]).default("170gsm_lustre"),
      binding: z.enum(["hardcover_linen", "french_morocco"]).default("french_morocco"),
      editionHash: z.string().optional(),
    }),
  });

  app.post("/api/v1/orders", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = await requireAuthUser(req);
    const parseResult = CreateOrderSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send(createErrorResponse("VALIDATION_ERROR", "Invalid print order payload"));
    }

    const { spaceId, bookId, quantity, shippingAddress, printSpec } = parseResult.data;
    await assertSpaceAccess(spaceId, userId, true);
    const unitPriceCents = printSpec.binding === "french_morocco" ? 6800 : 4800;
    const totalCents = unitPriceCents * quantity;

    const order = await commerceRepo.createOrder({
      id: crypto.randomUUID(),
      spaceId,
      userId,
      bookId,
      status: "submitted",
      totalCents,
      currency: "USD",
      shippingAddress,
      printSpec: { ...printSpec, quantity, paymentMode: "sandbox_zero_budget" },
    });

    await publishDomainEvent("commerce.order.created", "commerce.order.created", order.id, {
      orderId: order.id,
      spaceId,
      userId,
      bookId,
      totalCents,
    });

    return reply.status(201).send(createSuccessResponse(order));
  });

  // Shipping & Zero-Markup Pricing Calculator (PWA-72)
  app.post("/api/v1/orders/quote", async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAuthUser(req);
    const body = (req.body as {
      format?: string;
      binding?: string;
      paperWeight?: string;
      quantity?: number;
      country?: string;
    }) || {};
    const quantity = Math.min(Math.max(Number(body.quantity || 1), 1), 20);
    const baseCents =
      body.format === "hardcover_grand_12x12"
        ? 6800
        : body.format === "hardcover_square_8x8"
        ? 4200
        : 4800;
    const bindingSurcharge = body.binding === "french_morocco" ? 2000 : 0;
    const paperSurcharge = body.paperWeight === "170gsm_lustre" ? 400 : 0;
    const unitCents = baseCents + bindingSurcharge + paperSurcharge;
    const subtotalCents = unitCents * quantity;
    const isDomestic = !body.country || body.country.toUpperCase() === "US";
    const shippingCents = isDomestic ? 900 : 2400;
    return reply.status(200).send(
      createSuccessResponse({
        currency: "USD",
        quantity,
        unitCents,
        subtotalCents,
        shippingCents,
        taxCents: 0,
        totalCents: subtotalCents + shippingCents,
        estimatedDays: isDomestic ? "5–7 business days" : "10–14 business days",
      })
    );
  });

  // List Authenticated User's Orders Across All Spaces (PWA-75 / PWA-76)
  app.get("/api/v1/orders/me", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = await requireAuthUser(req);
    const orders = commerceRepo.listOrdersByUser ? await commerceRepo.listOrdersByUser(userId) : [];
    return reply.status(200).send(createSuccessResponse(orders));
  });

  app.get(
    "/api/v1/orders/:orderId",
    async (req: FastifyRequest<{ Params: { orderId: string } }>, reply: FastifyReply) => {
      const userId = await requireAuthUser(req);
      const order = await commerceRepo.getOrderById(req.params.orderId);
      if (!order) {
        return reply.status(404).send(createErrorResponse("ORDER_NOT_FOUND", "Print order not found"));
      }
      await assertSpaceAccess(order.spaceId, userId, false);
      return reply.status(200).send(createSuccessResponse(order));
    }
  );

  // Printable Proof Receipt (PWA-74)
  app.get(
    "/api/v1/orders/:orderId/receipt",
    async (req: FastifyRequest<{ Params: { orderId: string } }>, reply: FastifyReply) => {
      const userId = await requireAuthUser(req);
      const order = await commerceRepo.getOrderById(req.params.orderId);
      if (!order) {
        return reply.status(404).send(createErrorResponse("ORDER_NOT_FOUND", "Print order not found"));
      }
      await assertSpaceAccess(order.spaceId, userId, false);
      return reply.status(200).send(
        createSuccessResponse({
          receiptNumber: `MEM-${order.id.slice(0, 8).toUpperCase()}`,
          orderId: order.id,
          bookId: order.bookId,
          status: order.status,
          currency: order.currency,
          totalCents: order.totalCents,
          shippingAddress: order.shippingAddress,
          printSpec: order.printSpec,
          issuedAt: order.createdAt,
          policyNote: "Zero-markup archival press fulfillment",
        })
      );
    }
  );

  app.get(
    "/api/v1/orders/spaces/:spaceId",
    async (req: FastifyRequest<{ Params: { spaceId: string } }>, reply: FastifyReply) => {
      const userId = await requireAuthUser(req);
      await assertSpaceAccess(req.params.spaceId, userId, false);
      const orders = await commerceRepo.listOrders(req.params.spaceId);
      return reply.status(200).send(createSuccessResponse(orders));
    }
  );

  const UpdateOrderStatusSchema = z.object({
    status: z.enum([
      "submitted",
      "preflight_passed",
      "in_production",
      "shipped",
      "delivered",
      "cancelled",
    ]),
  });

  app.patch(
    "/api/v1/orders/:orderId/status",
    async (req: FastifyRequest<{ Params: { orderId: string } }>, reply: FastifyReply) => {
      const userId = await requireAuthUser(req);
      const existing = await commerceRepo.getOrderById(req.params.orderId);
      if (!existing) {
        return reply.status(404).send(createErrorResponse("ORDER_NOT_FOUND", "Print order not found"));
      }
      await assertSpaceAccess(existing.spaceId, userId, true);
      const parseResult = UpdateOrderStatusSchema.safeParse(req.body);
      if (!parseResult.success) {
        return reply.status(400).send(createErrorResponse("VALIDATION_ERROR", "Invalid order status"));
      }
      await commerceRepo.updateOrderStatus(existing.id, parseResult.data.status);
      const updated = await commerceRepo.getOrderById(existing.id);

      await publishDomainEvent("commerce.order.status_updated", "commerce.order.status_updated", existing.id, {
        orderId: existing.id,
        spaceId: existing.spaceId,
        userId: existing.userId,
        status: parseResult.data.status,
      });

      return reply.status(200).send(createSuccessResponse(updated));
    }
  );

  return app;
}

if (process.env.NODE_ENV !== "test") {
  (async () => {
    try {
      const app = await buildCommerceService();
      await startServiceServer({
        serviceId: "commerce-service",
        app,
        logger,
      });
    } catch (err) {
      logger.error({ err }, "[Commerce] Unexpected startup failure");
      process.exit(1);
    }
  })();
}
