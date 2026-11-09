import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import httpProxy from "@fastify/http-proxy";
import { createServiceLogger, Logger } from "@memory-capsule/logger";
import { createSuccessResponse, createErrorResponse, startServiceServer } from "@memory-capsule/contracts";
import {
  createIdentityClient,
  createMemoryClient,
  createClientMetadata,
  createDeadline,
  grpcStatusToHttpStatus,
  grpc,
} from "@memory-capsule/proto";

const logger: Logger = createServiceLogger("api-gateway");

export interface GatewayOptions {
  identityGrpcAddress?: string;
  memoryGrpcAddress?: string;
  enableGrpcRouting?: boolean;
}

export function buildGateway(options?: GatewayOptions): FastifyInstance {
  const app = Fastify({
    logger: false, // Using our centralized Pino logger
    trustProxy: true,
  });

  const identityGrpcAddress = options?.identityGrpcAddress || process.env.IDENTITY_GRPC_ADDRESS || "localhost:50051";
  const memoryGrpcAddress = options?.memoryGrpcAddress || process.env.MEMORY_GRPC_ADDRESS || "localhost:50052";
  const enableGrpc = options?.enableGrpcRouting ?? (process.env.ENABLE_GRPC_GATEWAY !== "false");

  // Shared persistent gRPC clients (channel reuse)
  const identityClient = enableGrpc ? createIdentityClient(identityGrpcAddress) : null;
  const memoryClient = enableGrpc ? createMemoryClient(memoryGrpcAddress) : null;

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
          protocols: {
            public: "REST/JSON (Fastify)",
            internal: enableGrpc ? "gRPC/HTTP2 (Protocol Buffers)" : "HTTP/1.1 (Proxy)",
          },
          upstream: {
            identityRest: process.env.IDENTITY_SERVICE_URL || "http://localhost:4001",
            identityGrpc: identityGrpcAddress,
            memoryRest: process.env.MEMORY_SERVICE_URL || "http://localhost:4002",
            memoryGrpc: memoryGrpcAddress,
            mediaRest: process.env.MEDIA_SERVICE_URL || "http://localhost:4003",
            bookRest: process.env.BOOK_SERVICE_URL || "http://localhost:4005",
          },
        },
        correlationId
      )
    );
  });

  // 4. Optimized gRPC Synchronous Routes (Translating REST -> Internal gRPC)
  if (enableGrpc && identityClient && memoryClient) {
    // Current user profile via Identity gRPC ValidateSession
    app.get("/api/v1/auth/me", async (req: FastifyRequest, reply: FastifyReply) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return reply.status(401).send(createErrorResponse("UNAUTHORIZED", "Missing authorization header"));
      }
      const token = authHeader.slice(7);
      const correlationId = req.headers["x-correlation-id"] as string;
      const metadata = createClientMetadata({ correlationId });

      return new Promise<void>((resolve) => {
        identityClient.validateSession(
          { token },
          metadata,
          { deadline: createDeadline(3000) },
          (err: grpc.ServiceError | null, response: any) => {
            if (err) {
              const status = grpcStatusToHttpStatus(err.code);
              reply.status(status).send(createErrorResponse("GRPC_UPSTREAM_ERROR", err.message));
              return resolve();
            }
            if (!response.is_valid) {
              reply.status(401).send(createErrorResponse("UNAUTHORIZED", response.error || "Invalid session"));
              return resolve();
            }

            reply.status(200).send(
              createSuccessResponse(
                {
                  user: {
                    id: response.user_id,
                    email: response.email,
                    fullName: response.full_name,
                    isVerified: response.is_verified,
                  },
                },
                correlationId
              )
            );
            resolve();
          }
        );
      });
    });

    // Single Memory Lookup via Memory gRPC
    app.get("/api/v1/memories/:memoryId", async (req: FastifyRequest<{ Params: { memoryId: string } }>, reply: FastifyReply) => {
      const { memoryId } = req.params;
      const correlationId = req.headers["x-correlation-id"] as string;
      const metadata = createClientMetadata({ correlationId });

      return new Promise<void>((resolve) => {
        memoryClient.getMemory(
          { memory_id: memoryId, space_id: "" },
          metadata,
          { deadline: createDeadline(3000) },
          (err: grpc.ServiceError | null, response: any) => {
            if (err) {
              const status = grpcStatusToHttpStatus(err.code);
              reply.status(status).send(createErrorResponse("GRPC_UPSTREAM_ERROR", err.message));
              return resolve();
            }
            if (!response || !response.found || !response.memory) {
              reply.status(404).send(createErrorResponse("MEMORY_NOT_FOUND", "Memory not found"));
              return resolve();
            }

            const m = response.memory;
            reply.status(200).send(
              createSuccessResponse(
                {
                  id: m.id,
                  spaceId: m.space_id,
                  authorId: m.author_id,
                  title: m.title,
                  content: m.content || undefined,
                  format: m.format,
                  capturedAt: m.captured_at,
                  location: m.location || undefined,
                  isFavorite: m.is_favorite,
                  associatedProfileIds: m.associated_profile_ids || [],
                  mediaIds: m.media_ids || [],
                  tags: m.tags || [],
                  createdAt: m.created_at,
                  updatedAt: m.updated_at,
                },
                correlationId
              )
            );
            resolve();
          }
        );
      });
    });

    // Space Memories Timeline Lookup via Memory gRPC
    app.get(
      "/api/v1/spaces/:spaceId/memories",
      async (
        req: FastifyRequest<{
          Params: { spaceId: string };
          Querystring: { limit?: string; cursorTime?: string; cursorId?: string; isFavorite?: string; profileId?: string };
        }>,
        reply: FastifyReply
      ) => {
        const { spaceId } = req.params;
        const correlationId = req.headers["x-correlation-id"] as string;
        const metadata = createClientMetadata({ correlationId, spaceId });

        return new Promise<void>((resolve) => {
          memoryClient.listMemoriesKeyset(
            {
              space_id: spaceId,
              limit: req.query.limit ? parseInt(req.query.limit, 10) : 20,
              cursor_time: req.query.cursorTime,
              cursor_id: req.query.cursorId,
              profile_id: req.query.profileId,
              is_favorite: req.query.isFavorite !== undefined ? req.query.isFavorite === "true" : undefined,
            },
            metadata,
            { deadline: createDeadline(3000) },
            (err: grpc.ServiceError | null, response: any) => {
              if (err) {
                const status = grpcStatusToHttpStatus(err.code);
                reply.status(status).send(createErrorResponse("GRPC_UPSTREAM_ERROR", err.message));
                return resolve();
              }

              const items = (response.items || []).map((m: any) => ({
                id: m.id,
                spaceId: m.space_id,
                authorId: m.author_id,
                title: m.title,
                content: m.content || undefined,
                format: m.format,
                capturedAt: m.captured_at,
                location: m.location || undefined,
                isFavorite: m.is_favorite,
                associatedProfileIds: m.associated_profile_ids || [],
                mediaIds: m.media_ids || [],
                tags: m.tags || [],
                createdAt: m.created_at,
                updatedAt: m.updated_at,
              }));

              reply.status(200).send(
                createSuccessResponse(
                  {
                    items,
                    hasMore: response.has_more,
                    nextCursor: response.next_cursor_time ? {
                      cursorTime: response.next_cursor_time,
                      cursorId: response.next_cursor_id,
                    } : null,
                  },
                  correlationId
                )
              );
              resolve();
            }
          );
        });
      }
    );
  }

  // 5. Reverse Proxy Routes for streaming binary media and asynchronous mutations
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
  const server = buildGateway();
  startServiceServer({
    serviceId: "api-gateway",
    app: server,
    logger,
  }).catch((err) => {
    logger.error({ err }, "[Gateway] Unexpected startup failure");
    process.exit(1);
  });
}

