import fs from "node:fs";
import path from "node:path";

const SCAN_DIRS = [
  "services/api-gateway/src",
  "services/identity-service/src",
  "services/memory-service/src",
  "services/media-service/src",
  "services/collab-service/src",
  "services/book-service/src",
  "services/commerce-service/src",
  "services/notification-service/src",
  "packages/contracts/src",
  "packages/database/src",
  "packages/events/src",
  "packages/jobs/src",
  "packages/logger/src",
  "packages/proto/src",
  "packages/storage/src",
  "apps/web/src",
];

const FORBIDDEN_CONSOLE_REGEX = /\bconsole\.(log|error|warn|debug|info)\s*\(/g;
const EMPTY_CATCH_REGEX = /\bcatch\s*(?:\([^)]*\))?\s*\{\s*(?:\/\/[^\n]*\s*|\/\*[\s\S]*?\*\/\s*)*\}/g;

interface Violation {
  file: string;
  line: number;
  type: string;
  code: string;
}

const violations: Violation[] = [];

function lineNumberAtOffset(content: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < content.length; i++) {
    if (content.charCodeAt(i) === 10) line++;
  }
  return line;
}

function scanFile(filePath: string): void {
  const content = fs.readFileSync(filePath, "utf-8");

  // 1. Line-level scan for console.* outside single/block comments
  const lines = content.split("\n");
  let inBlockComment = false;
  lines.forEach((lineText, index) => {
    const trimmed = lineText.trim();
    if (inBlockComment) {
      if (trimmed.includes("*/")) inBlockComment = false;
      return;
    }
    if (trimmed.startsWith("/*")) {
      if (!trimmed.includes("*/")) inBlockComment = true;
      return;
    }
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) {
      return;
    }
    // Strip trailing inline comment before testing
    const codePart = lineText.replace(/\/\/.*$/, "");
    FORBIDDEN_CONSOLE_REGEX.lastIndex = 0;
    if (FORBIDDEN_CONSOLE_REGEX.test(codePart)) {
      violations.push({
        file: filePath,
        line: index + 1,
        type: "FORBIDDEN_CONSOLE_LOG",
        code: trimmed,
      });
    }
  });

  // 2. Multi-line scan for empty catch blocks (including comment-only catches)
  EMPTY_CATCH_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = EMPTY_CATCH_REGEX.exec(content)) !== null) {
    violations.push({
      file: filePath,
      line: lineNumberAtOffset(content, match.index),
      type: "EMPTY_CATCH_BLOCK",
      code: match[0].replace(/\s+/g, " ").trim(),
    });
  }
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
