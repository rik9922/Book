import {
  Metadata,
  status as GrpcStatus,
  ServiceError,
  ChannelCredentials,
  credentials,
  Client,
} from "@grpc/grpc-js";

export const SERVICE_AUTH_HEADER = "x-service-auth";
export const CORRELATION_ID_HEADER = "x-correlation-id";
export const USER_ID_HEADER = "x-user-id";
export const SPACE_ID_HEADER = "x-space-id";

// Internal service secret used for service-to-service authentication
export const DEFAULT_INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || "memory-capsule-internal-service-secret-2026";

export interface RequestContextMetadata {
  serviceToken?: string;
  correlationId?: string;
  userId?: string;
  spaceId?: string;
}

/**
 * Creates gRPC Metadata populated with service auth and tracing context
 */
export function createClientMetadata(ctx?: RequestContextMetadata): Metadata {
  const meta = new Metadata();
  const token = ctx?.serviceToken || process.env.INTERNAL_SERVICE_KEY || DEFAULT_INTERNAL_SERVICE_KEY;
  meta.set(SERVICE_AUTH_HEADER, token);

  if (ctx?.correlationId) {
    meta.set(CORRELATION_ID_HEADER, ctx.correlationId);
  }
  if (ctx?.userId) {
    meta.set(USER_ID_HEADER, ctx.userId);
  }
  if (ctx?.spaceId) {
    meta.set(SPACE_ID_HEADER, ctx.spaceId);
  }

  return meta;
}

/**
 * Verifies that an incoming gRPC call has valid internal service authorization
 */
export function verifyServiceAuth(metadata: Metadata, expectedKey?: string): boolean {
  const headerVal = metadata.get(SERVICE_AUTH_HEADER)[0];
  if (!headerVal) return false;
  const token = String(headerVal);
  const validKey = expectedKey || process.env.INTERNAL_SERVICE_KEY || DEFAULT_INTERNAL_SERVICE_KEY;
  return token === validKey;
}

/**
 * Calculates a deadline timestamp for gRPC calls
 */
export function createDeadline(timeoutMs = 3000): Date {
  return new Date(Date.now() + timeoutMs);
}

/**
 * Maps gRPC status codes to standard HTTP status codes for Gateway translation
 */
export function grpcStatusToHttpStatus(code: GrpcStatus): number {
  switch (code) {
    case GrpcStatus.OK:
      return 200;
    case GrpcStatus.INVALID_ARGUMENT:
      return 400;
    case GrpcStatus.UNAUTHENTICATED:
      return 401;
    case GrpcStatus.PERMISSION_DENIED:
      return 403;
    case GrpcStatus.NOT_FOUND:
      return 404;
    case GrpcStatus.ALREADY_EXISTS:
      return 409;
    case GrpcStatus.RESOURCE_EXHAUSTED:
      return 429;
    case GrpcStatus.DEADLINE_EXCEEDED:
      return 504;
    case GrpcStatus.UNAVAILABLE:
      return 503;
    case GrpcStatus.UNIMPLEMENTED:
      return 501;
    default:
      return 500;
  }
}

/**
 * Channel & Client reuse registry to prevent channel churn and socket exhaustion
 */
const clientRegistry = new Map<string, Client>();

export function getOrCreateGrpcClient<T extends Client>(
  serviceKey: string,
  clientFactory: (creds: ChannelCredentials) => T
): T {
  if (clientRegistry.has(serviceKey)) {
    return clientRegistry.get(serviceKey) as T;
  }
  const creds = credentials.createInsecure();
  const client = clientFactory(creds);
  clientRegistry.set(serviceKey, client);
  return client;
}

export function closeAllGrpcClients(): void {
  for (const client of clientRegistry.values()) {
    try {
      client.close();
    } catch {
      // Ignored on teardown
    }
  }
  clientRegistry.clear();
}
