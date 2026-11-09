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
import {
  createDatabaseClient,
  DatabaseClient,
  PostgresUserRepository,
  UserRepository,
  UserRecord,
} from "@memory-capsule/database";

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

// In-memory fallback repository when running in isolated unit test without database
class InMemoryUserTestRepository implements UserRepository {
  private users = new Map<string, UserRecord>();
  private sessions = new Map<string, any>();

  async findByEmail(email: string): Promise<UserRecord | null> {
    for (const u of this.users.values()) {
      if (u.email === email.toLowerCase().trim()) return u;
    }
    return null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    return this.users.get(id) || null;
  }

  async create(user: Omit<UserRecord, "createdAt" | "updatedAt">): Promise<UserRecord> {
    const now = new Date().toISOString();
    const record: UserRecord = { ...user, createdAt: now, updatedAt: now };
    this.users.set(user.id, record);
    return record;
  }

  async createSession(session: any): Promise<void> {
    this.sessions.set(session.id, session);
  }

  async findSessionByToken(hash: string): Promise<any | null> {
    for (const s of this.sessions.values()) {
      if (s.refreshTokenHash === hash) return s;
    }
    return null;
  }

  async deleteSession(id: string): Promise<void> {
    this.sessions.delete(id);
  }
}

export async function buildIdentityService(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  const dbUrl = process.env.IDENTITY_DATABASE_URL || process.env.DATABASE_URL;
  const db: DatabaseClient = createDatabaseClient(dbUrl);
  const eventBus: EventBus = await createEventBus();

  // Use persistent PostgreSQL repository if database is configured, else test repository
  const userRepo: UserRepository = dbUrl
    ? new PostgresUserRepository(db)
    : new InMemoryUserTestRepository();

  const allowedOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:4000",
    "http://127.0.0.1:4000",
  ];

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith("http://localhost:")) {
        cb(null, true);
        return;
      }
      cb(new Error("CORS origin not allowed"), false);
    },
    credentials: true,
  });

  const jwtSecret = process.env.JWT_SECRET || "dev-jwt-insecure-secret-change-in-production-min32chars";
  if (process.env.NODE_ENV === "production" && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
    throw new Error("[IdentityService] FATAL: JWT_SECRET must have at least 32 characters in production");
  }

  await app.register(fastifyJwt, { secret: jwtSecret });

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
    const existing = await userRepo.findByEmail(normalizedEmail);
    if (existing) {
      return reply.status(409).send(createErrorResponse("USER_EXISTS", "User already registered with this email"));
    }

    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(password);

    const newUser = await userRepo.create({
      id: userId,
      email: normalizedEmail,
      fullName,
      passwordHash,
      isVerified: false,
    });

    // Create session
    const refreshToken = crypto.randomUUID();
    const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await userRepo.createSession({
      id: crypto.randomUUID(),
      userId,
      refreshTokenHash,
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
      expiresAt,
      createdAt: new Date().toISOString(),
    });

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
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    };

    return reply.status(201).send(
      createSuccessResponse({
        user: userProfile,
        accessToken: token,
        refreshToken,
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

    const user = await userRepo.findByEmail(normalizedEmail);
    if (!user) {
      return reply.status(401).send(createErrorResponse("INVALID_CREDENTIALS", "Email or password incorrect"));
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return reply.status(401).send(createErrorResponse("INVALID_CREDENTIALS", "Email or password incorrect"));
    }

    const token = app.jwt.sign({ sub: user.id, email: user.email }, { expiresIn: "7d" });
    const refreshToken = crypto.randomUUID();
    const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await userRepo.createSession({
      id: crypto.randomUUID(),
      userId: user.id,
      refreshTokenHash,
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
      expiresAt,
      createdAt: new Date().toISOString(),
    });

    const userProfile: UserProfile = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return reply.status(200).send(
      createSuccessResponse({
        user: userProfile,
        accessToken: token,
        refreshToken,
        expiresIn: 604800,
      })
    );
  });

  // Current User profile
  app.get("/api/v1/auth/me", async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const payload: any = await req.jwtVerify();
      const user = await userRepo.findById(payload.sub);
      if (!user) {
        return reply.status(404).send(createErrorResponse("USER_NOT_FOUND", "Profile could not be resolved"));
      }

      const userProfile: UserProfile = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      return reply.status(200).send(createSuccessResponse({ user: userProfile }));
    } catch {
      return reply.status(401).send(createErrorResponse("UNAUTHORIZED", "Missing or invalid session credentials"));
    }
  });

  return app;
}
