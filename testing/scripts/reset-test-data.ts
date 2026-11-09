import { createDatabaseClient } from "@memory-capsule/database";

export async function resetTestData(spaceId = "e8cf4fc3-137e-4397-883d-21cd6a7cb61f"): Promise<void> {
  console.log(`🧹 [Memoria Test Data] Resetting test data for space ${spaceId}...`);
  const db = createDatabaseClient(process.env.MEMORY_DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/memory_db");

  try {
    const deletedMemories = await db.query(
      `DELETE FROM memories WHERE space_id = $1 RETURNING id`,
      [spaceId]
    );
    console.log(`   Deleted ${deletedMemories.rowCount || 0} synthetic memory records.`);
  } finally {
    await db.close();
  }
}

if (process.argv[1] && process.argv[1].endsWith("reset-test-data.ts")) {
  resetTestData()
    .then(() => console.log("✅ Test data reset complete."))
    .catch((err) => {
      console.error("❌ Reset failed:", err);
      process.exit(1);
    });
}
