import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import cors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import crypto from "node:crypto";
import { promisify } from "node:util";
import { z } from "zod";
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
const ADMIN_ROLES = new Set(["superadmin", "admin", "ops_admin", "compliance_officer", "support_agent"]);

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

  async updateProfile(
    userId: string,
    updates: { fullName?: string; avatarUrl?: string | null }
  ): Promise<UserRecord | null> {
    const user = this.users.get(userId);
    if (!user) return null;
    const updated: UserRecord = {
      ...user,
      fullName: updates.fullName !== undefined ? updates.fullName : user.fullName,
      avatarUrl: updates.avatarUrl !== undefined ? updates.avatarUrl : user.avatarUrl,
      updatedAt: new Date().toISOString(),
    };
    this.users.set(userId, updated);
    return updated;
  }

  async deleteUser(userId: string): Promise<boolean> {
    return this.users.delete(userId);
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

  async listSessionsForUser(userId: string): Promise<UserSessionRecord[]> {
    const now = Date.now();
    return Array.from(this.sessions.values()).filter(
      (s) => s.userId === userId && !s.revokedAt && new Date(s.expiresAt).getTime() > now
    );
  }

  async revokeSessionById(sessionId: string, userId: string): Promise<boolean> {
    const s = this.sessions.get(sessionId);
    if (!s || s.userId !== userId || s.revokedAt) return false;
    this.sessions.set(sessionId, { ...s, revokedAt: new Date().toISOString() });
    return true;
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
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
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

    // Stage email verification token + 6-digit OTP code
    let verificationToken: string | undefined;
    let verificationCode: string | undefined;
    if (userRepo.createAuthToken) {
      verificationToken = crypto.randomBytes(24).toString("hex");
      verificationCode = String(crypto.randomInt(100000, 999999));
      await userRepo.createAuthToken({
        id: crypto.randomUUID(),
        userId,
        purpose: "email_verification",
        tokenHash: sha256Hex(verificationToken),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      await userRepo.createAuthToken({
        id: crypto.randomUUID(),
        userId,
        purpose: "email_verification",
        tokenHash: sha256Hex(`otp:${verificationCode}`),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      });
    }

    await publishDomainEvent("identity.user.registered", "user.registered", userId, {
      userId,
      email: normalizedEmail,
      fullName,
      ...(cfg.NODE_ENV === "test" && verificationToken ? { verificationToken } : {}),
    });

    const token = app.jwt.sign(
      { sub: userId, email: normalizedEmail, role: (newUser.role as string) || "member" },
      { expiresIn: "15m" }
    );

    const userProfile: UserProfile = {
      id: userId,
      email: normalizedEmail,
      fullName,
      role: (newUser.role as UserProfile["role"]) || "member",
      isVerified: newUser.isVerified,
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
          ...(cfg.NODE_ENV === "test" && verificationCode ? { verificationCode } : {}),
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
    if (user.status === "suspended") {
      return reply.status(403).send(createErrorResponse("ACCOUNT_SUSPENDED", "This account has been suspended by an administrator", correlationId));
    }

    const userRole = (user.role as UserProfile["role"]) || "member";
    const token = app.jwt.sign({ sub: user.id, email: user.email, role: userRole }, { expiresIn: "15m" });
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
      role: userRole,
      isVerified: user.isVerified,
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
    if (user.status === "suspended") {
      return reply.status(403).send(createErrorResponse("ACCOUNT_SUSPENDED", "This account has been suspended by an administrator", correlationId));
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

    const accessToken = app.jwt.sign(
      { sub: user.id, email: user.email, role: user.role || "member" },
      { expiresIn: "15m" }
    );
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

  // Update Current User Profile
  const UpdateProfileSchema = z.object({
    fullName: z.string().min(1).max(120).optional(),
    avatarUrl: z.string().url().nullable().optional(),
  });

  app.patch("/api/v1/auth/me", async (req: FastifyRequest, reply: FastifyReply) => {
    const correlationId = (req.headers["x-correlation-id"] as string) || "corr-unknown";
    let userId: string;
    try {
      const payload: any = await req.jwtVerify();
      userId = payload.sub;
    } catch {
      return reply.status(401).send(createErrorResponse("UNAUTHORIZED", "Missing or invalid session credentials", correlationId));
    }

    const parseResult = UpdateProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send(createErrorResponse("VALIDATION_ERROR", "Invalid profile update payload", correlationId));
    }

    if (!userRepo.updateProfile) {
      return reply.status(501).send(createErrorResponse("NOT_IMPLEMENTED", "Profile updates unavailable", correlationId));
    }
    const updated = await userRepo.updateProfile(userId, parseResult.data);
    if (!updated) {
      return reply.status(404).send(createErrorResponse("USER_NOT_FOUND", "Profile could not be resolved", correlationId));
    }

    const userProfile: UserProfile = {
      id: updated.id,
      email: updated.email,
      fullName: updated.fullName,
      avatarUrl: updated.avatarUrl,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
    return reply.status(200).send(createSuccessResponse({ user: userProfile }, correlationId));
  });

  // List & Revoke Active Sessions
  app.get("/api/v1/auth/sessions", async (req: FastifyRequest, reply: FastifyReply) => {
    const correlationId = (req.headers["x-correlation-id"] as string) || "corr-unknown";
    let userId: string;
    try {
      const payload: any = await req.jwtVerify();
      userId = payload.sub;
    } catch {
      return reply.status(401).send(createErrorResponse("UNAUTHORIZED", "Missing or invalid session credentials", correlationId));
    }
    const sessions = userRepo.listSessionsForUser ? await userRepo.listSessionsForUser(userId) : [];
    return reply.status(200).send(
      createSuccessResponse(
        sessions.map((s) => ({
          id: s.id,
          userAgent: s.userAgent || "Unknown Device",
          ipAddress: s.ipAddress || "local",
          expiresAt: s.expiresAt,
          createdAt: s.createdAt,
        })),
        correlationId
      )
    );
  });

  app.delete(
    "/api/v1/auth/sessions/:sessionId",
    async (req: FastifyRequest<{ Params: { sessionId: string } }>, reply: FastifyReply) => {
      const correlationId = (req.headers["x-correlation-id"] as string) || "corr-unknown";
      let userId: string;
      try {
        const payload: any = await req.jwtVerify();
        userId = payload.sub;
      } catch {
        return reply.status(401).send(createErrorResponse("UNAUTHORIZED", "Missing or invalid session credentials", correlationId));
      }
      const revoked = userRepo.revokeSessionById
        ? await userRepo.revokeSessionById(req.params.sessionId, userId)
        : false;
      if (!revoked) {
        return reply.status(404).send(createErrorResponse("SESSION_NOT_FOUND", "Active session not found", correlationId));
      }
      return reply.status(200).send(createSuccessResponse({ revoked: true, sessionId: req.params.sessionId }, correlationId));
    }
  );

  // Permanent Account Deletion (requires current password confirmation)
  app.post("/api/v1/auth/account/delete", async (req: FastifyRequest, reply: FastifyReply) => {
    const correlationId = (req.headers["x-correlation-id"] as string) || "corr-unknown";
    let userId: string;
    try {
      const payload: any = await req.jwtVerify();
      userId = payload.sub;
    } catch {
      return reply.status(401).send(createErrorResponse("UNAUTHORIZED", "Missing or invalid session credentials", correlationId));
    }
    const body = (req.body as { password?: string }) || {};
    if (!body.password || typeof body.password !== "string") {
      return reply.status(400).send(createErrorResponse("VALIDATION_ERROR", "Current password is required to delete account", correlationId));
    }
    const user = await userRepo.findById(userId);
    if (!user) {
      return reply.status(404).send(createErrorResponse("USER_NOT_FOUND", "User not found", correlationId));
    }
    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send(createErrorResponse("INVALID_CREDENTIALS", "Password confirmation failed", correlationId));
    }
    if (userRepo.revokeAllSessionsForUser) {
      await userRepo.revokeAllSessionsForUser(userId);
    }
    if (userRepo.deleteUser) {
      await userRepo.deleteUser(userId);
    }
    await publishDomainEvent("identity.account.deleted", "account.deleted", userId, { userId });
    return reply.status(200).send(createSuccessResponse({ deleted: true }, correlationId));
  });

  // ==========================================
  // EXTENDED AUTH, PREFERENCES, PRIVACY & SUPPORT
  // ==========================================
  const memPreferences = new Map<string, Record<string, any>>();
  const memPrivacy = new Map<string, Record<string, any>>();
  const memOnboardingPurpose = new Map<string, string>();
  const memTickets: Array<Record<string, any>> = [];
  const memTicketReplies: Array<Record<string, any>> = [];
  const memAccessRequests: Array<Record<string, any>> = [];
  const memReports: Array<Record<string, any>> = [];
  const memSecurityKeys: Array<Record<string, any>> = [];
  const memAuditLogs: Array<Record<string, any>> = [];
  const memEmailTemplates = new Map<string, { templateKey: string; subject: string; htmlBody: string; updatedAt: string }>([
    ["welcome_heirloom", { templateKey: "welcome_heirloom", subject: "Welcome to Memoria — Your Living Archive", htmlBody: "<h1>Your memories, made timeless.</h1>", updatedAt: new Date().toISOString() }],
    ["family_invitation", { templateKey: "family_invitation", subject: "You are invited to a Memoria Family Circle", htmlBody: "<h1>Join our shared family archive</h1>", updatedAt: new Date().toISOString() }],
    ["print_order_shipped", { templateKey: "print_order_shipped", subject: "Your Heirloom Book Edition Has Shipped", htmlBody: "<h1>On its way to your bookshelf</h1>", updatedAt: new Date().toISOString() }],
  ]);

  async function recordAuditLog(params: {
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    spaceId?: string | null;
    metadata?: Record<string, any>;
  }) {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    if (dbUrl) {
      await db.query(
        `INSERT INTO audit_logs (id, space_id, user_id, action, entity_type, entity_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, params.spaceId || null, params.userId, params.action, params.entityType, params.entityId, JSON.stringify(params.metadata || {})]
      ).catch((err) => logger.warn({ err, action: params.action }, "[Identity] Non-fatal audit_log insert warning"));
    } else {
      memAuditLogs.unshift({
        id,
        spaceId: params.spaceId || null,
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: params.metadata || {},
        createdAt,
      });
    }
  }

  async function requireAuthClaims(req: FastifyRequest): Promise<{ userId: string; email: string; role: string }> {
    try {
      const payload: any = await req.jwtVerify();
      return {
        userId: payload.sub,
        email: payload.email || "",
        role: typeof payload.role === "string" ? payload.role : "member",
      };
    } catch {
      const correlationId = (req.headers["x-correlation-id"] as string) || "corr-unknown";
      throw Object.assign(new Error("Missing or invalid session credentials"), { statusCode: 401, code: "UNAUTHORIZED", correlationId });
    }
  }

  async function requireAdminClaims(req: FastifyRequest): Promise<{ userId: string; email: string; role: string }> {
    const claims = await requireAuthClaims(req);
    let effectiveRole = claims.role;
    if (!ADMIN_ROLES.has(effectiveRole) && dbUrl) {
      const dbUser = await userRepo.findById(claims.userId);
      if (dbUser?.role && ADMIN_ROLES.has(dbUser.role)) {
        effectiveRole = dbUser.role;
      }
    }
    if (!ADMIN_ROLES.has(effectiveRole)) {
      throw Object.assign(new Error("Administrative privileges required"), { statusCode: 403, code: "FORBIDDEN" });
    }
    return { ...claims, role: effectiveRole };
  }

  // First-run local instance admin bootstrap (strictly blocked once any superadmin exists)
  app.post("/api/v1/auth/claim-instance-admin", async (req: FastifyRequest, reply: FastifyReply) => {
    const correlationId = (req.headers["x-correlation-id"] as string) || "corr-unknown";
    const claims = await requireAuthClaims(req);
    if (!dbUrl) {
      return reply.status(200).send(createSuccessResponse({ role: "superadmin", claimed: true }, correlationId));
    }
    const existingAdmin = await db.query(`SELECT id FROM users WHERE role IN ('superadmin', 'admin') LIMIT 1`);
    if (existingAdmin.rows.length > 0) {
      return reply.status(409).send(createErrorResponse("ADMIN_ALREADY_EXISTS", "An instance administrator already exists", correlationId));
    }
    await db.query(`UPDATE users SET role = 'superadmin', updated_at = NOW() WHERE id = $1`, [claims.userId]);
    const user = await userRepo.findById(claims.userId);
    const accessToken = app.jwt.sign({ sub: claims.userId, email: user?.email || claims.email, role: "superadmin" }, { expiresIn: "15m" });
    return reply.status(200).send(createSuccessResponse({ claimed: true, role: "superadmin", accessToken }, correlationId));
  });

  // Resend Email Verification Token & 6-digit OTP (PWA-12 / IOS-05)
  app.post("/api/v1/auth/resend-verification", async (req: FastifyRequest, reply: FastifyReply) => {
    const correlationId = (req.headers["x-correlation-id"] as string) || "corr-unknown";
    const body = (req.body as { email?: string }) || {};
    let user: UserRecord | null = null;
    if (req.headers.authorization?.startsWith("Bearer ")) {
      try {
        const claims = await requireAuthClaims(req);
        user = await userRepo.findById(claims.userId);
      } catch {
        user = null;
      }
    }
    if (!user && body.email) {
      user = await userRepo.findByEmail(body.email);
    }
    if (!user) {
      return reply.status(200).send(createSuccessResponse({ sent: true }, correlationId));
    }
    let verificationToken: string | undefined;
    let verificationCode: string | undefined;
    if (userRepo.createAuthToken) {
      verificationToken = crypto.randomBytes(24).toString("hex");
      verificationCode = String(crypto.randomInt(100000, 999999));
      await userRepo.createAuthToken({
        id: crypto.randomUUID(),
        userId: user.id,
        purpose: "email_verification",
        tokenHash: sha256Hex(verificationToken),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      await userRepo.createAuthToken({
        id: crypto.randomUUID(),
        userId: user.id,
        purpose: "email_verification",
        tokenHash: sha256Hex(`otp:${verificationCode}`),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      });
    }
    return reply.status(200).send(
      createSuccessResponse(
        {
          sent: true,
          ...(cfg.NODE_ENV === "test" && verificationToken ? { verificationToken } : {}),
          ...(cfg.NODE_ENV === "test" && verificationCode ? { verificationCode } : {}),
        },
        correlationId
      )
    );
  });

  // Verify 6-digit OTP / Token Code (IOS-05)
  app.post("/api/v1/auth/verify-code", async (req: FastifyRequest, reply: FastifyReply) => {
    const correlationId = (req.headers["x-correlation-id"] as string) || "corr-unknown";
    const body = (req.body as { code?: string; token?: string }) || {};
    const raw = (body.token || body.code || "").trim();
    if (!raw || raw.length < 6) {
      return reply.status(400).send(createErrorResponse("VALIDATION_ERROR", "Verification code is required", correlationId));
    }
    if (!userRepo.consumeAuthToken || !userRepo.markEmailVerified) {
      return reply.status(503).send(createErrorResponse("SERVICE_UNAVAILABLE", "Token verification unavailable", correlationId));
    }
    const tokenHash = raw.length >= 16 ? sha256Hex(raw) : sha256Hex(`otp:${raw}`);
    const record = await userRepo.consumeAuthToken(tokenHash, "email_verification");
    if (!record) {
      return reply.status(400).send(createErrorResponse("INVALID_TOKEN", "Verification code invalid or expired", correlationId));
    }
    await userRepo.markEmailVerified(record.userId);
    return reply.status(200).send(createSuccessResponse({ verified: true, userId: record.userId }, correlationId));
  });

  // User Preferences (PWA-78 / IOS-54)
  app.get("/api/v1/auth/me/preferences", async (req: FastifyRequest, reply: FastifyReply) => {
    const claims = await requireAuthClaims(req);
    if (dbUrl) {
      const user = await userRepo.findById(claims.userId);
      return reply.status(200).send(createSuccessResponse(user?.preferencesJson || { reducedMotion: false, language: "en", biometricLock: false }));
    }
    return reply.status(200).send(createSuccessResponse(memPreferences.get(claims.userId) || { reducedMotion: false, language: "en", biometricLock: false }));
  });

  app.patch("/api/v1/auth/me/preferences", async (req: FastifyRequest, reply: FastifyReply) => {
    const claims = await requireAuthClaims(req);
    const body = (req.body as Record<string, any>) || {};
    const allowed = {
      reducedMotion: typeof body.reducedMotion === "boolean" ? body.reducedMotion : undefined,
      language: typeof body.language === "string" ? body.language.slice(0, 12) : undefined,
      biometricLock: typeof body.biometricLock === "boolean" ? body.biometricLock : undefined,
      defaultSpaceId: typeof body.defaultSpaceId === "string" ? body.defaultSpaceId : undefined,
    };
    const clean = Object.fromEntries(Object.entries(allowed).filter(([, v]) => v !== undefined));
    if (dbUrl) {
      const user = await userRepo.findById(claims.userId);
      const merged = { ...(user?.preferencesJson || {}), ...clean };
      await db.query(`UPDATE users SET preferences_json = $1, updated_at = NOW() WHERE id = $2`, [JSON.stringify(merged), claims.userId]);
      return reply.status(200).send(createSuccessResponse(merged));
    }
    const merged = { ...(memPreferences.get(claims.userId) || {}), ...clean };
    memPreferences.set(claims.userId, merged);
    return reply.status(200).send(createSuccessResponse(merged));
  });

  // User Privacy Controls (PWA-79)
  app.get("/api/v1/auth/me/privacy", async (req: FastifyRequest, reply: FastifyReply) => {
    const claims = await requireAuthClaims(req);
    if (dbUrl) {
      const user = await userRepo.findById(claims.userId);
      return reply.status(200).send(createSuccessResponse(user?.privacyJson || { signedLinkTtlSeconds: 3600, allowPublicGallery: false }));
    }
    return reply.status(200).send(createSuccessResponse(memPrivacy.get(claims.userId) || { signedLinkTtlSeconds: 3600, allowPublicGallery: false }));
  });

  app.patch("/api/v1/auth/me/privacy", async (req: FastifyRequest, reply: FastifyReply) => {
    const claims = await requireAuthClaims(req);
    const body = (req.body as { signedLinkTtlSeconds?: number; allowPublicGallery?: boolean }) || {};
    const ttl = typeof body.signedLinkTtlSeconds === "number" ? Math.min(Math.max(body.signedLinkTtlSeconds, 300), 86400) : undefined;
    const patch: Record<string, any> = {};
    if (ttl !== undefined) patch.signedLinkTtlSeconds = ttl;
    if (typeof body.allowPublicGallery === "boolean") patch.allowPublicGallery = body.allowPublicGallery;
    if (dbUrl) {
      const user = await userRepo.findById(claims.userId);
      const merged = { ...(user?.privacyJson || {}), ...patch };
      await db.query(`UPDATE users SET privacy_json = $1, updated_at = NOW() WHERE id = $2`, [JSON.stringify(merged), claims.userId]);
      return reply.status(200).send(createSuccessResponse(merged));
    }
    const merged = { ...(memPrivacy.get(claims.userId) || {}), ...patch };
    memPrivacy.set(claims.userId, merged);
    return reply.status(200).send(createSuccessResponse(merged));
  });

  // Onboarding Purpose Persistence (PWA-14)
  app.patch("/api/v1/auth/me/onboarding", async (req: FastifyRequest, reply: FastifyReply) => {
    const claims = await requireAuthClaims(req);
    const body = (req.body as { purpose?: string }) || {};
    const purpose = body.purpose?.trim() || "family";
    if (dbUrl) {
      await db.query(`UPDATE users SET onboarding_purpose = $1, updated_at = NOW() WHERE id = $2`, [purpose, claims.userId]);
    } else {
      memOnboardingPurpose.set(claims.userId, purpose);
    }
    return reply.status(200).send(createSuccessResponse({ purpose, saved: true }));
  });

  // Support Tickets (PWA-07 / PWA-82 / IOS-56)
  const CreateTicketSchema = z.object({
    email: z.string().email().optional(),
    subject: z.string().min(2).max(200),
    category: z.string().default("general"),
    message: z.string().min(5).max(4000),
  });

  app.post("/api/v1/support/tickets", async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = CreateTicketSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send(createErrorResponse("VALIDATION_ERROR", "Valid subject and message (>= 5 chars) required"));
    }
    let userId: string | null = null;
    let email = parsed.data.email || "guest@memoria.local";
    if (req.headers.authorization?.startsWith("Bearer ")) {
      try {
        const claims = await requireAuthClaims(req);
        userId = claims.userId;
        if (claims.email) email = claims.email;
      } catch {
        userId = null;
      }
    }
    const ticket = {
      id: crypto.randomUUID(),
      userId,
      email,
      subject: parsed.data.subject,
      category: parsed.data.category,
      message: parsed.data.message,
      status: "open",
      priority: "normal",
      createdAt: new Date().toISOString(),
    };
    if (dbUrl) {
      await db.query(
        `INSERT INTO support_tickets (id, user_id, email, subject, category, message, status, priority)
         VALUES ($1, $2, $3, $4, $5, $6, 'open', 'normal')`,
        [ticket.id, userId, email, ticket.subject, ticket.category, ticket.message]
      );
    } else {
      memTickets.unshift(ticket);
    }
    return reply.status(201).send(createSuccessResponse(ticket));
  });

  app.get("/api/v1/support/tickets", async (req: FastifyRequest, reply: FastifyReply) => {
    const claims = await requireAuthClaims(req);
    if (dbUrl) {
      const res = await db.query(
        `SELECT id, email, subject, category, message, status, priority, created_at::text as "createdAt"
         FROM support_tickets WHERE user_id = $1 ORDER BY created_at DESC`,
        [claims.userId]
      );
      const ids = res.rows.map((r: any) => r.id);
      let repliesByTicket = new Map<string, any[]>();
      if (ids.length > 0) {
        const repRes = await db.query(
          `SELECT id, ticket_id as "ticketId", author_name as "authorName", message, created_at::text as "createdAt"
           FROM support_replies WHERE ticket_id = ANY($1) AND internal_note = FALSE ORDER BY created_at ASC`,
          [ids]
        );
        for (const r of repRes.rows) {
          const list = repliesByTicket.get(r.ticketId) || [];
          list.push(r);
          repliesByTicket.set(r.ticketId, list);
        }
      }
      return reply.status(200).send(
        createSuccessResponse(res.rows.map((t: any) => ({ ...t, replies: repliesByTicket.get(t.id) || [] })))
      );
    }
    return reply.status(200).send(
      createSuccessResponse(
        memTickets
          .filter((t) => t.userId === claims.userId)
          .map((t) => ({ ...t, replies: memTicketReplies.filter((r) => r.ticketId === t.id && !r.internalNote) }))
      )
    );
  });

  // User Policy / Abuse Report Submission (ADMIN-07)
  const CreateReportSchema = z.object({
    targetType: z.enum(["memory", "space", "user"]).default("memory"),
    targetId: z.string().uuid(),
    reason: z.string().min(3).max(255),
    details: z.string().max(2000).optional(),
  });

  app.post("/api/v1/support/reports", async (req: FastifyRequest, reply: FastifyReply) => {
    const claims = await requireAuthClaims(req);
    const parsed = CreateReportSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send(createErrorResponse("VALIDATION_ERROR", "Valid targetId and reason required"));
    }
    const report = {
      id: crypto.randomUUID(),
      reporterId: claims.userId,
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      reason: parsed.data.reason,
      details: parsed.data.details || null,
      status: "open",
      createdAt: new Date().toISOString(),
    };
    if (dbUrl) {
      await db.query(
        `INSERT INTO user_reports (id, reporter_id, target_type, target_id, reason, details, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'open')`,
        [report.id, report.reporterId, report.targetType, report.targetId, report.reason, report.details]
      );
    } else {
      memReports.unshift(report);
    }
    return reply.status(201).send(createSuccessResponse(report));
  });

  // ==========================================
  // ADMIN GOVERNANCE & SECURITY CONSOLES
  // ==========================================

  app.get("/api/v1/admin/users", async (req: FastifyRequest<{ Querystring: { q?: string } }>, reply: FastifyReply) => {
    await requireAdminClaims(req);
    const q = (req.query.q || "").trim().toLowerCase();
    if (dbUrl) {
      const res = await db.query(
        `SELECT id, email, full_name as "fullName", COALESCE(role, 'member') as "role",
                COALESCE(status, 'active') as "status", is_verified as "isVerified",
                created_at::text as "createdAt"
         FROM users
         WHERE ($1 = '' OR LOWER(email) LIKE $2 OR LOWER(full_name) LIKE $2)
         ORDER BY created_at DESC LIMIT 100`,
        [q, `%${q}%`]
      );
      return reply.status(200).send(createSuccessResponse(res.rows));
    }
    return reply.status(200).send(createSuccessResponse([]));
  });

  app.patch(
    "/api/v1/admin/users/:userId/status",
    async (req: FastifyRequest<{ Params: { userId: string }; Body: { status: "active" | "suspended" } }>, reply: FastifyReply) => {
      const admin = await requireAdminClaims(req);
      const nextStatus = req.body?.status === "suspended" ? "suspended" : "active";
      if (nextStatus === "suspended" && req.params.userId === admin.userId) {
        return reply.status(400).send(createErrorResponse("SELF_SUSPEND_FORBIDDEN", "Administrators cannot suspend their own active account"));
      }
      if (dbUrl) {
        const res = await db.query(
          `UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, full_name as "fullName", status`,
          [nextStatus, req.params.userId]
        );
        if (!res.rows[0]) {
          return reply.status(404).send(createErrorResponse("USER_NOT_FOUND", "User not found"));
        }
        if (nextStatus === "suspended" && userRepo.revokeAllSessionsForUser) {
          await userRepo.revokeAllSessionsForUser(req.params.userId);
        }
        await recordAuditLog({
          userId: admin.userId,
          action: `admin.user.status_${nextStatus}`,
          entityType: "user",
          entityId: req.params.userId,
          metadata: { nextStatus },
        });
        return reply.status(200).send(createSuccessResponse(res.rows[0]));
      }
      if (nextStatus === "suspended" && userRepo.revokeAllSessionsForUser) {
        await userRepo.revokeAllSessionsForUser(req.params.userId);
      }
      await recordAuditLog({
        userId: admin.userId,
        action: `admin.user.status_${nextStatus}`,
        entityType: "user",
        entityId: req.params.userId,
        metadata: { nextStatus },
      });
      return reply.status(200).send(createSuccessResponse({ id: req.params.userId, status: nextStatus }));
    }
  );

  app.post(
    "/api/v1/admin/users/:userId/sessions/revoke-all",
    async (req: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
      const admin = await requireAdminClaims(req);
      if (userRepo.revokeAllSessionsForUser) {
        await userRepo.revokeAllSessionsForUser(req.params.userId);
      }
      await recordAuditLog({
        userId: admin.userId,
        action: "admin.user.sessions_revoked",
        entityType: "user",
        entityId: req.params.userId,
      });
      return reply.status(200).send(createSuccessResponse({ revokedAll: true, userId: req.params.userId }));
    }
  );

  app.get("/api/v1/admin/access-requests", async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdminClaims(req);
    if (dbUrl) {
      const res = await db.query(
        `SELECT id, requester_id as "requesterId", target_user_id as "targetUserId", target_space_id as "targetSpaceId",
                reason, status, approver_id as "approverId", expires_at::text as "expiresAt", created_at::text as "createdAt"
         FROM support_access_requests ORDER BY created_at DESC LIMIT 100`
      );
      return reply.status(200).send(createSuccessResponse(res.rows));
    }
    return reply.status(200).send(createSuccessResponse(memAccessRequests));
  });

  app.post(
    "/api/v1/admin/access-requests",
    async (req: FastifyRequest<{ Body: { targetSpaceId?: string; reason: string } }>, reply: FastifyReply) => {
      const admin = await requireAdminClaims(req);
      const reason = req.body?.reason?.trim();
      if (!reason) {
        return reply.status(400).send(createErrorResponse("VALIDATION_ERROR", "Access reason is required"));
      }
      const record = {
        id: crypto.randomUUID(),
        requesterId: admin.userId,
        targetSpaceId: req.body?.targetSpaceId || null,
        reason,
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      if (dbUrl) {
        await db.query(
          `INSERT INTO support_access_requests (id, requester_id, target_space_id, reason, status)
           VALUES ($1, $2, $3, $4, 'pending')`,
          [record.id, record.requesterId, record.targetSpaceId, record.reason]
        );
      } else {
        memAccessRequests.unshift(record);
      }
      await recordAuditLog({
        userId: admin.userId,
        action: "admin.access_request.created",
        entityType: "support_access_request",
        entityId: record.id,
        spaceId: record.targetSpaceId,
      });
      return reply.status(201).send(createSuccessResponse(record));
    }
  );

  app.post(
    "/api/v1/admin/access-requests/:requestId/approve",
    async (req: FastifyRequest<{ Params: { requestId: string } }>, reply: FastifyReply) => {
      const admin = await requireAdminClaims(req);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      if (dbUrl) {
        const check = await db.query(
          `SELECT id, requester_id as "requesterId", status FROM support_access_requests WHERE id = $1 LIMIT 1`,
          [req.params.requestId]
        );
        const existing = check.rows[0];
        if (!existing) {
          return reply.status(404).send(createErrorResponse("REQUEST_NOT_FOUND", "Access request not found"));
        }
        if (existing.requesterId === admin.userId) {
          return reply.status(403).send(createErrorResponse("DUAL_APPROVAL_REQUIRED", "Dual-custody policy requires a second administrator to approve this access request"));
        }
        const res = await db.query(
          `UPDATE support_access_requests SET status = 'approved', approver_id = $1, expires_at = $2 WHERE id = $3
           RETURNING id, status, approver_id as "approverId", expires_at::text as "expiresAt"`,
          [admin.userId, expiresAt, req.params.requestId]
        );
        await recordAuditLog({
          userId: admin.userId,
          action: "admin.access_request.approved",
          entityType: "support_access_request",
          entityId: req.params.requestId,
        });
        return reply.status(200).send(createSuccessResponse(res.rows[0]));
      }
      const item = memAccessRequests.find((r) => r.id === req.params.requestId);
      if (!item) return reply.status(404).send(createErrorResponse("REQUEST_NOT_FOUND", "Access request not found"));
      if (item.requesterId === admin.userId) {
        return reply.status(403).send(createErrorResponse("DUAL_APPROVAL_REQUIRED", "Dual-custody policy requires a second administrator to approve this access request"));
      }
      item.status = "approved";
      item.approverId = admin.userId;
      item.expiresAt = expiresAt;
      await recordAuditLog({
        userId: admin.userId,
        action: "admin.access_request.approved",
        entityType: "support_access_request",
        entityId: req.params.requestId,
      });
      return reply.status(200).send(createSuccessResponse(item));
    }
  );

  app.get("/api/v1/admin/reports", async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdminClaims(req);
    if (dbUrl) {
      const res = await db.query(
        `SELECT id, target_type as "targetType", target_id as "targetId", reason, details, status,
                resolution_note as "resolutionNote", created_at::text as "createdAt"
         FROM user_reports ORDER BY created_at DESC LIMIT 100`
      );
      return reply.status(200).send(createSuccessResponse(res.rows));
    }
    return reply.status(200).send(createSuccessResponse(memReports));
  });

  app.patch(
    "/api/v1/admin/reports/:reportId",
    async (req: FastifyRequest<{ Params: { reportId: string }; Body: { status: string; resolutionNote?: string } }>, reply: FastifyReply) => {
      const admin = await requireAdminClaims(req);
      const status = req.body?.status || "resolved";
      if (dbUrl) {
        const res = await db.query(
          `UPDATE user_reports SET status = $1, resolution_note = $2, updated_at = NOW() WHERE id = $3
           RETURNING id, status, resolution_note as "resolutionNote"`,
          [status, req.body?.resolutionNote || null, req.params.reportId]
        );
        if (!res.rows[0]) return reply.status(404).send(createErrorResponse("REPORT_NOT_FOUND", "Report not found"));
        await recordAuditLog({
          userId: admin.userId,
          action: `admin.report.${status}`,
          entityType: "user_report",
          entityId: req.params.reportId,
        });
        return reply.status(200).send(createSuccessResponse(res.rows[0]));
      }
      const rep = memReports.find((r) => r.id === req.params.reportId);
      if (rep) {
        rep.status = status;
        rep.resolutionNote = req.body?.resolutionNote || null;
      }
      await recordAuditLog({
        userId: admin.userId,
        action: `admin.report.${status}`,
        entityType: "user_report",
        entityId: req.params.reportId,
      });
      return reply.status(200).send(createSuccessResponse({ id: req.params.reportId, status }));
    }
  );

  app.get("/api/v1/admin/templates", async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdminClaims(req);
    if (dbUrl) {
      const res = await db.query(
        `SELECT template_key as "templateKey", subject, html_body as "htmlBody", updated_at::text as "updatedAt"
         FROM email_templates ORDER BY template_key ASC`
      );
      return reply.status(200).send(createSuccessResponse(res.rows));
    }
    return reply.status(200).send(createSuccessResponse(Array.from(memEmailTemplates.values())));
  });

  app.put(
    "/api/v1/admin/templates/:templateKey",
    async (req: FastifyRequest<{ Params: { templateKey: string }; Body: { subject: string; htmlBody: string } }>, reply: FastifyReply) => {
      const admin = await requireAdminClaims(req);
      const { subject, htmlBody } = req.body || {};
      if (!subject || !htmlBody) {
        return reply.status(400).send(createErrorResponse("VALIDATION_ERROR", "subject and htmlBody required"));
      }
      if (dbUrl) {
        const res = await db.query(
          `INSERT INTO email_templates (template_key, subject, html_body, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (template_key) DO UPDATE SET subject = $2, html_body = $3, updated_at = NOW()
           RETURNING template_key as "templateKey", subject, html_body as "htmlBody", updated_at::text as "updatedAt"`,
          [req.params.templateKey, subject, htmlBody]
        );
        await recordAuditLog({
          userId: admin.userId,
          action: "admin.template.updated",
          entityType: "email_template",
          entityId: req.params.templateKey,
        });
        return reply.status(200).send(createSuccessResponse(res.rows[0]));
      }
      const next = { templateKey: req.params.templateKey, subject, htmlBody, updatedAt: new Date().toISOString() };
      memEmailTemplates.set(req.params.templateKey, next);
      await recordAuditLog({
        userId: admin.userId,
        action: "admin.template.updated",
        entityType: "email_template",
        entityId: req.params.templateKey,
      });
      return reply.status(200).send(createSuccessResponse(next));
    }
  );

  app.get("/api/v1/admin/audit-logs", async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdminClaims(req);
    if (dbUrl) {
      const res = await db.query(
        `SELECT id, space_id as "spaceId", user_id as "userId", action, entity_type as "entityType",
                entity_id as "entityId", metadata, created_at::text as "createdAt"
         FROM audit_logs ORDER BY created_at DESC LIMIT 100`
      );
      return reply.status(200).send(createSuccessResponse(res.rows));
    }
    return reply.status(200).send(createSuccessResponse(memAuditLogs));
  });

  app.get("/api/v1/admin/tickets", async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdminClaims(req);
    if (dbUrl) {
      const res = await db.query(
        `SELECT id, user_id as "userId", email, subject, category, message, status, priority, created_at::text as "createdAt"
         FROM support_tickets ORDER BY created_at DESC LIMIT 100`
      );
      const ids = res.rows.map((r: any) => r.id);
      const repliesByTicket = new Map<string, any[]>();
      if (ids.length > 0) {
        const repRes = await db.query(
          `SELECT id, ticket_id as "ticketId", author_name as "authorName", message, internal_note as "internalNote", created_at::text as "createdAt"
           FROM support_replies WHERE ticket_id = ANY($1) ORDER BY created_at ASC`,
          [ids]
        );
        for (const r of repRes.rows) {
          const list = repliesByTicket.get(r.ticketId) || [];
          list.push(r);
          repliesByTicket.set(r.ticketId, list);
        }
      }
      return reply.status(200).send(
        createSuccessResponse(res.rows.map((t: any) => ({ ...t, replies: repliesByTicket.get(t.id) || [] })))
      );
    }
    return reply.status(200).send(
      createSuccessResponse(
        memTickets.map((t) => ({ ...t, replies: memTicketReplies.filter((r) => r.ticketId === t.id) }))
      )
    );
  });

  app.post(
    "/api/v1/admin/tickets/:ticketId/reply",
    async (
      req: FastifyRequest<{ Params: { ticketId: string }; Body: { message: string; newStatus?: string; internalNote?: boolean } }>,
      reply: FastifyReply
    ) => {
      const admin = await requireAdminClaims(req);
      const message = req.body?.message?.trim();
      if (!message) {
        return reply.status(400).send(createErrorResponse("VALIDATION_ERROR", "Reply message is required"));
      }
      const replyId = crypto.randomUUID();
      const newStatus = req.body?.newStatus || "waiting_customer";
      const internalNote = Boolean(req.body?.internalNote);
      if (dbUrl) {
        await db.query(
          `INSERT INTO support_replies (id, ticket_id, author_id, author_name, message, internal_note)
           VALUES ($1, $2, $3, 'Memoria Admin', $4, $5)`,
          [replyId, req.params.ticketId, admin.userId, message, internalNote]
        );
        await db.query(`UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2`, [newStatus, req.params.ticketId]);
      } else {
        const t = memTickets.find((x) => x.id === req.params.ticketId);
        if (t) t.status = newStatus;
        memTicketReplies.push({
          id: replyId,
          ticketId: req.params.ticketId,
          authorName: "Memoria Admin",
          message,
          internalNote,
          createdAt: new Date().toISOString(),
        });
      }
      await recordAuditLog({
        userId: admin.userId,
        action: "admin.ticket.replied",
        entityType: "support_ticket",
        entityId: req.params.ticketId,
        metadata: { newStatus },
      });
      return reply.status(201).send(createSuccessResponse({ ticketId: req.params.ticketId, replyId, status: newStatus }));
    }
  );

  app.get("/api/v1/admin/profile/security-keys", async (req: FastifyRequest, reply: FastifyReply) => {
    const admin = await requireAdminClaims(req);
    if (dbUrl) {
      const res = await db.query(
        `SELECT id, name, key_type as "keyType", credential_id as "credentialId", created_at::text as "createdAt"
         FROM user_security_keys WHERE user_id = $1 ORDER BY created_at DESC`,
        [admin.userId]
      );
      return reply.status(200).send(createSuccessResponse(res.rows));
    }
    return reply.status(200).send(createSuccessResponse(memSecurityKeys.filter((k) => k.userId === admin.userId)));
  });

  app.post(
    "/api/v1/admin/profile/webauthn/register",
    async (req: FastifyRequest<{ Body: { name: string; keyType?: string; credentialId?: string } }>, reply: FastifyReply) => {
      const admin = await requireAdminClaims(req);
      const name = req.body?.name?.trim() || "Hardware Security Key";
      const key = {
        id: crypto.randomUUID(),
        userId: admin.userId,
        name,
        keyType: req.body?.keyType || "fido2",
        credentialId: req.body?.credentialId || crypto.randomBytes(16).toString("hex"),
        publicKey: crypto.randomBytes(32).toString("base64"),
        createdAt: new Date().toISOString(),
      };
      if (dbUrl) {
        await db.query(
          `INSERT INTO user_security_keys (id, user_id, name, key_type, credential_id, public_key)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [key.id, key.userId, key.name, key.keyType, key.credentialId, key.publicKey]
        );
      } else {
        memSecurityKeys.unshift(key);
      }
      await recordAuditLog({
        userId: admin.userId,
        action: "admin.security_key.registered",
        entityType: "security_key",
        entityId: key.id,
        metadata: { name: key.name, keyType: key.keyType },
      });
      return reply.status(201).send(createSuccessResponse(key));
    }
  );

  app.delete(
    "/api/v1/admin/profile/security-keys/:keyId",
    async (req: FastifyRequest<{ Params: { keyId: string } }>, reply: FastifyReply) => {
      const admin = await requireAdminClaims(req);
      if (dbUrl) {
        const res = await db.query(`DELETE FROM user_security_keys WHERE id = $1 AND user_id = $2`, [req.params.keyId, admin.userId]);
        await recordAuditLog({
          userId: admin.userId,
          action: "admin.security_key.removed",
          entityType: "security_key",
          entityId: req.params.keyId,
        });
        return reply.status(200).send(createSuccessResponse({ deleted: (res.rowCount || 0) > 0 }));
      }
      const idx = memSecurityKeys.findIndex((k) => k.id === req.params.keyId && k.userId === admin.userId);
      if (idx >= 0) memSecurityKeys.splice(idx, 1);
      await recordAuditLog({
        userId: admin.userId,
        action: "admin.security_key.removed",
        entityType: "security_key",
        entityId: req.params.keyId,
      });
      return reply.status(200).send(createSuccessResponse({ deleted: idx >= 0 }));
    }
  );

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
