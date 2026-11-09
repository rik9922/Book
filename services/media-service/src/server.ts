import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import cors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import crypto from "node:crypto";
import path from "node:path";
import { createServiceLogger, Logger } from "@memory-capsule/logger";
import {
  CreateUploadSessionRequestSchema,
  MediaAsset,
  createSuccessResponse,
  createErrorResponse,
  createDomainEvent,
} from "@memory-capsule/contracts";
import { createEventBus, EventBus } from "@memory-capsule/events";
import { createJobManager, JobManager } from "@memory-capsule/jobs";
import { ObjectStorage } from "@memory-capsule/storage";
import {
  createDatabaseClient,
  DatabaseClient,
  PostgresMediaRepository,
  MediaRepository,
  SpaceQuota,
} from "@memory-capsule/database";

const logger: Logger = createServiceLogger("media-service");

// Zero-Budget Hard Quotas (no auto-scaling into paid services)
const MAX_SPACE_STORAGE_BYTES = 500 * 1024 * 1024; // 500 MB per free space
const MAX_SINGLE_FILE_BYTES = 50 * 1024 * 1024;    // 50 MB max per single file

// In-memory test repository for isolated unit test runs
class InMemoryMediaTestRepo implements MediaRepository {
  private assets = new Map<string, MediaAsset>();
  private quotas = new Map<string, number>();

  async createAsset(asset: MediaAsset): Promise<MediaAsset> {
    this.assets.set(asset.id, asset);
    return asset;
  }
  async findAssetById(id: string): Promise<MediaAsset | null> {
    return this.assets.get(id) || null;
  }
  async updateAsset(id: string, updates: Partial<MediaAsset>): Promise<MediaAsset | null> {
    const existing = this.assets.get(id);
    if (!existing) return null;
    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.assets.set(id, merged);
    return merged;
  }
  async listAssets(spaceId: string): Promise<MediaAsset[]> {
    return Array.from(this.assets.values()).filter((a) => a.spaceId === spaceId);
  }
  async getSpaceQuota(spaceId: string): Promise<SpaceQuota> {
    const used = this.quotas.get(spaceId) || 0;
    return { spaceId, usedBytes: used, maxBytes: MAX_SPACE_STORAGE_BYTES };
  }
  async incrementSpaceUsage(spaceId: string, bytesDelta: number): Promise<SpaceQuota> {
    const used = Math.max(0, (this.quotas.get(spaceId) || 0) + bytesDelta);
    this.quotas.set(spaceId, used);
    return { spaceId, usedBytes: used, maxBytes: MAX_SPACE_STORAGE_BYTES };
  }
}

export async function buildMediaService(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
    bodyLimit: 60 * 1024 * 1024, // 60MB for direct local streaming upload
  });

  // Enable binary payload parsing for direct file uploads
  app.addContentTypeParser(
    ["application/octet-stream", "image/png", "image/jpeg", "image/webp", "image/gif", "audio/mpeg", "video/mp4"],
    { parseAs: "buffer" },
    (req, body, done) => {
      done(null, body);
    }
  );

  const dbUrl = process.env.MEDIA_DATABASE_URL || process.env.DATABASE_URL;
  const db: DatabaseClient = createDatabaseClient(dbUrl);
  const eventBus: EventBus = await createEventBus();
  const jobManager: JobManager = createJobManager();
  const storage = new ObjectStorage();

  const mediaRepo: MediaRepository = dbUrl
    ? new PostgresMediaRepository(db)
    : new InMemoryMediaTestRepo();

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
  await app.register(fastifyJwt, { secret: jwtSecret });

  // Health check
  app.get("/health", async (req, reply) => {
    const isDbHealthy = await db.healthCheck();
    return reply.status(200).send(
      createSuccessResponse({
        service: "media-service",
        status: isDbHealthy ? "healthy" : "degraded",
        storagePolicy: "zero-budget-cardless",
        timestamp: new Date().toISOString(),
      })
    );
  });

  // Query space storage usage & quota
  app.get("/api/v1/media/spaces/:spaceId/quota", async (req: FastifyRequest<{ Params: { spaceId: string } }>, reply) => {
    const quota = await mediaRepo.getSpaceQuota(req.params.spaceId);
    const percentage = Math.round((quota.usedBytes / quota.maxBytes) * 100);

    return reply.status(200).send(
      createSuccessResponse({
        spaceId: req.params.spaceId,
        usedBytes: quota.usedBytes,
        maxBytes: quota.maxBytes,
        usedPercentage: percentage,
        isWarningThreshold: percentage >= 80,
        isQuotaExceeded: quota.usedBytes >= quota.maxBytes,
      })
    );
  });

  // 1. Request Direct-to-Storage Upload Session
  app.post("/api/v1/media/upload-session", async (req: FastifyRequest, reply: FastifyReply) => {
    const parseResult = CreateUploadSessionRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send(
        createErrorResponse("VALIDATION_ERROR", "Invalid upload session request", "corr", parseResult.error.issues)
      );
    }

    const { spaceId, fileName, mimeType, fileSizeBytes } = parseResult.data;

    // Strict Zero-Budget File Size Limits
    if (fileSizeBytes > MAX_SINGLE_FILE_BYTES) {
      return reply.status(413).send(
        createErrorResponse(
          "FILE_TOO_LARGE",
          `File size exceeds zero-cost limit of ${MAX_SINGLE_FILE_BYTES / (1024 * 1024)} MB.`
        )
      );
    }

    // Space Quota Check against database
    const quota = await mediaRepo.getSpaceQuota(spaceId);
    if (quota.usedBytes + fileSizeBytes > quota.maxBytes) {
      return reply.status(507).send(
        createErrorResponse(
          "QUOTA_EXCEEDED",
          "Space storage limit of 500 MB reached. Please export or remove unneeded media to preserve space."
        )
      );
    }

    const mediaId = crypto.randomUUID();
    const sanitizedFileName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageKey = `originals/${spaceId}/${mediaId}/${sanitizedFileName}`;

    let uploadUrl: string;
    try {
      uploadUrl = await storage.generateUploadUrl(storageKey, mimeType, 3600);
    } catch {
      uploadUrl = `http://localhost:4003/api/v1/media/local-upload?key=${encodeURIComponent(storageKey)}`;
    }

    const now = new Date().toISOString();
    const mediaAsset: MediaAsset = {
      id: mediaId,
      spaceId,
      originalName: fileName,
      mimeType,
      sizeBytes: fileSizeBytes,
      status: "pending_upload",
      storageKey,
      derivatives: {},
      metadata: {},
      createdAt: now,
      updatedAt: now,
    };

    await mediaRepo.createAsset(mediaAsset);

    return reply.status(201).send(
      createSuccessResponse({
        mediaId,
        uploadUrl,
        storageKey,
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        headers: {
          "Content-Type": mimeType,
        },
      })
    );
  });

  // Local storage upload target (100% free local development without S3)
  app.put("/api/v1/media/local-upload", async (req: FastifyRequest<{ Querystring: { key: string; contentType?: string } }>, reply) => {
    const rawKey = req.query.key;
    if (!rawKey) {
      return reply.status(400).send(createErrorResponse("MISSING_KEY", "Storage key is required"));
    }

    // Secure key against path traversal
    const key = path.normalize(rawKey).replace(/^(\.\.[\/\\])+/, "");
    if (key.includes("..")) {
      return reply.status(400).send(createErrorResponse("INVALID_KEY", "Path traversal detected"));
    }

    const rawBuffer = req.body as Buffer;
    if (!rawBuffer || rawBuffer.length === 0) {
      return reply.status(400).send(createErrorResponse("EMPTY_BODY", "No binary data received"));
    }

    await storage.saveObject(key, rawBuffer, req.query.contentType);
    return reply.status(200).send(createSuccessResponse({ saved: true, key, bytes: rawBuffer.length }));
  });

  // Serve Local Media Files
  app.get("/api/v1/media/files/*", async (req: FastifyRequest<{ Params: { "*": string } }>, reply) => {
    const rawKey = req.params["*"];
    const key = path.normalize(rawKey).replace(/^(\.\.[\/\\])+/, "");
    if (key.includes("..")) {
      return reply.status(400).send(createErrorResponse("INVALID_KEY", "Path traversal detected"));
    }

    try {
      const buffer = await storage.getObject(key);
      const ext = path.extname(key).toLowerCase();
      let contentType = "application/octet-stream";
      if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
      else if (ext === ".png") contentType = "image/png";
      else if (ext === ".webp") contentType = "image/webp";
      else if (ext === ".mp3") contentType = "audio/mpeg";
      else if (ext === ".mp4") contentType = "video/mp4";

      return reply.type(contentType).send(buffer);
    } catch {
      return reply.status(404).send(createErrorResponse("NOT_FOUND", "File not found"));
    }
  });

  // 2. Client confirms upload completed
  app.post("/api/v1/media/:id/complete", async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const asset = await mediaRepo.findAssetById(req.params.id);
    if (!asset) {
      return reply.status(404).send(createErrorResponse("MEDIA_NOT_FOUND", "Media record not found"));
    }

    // Atomically increment space storage usage
    await mediaRepo.incrementSpaceUsage(asset.spaceId, asset.sizeBytes);

    const updated = await mediaRepo.updateAsset(asset.id, {
      status: "processing",
    });

    // Publish media.uploaded domain event
    await eventBus.publish(
      "media.uploaded",
      createDomainEvent("media.uploaded", "media-service", {
        mediaId: asset.id,
        spaceId: asset.spaceId,
        storageKey: asset.storageKey,
        mimeType: asset.mimeType,
      })
    );

    // Enqueue background processing job
    await jobManager.addJob("media-processing", "generate-derivatives", {
      mediaId: asset.id,
      storageKey: asset.storageKey,
      mimeType: asset.mimeType,
    });

    return reply.status(200).send(createSuccessResponse(updated || asset));
  });

  // 3. Query Media Status / Details
  app.get("/api/v1/media/:id", async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const asset = await mediaRepo.findAssetById(req.params.id);
    if (!asset) {
      return reply.status(404).send(createErrorResponse("MEDIA_NOT_FOUND", "Media asset not found"));
    }
    return reply.status(200).send(createSuccessResponse(asset));
  });

  // List assets in space
  app.get("/api/v1/spaces/:spaceId/media", async (req: FastifyRequest<{ Params: { spaceId: string } }>, reply) => {
    const assets = await mediaRepo.listAssets(req.params.spaceId);
    return reply.status(200).send(createSuccessResponse(assets));
  });

  // Background worker for media processing
  jobManager.registerWorker("media-processing", async (job) => {
    const { mediaId, storageKey, mimeType } = job.data;
    logger.info({ mediaId, storageKey }, "[Worker] Processing media asset for derivatives");

    try {
      const asset = await mediaRepo.findAssetById(mediaId);
      if (!asset) return;

      let derivatives: Record<string, string> = {};
      let metadata: Record<string, any> = {};

      if (mimeType && mimeType.startsWith("image/")) {
        try {
          const originalBuffer = await storage.getObject(storageKey);
          const processed = await storage.processImageDerivatives(originalBuffer);

          const thumbSmKey = `derivatives/${mediaId}/thumb_sm.webp`;
          const thumbLgKey = `derivatives/${mediaId}/thumb_lg.webp`;

          await storage.saveObject(thumbSmKey, processed.thumbSmall, "image/webp");
          await storage.saveObject(thumbLgKey, processed.thumbLarge, "image/webp");

          derivatives = {
            thumb_sm: `http://localhost:4003/api/v1/media/files/${thumbSmKey}`,
            thumb_lg: `http://localhost:4003/api/v1/media/files/${thumbLgKey}`,
          };
          metadata = {
            width: processed.width,
            height: processed.height,
            format: "webp",
          };
        } catch (procErr) {
          logger.warn({ err: procErr }, "[Worker] Sharp derivative processing error");
        }
      }

      await mediaRepo.updateAsset(mediaId, {
        status: "ready",
        derivatives,
        metadata,
      });

      await eventBus.publish(
        "media.processed",
        createDomainEvent("media.processed", "media-service", {
          mediaId,
          derivatives,
          metadata,
        })
      );
      logger.info({ mediaId }, "[Worker] Media derivatives generated and persisted to database");
    } catch (workerErr) {
      logger.error({ err: workerErr, mediaId }, "[Worker] Fatal error in media worker");
    }
  });

  return app;
}
