import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { openSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import {
  PORT_REGISTRY,
  resolveServicePort,
} from "@memory-capsule/contracts";
import {
  MEMORIA_DIR,
  PIDS_DIR,
  LOGS_DIR,
  diagnoseAllPorts,
  diagnosePort,
  isPortListening,
  getProcessOnPort,
  PortDiagnosticResult,
} from "./port-diagnostics.js";
import { acquireDevLock } from "./port-lock.js";

interface ManagedServiceDef {
  id: string;
  name: string;
  defaultPort: number;
  entrypoint: string;
  healthPath?: string;
  envVar: string;
}

const MANAGED_SERVICES: ManagedServiceDef[] = [
  {
    id: "identity-service",
    name: "Identity Service",
    defaultPort: 4001,
    entrypoint: "services/identity-service/src/server.ts",
    healthPath: "/health",
    envVar: "PORT_IDENTITY",
  },
  {
    id: "memory-service",
    name: "Memory Service",
    defaultPort: 4002,
    entrypoint: "services/memory-service/src/server.ts",
    healthPath: "/health",
    envVar: "PORT_MEMORY",
  },
  {
    id: "media-service",
    name: "Media Service",
    defaultPort: 4003,
    entrypoint: "services/media-service/src/server.ts",
    healthPath: "/health",
    envVar: "PORT_MEDIA",
  },
  {
    id: "collab-service",
    name: "Collab Service",
    defaultPort: 4004,
    entrypoint: "services/collab-service/src/server.ts",
    healthPath: "/health",
    envVar: "PORT_COLLABORATION",
  },
  {
    id: "book-service",
    name: "Book Service",
    defaultPort: 4005,
    entrypoint: "services/book-service/src/server.ts",
    healthPath: "/health",
    envVar: "PORT_BOOK",
  },
  {
    id: "commerce-service",
    name: "Commerce Service",
    defaultPort: 4007,
    entrypoint: "services/commerce-service/src/server.ts",
    healthPath: "/health",
    envVar: "PORT_COMMERCE",
  },
  {
    id: "notification-service",
    name: "Notification Service",
    defaultPort: 4008,
    entrypoint: "services/notification-service/src/server.ts",
    healthPath: "/health",
    envVar: "PORT_NOTIFICATION",
  },
  {
    id: "api-gateway",
    name: "API Gateway",
    defaultPort: 4000,
    entrypoint: "services/api-gateway/src/server.ts",
    healthPath: "/health",
    envVar: "PORT_GATEWAY",
  },
];

async function ensureDirectories(): Promise<void> {
  await fs.mkdir(MEMORIA_DIR, { recursive: true });
  await fs.mkdir(PIDS_DIR, { recursive: true });
  await fs.mkdir(LOGS_DIR, { recursive: true });
}

/**
 * Halts a process by PID with SIGTERM, falling back to SIGKILL after timeout
 */
async function stopProcessSafely(pid: number, serviceName: string): Promise<boolean> {
  try {
    process.kill(pid, 0);
  } catch (err: any) {
    if (err.code === "ESRCH") {
      return false; // Process already dead
    }
  }

  try {
    process.kill(pid, "SIGTERM");
  } catch (err: any) {
    if (err.code === "ESRCH") return false;
    throw err;
  }

  // Poll for up to 5 seconds
  const start = Date.now();
  while (Date.now() - start < 5000) {
    try {
      process.kill(pid, 0);
      await new Promise((r) => setTimeout(r, 200));
    } catch (err: any) {
      if (err.code === "ESRCH") {
        return true;
      }
    }
  }

  // Force kill if still lingering
  try {
    process.kill(pid, "SIGKILL");
    return true;
  } catch {
    return false;
  }
}

/**
 * Subcommand: up
 */
async function runUp(args: string[]): Promise<void> {
  await ensureDirectories();
  console.log("\n🔒 Acquiring local development orchestration lock...");
  const releaseLock = await acquireDevLock(8000);

  try {
    console.log("🔍 Performing pre-flight port diagnostics...\n");
    const preCheck = await diagnoseAllPorts();

    // Check for foreign conflicts
    const foreignConflicts = preCheck.diagnostics.filter((d) => d.state === "FOREIGN_CONFLICT");
    if (foreignConflicts.length > 0) {
      console.error("❌ Pre-flight failed: Port conflicts with non-Memoria processes detected!\n");
      for (const fc of foreignConflicts) {
        console.error(`  • Port ${fc.port} (${fc.serviceName || "Unknown"}): occupied by PID ${fc.processInfo?.pid} (${fc.processInfo?.processName})`);
        console.error(`    Command: ${fc.processInfo?.command}`);
        console.error(`    Resolution: ${fc.actionableResolution}\n`);
      }
      console.error("Please terminate the conflicting foreign processes or reconfigure port mappings.\n");
      process.exit(1);
    }

    // Clean any stale PID records before starting
    const stalePids = preCheck.diagnostics.filter((d) => d.state === "STALE_PID");
    for (const sp of stalePids) {
      if (sp.serviceId) {
        await fs.unlink(path.join(PIDS_DIR, `${sp.serviceId}.json`)).catch(() => {});
      }
    }

    // Infrastructure check
    const infraPostgres = preCheck.diagnostics.find((d) => d.serviceId === "postgres");
    const infraRedis = preCheck.diagnostics.find((d) => d.serviceId === "redis");
    const infraNats = preCheck.diagnostics.find((d) => d.serviceId === "nats");

    console.log("📦 Infrastructure status:");
    console.log(`  • PostgreSQL (5432): ${infraPostgres?.state === "INFRA_READY" ? "🟢 ACTIVE" : "🟡 NOT RUNNING (using local/in-memory fallback or run docker compose up -d)"}`);
    console.log(`  • Redis      (6379): ${infraRedis?.state === "INFRA_READY" ? "🟢 ACTIVE" : "🟡 NOT RUNNING (in-memory event/queue mode)"}`);
    console.log(`  • NATS       (4222): ${infraNats?.state === "INFRA_READY" ? "🟢 ACTIVE" : "🟡 NOT RUNNING (in-memory JetStream mode)"}\n`);

    console.log("🚀 Starting Memoria microservices in dependency order...\n");
    const hasEnvFile = existsSync(path.resolve(process.cwd(), ".env"));

    for (const svc of MANAGED_SERVICES) {
      const effectivePort = resolveServicePort(svc.id);
      const isListening = await isPortListening(effectivePort);

      // Check if this service is already running
      const pidFile = path.join(PIDS_DIR, `${svc.id}.json`);
      if (isListening && existsSync(pidFile)) {
        console.log(`  ✓ ${svc.name} is already running on port ${effectivePort}`);
        continue;
      }

      if (isListening) {
        console.error(`❌ Port ${effectivePort} is already in use by another process for ${svc.name}!`);
        process.exit(1);
      }

      const logPath = path.join(LOGS_DIR, `${svc.id}.log`);
      const logFd = openSync(logPath, "a");

      const nodeArgs: string[] = [];
      if (hasEnvFile) {
        nodeArgs.push("--env-file=.env");
      }
      nodeArgs.push("--import", "tsx", svc.entrypoint);

      const child = spawn(process.execPath, nodeArgs, {
        cwd: process.cwd(),
        detached: true,
        stdio: ["ignore", logFd, logFd],
        env: {
          ...process.env,
          NODE_ENV: process.env.NODE_ENV || "development",
          [svc.envVar]: String(effectivePort),
        },
      });

      child.unref();

      // Write PID file
      const pidRecord = {
        pid: child.pid,
        serviceId: svc.id,
        serviceName: svc.name,
        port: effectivePort,
        startedAt: new Date().toISOString(),
        command: `${process.execPath} ${nodeArgs.join(" ")}`,
        logPath,
      };
      await fs.writeFile(pidFile, JSON.stringify(pidRecord, null, 2), "utf-8");

      // Wait for port to become active (up to 15s)
      process.stdout.write(`  ⏳ Starting ${svc.name} on port ${effectivePort}...`);
      let portReady = false;
      const startWait = Date.now();

      while (Date.now() - startWait < 15000) {
        if (await isPortListening(effectivePort)) {
          portReady = true;
          break;
        }

        // Verify child hasn't crashed
        try {
          if (child.pid) process.kill(child.pid, 0);
        } catch {
          // Child exited prematurely
          break;
        }

        await new Promise((r) => setTimeout(r, 250));
      }

      if (!portReady) {
        process.stdout.write(" ❌ FAILED\n");
        console.error(`\nService ${svc.name} failed to bind to port ${effectivePort}. Last 20 lines of log:`);
        try {
          const logContent = readFileSync(logPath, "utf-8");
          const lines = logContent.trim().split("\n");
          console.error(lines.slice(-20).join("\n"));
        } catch {
          console.error("Could not read log file.");
        }
        process.exit(1);
      }

      process.stdout.write(` 🟢 READY (PID ${child.pid})\n`);
    }

    console.log("\n✨ All Memoria microservices started successfully!\n");
    console.log("┌───────────────────────┬───────────────┬──────────────────────────────────────────┐");
    console.log("│ Service               │ Port          │ Endpoint                                 │");
    console.log("├───────────────────────┼───────────────┼──────────────────────────────────────────┤");
    for (const svc of MANAGED_SERVICES) {
      const port = resolveServicePort(svc.id);
      const url = `http://127.0.0.1:${port}${svc.healthPath || ""}`;
      console.log(`│ ${svc.name.padEnd(21)} │ ${String(port).padEnd(13)} │ ${url.padEnd(40)} │`);
    }
    console.log("└───────────────────────┴───────────────┴──────────────────────────────────────────┘");
    console.log("\n💡 Useful commands:");
    console.log("  • Status: pnpm run dev:status");
    console.log("  • Logs:   pnpm run dev:logs [service-id]");
    console.log("  • Stop:   pnpm run dev:down\n");
  } finally {
    await releaseLock();
  }
}

/**
 * Subcommand: down
 */
async function runDown(): Promise<void> {
  await ensureDirectories();
  console.log("\n🔒 Acquiring local development orchestration lock...");
  const releaseLock = await acquireDevLock(8000);

  try {
    console.log("🛑 Stopping Memoria services...\n");
    const pidFiles = await fs.readdir(PIDS_DIR).catch(() => [] as string[]);
    let stoppedCount = 0;

    for (const file of pidFiles) {
      if (!file.endsWith(".json")) continue;
      const filePath = path.join(PIDS_DIR, file);

      try {
        const raw = await fs.readFile(filePath, "utf-8");
        const record = JSON.parse(raw);
        const { pid, serviceName, port } = record;

        process.stdout.write(`  ⏳ Stopping ${serviceName || file} (PID ${pid}, Port ${port})...`);
        const stopped = await stopProcessSafely(pid, serviceName);
        if (stopped) {
          process.stdout.write(" 🟢 STOPPED\n");
          stoppedCount++;
        } else {
          process.stdout.write(" ⚪ Already stopped\n");
        }

        await fs.unlink(filePath).catch(() => {});
      } catch (err: any) {
        console.error(`\n  ⚠️ Error stopping ${file}: ${err.message}`);
      }
    }

    // Secondary check: look for any orphaned Memoria processes
    const postCheck = await diagnoseAllPorts();
    const orphans = postCheck.diagnostics.filter((d) => d.state === "MEMORIA_ORPHAN");
    for (const orphan of orphans) {
      if (orphan.processInfo) {
        console.log(`  🧹 Cleaning orphaned Memoria process PID ${orphan.processInfo.pid} on port ${orphan.port}...`);
        await stopProcessSafely(orphan.processInfo.pid, orphan.serviceName || "orphan");
      }
    }

    console.log(`\n✨ Teardown complete. ${stoppedCount} service(s) cleanly stopped.\n`);
  } finally {
    await releaseLock();
  }
}

/**
 * Subcommand: status
 */
async function runStatus(): Promise<void> {
  console.log("\n📊 Memoria Local Development Port & Process Status\n");
  const { diagnostics, hasForeignConflicts, totalAvailable, totalOccupied } = await diagnoseAllPorts();

  console.log("┌───────────────────────┬──────┬──────────┬───────────────────┬─────────┬──────────────────────┐");
  console.log("│ Service               │ Port │ Protocol │ State             │ PID     │ Notes                │");
  console.log("├───────────────────────┼──────┼──────────┼───────────────────┼─────────┼──────────────────────┤");

  for (const d of diagnostics) {
    const sName = (d.serviceName || d.serviceId || "Unknown").slice(0, 21).padEnd(21);
    const portStr = String(d.port).padEnd(4);
    const proto = d.protocol.padEnd(8);
    const pidStr = d.processInfo?.pid ? String(d.processInfo.pid).padEnd(7) : "-      ";

    let stateStr = d.state.padEnd(17);
    if (d.state === "MEMORIA_RUNNING") stateStr = "🟢 RUNNING        ";
    else if (d.state === "INFRA_READY") stateStr = "🟢 INFRA READY    ";
    else if (d.state === "AVAILABLE") stateStr = "⚪ AVAILABLE      ";
    else if (d.state === "FOREIGN_CONFLICT") stateStr = "🔴 CONFLICT       ";
    else if (d.state === "MEMORIA_ORPHAN") stateStr = "🟡 ORPHAN         ";
    else if (d.state === "STALE_PID") stateStr = "🟡 STALE PID      ";

    const note = (d.processInfo?.processName || d.actionableResolution || "").slice(0, 20).padEnd(20);

    console.log(`│ ${sName} │ ${portStr} │ ${proto} │ ${stateStr} │ ${pidStr} │ ${note} │`);
  }

  console.log("└───────────────────────┴──────┴──────────┴───────────────────┴─────────┴──────────────────────┘");
  console.log(`\nSummary: ${totalAvailable} available, ${totalOccupied} occupied. Foreign conflicts: ${hasForeignConflicts ? "⚠️ YES" : "✅ None"}\n`);
}

/**
 * Subcommand: logs
 */
async function runLogs(args: string[]): Promise<void> {
  await ensureDirectories();
  const targetService = args[0];

  if (targetService) {
    const logFile = path.join(LOGS_DIR, `${targetService}.log`);
    if (!existsSync(logFile)) {
      console.error(`Log file for '${targetService}' not found at ${logFile}`);
      process.exit(1);
    }

    console.log(`\n📜 Displaying last 50 lines of ${targetService} log (${logFile}):\n`);
    const content = readFileSync(logFile, "utf-8");
    const lines = content.trim().split("\n");
    console.log(lines.slice(-50).join("\n"));
    console.log("");
  } else {
    const files = await fs.readdir(LOGS_DIR).catch(() => [] as string[]);
    if (files.length === 0) {
      console.log("No service log files available in .memoria/logs/");
      return;
    }

    console.log("\n📜 Available service log files in .memoria/logs/:");
    for (const f of files) {
      if (f.endsWith(".log")) {
        const stats = await fs.stat(path.join(LOGS_DIR, f));
        console.log(`  • ${f.replace(".log", "")} (${(stats.size / 1024).toFixed(1)} KB)`);
      }
    }
    console.log("\nTo view a specific log: pnpm run dev:logs <service-id>\n");
  }
}

/**
 * Main entrypoint
 */
async function main() {
  const [,, command, ...args] = process.argv;

  switch (command) {
    case "up":
      await runUp(args);
      break;
    case "down":
      await runDown();
      break;
    case "restart":
      console.log("🔄 Restarting Memoria services...");
      await runDown();
      await new Promise((r) => setTimeout(r, 1000));
      await runUp(args);
      break;
    case "status":
      await runStatus();
      break;
    case "logs":
      await runLogs(args);
      break;
    default:
      console.log(`
Memoria Local Development Orchestrator

Usage:
  node --env-file=.env --import tsx scripts/ports/dev-orchestrator.ts <command>

Commands:
  up         Start all backend microservices in background with port conflict prevention
  down       Gracefully stop all Memoria services using tracked PIDs
  restart    Safely restart all services
  status     Display port, PID, and health status table
  logs [svc] View service log outputs
`);
      process.exit(command ? 1 : 0);
  }
}

main().catch((err) => {
  console.error("Orchestrator error:", err);
  process.exit(1);
});
