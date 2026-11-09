import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";

const execFileAsync = promisify(execFile);

export interface SimulatorDevice {
  udid: string;
  name: string;
  state: "Booted" | "Shutdown" | string;
  isAvailable: boolean;
  runtime: string;
}

export class SimulatorManager {
  private activeUdid: string | null = null;

  /**
   * List all available iOS Simulator devices
   */
  async listDevices(): Promise<SimulatorDevice[]> {
    const { stdout } = await execFileAsync("xcrun", ["simctl", "list", "devices", "available", "-j"]);
    const data = JSON.parse(stdout);
    const devices: SimulatorDevice[] = [];

    for (const [runtime, list] of Object.entries<any>(data.devices)) {
      if (!runtime.includes("iOS")) continue;
      for (const d of list) {
        if (d.isAvailable) {
          devices.push({
            udid: d.udid,
            name: d.name,
            state: d.state,
            isAvailable: d.isAvailable,
            runtime,
          });
        }
      }
    }
    return devices;
  }

  /**
   * Find a preferred iPhone simulator (defaults to iPhone 17 Pro or any available iPhone)
   */
  async findPreferredDevice(preferredName = "iPhone 17 Pro"): Promise<SimulatorDevice> {
    const devices = await this.listDevices();
    if (devices.length === 0) {
      throw new Error("No available iOS Simulator devices found on this system.");
    }

    const exactMatch = devices.find((d) => d.name === preferredName);
    if (exactMatch) return exactMatch;

    const anyIPhone = devices.find((d) => d.name.startsWith("iPhone"));
    if (anyIPhone) return anyIPhone;

    return devices[0];
  }

  /**
   * Boot the designated simulator device and override status bar for clean testing
   */
  async boot(udid: string): Promise<void> {
    this.activeUdid = udid;
    const devices = await this.listDevices();
    const device = devices.find((d) => d.udid === udid);

    if (!device) {
      throw new Error(`Simulator device ${udid} not found.`);
    }

    if (device.state !== "Booted") {
      console.log(`📱 Booting iOS Simulator: ${device.name} (${udid})...`);
      await execFileAsync("xcrun", ["simctl", "boot", udid]);
    } else {
      console.log(`📱 Simulator ${device.name} (${udid}) is already Booted.`);
    }

    // Stabilize status bar for clean test evidence
    try {
      await execFileAsync("xcrun", [
        "simctl",
        "status_bar",
        udid,
        "override",
        "--time", "9:41",
        "--batteryState", "charged",
        "--batteryLevel", "100",
        "--wifiBars", "3",
        "--cellularBars", "4",
      ]);
    } catch {
      // Non-fatal if status bar override is partially unsupported
    }
  }

  /**
   * Take screenshot of the simulator
   */
  async captureScreenshot(udid: string, outputPath: string): Promise<string> {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await execFileAsync("xcrun", ["simctl", "io", udid, "screenshot", outputPath]);
    return outputPath;
  }

  /**
   * Safely shutdown simulator
   */
  async shutdown(udid?: string): Promise<void> {
    const target = udid || this.activeUdid;
    if (!target) return;
    try {
      console.log(`📱 Shutting down simulator (${target})...`);
      await execFileAsync("xcrun", ["simctl", "shutdown", target]);
    } catch (err: any) {
      if (!err.message?.includes("current state: Shutdown")) {
        console.warn(`Simulator shutdown note: ${err.message}`);
      }
    }
  }
}

