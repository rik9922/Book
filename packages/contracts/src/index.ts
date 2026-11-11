import { z } from "zod";

// ==========================================
// 1. API RESPONSE & ERROR ENVELOPES
// ==========================================

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.array(z.record(z.string(), z.any())).optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const ApiResponseMetadataSchema = z.object({
  correlationId: z.string(),
  timestamp: z.number(),
});
export type ApiResponseMetadata = z.infer<typeof ApiResponseMetadataSchema>;

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  meta: ApiResponseMetadata;
}

export function createSuccessResponse<T>(data: T, correlationId = "corr-unknown"): ApiResponse<T> {
  return {
    success: true,
    data,
    error: null,
    meta: {
      correlationId,
      timestamp: Date.now(),
    },
  };
}

export function createErrorResponse(code: string, message: string, correlationId = "corr-unknown", details?: any[]): ApiResponse<null> {
  return {
    success: false,
    data: null,
    error: {
      code,
      message,
      details,
    },
    meta: {
      correlationId,
      timestamp: Date.now(),
    },
  };
}

// ==========================================
// 2. IDENTITY & AUTH SCHEMAS
// ==========================================

export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(10),
});
export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;

export const ForgotPasswordRequestSchema = z.object({
  email: z.string().email(),
});
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>;

export const ResetPasswordRequestSchema = z.object({
  token: z.string().min(16),
  newPassword: z.string().min(8),
});
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>;

export const VerifyEmailRequestSchema = z.object({
  token: z.string().min(16),
});
export type VerifyEmailRequest = z.infer<typeof VerifyEmailRequestSchema>;

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string(),
  avatarUrl: z.string().url().nullable().optional(),
  role: z.enum(["member", "admin", "superadmin", "ops_admin", "compliance_officer", "support_agent"]).optional(),
  isVerified: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

// ==========================================
// 5B. SHARED ZERO-MARKUP PRINT PRICING
// ==========================================

export interface PrintPricingInput {
  format?: "hardcover_square_8x8" | "hardcover_standard_8x10" | "hardcover_grand_12x12" | string;
  binding?: "hardcover_linen" | "french_morocco" | string;
  paperWeight?: "140gsm_matte" | "170gsm_lustre" | string;
  quantity?: number;
  country?: string;
  shippingSpeed?: "standard" | "priority" | string;
  formatBaseCentsOverride?: number;
  shippingRateCentsOverride?: number;
  estimatedDaysOverride?: string;
}

export interface PrintPricingQuote {
  currency: "USD";
  format: "hardcover_square_8x8" | "hardcover_standard_8x10" | "hardcover_grand_12x12";
  binding: "hardcover_linen" | "french_morocco";
  paperWeight: "140gsm_matte" | "170gsm_lustre";
  shippingSpeed: "standard" | "priority";
  quantity: number;
  unitCents: number;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  estimatedDays: string;
}

export function calculatePrintOrderPricing(input: PrintPricingInput): PrintPricingQuote {
  const format =
    input.format === "hardcover_grand_12x12" || input.format === "hardcover_square_8x8"
      ? input.format
      : "hardcover_standard_8x10";
  const binding = input.binding === "french_morocco" ? "french_morocco" : "hardcover_linen";
  const paperWeight = input.paperWeight === "170gsm_lustre" ? "170gsm_lustre" : "140gsm_matte";
  const shippingSpeed = input.shippingSpeed === "priority" ? "priority" : "standard";
  const quantity = Math.min(Math.max(Number(input.quantity || 1), 1), 20);
  const defaultBaseCents =
    format === "hardcover_grand_12x12" ? 6800 : format === "hardcover_square_8x8" ? 4200 : 4800;
  const baseCents =
    typeof input.formatBaseCentsOverride === "number" && input.formatBaseCentsOverride >= 0
      ? input.formatBaseCentsOverride
      : defaultBaseCents;
  const bindingSurcharge = binding === "french_morocco" ? 2000 : 0;
  const paperSurcharge = paperWeight === "170gsm_lustre" ? 400 : 0;
  const unitCents = baseCents + bindingSurcharge + paperSurcharge;
  const subtotalCents = unitCents * quantity;
  const normalizedCountry = (input.country || "US").trim().toUpperCase();
  const isDomestic = normalizedCountry === "US";
  const baseShippingCents =
    typeof input.shippingRateCentsOverride === "number" && input.shippingRateCentsOverride >= 0
      ? input.shippingRateCentsOverride
      : isDomestic
      ? 900
      : 2400;
  const prioritySurcharge = shippingSpeed === "priority" ? (isDomestic ? 1200 : 1800) : 0;
  const shippingCents = baseShippingCents + prioritySurcharge;
  const defaultEstimatedDays =
    shippingSpeed === "priority"
      ? isDomestic
        ? "2–3 business days"
        : "4–6 business days"
      : input.estimatedDaysOverride || (isDomestic ? "5–7 business days" : "10–14 business days");

  return {
    currency: "USD",
    format,
    binding,
    paperWeight,
    shippingSpeed,
    quantity,
    unitCents,
    subtotalCents,
    shippingCents,
    taxCents: 0,
    totalCents: subtotalCents + shippingCents,
    estimatedDays: defaultEstimatedDays,
  };
}

export const AuthTokenResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
  user: UserProfileSchema,
});
export type AuthTokenResponse = z.infer<typeof AuthTokenResponseSchema>;

// ==========================================
// 3. MEMORY SPACES, PROFILES & MEMORIES
// ==========================================

export const SpaceTypeSchema = z.enum(["personal", "family", "event", "journey"]);
export type SpaceType = z.infer<typeof SpaceTypeSchema>;

export const MemorySpaceSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  type: SpaceTypeSchema,
  coverUrl: z.string().url().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type MemorySpace = z.infer<typeof MemorySpaceSchema>;

export const ProfileTypeSchema = z.enum(["child", "parent", "pet", "individual", "couple"]);
export type ProfileType = z.infer<typeof ProfileTypeSchema>;

export const SpaceProfileSchema = z.object({
  id: z.string().uuid(),
  spaceId: z.string().uuid(),
  name: z.string().min(1),
  relationship: z.string().optional(),
  type: ProfileTypeSchema,
  birthDate: z.string().optional(),
  avatarMediaId: z.string().uuid().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SpaceProfile = z.infer<typeof SpaceProfileSchema>;

export const MemoryFormatSchema = z.enum(["image", "video", "audio", "story", "document", "mixed"]);
export type MemoryFormat = z.infer<typeof MemoryFormatSchema>;

export const MemorySchema = z.object({
  id: z.string().uuid(),
  spaceId: z.string().uuid(),
  authorId: z.string().uuid(),
  title: z.string().min(1),
  content: z.string().optional(), // Written story or caption
  format: MemoryFormatSchema,
  capturedAt: z.string(), // When the memory happened
  location: z.string().optional(),
  isFavorite: z.boolean().default(false),
  associatedProfileIds: z.array(z.string().uuid()).default([]),
  mediaIds: z.array(z.string().uuid()).default([]),
  tags: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Memory = z.infer<typeof MemorySchema>;

// ==========================================
// 4. MEDIA & UPLOAD SESSIONS
// ==========================================

export const MediaStatusSchema = z.enum(["pending_upload", "uploaded", "processing", "ready", "failed"]);
export type MediaStatus = z.infer<typeof MediaStatusSchema>;

export const CreateUploadSessionRequestSchema = z.object({
  spaceId: z.string().uuid(),
  fileName: z.string().min(1),
  mimeType: z.string(),
  fileSizeBytes: z.number().positive(),
  checksumSha256: z.string().optional(),
});
export type CreateUploadSessionRequest = z.infer<typeof CreateUploadSessionRequestSchema>;

export const UploadSessionResponseSchema = z.object({
  mediaId: z.string().uuid(),
  uploadUrl: z.string().url(),
  storageKey: z.string(),
  expiresAt: z.string(),
  headers: z.record(z.string(), z.string()).optional(),
});
export type UploadSessionResponse = z.infer<typeof UploadSessionResponseSchema>;

export const MediaAssetSchema = z.object({
  id: z.string().uuid(),
  spaceId: z.string().uuid(),
  originalName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  status: MediaStatusSchema,
  storageKey: z.string(),
  publicUrl: z.string().optional(),
  derivatives: z.record(z.string(), z.string()).default({}), // e.g. { "thumb_sm": "...", "thumb_lg": "..." }
  metadata: z.record(z.string(), z.any()).default({}),       // EXIF, dimensions, duration
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type MediaAsset = z.infer<typeof MediaAssetSchema>;

// ==========================================
// 5. BOOK DOCUMENT & PRINT MODEL
// ==========================================

export const BookFormatSchema = z.enum(["hardcover_square_8x8", "hardcover_standard_8x10", "hardcover_grand_12x12"]);
export type BookFormat = z.infer<typeof BookFormatSchema>;

export const PageLayoutTypeSchema = z.enum([
  "full_bleed_single",
  "two_photo_grid",
  "photo_with_story",
  "quote_spread",
  "collage_four",
  "editorial_chapter_title",
]);
export type PageLayoutType = z.infer<typeof PageLayoutTypeSchema>;

export const PageElementSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["image", "text", "heading", "caption", "qr_code", "decorative"]),
  x: z.number(), // Percentage [0..100]
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number().default(0),
  zIndex: z.number().default(1),
  content: z.string().optional(), // text or mediaId
  style: z.record(z.string(), z.any()).default({}),
});
export type PageElement = z.infer<typeof PageElementSchema>;

export const BookPageSchema = z.object({
  id: z.string().uuid(),
  pageNumber: z.number(),
  layoutType: PageLayoutTypeSchema,
  backgroundColor: z.string().default("#F7F4ED"),
  elements: z.array(PageElementSchema).default([]),
});
export type BookPage = z.infer<typeof BookPageSchema>;

export const BookSpreadSchema = z.object({
  id: z.string().uuid(),
  spreadIndex: z.number(),
  leftPage: BookPageSchema.nullable(),
  rightPage: BookPageSchema.nullable(),
});
export type BookSpread = z.infer<typeof BookSpreadSchema>;

export const BookDocumentSchema = z.object({
  id: z.string().uuid(),
  spaceId: z.string().uuid(),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  format: BookFormatSchema,
  coverColor: z.string().default("#304C43"), // Forest
  foilStamping: z.enum(["gold", "rose", "silver", "blind_emboss", "none"]).default("gold"),
  coverTitle: z.string(),
  spineText: z.string().optional(),
  spreads: z.array(BookSpreadSchema).default([]),
  version: z.number().default(1),
  isFrozenForPrint: z.boolean().default(false),
  frozenEditionHash: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type BookDocument = z.infer<typeof BookDocumentSchema>;

// ==========================================
// 6. DOMAIN EVENT SPECIFICATIONS
// ==========================================

export interface DomainEvent<T = unknown> {
  eventId: string;
  eventType: string;
  producer: string;
  timestamp: string;
  correlationId: string;
  data: T;
}

export function createDomainEvent<T>(
  eventType: string,
  producer: string,
  data: T,
  correlationId = "corr-auto"
): DomainEvent<T> {
  return {
    eventId: crypto.randomUUID ? crypto.randomUUID() : `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    eventType,
    producer,
    timestamp: new Date().toISOString(),
    correlationId,
    data,
  };
}

export * from "./errors.js";
export * from "./config.js";
export * from "./security.js";
export * from "./ports.js";
export * from "./server-launcher.js";
export * from "./design-tokens.js";
export * from "./book-3d.js";


