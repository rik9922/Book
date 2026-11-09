import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface SyntheticVideoSpec {
  filename: string;
  durationSeconds: number;
  width: number;
  height: number;
  fps: number;
  title: string;
  themeColor: string;
}

export const VIDEO_SPECS: SyntheticVideoSpec[] = [
  {
    filename: "anniversary_toast.mp4",
    durationSeconds: 4,
    width: 1920,
    height: 1080,
    fps: 30,
    title: "The Bennett Family Anniversary Toast",
    themeColor: "0x1A1A24",
  },
  {
    filename: "tahoe_water_glide.mp4",
    durationSeconds: 4,
    width: 1080,
    height: 1920, // Portrait orientation for mobile video test
    fps: 30,
    title: "Emerald Bay Canoe Glide",
    themeColor: "0x0A2239",
  },
];

export async function generateSyntheticVideos(outputDir: string): Promise<Array<{ filename: string; filePath: string; checksum: string; size: number; duration: number }>> {
  await fs.mkdir(outputDir, { recursive: true });
  const results = [];

  for (const spec of VIDEO_SPECS) {
    const destPath = path.join(outputDir, spec.filename);

    // Use ffmpeg to generate a high quality test video with an animated gradient and clean AAC audio
    // -lavfi creates a test video source with test pattern and sine tone audio
    const ffmpegArgs = [
      "-y",
      "-f", "lavfi",
      "-i", `testsrc=size=${spec.width}x${spec.height}:rate=${spec.fps}:duration=${spec.durationSeconds}`,
      "-f", "lavfi",
      "-i", `sine=frequency=440:duration=${spec.durationSeconds}:sample_rate=44100`,
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-preset", "veryfast",
      "-profile:v", "high",
      "-level", "4.0",
      "-c:a", "aac",
      "-b:a", "128k",
      "-shortest",
      "-movflags", "+faststart",
      destPath,
    ];

    try {
      await execFileAsync("/opt/homebrew/bin/ffmpeg", ffmpegArgs);
      const stat = await fs.stat(destPath);
      const fileData = await fs.readFile(destPath);
      const hash = crypto.createHash("sha256").update(fileData).digest("hex");

      results.push({
        filename: spec.filename,
        filePath: destPath,
        checksum: hash,
        size: stat.size,
        duration: spec.durationSeconds,
      });
    } catch (err: any) {
      throw new Error(`Failed to generate synthetic video ${spec.filename}: ${err.message}`);
    }
  }

  return results;
}
