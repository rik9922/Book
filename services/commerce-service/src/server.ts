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
  calculatePrintOrderPricing,
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
  PostgresBookRepository,
  PostgresOutboxRepository,
  SpaceRepository,
  CollaborationRepository,
  BookRepository,
  OutboxRepository,
  PrintOrderRecord,
} from "@memory-capsule/database";

const logger: Logger = createServiceLogger("commerce-service");
const ADMIN_ROLES = new Set(["superadmin", "admin", "ops_admin", "compliance_officer", "support_agent"]);

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
  async listAllOrders(): Promise<PrintOrderRecord[]> {
    return Array.from(this.orders.values());
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
  const inMemoryRepo = new InMemoryCommerceTestRepo();
  const commerceRepo: CommerceRepository = dbUrl
    ? new PostgresCommerceRepository(db)
    : inMemoryRepo;
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

  const bookDb: DatabaseClient | null = cfg.BOOK_DATABASE_URL
    ? createDatabaseClient(cfg.BOOK_DATABASE_URL)
    : null;
  const bookRepo: BookRepository | null = bookDb ? new PostgresBookRepository(bookDb) : null;

  // In-memory fallbacks when running isolated unit tests without commerce_db
  const memTracking = new Map<string, { carrier: string; trackingNumber: string; trackingUrl: string; updatedAt: string }>();
  const memRefunds: Array<Record<string, any>> = [];
  const memFormats = new Map<string, { formatId: string; label: string; dimensionsCm: string; baseCents: number; enabled: boolean }>([
    ["hardcover_square_8x8", { formatId: "hardcover_square_8x8", label: 'Square Heirloom 8×8"', dimensionsCm: "20.3 × 20.3 cm", baseCents: 4200, enabled: true }],
    ["hardcover_standard_8x10", { formatId: "hardcover_standard_8x10", label: 'Standard Archive 8×10"', dimensionsCm: "20.3 × 25.4 cm", baseCents: 4800, enabled: true }],
    ["hardcover_grand_12x12", { formatId: "hardcover_grand_12x12", label: 'Grand Estate 12×12"', dimensionsCm: "30.5 × 30.5 cm", baseCents: 6800, enabled: true }],
  ]);
  const memShippingRates = new Map<string, { zoneCode: string; label: string; rateCents: number; estimatedDays: string }>([
    ["US", { zoneCode: "US", label: "Domestic Archival Parcel (US)", rateCents: 900, estimatedDays: "5–7 business days" }],
    ["INTL", { zoneCode: "INTL", label: "International Insured Courier", rateCents: 2400, estimatedDays: "10–14 business days" }],
  ]);

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
    if (bookDb) {
      await bookDb.close().catch((err) => logger.warn({ err }, "[Commerce] Book DB close warning"));
    }
    await db.close().catch((err) => logger.warn({ err }, "[Commerce] DB close warning"));
  });

  await app.register(cors, { origin: true, credentials: true });
  await app.register(fastifyJwt, { secret: cfg.JWT_SECRET });

  async function requireAuthClaims(req: FastifyRequest): Promise<{ userId: string; role: string }> {
    try {
      const claims: any = await req.jwtVerify();
      const userId = claims?.sub || claims?.userId;
      if (!userId || typeof userId !== "string") {
        throw new UnauthorizedError("Missing subject in JWT");
      }
      return { userId, role: typeof claims?.role === "string" ? claims.role : "member" };
    } catch {
      throw new UnauthorizedError("Valid authentication token required");
    }
  }

  async function requireAuthUser(req: FastifyRequest): Promise<string> {
    const claims = await requireAuthClaims(req);
    return claims.userId;
  }

  async function requireAdminUser(req: FastifyRequest): Promise<{ userId: string; role: string }> {
    const claims = await requireAuthClaims(req);
    if (!ADMIN_ROLES.has(claims.role)) {
      throw new ForbiddenError("Administrative privileges required");
    }
    return claims;
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
    format: z.enum(["hardcover_square_8x8", "hardcover_standard_8x10", "hardcover_grand_12x12"]).optional(),
    shippingSpeed: z.enum(["standard", "priority"]).default("standard"),
    shippingAddress: z.object({
      recipientName: z.string().min(1),
      line1: z.string().min(1),
      city: z.string().min(1),
      postalCode: z.string().min(2),
      country: z.string().min(2).default("US"),
    }),
    printSpec: z.object({
      format: z.enum(["hardcover_square_8x8", "hardcover_standard_8x10", "hardcover_grand_12x12"]).optional(),
      paperWeight: z.enum(["140gsm_matte", "170gsm_lustre"]).default("170gsm_lustre"),
      binding: z.enum(["hardcover_linen", "french_morocco"]).default("french_morocco"),
      editionHash: z.string().optional(),
    }),
  });

  async function resolveBookFormat(bookId: string, requestedFormat?: string): Promise<string> {
    if (requestedFormat) return requestedFormat;
    if (bookRepo) {
      const book = await bookRepo.findBookById(bookId);
      if (book?.format) return book.format;
    }
    return "hardcover_standard_8x10";
  }

  async function computeLiveQuote(params: {
    format?: string;
    binding?: string;
    paperWeight?: string;
    quantity?: number;
    country?: string;
    shippingSpeed?: string;
  }) {
    const resolvedFormat =
      params.format === "hardcover_grand_12x12" || params.format === "hardcover_square_8x8"
        ? params.format
        : "hardcover_standard_8x10";
    const zoneCode = (params.country || "US").trim().toUpperCase() === "US" ? "US" : "INTL";

    let formatBaseCentsOverride: number | undefined;
    let formatEnabled = true;
    let shippingRateCentsOverride: number | undefined;
    let estimatedDaysOverride: string | undefined;

    if (dbUrl) {
      const [fmtRes, shipRes] = await Promise.all([
        db.query(`SELECT base_cents as "baseCents", enabled FROM print_catalog_formats WHERE format_id = $1 LIMIT 1`, [resolvedFormat]),
        db.query(`SELECT rate_cents as "rateCents", estimated_days as "estimatedDays" FROM shipping_rates WHERE zone_code = $1 LIMIT 1`, [zoneCode]),
      ]);
      if (fmtRes.rows[0]) {
        formatBaseCentsOverride = Number(fmtRes.rows[0].baseCents);
        formatEnabled = Boolean(fmtRes.rows[0].enabled);
      }
      if (shipRes.rows[0]) {
        shippingRateCentsOverride = Number(shipRes.rows[0].rateCents);
        estimatedDaysOverride = shipRes.rows[0].estimatedDays;
      }
    } else {
      const fmt = memFormats.get(resolvedFormat);
      if (fmt) {
        formatBaseCentsOverride = fmt.baseCents;
        formatEnabled = fmt.enabled;
      }
      const sr = memShippingRates.get(zoneCode);
      if (sr) {
        shippingRateCentsOverride = sr.rateCents;
        estimatedDaysOverride = sr.estimatedDays;
      }
    }

    return {
      formatEnabled,
      quote: calculatePrintOrderPricing({
        format: resolvedFormat,
        binding: params.binding,
        paperWeight: params.paperWeight,
        quantity: params.quantity,
        country: params.country,
        shippingSpeed: params.shippingSpeed,
        formatBaseCentsOverride,
        shippingRateCentsOverride,
        estimatedDaysOverride,
      }),
    };
  }

  app.post("/api/v1/orders", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = await requireAuthUser(req);
    const parseResult = CreateOrderSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send(createErrorResponse("VALIDATION_ERROR", "Invalid print order payload"));
    }

    const { spaceId, bookId, quantity, format, shippingSpeed, shippingAddress, printSpec } = parseResult.data;
    await assertSpaceAccess(spaceId, userId, true);

    const resolvedFormat = await resolveBookFormat(bookId, format || printSpec.format);
    const { formatEnabled, quote } = await computeLiveQuote({
      format: resolvedFormat,
      binding: printSpec.binding,
      paperWeight: printSpec.paperWeight,
      quantity,
      country: shippingAddress.country,
      shippingSpeed,
    });
    if (!formatEnabled) {
      return reply.status(400).send(createErrorResponse("FORMAT_DISABLED", "Selected print format is currently disabled"));
    }

    const orderId = crypto.randomUUID();
    const order = await commerceRepo.createOrder({
      id: orderId,
      spaceId,
      userId,
      bookId,
      status: "submitted",
      totalCents: quote.totalCents,
      currency: quote.currency,
      shippingAddress,
      printSpec: {
        ...printSpec,
        format: quote.format,
        shippingSpeed: quote.shippingSpeed,
        quantity: quote.quantity,
        unitCents: quote.unitCents,
        subtotalCents: quote.subtotalCents,
        shippingCents: quote.shippingCents,
        taxCents: quote.taxCents,
        estimatedDays: quote.estimatedDays,
        paymentMode: "sandbox_zero_budget",
      },
    });

    if (dbUrl) {
      await db.query(
        `INSERT INTO order_items (id, order_id, book_id, edition_hash, quantity, unit_price_cents)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          crypto.randomUUID(),
          order.id,
          bookId,
          printSpec.editionHash || "draft-edition",
          quote.quantity,
          quote.unitCents,
        ]
      ).catch((err) => logger.warn({ err, orderId: order.id }, "[Commerce] Non-fatal order_items insert warning"));
      await db.query(
        `INSERT INTO fulfilment_records (id, order_id, provider, status)
         VALUES ($1, $2, 'local_print_press', 'queued')`,
        [crypto.randomUUID(), order.id]
      ).catch((err) => logger.warn({ err, orderId: order.id }, "[Commerce] Non-fatal fulfilment_records insert warning"));
    }

    await publishDomainEvent("commerce.order.created", "commerce.order.created", order.id, {
      orderId: order.id,
      spaceId,
      userId,
      bookId,
      totalCents: quote.totalCents,
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
      shippingSpeed?: string;
      printSpec?: { format?: string; binding?: string; paperWeight?: string };
      shippingAddress?: { country?: string };
    }) || {};
    const { formatEnabled, quote } = await computeLiveQuote({
      format: body.format || body.printSpec?.format,
      binding: body.binding || body.printSpec?.binding,
      paperWeight: body.paperWeight || body.printSpec?.paperWeight,
      quantity: body.quantity,
      country: body.country || body.shippingAddress?.country,
      shippingSpeed: body.shippingSpeed,
    });
    if (!formatEnabled) {
      return reply.status(400).send(createErrorResponse("FORMAT_DISABLED", "Selected print format is currently disabled"));
    }
    return reply.status(200).send(createSuccessResponse(quote));
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

  // Live Order Tracking Timeline (PWA-75 / IOS-53)
  app.get(
    "/api/v1/orders/:orderId/tracking",
    async (req: FastifyRequest<{ Params: { orderId: string } }>, reply: FastifyReply) => {
      const userId = await requireAuthUser(req);
      const order = await commerceRepo.getOrderById(req.params.orderId);
      if (!order) {
        return reply.status(404).send(createErrorResponse("ORDER_NOT_FOUND", "Print order not found"));
      }
      await assertSpaceAccess(order.spaceId, userId, false);

      let trackingNumber: string | null = null;
      let trackingUrl: string | null = null;
      let carrier = "Archival Press Courier";
      if (dbUrl) {
        const res = await db.query(
          `SELECT provider, tracking_number as "trackingNumber", tracking_url as "trackingUrl"
           FROM fulfilment_records WHERE order_id = $1 ORDER BY updated_at DESC LIMIT 1`,
          [order.id]
        );
        if (res.rows[0]) {
          carrier = res.rows[0].provider || carrier;
          trackingNumber = res.rows[0].trackingNumber || null;
          trackingUrl = res.rows[0].trackingUrl || null;
        }
      } else {
        const m = memTracking.get(order.id);
        if (m) {
          carrier = m.carrier;
          trackingNumber = m.trackingNumber;
          trackingUrl = m.trackingUrl;
        }
      }

      const stages = ["submitted", "preflight_passed", "in_production", "shipped", "delivered"];
      const currentIdx = Math.max(0, stages.indexOf(order.status));
      return reply.status(200).send(
        createSuccessResponse({
          orderId: order.id,
          status: order.status,
          carrier,
          trackingNumber,
          trackingUrl,
          estimatedDays: order.printSpec?.estimatedDays || "5–7 business days",
          timeline: stages.map((stage, idx) => ({
            stage,
            completed: idx <= currentIdx,
            active: idx === currentIdx,
          })),
        })
      );
    }
  );

  // Reorder Immutable Historical Edition (PWA-76)
  app.post(
    "/api/v1/orders/:orderId/reorder",
    async (req: FastifyRequest<{ Params: { orderId: string }; Body?: { quantity?: number } }>, reply: FastifyReply) => {
      const userId = await requireAuthUser(req);
      const original = await commerceRepo.getOrderById(req.params.orderId);
      if (!original) {
        return reply.status(404).send(createErrorResponse("ORDER_NOT_FOUND", "Original order not found"));
      }
      await assertSpaceAccess(original.spaceId, userId, true);

      const quantity = Math.min(Math.max(Number(req.body?.quantity || original.printSpec?.quantity || 1), 1), 20);
      const { quote } = await computeLiveQuote({
        format: original.printSpec?.format,
        binding: original.printSpec?.binding,
        paperWeight: original.printSpec?.paperWeight,
        quantity,
        country: original.shippingAddress?.country || "US",
        shippingSpeed: original.printSpec?.shippingSpeed || "standard",
      });

      const reorder = await commerceRepo.createOrder({
        id: crypto.randomUUID(),
        spaceId: original.spaceId,
        userId,
        bookId: original.bookId,
        status: "submitted",
        totalCents: quote.totalCents,
        currency: quote.currency,
        shippingAddress: original.shippingAddress,
        printSpec: {
          ...original.printSpec,
          format: quote.format,
          shippingSpeed: quote.shippingSpeed,
          quantity: quote.quantity,
          unitCents: quote.unitCents,
          subtotalCents: quote.subtotalCents,
          shippingCents: quote.shippingCents,
          taxCents: quote.taxCents,
          estimatedDays: quote.estimatedDays,
          reorderedFromOrderId: original.id,
          paymentMode: "sandbox_zero_budget",
        },
      });

      if (dbUrl) {
        await db.query(
          `INSERT INTO order_items (id, order_id, book_id, edition_hash, quantity, unit_price_cents)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            crypto.randomUUID(),
            reorder.id,
            reorder.bookId,
            original.printSpec?.editionHash || "draft-edition",
            quote.quantity,
            quote.unitCents,
          ]
        ).catch((err) => logger.warn({ err, orderId: reorder.id }, "[Commerce] Non-fatal reorder order_items warning"));
        await db.query(
          `INSERT INTO fulfilment_records (id, order_id, provider, status)
           VALUES ($1, $2, 'local_print_press', 'queued')`,
          [crypto.randomUUID(), reorder.id]
        ).catch((err) => logger.warn({ err, orderId: reorder.id }, "[Commerce] Non-fatal reorder fulfilment warning"));
      }

      await publishDomainEvent("commerce.order.reordered", "commerce.order.reordered", reorder.id, {
        orderId: reorder.id,
        originalOrderId: original.id,
        spaceId: reorder.spaceId,
        userId,
      });

      return reply.status(201).send(createSuccessResponse(reorder));
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

  // ==========================================
  // ADMIN COMMERCE OPERATIONS (ADMIN-16..21)
  // ==========================================

  app.get("/api/v1/admin/orders", async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdminUser(req);
    if (dbUrl) {
      const res = await db.query(
        `SELECT o.id, o.space_id as "spaceId", o.user_id as "userId", o.book_id as "bookId",
                o.status, o.total_cents as "totalCents", o.currency, o.shipping_address as "shippingAddress",
                o.print_spec as "printSpec", o.created_at::text as "createdAt", o.updated_at::text as "updatedAt",
                f.tracking_number as "trackingNumber", f.provider as "carrier"
         FROM print_orders o
         LEFT JOIN fulfilment_records f ON f.order_id = o.id
         ORDER BY o.created_at DESC LIMIT 200`
      );
      return reply.status(200).send(createSuccessResponse(res.rows));
    }
    const orders = await inMemoryRepo.listAllOrders();
    return reply.status(200).send(createSuccessResponse(orders));
  });

  app.post(
    "/api/v1/admin/orders/:orderId/ship",
    async (
      req: FastifyRequest<{
        Params: { orderId: string };
        Body: { trackingNumber?: string; carrier?: string; trackingUrl?: string };
      }>,
      reply: FastifyReply
    ) => {
      await requireAdminUser(req);
      const order = await commerceRepo.getOrderById(req.params.orderId);
      if (!order) {
        return reply.status(404).send(createErrorResponse("ORDER_NOT_FOUND", "Print order not found"));
      }
      const trackingNumber = req.body?.trackingNumber?.trim() || `MEM-TRK-${order.id.slice(0, 8).toUpperCase()}`;
      const carrier = req.body?.carrier?.trim() || "Archival Press Courier";
      const trackingUrl = req.body?.trackingUrl?.trim() || `https://tracking.memoria.local/${trackingNumber}`;

      await commerceRepo.updateOrderStatus(order.id, "shipped");
      if (dbUrl) {
        const updateRes = await db.query(
          `UPDATE fulfilment_records
           SET provider = $1, tracking_number = $2, tracking_url = $3, status = 'shipped', updated_at = NOW()
           WHERE order_id = $4`,
          [carrier, trackingNumber, trackingUrl, order.id]
        );
        if ((updateRes.rowCount || 0) === 0) {
          await db.query(
            `INSERT INTO fulfilment_records (id, order_id, provider, tracking_number, tracking_url, status)
             VALUES ($1, $2, $3, $4, $5, 'shipped')`,
            [crypto.randomUUID(), order.id, carrier, trackingNumber, trackingUrl]
          );
        }
      } else {
        memTracking.set(order.id, { carrier, trackingNumber, trackingUrl, updatedAt: new Date().toISOString() });
      }

      await publishDomainEvent("commerce.order.status_updated", "commerce.order.status_updated", order.id, {
        orderId: order.id,
        spaceId: order.spaceId,
        userId: order.userId,
        status: "shipped",
        trackingNumber,
      });

      const updated = await commerceRepo.getOrderById(order.id);
      return reply.status(200).send(createSuccessResponse({ ...updated, trackingNumber, carrier, trackingUrl }));
    }
  );

  app.post(
    "/api/v1/admin/orders/:orderId/refund",
    async (
      req: FastifyRequest<{
        Params: { orderId: string };
        Body: { refundType?: "refund" | "remake"; reason?: string; amountCents?: number };
      }>,
      reply: FastifyReply
    ) => {
      const admin = await requireAdminUser(req);
      const order = await commerceRepo.getOrderById(req.params.orderId);
      if (!order) {
        return reply.status(404).send(createErrorResponse("ORDER_NOT_FOUND", "Print order not found"));
      }
      const refundType = req.body?.refundType === "remake" ? "remake" : "refund";
      const reason = req.body?.reason?.trim() || "Customer archival quality guarantee";
      const amountCents = refundType === "remake" ? 0 : Math.min(order.totalCents, Math.max(0, Number(req.body?.amountCents ?? order.totalCents)));
      const record = {
        id: crypto.randomUUID(),
        orderId: order.id,
        amountCents,
        refundType,
        reason,
        status: "processed",
        processedBy: admin.userId,
        createdAt: new Date().toISOString(),
      };
      if (dbUrl) {
        await db.query(
          `INSERT INTO order_refunds (id, order_id, amount_cents, refund_type, reason, status, processed_by)
           VALUES ($1, $2, $3, $4, $5, 'processed', $6)`,
          [record.id, record.orderId, record.amountCents, record.refundType, record.reason, record.processedBy]
        );
      } else {
        memRefunds.unshift(record);
      }
      if (refundType === "refund") {
        await commerceRepo.updateOrderStatus(order.id, "cancelled");
      }
      return reply.status(201).send(createSuccessResponse(record));
    }
  );

  app.get("/api/v1/admin/transactions", async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdminUser(req);
    if (dbUrl) {
      const [ordersRes, refundsRes] = await Promise.all([
        db.query(
          `SELECT id, book_id as "bookId", status, total_cents as "totalCents", currency,
                  print_spec->>'paymentMode' as "paymentMode", created_at::text as "createdAt"
           FROM print_orders ORDER BY created_at DESC LIMIT 100`
        ),
        db.query(
          `SELECT id, order_id as "orderId", amount_cents as "amountCents", refund_type as "refundType",
                  reason, status, created_at::text as "createdAt"
           FROM order_refunds ORDER BY created_at DESC LIMIT 100`
        ),
      ]);
      return reply.status(200).send(
        createSuccessResponse({
          transactions: ordersRes.rows,
          refunds: refundsRes.rows,
        })
      );
    }
    return reply.status(200).send(
      createSuccessResponse({
        transactions: await inMemoryRepo.listAllOrders(),
        refunds: memRefunds,
      })
    );
  });

  app.get("/api/v1/admin/catalog/formats", async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdminUser(req);
    if (dbUrl) {
      const res = await db.query(
        `SELECT format_id as "formatId", label, dimensions_cm as "dimensionsCm",
                base_cents as "baseCents", enabled, updated_at::text as "updatedAt"
         FROM print_catalog_formats ORDER BY base_cents ASC`
      );
      return reply.status(200).send(createSuccessResponse(res.rows));
    }
    return reply.status(200).send(createSuccessResponse(Array.from(memFormats.values())));
  });

  app.put(
    "/api/v1/admin/catalog/formats/:formatId",
    async (
      req: FastifyRequest<{
        Params: { formatId: string };
        Body: { label?: string; baseCents?: number; enabled?: boolean };
      }>,
      reply: FastifyReply
    ) => {
      await requireAdminUser(req);
      const { formatId } = req.params;
      if (dbUrl) {
        const res = await db.query(
          `UPDATE print_catalog_formats
           SET label = COALESCE($1, label),
               base_cents = COALESCE($2, base_cents),
               enabled = COALESCE($3, enabled),
               updated_at = NOW()
           WHERE format_id = $4
           RETURNING format_id as "formatId", label, dimensions_cm as "dimensionsCm", base_cents as "baseCents", enabled`,
          [req.body?.label || null, req.body?.baseCents ?? null, req.body?.enabled ?? null, formatId]
        );
        if (!res.rows[0]) {
          return reply.status(404).send(createErrorResponse("FORMAT_NOT_FOUND", "Catalog format not found"));
        }
        return reply.status(200).send(createSuccessResponse(res.rows[0]));
      }
      const existing = memFormats.get(formatId);
      if (!existing) {
        return reply.status(404).send(createErrorResponse("FORMAT_NOT_FOUND", "Catalog format not found"));
      }
      const updated = {
        ...existing,
        ...(req.body?.label ? { label: req.body.label } : {}),
        ...(typeof req.body?.baseCents === "number" ? { baseCents: req.body.baseCents } : {}),
        ...(typeof req.body?.enabled === "boolean" ? { enabled: req.body.enabled } : {}),
      };
      memFormats.set(formatId, updated);
      return reply.status(200).send(createSuccessResponse(updated));
    }
  );

  app.get("/api/v1/admin/pricing/matrix", async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdminUser(req);
    if (dbUrl) {
      const [formatsRes, shippingRes] = await Promise.all([
        db.query(`SELECT format_id as "formatId", label, base_cents as "baseCents", enabled FROM print_catalog_formats ORDER BY base_cents ASC`),
        db.query(`SELECT zone_code as "zoneCode", label, rate_cents as "rateCents", estimated_days as "estimatedDays" FROM shipping_rates ORDER BY rate_cents ASC`),
      ]);
      return reply.status(200).send(createSuccessResponse({ formats: formatsRes.rows, shippingRates: shippingRes.rows }));
    }
    return reply.status(200).send(
      createSuccessResponse({
        formats: Array.from(memFormats.values()),
        shippingRates: Array.from(memShippingRates.values()),
      })
    );
  });

  app.post(
    "/api/v1/admin/pricing/matrix",
    async (
      req: FastifyRequest<{ Body: { zoneCode: string; rateCents: number; estimatedDays?: string } }>,
      reply: FastifyReply
    ) => {
      await requireAdminUser(req);
      const { zoneCode, rateCents, estimatedDays } = req.body || {};
      if (!zoneCode || typeof rateCents !== "number" || rateCents < 0) {
        return reply.status(400).send(createErrorResponse("VALIDATION_ERROR", "zoneCode and non-negative rateCents required"));
      }
      if (dbUrl) {
        const res = await db.query(
          `INSERT INTO shipping_rates (zone_code, label, rate_cents, estimated_days, updated_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (zone_code) DO UPDATE SET rate_cents = $3, estimated_days = COALESCE($4, shipping_rates.estimated_days), updated_at = NOW()
           RETURNING zone_code as "zoneCode", label, rate_cents as "rateCents", estimated_days as "estimatedDays"`,
          [zoneCode.toUpperCase(), `${zoneCode.toUpperCase()} Courier Rate`, rateCents, estimatedDays || "5–10 business days"]
        );
        return reply.status(200).send(createSuccessResponse(res.rows[0]));
      }
      const next = {
        zoneCode: zoneCode.toUpperCase(),
        label: `${zoneCode.toUpperCase()} Courier Rate`,
        rateCents,
        estimatedDays: estimatedDays || "5–10 business days",
      };
      memShippingRates.set(next.zoneCode, next);
      return reply.status(200).send(createSuccessResponse(next));
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
