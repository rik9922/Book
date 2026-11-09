import { getAllRegisteredPorts, validatePortRegistry } from "@memory-capsule/contracts";

export function printPortRegistryTable(): void {
  validatePortRegistry();
  const ports = getAllRegisteredPorts();

  console.log("\n==========================================================================================================");
  console.log("🏛️  MEMORIA AUTHORITATIVE LOCAL DEVELOPMENT PORT REGISTRY (SINGLE SOURCE OF TRUTH)");
  console.log("==========================================================================================================");
  console.log(
    "PORT".padEnd(8) +
    "SERVICE ID".padEnd(24) +
    "TYPE".padEnd(16) +
    "REQ".padEnd(6) +
    "ENV OVERRIDE".padEnd(24) +
    "DESCRIPTION"
  );
  console.log("-".repeat(106));

  for (const def of ports) {
    const portStr = String(def.port).padEnd(8);
    const serviceStr = def.serviceId.padEnd(24);
    const typeStr = def.serviceType.padEnd(16);
    const reqStr = (def.isRequired ? "YES" : "NO").padEnd(6);
    const envStr = def.envVar.padEnd(24);
    const desc = def.description;

    console.log(`${portStr}${serviceStr}${typeStr}${reqStr}${envStr}${desc}`);
  }

  console.log("==========================================================================================================\n");
}

if (process.argv[1] && process.argv[1].endsWith("print-ports.ts")) {
  try {
    printPortRegistryTable();
  } catch (err: any) {
    console.error("❌ Registry Validation Error:", err.message);
    process.exit(1);
  }
}
