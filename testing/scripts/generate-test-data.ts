import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { generateBennettFamilyWorkspace } from "../generators/structured-data/generate-fictional-family";
import { generateSyntheticPhotos, PHOTO_SPECS } from "../generators/image/generate-photos";
import { generateSyntheticVideos } from "../generators/video/generate-videos";
import { generateSyntheticAudio } from "../generators/audio/generate-audio";
import { generateSyntheticDocuments } from "../generators/documents/generate-documents";
import { TestDatasetManifestSchema, type MediaAssetManifestItem, type TestDatasetManifest } from "../fixtures/schemas/manifest.schema";

const ROOT_TESTING_DIR = path.resolve(process.cwd(), "testing");
const FIXTURES_DIR = path.join(ROOT_TESTING_DIR, "fixtures");
const MANIFESTS_DIR = path.join(FIXTURES_DIR, "manifests");
const MEDIA_DIR = path.join(FIXTURES_DIR, "media");

export async function generateAllTestData() {
  console.log("🌟 [Memoria Test Data] Initiating synthetic media and application dataset generation...");

  // 1. Structure paths
  await fs.mkdir(MANIFESTS_DIR, { recursive: true });
  await fs.mkdir(path.join(FIXTURES_DIR, "users"), { recursive: true });
  await fs.mkdir(path.join(FIXTURES_DIR, "families"), { recursive: true });
  await fs.mkdir(path.join(FIXTURES_DIR, "memories"), { recursive: true });

  const photosDir = path.join(MEDIA_DIR, "photos");
  const videosDir = path.join(MEDIA_DIR, "videos");
  const audioDir = path.join(MEDIA_DIR, "audio");
  const documentsDir = path.join(MEDIA_DIR, "documents");

  // 2. Generate structured models
  const familyWorkspace = generateBennettFamilyWorkspace();
  await fs.writeFile(
    path.join(FIXTURES_DIR, "families", "synthetic-families.json"),
    JSON.stringify([familyWorkspace], null, 2)
  );
  await fs.writeFile(
    path.join(FIXTURES_DIR, "users", "synthetic-users.json"),
    JSON.stringify(familyWorkspace.members, null, 2)
  );
  await fs.writeFile(
    path.join(FIXTURES_DIR, "memories", "synthetic-memories.json"),
    JSON.stringify(familyWorkspace.memories, null, 2)
  );
  console.log("✅ Structured family and memory records written.");

  // 3. Generate media
  console.log("📸 Generating photorealistic synthetic photographs...");
  const photos = await generateSyntheticPhotos(photosDir);
  console.log(`   Generated ${photos.length} photos.`);

  console.log("🎬 Generating H.264/AAC synthetic test videos...");
  const videos = await generateSyntheticVideos(videosDir);
  console.log(`   Generated ${videos.length} videos.`);

  console.log("🎙️ Generating M4A synthetic voice and audio notes...");
  const audios = await generateSyntheticAudio(audioDir);
  console.log(`   Generated ${audios.length} audio files.`);

  console.log("📄 Generating synthetic archival documents (PDF/TXT)...");
  const documents = await generateSyntheticDocuments(documentsDir);
  console.log(`   Generated ${documents.length} documents.`);

  // 4. Assemble Manifest Items
  const manifestAssets: MediaAssetManifestItem[] = [];

  // Map photos
  for (const p of photos) {
    const spec = PHOTO_SPECS.find((s) => s.filename === p.filename)!;
    const memory = familyWorkspace.memories.find((m) => m.mediaFilenames.includes(p.filename)) || familyWorkspace.memories[0];

    manifestAssets.push({
      id: crypto.randomUUID(),
      filename: p.filename,
      filePath: path.relative(process.cwd(), p.filePath),
      mediaType: "photo",
      mimeType: "image/jpeg",
      fileSize: p.size,
      dimensions: {
        width: spec.width,
        height: spec.height,
      },
      checksumSha256: p.checksum,
      simulatedExif: {
        capturedAt: memory.capturedAt,
        cameraMake: spec.cameraModel.split(" ")[0],
        cameraModel: spec.cameraModel,
        latitude: memory.latitude,
        longitude: memory.longitude,
        locationName: spec.locationName,
      },
      associatedMemory: {
        memoryId: memory.id,
        title: memory.title,
        description: memory.content,
        tags: memory.tags,
        scenario: memory.scenario,
        authorName: memory.authorName,
        associatedPeople: memory.associatedPeople,
      },
      isSynthetic: true,
      license: "Internal Memoria Synthetic QA Asset (CC0-Equivalent)",
    });
  }

  // Map videos
  for (const v of videos) {
    const memory = familyWorkspace.memories.find((m) => m.mediaFilenames.includes(v.filename)) || familyWorkspace.memories[0];
    manifestAssets.push({
      id: crypto.randomUUID(),
      filename: v.filename,
      filePath: path.relative(process.cwd(), v.filePath),
      mediaType: "video",
      mimeType: "video/mp4",
      fileSize: v.size,
      durationSeconds: v.duration,
      dimensions: {
        width: 1920,
        height: 1080,
      },
      checksumSha256: v.checksum,
      simulatedExif: {
        capturedAt: memory.capturedAt,
        locationName: memory.location,
      },
      associatedMemory: {
        memoryId: memory.id,
        title: memory.title,
        description: memory.content,
        tags: memory.tags,
        scenario: memory.scenario,
        authorName: memory.authorName,
        associatedPeople: memory.associatedPeople,
      },
      isSynthetic: true,
      license: "Internal Memoria Synthetic QA Asset (CC0-Equivalent)",
    });
  }

  // Map audio
  for (const a of audios) {
    const memory = familyWorkspace.memories[3]; // Grandmother Eleanor baking voice note
    manifestAssets.push({
      id: crypto.randomUUID(),
      filename: a.filename,
      filePath: path.relative(process.cwd(), a.filePath),
      mediaType: "audio",
      mimeType: "audio/mp4",
      fileSize: a.size,
      durationSeconds: a.duration,
      checksumSha256: a.checksum,
      simulatedExif: {
        capturedAt: memory.capturedAt,
        locationName: memory.location,
      },
      associatedMemory: {
        memoryId: memory.id,
        title: memory.title,
        description: memory.content,
        tags: memory.tags,
        scenario: memory.scenario,
        authorName: memory.authorName,
        associatedPeople: memory.associatedPeople,
      },
      isSynthetic: true,
      license: "Internal Memoria Synthetic QA Asset (CC0-Equivalent)",
    });
  }

  // Map documents
  for (const d of documents) {
    const memory = familyWorkspace.memories[3];
    manifestAssets.push({
      id: crypto.randomUUID(),
      filename: d.filename,
      filePath: path.relative(process.cwd(), d.filePath),
      mediaType: "document",
      mimeType: d.filename.endsWith(".pdf") ? "application/pdf" : "text/plain",
      fileSize: d.size,
      checksumSha256: d.checksum,
      simulatedExif: {
        capturedAt: memory.capturedAt,
        locationName: memory.location,
      },
      associatedMemory: {
        memoryId: memory.id,
        title: "The Bennett Family Genealogy Document",
        description: "Official family history summary for archival preservation.",
        tags: ["genealogy", "history", "document"],
        scenario: "daily_lifestyle",
        authorName: "Arthur Bennett",
        associatedPeople: ["Arthur Bennett", "Eleanor Bennett"],
      },
      isSynthetic: true,
      license: "Internal Memoria Synthetic QA Asset (CC0-Equivalent)",
    });
  }

  // 5. Build Master Manifest
  const manifest: TestDatasetManifest = {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    familyWorkspace: {
      id: familyWorkspace.id,
      name: familyWorkspace.name,
      description: familyWorkspace.description,
      motto: familyWorkspace.motto,
      members: familyWorkspace.members.map((m) => ({
        id: m.id,
        name: m.name,
        role: m.role,
        relationship: m.relationship,
        email: m.email,
      })),
    },
    assets: manifestAssets,
  };

  // Validate manifest schema
  TestDatasetManifestSchema.parse(manifest);

  const manifestPath = path.join(MANIFESTS_DIR, "synthetic-media-manifest.json");
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  console.log(`📋 Master manifest written & validated: ${manifestPath}`);

  // 6. Profiles
  const smallProfile = {
    profile: "small",
    description: "Compact dataset for fast CI and smoke testing",
    assetIds: manifestAssets.slice(0, 4).map((a) => a.id),
    filenames: manifestAssets.slice(0, 4).map((a) => a.filename),
  };
  await fs.writeFile(
    path.join(MANIFESTS_DIR, "dataset-profile-small.json"),
    JSON.stringify(smallProfile, null, 2)
  );

  const standardProfile = {
    profile: "standard",
    description: "Comprehensive multi-generational family archive for full E2E testing",
    assetIds: manifestAssets.map((a) => a.id),
    filenames: manifestAssets.map((a) => a.filename),
  };
  await fs.writeFile(
    path.join(MANIFESTS_DIR, "dataset-profile-standard.json"),
    JSON.stringify(standardProfile, null, 2)
  );

  console.log("✨ [Memoria Test Data] Generation completed successfully!");
}

if (process.argv[1] && process.argv[1].endsWith("generate-test-data.ts")) {
  generateAllTestData().catch((err) => {
    console.error("❌ Test data generation failed:", err);
    process.exit(1);
  });
}
