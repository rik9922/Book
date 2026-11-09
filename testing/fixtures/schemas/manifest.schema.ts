import { z } from "zod";

export const MediaAssetManifestItemSchema = z.object({
  id: z.string().uuid(),
  filename: z.string(),
  filePath: z.string(),
  mediaType: z.enum(["photo", "video", "audio", "document"]),
  mimeType: z.string(),
  fileSize: z.number().int().positive(),
  dimensions: z
    .object({
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    })
    .optional(),
  durationSeconds: z.number().positive().optional(),
  checksumSha256: z.string(),
  simulatedExif: z
    .object({
      capturedAt: z.string().datetime(),
      cameraMake: z.string().optional(),
      cameraModel: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      locationName: z.string().optional(),
    })
    .optional(),
  associatedMemory: z.object({
    memoryId: z.string().uuid(),
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()),
    scenario: z.enum(["family_gathering", "travel_expedition", "personal_milestone", "daily_lifestyle"]),
    authorName: z.string(),
    associatedPeople: z.array(z.string()),
  }),
  isSynthetic: z.literal(true),
  license: z.string(),
});

export type MediaAssetManifestItem = z.infer<typeof MediaAssetManifestItemSchema>;

export const TestDatasetManifestSchema = z.object({
  version: z.string(),
  generatedAt: z.string().datetime(),
  familyWorkspace: z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string(),
    motto: z.string(),
    members: z.array(
      z.object({
        id: z.string().uuid(),
        name: z.string(),
        role: z.enum(["owner", "editor", "contributor", "viewer"]),
        relationship: z.string(),
        email: z.string().email(),
      })
    ),
  }),
  assets: z.array(MediaAssetManifestItemSchema),
});

export type TestDatasetManifest = z.infer<typeof TestDatasetManifestSchema>;

