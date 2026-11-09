import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import httpProxy from "@fastify/http-proxy";
import { createServiceLogger, Logger } from "@memory-capsule/logger";
import { createSuccessResponse } from "@memory-capsule/contracts";

const logger: Logger = createServiceLogger("api-gateway");

export function buildGateway(): FastifyInstance {
  const app = Fastify({
    logger: false, // Using our centralized Pino logger
    trustProxy: true,
  });

  // 1. Correlation ID Middleware
  app.addHook("onRequest", async (req: FastifyRequest, reply: FastifyReply) => {
    const correlationId = (req.headers["x-correlation-id"] as string) || `corr-${crypto.randomUUID()}`;
    req.headers["x-correlation-id"] = correlationId;
    reply.header("x-correlation-id", correlationId);
    logger.info({
      method: req.method,
      url: req.url,
      correlationId,
      ip: req.ip,
    }, "[Gateway] Inbound Request");
  });

  // 2. Security Plugins
  app.register(cors, {
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  app.register(helmet, {
    contentSecurityPolicy: false, // Adjusted for Next.js / WebGL / PWA
  });

  app.register(rateLimit, {
    max: 200,
    timeWindow: "1 minute",
  });

  // 3. Health Check
  app.get("/health", async (req, reply) => {
    const correlationId = req.headers["x-correlation-id"] as string;
    return reply.status(200).send(
      createSuccessResponse(
        {
          service: "api-gateway",
          status: "healthy",
          timestamp: new Date().toISOString(),
          upstream: {
            identity: process.env.IDENTITY_SERVICE_URL || "http://localhost:4001",
            memory: process.env.MEMORY_SERVICE_URL || "http://localhost:4002",
            media: process.env.MEDIA_SERVICE_URL || "http://localhost:4003",
            book: process.env.BOOK_SERVICE_URL || "http://localhost:4005",
          },
        },
        correlationId
      )
    );
  });

  // 4. Reverse Proxy Routes to Microservices
  const identityUrl = process.env.IDENTITY_SERVICE_URL || "http://localhost:4001";
  const memoryUrl = process.env.MEMORY_SERVICE_URL || "http://localhost:4002";
  const mediaUrl = process.env.MEDIA_SERVICE_URL || "http://localhost:4003";
  const bookUrl = process.env.BOOK_SERVICE_URL || "http://localhost:4005";

  app.register(httpProxy, {
    upstream: identityUrl,
    prefix: "/api/v1/auth",
    rewritePrefix: "/api/v1/auth",
  });

  app.register(httpProxy, {
    upstream: memoryUrl,
    prefix: "/api/v1/spaces",
    rewritePrefix: "/api/v1/spaces",
  });

  app.register(httpProxy, {
    upstream: memoryUrl,
    prefix: "/api/v1/memories",
    rewritePrefix: "/api/v1/memories",
  });

  app.register(httpProxy, {
    upstream: mediaUrl,
    prefix: "/api/v1/media",
    rewritePrefix: "/api/v1/media",
  });

  app.register(httpProxy, {
    upstream: bookUrl,
    prefix: "/api/v1/books",
    rewritePrefix: "/api/v1/books",
  });

  return app;
}

if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT_GATEWAY || 4000);
  const host = "0.0.0.0";
  const server = buildGateway();

  server.listen({ port, host }, (err, address) => {
    if (err) {
      logger.error({ err }, "[Gateway] Failed to start");
      process.exit(1);
    }
    logger.info({ address, port }, `[Gateway] Listening at ${address}`);
  });
}

