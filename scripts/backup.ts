import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import { existsSync, createReadStream } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createDatabaseClient } from "@memory-capsule/database";

const execFileAsync = promisify(execFile);

const DEFAULT_BACKUPS_ROOT = path.resolve(
  process.cwd(),
  process.env.MEMORIA_BACKUP_ROOT || "backups"
);
const DEFAULT_STORAGE_LOCAL = path.resolve(
  process.cwd(),
  process.env.LOCAL_STORAGE_PATH || "storage_data"
);

const DATABASES = [
  { name: "identity_db", envVar: "IDENTITY_DATABASE_URL" },
  { name: "memory_db", envVar: "MEMORY_DATABASE_URL" },
  { name: "media_db", envVar: "MEDIA_DATABASE_URL" },
  { name: "collab_db", envVar: "COLLAB_DATABASE_URL" },
  { name: "book_db", envVar: "BOOK_DATABASE_URL" },
  { name: "commerce_db", envVar: "COMMERCE_DATABASE_URL" },
  { name: "notification_db", envVar: "NOTIFICATION_DATABASE_URL" },
] as const;

export async function calculateFileSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

export interface AssetManifestEntry {
  relativePath: string;
  sizeBytes: number;
  sha256: string;
}

export interface BackupManifest {
  backupId: string;
  createdAt: string;
  postgresVersion: string;
  schemaVersion: string;
  databases: {
    name: string;
    dumpFile: string;
    sizeBytes: number;
    sha256: string;
    recordCounts: Record<string, number>;
  }[];
  mediaArchive: {
    file: string;
    sizeBytes: number;
    sha256: string;
    fileCount: number;
  };
  assetManifest: AssetManifestEntry[];
  totalSizeBytes: number;
  status: "COMPLETE" | "VERIFIED" | "FAILED";
  verificationResult: {
    verified: boolean;
    checkedAt: string;
    errors: string[];
  };
}

export function resolvePgConnectionDefaults(): {
  pgUser: string;
  pgPass: string;
  pgHost: string;
  pgPort: string;
} {
  const sampleUrl = process.env.IDENTITY_DATABASE_URL || process.env.DATABASE_URL;
  if (sampleUrl) {
    try {
      const parsed = new URL(sampleUrl);
      return {
        pgUser: process.env.PGUSER || process.env.DB_USER || parsed.username || "postgres",
        pgPass: process.env.PGPASSWORD || process.env.DB_PASSWORD || parsed.password || "",
        pgHost: process.env.PGHOST || parsed.hostname || "localhost",
        pgPort: process.env.PGPORT || parsed.port || "5432",
      };
    } catch {
      // Fallback to env defaults
    }
  }
  return {
    pgUser: process.env.PGUSER || process.env.DB_USER || "postgres",
    pgPass: process.env.PGPASSWORD || process.env.DB_PASSWORD || "",
    pgHost: process.env.PGHOST || "localhost",
    pgPort: process.env.PGPORT || "5432",
  };
}

async function getRecordCount(dbName: string, envVar: string, tableName: string): Promise<number> {
  const { pgUser, pgPass, pgHost, pgPort } = resolvePgConnectionDefaults();
  const auth = pgPass ? `${pgUser}:${pgPass}` : pgUser;
  const dbUrl = process.env[envVar] || `postgres://${auth}@${pgHost}:${pgPort}/${dbName}`;
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

async function resolveSchemaVersion(): Promise<string> {
  const migrationsDir = path.resolve(process.cwd(), "packages/database/migrations");
  try {
    const files = (await fs.readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
    return files.length > 0 ? files[files.length - 1] : "unknown";
  } catch {
    return "unknown";
  }
}

async function collectAssetManifest(storageRoot: string): Promise<AssetManifestEntry[]> {
  const results: AssetManifestEntry[] = [];
  async function walk(currentDir: string) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        const stat = await fs.stat(fullPath);
        const sha256 = await calculateFileSha256(fullPath);
        const rel = path.relative(storageRoot, fullPath).split(path.sep).join("/");
        results.push({ relativePath: rel, sizeBytes: stat.size, sha256 });
      }
    }
  }
  await walk(storageRoot);
  return results;
}

export async function createBackup(options?: {
  backupsRoot?: string;
  storageLocal?: string;
  databases?: readonly { name: string; envVar: string }[];
}): Promise<string> {
  const backupsRoot = path.resolve(options?.backupsRoot || DEFAULT_BACKUPS_ROOT);
  const storageLocal = path.resolve(options?.storageLocal || DEFAULT_STORAGE_LOCAL);
  const targetDatabases = options?.databases || DATABASES;

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupId = `memoria-backup-${timestamp}`;
  const backupDir = path.join(backupsRoot, backupId);
  const dbDumpsDir = path.join(backupDir, "databases");

  await fs.mkdir(dbDumpsDir, { recursive: true });

  console.log(`\n📦 [Memoria Backup] Starting backup: ${backupId}`);
  console.log(`📁 Destination: ${backupDir}\n`);

  let pgVersion = "PostgreSQL 17";
  try {
    const { stdout } = await execFileAsync("psql", ["-V"]);
    pgVersion = stdout.trim();
  } catch {
    // Keep fallback version label
  }

  const schemaVersion = await resolveSchemaVersion();

  const manifest: BackupManifest = {
    backupId,
    createdAt: new Date().toISOString(),
    postgresVersion: pgVersion,
    schemaVersion,
    databases: [],
    mediaArchive: {
      file: "media-storage.tar.gz",
      sizeBytes: 0,
      sha256: "",
      fileCount: 0,
    },
    assetManifest: [],
    totalSizeBytes: 0,
    status: "FAILED",
    verificationResult: {
      verified: false,
      checkedAt: new Date().toISOString(),
      errors: [],
    },
  };

  const manifestPath = path.join(backupDir, "manifest.json");
  const { pgUser, pgPass, pgHost, pgPort } = resolvePgConnectionDefaults();

  try {
    for (const dbEntry of targetDatabases) {
      const dbName = dbEntry.name;
      const dumpFileName = `${dbName}.sql`;
      const dumpFilePath = path.join(dbDumpsDir, dumpFileName);
      process.stdout.write(`  ⏳ Dumping database '${dbName}'... `);

      await execFileAsync(
        "pg_dump",
        [
          "-h", pgHost,
          "-p", pgPort,
          "-U", pgUser,
          "--clean",
          "--if-exists",
          "--no-owner",
          "--no-privileges",
          "-f", dumpFilePath,
          dbName,
        ],
        {
          env: { ...process.env, ...(pgPass ? { PGPASSWORD: pgPass } : {}) },
        }
      );

      const stats = await fs.stat(dumpFilePath);
      if (stats.size === 0) {
        throw new Error(`Database dump for '${dbName}' is empty (0 bytes)`);
      }
      const sha256 = await calculateFileSha256(dumpFilePath);

      const counts: Record<string, number> = {};
      if (dbName === "identity_db") {
        counts.users = await getRecordCount(dbName, dbEntry.envVar, "users");
      } else if (dbName === "memory_db") {
        counts.memory_spaces = await getRecordCount(dbName, dbEntry.envVar, "memory_spaces");
        counts.memories = await getRecordCount(dbName, dbEntry.envVar, "memories");
      } else if (dbName === "media_db") {
        counts.media_assets = await getRecordCount(dbName, dbEntry.envVar, "media_assets");
      } else if (dbName === "book_db") {
        counts.books = await getRecordCount(dbName, dbEntry.envVar, "books");
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
    }

    // Fail closed if media storage directory does not exist
    if (!existsSync(storageLocal)) {
      throw new Error(`Required media storage directory does not exist: ${storageLocal}`);
    }

    process.stdout.write(`  ⏳ Archiving media storage directory (${path.basename(storageLocal)})... `);
    const assetManifest = await collectAssetManifest(storageLocal);
    const mediaTarName = "media-storage.tar.gz";
    const mediaTarPath = path.join(backupDir, mediaTarName);

    await execFileAsync("tar", [
      "-czf",
      mediaTarPath,
      "-C",
      path.dirname(storageLocal),
      path.basename(storageLocal),
    ]);

    // Verify archive can be listed/read immediately
    await execFileAsync("tar", ["-tzf", mediaTarPath]);

    const mediaStats = await fs.stat(mediaTarPath);
    const mediaSha256 = await calculateFileSha256(mediaTarPath);

    manifest.mediaArchive = {
      file: mediaTarName,
      sizeBytes: mediaStats.size,
      sha256: mediaSha256,
      fileCount: assetManifest.length,
    };
    manifest.assetManifest = assetManifest;
    manifest.totalSizeBytes += mediaStats.size;
    process.stdout.write(
      `🟢 OK (${(mediaStats.size / 1024).toFixed(1)} KB, ${assetManifest.length} files, SHA-256: ${mediaSha256.slice(0, 10)}...)\n`
    );

    manifest.status = "COMPLETE";
    manifest.verificationResult = {
      verified: true,
      checkedAt: new Date().toISOString(),
      errors: [],
    };
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

    await applyRetentionPolicy(backupsRoot);
    console.log(`\n✨ Backup successfully created and verified! Manifest written to ${manifestPath}\n`);
    return backupDir;
  } catch (err: any) {
    manifest.status = "FAILED";
    manifest.verificationResult = {
      verified: false,
      checkedAt: new Date().toISOString(),
      errors: [err?.message || String(err)],
    };
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf-8").catch(() => {});
    throw err;
  }
}

async function applyRetentionPolicy(backupsRoot: string, maxRetained = 7): Promise<void> {
  try {
    const entries = await fs.readdir(backupsRoot, { withFileTypes: true });
    const backupDirs = entries
      .filter((e) => e.isDirectory() && e.name.startsWith("memoria-backup-"))
      .map((e) => e.name)
      .sort();

    if (backupDirs.length > maxRetained) {
      const toDelete = backupDirs.slice(0, backupDirs.length - maxRetained);
      for (const dirName of toDelete) {
        console.log(`  🧹 [Retention] Pruning expired backup: ${dirName}`);
        await fs.rm(path.join(backupsRoot, dirName), { recursive: true, force: true });
      }
    }
  } catch {
    // Non-fatal retention cleanup error
  }
}

if (process.argv[1]?.endsWith("backup.ts")) {
  createBackup().catch((err) => {
    console.error("Backup failed:", err);
    process.exit(1);
  });
}
