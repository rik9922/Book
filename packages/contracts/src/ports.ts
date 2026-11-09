import { z } from "zod";
import { ConfigurationError } from "./errors.js";

export const PortProtocolSchema = z.enum(["tcp", "udp"]);
export type PortProtocol = z.infer<typeof PortProtocolSchema>;

export const ServiceTypeSchema = z.enum([
  "frontend",
  "gateway",
  "microservice",
  "grpc",
  "database",
  "message-broker",
  "storage",
  "tooling",
]);
export type ServiceType = z.infer<typeof ServiceTypeSchema>;

export const PortDefinitionSchema = z.object({
  serviceId: z.string(),
  serviceName: z.string(),
  port: z.number().int().min(1024).max(65535),
  containerPort: z.number().int().min(1).max(65535).optional(),
  protocol: PortProtocolSchema.default("tcp"),
  host: z.string().default("127.0.0.1"),
  serviceType: ServiceTypeSchema,
  isRequired: z.boolean().default(true),
  allocation: z.enum(["fixed", "dynamic"]).default("fixed"),
  envVar: z.string(),
  description: z.string(),
  healthEndpoint: z.string().optional(),
});

export type PortDefinition = z.infer<typeof PortDefinitionSchema>;

/**
 * Authoritative Centralized Local Development Port Registry for Memoria
 * SINGLE SOURCE OF TRUTH: All services, scripts, and Docker configs derive from here.
 */
export const PORT_REGISTRY: Record<string, PortDefinition> = {
  // 1. User-Facing Frontend & Public Gateway
  "web": {
    serviceId: "web",
    serviceName: "Memoria Web / PWA",
    port: 3000,
    containerPort: 3000,
    protocol: "tcp",
    host: "127.0.0.1",
    serviceType: "frontend",
    isRequired: true,
    allocation: "fixed",
    envVar: "PORT_WEB",
    description: "Next.js 16 PWA and Three.js 3D Book Viewer",
    healthEndpoint: "http://127.0.0.1:3000",
  },
  "api-gateway": {
    serviceId: "api-gateway",
    serviceName: "Memoria API Gateway",
    port: 4000,
    containerPort: 4000,
    protocol: "tcp",
    host: "0.0.0.0",
    serviceType: "gateway",
    isRequired: true,
    allocation: "fixed",
    envVar: "PORT_GATEWAY",
    description: "Fastify public REST API Gateway & gRPC translator",
    healthEndpoint: "http://127.0.0.1:4000/health",
  },

  // 2. Core Fastify Microservices (Public REST / Reverse Proxy)
  "identity-service": {
    serviceId: "identity-service",
    serviceName: "Identity Service",
    port: 4001,
    containerPort: 4001,
    protocol: "tcp",
    host: "127.0.0.1",
    serviceType: "microservice",
    isRequired: true,
    allocation: "fixed",
    envVar: "PORT_IDENTITY",
    description: "Authentication, user profiles, credentials & JWT sessions",
    healthEndpoint: "http://127.0.0.1:4001/api/v1/auth/me",
  },
  "memory-service": {
    serviceId: "memory-service",
    serviceName: "Memory Service",
    port: 4002,
    containerPort: 4002,
    protocol: "tcp",
    host: "127.0.0.1",
    serviceType: "microservice",
    isRequired: true,
    allocation: "fixed",
    envVar: "PORT_MEMORY",
    description: "Memory spaces, stories, timeline, tags & profiles",
    healthEndpoint: "http://127.0.0.1:4002/api/v1/spaces",
  },
  "media-service": {
    serviceId: "media-service",
    serviceName: "Media Service",
    port: 4003,
    containerPort: 4003,
    protocol: "tcp",
    host: "127.0.0.1",
    serviceType: "microservice",
    isRequired: true,
    allocation: "fixed",
    envVar: "PORT_MEDIA",
    description: "Media uploads, sharp derivatives & local disk storage",
    healthEndpoint: "http://127.0.0.1:4003/api/v1/media",
  },
  "collab-service": {
    serviceId: "collab-service",
    serviceName: "Collaboration Service",
    port: 4004,
    containerPort: 4004,
    protocol: "tcp",
    host: "127.0.0.1",
    serviceType: "microservice",
    isRequired: false,
    allocation: "fixed",
    envVar: "PORT_COLLABORATION",
    description: "Family member invitations, permissions & comments",
  },
  "book-service": {
    serviceId: "book-service",
    serviceName: "Book Studio Service",
    port: 4005,
    containerPort: 4005,
    protocol: "tcp",
    host: "127.0.0.1",
    serviceType: "microservice",
    isRequired: true,
    allocation: "fixed",
    envVar: "PORT_BOOK",
    description: "Book editor, chapters, page layouts & digital edition freeze",
    healthEndpoint: "http://127.0.0.1:4005/api/v1/books",
  },
  "commerce-service": {
    serviceId: "commerce-service",
    serviceName: "Commerce & Print Service",
    port: 4007,
    containerPort: 4007,
    protocol: "tcp",
    host: "127.0.0.1",
    serviceType: "microservice",
    isRequired: false,
    allocation: "fixed",
    envVar: "PORT_COMMERCE",
    description: "Print book orders, fulfillment states & shipping",
  },
  "notification-service": {
    serviceId: "notification-service",
    serviceName: "Notification Service",
    port: 4008,
    containerPort: 4008,
    protocol: "tcp",
    host: "127.0.0.1",
    serviceType: "microservice",
    isRequired: false,
    allocation: "fixed",
    envVar: "PORT_NOTIFICATION",
    description: "Real-time user notices, invite alerts & processing updates",
  },

  // 3. Internal Synchronous gRPC Services (HTTP/2 Protocol Buffers)
  "identity-grpc": {
    serviceId: "identity-grpc",
    serviceName: "Identity Service (gRPC)",
    port: 50051,
    containerPort: 50051,
    protocol: "tcp",
    host: "127.0.0.1",
    serviceType: "grpc",
    isRequired: true,
    allocation: "fixed",
    envVar: "IDENTITY_GRPC_PORT",
    description: "Internal high-speed token validation & session resolution",
  },
  "memory-grpc": {
    serviceId: "memory-grpc",
    serviceName: "Memory Service (gRPC)",
    port: 50052,
    containerPort: 50052,
    protocol: "tcp",
    host: "127.0.0.1",
    serviceType: "grpc",
    isRequired: true,
    allocation: "fixed",
    envVar: "MEMORY_GRPC_PORT",
    description: "Internal high-speed memory querying & space retrieval",
  },

  // 4. Infrastructure Services (PostgreSQL, Redis, NATS, MinIO)
  "postgres": {
    serviceId: "postgres",
    serviceName: "PostgreSQL Database",
    port: 5432,
    containerPort: 5432,
    protocol: "tcp",
    host: "127.0.0.1",
    serviceType: "database",
    isRequired: true,
    allocation: "fixed",
    envVar: "DB_PORT",
    description: "Primary relational database cluster for all microservices",
  },
  "redis": {
    serviceId: "redis",
    serviceName: "Redis & BullMQ",
    port: 6379,
    containerPort: 6379,
    protocol: "tcp",
    host: "127.0.0.1",
    serviceType: "database",
    isRequired: true,
    allocation: "fixed",
    envVar: "REDIS_PORT",
    description: "In-memory cache and BullMQ background job queues",
  },
  "nats": {
    serviceId: "nats",
    serviceName: "NATS JetStream (Client)",
    port: 4222,
    containerPort: 4222,
    protocol: "tcp",
    host: "127.0.0.1",
    serviceType: "message-broker",
    isRequired: true,
    allocation: "fixed",
    envVar: "NATS_PORT",
    description: "Asynchronous domain event streaming bus",
  },
  "nats-monitor": {
    serviceId: "nats-monitor",
    serviceName: "NATS HTTP Monitoring",
    port: 8222,
    containerPort: 8222,
    protocol: "tcp",
    host: "127.0.0.1",
    serviceType: "message-broker",
    isRequired: false,
    allocation: "fixed",
    envVar: "NATS_MONITOR_PORT",
    description: "NATS web monitoring dashboard & varz endpoint",
    healthEndpoint: "http://127.0.0.1:8222/varz",
  },
  "minio-api": {
    serviceId: "minio-api",
    serviceName: "MinIO S3 API (Optional)",
    port: 9000,
    containerPort: 9000,
    protocol: "tcp",
    host: "127.0.0.1",
    serviceType: "storage",
    isRequired: false,
    allocation: "fixed",
    envVar: "S3_PORT",
    description: "Optional local S3-compatible object storage API",
  },
  "minio-console": {
    serviceId: "minio-console",
    serviceName: "MinIO Web Console",
    port: 9001,
    containerPort: 9001,
    protocol: "tcp",
    host: "127.0.0.1",
    serviceType: "storage",
    isRequired: false,
    allocation: "fixed",
    envVar: "MINIO_CONSOLE_PORT",
    description: "Web management interface for MinIO buckets",
  },
  "pgadmin": {
    serviceId: "pgadmin",
    serviceName: "pgAdmin 4 (Desktop/Web)",
    port: 5050,
    protocol: "tcp",
    host: "127.0.0.1",
    serviceType: "tooling",
    isRequired: false,
    allocation: "fixed",
    envVar: "PGADMIN_PORT",
    description: "PostgreSQL visual database administration tool",
  },
};

/**
 * Validates the entire Port Registry for duplicate assignments, valid port numbers, and schema compliance.
 * Throws ConfigurationError if any anomaly is found.
 */
export function validatePortRegistry(registry: Record<string, PortDefinition> = PORT_REGISTRY): void {
  const seenPorts = new Map<number, string>();

  for (const [key, def] of Object.entries(registry)) {
    // Validate schema
    const parseResult = PortDefinitionSchema.safeParse(def);
    if (!parseResult.success) {
      throw new ConfigurationError(
        `Invalid port definition for '${key}': ${parseResult.error.message}`,
        { issues: parseResult.error.issues }
      );
    }

    // Check for collisions across host ports
    if (seenPorts.has(def.port)) {
      const conflictingService = seenPorts.get(def.port);
      throw new ConfigurationError(
        `Port Collision Detected: Port ${def.port} is claimed by both '${conflictingService}' and '${def.serviceId}'`,
        { port: def.port, services: [conflictingService, def.serviceId] }
      );
    }

    seenPorts.set(def.port, def.serviceId);
  }
}

/**
 * Resolves the effective port for a service, giving precedence to an environment override if present and valid.
 */
export function resolveServicePort(serviceId: string, env: NodeJS.ProcessEnv = process.env): number {
  const def = PORT_REGISTRY[serviceId];
  if (!def) {
    throw new ConfigurationError(`Unknown serviceId '${serviceId}' requested for port resolution.`);
  }

  const envValue = env[def.envVar];
  if (envValue) {
    const parsed = parseInt(envValue, 10);
    if (isNaN(parsed) || parsed < 1024 || parsed > 65535) {
      throw new ConfigurationError(
        `Invalid environment port override for '${def.envVar}': got '${envValue}', must be an integer between 1024 and 65535`
      );
    }
    return parsed;
  }

  return def.port;
}

/**
 * Returns all registered port definitions as an array
 */
export function getAllRegisteredPorts(): PortDefinition[] {
  return Object.values(PORT_REGISTRY);
}

