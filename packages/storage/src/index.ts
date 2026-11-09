import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createServiceLogger, Logger } from "@memory-capsule/logger";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

const logger: Logger = createServiceLogger("storage-service");

export interface StorageDriver {
  generateUploadUrl(key: string, contentType: string, expiresInSeconds?: number): Promise<string>;
  generateDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>;
  verifyObjectExists(key: string): Promise<{ exists: boolean; sizeBytes?: number }>;
  saveObject(key: string, buffer: Buffer, contentType?: string): Promise<void>;
  getObject(key: string): Promise<Buffer>;
  deleteObject(key: string): Promise<void>;
}

/**
 * 100% Zero-Budget Local Filesystem Storage Driver
 * Requires no external cloud provider, no accounts, and no payment methods.
 */
export class LocalDiskStorageDriver implements StorageDriver {
  private baseDir: string;
  private publicBaseUrl: string;

  constructor(baseDir?: string, publicBaseUrl?: string) {
    this.baseDir = baseDir || process.env.LOCAL_STORAGE_PATH || path.join(process.cwd(), "storage_data");
    this.publicBaseUrl = publicBaseUrl || process.env.PUBLIC_MEDIA_URL || "http://localhost:4003/api/v1/media/files";
  }

  private resolvePath(key: string): string {
    const sanitizedKey = key.replace(/\.\./g, "");
    return path.join(this.baseDir, sanitizedKey);
  }

  async generateUploadUrl(key: string, contentType: string): Promise<string> {
    // Direct endpoint on media service for local binary streaming upload
    const cleanKey = encodeURIComponent(key);
    return `http://localhost:4003/api/v1/media/local-upload?key=${cleanKey}&contentType=${encodeURIComponent(contentType)}`;
  }

  async generateDownloadUrl(key: string): Promise<string> {
    return `${this.publicBaseUrl}/${key}`;
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
    await fs.writeFile(filePath, buffer);
    logger.debug({ key, bytes: buffer.length }, "[LocalStorage] Saved object to disk");
  }

  async getObject(key: string): Promise<Buffer> {
    const filePath = this.resolvePath(key);
    return fs.readFile(filePath);
  }

  async deleteObject(key: string): Promise<void> {
    try {
      const filePath = this.resolvePath(key);
      await fs.unlink(filePath);
    } catch {}
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

  constructor() {
    const driverType = process.env.STORAGE_DRIVER || "local";
    if (driverType === "s3" && process.env.S3_ACCESS_KEY_ID) {
      logger.info("[ObjectStorage] Using S3/MinIO storage driver");
      this.driver = new S3StorageDriver();
    } else {
      logger.info("[ObjectStorage] Using 100% Zero-Cost LocalDiskStorageDriver (no cloud accounts or cards required)");
      this.driver = new LocalDiskStorageDriver();
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

  async getObject(key: string): Promise<Buffer> {
    return this.driver.getObject(key);
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
    const image = sharp(inputBuffer);
    const meta = await image.metadata();

    const [thumbSmall, thumbLarge] = await Promise.all([
      sharp(inputBuffer).resize(320, 320, { fit: "cover" }).webp({ quality: 80 }).toBuffer(),
      sharp(inputBuffer).resize(1280, 1280, { fit: "inside" }).webp({ quality: 85 }).toBuffer(),
    ]);

    return {
      thumbSmall,
      thumbLarge,
      width: meta.width || 0,
      height: meta.height || 0,
    };
  }
}
