import * as grpc from "@grpc/grpc-js";
import crypto from "node:crypto";
import {
  getMemoryProto,
  verifyServiceAuth,
  GetMemoryRequest,
  GetMemoryResponse,
  ListMemoriesKeysetRequest,
  ListMemoriesKeysetResponse,
  CreateMemoryRequest,
  CreateMemoryResponse,
  SearchMemoriesRequest,
  SearchMemoriesResponse,
  MemoryMessage,
} from "@memory-capsule/proto";
import { MemoryRepository } from "@memory-capsule/database";
import { Memory } from "@memory-capsule/contracts";
import { createServiceLogger, Logger } from "@memory-capsule/logger";

const logger: Logger = createServiceLogger("memory-grpc-server");

export interface MemoryGrpcServerOptions {
  port?: number;
  memoryRepo: MemoryRepository;
  expectedServiceKey?: string;
}

function mapDomainMemoryToProto(m: Memory): MemoryMessage {
  return {
    id: m.id,
    space_id: m.spaceId,
    author_id: m.authorId,
    title: m.title,
    content: m.content || undefined,
    format: m.format,
    captured_at: m.capturedAt,
    location: m.location || undefined,
    is_favorite: m.isFavorite ?? false,
    associated_profile_ids: m.associatedProfileIds || [],
    media_ids: m.mediaIds || [],
    tags: m.tags || [],
    created_at: m.createdAt,
    updated_at: m.updatedAt,
  };
}

export function createMemoryGrpcServer(options: MemoryGrpcServerOptions): grpc.Server {
  const { memoryRepo, expectedServiceKey } = options;
  const memoryProto = getMemoryProto();
  const server = new grpc.Server();

  server.addService(memoryProto.MemoryService.service, {
    getMemory: async (
      call: grpc.ServerUnaryCall<GetMemoryRequest, GetMemoryResponse>,
      callback: grpc.sendUnaryData<GetMemoryResponse>
    ) => {
      if (!verifyServiceAuth(call.metadata, expectedServiceKey)) {
        logger.warn("[Memory gRPC] Unauthorized service call rejected");
        return callback({
          code: grpc.status.UNAUTHENTICATED,
          message: "Unauthorized internal service call",
        });
      }

      const { memory_id } = call.request;
      if (!memory_id) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: "Missing memory_id parameter",
        });
      }

      try {
        const memory = await memoryRepo.findMemoryById(memory_id);
        if (!memory) {
          return callback(null, { found: false });
        }
        return callback(null, { found: true, memory: mapDomainMemoryToProto(memory) });
      } catch (err: any) {
        logger.error({ err }, "[Memory gRPC] Error finding memory");
        return callback({
          code: grpc.status.INTERNAL,
          message: err.message || "Internal database error",
        });
      }
    },

    listMemoriesKeyset: async (
      call: grpc.ServerUnaryCall<ListMemoriesKeysetRequest, ListMemoriesKeysetResponse>,
      callback: grpc.sendUnaryData<ListMemoriesKeysetResponse>
    ) => {
      if (!verifyServiceAuth(call.metadata, expectedServiceKey)) {
        return callback({
          code: grpc.status.UNAUTHENTICATED,
          message: "Unauthorized internal service call",
        });
      }

      const { space_id, limit, cursor_time, cursor_id, profile_id, is_favorite } = call.request;
      if (!space_id) {
        return callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: "Missing space_id parameter",
        });
      }

      try {
        const res = await memoryRepo.listMemoriesKeyset(space_id, {
          limit: limit || 20,
          cursorTime: cursor_time || undefined,
          cursorId: cursor_id || undefined,
          profileId: profile_id || undefined,
          isFavorite: is_favorite !== undefined ? is_favorite : undefined,
        });

        return callback(null, {
          items: res.items.map(mapDomainMemoryToProto),
          has_more: res.hasMore,
          next_cursor_time: res.nextCursor?.cursorTime || undefined,
          next_cursor_id: res.nextCursor?.cursorId || undefined,
        });
      } catch (err: any) {
        logger.error({ err }, "[Memory gRPC] Error listing memories");
        return callback({
          code: grpc.status.INTERNAL,
          message: err.message || "Failed to list memories",
        });
      }
    },

    createMemory: async (
      call: grpc.ServerUnaryCall<CreateMemoryRequest, CreateMemoryResponse>,
      callback: grpc.sendUnaryData<CreateMemoryResponse>
    ) => {
      if (!verifyServiceAuth(call.metadata, expectedServiceKey)) {
        return callback({
          code: grpc.status.UNAUTHENTICATED,
          message: "Unauthorized internal service call",
        });
      }

      const req = call.request;
      const now = new Date().toISOString();
      const domainMemory: Memory = {
        id: req.id || crypto.randomUUID(),
        spaceId: req.space_id,
        authorId: req.author_id,
        title: req.title,
        content: req.content || undefined,
        format: (req.format as any) || "image",
        capturedAt: req.captured_at || now,
        location: req.location || undefined,
        isFavorite: req.is_favorite ?? false,
        associatedProfileIds: req.associated_profile_ids || [],
        mediaIds: req.media_ids || [],
        tags: req.tags || [],
        createdAt: now,
        updatedAt: now,
      };

      try {
        const created = await memoryRepo.createMemory(domainMemory);
        return callback(null, {
          success: true,
          memory: mapDomainMemoryToProto(created),
        });
      } catch (err: any) {
        logger.error({ err }, "[Memory gRPC] Error creating memory");
        return callback(null, {
          success: false,
          error: err.message || "Failed to create memory",
        });
      }
    },

    searchMemories: async (
      call: grpc.ServerUnaryCall<SearchMemoriesRequest, SearchMemoriesResponse>,
      callback: grpc.sendUnaryData<SearchMemoriesResponse>
    ) => {
      if (!verifyServiceAuth(call.metadata, expectedServiceKey)) {
        return callback({
          code: grpc.status.UNAUTHENTICATED,
          message: "Unauthorized internal service call",
        });
      }

      const { space_id, query, limit } = call.request;
      if (!space_id || !query) {
        return callback(null, { items: [], match_count: 0 });
      }

      try {
        const matches = await memoryRepo.searchMemories(space_id, query, limit || 20);
        return callback(null, {
          items: matches.map(mapDomainMemoryToProto),
          match_count: matches.length,
        });
      } catch (err: any) {
        logger.error({ err }, "[Memory gRPC] Error searching memories");
        return callback({
          code: grpc.status.INTERNAL,
          message: err.message || "Search failed",
        });
      }
    },
  });

  return server;
}

export function startMemoryGrpcServer(options: MemoryGrpcServerOptions): Promise<{ server: grpc.Server; port: number }> {
  return new Promise((resolve, reject) => {
    const server = createMemoryGrpcServer(options);
    const targetPort = options.port || (process.env.MEMORY_GRPC_PORT ? parseInt(process.env.MEMORY_GRPC_PORT, 10) : 50052);

    server.bindAsync(`0.0.0.0:${targetPort}`, grpc.ServerCredentials.createInsecure(), (err, boundPort) => {
      if (err) {
        logger.error({ err }, "[Memory gRPC] Failed to bind server");
        return reject(err);
      }
      logger.info({ port: boundPort }, "[Memory gRPC] Server running");
      resolve({ server, port: boundPort });
    });
  });
}
