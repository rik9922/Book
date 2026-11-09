import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import cors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import crypto from "node:crypto";
import { promisify } from "node:util";
import { createServiceLogger, Logger } from "@memory-capsule/logger";
import {
  RegisterRequestSchema,
  LoginRequestSchema,
  createSuccessResponse,
  createErrorResponse,
  createDomainEvent,
  UserProfile,
} from "@memory-capsule/contracts";
import { createEventBus, EventBus } from "@memory-capsule/events";
import { createDatabaseClient, DatabaseClient } from "@memory-capsule/database";

const scryptAsync = promisify(crypto.scrypt);
const logger: Logger = createServiceLogger("identity-service");

// Hash password with salt using native Node crypto scrypt
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function verifyPassword(password: string, combinedHash: string): Promise<boolean> {
  const [salt, key] = combinedHash.split(":");
  if (!salt || !key) return false;
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return crypto.timingSafeEqual(Buffer.from(key, "hex"), derivedKey);
}

export async function buildIdentityService(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  const db: DatabaseClient = createDatabaseClient(process.env.IDENTITY_DATABASE_URL);
  const eventBus: EventBus = await createEventBus();

  // In-memory identity registry for standalone/test execution
  const userStore = new Map<string, { id: string; email: string; fullName: string; passwordHash: string; createdAt: string; updatedAt: string }>();

  await app.register(cors, { origin: true, credentials: true });
  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || "dev-jwt-insecure-secret-change-in-production-min32chars",
  });

  // Health check
  app.get("/health", async (req, reply) => {
    const isDbHealthy = await db.healthCheck();
    return reply.status(200).send(
      createSuccessResponse({
        service: "identity-service",
        status: isDbHealthy ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
      })
    );
  });

  // Register
  app.post("/api/v1/auth/register", async (req: FastifyRequest, reply: FastifyReply) => {
    const parseResult = RegisterRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send(
        createErrorResponse("VALIDATION_ERROR", "Invalid registration payload", "corr", parseResult.error.issues)
      );
    }

    const { email, password, fullName } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check existing
    for (const u of userStore.values()) {
      if (u.email === normalizedEmail) {
        return reply.status(409).send(createErrorResponse("USER_EXISTS", "User already registered with this email"));
      }
    }

    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();

    const newUser = {
      id: userId,
      email: normalizedEmail,
      fullName,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    };

    userStore.set(userId, newUser);

    // Publish user.registered domain event
    await eventBus.publish(
      "identity.user.registered",
      createDomainEvent("user.registered", "identity-service", {
        userId,
        email: normalizedEmail,
        fullName,
      })
    );

    const token = app.jwt.sign({ sub: userId, email: normalizedEmail }, { expiresIn: "7d" });

    const userProfile: UserProfile = {
      id: userId,
      email: normalizedEmail,
      fullName,
      createdAt: now,
      updatedAt: now,
    };

    return reply.status(201).send(
      createSuccessResponse({
        user: userProfile,
        accessToken: token,
        refreshToken: crypto.randomUUID(),
        expiresIn: 604800,
      })
    );
  });

  // Login
  app.post("/api/v1/auth/login", async (req: FastifyRequest, reply: FastifyReply) => {
    const parseResult = LoginRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send(createErrorResponse("VALIDATION_ERROR", "Invalid login payload"));
    }

    const { email, password } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    let matchedUser: any = null;
    for (const u of userStore.values()) {
      if (u.email === normalizedEmail) {
        matchedUser = u;
        break;
      }
    }

    if (!matchedUser) {
      return reply.status(401).send(createErrorResponse("INVALID_CREDENTIALS", "Email or password incorrect"));
    }

    const isValid = await verifyPassword(password, matchedUser.passwordHash);
    if (!isValid) {
      return reply.status(401).send(createErrorResponse("INVALID_CREDENTIALS", "Email or password incorrect"));
    }

    const token = app.jwt.sign({ sub: matchedUser.id, email: matchedUser.email }, { expiresIn: "7d" });

    const userProfile: UserProfile = {
      id: matchedUser.id,
      email: matchedUser.email,
      fullName: matchedUser.fullName,
      createdAt: matchedUser.createdAt,
      updatedAt: matchedUser.updatedAt,
    };

    return reply.status(200).send(
      createSuccessResponse({
        user: userProfile,
        accessToken: token,
        refreshToken: crypto.randomUUID(),
        expiresIn: 604800,
      })
    );
  });

  // Current User profile
  app.get("/api/v1/auth/me", async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const payload: any = await req.jwtVerify();
      const user = userStore.get(payload.sub);
      if (!user) {
        return reply.status(404).send(createErrorResponse("USER_NOT_FOUND", "Profile could not be resolved"));
      }

      return reply.status(200).send(
        createSuccessResponse({
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        })
      );
    } catch {
      return reply.status(401).send(createErrorResponse("UNAUTHORIZED", "Missing or invalid token"));
    }
  });

  return app;
}

if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT_IDENTITY || 4001);
  const host = "0.0.0.0";

  buildIdentityService().then((app) => {
    app.listen({ port, host }, (err, address) => {
      if (err) {
        logger.error({ err }, "[IdentityService] Failed to start");
        process.exit(1);
      }
      logger.info({ address, port }, `[IdentityService] Listening at ${address}`);
    });
  });
}
