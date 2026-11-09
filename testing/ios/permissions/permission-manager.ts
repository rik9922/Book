import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type PermissionService = "photos" | "camera" | "microphone" | "location-always" | "all";
export type PermissionAction = "grant" | "revoke" | "reset";

export class PermissionManager {
  /**
   * Set or modify permission on the simulator for a bundle identifier
   */
  async setPermission(
    udid: string,
    action: PermissionAction,
    service: PermissionService,
    bundleId: string = "com.memoria.app"
  ): Promise<void> {
    console.log(`🔐 [PermissionManager] Setting ${action} for '${service}' on ${bundleId} (device: ${udid})...`);
    try {
      await execFileAsync("xcrun", ["simctl", "privacy", udid, action, service, bundleId]);
      console.log(`   ✅ Privacy action '${action}' applied for service '${service}'.`);
    } catch (err: any) {
      // If the app is not yet installed when setting privacy, simctl might throw or queue it. We log gracefully.
      console.warn(`   ⚠️ Privacy adjustment notice: ${err.message}`);
    }
  }

  /**
   * Provision all required permissions for standard Memoria workflow execution
   */
  async grantStandardPermissions(udid: string, bundleId: string = "com.memoria.app"): Promise<void> {
    await this.setPermission(udid, "grant", "photos", bundleId);
    await this.setPermission(udid, "grant", "camera", bundleId);
    await this.setPermission(udid, "grant", "microphone", bundleId);
  }
}
