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
