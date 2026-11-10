import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createServiceLogger, Logger } from "@memory-capsule/logger";
import {
  createMediaSignedToken,
  DEFAULT_LOCAL_SESSION_SECRET,
} from "@memory-capsule/contracts";
import sharp from "sharp";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const logger: Logger = createServiceLogger("storage-service");

export interface StorageDriver {
  generateUploadUrl(key: string, contentType: string, expiresInSeconds?: number): Promise<string>;
  generateDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>;
  verifyObjectExists(key: string): Promise<{ exists: boolean; sizeBytes?: number }>;
  saveObject(key: string, buffer: Buffer, contentType?: string): Promise<void>;
  saveStream?(key: string, stream: Readable, maxBytes?: number): Promise<number>;
  getObject(key: string): Promise<Buffer>;
  getObjectStream?(key: string, range?: { start: number; end: number }): Promise<{ stream: Readable; sizeBytes: number }>;
  computeSha256?(key: string): Promise<string>;
  deleteObject(key: string): Promise<void>;
}

/**
 * 100% Zero-Budget Local Filesystem Storage Driver
 * Requires no external cloud provider, no accounts, and no payment methods.
 */
export class LocalDiskStorageDriver implements StorageDriver {
  private baseDir: string;
  private publicBaseUrl: string;
  private uploadBaseUrl: string;
  private signingSecret: string;

  constructor(baseDir?: string, publicBaseUrl?: string, signingSecret?: string) {
    this.baseDir = baseDir || process.env.LOCAL_STORAGE_PATH || path.join(process.cwd(), "storage_data");
    this.publicBaseUrl = publicBaseUrl || process.env.PUBLIC_MEDIA_URL || "http://localhost:4003/api/v1/media/files";
    this.uploadBaseUrl = process.env.LOCAL_MEDIA_UPLOAD_URL || "http://localhost:4003/api/v1/media/local-upload";
    this.signingSecret = signingSecret || process.env.SESSION_SECRET || DEFAULT_LOCAL_SESSION_SECRET;
  }

  private resolvePath(key: string): string {
    const normalized = path.posix.normalize(key.replace(/\\/g, "/")).replace(/^(\.\.\/)+/, "").replace(/^\/+/, "");
    const full = path.resolve(this.baseDir, normalized);
    const rootResolved = path.resolve(this.baseDir);
    if (!full.startsWith(rootResolved + path.sep) && full !== rootResolved) {
      throw new Error("Invalid storage key path traversal");
    }
    return full;
  }

  async generateUploadUrl(key: string, contentType: string, expiresInSeconds = 3600): Promise<string> {
    const expiresAtEpochSec = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const sig = createMediaSignedToken(
      { action: "upload", key, expiresAtEpochSec },
      this.signingSecret
    );
    const cleanKey = encodeURIComponent(key);
    return `${this.uploadBaseUrl}?key=${cleanKey}&contentType=${encodeURIComponent(contentType)}&expires=${expiresAtEpochSec}&sig=${sig}`;
  }

  async generateDownloadUrl(key: string, expiresInSeconds = 86400): Promise<string> {
    const expiresAtEpochSec = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const sig = createMediaSignedToken(
      { action: "download", key, expiresAtEpochSec },
      this.signingSecret
    );
    const encodedPath = key.split("/").map(encodeURIComponent).join("/");
    return `${this.publicBaseUrl}/${encodedPath}?expires=${expiresAtEpochSec}&sig=${sig}`;
  }

  async verifyObjectExists(key: string): Promise<{ exists: boolean; sizeBytes?: number }> {
    try {
      const filePath = this.resolvePath(key);
      const stat = await fs.stat(filePath);
      return { exists: true, sizeBytes: stat.size };
    } catch {
      return { exists: false };
    }
  }

  async saveObject(key: string, buffer: Buffer): Promise<void> {
    const filePath = this.resolvePath(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const tmpPath = `${filePath}.${crypto.randomUUID()}.tmp`;
    await fs.writeFile(tmpPath, buffer);
    await fs.rename(tmpPath, filePath);
    logger.debug({ key, bytes: buffer.length }, "[LocalStorage] Saved object to disk");
  }

  async saveStream(key: string, stream: Readable, maxBytes = 60 * 1024 * 1024): Promise<number> {
    const filePath = this.resolvePath(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const tmpPath = `${filePath}.${crypto.randomUUID()}.tmp`;
    let totalBytes = 0;

    stream.on("data", (chunk: Buffer) => {
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        stream.destroy(new Error(`Upload stream exceeded max limit of ${maxBytes} bytes`));
      }
    });

    const writeStream = fsSync.createWriteStream(tmpPath);
    try {
      await pipeline(stream, writeStream);
      await fs.rename(tmpPath, filePath);
      logger.debug({ key, bytes: totalBytes }, "[LocalStorage] Streamed object to disk");
      return totalBytes;
    } catch (err) {
      await fs.unlink(tmpPath).catch(() => {});
      throw err;
    }
  }

  async getObject(key: string): Promise<Buffer> {
    const filePath = this.resolvePath(key);
    return fs.readFile(filePath);
  }

  async getObjectStream(
    key: string,
    range?: { start: number; end: number }
  ): Promise<{ stream: Readable; sizeBytes: number }> {
    const filePath = this.resolvePath(key);
    const stat = await fs.stat(filePath);
    const stream = fsSync.createReadStream(
      filePath,
      range ? { start: range.start, end: range.end } : undefined
    );
    return { stream, sizeBytes: stat.size };
  }

  async computeSha256(key: string): Promise<string> {
    const filePath = this.resolvePath(key);
    const hash = crypto.createHash("sha256");
    const stream = fsSync.createReadStream(filePath);
    for await (const chunk of stream) {
      hash.update(chunk);
    }
    return hash.digest("hex");
  }

  async deleteObject(key: string): Promise<void> {
    try {
      const filePath = this.resolvePath(key);
      await fs.unlink(filePath);
    } catch (err: any) {
      if (err?.code !== "ENOENT") {
        logger.warn({ err, key }, "[LocalStorage] Failed to delete object");
      }
    }
  }
}

/**
 * S3 / MinIO Compatible Storage Driver (for self-hosted MinIO or verified S3 storage)
 */
export class S3StorageDriver implements StorageDriver {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET || "memory-capsule-assets";
    this.client = new S3Client({
      endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
      region: process.env.S3_REGION || "auto",
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || "minioadmin",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "minioadminpassword",
      },
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    });
  }

  async generateUploadUrl(key: string, contentType: string, expiresInSeconds = 3600): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async generateDownloadUrl(key: string, expiresInSeconds = 86400): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async verifyObjectExists(key: string): Promise<{ exists: boolean; sizeBytes?: number }> {
    try {
      const res = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return { exists: true, sizeBytes: res.ContentLength };
    } catch {
      return { exists: false };
    }
  }

  async saveObject(key: string, buffer: Buffer, contentType?: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );
  }

  async getObject(key: string): Promise<Buffer> {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const stream = res.Body as any;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async computeSha256(key: string): Promise<string> {
    const buffer = await this.getObject(key);
    return crypto.createHash("sha256").update(buffer).digest("hex");
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

/**
 * Unified ObjectStorage Facade
 * Automatically selects LocalDiskStorageDriver by default for zero-budget compliance.
 */
export class ObjectStorage {
  private driver: StorageDriver;

  constructor(options?: { signingSecret?: string; baseDir?: string; publicBaseUrl?: string }) {
    const driverType = process.env.STORAGE_DRIVER || "local";
    if (driverType === "s3" && process.env.S3_ACCESS_KEY_ID) {
      logger.info("[ObjectStorage] Using S3/MinIO storage driver");
      this.driver = new S3StorageDriver();
    } else {
      logger.info("[ObjectStorage] Using 100% Zero-Cost LocalDiskStorageDriver (no cloud accounts or cards required)");
      this.driver = new LocalDiskStorageDriver(options?.baseDir, options?.publicBaseUrl, options?.signingSecret);
    }
  }

  async generateUploadUrl(key: string, contentType: string, expiresInSeconds = 3600): Promise<string> {
    return this.driver.generateUploadUrl(key, contentType, expiresInSeconds);
  }

  async generateDownloadUrl(key: string, expiresInSeconds = 86400): Promise<string> {
    return this.driver.generateDownloadUrl(key, expiresInSeconds);
  }

  async verifyObjectExists(key: string): Promise<{ exists: boolean; sizeBytes?: number }> {
    return this.driver.verifyObjectExists(key);
  }

  async saveObject(key: string, buffer: Buffer, contentType?: string): Promise<void> {
    return this.driver.saveObject(key, buffer, contentType);
  }

  async saveStream(key: string, stream: Readable, maxBytes?: number): Promise<number> {
    if (this.driver.saveStream) {
      return this.driver.saveStream(key, stream, maxBytes);
    }
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of stream) {
      const buf = Buffer.from(chunk);
      total += buf.length;
      if (maxBytes && total > maxBytes) {
        throw new Error(`Upload stream exceeded max limit of ${maxBytes} bytes`);
      }
      chunks.push(buf);
    }
    await this.driver.saveObject(key, Buffer.concat(chunks));
    return total;
  }

  async getObject(key: string): Promise<Buffer> {
    return this.driver.getObject(key);
  }

  async getObjectStream(
    key: string,
    range?: { start: number; end: number }
  ): Promise<{ stream: Readable; sizeBytes: number }> {
    if (this.driver.getObjectStream) {
      return this.driver.getObjectStream(key, range);
    }
    const buf = await this.driver.getObject(key);
    const slice = range ? buf.subarray(range.start, range.end + 1) : buf;
    return { stream: Readable.from(slice), sizeBytes: buf.byteLength };
  }

  async computeSha256(key: string): Promise<string> {
    if (this.driver.computeSha256) {
      return this.driver.computeSha256(key);
    }
    const buf = await this.driver.getObject(key);
    return crypto.createHash("sha256").update(buf).digest("hex");
  }

  async deleteObject(key: string): Promise<void> {
    return this.driver.deleteObject(key);
  }

  async processImageDerivatives(inputBuffer: Buffer): Promise<{
    thumbSmall: Buffer;
    thumbLarge: Buffer;
    width: number;
    height: number;
  }> {
    const oriented = sharp(inputBuffer).rotate();
    const meta = await oriented.metadata();

    const [thumbSmall, thumbLarge] = await Promise.all([
      sharp(inputBuffer).rotate().resize(320, 320, { fit: "cover" }).webp({ quality: 80 }).toBuffer(),
      sharp(inputBuffer).rotate().resize(1280, 1280, { fit: "inside" }).webp({ quality: 85 }).toBuffer(),
    ]);

    return {
      thumbSmall,
      thumbLarge,
      width: meta.width || 0,
      height: meta.height || 0,
    };
  }
}
