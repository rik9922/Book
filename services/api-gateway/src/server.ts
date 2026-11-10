import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import httpProxy from "@fastify/http-proxy";
import crypto from "node:crypto";
import { createServiceLogger, Logger } from "@memory-capsule/logger";
import {
  BaseServiceConfigSchema,
  validateServiceConfig,
  createFastifyErrorHandler,
  createSuccessResponse,
  createErrorResponse,
  startServiceServer,
} from "@memory-capsule/contracts";
import {
  createIdentityClient,
  createMemoryClient,
  createClientMetadata,
  createDeadline,
  grpcStatusToHttpStatus,
  closeAllGrpcClients,
  grpc,
} from "@memory-capsule/proto";

const logger: Logger = createServiceLogger("api-gateway");

export interface GatewayOptions {
  identityGrpcAddress?: string;
  memoryGrpcAddress?: string;
  enableGrpcRouting?: boolean;
  identityServiceUrl?: string;
  memoryServiceUrl?: string;
  mediaServiceUrl?: string;
  collabServiceUrl?: string;
  bookServiceUrl?: string;
  commerceServiceUrl?: string;
  notificationServiceUrl?: string;
}

export function buildGateway(options?: GatewayOptions): FastifyInstance {
  validateServiceConfig(BaseServiceConfigSchema);
  const app = Fastify({
    logger: false,
    trustProxy: true,
  });
  app.setErrorHandler(createFastifyErrorHandler(logger));

  const identityGrpcAddress =
    options?.identityGrpcAddress || process.env.IDENTITY_GRPC_ADDRESS || "localhost:50051";
  const memoryGrpcAddress =
    options?.memoryGrpcAddress || process.env.MEMORY_GRPC_ADDRESS || "localhost:50052";
  const enableGrpc = options?.enableGrpcRouting ?? process.env.ENABLE_GRPC_GATEWAY !== "false";

  const identityClient = enableGrpc ? createIdentityClient(identityGrpcAddress) : null;
  const memoryClient = enableGrpc ? createMemoryClient(memoryGrpcAddress) : null;

  app.addHook("onClose", async () => {
    closeAllGrpcClients();
  });

  // 1. Correlation ID Middleware
  app.addHook("onRequest", async (req: FastifyRequest, reply: FastifyReply) => {
    const correlationId = (req.headers["x-correlation-id"] as string) || `corr-${crypto.randomUUID()}`;
    req.headers["x-correlation-id"] = correlationId;
    reply.header("x-correlation-id", correlationId);
    logger.info(
      {
        method: req.method,
        url: req.url,
        correlationId,
        ip: req.ip,
      },
      "[Gateway] Inbound Request"
    );
  });

  // 2. Security Plugins
  app.register(cors, {
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  app.register(helmet, {
    contentSecurityPolicy: false,
  });

  app.register(rateLimit, {
    max: 200,
    timeWindow: "1 minute",
  });

  // Helper: validate Bearer JWT via Identity gRPC
  async function authenticateViaIdentityGrpc(
    req: FastifyRequest,
    reply: FastifyReply
  ): Promise<{ userId: string; email: string; fullName: string; isVerified: boolean } | null> {
    if (!identityClient) {
      reply.status(503).send(createErrorResponse("SERVICE_UNAVAILABLE", "Identity gRPC unavailable"));
      return null;
    }
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      reply.status(401).send(createErrorResponse("UNAUTHORIZED", "Missing authorization header"));
      return null;
    }
    const token = authHeader.slice(7);
    const correlationId = req.headers["x-correlation-id"] as string;
    const metadata = createClientMetadata({ correlationId });

    return new Promise((resolve) => {
      identityClient.validateSession(
        { token },
        metadata,
        { deadline: createDeadline(3000) },
        (err: grpc.ServiceError | null, response: any) => {
          if (err) {
            const status = grpcStatusToHttpStatus(err.code);
            reply.status(status).send(createErrorResponse("GRPC_UPSTREAM_ERROR", err.message, correlationId));
            return resolve(null);
          }
          if (!response || !response.is_valid) {
            reply
              .status(401)
              .send(createErrorResponse("UNAUTHORIZED", response?.error || "Invalid session", correlationId));
            return resolve(null);
          }
          resolve({
            userId: response.user_id,
            email: response.email,
            fullName: response.full_name,
            isVerified: Boolean(response.is_verified),
          });
        }
      );
    });
  }

  async function verifySpaceMembershipViaGrpc(
    userId: string,
    spaceId: string,
    correlationId: string
  ): Promise<{ isMember: boolean; errorStatus?: number; errorMessage?: string }> {
    if (!identityClient) {
      return { isMember: false, errorStatus: 503, errorMessage: "Identity gRPC unavailable" };
    }
    const metadata = createClientMetadata({ correlationId, userId, spaceId });
    return new Promise((resolve) => {
      identityClient.checkMembership(
        { user_id: userId, space_id: spaceId, required_role: "viewer" },
        metadata,
        { deadline: createDeadline(3000) },
        (err: grpc.ServiceError | null, response: any) => {
          if (err) {
            return resolve({
              isMember: false,
              errorStatus: grpcStatusToHttpStatus(err.code),
              errorMessage: err.message,
            });
          }
          if (!response?.is_member) {
            return resolve({
              isMember: false,
              errorStatus: 403,
              errorMessage: "Access denied for this memory space",
            });
          }
          resolve({ isMember: true });
        }
      );
    });
  }

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
            collabRest: process.env.COLLAB_SERVICE_URL || "http://localhost:4004",
            bookRest: process.env.BOOK_SERVICE_URL || "http://localhost:4005",
            commerceRest: process.env.COMMERCE_SERVICE_URL || "http://localhost:4007",
            notificationRest: process.env.NOTIFICATION_SERVICE_URL || "http://localhost:4008",
          },
        },
        correlationId
      )
    );
  });

  // 4. Authenticated gRPC Synchronous Routes
  if (enableGrpc && identityClient && memoryClient) {
    // Current user profile via Identity gRPC ValidateSession
    app.get("/api/v1/auth/me", async (req: FastifyRequest, reply: FastifyReply) => {
      const correlationId = req.headers["x-correlation-id"] as string;
      const session = await authenticateViaIdentityGrpc(req, reply);
      if (!session) return;

      return reply.status(200).send(
        createSuccessResponse(
          {
            user: {
              id: session.userId,
              email: session.email,
              fullName: session.fullName,
              isVerified: session.isVerified,
            },
          },
          correlationId
        )
      );
    });

    // Single Memory Lookup via Memory gRPC (Authenticated + Space Membership Checked)
    app.get(
      "/api/v1/memories/:memoryId",
      async (req: FastifyRequest<{ Params: { memoryId: string } }>, reply: FastifyReply) => {
        const correlationId = req.headers["x-correlation-id"] as string;
        const session = await authenticateViaIdentityGrpc(req, reply);
        if (!session) return;

        const { memoryId } = req.params;
        const metadata = createClientMetadata({ correlationId, userId: session.userId });

        const memoryResponse: any = await new Promise((resolve) => {
          memoryClient.getMemory(
            { memory_id: memoryId, space_id: "" },
            metadata,
            { deadline: createDeadline(3000) },
            (err: grpc.ServiceError | null, response: any) => {
              if (err) {
                const status = grpcStatusToHttpStatus(err.code);
                reply.status(status).send(createErrorResponse("GRPC_UPSTREAM_ERROR", err.message, correlationId));
                return resolve(null);
              }
              resolve(response);
            }
          );
        });

        if (!memoryResponse) return;
        if (!memoryResponse.found || !memoryResponse.memory) {
          return reply
            .status(404)
            .send(createErrorResponse("MEMORY_NOT_FOUND", "Memory not found", correlationId));
        }

        const m = memoryResponse.memory;
        const membership = await verifySpaceMembershipViaGrpc(session.userId, m.space_id, correlationId);
        if (!membership.isMember) {
          return reply
            .status(membership.errorStatus || 403)
            .send(createErrorResponse("FORBIDDEN", membership.errorMessage || "Access denied", correlationId));
        }

        return reply.status(200).send(
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
      }
    );

    // Space Memories Timeline Lookup via Memory gRPC (Authenticated + Space Membership Checked)
    app.get(
      "/api/v1/spaces/:spaceId/memories",
      async (
        req: FastifyRequest<{
          Params: { spaceId: string };
          Querystring: {
            limit?: string;
            cursorTime?: string;
            cursorId?: string;
            isFavorite?: string;
            profileId?: string;
          };
        }>,
        reply: FastifyReply
      ) => {
        const correlationId = req.headers["x-correlation-id"] as string;
        const session = await authenticateViaIdentityGrpc(req, reply);
        if (!session) return;

        const { spaceId } = req.params;
        const membership = await verifySpaceMembershipViaGrpc(session.userId, spaceId, correlationId);
        if (!membership.isMember) {
          return reply
            .status(membership.errorStatus || 403)
            .send(createErrorResponse("FORBIDDEN", membership.errorMessage || "Access denied", correlationId));
        }

        const metadata = createClientMetadata({ correlationId, userId: session.userId, spaceId });

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
                reply.status(status).send(createErrorResponse("GRPC_UPSTREAM_ERROR", err.message, correlationId));
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
                    nextCursor: response.next_cursor_time
                      ? {
                          cursorTime: response.next_cursor_time,
                          cursorId: response.next_cursor_id,
                        }
                      : null,
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

  // 5. Reverse Proxy & Cross-Context Space Sub-Resource Routes
  const identityUrl = options?.identityServiceUrl || process.env.IDENTITY_SERVICE_URL || "http://localhost:4001";
  const memoryUrl = options?.memoryServiceUrl || process.env.MEMORY_SERVICE_URL || "http://localhost:4002";
  const mediaUrl = options?.mediaServiceUrl || process.env.MEDIA_SERVICE_URL || "http://localhost:4003";
  const collabUrl = options?.collabServiceUrl || process.env.COLLAB_SERVICE_URL || "http://localhost:4004";
  const bookUrl = options?.bookServiceUrl || process.env.BOOK_SERVICE_URL || "http://localhost:4005";
  const commerceUrl = options?.commerceServiceUrl || process.env.COMMERCE_SERVICE_URL || "http://localhost:4007";
  const notificationUrl = options?.notificationServiceUrl || process.env.NOTIFICATION_SERVICE_URL || "http://localhost:4008";

  async function forwardGetToUpstream(
    req: FastifyRequest,
    reply: FastifyReply,
    upstreamBaseUrl: string
  ) {
    const correlationId = req.headers["x-correlation-id"] as string;
    const headers: Record<string, string> = {};
    if (req.headers.authorization) {
      headers.authorization = req.headers.authorization;
    }
    if (correlationId) {
      headers["x-correlation-id"] = correlationId;
    }
    const target = `${upstreamBaseUrl}${req.url}`;
    const upstreamRes = await fetch(target, { method: req.method, headers });
    const bodyText = await upstreamRes.text();
    const contentType = upstreamRes.headers.get("content-type");
    if (contentType) {
      reply.header("content-type", contentType);
    }
    return reply.status(upstreamRes.status).send(bodyText);
  }

  // Space-scoped sub-resources owned by Book & Media contexts (must precede /api/v1/spaces proxy to memory-service)
  app.get("/api/v1/spaces/:spaceId/books", async (req, reply) => {
    return forwardGetToUpstream(req, reply, bookUrl);
  });

  app.get("/api/v1/spaces/:spaceId/media", async (req, reply) => {
    return forwardGetToUpstream(req, reply, mediaUrl);
  });

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
    upstream: collabUrl,
    prefix: "/api/v1/collab",
    rewritePrefix: "/api/v1/collab",
  });

  app.register(httpProxy, {
    upstream: bookUrl,
    prefix: "/api/v1/books",
    rewritePrefix: "/api/v1/books",
  });

  app.register(httpProxy, {
    upstream: commerceUrl,
    prefix: "/api/v1/orders",
    rewritePrefix: "/api/v1/orders",
  });

  app.register(httpProxy, {
    upstream: notificationUrl,
    prefix: "/api/v1/notifications",
    rewritePrefix: "/api/v1/notifications",
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
