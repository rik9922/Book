import fs from "node:fs/promises";
import path from "node:path";
import { LOCK_FILE, MEMORIA_DIR } from "./port-diagnostics.js";
import { ConfigurationError } from "@memory-capsule/contracts";

export interface LockMetadata {
  pid: number;
  acquiredAt: string;
  command: string;
}

/**
 * Acquires a non-reentrant mutual exclusion lock for Memoria local development orchestration.
 * Prevents two concurrent terminal sessions from racing to bind identical ports.
 */
export async function acquireDevLock(timeoutMs = 5000): Promise<() => Promise<void>> {
  await fs.mkdir(MEMORIA_DIR, { recursive: true });
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      // Use "wx" flag for atomic O_CREAT | O_EXCL creation
      const handle = await fs.open(LOCK_FILE, "wx");
      const metadata: LockMetadata = {
        pid: process.pid,
        acquiredAt: new Date().toISOString(),
        command: process.argv.join(" "),
      };
      await handle.writeFile(JSON.stringify(metadata, null, 2), "utf-8");
      await handle.close();

      // Return release function
      return async () => {
        try {
          await fs.unlink(LOCK_FILE);
        } catch {
          // Ignore if already deleted
        }
      };
    } catch (err: any) {
      if (err.code === "EEXIST") {
        // Lock file exists. Check if holder process is still alive.
        try {
          const raw = await fs.readFile(LOCK_FILE, "utf-8");
          const existingLock: LockMetadata = JSON.parse(raw);

          let isAlive = true;
          try {
            process.kill(existingLock.pid, 0);
          } catch (killErr: any) {
            if (killErr.code === "ESRCH") {
              isAlive = false;
            }
          }

          if (!isAlive) {
            // Stale lock detected from crashed process! Safely remove it.
            await fs.unlink(LOCK_FILE).catch(() => {});
            continue; // Retry acquire in next iteration
          }
        } catch {
          // File might have been cleaned up in the interim
        }

        // Wait 250ms before retrying
        await new Promise((resolve) => setTimeout(resolve, 250));
      } else {
        throw err;
      }
    }
  }

  throw new ConfigurationError(
    `Failed to acquire Memoria orchestration lock (${LOCK_FILE}) within ${timeoutMs}ms. Another startup/shutdown command is actively running.`
  );
}

/**
 * Releases the lock if held
 */
export async function releaseDevLock(): Promise<void> {
  try {
    await fs.unlink(LOCK_FILE);
  } catch {
    // Ignore
  }
}

