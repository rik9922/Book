import fs from "node:fs/promises";
import path from "node:path";
import { SimulatorManager } from "../ios/simulator/simulator-manager";
import { MediaInjector } from "../ios/media-injection/media-injector";
import { PermissionManager } from "../ios/permissions/permission-manager";
import type { TestDatasetManifest } from "../fixtures/schemas/manifest.schema";

const ROOT_TESTING_DIR = path.resolve(process.cwd(), "testing");
const MANIFEST_PATH = path.join(ROOT_TESTING_DIR, "fixtures", "manifests", "synthetic-media-manifest.json");

export async function injectSimulatorMedia(deviceUdid?: string): Promise<{ deviceUdid: string; injectedCount: number; screenshotPath: string }> {
  console.log("📲 [Memoria Simulator Injector] Starting media injection pipeline...");

  const rawManifest = await fs.readFile(MANIFEST_PATH, "utf-8");
  const manifest: TestDatasetManifest = JSON.parse(rawManifest);

  const photoAndVideoAssets = manifest.assets.filter((a) => a.mediaType === "photo" || a.mediaType === "video");
  const filePaths = photoAndVideoAssets.map((a) => a.filePath);

  const simManager = new SimulatorManager();
  const targetDevice = deviceUdid
    ? { udid: deviceUdid, name: "Target Device", state: "Unknown", isAvailable: true, runtime: "" }
    : await simManager.findPreferredDevice();

  console.log(`🎯 Target Simulator: ${targetDevice.name} (${targetDevice.udid})`);
  await simManager.boot(targetDevice.udid);

  // Inject media
  const injector = new MediaInjector();
  const results = await injector.injectMedia(targetDevice.udid, filePaths);

  // Grant permissions for app
  const permManager = new PermissionManager();
  await permManager.grantStandardPermissions(targetDevice.udid, "com.memoria.app");

  // Capture screenshot as evidence
  const evidenceDir = path.join(ROOT_TESTING_DIR, "reports", "evidence");
  await fs.mkdir(evidenceDir, { recursive: true });
  const screenshotPath = path.join(evidenceDir, `simulator_injected_${Date.now()}.png`);
  await simManager.captureScreenshot(targetDevice.udid, screenshotPath);
  console.log(`📸 Simulator screenshot captured: ${screenshotPath}`);

  return {
    deviceUdid: targetDevice.udid,
    injectedCount: results.length,
    screenshotPath,
  };
}

if (process.argv[1] && process.argv[1].endsWith("inject-simulator-media.ts")) {
  injectSimulatorMedia()
    .then(({ deviceUdid, injectedCount, screenshotPath }) => {
      console.log(`🎉 Simulator Media Injection Succeeded! Injected ${injectedCount} assets into ${deviceUdid}. Evidence: ${screenshotPath}`);
    })
    .catch((err) => {
      console.error("❌ Media injection failed:", err);
      process.exit(1);
    });
}

