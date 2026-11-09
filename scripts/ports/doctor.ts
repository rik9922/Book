import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import { validatePortRegistry, PORT_REGISTRY } from "@memory-capsule/contracts";
import { createDatabaseClient } from "@memory-capsule/database";
import { diagnoseAllPorts } from "./port-diagnostics.js";

const execFileAsync = promisify(execFile);

export interface DiagnosticCheck {
  category: string;
  name: string;
  passed: boolean;
  message: string;
}

export async function runDoctor(): Promise<boolean> {
  console.log("\n🩺 [Memoria Dev Doctor] Running comprehensive environment & port health inspection...\n");
  const checks: DiagnosticCheck[] = [];

  // 1. Node.js & Runtime Check
  const nodeVersion = process.version;
  const majorNode = parseInt(nodeVersion.replace("v", "").split(".")[0], 10);
  checks.push({
    category: "Runtime",
    name: "Node.js Version",
    passed: majorNode >= 20,
    message: majorNode >= 20 ? `${nodeVersion} (Supported)` : `${nodeVersion} (Requires >= v20)`,
  });

  // 2. Package Manager Check
  try {
    const { stdout } = await execFileAsync("pnpm", ["--version"]);
    checks.push({
      category: "Tooling",
      name: "pnpm Package Manager",
      passed: true,
      message: `v${stdout.trim()}`,
    });
  } catch {
    checks.push({
      category: "Tooling",
      name: "pnpm Package Manager",
      passed: false,
      message: "pnpm is not found in PATH",
    });
  }

  // 3. Centralized Port Registry Integrity
  try {
    validatePortRegistry();
    checks.push({
      category: "Networking",
      name: "Centralized Port Registry",
      passed: true,
      message: `Validated ${Object.keys(PORT_REGISTRY).length} port definitions (0 collisions)`,
    });
  } catch (err: any) {
    checks.push({
      category: "Networking",
      name: "Centralized Port Registry",
      passed: false,
      message: err.message,
    });
  }

  // 4. Port Conflict Probing
  const { allRequiredAvailable, hasForeignConflicts, totalAvailable, totalOccupied } =
    await diagnoseAllPorts();
  checks.push({
    category: "Networking",
    name: "Port Availability Status",
    passed: !hasForeignConflicts,
    message: hasForeignConflicts
      ? "Foreign process conflicts detected. Run 'pnpm run dev:ports:check'"
      : `${totalAvailable} ports available, ${totalOccupied} active daemons. All clear!`,
  });

  // 5. PostgreSQL 17 Local Cluster Check
  const dbUrl = process.env.MEMORY_DATABASE_URL || "postgres://ritik@localhost:5432/memory_db";
  try {
    const db = createDatabaseClient(dbUrl);
    const isHealthy = await db.healthCheck();
    await db.close();
    checks.push({
      category: "Infrastructure",
      name: "PostgreSQL Primary Cluster (Port 5432)",
      passed: isHealthy,
      message: isHealthy ? "Online & responding to ping" : "Database connection failed",
    });
  } catch (err: any) {
    checks.push({
      category: "Infrastructure",
      name: "PostgreSQL Primary Cluster (Port 5432)",
      passed: false,
      message: `Connection error: ${err.message}`,
    });
  }

  // 6. Local Storage Directory ($0 Zero-Budget Policy)
  try {
    const storagePath = path.resolve(process.cwd(), "storage/local");
    await fs.mkdir(path.join(storagePath, "originals"), { recursive: true });
    await fs.mkdir(path.join(storagePath, "derivatives"), { recursive: true });
    checks.push({
      category: "Storage",
      name: "LocalDiskStorageDriver ($0 Budget)",
      passed: true,
      message: "Verified 'storage/local/originals' and 'derivatives' exist",
    });
  } catch (err: any) {
    checks.push({
      category: "Storage",
      name: "LocalDiskStorageDriver ($0 Budget)",
      passed: false,
      message: err.message,
    });
  }

  // 7. Xcode & Simulator CLI (macOS)
  try {
    const { stdout } = await execFileAsync("xcrun", ["simctl", "help"]);
    checks.push({
      category: "Mobile QA",
      name: "Apple xcrun simctl",
      passed: true,
      message: "iOS Simulator CLI available",
    });
  } catch {
    checks.push({
      category: "Mobile QA",
      name: "Apple xcrun simctl",
      passed: false,
      message: "Xcode Command Line Tools not detected",
    });
  }

  // Display Doctor Summary Table
  console.log("CATEGORY".padEnd(18) + "CHECK".padEnd(36) + "RESULT".padEnd(12) + "DETAILS");
  console.log("-".repeat(95));
  for (const c of checks) {
    const catStr = c.category.padEnd(18);
    const nameStr = c.name.padEnd(36);
    const resStr = (c.passed ? "✅ PASS" : "❌ FAIL").padEnd(12);
    console.log(`${catStr}${nameStr}${resStr}${c.message}`);
  }
  console.log("-".repeat(95));

  const allPassed = checks.every((c) => c.passed);
  if (allPassed) {
    console.log("\n🎉 [Memoria Dev Doctor] All diagnostics passed! Your environment is completely ready.\n");
  } else {
    console.log("\n⚠️ [Memoria Dev Doctor] Some diagnostics reported issues. Review above.\n");
  }

  return allPassed;
}

if (process.argv[1] && process.argv[1].endsWith("doctor.ts")) {
  runDoctor()
    .then((passed) => {
      if (!passed) process.exit(1);
    })
    .catch((err) => {
      console.error("❌ Doctor failure:", err);
      process.exit(1);
    });
}
