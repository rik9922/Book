import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import { existsSync, createReadStream } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { BackupManifest } from "./backup.js";

const execFileAsync = promisify(execFile);

const BACKUPS_ROOT = path.resolve(process.cwd(), "backups");
const STORAGE_LOCAL = path.resolve(process.cwd(), "storage/local");

async function calculateFileSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

export async function restoreBackup(options: {
  backupDir?: string;
  verifyOnly?: boolean;
}): Promise<boolean> {
  let targetDir = options.backupDir;

  if (!targetDir) {
    // Find latest backup
    const entries = await fs.readdir(BACKUPS_ROOT, { withFileTypes: true }).catch(() => []);
    const backupDirs = entries
      .filter((e) => e.isDirectory() && e.name.startsWith("memoria-backup-"))
      .map((e) => e.name)
      .sort();

    if (backupDirs.length === 0) {
      throw new Error(`No Memoria backups found in ${BACKUPS_ROOT}`);
    }

    targetDir = path.join(BACKUPS_ROOT, backupDirs[backupDirs.length - 1]);
  }

  const manifestPath = path.join(targetDir, "manifest.json");
  if (!existsSync(manifestPath)) {
    throw new Error(`Invalid backup directory: manifest.json missing in ${targetDir}`);
  }

  const manifest: BackupManifest = JSON.parse(await fs.readFile(manifestPath, "utf-8"));
  console.log(`\n🔍 [Memoria Restore Engine] Inspecting backup: ${manifest.backupId}`);
  console.log(`📅 Created: ${manifest.createdAt} (${manifest.postgresVersion})`);
  console.log(`Mode: ${options.verifyOnly ? "🟡 DRY-RUN / INTEGRITY VERIFICATION ONLY" : "🔴 LIVE RESTORE"}\n`);

  // STEP 1: Cryptographic Manifest & File Checksum Verification
  console.log("--- STEP 1: Verifying Cryptographic Checksums (SHA-256) ---");
  for (const db of manifest.databases) {
    const fullDumpPath = path.join(targetDir, db.dumpFile);
    if (!existsSync(fullDumpPath)) {
      throw new Error(`Integrity Error: Dump file missing for database '${db.name}': ${fullDumpPath}`);
    }

    const computedHash = await calculateFileSha256(fullDumpPath);
    if (computedHash.toLowerCase() !== db.sha256.toLowerCase()) {
      throw new Error(
        `Corruption Detected: Checksum mismatch for '${db.name}'. Expected ${db.sha256}, got ${computedHash}`
      );
    }

    console.log(`  ✓ ${db.name.padEnd(16)}: SHA-256 verified (${(db.sizeBytes / 1024).toFixed(1)} KB)`);
  }

  if (manifest.mediaArchive) {
    const mediaPath = path.join(targetDir, manifest.mediaArchive.file);
    if (existsSync(mediaPath)) {
      const computedMediaHash = await calculateFileSha256(mediaPath);
      if (computedMediaHash.toLowerCase() !== manifest.mediaArchive.sha256.toLowerCase()) {
        throw new Error(`Corruption Detected: Media archive checksum mismatch`);
      }
      console.log(`  ✓ Media Archive  : SHA-256 verified (${(manifest.mediaArchive.sizeBytes / 1024).toFixed(1)} KB)`);
    }
  }

  // If verify-only mode requested, stop here
  if (options.verifyOnly) {
    console.log("\n✅ [Memoria Restore Engine] Dry-Run Validation Passed: 100% of dump files and media archives are intact and uncorrupted.\n");
    return true;
  }

  // STEP 2: Restore PostgreSQL Databases
  console.log("\n--- STEP 2: Restoring PostgreSQL Databases ---");
  const pgUser = process.env.PGUSER || process.env.DB_USER || "postgres";
  const pgPass = process.env.PGPASSWORD || process.env.DB_PASSWORD || "postgrespassword";

  for (const db of manifest.databases) {
    const fullDumpPath = path.join(targetDir, db.dumpFile);
    process.stdout.write(`  ⏳ Restoring database '${db.name}'... `);

    try {
      await execFileAsync("psql", [
        "-h", "localhost",
        "-p", "5432",
        "-U", pgUser,
        "-d", db.name,
        "-f", fullDumpPath,
      ], {
        env: { ...process.env, PGPASSWORD: pgPass },
      });
      process.stdout.write("🟢 RESTORED\n");
    } catch (restoreErr: any) {
      process.stdout.write(`❌ ERROR: ${restoreErr.message}\n`);
      throw restoreErr;
    }
  }

  // STEP 3: Restore Media Storage
  if (manifest.mediaArchive) {
    const mediaPath = path.join(targetDir, manifest.mediaArchive.file);
    if (existsSync(mediaPath)) {
      console.log("\n--- STEP 3: Restoring Media Storage ---");
      process.stdout.write(`  ⏳ Unpacking ${manifest.mediaArchive.file} to ${path.dirname(STORAGE_LOCAL)}... `);
      await execFileAsync("tar", [
        "-xzf",
        mediaPath,
        "-C",
        path.dirname(STORAGE_LOCAL),
      ]);
      process.stdout.write("🟢 RESTORED\n");
    }
  }

  console.log(`\n✨ Restore completed successfully from ${manifest.backupId}!\n`);
  return true;
}

if (process.argv[1]?.endsWith("restore.ts")) {
  const verifyOnly = process.argv.includes("--verify-only");
  restoreBackup({ verifyOnly }).catch((err) => {
    console.error("Restore failed:", err.message);
    process.exit(1);
  });
}
