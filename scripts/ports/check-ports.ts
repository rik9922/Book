import { diagnoseAllPorts, PortDiagnosticResult } from "./port-diagnostics.js";

export async function runPortCheck(): Promise<boolean> {
  console.log("\n🔍 [Memoria Port Diagnostics] Probing registered local development ports...\n");
  const { diagnostics, allRequiredAvailable, hasForeignConflicts } = await diagnoseAllPorts();

  console.log("PORT".padEnd(8) + "SERVICE".padEnd(24) + "STATUS".padEnd(20) + "PID / PROCESS".padEnd(28) + "RESOLUTION / NOTE");
  console.log("-".repeat(110));

  for (const d of diagnostics) {
    const portStr = String(d.port).padEnd(8);
    const serviceStr = (d.serviceId || "unknown").padEnd(24);

    let statusBadge = "🟢 AVAILABLE";
    if (d.state === "INFRA_READY") statusBadge = "🟢 INFRA READY";
    else if (d.state === "MEMORIA_RUNNING") statusBadge = "🔵 RUNNING (Memoria)";
    else if (d.state === "MEMORIA_ORPHAN") statusBadge = "🟡 ORPHAN (Memoria)";
    else if (d.state === "FOREIGN_CONFLICT") statusBadge = "🔴 CONFLICT (Foreign)";
    else if (d.state === "STALE_PID") statusBadge = "🟠 STALE PID";

    const statusStr = statusBadge.padEnd(20);

    let procStr = "-";
    if (d.processInfo) {
      procStr = `PID ${d.processInfo.pid} (${d.processInfo.processName})`;
    }
    procStr = procStr.padEnd(28);

    const note = d.actionableResolution;
    console.log(`${portStr}${serviceStr}${statusStr}${procStr}${note}`);
  }

  console.log("-".repeat(110));

  if (hasForeignConflicts) {
    console.error("\n❌ FOREIGN PORT CONFLICTS DETECTED!");
    console.error("One or more required Memoria ports are occupied by unrelated applications.");
    console.error("Inspect the processes listed above and stop them, or override the respective port in your .env file.\n");
    return false;
  }

  if (allRequiredAvailable) {
    console.log("\n✅ All required ports are available or already managed by Memoria. Ready to launch!\n");
    return true;
  }

  console.log("\n⚠️ Some optional ports or non-critical listeners are occupied. Review list above.\n");
  return true;
}

if (process.argv[1] && process.argv[1].endsWith("check-ports.ts")) {
  runPortCheck()
    .then((success) => {
      if (!success) process.exit(1);
    })
    .catch((err) => {
      console.error("❌ Port check failed:", err);
      process.exit(1);
    });
}
