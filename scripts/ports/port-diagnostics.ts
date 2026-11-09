import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import net from "node:net";
import {
  PORT_REGISTRY,
  PortDefinition,
  getAllRegisteredPorts,
  resolveServicePort,
} from "@memory-capsule/contracts";

const execFileAsync = promisify(execFile);

export const MEMORIA_DIR = path.resolve(process.cwd(), ".memoria");
export const PIDS_DIR = path.join(MEMORIA_DIR, "pids");
export const LOGS_DIR = path.join(MEMORIA_DIR, "logs");
export const LOCK_FILE = path.join(MEMORIA_DIR, "memoria.lock");

export interface ProcessInfo {
  pid: number;
  command: string;
  user: string;
  processName: string;
  address: string;
}

export type PortState =
  | "AVAILABLE"
  | "INFRA_READY"
  | "MEMORIA_RUNNING"
  | "MEMORIA_ORPHAN"
  | "FOREIGN_CONFLICT"
  | "STALE_PID";

export interface PortDiagnosticResult {
  port: number;
  host: string;
  protocol: string;
  serviceId?: string;
  serviceName?: string;
  isRequired: boolean;
  state: PortState;
  isAvailable: boolean;
  processInfo: ProcessInfo | null;
  memoriaPidRecord: {
    pid: number;
    serviceId: string;
    startedAt: string;
    command: string;
  } | null;
  actionableResolution: string;
}

/**
 * Checks whether a port is currently listening using native Node socket probe
 */
export async function isPortListening(port: number, host = "127.0.0.1"): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isListening = false;

    socket.setTimeout(400);

    socket.once("connect", () => {
      isListening = true;
      socket.destroy();
      resolve(true);
    });

    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });

    socket.once("error", (err: any) => {
      socket.destroy();
      // ECONNREFUSED means nothing is listening
      if (err.code === "ECONNREFUSED") {
        resolve(false);
      } else {
        // Any other bind or socket error could mean occupied
        resolve(true);
      }
    });

    socket.connect(port, host);
  });
}

/**
 * Finds process information on macOS using lsof and ps
 */
export async function getProcessOnPort(port: number): Promise<ProcessInfo | null> {
  try {
    const { stdout } = await execFileAsync("lsof", ["-iTCP:" + port, "-sTCP:LISTEN", "-n", "-P"]);
    const lines = stdout.trim().split("\n");
    if (lines.length < 2) return null;

    // First line is header: COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME
    const parts = lines[1].split(/\s+/);
    if (parts.length < 2) return null;

    const processName = parts[0];
    const pid = parseInt(parts[1], 10);
    const user = parts[2] || "unknown";
    const address = parts[8] || "unknown";

    // Query full command line via ps
    let command = processName;
    try {
      const { stdout: psOut } = await execFileAsync("ps", ["-p", String(pid), "-o", "command="]);
      if (psOut.trim()) {
        command = psOut.trim();
      }
    } catch {
      // Process may have exited or ps permission restricted
    }

    return {
      pid,
      command,
      user,
      processName,
      address,
    };
  } catch (err: any) {
    // Exit code 1 from lsof means no process found on port
    return null;
  }
}

/**
 * Inspects a specific port definition against active host processes and Memoria PID records
 */
export async function diagnosePort(def: PortDefinition): Promise<PortDiagnosticResult> {
  await fs.mkdir(PIDS_DIR, { recursive: true });

  const effectivePort = PORT_REGISTRY[def.serviceId] ? resolveServicePort(def.serviceId) : def.port;
  const processInfo = await getProcessOnPort(effectivePort);

  // Check if Memoria PID file exists for this service (or its parent service for co-located gRPC)
  let pidFileName = `${def.serviceId}.json`;
  if (def.serviceId === "memory-grpc") pidFileName = "memory-service.json";
  if (def.serviceId === "identity-grpc") pidFileName = "identity-service.json";
  const pidFilePath = path.join(PIDS_DIR, pidFileName);
  let memoriaPidRecord: any = null;
  let isStalePid = false;

  try {
    const raw = await fs.readFile(pidFilePath, "utf-8");
    memoriaPidRecord = JSON.parse(raw);

    // Verify if the recorded PID is actually alive
    try {
      process.kill(memoriaPidRecord.pid, 0);
    } catch (err: any) {
      if (err.code === "ESRCH") {
        isStalePid = true;
      }
    }
  } catch {
    // No PID file exists
  }

  // Determine state
  let state: PortState = "AVAILABLE";
  let actionableResolution = "Port is free and ready for allocation.";

  if (processInfo) {
    if (def.serviceType === "database" || def.serviceType === "message-broker") {
      const isExpectedDaemon =
        (def.serviceId === "postgres" && (processInfo.processName.includes("postgres") || processInfo.command.includes("postgres"))) ||
        (def.serviceId === "redis" && (processInfo.processName.includes("redis") || processInfo.command.includes("redis"))) ||
        (def.serviceId === "nats" && (processInfo.processName.includes("nats") || processInfo.command.includes("nats"))) ||
        (def.serviceId === "minio-api" && processInfo.processName.includes("minio"));

      if (isExpectedDaemon) {
        state = "INFRA_READY";
        actionableResolution = `Infrastructure daemon '${def.serviceName}' is active and healthy (PID ${processInfo.pid}).`;
      } else {
        state = "FOREIGN_CONFLICT";
        actionableResolution = `CONFLICT: Expected '${def.serviceName}' on port ${effectivePort}, but found '${processInfo.processName}' (PID ${processInfo.pid}).`;
      }
    } else if (memoriaPidRecord && memoriaPidRecord.pid === processInfo.pid) {
      state = "MEMORIA_RUNNING";
      actionableResolution = `Service '${def.serviceName}' is actively running under Memoria orchestration (PID ${processInfo.pid}).`;
    } else if (
      processInfo.command.includes(def.serviceId) ||
      (def.serviceId === "memory-grpc" && processInfo.command.includes("memory-service")) ||
      (def.serviceId === "identity-grpc" && processInfo.command.includes("identity-service")) ||
      processInfo.command.includes("yearbook") ||
      processInfo.command.includes("memoria")
    ) {
      state = "MEMORIA_ORPHAN";
      actionableResolution = `Orphaned Memoria process detected on port ${effectivePort} (PID ${processInfo.pid}). Run 'pnpm run dev:down' to stop it safely.`;
    } else {
      state = "FOREIGN_CONFLICT";
      actionableResolution = `CONFLICT: Port ${effectivePort} is occupied by foreign process '${processInfo.processName}' (PID ${processInfo.pid}, User ${processInfo.user}). Stop '${processInfo.processName}' or override ${def.envVar} in .env.`;
    }
  } else if (isStalePid) {
    state = "STALE_PID";
    actionableResolution = `Stale PID metadata detected in ${pidFilePath}. Process ${memoriaPidRecord.pid} no longer exists. Safe to clean.`;
  }

  return {
    port: effectivePort,
    host: def.host,
    protocol: def.protocol,
    serviceId: def.serviceId,
    serviceName: def.serviceName,
    isRequired: def.isRequired,
    state,
    isAvailable: state === "AVAILABLE",
    processInfo,
    memoriaPidRecord,
    actionableResolution,
  };
}

/**
 * Diagnoses all ports defined in the authoritative registry
 */
export async function diagnoseAllPorts(): Promise<{
  diagnostics: PortDiagnosticResult[];
  allRequiredAvailable: boolean;
  hasForeignConflicts: boolean;
  totalAvailable: number;
  totalOccupied: number;
}> {
  const ports = getAllRegisteredPorts();
  const diagnostics: PortDiagnosticResult[] = [];

  for (const def of ports) {
    const diag = await diagnosePort(def);
    diagnostics.push(diag);
  }

  const allRequiredAvailable = diagnostics
    .filter((d) => d.isRequired)
    .every((d) => d.isAvailable || d.state === "MEMORIA_RUNNING" || d.state === "INFRA_READY");

  const hasForeignConflicts = diagnostics.some((d) => d.state === "FOREIGN_CONFLICT");
  const totalAvailable = diagnostics.filter((d) => d.isAvailable).length;
  const totalOccupied = diagnostics.filter((d) => !d.isAvailable).length;

  return {
    diagnostics,
    allRequiredAvailable,
    hasForeignConflicts,
    totalAvailable,
    totalOccupied,
  };
}
