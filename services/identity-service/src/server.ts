import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import cors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import crypto from "node:crypto";
import { promisify } from "node:util";
import { createServiceLogger, Logger } from "@memory-capsule/logger";
import {
  BaseServiceConfigSchema,
  validateServiceConfig,
  createFastifyErrorHandler,
  RegisterRequestSchema,
  LoginRequestSchema,
  RefreshTokenRequestSchema,
  ForgotPasswordRequestSchema,
  ResetPasswordRequestSchema,
  VerifyEmailRequestSchema,
  createSuccessResponse,
  createErrorResponse,
  createDomainEvent,
  UserProfile,
  startServiceServer,
} from "@memory-capsule/contracts";
import { startIdentityGrpcServer } from "./grpc-server.js";
import { createEventBus, EventBus } from "@memory-capsule/events";
import {
  createDatabaseClient,
  DatabaseClient,
  PostgresUserRepository,
  PostgresOutboxRepository,
  OutboxRepository,
  UserRepository,
  UserRecord,
  UserSessionRecord,
  UserAuthTokenRecord,
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

function sha256Hex(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

// In-memory fallback repository when running in isolated unit test without database
class InMemoryUserTestRepository implements UserRepository {
  private users = new Map<string, UserRecord>();
  private sessions = new Map<string, UserSessionRecord & { revokedAt?: string | null }>();
  private authTokens = new Map<string, UserAuthTokenRecord>();

  async findByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.toLowerCase().trim();
    for (const u of this.users.values()) {
      if (u.email === normalized) return u;
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

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      this.users.set(userId, { ...user, passwordHash, updatedAt: new Date().toISOString() });
    }
  }

  async markEmailVerified(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      this.users.set(userId, { ...user, isVerified: true, updatedAt: new Date().toISOString() });
    }
  }

  async createSession(session: UserSessionRecord): Promise<void> {
    this.sessions.set(session.id, { ...session, revokedAt: null });
  }

  async findSessionByToken(hash: string): Promise<UserSessionRecord | null> {
    const now = Date.now();
    for (const s of this.sessions.values()) {
      if (s.refreshTokenHash === hash && !s.revokedAt && new Date(s.expiresAt).getTime() > now) {
        return s;
      }
    }
    return null;
  }

  async deleteSession(id: string): Promise<void> {
    this.sessions.delete(id);
  }

  async revokeSessionByTokenHash(hash: string): Promise<boolean> {
    for (const [id, s] of this.sessions.entries()) {
      if (s.refreshTokenHash === hash && !s.revokedAt) {
        this.sessions.set(id, { ...s, revokedAt: new Date().toISOString() });
        return true;
      }
    }
    return false;
  }

  async revokeAllSessionsForUser(userId: string): Promise<void> {
    const now = new Date().toISOString();
    for (const [id, s] of this.sessions.entries()) {
      if (s.userId === userId && !s.revokedAt) {
        this.sessions.set(id, { ...s, revokedAt: now });
      }
    }
  }

  async createAuthToken(token: Omit<UserAuthTokenRecord, "createdAt" | "consumedAt">): Promise<void> {
    this.authTokens.set(token.tokenHash, {
      ...token,
      consumedAt: null,
      createdAt: new Date().toISOString(),
    });
  }

  async consumeAuthToken(
    tokenHash: string,
    purpose: "email_verification" | "password_reset"
  ): Promise<UserAuthTokenRecord | null> {
    const record = this.authTokens.get(tokenHash);
    if (!record || record.purpose !== purpose || record.consumedAt) return null;
    if (new Date(record.expiresAt).getTime() <= Date.now()) return null;
    const consumed = { ...record, consumedAt: new Date().toISOString() };
    this.authTokens.set(tokenHash, consumed);
    return consumed;
  }
}

export async function buildIdentityService(): Promise<FastifyInstance> {
  const cfg = validateServiceConfig(BaseServiceConfigSchema);
  const app = Fastify({ logger: false });
  app.setErrorHandler(createFastifyErrorHandler(logger));

  const dbUrl = cfg.IDENTITY_DATABASE_URL || cfg.DATABASE_URL;
  if (!dbUrl && cfg.NODE_ENV !== "test") {
    throw new Error(
      "[identity-service] Database connection string required in non-test mode. Set IDENTITY_DATABASE_URL or DATABASE_URL."
    );
  }
  const db: DatabaseClient = createDatabaseClient(dbUrl);
  if (cfg.NODE_ENV !== "test") {
    const isHealthy = await db.healthCheck();
    if (!isHealthy) {
      throw new Error(
        "[identity-service] PostgreSQL database health check failed during service initialization."
      );
    }
  }
  const eventBus: EventBus = await createEventBus(cfg.NATS_URL);

  const userRepo: UserRepository = dbUrl
    ? new PostgresUserRepository(db)
    : new InMemoryUserTestRepository();
  const outboxRepo: OutboxRepository | null = dbUrl ? new PostgresOutboxRepository(db) : null;

  let outboxTimer: NodeJS.Timeout | null = null;
  if (outboxRepo && outboxRepo.relayPending) {
    outboxTimer = setInterval(() => {
      outboxRepo
        .relayPending!(async (evt) => {
          await eventBus.publish(
            evt.eventType,
            createDomainEvent(evt.eventType, "identity-service", evt.payload)
          );
        })
        .catch((err) => {
          logger.warn({ err }, "[Identity Outbox] Relay cycle warning");
        });
    }, 1000);
    outboxTimer.unref();
  }

  app.addHook("onClose", async () => {
    if (outboxTimer) clearInterval(outboxTimer);
    await eventBus.close().catch((err) => logger.warn({ err }, "[Identity] EventBus close warning"));
    await db.close().catch((err) => logger.warn({ err }, "[Identity] DB close warning"));
  });

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

  await app.register(fastifyJwt, { secret: cfg.JWT_SECRET });

  async function publishDomainEvent(
    subject: string,
    eventType: string,
    aggregateId: string,
    payload: Record<string, any>
  ): Promise<void> {
    if (outboxRepo) {
      await outboxRepo.stageEvent({
        eventType: subject,
        aggregateType: "identity",
        aggregateId,
        payload,
      });
      // Attempt immediate relay so low-latency subscribers receive promptly
      if (outboxRepo.relayPending) {
        await outboxRepo.relayPending(async (evt) => {
          await eventBus.publish(
            evt.eventType,
            createDomainEvent(eventType, "identity-service", evt.payload)
          );
        });
      }
    } else {
      await eventBus.publish(subject, createDomainEvent(eventType, "identity-service", payload));
    }
  }

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
    const correlationId = (req.headers["x-correlation-id"] as string) || "corr-unknown";
    const parseResult = RegisterRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send(
        createErrorResponse("VALIDATION_ERROR", "Invalid registration payload", correlationId, parseResult.error.issues)
      );
    }

    const { email, password, fullName } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await userRepo.findByEmail(normalizedEmail);
    if (existing) {
      return reply.status(409).send(createErrorResponse("USER_EXISTS", "User already registered with this email", correlationId));
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

    const refreshToken = crypto.randomBytes(32).toString("hex");
    const refreshTokenHash = sha256Hex(refreshToken);
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

    // Stage email verification token
    let verificationToken: string | undefined;
    if (userRepo.createAuthToken) {
      verificationToken = crypto.randomBytes(24).toString("hex");
      await userRepo.createAuthToken({
        id: crypto.randomUUID(),
        userId,
        purpose: "email_verification",
        tokenHash: sha256Hex(verificationToken),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    await publishDomainEvent("identity.user.registered", "user.registered", userId, {
      userId,
      email: normalizedEmail,
      fullName,
      ...(cfg.NODE_ENV === "test" && verificationToken ? { verificationToken } : {}),
    });

    const token = app.jwt.sign({ sub: userId, email: normalizedEmail }, { expiresIn: "15m" });

    const userProfile: UserProfile = {
      id: userId,
      email: normalizedEmail,
      fullName,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    };

    return reply.status(201).send(
      createSuccessResponse(
        {
          user: userProfile,
          accessToken: token,
          refreshToken,
          expiresIn: 900,
          ...(cfg.NODE_ENV === "test" && verificationToken ? { verificationToken } : {}),
        },
        correlationId
      )
    );
  });

  // Login
  app.post("/api/v1/auth/login", async (req: FastifyRequest, reply: FastifyReply) => {
    const correlationId = (req.headers["x-correlation-id"] as string) || "corr-unknown";
    const parseResult = LoginRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send(createErrorResponse("VALIDATION_ERROR", "Invalid login payload", correlationId));
    }

    const { email, password } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await userRepo.findByEmail(normalizedEmail);
    if (!user) {
      return reply.status(401).send(createErrorResponse("INVALID_CREDENTIALS", "Email or password incorrect", correlationId));
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return reply.status(401).send(createErrorResponse("INVALID_CREDENTIALS", "Email or password incorrect", correlationId));
    }

    const token = app.jwt.sign({ sub: user.id, email: user.email }, { expiresIn: "15m" });
    const refreshToken = crypto.randomBytes(32).toString("hex");
    const refreshTokenHash = sha256Hex(refreshToken);
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
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return reply.status(200).send(
      createSuccessResponse(
        {
          user: userProfile,
          accessToken: token,
          refreshToken,
          expiresIn: 900,
        },
        correlationId
      )
    );
  });

  // Refresh Token Rotation
  app.post("/api/v1/auth/refresh", async (req: FastifyRequest, reply: FastifyReply) => {
    const correlationId = (req.headers["x-correlation-id"] as string) || "corr-unknown";
    const parseResult = RefreshTokenRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send(createErrorResponse("VALIDATION_ERROR", "Invalid refresh token payload", correlationId));
    }

    const oldHash = sha256Hex(parseResult.data.refreshToken);
    const existingSession = await userRepo.findSessionByToken(oldHash);
    if (!existingSession) {
      return reply.status(401).send(createErrorResponse("INVALID_REFRESH_TOKEN", "Refresh token is invalid, expired, or revoked", correlationId));
    }

    const user = await userRepo.findById(existingSession.userId);
    if (!user) {
      return reply.status(401).send(createErrorResponse("USER_NOT_FOUND", "Session user no longer exists", correlationId));
    }

    // Rotate session token atomically (revoke old, issue new)
    if (userRepo.revokeSessionByTokenHash) {
      await userRepo.revokeSessionByTokenHash(oldHash);
    } else {
      await userRepo.deleteSession(existingSession.id);
    }

    const nextRefreshToken = crypto.randomBytes(32).toString("hex");
    const nextRefreshHash = sha256Hex(nextRefreshToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await userRepo.createSession({
      id: crypto.randomUUID(),
      userId: user.id,
      refreshTokenHash: nextRefreshHash,
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
      expiresAt,
      createdAt: new Date().toISOString(),
    });

    const accessToken = app.jwt.sign({ sub: user.id, email: user.email }, { expiresIn: "15m" });
    return reply.status(200).send(
      createSuccessResponse(
        {
          accessToken,
          refreshToken: nextRefreshToken,
          expiresIn: 900,
        },
        correlationId
      )
    );
  });

  // Logout (revoke refresh session)
  app.post("/api/v1/auth/logout", async (req: FastifyRequest, reply: FastifyReply) => {
    const correlationId = (req.headers["x-correlation-id"] as string) || "corr-unknown";
    const parseResult = RefreshTokenRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send(createErrorResponse("VALIDATION_ERROR", "refreshToken is required", correlationId));
    }

    const hash = sha256Hex(parseResult.data.refreshToken);
    if (userRepo.revokeSessionByTokenHash) {
      await userRepo.revokeSessionByTokenHash(hash);
    } else {
      const session = await userRepo.findSessionByToken(hash);
      if (session) await userRepo.deleteSession(session.id);
    }

    return reply.status(200).send(createSuccessResponse({ loggedOut: true }, correlationId));
  });

  // Forgot Password (constant response to prevent email enumeration)
  app.post("/api/v1/auth/forgot-password", async (req: FastifyRequest, reply: FastifyReply) => {
    const correlationId = (req.headers["x-correlation-id"] as string) || "corr-unknown";
    const parseResult = ForgotPasswordRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send(createErrorResponse("VALIDATION_ERROR", "Valid email is required", correlationId));
    }

    const normalizedEmail = parseResult.data.email.toLowerCase().trim();
    const user = await userRepo.findByEmail(normalizedEmail);
    let devResetToken: string | undefined;

    if (user && userRepo.createAuthToken) {
      const rawToken = crypto.randomBytes(24).toString("hex");
      await userRepo.createAuthToken({
        id: crypto.randomUUID(),
        userId: user.id,
        purpose: "password_reset",
        tokenHash: sha256Hex(rawToken),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });
      await publishDomainEvent("identity.password_reset.requested", "password_reset.requested", user.id, {
        userId: user.id,
        email: normalizedEmail,
      });
      if (cfg.NODE_ENV === "test") {
        devResetToken = rawToken;
      }
    }

    return reply.status(200).send(
      createSuccessResponse(
        {
          requested: true,
          message: "If an account exists for that email, password reset instructions have been issued.",
          ...(devResetToken ? { resetToken: devResetToken } : {}),
        },
        correlationId
      )
    );
  });

  // Reset Password
  app.post("/api/v1/auth/reset-password", async (req: FastifyRequest, reply: FastifyReply) => {
    const correlationId = (req.headers["x-correlation-id"] as string) || "corr-unknown";
    const parseResult = ResetPasswordRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send(createErrorResponse("VALIDATION_ERROR", "Valid reset token and password (>= 8 chars) required", correlationId));
    }

    if (!userRepo.consumeAuthToken || !userRepo.updatePassword) {
      return reply.status(501).send(createErrorResponse("NOT_IMPLEMENTED", "Password reset storage unavailable", correlationId));
    }

    const tokenRecord = await userRepo.consumeAuthToken(sha256Hex(parseResult.data.token), "password_reset");
    if (!tokenRecord) {
      return reply.status(400).send(createErrorResponse("INVALID_TOKEN", "Reset token is invalid or expired", correlationId));
    }

    const nextHash = await hashPassword(parseResult.data.newPassword);
    await userRepo.updatePassword(tokenRecord.userId, nextHash);
    if (userRepo.revokeAllSessionsForUser) {
      await userRepo.revokeAllSessionsForUser(tokenRecord.userId);
    }

    await publishDomainEvent("identity.password.reset", "password.reset", tokenRecord.userId, {
      userId: tokenRecord.userId,
    });

    return reply.status(200).send(createSuccessResponse({ passwordReset: true }, correlationId));
  });

  // Verify Email
  app.post("/api/v1/auth/verify-email", async (req: FastifyRequest, reply: FastifyReply) => {
    const correlationId = (req.headers["x-correlation-id"] as string) || "corr-unknown";
    const parseResult = VerifyEmailRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send(createErrorResponse("VALIDATION_ERROR", "Valid verification token is required", correlationId));
    }

    if (!userRepo.consumeAuthToken || !userRepo.markEmailVerified) {
      return reply.status(501).send(createErrorResponse("NOT_IMPLEMENTED", "Email verification unavailable", correlationId));
    }

    const tokenRecord = await userRepo.consumeAuthToken(sha256Hex(parseResult.data.token), "email_verification");
    if (!tokenRecord) {
      return reply.status(400).send(createErrorResponse("INVALID_TOKEN", "Verification token is invalid or expired", correlationId));
    }

    await userRepo.markEmailVerified(tokenRecord.userId);
    await publishDomainEvent("identity.email.verified", "email.verified", tokenRecord.userId, {
      userId: tokenRecord.userId,
    });

    return reply.status(200).send(createSuccessResponse({ verified: true }, correlationId));
  });

  // Current User profile
  app.get("/api/v1/auth/me", async (req: FastifyRequest, reply: FastifyReply) => {
    const correlationId = (req.headers["x-correlation-id"] as string) || "corr-unknown";
    try {
      const payload: any = await req.jwtVerify();
      const user = await userRepo.findById(payload.sub);
      if (!user) {
        return reply.status(404).send(createErrorResponse("USER_NOT_FOUND", "Profile could not be resolved", correlationId));
      }

      const userProfile: UserProfile = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      return reply.status(200).send(createSuccessResponse({ user: userProfile }, correlationId));
    } catch {
      return reply.status(401).send(createErrorResponse("UNAUTHORIZED", "Missing or invalid session credentials", correlationId));
    }
  });

  return app;
}

export * from "./grpc-server.js";

if (process.env.NODE_ENV !== "test") {
  (async () => {
    try {
      const app = await buildIdentityService();
      const { server: grpcServer } = await startIdentityGrpcServer();
      await startServiceServer({
        serviceId: "identity-service",
        app,
        logger,
        grpcServer,
      });
    } catch (err) {
      logger.error({ err }, "[Identity] Unexpected startup failure");
      process.exit(1);
    }
  })();
}
