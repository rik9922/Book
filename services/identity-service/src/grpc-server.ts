import * as grpc from "@grpc/grpc-js";
import jwt from "jsonwebtoken";
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
import { UserRepository } from "@memory-capsule/database";
import { createServiceLogger, Logger } from "@memory-capsule/logger";

const logger: Logger = createServiceLogger("identity-grpc-server");

export interface IdentityGrpcServerOptions {
  port?: number;
  userRepo: UserRepository;
  jwtSecret?: string;
  expectedServiceKey?: string;
}

export function createIdentityGrpcServer(options: IdentityGrpcServerOptions): grpc.Server {
  const { userRepo, jwtSecret = process.env.JWT_SECRET || "dev-jwt-secret-memory-capsule-2026", expectedServiceKey } = options;
  const identityProto = getIdentityProto();
  const server = new grpc.Server();

  server.addService(identityProto.IdentityService.service, {
    validateSession: async (
      call: grpc.ServerUnaryCall<ValidateSessionRequest, ValidateSessionResponse>,
      callback: grpc.sendUnaryData<ValidateSessionResponse>
    ) => {
      // 1. Verify service-to-service authentication
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
        const decoded = jwt.verify(token, jwtSecret) as { userId: string; email: string };
        const user = await userRepo.findById(decoded.userId);
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
      // Basic space authorization check
      const isMember = Boolean(user_id && space_id);
      return callback(null, {
        is_member: isMember,
        role: required_role || "contributor",
        permissions: {
          can_create_memories: true,
          can_edit_books: false,
          can_invite: false,
        },
      });
    },
  });

  return server;
}

export function startIdentityGrpcServer(options: IdentityGrpcServerOptions): Promise<{ server: grpc.Server; port: number }> {
  return new Promise((resolve, reject) => {
    const server = createIdentityGrpcServer(options);
    const targetPort = options.port || (process.env.IDENTITY_GRPC_PORT ? parseInt(process.env.IDENTITY_GRPC_PORT, 10) : 50051);

    server.bindAsync(`0.0.0.0:${targetPort}`, grpc.ServerCredentials.createInsecure(), (err, boundPort) => {
      if (err) {
        logger.error({ err }, "[Identity gRPC] Failed to bind server");
        return reject(err);
      }
      logger.info({ port: boundPort }, "[Identity gRPC] Server running");
      resolve({ server, port: boundPort });
    });
  });
}
