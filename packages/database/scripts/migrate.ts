#!/usr/bin/env node
import { createDatabaseClient } from "../src/index.js";
import { DatabaseMigrator } from "../src/migrator.js";

async function main() {
  console.log("🚀 [Database CLI] Running autonomous migrations...");
  const db = createDatabaseClient();
  const migrator = new DatabaseMigrator(db);

  const result = await migrator.runMigrations();
  console.log(`✓ Applied ${result.appliedCount} migration(s):`, result.migrations);

  await db.close();
}

main().catch((err) => {
  console.error("✖ Migration failed:", err);
  process.exit(1);
});

