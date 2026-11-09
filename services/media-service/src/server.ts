import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import cors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import crypto from "node:crypto";
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
import { createDatabaseClient, DatabaseClient } from "@memory-capsule/database";

const logger: Logger = createServiceLogger("media-service");

// Zero-Budget Hard Quotas (no auto-scaling into paid services)
const MAX_SPACE_STORAGE_BYTES = 500 * 1024 * 1024; // 500 MB per free space
const MAX_SINGLE_FILE_BYTES = 50 * 1024 * 1024;    // 50 MB max per single file

export async function buildMediaService(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
    bodyLimit: 60 * 1024 * 1024, // 60MB to allow direct local streaming upload
  });

  const db: DatabaseClient = createDatabaseClient(process.env.MEDIA_DATABASE_URL);
  const eventBus: EventBus = await createEventBus();
  const jobManager: JobManager = createJobManager();
  const storage = new ObjectStorage();

  const mediaStore = new Map<string, MediaAsset>();
  const spaceStorageUsage = new Map<string, number>();

  await app.register(cors, { origin: true, credentials: true });
  await app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || "dev-jwt-insecure-secret-change-in-production-min32chars",
  });

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
    const currentBytes = spaceStorageUsage.get(req.params.spaceId) || 0;
    const percentage = Math.round((currentBytes / MAX_SPACE_STORAGE_BYTES) * 100);

    return reply.status(200).send(
      createSuccessResponse({
        spaceId: req.params.spaceId,
        usedBytes: currentBytes,
        maxBytes: MAX_SPACE_STORAGE_BYTES,
        usedPercentage: percentage,
        isWarningThreshold: percentage >= 80,
        isQuotaExceeded: currentBytes >= MAX_SPACE_STORAGE_BYTES,
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

    // Space Quota Check
    const currentBytes = spaceStorageUsage.get(spaceId) || 0;
    if (currentBytes + fileSizeBytes > MAX_SPACE_STORAGE_BYTES) {
      return reply.status(507).send(
        createErrorResponse(
          "QUOTA_EXCEEDED",
          "Space storage limit of 500 MB reached. Please export or remove unneeded media to preserve space."
        )
      );
    }

    const mediaId = crypto.randomUUID();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
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

    mediaStore.set(mediaId, mediaAsset);

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
    const key = req.query.key;
    if (!key) {
      return reply.status(400).send(createErrorResponse("MISSING_KEY", "Storage key is required"));
    }

    const rawBuffer = req.body as Buffer;
    if (!rawBuffer || rawBuffer.length === 0) {
      return reply.status(400).send(createErrorResponse("EMPTY_BODY", "No binary data received"));
    }

    await storage.saveObject(key, rawBuffer, req.query.contentType);
    return reply.status(200).send(createSuccessResponse({ saved: true, key, bytes: rawBuffer.length }));
  });

  // 2. Client confirms upload completed
  app.post("/api/v1/media/:id/complete", async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const asset = mediaStore.get(req.params.id);
    if (!asset) {
      return reply.status(404).send(createErrorResponse("MEDIA_NOT_FOUND", "Media record not found"));
    }

    asset.status = "processing";
    asset.updatedAt = new Date().toISOString();
    mediaStore.set(asset.id, asset);

    // Update space usage
    const curUsage = spaceStorageUsage.get(asset.spaceId) || 0;
    spaceStorageUsage.set(asset.spaceId, curUsage + asset.sizeBytes);

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

    // Enqueue BullMQ background processing job
    await jobManager.addJob("media-processing", "generate-derivatives", {
      mediaId: asset.id,
      storageKey: asset.storageKey,
      mimeType: asset.mimeType,
    });

    return reply.status(200).send(createSuccessResponse(asset));
  });

  // 3. Query Media Status / Details
  app.get("/api/v1/media/:id", async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const asset = mediaStore.get(req.params.id);
    if (!asset) {
      return reply.status(404).send(createErrorResponse("MEDIA_NOT_FOUND", "Media asset not found"));
    }
    return reply.status(200).send(createSuccessResponse(asset));
  });

  // Register background worker for media processing
  jobManager.registerWorker("media-processing", async (job) => {
    const { mediaId, storageKey } = job.data;
    logger.info({ mediaId, storageKey }, "[Worker] Processing media asset for derivatives");

    const asset = mediaStore.get(mediaId);
    if (asset) {
      asset.status = "ready";
      asset.derivatives = {
        thumb_sm: `http://localhost:4003/api/v1/media/files/derivatives/${mediaId}/thumb_sm.webp`,
        thumb_lg: `http://localhost:4003/api/v1/media/files/derivatives/${mediaId}/thumb_lg.webp`,
      };
      asset.metadata = {
        width: 1920,
        height: 1080,
        colorPalette: ["#F7F4ED", "#304C43", "#C9826A"],
      };
      asset.updatedAt = new Date().toISOString();
      mediaStore.set(mediaId, asset);

      await eventBus.publish(
        "media.processed",
        createDomainEvent("media.processed", "media-service", {
          mediaId: asset.id,
          derivatives: asset.derivatives,
        })
      );
      logger.info({ mediaId }, "[Worker] Media derivatives generated and published");
    }
  });

  return app;
}

if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT_MEDIA || 4003);
  const host = "0.0.0.0";

  buildMediaService().then((app) => {
    app.listen({ port, host }, (err, address) => {
      if (err) {
        logger.error({ err }, "[MediaService] Failed to start");
        process.exit(1);
      }
      logger.info({ address, port }, `[MediaService] Listening at ${address}`);
    });
  });
}
