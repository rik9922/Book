import { createDatabaseClient } from "@memory-capsule/database";
import { createServiceLogger } from "@memory-capsule/logger";

const logger = createServiceLogger("bootstrap-admin");

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    logger.error("Usage: node --env-file=.env --import tsx scripts/bootstrap-admin.ts <user-email>");
    process.exit(1);
  }

  const dbUrl = process.env.IDENTITY_DATABASE_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    logger.error("IDENTITY_DATABASE_URL or DATABASE_URL is required");
    process.exit(1);
  }

  const db = createDatabaseClient(dbUrl);
  try {
    const result = await db.transaction(async (tx) => {
      await tx.query(`SELECT pg_advisory_xact_lock(7842109)`);
      const userRes = await tx.query(`SELECT id, email, role FROM users WHERE LOWER(email) = $1 LIMIT 1`, [email]);
      if (userRes.rows.length === 0) {
        return { ok: false as const, reason: "USER_NOT_FOUND" };
      }
      const user = userRes.rows[0];
      await tx.query(`UPDATE users SET role = 'superadmin', updated_at = NOW() WHERE id = $1`, [user.id]);
      return { ok: true as const, userId: user.id as string, email: user.email as string };
    });

    if (!result.ok) {
      logger.error({ email }, "No registered user found with that email");
      process.exit(1);
    }

    logger.info({ userId: result.userId, email: result.email }, "Successfully promoted user to superadmin");
  } finally {
    await db.close();
  }
}

main().catch((err) => {
  logger.error({ err }, "Failed to bootstrap superadmin");
  process.exit(1);
});
