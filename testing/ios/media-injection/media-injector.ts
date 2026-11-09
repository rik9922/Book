import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";

const execFileAsync = promisify(execFile);

export interface InjectedAssetResult {
  filename: string;
  filePath: string;
  mediaType: "photo" | "video";
  injectedAt: string;
  success: boolean;
}

export class MediaInjector {
  /**
   * Inject photo and video files into the iOS Simulator's Photos library
   */
  async injectMedia(udid: string, filePaths: string[]): Promise<InjectedAssetResult[]> {
    if (filePaths.length === 0) return [];

    const results: InjectedAssetResult[] = [];
    const validPaths: string[] = [];

    for (const fp of filePaths) {
      const resolved = path.resolve(process.cwd(), fp);
      try {
        await fs.access(resolved);
        validPaths.push(resolved);
      } catch {
        console.warn(`⚠️ File not accessible for injection: ${resolved}`);
      }
    }

    if (validPaths.length === 0) {
      throw new Error("No accessible media files provided for injection.");
    }

    console.log(`📥 Injecting ${validPaths.length} media assets into Simulator ${udid} Photos library...`);

    // simctl addmedia takes multiple file arguments: xcrun simctl addmedia <device> <path> [path ...]
    await execFileAsync("xcrun", ["simctl", "addmedia", udid, ...validPaths]);

    for (const vp of validPaths) {
      const ext = path.extname(vp).toLowerCase();
      const isVideo = ext === ".mp4" || ext === ".mov";
      results.push({
        filename: path.basename(vp),
        filePath: vp,
        mediaType: isVideo ? "video" : "photo",
        injectedAt: new Date().toISOString(),
        success: true,
      });
      console.log(`   ✅ Injected: ${path.basename(vp)} (${isVideo ? "video" : "photo"})`);
    }

    return results;
  }
}
