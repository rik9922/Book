import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createDatabaseClient } from "@memory-capsule/database";
import { BackupManifest, calculateFileSha256, resolvePgConnectionDefaults } from "./backup.js";

const execFileAsync = promisify(execFile);

const DEFAULT_BACKUPS_ROOT = path.resolve(
  process.cwd(),
  process.env.MEMORIA_BACKUP_ROOT || "backups"
);
const DEFAULT_STORAGE_LOCAL = path.resolve(
  process.cwd(),
  process.env.LOCAL_STORAGE_PATH || "storage_data"
);

export interface RestorationReport {
  backupId: string;
  mode: "verify_only" | "isolated_restore" | "live_restore";
  startedAt: string;
  completedAt: string;
  status: "SUCCESS" | "FAILED";
  checksumsVerified: boolean;
  archiveInspected: boolean;
  databasesRestored: {
    sourceDb: string;
    targetDb: string;
    expectedCounts: Record<string, number>;
    actualCounts: Record<string, number>;
    countsMatch: boolean;
  }[];
  mediaRestored: {
    targetDir: string;
    expectedFileCount: number;
    actualFileCount: number;
    checksumMismatches: string[];
    missingFiles: string[];
  };
  missingMediaReferences: {
    memoryId: string;
    mediaId: string;
    reason: string;
  }[];
  errors: string[];
}

async function verifyMediaArchiveContents(
  mediaTarPath: string,
  manifest: BackupManifest,
  extractTargetDir: string
): Promise<{ actualFileCount: number; checksumMismatches: string[]; missingFiles: string[] }> {
  await fs.mkdir(extractTargetDir, { recursive: true });
  await execFileAsync("tar", [
    "-xzf",
    mediaTarPath,
    "-C",
    extractTargetDir,
    "--strip-components=1",
  ]);

  const actualFiles: string[] = [];
  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile()) {
        actualFiles.push(path.relative(extractTargetDir, full).split(path.sep).join("/"));
      }
    }
  }
  await walk(extractTargetDir);

  const missingFiles: string[] = [];
  const checksumMismatches: string[] = [];

  for (const expected of manifest.assetManifest || []) {
    const full = path.join(extractTargetDir, expected.relativePath);
    if (!existsSync(full)) {
      missingFiles.push(expected.relativePath);
      continue;
    }
    const sha = await calculateFileSha256(full);
    if (sha.toLowerCase() !== expected.sha256.toLowerCase()) {
      checksumMismatches.push(expected.relativePath);
    }
  }

  return {
    actualFileCount: actualFiles.length,
    checksumMismatches,
    missingFiles,
  };
}

async function queryTableCount(dbUrl: string, tableName: string): Promise<number> {
  const client = createDatabaseClient(dbUrl);
  try {
    const res = await client.query<{ count: string }>(`SELECT count(*) as count FROM ${tableName}`);
    await client.close();
    return parseInt(res.rows[0]?.count || "0", 10);
  } catch {
    await client.close().catch(() => {});
    return -1;
  }
}

export async function restoreBackup(options: {
  backupDir?: string;
  backupsRoot?: string;
  verifyOnly?: boolean;
  targetDbSuffix?: string;
  targetStorageDir?: string;
  confirmLiveRestore?: boolean;
  createTargetDbs?: boolean;
  reportPath?: string;
}): Promise<RestorationReport> {
  const backupsRoot = path.resolve(options.backupsRoot || DEFAULT_BACKUPS_ROOT);
  let targetDir = options.backupDir;

  if (!targetDir) {
    const entries = await fs.readdir(backupsRoot, { withFileTypes: true }).catch(() => []);
    const backupDirs = entries
      .filter((e) => e.isDirectory() && e.name.startsWith("memoria-backup-"))
      .map((e) => e.name)
      .sort();

    if (backupDirs.length === 0) {
      throw new Error(`No Memoria backups found in ${backupsRoot}`);
    }
    targetDir = path.join(backupsRoot, backupDirs[backupDirs.length - 1]);
  }

  const manifestPath = path.join(targetDir, "manifest.json");
  if (!existsSync(manifestPath)) {
    throw new Error(`Invalid backup directory: manifest.json missing in ${targetDir}`);
  }

  const manifest: BackupManifest = JSON.parse(await fs.readFile(manifestPath, "utf-8"));
  if (manifest.status === "FAILED") {
    throw new Error(`Backup '${manifest.backupId}' has status FAILED and cannot be verified or restored.`);
  }
  if (!manifest.databases || manifest.databases.length === 0) {
    throw new Error(`Backup '${manifest.backupId}' contains no database dumps.`);
  }

  const isIsolated = Boolean(options.targetDbSuffix || options.targetStorageDir);
  if (!options.verifyOnly && !isIsolated && !options.confirmLiveRestore) {
    throw new Error(
      "Refusing destructive live restore without explicit authorization. Use --target-db-suffix / --target-storage-dir for isolated restore, or pass --confirm-live-restore."
    );
  }

  const report: RestorationReport = {
    backupId: manifest.backupId,
    mode: options.verifyOnly ? "verify_only" : isIsolated ? "isolated_restore" : "live_restore",
    startedAt: new Date().toISOString(),
    completedAt: "",
    status: "FAILED",
    checksumsVerified: false,
    archiveInspected: false,
    databasesRestored: [],
    mediaRestored: {
      targetDir: options.targetStorageDir || DEFAULT_STORAGE_LOCAL,
      expectedFileCount: manifest.mediaArchive?.fileCount ?? (manifest.assetManifest?.length || 0),
      actualFileCount: 0,
      checksumMismatches: [],
      missingFiles: [],
    },
    missingMediaReferences: [],
    errors: [],
  };

  console.log(`\n🔍 [Memoria Restore Engine] Inspecting backup: ${manifest.backupId}`);
  console.log(`📅 Created: ${manifest.createdAt} (${manifest.postgresVersion}, Schema: ${manifest.schemaVersion || "unknown"})`);
  console.log(`Mode: ${options.verifyOnly ? "🟡 DRY-RUN / INTEGRITY VERIFICATION ONLY" : isIsolated ? "🟢 ISOLATED RESTORE" : "🔴 LIVE RESTORE"}\n`);

  // STEP 1: Fail-Closed Cryptographic Manifest & File Checksum Verification
  console.log("--- STEP 1: Verifying Cryptographic Checksums (SHA-256) ---");
  for (const db of manifest.databases) {
    const fullDumpPath = path.join(targetDir, db.dumpFile);
    if (!existsSync(fullDumpPath)) {
      throw new Error(`Integrity Error: Dump file missing for database '${db.name}': ${fullDumpPath}`);
    }
    const stat = await fs.stat(fullDumpPath);
    if (stat.size === 0) {
      throw new Error(`Integrity Error: Dump file for '${db.name}' is empty (0 bytes)`);
    }
    const sqlText = await fs.readFile(fullDumpPath, "utf-8");
    if (!sqlText.includes("PostgreSQL database dump") && !sqlText.includes("CREATE TABLE")) {
      throw new Error(`Integrity Error: Dump file for '${db.name}' appears incomplete or invalid`);
    }

    const computedHash = await calculateFileSha256(fullDumpPath);
    if (computedHash.toLowerCase() !== db.sha256.toLowerCase()) {
      throw new Error(
        `Corruption Detected: Checksum mismatch for '${db.name}'. Expected ${db.sha256}, got ${computedHash}`
      );
    }

    console.log(`  ✓ ${db.name.padEnd(16)}: SHA-256 verified (${(db.sizeBytes / 1024).toFixed(1)} KB)`);
  }

  // Media archive is REQUIRED (fail closed if missing)
  if (!manifest.mediaArchive || !manifest.mediaArchive.file) {
    throw new Error("Integrity Error: mediaArchive entry is missing from manifest.json");
  }
  const mediaPath = path.join(targetDir, manifest.mediaArchive.file);
  if (!existsSync(mediaPath)) {
    throw new Error(`Integrity Error: Required media archive is missing: ${mediaPath}`);
  }
  const computedMediaHash = await calculateFileSha256(mediaPath);
  if (computedMediaHash.toLowerCase() !== manifest.mediaArchive.sha256.toLowerCase()) {
    throw new Error(`Corruption Detected: Media archive checksum mismatch`);
  }
  console.log(`  ✓ Media Archive  : SHA-256 verified (${(manifest.mediaArchive.sizeBytes / 1024).toFixed(1)} KB)`);
  report.checksumsVerified = true;

  // Extract and inspect archive in verify-only mode using a temp directory
  if (options.verifyOnly) {
    const tmpInspectDir = await fs.mkdtemp(path.join(os.tmpdir(), "memoria-backup-verify-"));
    try {
      const check = await verifyMediaArchiveContents(mediaPath, manifest, tmpInspectDir);
      report.archiveInspected = true;
      report.mediaRestored.actualFileCount = check.actualFileCount;
      report.mediaRestored.checksumMismatches = check.checksumMismatches;
      report.mediaRestored.missingFiles = check.missingFiles;

      if (check.missingFiles.length > 0 || check.checksumMismatches.length > 0) {
        throw new Error(
          `Archive content verification failed: ${check.missingFiles.length} missing, ${check.checksumMismatches.length} checksum mismatches`
        );
      }
      if (check.actualFileCount !== report.mediaRestored.expectedFileCount) {
        throw new Error(
          `Archive file count mismatch: expected ${report.mediaRestored.expectedFileCount}, got ${check.actualFileCount}`
        );
      }
    } finally {
      await fs.rm(tmpInspectDir, { recursive: true, force: true }).catch(() => {});
    }

    report.status = "SUCCESS";
    report.completedAt = new Date().toISOString();
    if (options.reportPath) {
      await fs.writeFile(options.reportPath, JSON.stringify(report, null, 2), "utf-8");
    }
    console.log("\n✅ [Memoria Restore Engine] Dry-Run Validation Passed: 100% of dump files and media archive contents verified.\n");
    return report;
  }

  // STEP 2: Restore PostgreSQL Databases
  console.log("\n--- STEP 2: Restoring PostgreSQL Databases ---");
  const { pgUser, pgPass, pgHost, pgPort } = resolvePgConnectionDefaults();
  const auth = pgPass ? `${pgUser}:${pgPass}` : pgUser;
  const restoredDbNames = new Map<string, string>();

  for (const db of manifest.databases) {
    const fullDumpPath = path.join(targetDir, db.dumpFile);
    const targetDbName = options.targetDbSuffix ? `${db.name}${options.targetDbSuffix}` : db.name;
    restoredDbNames.set(db.name, targetDbName);

    if (options.targetDbSuffix && options.createTargetDbs) {
      const adminClient = createDatabaseClient(`postgres://${auth}@${pgHost}:${pgPort}/postgres`);
      try {
        const existsRes = await adminClient.query<{ exists: boolean }>(
          `SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) as exists`,
          [targetDbName]
        );
        if (!existsRes.rows[0]?.exists) {
          await adminClient.query(`CREATE DATABASE "${targetDbName.replace(/"/g, "")}"`);
        }
      } finally {
        await adminClient.close().catch(() => {});
      }
    }

    process.stdout.write(`  ⏳ Restoring database '${targetDbName}'... `);
    await execFileAsync(
      "psql",
      [
        "-v", "ON_ERROR_STOP=1",
        "-h", pgHost,
        "-p", pgPort,
        "-U", pgUser,
        "-d", targetDbName,
        "-f", fullDumpPath,
      ],
      {
        env: { ...process.env, ...(pgPass ? { PGPASSWORD: pgPass } : {}) },
      }
    );
    process.stdout.write("🟢 RESTORED\n");

    const actualCounts: Record<string, number> = {};
    let countsMatch = true;
    for (const [table, expectedCount] of Object.entries(db.recordCounts || {})) {
      const actual = await queryTableCount(`postgres://${auth}@${pgHost}:${pgPort}/${targetDbName}`, table);
      actualCounts[table] = actual;
      if (actual !== expectedCount) {
        countsMatch = false;
      }
    }
    report.databasesRestored.push({
      sourceDb: db.name,
      targetDb: targetDbName,
      expectedCounts: db.recordCounts || {},
      actualCounts,
      countsMatch,
    });
  }

  // STEP 3: Restore Media Storage & Verify Per-File Checksums
  console.log("\n--- STEP 3: Restoring Media Storage ---");
  const finalMediaDir = path.resolve(options.targetStorageDir || DEFAULT_STORAGE_LOCAL);
  const mediaCheck = await verifyMediaArchiveContents(mediaPath, manifest, finalMediaDir);
  report.archiveInspected = true;
  report.mediaRestored = {
    targetDir: finalMediaDir,
    expectedFileCount: manifest.mediaArchive.fileCount,
    actualFileCount: mediaCheck.actualFileCount,
    checksumMismatches: mediaCheck.checksumMismatches,
    missingFiles: mediaCheck.missingFiles,
  };
  if (mediaCheck.missingFiles.length > 0 || mediaCheck.checksumMismatches.length > 0) {
    throw new Error(
      `Restored media verification failed: ${mediaCheck.missingFiles.length} missing, ${mediaCheck.checksumMismatches.length} checksum mismatches`
    );
  }
  console.log(`  🟢 RESTORED (${mediaCheck.actualFileCount} files verified via SHA-256)`);

  // STEP 4: Verify Memory-to-Media References
  const restoredMemoryDb = restoredDbNames.get("memory_db");
  const restoredMediaDb = restoredDbNames.get("media_db");
  if (restoredMemoryDb && restoredMediaDb) {
    const memClient = createDatabaseClient(`postgres://${auth}@${pgHost}:${pgPort}/${restoredMemoryDb}`);
    const medClient = createDatabaseClient(`postgres://${auth}@${pgHost}:${pgPort}/${restoredMediaDb}`);
    try {
      const memRows = await memClient.query<{ id: string; media_ids: string[] }>(
        `SELECT id, media_ids FROM memories WHERE deleted_at IS NULL AND array_length(media_ids, 1) > 0`
      );
      const medRows = await medClient.query<{ id: string; storage_key: string }>(
        `SELECT id, storage_key FROM media_assets`
      );
      const assetById = new Map(medRows.rows.map((r) => [r.id, r.storage_key]));

      for (const mem of memRows.rows) {
        for (const mid of mem.media_ids || []) {
          const storageKey = assetById.get(mid);
          if (!storageKey) {
            report.missingMediaReferences.push({
              memoryId: mem.id,
              mediaId: mid,
              reason: "Missing media_assets row in media_db",
            });
          } else if (!existsSync(path.join(finalMediaDir, storageKey))) {
            report.missingMediaReferences.push({
              memoryId: mem.id,
              mediaId: mid,
              reason: `Missing original file on disk at ${storageKey}`,
            });
          }
        }
      }
    } finally {
      await memClient.close().catch(() => {});
      await medClient.close().catch(() => {});
    }
  }

  report.status = "SUCCESS";
  report.completedAt = new Date().toISOString();
  if (options.reportPath) {
    await fs.writeFile(options.reportPath, JSON.stringify(report, null, 2), "utf-8");
  }

  console.log(`\n✨ Restore completed successfully from ${manifest.backupId}!\n`);
  return report;
}

if (process.argv[1]?.endsWith("restore.ts")) {
  const verifyOnly = process.argv.includes("--verify-only");
  const confirmLiveRestore = process.argv.includes("--confirm-live-restore");
  const createTargetDbs = process.argv.includes("--create-target-dbs");
  const suffixArg = process.argv.find((a) => a.startsWith("--target-db-suffix="))?.split("=")[1];
  const storageArg = process.argv.find((a) => a.startsWith("--target-storage-dir="))?.split("=")[1];
  const reportArg = process.argv.find((a) => a.startsWith("--report-path="))?.split("=")[1];

  restoreBackup({
    verifyOnly,
    confirmLiveRestore,
    createTargetDbs,
    targetDbSuffix: suffixArg,
    targetStorageDir: storageArg,
    reportPath: reportArg,
  }).catch((err) => {
    console.error("Restore failed:", err.message);
    process.exit(1);
  });
}
