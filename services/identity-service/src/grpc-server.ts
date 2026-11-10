import * as grpc from "@grpc/grpc-js";
import jwt from "jsonwebtoken";
import { z } from "zod";
import {
  getIdentityProto,
  verifyServiceAuth,
  ValidateSessionRequest,
  ValidateSessionResponse,
  GetUserRequest,
  GetUserResponse,
  CheckMembershipRequest,
  CheckMembershipResponse,
} from "@memory-capsule/proto";
import {
  BaseServiceConfigSchema,
  validateServiceConfig,
} from "@memory-capsule/contracts";
import {
  UserRepository,
  PostgresUserRepository,
  CollaborationRepository,
  PostgresCollaborationRepository,
  SpaceRepository,
  PostgresSpaceRepository,
  createDatabaseClient,
} from "@memory-capsule/database";
import { createServiceLogger, Logger } from "@memory-capsule/logger";

const logger: Logger = createServiceLogger("identity-grpc-server");
const UuidSchema = z.string().uuid();

const ROLE_RANK: Record<string, number> = {
  viewer: 1,
  contributor: 2,
  admin: 3,
  owner: 4,
};

export interface IdentityGrpcServerOptions {
  port?: number;
  userRepo?: UserRepository;
  collabRepo?: CollaborationRepository;
  spaceRepo?: SpaceRepository;
  jwtSecret?: string;
  expectedServiceKey?: string;
}

export function createIdentityGrpcServer(options: IdentityGrpcServerOptions = {}): grpc.Server {
  const cfg = validateServiceConfig(BaseServiceConfigSchema);
  const identityDbUrl = cfg.IDENTITY_DATABASE_URL || cfg.DATABASE_URL;
  const userRepo =
    options.userRepo ||
    new PostgresUserRepository(createDatabaseClient(identityDbUrl));

  const collabDbUrl = cfg.COLLAB_DATABASE_URL;
  const collabRepo =
    options.collabRepo ||
    (collabDbUrl ? new PostgresCollaborationRepository(createDatabaseClient(collabDbUrl)) : null);

  const memoryDbUrl = cfg.MEMORY_DATABASE_URL;
  const spaceRepo =
    options.spaceRepo ||
    (memoryDbUrl ? new PostgresSpaceRepository(createDatabaseClient(memoryDbUrl)) : null);

  const jwtSecret = options.jwtSecret || cfg.JWT_SECRET;
  const expectedServiceKey = options.expectedServiceKey || cfg.INTERNAL_SERVICE_KEY;
  const identityProto = getIdentityProto();
  const server = new grpc.Server();

  server.addService(identityProto.IdentityService.service, {
    validateSession: async (
      call: grpc.ServerUnaryCall<ValidateSessionRequest, ValidateSessionResponse>,
      callback: grpc.sendUnaryData<ValidateSessionResponse>
    ) => {
      if (!verifyServiceAuth(call.metadata, expectedServiceKey)) {
        logger.warn("[Identity gRPC] Unauthorized service call rejected");
        return callback({
          code: grpc.status.UNAUTHENTICATED,
          message: "Unauthorized internal service call",
        });
      }

      const { token } = call.request;
      if (!token) {
        return callback(null, { is_valid: false, error: "Missing token" });
      }

      try {
        const decoded = jwt.verify(token, jwtSecret) as { sub?: string; userId?: string; email?: string };
        const resolvedUserId = decoded.sub || decoded.userId;
        if (!resolvedUserId) {
          return callback(null, { is_valid: false, error: "Invalid token subject" });
        }

        const user = await userRepo.findById(resolvedUserId);
        if (!user) {
          return callback(null, { is_valid: false, error: "User not found" });
        }

        return callback(null, {
          is_valid: true,
          user_id: user.id,
          email: user.email,
          full_name: user.fullName,
          is_verified: user.isVerified,
        });
      } catch (err: any) {
        return callback(null, {
          is_valid: false,
          error: err.message || "Invalid token",
        });
      }
    },

    getUser: async (
      call: grpc.ServerUnaryCall<GetUserRequest, GetUserResponse>,
      callback: grpc.sendUnaryData<GetUserResponse>
    ) => {
      if (!verifyServiceAuth(call.metadata, expectedServiceKey)) {
        return callback({
          code: grpc.status.UNAUTHENTICATED,
          message: "Unauthorized internal service call",
        });
      }

      const { user_id, email } = call.request;
      let user = null;

      if (user_id) {
        user = await userRepo.findById(user_id);
      } else if (email) {
        user = await userRepo.findByEmail(email);
      }

      if (!user) {
        return callback(null, { found: false });
      }

      return callback(null, {
        found: true,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.fullName,
          avatar_url: user.avatarUrl || undefined,
          is_verified: user.isVerified,
          created_at: user.createdAt,
          updated_at: user.updatedAt,
        },
      });
    },

    checkMembership: async (
      call: grpc.ServerUnaryCall<CheckMembershipRequest, CheckMembershipResponse>,
      callback: grpc.sendUnaryData<CheckMembershipResponse>
    ) => {
      if (!verifyServiceAuth(call.metadata, expectedServiceKey)) {
        return callback({
          code: grpc.status.UNAUTHENTICATED,
          message: "Unauthorized internal service call",
        });
      }

      const { user_id, space_id, required_role } = call.request;
      if (!UuidSchema.safeParse(user_id).success || !UuidSchema.safeParse(space_id).success) {
        return callback(null, {
          is_member: false,
          role: "",
          permissions: {
            can_create_memories: false,
            can_edit_books: false,
            can_invite: false,
          },
        });
      }

      try {
        // 1. Check authoritative space_members table in collab_db
        if (collabRepo) {
          const member = await collabRepo.getMember(space_id, user_id);
          if (member) {
            const meetsRequiredRole =
              !required_role ||
              (ROLE_RANK[member.role] || 0) >= (ROLE_RANK[required_role] || 0);
            const perms =
              typeof member.permissions === "string"
                ? JSON.parse(member.permissions)
                : member.permissions || {};

            return callback(null, {
              is_member: meetsRequiredRole,
              role: member.role,
              permissions: {
                can_create_memories: Boolean(perms.can_create_memories ?? member.role !== "viewer"),
                can_edit_books: Boolean(perms.can_edit_books ?? (member.role === "owner" || member.role === "admin")),
                can_invite: Boolean(perms.can_invite ?? (member.role === "owner" || member.role === "admin")),
              },
            });
          }
        }

        // 2. Fallback: verify space ownership in memory_spaces (for newly created spaces)
        if (spaceRepo) {
          const space = await spaceRepo.findSpaceById(space_id);
          if (space && space.ownerId === user_id) {
            return callback(null, {
              is_member: true,
              role: "owner",
              permissions: {
                can_create_memories: true,
                can_edit_books: true,
                can_invite: true,
              },
            });
          }
        }

        return callback(null, {
          is_member: false,
          role: "",
          permissions: {
            can_create_memories: false,
            can_edit_books: false,
            can_invite: false,
          },
        });
      } catch (err: any) {
        logger.error({ err, user_id, space_id }, "[Identity gRPC] Failed membership verification");
        return callback({
          code: grpc.status.INTERNAL,
          message: "Failed to verify space membership",
        });
      }
    },
  });

  return server;
}

export function startIdentityGrpcServer(
  options: IdentityGrpcServerOptions = {}
): Promise<{ server: grpc.Server; port: number }> {
  return new Promise((resolve, reject) => {
    const server = createIdentityGrpcServer(options);
    const targetPort =
      options.port ||
      (process.env.IDENTITY_GRPC_PORT ? parseInt(process.env.IDENTITY_GRPC_PORT, 10) : 50051);

    server.bindAsync(
      `0.0.0.0:${targetPort}`,
      grpc.ServerCredentials.createInsecure(),
      (err, boundPort) => {
        if (err) {
          logger.error({ err }, "[Identity gRPC] Failed to bind server");
          return reject(err);
        }
        logger.info({ port: boundPort }, "[Identity gRPC] Server running");
        resolve({ server, port: boundPort });
      }
    );
  });
}
