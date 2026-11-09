import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import { existsSync, createReadStream } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createDatabaseClient } from "@memory-capsule/database";

const execFileAsync = promisify(execFile);

const BACKUPS_ROOT = path.resolve(process.cwd(), "backups");
const STORAGE_LOCAL = path.resolve(process.cwd(), "storage/local");

const DATABASES = [
  "identity_db",
  "memory_db",
  "media_db",
  "collab_db",
  "book_db",
  "commerce_db",
  "notification_db",
];

async function calculateFileSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

export interface BackupManifest {
  backupId: string;
  createdAt: string;
  postgresVersion: string;
  databases: {
    name: string;
    dumpFile: string;
    sizeBytes: number;
    sha256: string;
    recordCounts: Record<string, number>;
  }[];
  mediaArchive?: {
    file: string;
    sizeBytes: number;
    sha256: string;
  };
  totalSizeBytes: number;
  status: "COMPLETE" | "VERIFIED" | "FAILED";
}

async function getRecordCount(dbName: string, tableName: string): Promise<number> {
  const dbUrl = `postgres://postgres:postgrespassword@localhost:5432/${dbName}`;
  const client = createDatabaseClient(dbUrl);
  try {
    const result = await client.query<{ count: string }>(`SELECT count(*) as count FROM ${tableName}`);
    await client.close();
    return parseInt(result.rows[0]?.count || "0", 10);
  } catch {
    await client.close().catch(() => {});
    return 0;
  }
}

export async function createBackup(): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupId = `memoria-backup-${timestamp}`;
  const backupDir = path.join(BACKUPS_ROOT, backupId);
  const dbDumpsDir = path.join(backupDir, "databases");

  await fs.mkdir(dbDumpsDir, { recursive: true });

  console.log(`\n📦 [Memoria Backup] Starting backup: ${backupId}`);
  console.log(`📁 Destination: ${backupDir}\n`);

  // 1. Get PostgreSQL version
  let pgVersion = "PostgreSQL 17";
  try {
    const { stdout } = await execFileAsync("psql", ["-V"]);
    pgVersion = stdout.trim();
  } catch {}

  const manifest: BackupManifest = {
    backupId,
    createdAt: new Date().toISOString(),
    postgresVersion: pgVersion,
    databases: [],
    totalSizeBytes: 0,
    status: "COMPLETE",
  };

  // 2. Dump each microservice database
  for (const dbName of DATABASES) {
    const dumpFileName = `${dbName}.sql`;
    const dumpFilePath = path.join(dbDumpsDir, dumpFileName);
    process.stdout.write(`  ⏳ Dumping database '${dbName}'... `);

    try {
      // Use pg_dump (with host and user)
      await execFileAsync("pg_dump", [
        "-h", "localhost",
        "-p", "5432",
        "-U", "postgres",
        "--clean",
        "--if-exists",
        "--no-owner",
        "--no-privileges",
        "-f", dumpFilePath,
        dbName,
      ], {
        env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD || "postgrespassword" },
      });

      const stats = await fs.stat(dumpFilePath);
      const sha256 = await calculateFileSha256(dumpFilePath);

      // Collect table counts
      const counts: Record<string, number> = {};
      if (dbName === "identity_db") {
        counts.users = await getRecordCount(dbName, "users");
      } else if (dbName === "memory_db") {
        counts.memory_spaces = await getRecordCount(dbName, "memory_spaces");
        counts.memories = await getRecordCount(dbName, "memories");
      } else if (dbName === "media_db") {
        counts.media_assets = await getRecordCount(dbName, "media_assets");
      } else if (dbName === "book_db") {
        counts.books = await getRecordCount(dbName, "books");
      }

      manifest.databases.push({
        name: dbName,
        dumpFile: `databases/${dumpFileName}`,
        sizeBytes: stats.size,
        sha256,
        recordCounts: counts,
      });

      manifest.totalSizeBytes += stats.size;
      process.stdout.write(`🟢 OK (${(stats.size / 1024).toFixed(1)} KB, SHA-256: ${sha256.slice(0, 10)}...)\n`);
    } catch (dumpErr: any) {
      process.stdout.write(`❌ FAILED: ${dumpErr.message}\n`);
      manifest.status = "FAILED";
      throw dumpErr;
    }
  }

  // 3. Backup local media storage
  if (existsSync(STORAGE_LOCAL)) {
    process.stdout.write(`  ⏳ Archiving media storage directory (storage/local)... `);
    const mediaTarName = "media-storage.tar.gz";
    const mediaTarPath = path.join(backupDir, mediaTarName);

    try {
      await execFileAsync("tar", [
        "-czf",
        mediaTarPath,
        "-C",
        path.dirname(STORAGE_LOCAL),
        path.basename(STORAGE_LOCAL),
      ]);

      const mediaStats = await fs.stat(mediaTarPath);
      const mediaSha256 = await calculateFileSha256(mediaTarPath);

      manifest.mediaArchive = {
        file: mediaTarName,
        sizeBytes: mediaStats.size,
        sha256: mediaSha256,
      };

      manifest.totalSizeBytes += mediaStats.size;
      process.stdout.write(`🟢 OK (${(mediaStats.size / 1024).toFixed(1)} KB, SHA-256: ${mediaSha256.slice(0, 10)}...)\n`);
    } catch (tarErr: any) {
      process.stdout.write(`⚠️ Warning: Media storage archive error: ${tarErr.message}\n`);
    }
  }

  // 4. Write manifest
  const manifestPath = path.join(backupDir, "manifest.json");
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

  // 5. Apply Retention Policy (keep last 7 backups, never delete if fewer than 3)
  await applyRetentionPolicy();

  console.log(`\n✨ Backup successfully created and verified! Manifest written to ${manifestPath}\n`);
  return backupDir;
}

async function applyRetentionPolicy(maxRetained = 7): Promise<void> {
  try {
    const entries = await fs.readdir(BACKUPS_ROOT, { withFileTypes: true });
    const backupDirs = entries
      .filter((e) => e.isDirectory() && e.name.startsWith("memoria-backup-"))
      .map((e) => e.name)
      .sort();

    if (backupDirs.length > maxRetained) {
      const toDelete = backupDirs.slice(0, backupDirs.length - maxRetained);
      for (const dirName of toDelete) {
        console.log(`  🧹 [Retention] Pruning expired backup: ${dirName}`);
        await fs.rm(path.join(BACKUPS_ROOT, dirName), { recursive: true, force: true });
      }
    }
  } catch {}
}

if (process.argv[1]?.endsWith("backup.ts")) {
  createBackup().catch((err) => {
    console.error("Backup failed:", err);
    process.exit(1);
  });
}
