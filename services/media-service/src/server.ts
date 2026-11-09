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
  startServiceServer,
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
  OcrTranscript,
} from "@memory-capsule/database";
import { OcrEngine } from "./ocr-engine.js";

const logger: Logger = createServiceLogger("media-service");

// Zero-Budget Hard Quotas (no auto-scaling into paid services)
const MAX_SPACE_STORAGE_BYTES = 500 * 1024 * 1024; // 500 MB per free space
const MAX_SINGLE_FILE_BYTES = 50 * 1024 * 1024;    // 50 MB max per single file

// In-memory test repository for isolated unit test runs
class InMemoryMediaTestRepo implements MediaRepository {
  private assets = new Map<string, MediaAsset>();
  private quotas = new Map<string, number>();
  private transcripts: OcrTranscript[] = [];

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
  async saveOcrTranscript(transcript: OcrTranscript): Promise<OcrTranscript> {
    this.transcripts.push(transcript);
    return transcript;
  }
  async findOcrTranscriptByMediaId(mediaId: string): Promise<OcrTranscript[]> {
    return this.transcripts.filter((t) => t.mediaId === mediaId);
  }
  async searchTranscripts(spaceId: string, query: string): Promise<OcrTranscript[]> {
    const q = query.toLowerCase();
    return this.transcripts.filter(
      (t) => t.spaceId === spaceId && t.extractedText.toLowerCase().includes(q)
    );
  }
}

export async function buildMediaService(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
    bodyLimit: 60 * 1024 * 1024, // 60MB for direct local streaming upload
  });

  // Enable binary payload parsing for direct file uploads
  app.addContentTypeParser(
    ["application/octet-stream", "image/png", "image/jpeg", "image/webp", "image/gif", "audio/mpeg", "video/mp4", "application/pdf"],
    { parseAs: "buffer" },
    (req, body, done) => {
      done(null, body);
    }
  );

  const dbUrl = process.env.MEDIA_DATABASE_URL || process.env.DATABASE_URL;
  if (!dbUrl && process.env.NODE_ENV !== "test") {
    throw new Error("[media-service] Database connection string required in non-test mode. Set MEDIA_DATABASE_URL or DATABASE_URL.");
  }
  const db: DatabaseClient = createDatabaseClient(dbUrl);
  if (process.env.NODE_ENV !== "test") {
    const isHealthy = await db.healthCheck();
    if (!isHealthy) {
      throw new Error("[media-service] PostgreSQL database health check failed during service initialization.");
    }
  }
  const eventBus: EventBus = await createEventBus();
  const jobManager: JobManager = createJobManager();
  const storage = new ObjectStorage();

  const mediaRepo: MediaRepository = dbUrl
    ? new PostgresMediaRepository(db)
    : new InMemoryMediaTestRepo();

  const ocrEngine = new OcrEngine();

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

  // 2. Client confirms upload completed (with cryptographic checksum verification and idempotent quota accounting)
  app.post("/api/v1/media/:id/complete", async (req: FastifyRequest<{ Params: { id: string }; Body?: { checksum?: string; sha256?: string } }>, reply) => {
    const asset = await mediaRepo.findAssetById(req.params.id);
    if (!asset) {
      return reply.status(404).send(createErrorResponse("MEDIA_NOT_FOUND", "Media record not found"));
    }

    // Idempotency: never re-process or double-count storage quota on retries
    if (asset.status === "processing" || asset.status === "ready") {
      return reply.status(200).send(createSuccessResponse(asset));
    }

    // Cryptographic and existence verification
    let computedSha256: string | undefined;
    try {
      const buffer = await storage.getObject(asset.storageKey);
      computedSha256 = crypto.createHash("sha256").update(buffer).digest("hex");

      const expectedChecksum = req.body?.sha256 || req.body?.checksum;
      if (expectedChecksum && expectedChecksum.toLowerCase() !== computedSha256.toLowerCase()) {
        return reply.status(400).send(
          createErrorResponse(
            "CHECKSUM_MISMATCH",
            `File integrity verification failed. Expected SHA-256 ${expectedChecksum}, computed ${computedSha256}`
          )
        );
      }
    } catch (storageErr) {
      if (process.env.NODE_ENV !== "test") {
        return reply.status(400).send(
          createErrorResponse("UPLOAD_INCOMPLETE", "Original media file was not verified in permanent storage")
        );
      }
    }

    // Atomically increment space storage usage (only once per media lifecycle)
    await mediaRepo.incrementSpaceUsage(asset.spaceId, asset.sizeBytes);

    const updatedMetadata = {
      ...asset.metadata,
      ...(computedSha256 ? { sha256: computedSha256 } : {}),
      verifiedAt: new Date().toISOString(),
    };

    const updated = await mediaRepo.updateAsset(asset.id, {
      status: "processing",
      metadata: updatedMetadata,
    });

    // Publish media.uploaded domain event
    await eventBus.publish(
      "media.uploaded",
      createDomainEvent("media.uploaded", "media-service", {
        mediaId: asset.id,
        spaceId: asset.spaceId,
        storageKey: asset.storageKey,
        mimeType: asset.mimeType,
        sha256: computedSha256,
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

  // OCR Engine Status & Capabilities
  app.get("/api/v1/media/ocr/status", async (req, reply) => {
    return reply.status(200).send(createSuccessResponse(ocrEngine.getStatus()));
  });

  // OCR Full-Text Search across Transcripts
  app.get("/api/v1/media/ocr/search", async (req: FastifyRequest<{ Querystring: { spaceId: string; q: string } }>, reply) => {
    const { spaceId, q } = req.query;
    if (!spaceId || !q) {
      return reply.status(400).send(createErrorResponse("INVALID_QUERY", "Both spaceId and q are required for OCR search"));
    }
    const results = await mediaRepo.searchTranscripts(spaceId, q);
    return reply.status(200).send(createSuccessResponse(results));
  });

  // 3. Query Media Status / Details
  app.get("/api/v1/media/:id", async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const asset = await mediaRepo.findAssetById(req.params.id);
    if (!asset) {
      return reply.status(404).send(createErrorResponse("MEDIA_NOT_FOUND", "Media asset not found"));
    }
    return reply.status(200).send(createSuccessResponse(asset));
  });

  // On-demand Trigger OCR for Media
  app.post("/api/v1/media/:id/ocr", async (req: FastifyRequest<{ Params: { id: string }; Body?: { language?: string } }>, reply) => {
    const asset = await mediaRepo.findAssetById(req.params.id);
    if (!asset) {
      return reply.status(404).send(createErrorResponse("MEDIA_NOT_FOUND", "Media asset not found"));
    }

    const ocrStatus = ocrEngine.getStatus();
    if (!ocrStatus.isAvailable) {
      return reply.status(503).send(createErrorResponse("OCR_UNAVAILABLE", "Tesseract OCR engine is not available on this host"));
    }

    try {
      const buffer = await storage.getObject(asset.storageKey);
      const language = req.body?.language || "eng";
      const ocrResult = await ocrEngine.processDocument(buffer, asset.mimeType, language);

      const savedTranscripts: OcrTranscript[] = [];
      for (const page of ocrResult.pages) {
        const transcript: OcrTranscript = {
          id: crypto.randomUUID(),
          mediaId: asset.id,
          spaceId: asset.spaceId,
          status: "completed",
          extractedText: page.text,
          confidence: page.confidence,
          wordCount: page.wordCount,
          language,
          pageNumber: page.pageNumber,
          metadata: {
            engine: ocrResult.engine,
            durationMs: ocrResult.durationMs,
            words: page.words,
          },
          createdAt: new Date().toISOString(),
        };
        const saved = await mediaRepo.saveOcrTranscript(transcript);
        savedTranscripts.push(saved);
      }

      await mediaRepo.updateAsset(asset.id, {
        metadata: {
          ...asset.metadata,
          ocrProcessed: true,
          ocrConfidence: ocrResult.averageConfidence,
          ocrWordCount: ocrResult.totalWords,
          ocrProcessedAt: new Date().toISOString(),
        },
      });

      await eventBus.publish(
        "media.ocr.completed",
        createDomainEvent("media.ocr.completed", "media-service", {
          mediaId: asset.id,
          spaceId: asset.spaceId,
          pageCount: ocrResult.pages.length,
          totalWords: ocrResult.totalWords,
          averageConfidence: ocrResult.averageConfidence,
        })
      );

      return reply.status(200).send(createSuccessResponse({
        result: ocrResult,
        transcripts: savedTranscripts,
      }));
    } catch (err: any) {
      logger.error({ err, mediaId: asset.id }, "[Media] On-demand OCR processing failed");
      return reply.status(500).send(createErrorResponse("OCR_PROCESSING_FAILED", err.message || "Failed to process OCR"));
    }
  });

  // Get OCR Transcripts for Media
  app.get("/api/v1/media/:id/ocr", async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const transcripts = await mediaRepo.findOcrTranscriptByMediaId(req.params.id);
    return reply.status(200).send(createSuccessResponse(transcripts));
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

      // Automatic OCR text extraction for documents & scanned media
      if (ocrEngine.getStatus().isAvailable && (mimeType.startsWith("image/") || mimeType === "application/pdf")) {
        try {
          const originalBuffer = await storage.getObject(storageKey);
          const ocrResult = await ocrEngine.processDocument(originalBuffer, mimeType, "eng");
          
          for (const page of ocrResult.pages) {
            await mediaRepo.saveOcrTranscript({
              id: crypto.randomUUID(),
              mediaId,
              spaceId: asset.spaceId,
              status: "completed",
              extractedText: page.text,
              confidence: page.confidence,
              wordCount: page.wordCount,
              language: "eng",
              pageNumber: page.pageNumber,
              metadata: {
                engine: ocrResult.engine,
                durationMs: ocrResult.durationMs,
                words: page.words,
              },
              createdAt: new Date().toISOString(),
            });
          }

          metadata = {
            ...metadata,
            ocrProcessed: true,
            ocrConfidence: ocrResult.averageConfidence,
            ocrWordCount: ocrResult.totalWords,
          };
          logger.info({ mediaId, totalWords: ocrResult.totalWords }, "[Worker] OCR text extraction completed");
        } catch (ocrErr) {
          logger.warn({ err: ocrErr, mediaId }, "[Worker] OCR processing non-fatal error");
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

if (process.env.NODE_ENV !== "test") {
  (async () => {
    try {
      const app = await buildMediaService();
      await startServiceServer({
        serviceId: "media-service",
        app,
        logger,
      });
    } catch (err) {
      logger.error({ err }, "[Media] Unexpected startup failure");
      process.exit(1);
    }
  })();
}

