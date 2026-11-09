import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";

const execFileAsync = promisify(execFile);

export async function setupPgAdmin(): Promise<void> {
  const PGADMIN_APP = "/Applications/pgAdmin 4.app";
  const PYTHON_BIN = path.join(PGADMIN_APP, "Contents/Frameworks/Python.framework/Versions/3.13/bin/python3");
  const SETUP_PY = path.join(PGADMIN_APP, "Contents/Resources/web/setup.py");
  const CONFIG_LOCAL_PY = path.join(PGADMIN_APP, "Contents/Resources/web/config_local.py");
  const SERVERS_JSON = path.resolve(process.cwd(), "infra/postgres/pgadmin-servers.json");
  const USER_PGADMIN_DIR = path.join(process.env.HOME || "", ".pgadmin");

  console.log("🐘 [Memoria pgAdmin 4 Setup] Configuring pgAdmin 4 for Memoria Ecosystem...");

  // 1. Verify pgAdmin 4 App exists
  try {
    await fs.access(PGADMIN_APP);
  } catch {
    throw new Error(`pgAdmin 4 app not found at ${PGADMIN_APP}. Please install pgAdmin 4 first.`);
  }

  // 2. Ensure user directory exists
  await fs.mkdir(USER_PGADMIN_DIR, { recursive: true });

  // 3. Ensure config_local.py exists for Desktop mode
  const configLocalContent = `import os

SERVER_MODE = False
DATA_DIR = os.path.expanduser("~/.pgadmin/")
LOG_FILE = os.path.expanduser("~/.pgadmin/pgadmin4.log")
SQLITE_PATH = os.path.expanduser("~/.pgadmin/pgadmin4.db")
SESSION_DB_PATH = os.path.expanduser("~/.pgadmin/sessions")
STORAGE_DIR = os.path.expanduser("~/.pgadmin/storage")
`;
  await fs.writeFile(CONFIG_LOCAL_PY, configLocalContent, "utf-8");

  // 4. Initialize Database if not already done
  console.log("   Initializing pgAdmin desktop database...");
  await execFileAsync(PYTHON_BIN, [SETUP_PY, "setup-db"]);

  // 5. Load Memoria Servers
  console.log(`   Loading servers from ${SERVERS_JSON}...`);
  const { stdout } = await execFileAsync(PYTHON_BIN, [
    SETUP_PY,
    "load-servers",
    SERVERS_JSON,
    "--user",
    "pgadmin4@pgadmin.org",
    "--replace",
  ]);

  console.log(stdout.trim());
  console.log("🎉 [Memoria pgAdmin 4 Setup] Successfully configured 8 databases under 'Memoria Ecosystem'!");
}

if (process.argv[1] && process.argv[1].endsWith("setup-pgadmin.ts")) {
  setupPgAdmin().catch((err) => {
    console.error("❌ pgAdmin setup failed:", err);
    process.exit(1);
  });
}
