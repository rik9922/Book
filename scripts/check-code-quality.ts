import fs from "node:fs";
import path from "node:path";

const SCAN_DIRS = [
  "services/api-gateway/src",
  "services/identity-service/src",
  "services/memory-service/src",
  "services/media-service/src",
  "services/book-service/src",
  "packages/contracts/src",
  "packages/database/src",
  "packages/events/src",
  "packages/jobs/src",
  "packages/logger/src",
  "packages/proto/src",
  "packages/storage/src",
  "apps/web/src",
];

const FORBIDDEN_CONSOLE_REGEX = /\bconsole\.(log|error|warn|debug|info)\s*\(/;
const EMPTY_CATCH_REGEX = /catch\s*\([^)]*\)\s*\{\s*\}/;

interface Violation {
  file: string;
  line: number;
  type: string;
  code: string;
}

const violations: Violation[] = [];

function scanFile(filePath: string): void {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  lines.forEach((lineText, index) => {
    const trimmed = lineText.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
      return;
    }

    if (FORBIDDEN_CONSOLE_REGEX.test(lineText)) {
      violations.push({
        file: filePath,
        line: index + 1,
        type: "FORBIDDEN_CONSOLE_LOG",
        code: trimmed,
      });
    }

    if (EMPTY_CATCH_REGEX.test(lineText)) {
      violations.push({
        file: filePath,
        line: index + 1,
        type: "EMPTY_CATCH_BLOCK",
        code: trimmed,
      });
    }
  });
}

function walkDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
      scanFile(fullPath);
    }
  }
}

console.log("🔍 [Memoria Quality Gate] Scanning production services and packages...");

for (const dir of SCAN_DIRS) {
  walkDir(dir);
}

if (violations.length > 0) {
  console.error(`\n❌ [Memoria Quality Gate] ${violations.length} code quality violation(s) detected:\n`);
  for (const v of violations) {
    console.error(`  - ${v.file}:${v.line} [${v.type}] -> ${v.code}`);
  }
  console.error(`\nProduction code must use @memory-capsule/logger instead of raw console.* calls.\n`);
  process.exit(1);
} else {
  console.log("✅ [Memoria Quality Gate] All production services clean! Zero console.* calls or empty catch blocks.");
  process.exit(0);
}

