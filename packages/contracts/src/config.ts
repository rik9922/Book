import { z } from "zod";

export const BaseServiceConfigSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  JWT_SECRET: z.string().min(8).default("dev-jwt-secret-memory-capsule-2026"),
  INTERNAL_SERVICE_KEY: z.string().min(8).default("memory-capsule-internal-service-secret-2026"),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  NATS_URL: z.string().default("nats://localhost:4222"),
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
