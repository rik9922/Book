import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface SyntheticAudioSpec {
  filename: string;
  durationSeconds: number;
  sampleRate: number;
  codec: "aac" | "pcm_s16le";
  format: "ipod" | "wav"; // 'ipod' container is the standard for .m4a
}

export const AUDIO_SPECS: SyntheticAudioSpec[] = [
  {
    filename: "eleanor_story_voice_note.m4a",
    durationSeconds: 5,
    sampleRate: 44100,
    codec: "aac",
    format: "ipod",
  },
  {
    filename: "garden_ambiance.m4a",
    durationSeconds: 4,
    sampleRate: 44100,
    codec: "aac",
    format: "ipod",
  },
];

export async function generateSyntheticAudio(outputDir: string): Promise<Array<{ filename: string; filePath: string; checksum: string; size: number; duration: number }>> {
  await fs.mkdir(outputDir, { recursive: true });
  const results = [];

  for (const spec of AUDIO_SPECS) {
    const destPath = path.join(outputDir, spec.filename);

    // Generate harmonic gentle chord tone simulating voice note / ambience
    const ffmpegArgs = [
      "-y",
      "-f", "lavfi",
      "-i", `sine=frequency=220:duration=${spec.durationSeconds}:sample_rate=${spec.sampleRate}`,
      "-c:a", spec.codec,
      "-b:a", "96k",
      "-f", spec.format,
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
      throw new Error(`Failed to generate synthetic audio ${spec.filename}: ${err.message}`);
    }
  }

  return results;
}

