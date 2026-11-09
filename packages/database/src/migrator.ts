import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { DatabaseClient } from "./index.js";
import { createServiceLogger, Logger } from "@memory-capsule/logger";

const logger: Logger = createServiceLogger("db-migrator");

export interface MigrationResult {
  appliedCount: number;
  migrations: string[];
}

export class DatabaseMigrator {
  private db: DatabaseClient;
  private migrationsDir: string;

  constructor(db: DatabaseClient, migrationsDir?: string) {
    this.db = db;
    this.migrationsDir = migrationsDir || path.join(process.cwd(), "packages/database/migrations");
  }

  async initializeMigrationTable(): Promise<void> {
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        checksum VARCHAR(64) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  }

  async runMigrations(): Promise<MigrationResult> {
    await this.initializeMigrationTable();

    let files: string[] = [];
    try {
      files = (await fs.readdir(this.migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
    } catch {
      logger.warn({ dir: this.migrationsDir }, "[Migrator] Migrations directory not found");
      return { appliedCount: 0, migrations: [] };
    }

    const appliedRes = await this.db.query("SELECT migration_name FROM schema_migrations");
    const appliedSet = new Set((appliedRes.rows || []).map((r: any) => r.migration_name));

    const newlyApplied: string[] = [];

    for (const file of files) {
      if (appliedSet.has(file)) continue;

      const filePath = path.join(this.migrationsDir, file);
      const sql = await fs.readFile(filePath, "utf-8");
      const checksum = crypto.createHash("sha256").update(sql).digest("hex");

      logger.info({ migration: file }, "[Migrator] Applying database migration");

      // Execute SQL statements
      await this.db.query(sql);
      await this.db.query(
        "INSERT INTO schema_migrations (migration_name, checksum) VALUES ($1, $2)",
        [file, checksum]
      );

      newlyApplied.push(file);
    }

    logger.info({ count: newlyApplied.length }, "[Migrator] Migrations complete");
    return {
      appliedCount: newlyApplied.length,
      migrations: newlyApplied,
    };
  }
}

