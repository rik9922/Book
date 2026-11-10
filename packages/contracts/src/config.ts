import { z } from "zod";
import {
  DEFAULT_LOCAL_JWT_SECRET,
  DEFAULT_LOCAL_SERVICE_KEY,
  DEFAULT_LOCAL_SESSION_SECRET,
} from "./security.js";

export const BaseServiceConfigSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
    JWT_SECRET: z.string().min(8).default(DEFAULT_LOCAL_JWT_SECRET),
    SESSION_SECRET: z.string().min(8).default(DEFAULT_LOCAL_SESSION_SECRET),
    INTERNAL_SERVICE_KEY: z.string().min(8).default(DEFAULT_LOCAL_SERVICE_KEY),
    DATABASE_URL: z.string().optional(),
    IDENTITY_DATABASE_URL: z.string().optional(),
    MEMORY_DATABASE_URL: z.string().optional(),
    MEDIA_DATABASE_URL: z.string().optional(),
    COLLAB_DATABASE_URL: z.string().optional(),
    BOOK_DATABASE_URL: z.string().optional(),
    COMMERCE_DATABASE_URL: z.string().optional(),
    NOTIFICATION_DATABASE_URL: z.string().optional(),
    REDIS_URL: z.string().default("redis://localhost:6379"),
    NATS_URL: z.string().default("nats://localhost:4222"),
    LOCAL_STORAGE_PATH: z.string().optional(),
  })
  .superRefine((cfg, ctx) => {
    if (cfg.NODE_ENV === "production") {
      if (cfg.JWT_SECRET.length < 32 || cfg.JWT_SECRET === DEFAULT_LOCAL_JWT_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["JWT_SECRET"],
          message: "Production JWT_SECRET must be >= 32 characters and not use development defaults.",
        });
      }
      if (cfg.SESSION_SECRET.length < 32 || cfg.SESSION_SECRET === DEFAULT_LOCAL_SESSION_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["SESSION_SECRET"],
          message: "Production SESSION_SECRET must be >= 32 characters and not use development defaults.",
        });
      }
      if (
        cfg.INTERNAL_SERVICE_KEY.length < 32 ||
        cfg.INTERNAL_SERVICE_KEY === DEFAULT_LOCAL_SERVICE_KEY
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["INTERNAL_SERVICE_KEY"],
          message: "Production INTERNAL_SERVICE_KEY must be >= 32 characters and not use development defaults.",
        });
      }
    }
  });

export type BaseServiceConfig = z.infer<typeof BaseServiceConfigSchema>;

export function validateServiceConfig<T extends z.ZodTypeAny>(
  schema: T,
  rawEnv?: Record<string, string | undefined>
): z.infer<T> {
  const envToValidate = rawEnv || (typeof process !== "undefined" ? process.env : {});
  const result = schema.safeParse(envToValidate);
  if (!result.success) {
    const issues = (result.error as any).issues || (result.error as any).errors || [];
    const errorDetails = issues.map((e: any) => `  - ${e.path.join(".")}: ${e.message}`).join("\n");
    const message = `[Config Validation Error] Fatal configuration failure:\n${errorDetails}`;
    throw new Error(message);
  }
  return result.data;
}
