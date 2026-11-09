import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import fs from "node:fs/promises";
import path from "node:path";
import {
  PORT_REGISTRY,
  validatePortRegistry,
  resolveServicePort,
  getAllRegisteredPorts,
  PortConflictError,
  ConfigurationError,
} from "@memory-capsule/contracts";
import {
  diagnosePort,
  diagnoseAllPorts,
  isPortListening,
  getProcessOnPort,
  MEMORIA_DIR,
  LOCK_FILE,
  PIDS_DIR,
} from "../scripts/ports/port-diagnostics.js";
import { acquireDevLock, releaseDevLock } from "../scripts/ports/port-lock.js";

describe("Memoria Centralized Port Management & Dev Orchestration Suite", () => {
  before(async () => {
    await fs.mkdir(MEMORIA_DIR, { recursive: true });
    await fs.mkdir(PIDS_DIR, { recursive: true });
  });

  after(async () => {
    await releaseDevLock();
  });

  test("1. Registry Integrity — Schema validation and zero port collision", () => {
    // Validate schema does not throw
    assert.doesNotThrow(() => validatePortRegistry(), "validatePortRegistry must not throw on valid registry");

    // Ensure all defined ports are unique across host
    const allPorts = getAllRegisteredPorts();
    const portMap = new Map<number, string>();

    for (const def of allPorts) {
      if (portMap.has(def.port)) {
        assert.fail(
          `Collision detected: Port ${def.port} is assigned to both '${portMap.get(def.port)}' and '${def.serviceId}'`
        );
      }
      portMap.set(def.port, def.serviceId);
    }

    assert.ok(allPorts.length >= 10, "Expected at least 10 registered port definitions");
  });

  test("2. Environment Overrides — resolveServicePort respects dynamic overrides", () => {
    const defaultGatewayPort = resolveServicePort("api-gateway");
    assert.equal(defaultGatewayPort, 4000);

    // Set temporary override
    process.env.PORT_GATEWAY = "4099";
    const overriddenGatewayPort = resolveServicePort("api-gateway");
    assert.equal(overriddenGatewayPort, 4099);

    // Clean up
    delete process.env.PORT_GATEWAY;
    const restoredPort = resolveServicePort("api-gateway");
    assert.equal(restoredPort, 4000);
  });

  test("3. Native Socket Diagnostics — isPortListening reliably detects bound vs free sockets", async () => {
    // Find an ephemeral free port
    const testServer = net.createServer();
    await new Promise<void>((resolve) => testServer.listen(0, "127.0.0.1", () => resolve()));
    const address = testServer.address() as net.AddressInfo;
    const testPort = address.port;

    try {
      // Must detect listening
      const listeningBefore = await isPortListening(testPort);
      assert.equal(listeningBefore, true, `Expected port ${testPort} to be detected as listening`);
    } finally {
      // Close server
      await new Promise<void>((resolve) => testServer.close(() => resolve()));
    }

    // Must detect free
    const listeningAfter = await isPortListening(testPort);
    assert.equal(listeningAfter, false, `Expected port ${testPort} to be detected as available after close`);
  });

  test("4. Conflict Diagnostics — Identifies foreign processes on registered ports", async () => {
    // Create dummy TCP listener on a test port
    const dummyServer = net.createServer();
    await new Promise<void>((resolve) => dummyServer.listen(0, "127.0.0.1", () => resolve()));
    const dummyPort = (dummyServer.address() as net.AddressInfo).port;

    try {
      // Mock PortDefinition pointing to this dummy port
      const dummyDef = {
        serviceId: "test-synthetic-service",
        serviceName: "Test Synthetic Service",
        port: dummyPort,
        containerPort: dummyPort,
        serviceType: "microservice" as const,
        protocol: "tcp" as const,
        envVar: "PORT_TEST_SYNTHETIC",
        host: "127.0.0.1",
        isRequired: true,
        allocation: "fixed" as const,
      };

      const result = await diagnosePort(dummyDef);
      assert.equal(result.isAvailable, false);
      assert.ok(
        result.state === "FOREIGN_CONFLICT" || result.state === "MEMORIA_ORPHAN",
        `Expected FOREIGN_CONFLICT or MEMORIA_ORPHAN, got: ${result.state}`
      );
      assert.ok(result.processInfo !== null, "Expected process info to be populated");
    } finally {
      await new Promise<void>((resolve) => dummyServer.close(() => resolve()));
    }
  });

  test("5. Mutual Exclusion Lock — Prevents concurrent execution races and auto-heals stale locks", async () => {
    // Ensure clean state
    await releaseDevLock();

    // 1. Acquire lock
    const releaseFirst = await acquireDevLock(3000);
    assert.ok(releaseFirst, "First lock acquisition must succeed");

    // Check lock file existence
    const lockExists = await fs
      .stat(LOCK_FILE)
      .then(() => true)
      .catch(() => false);
    assert.equal(lockExists, true, "Lock file must exist on disk");

    // 2. Second attempt must timeout
    let secondFailed = false;
    try {
      await acquireDevLock(600); // 600ms timeout
    } catch (err: any) {
      secondFailed = true;
      assert.ok(err instanceof ConfigurationError);
    }
    assert.equal(secondFailed, true, "Second lock acquisition must fail due to active lock");

    // 3. Release first lock
    await releaseFirst();

    // 4. Stale lock recovery test
    // Write fake lock file with a non-existent PID (e.g. 999999)
    await fs.writeFile(
      LOCK_FILE,
      JSON.stringify({
        pid: 999999,
        acquiredAt: new Date(Date.now() - 60000).toISOString(),
        command: "ghost-command",
      }),
      "utf-8"
    );

    // Acquire should detect PID 999999 is dead, auto-unlink stale lock, and succeed
    const releaseThird = await acquireDevLock(3000);
    assert.ok(releaseThird, "Lock acquisition must succeed by auto-healing stale lock");
    await releaseThird();
  });

  test("6. Typed Error Hierarchy — PortConflictError and ConfigurationError behavior", () => {
    const conflictErr = new PortConflictError(4000);
    assert.equal(conflictErr.name, "PortConflictError");
    assert.equal(conflictErr.port, 4000);
    assert.ok(conflictErr.message.includes("4000"));

    const configErr = new ConfigurationError("Invalid port configuration");
    assert.equal(configErr.name, "ConfigurationError");
    assert.ok(configErr.message.includes("Invalid port configuration"));
  });
});
