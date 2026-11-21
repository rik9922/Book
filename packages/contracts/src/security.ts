import crypto from "node:crypto";

export const DEFAULT_LOCAL_JWT_SECRET =
  "dev-jwt-insecure-secret-change-in-production-min32chars";
export const DEFAULT_LOCAL_SESSION_SECRET =
  "dev-session-insecure-secret-change-in-production-min32chars";
export const DEFAULT_LOCAL_SERVICE_KEY =
  "memory-capsule-internal-service-secret-2026";

/**
 * Constant-time string comparison via SHA-256 digest to avoid length side-channels.
 */
export function timingSafeEqualStrings(a: string, b: string): boolean {
  const hashA = crypto.createHash("sha256").update(a, "utf8").digest();
  const hashB = crypto.createHash("sha256").update(b, "utf8").digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

/**
 * Signs a media storage operation (upload or download) with HMAC-SHA256 and expiry.
 */
export function createMediaSignedToken(
  params: {
    action: "upload" | "download";
    key: string;
    expiresAtEpochSec: number;
  },
  secret: string
): string {
  const payload = `${params.action}:${params.key}:${params.expiresAtEpochSec}`;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Verifies an HMAC-SHA256 signed media token and checks expiration.
 */
export function verifyMediaSignedToken(
  params: {
    action: "upload" | "download";
    key: string;
    expiresAtEpochSec: number;
    signature: string;
  },
  secret: string,
  nowEpochSec = Math.floor(Date.now() / 1000)
): boolean {
  if (!Number.isFinite(params.expiresAtEpochSec) || params.expiresAtEpochSec < nowEpochSec) {
    return false;
  }
  if (!params.signature || typeof params.signature !== "string") {
    return false;
  }
  const expected = createMediaSignedToken(
    {
      action: params.action,
      key: params.key,
      expiresAtEpochSec: params.expiresAtEpochSec,
    },
    secret
  );
  return timingSafeEqualStrings(params.signature, expected);
}

/**
 * Hashes a user-provided passphrase using salted scrypt (memory-hard KDF).
 * Format: scrypt$<saltHex>$<derivedKeyHex>
 */
export function hashPassphraseScrypt(passphrase: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(passphrase, salt, 32).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

/**
 * Verifies a passphrase against a salted scrypt hash (with constant-time
 * fallback for legacy unsalted SHA-256 hashes).
 */
export function verifyPassphraseScrypt(passphrase: string, storedHash: string): boolean {
  if (!passphrase || !storedHash) return false;
  if (storedHash.startsWith("scrypt$")) {
    const parts = storedHash.split("$");
    if (parts.length !== 3) return false;
    const [, salt, expectedHex] = parts;
    const derivedHex = crypto.scryptSync(passphrase, salt, 32).toString("hex");
    return timingSafeEqualStrings(derivedHex, expectedHex);
  }
  const legacySha = crypto.createHash("sha256").update(passphrase).digest("hex");
  return timingSafeEqualStrings(legacySha, storedHash);
}

const DEFAULT_DEV_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
];

/**
 * Builds an environment-driven Fastify CORS origin validator.
 * Never reflects arbitrary origins in production.
 */
export function buildCorsOriginValidator(
  allowedOriginsEnv?: string,
  nodeEnv: string = process.env.NODE_ENV || "development"
): (origin: string | undefined, cb: (err: Error | null, allow: boolean) => void) => void {
  const configured = (allowedOriginsEnv || "")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  const allowSet = new Set<string>(
    configured.length > 0 ? configured : nodeEnv === "production" ? [] : DEFAULT_DEV_ORIGINS
  );

  const localOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

  return (origin, cb) => {
    // Allow non-browser / server-to-server / native iOS requests with no Origin header
    if (!origin) {
      cb(null, true);
      return;
    }
    const normalized = origin.trim().replace(/\/+$/, "");
    if (allowSet.has(normalized)) {
      cb(null, true);
      return;
    }
    if (nodeEnv !== "production" && localOriginPattern.test(normalized)) {
      cb(null, true);
      return;
    }
    cb(null, false);
  };
}

/**
 * Inspects file header magic bytes to block disguised executable/HTML/SVG payloads
 * and ensure claimed image/PDF/media MIME types match their binary signature.
 */
export function validateMagicBytes(
  header: Buffer,
  claimedContentType?: string
): { valid: boolean; reason?: string } {
  if (!header || header.length === 0) {
    return { valid: false, reason: "Empty file payload" };
  }

  const headAscii = header.subarray(0, Math.min(header.length, 256)).toString("utf8").trimStart().toLowerCase();
  if (
    headAscii.startsWith("<svg") ||
    headAscii.startsWith("<!doctype html") ||
    headAscii.startsWith("<html") ||
    headAscii.startsWith("<script") ||
    headAscii.startsWith("<?xml") && headAscii.includes("<svg")
  ) {
    return { valid: false, reason: "Active markup (SVG/HTML/script) is not permitted in media uploads" };
  }

  // Block Windows PE (MZ), Linux ELF (\x7fELF), Mach-O, and shell scripts (#!)
  if (
    (header.length >= 2 && header[0] === 0x4d && header[1] === 0x5a) ||
    (header.length >= 4 && header[0] === 0x7f && header[1] === 0x45 && header[2] === 0x4c && header[3] === 0x46) ||
    (header.length >= 2 && header[0] === 0x23 && header[1] === 0x21)
  ) {
    return { valid: false, reason: "Executable binary payloads are not permitted" };
  }

  const mime = (claimedContentType || "").split(";")[0].trim().toLowerCase();
  if (!mime || mime === "application/octet-stream") {
    return { valid: true };
  }

  if (mime === "image/jpeg" || mime === "image/jpg") {
    const ok = header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    return ok ? { valid: true } : { valid: false, reason: "Payload bytes do not match image/jpeg signature" };
  }
  if (mime === "image/png") {
    const ok =
      header.length >= 8 &&
      header[0] === 0x89 &&
      header[1] === 0x50 &&
      header[2] === 0x4e &&
      header[3] === 0x47 &&
      header[4] === 0x0d &&
      header[5] === 0x0a &&
      header[6] === 0x1a &&
      header[7] === 0x0a;
    return ok ? { valid: true } : { valid: false, reason: "Payload bytes do not match image/png signature" };
  }
  if (mime === "image/webp") {
    const ok =
      header.length >= 12 &&
      header.subarray(0, 4).toString("ascii") === "RIFF" &&
      header.subarray(8, 12).toString("ascii") === "WEBP";
    return ok ? { valid: true } : { valid: false, reason: "Payload bytes do not match image/webp signature" };
  }
  if (mime === "image/gif") {
    const sig = header.subarray(0, 6).toString("ascii");
    const ok = sig === "GIF87a" || sig === "GIF89a";
    return ok ? { valid: true } : { valid: false, reason: "Payload bytes do not match image/gif signature" };
  }
  if (mime === "application/pdf") {
    const ok = header.length >= 5 && header.subarray(0, 5).toString("ascii") === "%PDF-";
    return ok ? { valid: true } : { valid: false, reason: "Payload bytes do not match application/pdf signature" };
  }
  if (mime === "audio/wav" || mime === "audio/x-wav") {
    const ok =
      header.length >= 12 &&
      header.subarray(0, 4).toString("ascii") === "RIFF" &&
      header.subarray(8, 12).toString("ascii") === "WAVE";
    return ok ? { valid: true } : { valid: false, reason: "Payload bytes do not match audio/wav signature" };
  }
  if (mime === "video/mp4" || mime === "video/quicktime" || mime === "audio/mp4" || mime === "image/heic" || mime === "image/heif") {
    const ok =
      header.length >= 12 &&
      (header.subarray(4, 8).toString("ascii") === "ftyp" ||
        header.subarray(4, 8).toString("ascii") === "moov" ||
        header.subarray(4, 8).toString("ascii") === "mdat" ||
        header.subarray(4, 8).toString("ascii") === "wide");
    return ok ? { valid: true } : { valid: false, reason: `Payload bytes do not match ${mime} ISO-BMFF signature` };
  }

  return { valid: true };
}
