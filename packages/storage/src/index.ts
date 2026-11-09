import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createServiceLogger, Logger } from "@memory-capsule/logger";
import sharp from "sharp";

const logger: Logger = createServiceLogger("storage-service");

export interface StorageConfig {
  endpoint?: string;
  region?: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
}

export class ObjectStorage {
  private client: S3Client;
  private bucket: string;

  constructor(config?: Partial<StorageConfig>) {
    this.bucket = config?.bucket || process.env.S3_BUCKET || "memory-capsule-assets";
    this.client = new S3Client({
      endpoint: config?.endpoint || process.env.S3_ENDPOINT || "http://localhost:9000",
      region: config?.region || process.env.S3_REGION || "auto",
      credentials: {
        accessKeyId: config?.accessKeyId || process.env.S3_ACCESS_KEY_ID || "minioadmin",
        secretAccessKey: config?.secretAccessKey || process.env.S3_SECRET_ACCESS_KEY || "minioadminpassword",
      },
      forcePathStyle: config?.forcePathStyle ?? (process.env.S3_FORCE_PATH_STYLE === "true"),
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

  async processImageDerivatives(inputBuffer: Buffer): Promise<{
    thumbSmall: Buffer;
    thumbLarge: Buffer;
    blurhash?: string;
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
