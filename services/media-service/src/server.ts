import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import cors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import crypto from "node:crypto";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { createWriteStream, existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createServiceLogger, Logger } from "@memory-capsule/logger";
import {
  BaseServiceConfigSchema,
  validateServiceConfig,
  createFastifyErrorHandler,
  UnauthorizedError,
  ForbiddenError,
  verifyMediaSignedToken,
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
  PostgresSpaceRepository,
  PostgresCollaborationRepository,
  PostgresOutboxRepository,
  MediaRepository,
  SpaceRepository,
  CollaborationRepository,
  OutboxRepository,
  SpaceQuota,
  OcrTranscript,
} from "@memory-capsule/database";
import { OcrEngine } from "./ocr-engine.js";

const execFileAsync = promisify(execFile);
const logger: Logger = createServiceLogger("media-service");

// Zero-Budget Hard Quotas (no auto-scaling into paid services)
const MAX_SPACE_STORAGE_BYTES = 500 * 1024 * 1024; // 500 MB per free space
const MAX_SINGLE_FILE_BYTES = 50 * 1024 * 1024; // 50 MB max per single file

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/m4a",
  "video/mp4",
  "video/quicktime",
  "application/pdf",
]);

function discoverBinary(candidates: string[]): string | null {
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

const FFMPEG_PATH = discoverBinary(["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg", "/usr/bin/ffmpeg"]);
const FFPROBE_PATH = discoverBinary(["/opt/homebrew/bin/ffprobe", "/usr/local/bin/ffprobe", "/usr/bin/ffprobe"]);

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
  const cfg = validateServiceConfig(BaseServiceConfigSchema);
  const app = Fastify({
    logger: false,
    bodyLimit: 60 * 1024 * 1024, // 60MB streaming upload cap
  });
  app.setErrorHandler(createFastifyErrorHandler(logger));

  // Stream binary payloads directly without buffering into V8 heap
  app.addContentTypeParser(
    [
      "application/octet-stream",
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
      "image/heic",
      "audio/mpeg",
      "audio/mp4",
      "audio/wav",
      "audio/m4a",
      "video/mp4",
      "video/quicktime",
      "application/pdf",
    ],
    (_req, payload, done) => {
      done(null, payload);
    }
  );

  const dbUrl = cfg.MEDIA_DATABASE_URL || cfg.DATABASE_URL;
  if (!dbUrl && cfg.NODE_ENV !== "test") {
    throw new Error(
      "[media-service] Database connection string required in non-test mode. Set MEDIA_DATABASE_URL or DATABASE_URL."
    );
  }
  const db: DatabaseClient = createDatabaseClient(dbUrl);
  if (cfg.NODE_ENV !== "test") {
    const isHealthy = await db.healthCheck();
    if (!isHealthy) {
      throw new Error(
        "[media-service] PostgreSQL database health check failed during service initialization."
      );
    }
  }
  const eventBus: EventBus = await createEventBus(cfg.NATS_URL);
  const jobManager: JobManager = createJobManager(cfg.REDIS_URL);
  const signingSecret = cfg.SESSION_SECRET || cfg.JWT_SECRET;
  const storage = new ObjectStorage({ signingSecret });

  const mediaRepo: MediaRepository = dbUrl
    ? new PostgresMediaRepository(db)
    : new InMemoryMediaTestRepo();
  const outboxRepo: OutboxRepository | null = dbUrl ? new PostgresOutboxRepository(db) : null;

  const memoryDb: DatabaseClient | null = cfg.MEMORY_DATABASE_URL
    ? createDatabaseClient(cfg.MEMORY_DATABASE_URL)
    : null;
  const spaceRepo: SpaceRepository | null = memoryDb ? new PostgresSpaceRepository(memoryDb) : null;

  const collabDb: DatabaseClient | null = cfg.COLLAB_DATABASE_URL
    ? createDatabaseClient(cfg.COLLAB_DATABASE_URL)
    : null;
  const collabRepo: CollaborationRepository | null = collabDb
    ? new PostgresCollaborationRepository(collabDb)
    : null;

  const ocrEngine = new OcrEngine();

  let outboxTimer: NodeJS.Timeout | null = null;
  if (outboxRepo && outboxRepo.relayPending) {
    outboxTimer = setInterval(() => {
      outboxRepo
        .relayPending!(async (evt) => {
          await eventBus.publish(
            evt.eventType,
            createDomainEvent(evt.eventType, "media-service", evt.payload)
          );
        })
        .catch((err) => {
          logger.warn({ err }, "[Media Outbox] Relay cycle warning");
        });
    }, 1000);
    outboxTimer.unref();
  }

  app.addHook("onClose", async () => {
    if (outboxTimer) clearInterval(outboxTimer);
    await jobManager.close().catch((err) => logger.warn({ err }, "[Media] JobManager close warning"));
    await eventBus.close().catch((err) => logger.warn({ err }, "[Media] EventBus close warning"));
    if (memoryDb) {
      await memoryDb.close().catch((err) => logger.warn({ err }, "[Media] Memory DB close warning"));
    }
    if (collabDb) {
      await collabDb.close().catch((err) => logger.warn({ err }, "[Media] Collab DB close warning"));
    }
    await db.close().catch((err) => logger.warn({ err }, "[Media] DB close warning"));
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

  async function requireAuthUser(req: FastifyRequest): Promise<string> {
    try {
      const claims: any = await req.jwtVerify();
      const userId = claims?.sub || claims?.userId;
      if (!userId || typeof userId !== "string") {
        throw new UnauthorizedError("Missing subject in JWT");
      }
      return userId;
    } catch {
      throw new UnauthorizedError("Valid authentication token required");
    }
  }

  async function assertSpaceAccess(
    spaceId: string,
    userId: string,
    requireWrite = false
  ): Promise<void> {
    if (!spaceRepo && !collabRepo) {
      return;
    }
    if (spaceRepo) {
      const space = await spaceRepo.findSpaceById(spaceId);
      if (space) {
        if (space.ownerId === userId) {
          return;
        }
        if (collabRepo) {
          const member = await collabRepo.getMember(spaceId, userId);
          if (member) {
            if (requireWrite && member.role === "viewer") {
              throw new ForbiddenError("Viewer role does not permit media uploads");
            }
            return;
          }
        }
        throw new ForbiddenError("Access denied for this memory space");
      }
    }
    if (collabRepo) {
      const member = await collabRepo.getMember(spaceId, userId);
      if (member) {
        if (requireWrite && member.role === "viewer") {
          throw new ForbiddenError("Viewer role does not permit media uploads");
        }
        return;
      }
    }
    throw new ForbiddenError("Space not found or access denied");
  }

  async function publishDomainEvent(
    subject: string,
    eventType: string,
    aggregateId: string,
    payload: Record<string, any>
  ): Promise<void> {
    if (outboxRepo) {
      await outboxRepo.stageEvent({
        eventType: subject,
        aggregateType: "media",
        aggregateId,
        payload,
      });
      if (outboxRepo.relayPending) {
        await outboxRepo.relayPending(async (evt) => {
          await eventBus.publish(
            evt.eventType,
            createDomainEvent(eventType, "media-service", evt.payload)
          );
        });
      }
    } else {
      await eventBus.publish(subject, createDomainEvent(eventType, "media-service", payload));
    }
  }

  const ocrInFlight = new Map<string, Promise<{ ocrResult: any; savedTranscripts: OcrTranscript[] }>>();

  async function runOcrForAsset(asset: MediaAsset, language = "eng", force = false) {
    const dedupKey = `${asset.id}_${language}`;
    const existingPromise = ocrInFlight.get(dedupKey);
    if (existingPromise) {
      return existingPromise;
    }

    const work = (async () => {
      if (!force) {
        const existingTranscripts = await mediaRepo.findOcrTranscriptByMediaId(asset.id);
        const matching = existingTranscripts.filter((t) => t.language === language && t.status === "completed");
        if (matching.length > 0) {
          const totalWords = matching.reduce((sum, t) => sum + (t.wordCount || 0), 0);
          const avgConf =
            matching.reduce((sum, t) => sum + Number(t.confidence || 0), 0) / matching.length;
          return {
            ocrResult: {
              engine: (matching[0].metadata as any)?.engine || "tesseract",
              durationMs: 0,
              pages: matching.map((m) => ({
                pageNumber: m.pageNumber,
                text: m.extractedText,
                confidence: Number(m.confidence),
                wordCount: m.wordCount,
                words: (m.metadata as any)?.words || [],
              })),
              totalWords,
              averageConfidence: avgConf,
            },
            savedTranscripts: matching,
          };
        }
      }

      const buffer = await storage.getObject(asset.storageKey);
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

      const latestAsset = (await mediaRepo.findAssetById(asset.id)) || asset;
      await mediaRepo.updateAsset(asset.id, {
        metadata: {
          ...latestAsset.metadata,
          ocrProcessed: true,
          ocrStatus: "completed",
          ocrConfidence: ocrResult.averageConfidence,
          ocrWordCount: ocrResult.totalWords,
          ocrProcessedAt: new Date().toISOString(),
        },
      });

      await publishDomainEvent("media.ocr.completed", "media.ocr.completed", asset.id, {
        mediaId: asset.id,
        spaceId: asset.spaceId,
        pageCount: ocrResult.pages.length,
        totalWords: ocrResult.totalWords,
        averageConfidence: ocrResult.averageConfidence,
      });

      return { ocrResult, savedTranscripts };
    })();

    ocrInFlight.set(dedupKey, work);
    try {
      return await work;
    } finally {
      ocrInFlight.delete(dedupKey);
    }
  }

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
  app.get(
    "/api/v1/media/spaces/:spaceId/quota",
    async (req: FastifyRequest<{ Params: { spaceId: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      await assertSpaceAccess(req.params.spaceId, userId, false);
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
    }
  );

  // 1. Request Direct-to-Storage Upload Session (Signed URL + MIME Allowlist)
  app.post("/api/v1/media/upload-session", async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = await requireAuthUser(req);
    const parseResult = CreateUploadSessionRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send(
        createErrorResponse(
          "VALIDATION_ERROR",
          "Invalid upload session request",
          "corr",
          parseResult.error.issues
        )
      );
    }

    const { spaceId, fileName, mimeType, fileSizeBytes } = parseResult.data;
    await assertSpaceAccess(spaceId, userId, true);

    const headerIdempotencyKey =
      typeof req.headers["idempotency-key"] === "string"
        ? req.headers["idempotency-key"].trim()
        : undefined;
    const idempotencyKey = parseResult.data.idempotencyKey || headerIdempotencyKey || undefined;
    const normalizedMime = mimeType.toLowerCase().trim();

    if (idempotencyKey && mediaRepo.findAssetByIdempotencyKey) {
      const existing = await mediaRepo.findAssetByIdempotencyKey(spaceId, idempotencyKey);
      if (existing) {
        const uploadUrl = await storage.generateUploadUrl(existing.storageKey, existing.mimeType, 3600);
        return reply.status(200).send(
          createSuccessResponse({
            mediaId: existing.id,
            uploadUrl,
            storageKey: existing.storageKey,
            expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
            status: existing.status,
            headers: {
              "Content-Type": existing.mimeType,
            },
          })
        );
      }
    }

    // Strict Zero-Budget File Size Limits
    if (fileSizeBytes > MAX_SINGLE_FILE_BYTES) {
      return reply.status(413).send(
        createErrorResponse(
          "FILE_TOO_LARGE",
          `File size exceeds zero-cost limit of ${MAX_SINGLE_FILE_BYTES / (1024 * 1024)} MB.`
        )
      );
    }

    // Strict MIME Allowlist
    if (!ALLOWED_MIME_TYPES.has(normalizedMime)) {
      return reply.status(415).send(
        createErrorResponse(
          "UNSUPPORTED_MEDIA_TYPE",
          `MIME type '${mimeType}' is not permitted for archival upload.`
        )
      );
    }

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

    const uploadUrl = await storage.generateUploadUrl(storageKey, normalizedMime, 3600);

    const now = new Date().toISOString();
    const mediaAsset: MediaAsset = {
      id: mediaId,
      spaceId,
      originalName: fileName,
      mimeType: normalizedMime,
      sizeBytes: fileSizeBytes,
      status: "pending_upload",
      storageKey,
      derivatives: {},
      metadata: {},
      idempotencyKey,
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
          "Content-Type": normalizedMime,
        },
      })
    );
  });

  // Streaming Local Storage Upload Target (HMAC-signed URL required)
  app.put(
    "/api/v1/media/local-upload",
    async (
      req: FastifyRequest<{
        Querystring: { key: string; contentType?: string; expires?: string; sig?: string };
      }>,
      reply
    ) => {
      const { key: rawKey, expires, sig } = req.query;
      if (!rawKey) {
        return reply.status(400).send(createErrorResponse("MISSING_KEY", "Storage key is required"));
      }

      const key = path.posix.normalize(rawKey.replace(/\\/g, "/"));
      if (key.startsWith("/") || key.includes("..")) {
        return reply.status(400).send(createErrorResponse("INVALID_KEY", "Path traversal detected"));
      }

      const expiresEpoch = expires ? parseInt(expires, 10) : NaN;
      const hasValidSig =
        sig &&
        verifyMediaSignedToken(
          { action: "upload", key, expiresAtEpochSec: expiresEpoch, signature: sig },
          signingSecret
        );

      if (!hasValidSig) {
        return reply
          .status(401)
          .send(createErrorResponse("INVALID_SIGNATURE", "Signed upload token is missing, invalid, or expired"));
      }

      const bodyStream = req.body as Readable | Buffer;
      let bytesWritten = 0;

      if (Buffer.isBuffer(bodyStream)) {
        if (bodyStream.length === 0) {
          return reply.status(400).send(createErrorResponse("EMPTY_BODY", "No binary data received"));
        }
        await storage.saveObject(key, bodyStream, req.query.contentType);
        bytesWritten = bodyStream.length;
      } else if (bodyStream && typeof (bodyStream as Readable).pipe === "function") {
        bytesWritten = await storage.saveStream(key, bodyStream as Readable, MAX_SINGLE_FILE_BYTES);
        if (bytesWritten === 0) {
          await storage.deleteObject(key);
          return reply.status(400).send(createErrorResponse("EMPTY_BODY", "No binary data received"));
        }
      } else {
        return reply.status(400).send(createErrorResponse("EMPTY_BODY", "No binary stream received"));
      }

      return reply.status(200).send(createSuccessResponse({ saved: true, key, bytes: bytesWritten }));
    }
  );

  // Serve Local Media Files with Signed URL or Bearer JWT + HTTP 206 Range Support
  app.get(
    "/api/v1/media/files/*",
    async (
      req: FastifyRequest<{
        Params: { "*": string };
        Querystring: { expires?: string; sig?: string };
      }>,
      reply
    ) => {
      const rawKey = req.params["*"];
      const key = path.posix.normalize(rawKey.replace(/\\/g, "/"));
      if (key.startsWith("/") || key.includes("..")) {
        return reply.status(400).send(createErrorResponse("INVALID_KEY", "Path traversal detected"));
      }

      const expiresEpoch = req.query.expires ? parseInt(req.query.expires, 10) : NaN;
      const hasValidSig =
        req.query.sig &&
        verifyMediaSignedToken(
          { action: "download", key, expiresAtEpochSec: expiresEpoch, signature: req.query.sig },
          signingSecret
        );

      if (!hasValidSig) {
        // Fallback: allow authenticated Bearer JWT requests
        await requireAuthUser(req);
      }

      const stat = await storage.verifyObjectExists(key);
      if (!stat.exists || stat.sizeBytes === undefined) {
        return reply.status(404).send(createErrorResponse("NOT_FOUND", "File not found"));
      }

      const ext = path.extname(key).toLowerCase();
      let contentType = "application/octet-stream";
      if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
      else if (ext === ".png") contentType = "image/png";
      else if (ext === ".webp") contentType = "image/webp";
      else if (ext === ".gif") contentType = "image/gif";
      else if (ext === ".mp3") contentType = "audio/mpeg";
      else if (ext === ".m4a") contentType = "audio/mp4";
      else if (ext === ".wav") contentType = "audio/wav";
      else if (ext === ".mp4") contentType = "video/mp4";
      else if (ext === ".mov") contentType = "video/quicktime";
      else if (ext === ".pdf") contentType = "application/pdf";

      const totalSize = stat.sizeBytes;
      const rangeHeader = req.headers.range;
      reply.header("Accept-Ranges", "bytes");

      if (rangeHeader && rangeHeader.startsWith("bytes=")) {
        const [startStr, endStr] = rangeHeader.replace("bytes=", "").split("-");
        const start = startStr ? parseInt(startStr, 10) : 0;
        const end = endStr ? Math.min(parseInt(endStr, 10), totalSize - 1) : totalSize - 1;

        if (Number.isNaN(start) || Number.isNaN(end) || start < 0 || start > end || end >= totalSize) {
          reply.header("Content-Range", `bytes */${totalSize}`);
          return reply.status(416).send(createErrorResponse("RANGE_NOT_SATISFIABLE", "Requested range not satisfiable"));
        }

        const chunkLength = end - start + 1;
        const { stream } = await storage.getObjectStream(key, { start, end });
        reply.header("Content-Range", `bytes ${start}-${end}/${totalSize}`);
        reply.header("Content-Length", chunkLength);
        return reply.status(206).type(contentType).send(stream);
      }

      const { stream } = await storage.getObjectStream(key);
      reply.header("Content-Length", totalSize);
      return reply.status(200).type(contentType).send(stream);
    }
  );

  // 2. Client confirms upload completed (strict verification, zero test bypass)
  app.post(
    "/api/v1/media/:id/complete",
    async (
      req: FastifyRequest<{ Params: { id: string }; Body?: { checksum?: string; sha256?: string } }>,
      reply
    ) => {
      const userId = await requireAuthUser(req);
      const asset = await mediaRepo.findAssetById(req.params.id);
      if (!asset) {
        return reply.status(404).send(createErrorResponse("MEDIA_NOT_FOUND", "Media record not found"));
      }
      await assertSpaceAccess(asset.spaceId, userId, true);

      if (
        asset.status === "original_verified" ||
        asset.status === "processing" ||
        asset.status === "ready" ||
        asset.status === "completed_partial"
      ) {
        return reply.status(200).send(createSuccessResponse(asset));
      }

      const existence = await storage.verifyObjectExists(asset.storageKey);
      if (!existence.exists) {
        return reply
          .status(400)
          .send(
            createErrorResponse(
              "UPLOAD_INCOMPLETE",
              "Original media file was not verified in permanent storage"
            )
          );
      }

      const computedSha256 = await storage.computeSha256(asset.storageKey);
      const expectedChecksum = req.body?.sha256 || req.body?.checksum;
      if (expectedChecksum && expectedChecksum.toLowerCase() !== computedSha256.toLowerCase()) {
        return reply.status(400).send(
          createErrorResponse(
            "CHECKSUM_MISMATCH",
            `File integrity verification failed. Expected SHA-256 ${expectedChecksum}, computed ${computedSha256}`
          )
        );
      }

      await mediaRepo.incrementSpaceUsage(asset.spaceId, existence.sizeBytes ?? asset.sizeBytes);

      const updatedMetadata = {
        ...asset.metadata,
        sha256: computedSha256,
        originalVerified: true,
        verifiedAt: new Date().toISOString(),
      };

      const updated = await mediaRepo.updateAsset(asset.id, {
        status: "processing",
        metadata: updatedMetadata,
      });

      await publishDomainEvent("media.uploaded", "media.uploaded", asset.id, {
        mediaId: asset.id,
        spaceId: asset.spaceId,
        storageKey: asset.storageKey,
        mimeType: asset.mimeType,
        sha256: computedSha256,
      });

      await jobManager.addJob(
        "media-processing",
        "generate-derivatives",
        {
          mediaId: asset.id,
          storageKey: asset.storageKey,
          mimeType: asset.mimeType,
        },
        { jobId: `proc_${asset.id}` }
      );

      return reply.status(200).send(createSuccessResponse(updated || asset));
    }
  );

  // OCR Engine Status & Capabilities
  app.get("/api/v1/media/ocr/status", async (req, reply) => {
    return reply.status(200).send(createSuccessResponse(ocrEngine.getStatus()));
  });

  // OCR Full-Text Search across Transcripts
  app.get(
    "/api/v1/media/ocr/search",
    async (req: FastifyRequest<{ Querystring: { spaceId: string; q: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      const { spaceId, q } = req.query;
      if (!spaceId || !q) {
        return reply
          .status(400)
          .send(createErrorResponse("INVALID_QUERY", "Both spaceId and q are required for OCR search"));
      }
      await assertSpaceAccess(spaceId, userId, false);
      const results = await mediaRepo.searchTranscripts(spaceId, q);
      return reply.status(200).send(createSuccessResponse(results));
    }
  );

  // 3. Query Media Status / Details (with signed download URLs)
  app.get("/api/v1/media/:id", async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const userId = await requireAuthUser(req);
    const asset = await mediaRepo.findAssetById(req.params.id);
    if (!asset) {
      return reply.status(404).send(createErrorResponse("MEDIA_NOT_FOUND", "Media asset not found"));
    }
    await assertSpaceAccess(asset.spaceId, userId, false);
    const signedOriginalUrl = await storage.generateDownloadUrl(asset.storageKey, 3600);
    return reply.status(200).send(
      createSuccessResponse({
        ...asset,
        publicUrl: signedOriginalUrl,
      })
    );
  });

  // On-demand Trigger OCR for Media (queues asynchronously via BullMQ; ?sync=true optional)
  app.post(
    "/api/v1/media/:id/ocr",
    async (
      req: FastifyRequest<{
        Params: { id: string };
        Querystring: { sync?: string };
        Body?: { language?: string };
      }>,
      reply
    ) => {
      const userId = await requireAuthUser(req);
      const asset = await mediaRepo.findAssetById(req.params.id);
      if (!asset) {
        return reply.status(404).send(createErrorResponse("MEDIA_NOT_FOUND", "Media asset not found"));
      }
      await assertSpaceAccess(asset.spaceId, userId, true);

      const ocrStatus = ocrEngine.getStatus();
      if (!ocrStatus.isAvailable) {
        return reply
          .status(503)
          .send(createErrorResponse("OCR_UNAVAILABLE", "Tesseract OCR engine is not available on this host"));
      }

      const language = req.body?.language || "eng";

      if (req.query.sync === "true") {
        const { ocrResult, savedTranscripts } = await runOcrForAsset(asset, language);
        return reply.status(200).send(
          createSuccessResponse({
            status: "completed",
            result: ocrResult,
            transcripts: savedTranscripts,
          })
        );
      }

      await jobManager.addJob(
        "media-ocr",
        "extract-ocr",
        {
          mediaId: asset.id,
          language,
        },
        { jobId: `ocr_${asset.id}_${language}` }
      );

      return reply.status(202).send(
        createSuccessResponse({
          mediaId: asset.id,
          status: "queued",
          language,
        })
      );
    }
  );

  // Get OCR Transcripts for Media
  app.get("/api/v1/media/:id/ocr", async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const userId = await requireAuthUser(req);
    const asset = await mediaRepo.findAssetById(req.params.id);
    if (!asset) {
      return reply.status(404).send(createErrorResponse("MEDIA_NOT_FOUND", "Media asset not found"));
    }
    await assertSpaceAccess(asset.spaceId, userId, false);
    const transcripts = await mediaRepo.findOcrTranscriptByMediaId(req.params.id);
    return reply.status(200).send(createSuccessResponse(transcripts));
  });

  // List assets in space
  app.get(
    "/api/v1/spaces/:spaceId/media",
    async (req: FastifyRequest<{ Params: { spaceId: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      await assertSpaceAccess(req.params.spaceId, userId, false);
      const assets = await mediaRepo.listAssets(req.params.spaceId);
      return reply.status(200).send(createSuccessResponse(assets));
    }
  );

  // Active & Pending Upload Sessions (PWA-41 / PWA-42 / IOS-21)
  app.get(
    "/api/v1/media/upload-sessions/active",
    async (req: FastifyRequest<{ Querystring: { spaceId?: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      const activeStatuses = [
        "pending_upload",
        "original_verified",
        "processing",
        "failed",
        "retryable_failure",
        "permanent_failure",
      ];
      if (req.query.spaceId) {
        await assertSpaceAccess(req.query.spaceId, userId, false);
        const assets = await mediaRepo.listAssets(req.query.spaceId);
        return reply.status(200).send(
          createSuccessResponse(assets.filter((a) => activeStatuses.includes(a.status)))
        );
      }
      if (dbUrl) {
        const authorizedSpaceIds = new Set<string>();
        if (memoryDb) {
          const ownedRes = await memoryDb.query<{ id: string }>(
            `SELECT id FROM memory_spaces WHERE owner_id = $1 AND deleted_at IS NULL`,
            [userId]
          );
          for (const row of ownedRes.rows) authorizedSpaceIds.add(row.id);
        }
        if (collabDb) {
          const memberRes = await collabDb.query<{ space_id: string }>(
            `SELECT space_id FROM space_members WHERE user_id = $1`,
            [userId]
          );
          for (const row of memberRes.rows) authorizedSpaceIds.add(row.space_id);
        }
        if (authorizedSpaceIds.size === 0) {
          return reply.status(200).send(createSuccessResponse([]));
        }
        const res = await db.query(
          `SELECT id, space_id as "spaceId", original_name as "originalName", mime_type as "mimeType",
                  size_bytes as "sizeBytes", status, storage_key as "storageKey", created_at::text as "createdAt"
           FROM media_assets
           WHERE space_id = ANY($1::uuid[])
             AND status = ANY($2::text[])
           ORDER BY created_at DESC LIMIT 50`,
          [Array.from(authorizedSpaceIds), activeStatuses]
        );
        return reply.status(200).send(createSuccessResponse(res.rows));
      }
      return reply.status(200).send(createSuccessResponse([]));
    }
  );

  app.post(
    "/api/v1/media/upload-sessions/:mediaId/retry",
    async (req: FastifyRequest<{ Params: { mediaId: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      const asset = await mediaRepo.findAssetById(req.params.mediaId);
      if (!asset) {
        return reply.status(404).send(createErrorResponse("MEDIA_NOT_FOUND", "Media upload session not found"));
      }
      await assertSpaceAccess(asset.spaceId, userId, true);
      const uploadUrl = await storage.generateUploadUrl(asset.storageKey, asset.mimeType, 3600);
      await mediaRepo.updateAsset(asset.id, { status: "pending_upload" });
      return reply.status(200).send(
        createSuccessResponse({
          mediaId: asset.id,
          uploadUrl,
          storageKey: asset.storageKey,
          expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        })
      );
    }
  );

  // Non-Destructive Image Derivative Adjustments (PWA-43 / IOS-28)
  app.post(
    "/api/v1/media/:id/derivatives",
    async (
      req: FastifyRequest<{ Params: { id: string }; Body: { rotateDegrees?: number; warmth?: number; cropPreset?: string } }>,
      reply
    ) => {
      const userId = await requireAuthUser(req);
      const asset = await mediaRepo.findAssetById(req.params.id);
      if (!asset) {
        return reply.status(404).send(createErrorResponse("MEDIA_NOT_FOUND", "Media asset not found"));
      }
      await assertSpaceAccess(asset.spaceId, userId, true);
      const adjustments = {
        rotateDegrees: Number(req.body?.rotateDegrees || 0) % 360,
        warmth: Number(req.body?.warmth || 0),
        cropPreset: req.body?.cropPreset || "original",
        updatedAt: new Date().toISOString(),
      };
      const updated = await mediaRepo.updateAsset(asset.id, {
        metadata: { ...asset.metadata, nonDestructiveEdits: adjustments },
      });
      return reply.status(200).send(createSuccessResponse(updated || asset));
    }
  );

  // Storage Breakdown & Derivative Cache Prune (PWA-80 / IOS-55)
  app.get(
    "/api/v1/media/spaces/:spaceId/storage/breakdown",
    async (req: FastifyRequest<{ Params: { spaceId: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      await assertSpaceAccess(req.params.spaceId, userId, false);
      const [quota, assets] = await Promise.all([
        mediaRepo.getSpaceQuota(req.params.spaceId),
        mediaRepo.listAssets(req.params.spaceId),
      ]);
      let imagesBytes = 0;
      let videoBytes = 0;
      let audioBytes = 0;
      let docsBytes = 0;
      for (const a of assets) {
        if (a.mimeType.startsWith("image/")) imagesBytes += a.sizeBytes;
        else if (a.mimeType.startsWith("video/")) videoBytes += a.sizeBytes;
        else if (a.mimeType.startsWith("audio/")) audioBytes += a.sizeBytes;
        else docsBytes += a.sizeBytes;
      }
      return reply.status(200).send(
        createSuccessResponse({
          spaceId: req.params.spaceId,
          usedBytes: quota.usedBytes,
          maxBytes: quota.maxBytes,
          assetCount: assets.length,
          categories: { imagesBytes, videoBytes, audioBytes, docsBytes },
        })
      );
    }
  );

  app.post(
    "/api/v1/media/spaces/:spaceId/storage/prune",
    async (req: FastifyRequest<{ Params: { spaceId: string } }>, reply) => {
      const userId = await requireAuthUser(req);
      await assertSpaceAccess(req.params.spaceId, userId, true);
      const assets = await mediaRepo.listAssets(req.params.spaceId);
      let verifiedCount = 0;
      for (const a of assets) {
        const exists = await storage.verifyObjectExists(a.storageKey);
        if (exists.exists) verifiedCount++;
      }
      return reply.status(200).send(
        createSuccessResponse({
          spaceId: req.params.spaceId,
          verifiedObjects: verifiedCount,
          reclaimedBytes: 0,
          prunedAt: new Date().toISOString(),
        })
      );
    }
  );

  // Admin Media & Storage Infrastructure Routes (ADMIN-08 / ADMIN-09 / ADMIN-10)
  const ADMIN_ROLES = new Set(["superadmin", "admin", "ops_admin", "compliance_officer", "support_agent"]);
  async function requireAdmin(req: FastifyRequest) {
    const claims: any = await req.jwtVerify().catch(() => {
      throw new UnauthorizedError("Valid admin token required");
    });
    if (!ADMIN_ROLES.has(claims?.role || "")) {
      throw new ForbiddenError("Administrative privileges required");
    }
  }

  app.get("/api/v1/admin/storage/stats", async (req, reply) => {
    await requireAdmin(req);
    if (dbUrl) {
      const [quotaRes, assetRes, perSpaceRes] = await Promise.all([
        db.query(`SELECT COALESCE(SUM(used_bytes), 0)::bigint as "totalUsedBytes", COUNT(*)::int as "spaceCount" FROM space_storage_quotas`),
        db.query(`SELECT COUNT(*)::int as "assetCount", COALESCE(SUM(size_bytes), 0)::bigint as "assetBytes" FROM media_assets`),
        db.query(`SELECT space_id as "spaceId", used_bytes::bigint as "usedBytes", max_bytes::bigint as "maxBytes" FROM space_storage_quotas`),
      ]);
      return reply.status(200).send(
        createSuccessResponse({
          driver: "LocalDiskStorageDriver",
          totalUsedBytes: Number(quotaRes.rows[0]?.totalUsedBytes || 0),
          spaceCount: Number(quotaRes.rows[0]?.spaceCount || 0),
          assetCount: Number(assetRes.rows[0]?.assetCount || 0),
          assetBytes: Number(assetRes.rows[0]?.assetBytes || 0),
          spaces: perSpaceRes.rows.map((r: any) => ({
            spaceId: r.spaceId,
            usedBytes: Number(r.usedBytes || 0),
            maxBytes: Number(r.maxBytes || 500 * 1024 * 1024),
          })),
        })
      );
    }
    return reply.status(200).send(
      createSuccessResponse({ driver: "LocalDiskStorageDriver", totalUsedBytes: 0, spaceCount: 0, assetCount: 0, assetBytes: 0 })
    );
  });

  app.get("/api/v1/admin/uploads/sessions", async (req, reply) => {
    await requireAdmin(req);
    if (dbUrl) {
      const res = await db.query(
        `SELECT id, space_id as "spaceId", original_name as "originalName", mime_type as "mimeType",
                size_bytes as "sizeBytes", status, created_at::text as "createdAt"
         FROM media_assets ORDER BY created_at DESC LIMIT 100`
      );
      return reply.status(200).send(createSuccessResponse(res.rows));
    }
    return reply.status(200).send(createSuccessResponse([]));
  });

  app.post(
    "/api/v1/admin/media/:id/reprocess",
    async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
      await requireAdmin(req);
      const asset = await mediaRepo.findAssetById(req.params.id);
      if (!asset) {
        return reply.status(404).send(createErrorResponse("MEDIA_NOT_FOUND", "Media asset not found"));
      }
      await jobManager.addJob("media-processing", "generate-derivatives", {
        mediaId: asset.id,
        storageKey: asset.storageKey,
        mimeType: asset.mimeType,
      });
      return reply.status(202).send(createSuccessResponse({ queued: true, mediaId: asset.id }));
    }
  );

  // Background worker for asynchronous OCR jobs
  jobManager.registerWorker<{ mediaId: string; language?: string }>("media-ocr", async (job) => {
    const asset = await mediaRepo.findAssetById(job.data.mediaId);
    if (!asset) return;
    await runOcrForAsset(asset, job.data.language || "eng");
  });

  // Background worker for media derivatives, FFprobe/FFmpeg video/audio processing & OCR
  jobManager.registerWorker("media-processing", async (job) => {
    const { mediaId, storageKey, mimeType } = job.data;
    logger.info({ mediaId, storageKey }, "[Worker] Processing media asset for derivatives");

    try {
      const asset = await mediaRepo.findAssetById(mediaId);
      if (!asset) return;

      await mediaRepo.updateAsset(mediaId, { status: "processing" });

      let derivatives: Record<string, string> = {};
      let metadata: Record<string, any> = { ...asset.metadata };
      let derivativeError: string | null = null;
      let ocrError: string | null = null;

      if (mimeType && mimeType.startsWith("image/")) {
        let originalBuffer: Buffer;
        try {
          originalBuffer = await storage.getObject(storageKey);
        } catch (readErr: any) {
          await mediaRepo.updateAsset(mediaId, {
            status: "retryable_failure",
            metadata: { ...metadata, processingState: "retryable_failure", lastError: readErr?.message || "Failed to read original" },
          });
          throw readErr;
        }
        try {
          const processed = await storage.processImageDerivatives(originalBuffer);

          const thumbSmKey = `derivatives/${mediaId}/thumb_sm.webp`;
          const thumbLgKey = `derivatives/${mediaId}/thumb_lg.webp`;

          await storage.saveObject(thumbSmKey, processed.thumbSmall, "image/webp");
          await storage.saveObject(thumbLgKey, processed.thumbLarge, "image/webp");

          derivatives = {
            thumb_sm: `/api/v1/media/files/${thumbSmKey}`,
            thumb_lg: `/api/v1/media/files/${thumbLgKey}`,
          };
          metadata = {
            ...metadata,
            width: processed.width,
            height: processed.height,
            format: "webp",
          };
        } catch (procErr: any) {
          derivativeError = procErr?.message || "Sharp derivative processing failed";
          logger.warn({ err: procErr, mediaId }, "[Worker] Sharp derivative processing error");
        }
      } else if (mimeType && (mimeType.startsWith("video/") || mimeType.startsWith("audio/"))) {
        if (FFPROBE_PATH) {
          const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "memoria-av-"));
          const tempInput = path.join(tempDir, path.basename(storageKey));
          try {
            const { stream } = await storage.getObjectStream(storageKey);
            await pipeline(stream, createWriteStream(tempInput));
            const { stdout } = await execFileAsync(
              FFPROBE_PATH,
              ["-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", tempInput],
              { timeout: 15_000 }
            );
            const probe = JSON.parse(stdout);
            const durationSec = parseFloat(probe?.format?.duration || "0");
            const videoStream = (probe?.streams || []).find((s: any) => s.codec_type === "video");
            metadata = {
              ...metadata,
              durationSec: Number.isFinite(durationSec) ? durationSec : undefined,
              ...(videoStream ? { width: videoStream.width, height: videoStream.height } : {}),
            };

            if (mimeType.startsWith("video/") && FFMPEG_PATH) {
              const posterPath = path.join(tempDir, "poster.webp");
              await execFileAsync(
                FFMPEG_PATH,
                ["-y", "-i", tempInput, "-ss", "00:00:00.5", "-vframes", "1", posterPath],
                { timeout: 20_000 }
              );
              if (existsSync(posterPath)) {
                const posterBuf = await fs.readFile(posterPath);
                const posterKey = `derivatives/${mediaId}/poster.webp`;
                await storage.saveObject(posterKey, posterBuf, "image/webp");
                derivatives.poster = `/api/v1/media/files/${posterKey}`;
              }
            }
          } catch (avErr: any) {
            derivativeError = avErr?.message || "FFmpeg/FFprobe processing failed";
            logger.warn({ err: avErr, mediaId }, "[Worker] FFmpeg/FFprobe processing warning");
          } finally {
            await fs.rm(tempDir, { recursive: true, force: true }).catch((err) => {
              logger.warn({ err, tempDir }, "[Worker] AV temp cleanup warning");
            });
          }
        }
      }

      if (ocrEngine.getStatus().isAvailable && (mimeType.startsWith("image/") || mimeType === "application/pdf")) {
        try {
          const { ocrResult } = await runOcrForAsset({ ...asset, metadata }, "eng");
          metadata = {
            ...metadata,
            ocrProcessed: true,
            ocrStatus: "completed",
            ocrConfidence: ocrResult.averageConfidence,
            ocrWordCount: ocrResult.totalWords,
            ocrProcessedAt: new Date().toISOString(),
          };
        } catch (ocrErr: any) {
          ocrError = ocrErr?.message || "OCR processing failed";
          metadata = {
            ...metadata,
            ocrStatus: "failed",
            ocrError,
          };
          logger.warn({ err: ocrErr, mediaId }, "[Worker] OCR processing non-fatal error");
        }
      }

      const finalStatus = derivativeError ? "completed_partial" : "ready";
      if (derivativeError) {
        metadata.derivativeError = derivativeError;
        metadata.processingState = "completed_partial";
      } else {
        metadata.processingState = ocrError ? "completed_partial" : "completed";
      }

      await mediaRepo.updateAsset(mediaId, {
        status: finalStatus,
        derivatives,
        metadata,
      });

      await publishDomainEvent("media.processed", "media.processed", mediaId, {
        mediaId,
        status: finalStatus,
        derivatives,
        metadata,
      });
      logger.info({ mediaId, status: finalStatus }, "[Worker] Media derivatives generated and persisted to database");
    } catch (workerErr: any) {
      logger.error({ err: workerErr, mediaId }, "[Worker] Fatal error in media worker");
      await mediaRepo.updateAsset(mediaId, {
        status: "permanent_failure",
        metadata: { processingState: "permanent_failure", lastError: workerErr?.message || String(workerErr) },
      }).catch(() => {});
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
