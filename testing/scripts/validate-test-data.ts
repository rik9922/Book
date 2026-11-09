import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { TestDatasetManifestSchema, type TestDatasetManifest } from "../fixtures/schemas/manifest.schema";

const ROOT_TESTING_DIR = path.resolve(process.cwd(), "testing");
const MANIFEST_PATH = path.join(ROOT_TESTING_DIR, "fixtures", "manifests", "synthetic-media-manifest.json");

export async function validateTestData(): Promise<{ totalAssets: number; verifiedAssets: number }> {
  console.log("🔍 [Memoria Fixture Validator] Validating synthetic test data and manifests...");

  const rawManifest = await fs.readFile(MANIFEST_PATH, "utf-8");
  const parsedManifest: TestDatasetManifest = JSON.parse(rawManifest);

  // 1. Validate Schema
  TestDatasetManifestSchema.parse(parsedManifest);
  console.log(`✅ Manifest schema validated successfully (v${parsedManifest.version}).`);

  // 2. Validate Every File
  let verifiedCount = 0;
  for (const asset of parsedManifest.assets) {
    const fullPath = path.resolve(process.cwd(), asset.filePath);
    const stat = await fs.stat(fullPath);

    if (stat.size !== asset.fileSize) {
      throw new Error(`Size mismatch for ${asset.filename}: manifest says ${asset.fileSize}, disk has ${stat.size}`);
    }

    const bytes = await fs.readFile(fullPath);
    const hash = crypto.createHash("sha256").update(bytes).digest("hex");
    if (hash !== asset.checksumSha256) {
      throw new Error(`Checksum mismatch for ${asset.filename}: manifest ${asset.checksumSha256}, disk ${hash}`);
    }

    verifiedCount++;
  }

  console.log(`✅ All ${verifiedCount}/${parsedManifest.assets.length} synthetic assets physically verified on disk.`);
  return { totalAssets: parsedManifest.assets.length, verifiedAssets: verifiedCount };
}

if (process.argv[1] && process.argv[1].endsWith("validate-test-data.ts")) {
  validateTestData()
    .then(({ verifiedAssets }) => {
      console.log(`🎉 Validation Passed: ${verifiedAssets} verified assets.`);
    })
    .catch((err) => {
      console.error("❌ Validation Failed:", err);
      process.exit(1);
    });
}
