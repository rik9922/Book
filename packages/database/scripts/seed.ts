#!/usr/bin/env node
import crypto from "node:crypto";
import { createDatabaseClient } from "../src/index.js";

async function main() {
  console.log("🌱 [Database CLI] Seeding development heirloom fixtures...");
  const db = createDatabaseClient();

  const spaceId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const profileId = crypto.randomUUID();
  const memoryId = crypto.randomUUID();

  // Simulated seed query
  await db.query(
    "INSERT INTO memory_spaces (id, owner_id, name, space_type) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING;",
    [spaceId, userId, "The Bennett Heritage", "family"]
  );

  await db.query(
    "INSERT INTO space_profiles (id, space_id, name, relationship, profile_type) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING;",
    [profileId, spaceId, "Baby Clara", "Daughter", "child"]
  );

  await db.query(
    "INSERT INTO memories (id, space_id, author_id, title, format, is_favorite) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING;",
    [memoryId, spaceId, userId, "First Steps in the Orchard", "image", true]
  );

  console.log("✓ Seed complete. Space:", spaceId, "Memory:", memoryId);
  await db.close();
}

main().catch((err) => {
  console.error("✖ Seeding failed:", err);
  process.exit(1);
});

