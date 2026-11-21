import crypto from "node:crypto";
import zlib from "node:zlib";
import JSZip from "jszip";
import mammoth from "mammoth";
import {
  ValidationError,
  ChapterSectionTypeSchema,
  MemoriaPackageManifestSchema,
  type ChapterSectionType,
  type ExportFormat,
  type ImportDiffChapter,
  type ImportFormat,
  type ManuscriptChapter,
  type ManuscriptDocument,
  type MergeStrategy,
} from "@memory-capsule/contracts";

export const MAX_IMPORT_BYTES = 15 * 1024 * 1024; // 15 MB
const MAX_ZIP_ENTRIES = 500;
const MAX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024; // 50 MB

export interface ParsedImportChapter {
  title: string;
  subtitle?: string | null;
  sectionType: ChapterSectionType;
  contentHtml: string;
  contentText: string;
  contentJson: Record<string, unknown>;
  wordCount: number;
}

export interface ParsedImportResult {
  format: ImportFormat;
  chapters: ParsedImportChapter[];
  warnings: string[];
  bookMetadata?: {
    title?: string;
    subtitle?: string;
    coverTitle?: string;
    spineText?: string;
    coverColor?: string;
    foilStamping?: string;
  };
  manuscriptMetadata?: {
    trimSize?: ManuscriptDocument["trimSize"];
    typographyPreset?: ManuscriptDocument["typographyPreset"];
    themePreset?: string;
    languageCode?: string;
    authorName?: string;
    dedication?: string;
    epigraph?: string;
  };
}

export interface ExportArtifact {
  format: ExportFormat;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  checksumSha256: string;
}

export function slugifyTitle(input: string, fallback = "chapter"): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || fallback;
}

export function countWords(text: string): number {
  const cleaned = text.trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).filter(Boolean).length;
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function stripHtmlToText(html: string): string {
  return html
    .replace(/<\/(p|div|h[1-6]|li|blockquote|br)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Strict semantic HTML sanitizer for Author Studio imports and editor persistence.
 * Strips scripts, iframes, embeds, style tags, inline event handlers, and unsafe URLs.
 */
export function sanitizeManuscriptHtml(rawHtml: string): string {
  let cleaned = rawHtml
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe|object|embed|form|input|button|meta|link|base)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|style|iframe|object|embed|form|input|button|meta|link|base)[^>]*\/?>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*(?:"\s*(?:javascript|vbscript|data:text\/html)[^"]*"|'\s*(?:javascript|vbscript|data:text\/html)[^']*')/gi, '$1="#"');

  const allowedTags = new Set([
    "p",
    "br",
    "h1",
    "h2",
    "h3",
    "h4",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "blockquote",
    "ul",
    "ol",
    "li",
    "hr",
    "pre",
    "code",
    "figure",
    "figcaption",
  ]);

  cleaned = cleaned.replace(/<\/?([a-z0-9]+)(?:\s[^>]*)?>/gi, (match, tagNameRaw: string) => {
    const tagName = tagNameRaw.toLowerCase();
    if (!allowedTags.has(tagName)) {
      return "";
    }
    if (match.startsWith("</")) {
      return `</${tagName}>`;
    }
    if (tagName === "br" || tagName === "hr") {
      return `<${tagName} />`;
    }
    return `<${tagName}>`;
  });

  const trimmed = cleaned.trim();
  return trimmed.length > 0 ? trimmed : "<p></p>";
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

function parseInlineNodes(inlineHtml: string): Array<Record<string, unknown>> {
  const nodes: Array<Record<string, unknown>> = [];
  const activeMarks: string[] = [];
  const tokenRegex = /(<\/?(?:strong|b|em|i|code|u|s|br)\b[^>]*\/?>)/gi;
  const parts = inlineHtml.split(tokenRegex);

  const tagToMark = (tag: string): string | null => {
    switch (tag) {
      case "strong":
      case "b":
        return "bold";
      case "em":
      case "i":
        return "italic";
      case "code":
        return "code";
      case "u":
        return "underline";
      case "s":
        return "strike";
      default:
        return null;
    }
  };

  for (const part of parts) {
    if (!part) continue;
    const tagMatch = part.match(/^<(\/)?([a-z0-9]+)\b[^>]*\/?>$/i);
    if (tagMatch) {
      const isClose = Boolean(tagMatch[1]);
      const tag = tagMatch[2].toLowerCase();
      if (tag === "br") {
        nodes.push({ type: "hardBreak" });
        continue;
      }
      const mark = tagToMark(tag);
      if (mark) {
        if (isClose) {
          const idx = activeMarks.lastIndexOf(mark);
          if (idx !== -1) activeMarks.splice(idx, 1);
        } else if (!activeMarks.includes(mark)) {
          activeMarks.push(mark);
        }
      }
      continue;
    }

    const text = decodeHtmlEntities(part.replace(/<[^>]+>/g, ""));
    if (text.length > 0) {
      const node: Record<string, unknown> = { type: "text", text };
      if (activeMarks.length > 0) {
        node.marks = activeMarks.map((type) => ({ type }));
      }
      nodes.push(node);
    }
  }

  return nodes;
}

/**
 * Converts clean semantic HTML into a valid ProseMirror/Tiptap JSON document,
 * preserving headings, paragraphs, blockquotes, lists, horizontal rules, and inline marks.
 */
export function htmlToProseMirrorJson(html: string): Record<string, unknown> {
  const safeHtml = sanitizeManuscriptHtml(html);
  const content: Array<Record<string, unknown>> = [];
  const blockRegex = /<(ul|ol)>([\s\S]*?)<\/\1>|<(h[1-4]|p|blockquote|pre)>([\s\S]*?)<\/\3>|<hr\s*\/?>/gi;
  let match: RegExpExecArray | null = blockRegex.exec(safeHtml);

  while (match !== null) {
    if (match[0].toLowerCase().startsWith("<hr")) {
      content.push({ type: "horizontalRule" });
    } else if (match[1]) {
      const listTag = match[1].toLowerCase();
      const listBody = match[2];
      const items: Array<Record<string, unknown>> = [];
      const liRegex = /<li>([\s\S]*?)<\/li>/gi;
      let liMatch: RegExpExecArray | null = liRegex.exec(listBody);
      while (liMatch !== null) {
        const inlineNodes = parseInlineNodes(liMatch[1]);
        items.push({
          type: "listItem",
          content: [{ type: "paragraph", content: inlineNodes }],
        });
        liMatch = liRegex.exec(listBody);
      }
      if (items.length > 0) {
        content.push({
          type: listTag === "ol" ? "orderedList" : "bulletList",
          content: items,
        });
      }
    } else if (match[3]) {
      const tag = match[3].toLowerCase();
      const inner = match[4];
      if (tag.startsWith("h")) {
        const level = Math.min(4, Math.max(1, Number(tag.slice(1)) || 2));
        const inlineNodes = parseInlineNodes(inner);
        content.push({
          type: "heading",
          attrs: { level },
          content: inlineNodes,
        });
      } else if (tag === "blockquote") {
        const paraMatches = [...inner.matchAll(/<p>([\s\S]*?)<\/p>/gi)];
        const bqParagraphs =
          paraMatches.length > 0
            ? paraMatches.map((pm) => ({ type: "paragraph", content: parseInlineNodes(pm[1]) }))
            : [{ type: "paragraph", content: parseInlineNodes(inner) }];
        content.push({
          type: "blockquote",
          content: bqParagraphs,
        });
      } else if (tag === "pre") {
        const innerText = stripHtmlToText(inner);
        content.push({
          type: "codeBlock",
          content: innerText ? [{ type: "text", text: innerText }] : [],
        });
      } else {
        content.push({
          type: "paragraph",
          content: parseInlineNodes(inner),
        });
      }
    }
    match = blockRegex.exec(safeHtml);
  }

  if (content.length === 0) {
    const fallbackText = stripHtmlToText(safeHtml);
    const paragraphs = fallbackText
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (paragraphs.length === 0) {
      content.push({ type: "paragraph" });
    } else {
      for (const p of paragraphs) {
        content.push({ type: "paragraph", content: [{ type: "text", text: p }] });
      }
    }
  }

  return { type: "doc", content };
}

export function plainTextToHtml(text: string): string {
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return "<p></p>";
  return paragraphs.map((p) => `<p>${escapeXml(p).replace(/\n/g, "<br />")}</p>`).join("\n");
}

function markdownInlineToHtml(line: string): string {
  return escapeXml(line)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

export function markdownBodyToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let inList = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      continue;
    }
    if (line.startsWith("### ")) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(`<h3>${markdownInlineToHtml(line.slice(4))}</h3>`);
    } else if (line.startsWith("## ")) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(`<h2>${markdownInlineToHtml(line.slice(3))}</h2>`);
    } else if (line.startsWith("> ")) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(`<blockquote><p>${markdownInlineToHtml(line.slice(2))}</p></blockquote>`);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${markdownInlineToHtml(line.slice(2))}</li>`);
    } else if (line === "---" || line === "***") {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push("<hr />");
    } else {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(`<p>${markdownInlineToHtml(line)}</p>`);
    }
  }
  if (inList) out.push("</ul>");
  return sanitizeManuscriptHtml(out.join("\n"));
}

function buildParsedChapter(
  title: string,
  html: string,
  sectionType: ChapterSectionType = "chapter",
  subtitle: string | null = null,
  explicitJson?: Record<string, unknown>
): ParsedImportChapter {
  const safeHtml = sanitizeManuscriptHtml(html);
  const text = stripHtmlToText(safeHtml);
  const contentJson =
    explicitJson && explicitJson.type === "doc"
      ? explicitJson
      : htmlToProseMirrorJson(safeHtml);
  return {
    title: title.trim().slice(0, 255) || "Untitled Chapter",
    subtitle,
    sectionType,
    contentHtml: safeHtml,
    contentText: text,
    contentJson,
    wordCount: countWords(text),
  };
}

/**
 * Safely loads and validates a ZIP archive against zip-slip path traversal
 * and decompression bomb limits.
 */
async function loadSafeZip(buffer: Buffer, formatLabel: string): Promise<JSZip> {
  if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new ValidationError(`Invalid ${formatLabel} archive: missing ZIP magic signature (PK)`);
  }
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new ValidationError(`Invalid ${formatLabel} archive: corrupted or unreadable ZIP container`);
  }
  const entryNames = Object.keys(zip.files);
  if (entryNames.length > MAX_ZIP_ENTRIES) {
    throw new ValidationError(
      `Archive rejected: contains ${entryNames.length} entries (max ${MAX_ZIP_ENTRIES})`
    );
  }
  let totalUncompressed = 0;
  for (const name of entryNames) {
    if (
      name.includes("..") ||
      name.startsWith("/") ||
      name.startsWith("\\") ||
      name.includes("\0") ||
      /^[a-zA-Z]:/.test(name)
    ) {
      throw new ValidationError(`Archive rejected: unsafe entry path detected (${name})`);
    }
    const entry = zip.files[name];
    if (!entry.dir) {
      const bytes = await entry.async("uint8array");
      totalUncompressed += bytes.byteLength;
      if (totalUncompressed > MAX_UNCOMPRESSED_BYTES) {
        throw new ValidationError(
          `Archive rejected: uncompressed size exceeds ${MAX_UNCOMPRESSED_BYTES} byte safety ceiling`
        );
      }
    }
  }
  return zip;
}

function splitHtmlIntoChapters(rawHtml: string, fallbackTitle: string): ParsedImportChapter[] {
  const safeHtml = sanitizeManuscriptHtml(rawHtml);
  const parts = safeHtml.split(/(?=<h1\b[^>]*>)/i).filter((part) => part.trim().length > 0);
  if (parts.length <= 1) {
    const h1Match = safeHtml.match(/<h1[^>]*>(.*?)<\/h1>/i);
    const title = h1Match ? stripHtmlToText(h1Match[1]) : fallbackTitle;
    const body = h1Match ? safeHtml.replace(h1Match[0], "").trim() : safeHtml;
    return [buildParsedChapter(title || fallbackTitle, body || "<p></p>")];
  }
  const chapters: ParsedImportChapter[] = [];
  for (let i = 0; i < parts.length; i += 1) {
    const segment = parts[i];
    const h1Match = segment.match(/<h1[^>]*>(.*?)<\/h1>/i);
    const title = h1Match ? stripHtmlToText(h1Match[1]) : `Chapter ${i + 1}`;
    const body = h1Match ? segment.replace(h1Match[0], "").trim() : segment;
    chapters.push(buildParsedChapter(title || `Chapter ${i + 1}`, body || "<p></p>"));
  }
  return chapters;
}

const MAX_PDF_INFLATED_STREAM_BYTES = 8 * 1024 * 1024; // 8 MB per stream safety ceiling

function decodePdfLiteralString(raw: string): string {
  return raw
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}

function extractPdfTextTokens(content: string): string[] {
  const matches: string[] = [];
  // Match parenthesized PDF string literals including escaped parentheses
  const parenRegex = /\(((?:\\.|[^()\\]){1,600})\)/g;
  let match: RegExpExecArray | null = parenRegex.exec(content);
  while (match !== null) {
    const decoded = decodePdfLiteralString(match[1])
      .replace(/[^\x20-\x7E\n\r\t]/g, " ")
      .trim();
    if (decoded.length >= 2 && /[A-Za-z0-9]/.test(decoded)) {
      matches.push(decoded);
    }
    match = parenRegex.exec(content);
  }
  return matches;
}

/**
 * Extracts text from both uncompressed PDF text streams and /FlateDecode
 * compressed content streams via zlib.inflateSync under a strict memory ceiling.
 */
export function extractAssistedPdfText(buffer: Buffer): string {
  const latin = buffer.toString("latin1");
  const collected: string[] = [];

  // 1. Scan for PDF stream ... endstream blocks and inflate /FlateDecode streams
  const streamToken = "stream";
  const endStreamToken = "endstream";
  let searchPos = 0;
  let streamsChecked = 0;

  while (searchPos < latin.length && streamsChecked < 200) {
    const streamIdx = latin.indexOf(streamToken, searchPos);
    if (streamIdx === -1) break;
    const endIdx = latin.indexOf(endStreamToken, streamIdx + streamToken.length);
    if (endIdx === -1) break;
    streamsChecked += 1;

    // Inspect preceding dictionary window for /FlateDecode
    const dictStart = Math.max(0, streamIdx - 512);
    const dictWindow = latin.slice(dictStart, streamIdx);
    let dataStart = streamIdx + streamToken.length;
    if (latin[dataStart] === "\r" && latin[dataStart + 1] === "\n") {
      dataStart += 2;
    } else if (latin[dataStart] === "\n" || latin[dataStart] === "\r") {
      dataStart += 1;
    }
    let dataEnd = endIdx;
    while (dataEnd > dataStart && (latin[dataEnd - 1] === "\n" || latin[dataEnd - 1] === "\r")) {
      dataEnd -= 1;
    }

    if (dictWindow.includes("/FlateDecode") && dataEnd > dataStart) {
      const compressed = buffer.subarray(dataStart, dataEnd);
      let inflated: Buffer | null = null;
      try {
        inflated = zlib.inflateSync(compressed, { maxOutputLength: MAX_PDF_INFLATED_STREAM_BYTES });
      } catch {
        try {
          inflated = zlib.inflateRawSync(compressed, { maxOutputLength: MAX_PDF_INFLATED_STREAM_BYTES });
        } catch {
          inflated = null;
        }
      }
      if (inflated && inflated.length > 0) {
        const streamText = inflated.toString("latin1");
        collected.push(...extractPdfTextTokens(streamText));
      }
    }

    searchPos = endIdx + endStreamToken.length;
  }

  // 2. Also extract any uncompressed text tokens from the PDF body
  if (collected.length === 0) {
    collected.push(...extractPdfTextTokens(latin));
  }

  return collected.join(" ").replace(/\s{2,}/g, " ").trim();
}

export function computeImportChapterDiff(
  existingChapters: Array<{ id?: string; title: string; contentText: string; wordCount: number }>,
  incomingChapters: Array<{ title: string; contentText: string; wordCount: number }>,
  mergeStrategy: MergeStrategy
): {
  summary: { unchanged: number; added: number; removed: number; modified: number };
  chapters: ImportDiffChapter[];
} {
  const normalize = (s: string) => s.trim().replace(/\s+/g, " ");
  const existingByTitle = new Map(
    existingChapters.map((ch) => [ch.title.trim().toLowerCase(), ch])
  );
  const incomingByTitle = new Map(
    incomingChapters.map((ch) => [ch.title.trim().toLowerCase(), ch])
  );

  const rows: ImportDiffChapter[] = [];

  if (mergeStrategy === "append") {
    for (const ex of existingChapters) {
      rows.push({
        title: ex.title,
        status: "unchanged",
        existingChapterId: ex.id,
        existingWordCount: ex.wordCount,
        incomingWordCount: ex.wordCount,
        wordDelta: 0,
        existingExcerpt: ex.contentText.slice(0, 140),
        incomingExcerpt: ex.contentText.slice(0, 140),
      });
    }
    for (const inc of incomingChapters) {
      rows.push({
        title: inc.title,
        status: "added",
        existingWordCount: 0,
        incomingWordCount: inc.wordCount,
        wordDelta: inc.wordCount,
        existingExcerpt: "",
        incomingExcerpt: inc.contentText.slice(0, 140),
      });
    }
  } else {
    // replace or merge_by_title
    const seenTitles = new Set<string>();
    for (const inc of incomingChapters) {
      const key = inc.title.trim().toLowerCase();
      seenTitles.add(key);
      const ex = existingByTitle.get(key);
      if (!ex) {
        rows.push({
          title: inc.title,
          status: "added",
          existingWordCount: 0,
          incomingWordCount: inc.wordCount,
          wordDelta: inc.wordCount,
          existingExcerpt: "",
          incomingExcerpt: inc.contentText.slice(0, 140),
        });
      } else {
        const isSame = normalize(ex.contentText) === normalize(inc.contentText);
        rows.push({
          title: inc.title,
          status: isSame ? "unchanged" : "modified",
          existingChapterId: ex.id,
          existingWordCount: ex.wordCount,
          incomingWordCount: inc.wordCount,
          wordDelta: inc.wordCount - ex.wordCount,
          existingExcerpt: ex.contentText.slice(0, 140),
          incomingExcerpt: inc.contentText.slice(0, 140),
        });
      }
    }

    for (const ex of existingChapters) {
      const key = ex.title.trim().toLowerCase();
      if (!seenTitles.has(key) && !incomingByTitle.has(key)) {
        if (mergeStrategy === "replace") {
          rows.push({
            title: ex.title,
            status: "removed",
            existingChapterId: ex.id,
            existingWordCount: ex.wordCount,
            incomingWordCount: 0,
            wordDelta: -ex.wordCount,
            existingExcerpt: ex.contentText.slice(0, 140),
            incomingExcerpt: "",
          });
        } else {
          rows.push({
            title: ex.title,
            status: "unchanged",
            existingChapterId: ex.id,
            existingWordCount: ex.wordCount,
            incomingWordCount: ex.wordCount,
            wordDelta: 0,
            existingExcerpt: ex.contentText.slice(0, 140),
            incomingExcerpt: ex.contentText.slice(0, 140),
          });
        }
      }
    }
  }

  const summary = {
    unchanged: rows.filter((r) => r.status === "unchanged").length,
    added: rows.filter((r) => r.status === "added").length,
    removed: rows.filter((r) => r.status === "removed").length,
    modified: rows.filter((r) => r.status === "modified").length,
  };

  return { summary, chapters: rows };
}

export async function parseImportedManuscript(
  format: ImportFormat,
  fileName: string,
  buffer: Buffer
): Promise<ParsedImportResult> {
  if (buffer.length === 0) {
    throw new ValidationError("Import payload cannot be empty");
  }
  if (buffer.length > MAX_IMPORT_BYTES) {
    throw new ValidationError(`Import payload exceeds ${MAX_IMPORT_BYTES} byte limit`);
  }

  const baseTitle = fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || "Imported Manuscript";

  if (format === "memoria") {
    const zip = await loadSafeZip(buffer, ".memoria");
    const manifestEntry = zip.file("manifest.json");
    if (!manifestEntry) {
      throw new ValidationError("Invalid .memoria package: missing manifest.json");
    }
    let manifestRaw: unknown;
    try {
      manifestRaw = JSON.parse(await manifestEntry.async("string"));
    } catch {
      throw new ValidationError("Invalid .memoria package: malformed manifest.json");
    }
    const manifestParsed = MemoriaPackageManifestSchema.safeParse(manifestRaw);
    if (!manifestParsed.success) {
      throw new ValidationError("Invalid .memoria package: manifest schema validation failed");
    }
    const manifest = manifestParsed.data;

    const chapterEntries = Object.keys(zip.files)
      .filter((name) => name.startsWith("chapters/") && name.endsWith(".json"))
      .sort();

    if (chapterEntries.length === 0) {
      throw new ValidationError("Invalid .memoria package: no chapters/*.json entries found");
    }

    const chapters: ParsedImportChapter[] = [];
    for (const entryName of chapterEntries) {
      let chRaw: Record<string, unknown>;
      try {
        const parsedEntry = JSON.parse(await zip.files[entryName].async("string"));
        if (!parsedEntry || typeof parsedEntry !== "object" || Array.isArray(parsedEntry)) {
          throw new Error("Chapter entry must be a JSON object");
        }
        chRaw = parsedEntry as Record<string, unknown>;
      } catch {
        throw new ValidationError(`Invalid .memoria package: malformed chapter JSON (${entryName})`);
      }
      const title = typeof chRaw.title === "string" ? chRaw.title : "Untitled Chapter";
      const subtitle = typeof chRaw.subtitle === "string" ? chRaw.subtitle : null;
      const sectionTypeParsed = ChapterSectionTypeSchema.safeParse(chRaw.sectionType ?? "chapter");
      const sectionType: ChapterSectionType = sectionTypeParsed.success ? sectionTypeParsed.data : "chapter";
      const html = typeof chRaw.contentHtml === "string" ? chRaw.contentHtml : "<p></p>";
      const json =
        chRaw.contentJson && typeof chRaw.contentJson === "object" && !Array.isArray(chRaw.contentJson)
          ? (chRaw.contentJson as Record<string, unknown>)
          : undefined;
      chapters.push(buildParsedChapter(title, html, sectionType, subtitle, json));
    }

    return {
      format,
      chapters,
      warnings: [],
      bookMetadata: manifest.book,
      manuscriptMetadata: manifest.manuscript,
    };
  }

  if (format === "docx") {
    await loadSafeZip(buffer, "DOCX");
    let result: { value: string; messages: Array<{ type: string; message: string }> };
    try {
      result = await mammoth.convertToHtml({ buffer });
    } catch {
      throw new ValidationError("Invalid DOCX document: unable to parse Word OpenXML content");
    }
    const warnings = result.messages.map((m) => `${m.type}: ${m.message}`);
    const chapters = splitHtmlIntoChapters(result.value || "<p></p>", baseTitle);
    return { format, chapters, warnings };
  }

  if (format === "epub") {
    const zip = await loadSafeZip(buffer, "EPUB");
    const warnings: string[] = [];
    const xhtmlFiles = Object.keys(zip.files)
      .filter((name) => /\.(xhtml|html|htm)$/i.test(name) && !name.toLowerCase().includes("nav.xhtml"))
      .sort();
    if (xhtmlFiles.length === 0) {
      throw new ValidationError("Invalid EPUB archive: no XHTML chapter files found");
    }
    const chapters: ParsedImportChapter[] = [];
    for (let i = 0; i < xhtmlFiles.length; i += 1) {
      const raw = await zip.files[xhtmlFiles[i]].async("string");
      const titleMatch = raw.match(/<title[^>]*>(.*?)<\/title>/i) || raw.match(/<h1[^>]*>(.*?)<\/h1>/i);
      const bodyMatch = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      let bodyHtml = bodyMatch ? bodyMatch[1] : raw;
      const title = titleMatch ? stripHtmlToText(titleMatch[1]) : `Chapter ${i + 1}`;
      // Strip leading <h1> if it duplicates the extracted chapter title (prevents round-trip duplication)
      const leadingH1 = bodyHtml.match(/^\s*<h1[^>]*>([\s\S]*?)<\/h1>/i);
      if (leadingH1 && stripHtmlToText(leadingH1[1]).trim().toLowerCase() === title.trim().toLowerCase()) {
        bodyHtml = bodyHtml.slice(leadingH1[0].length).trim() || "<p></p>";
      }
      chapters.push(buildParsedChapter(title || `Chapter ${i + 1}`, bodyHtml));
    }
    return { format, chapters, warnings };
  }

  if (format === "markdown") {
    const text = buffer.toString("utf-8").replace(/\r\n/g, "\n");
    const sections = text.split(/(?=^# )/m).filter((s) => s.trim().length > 0);
    if (sections.length === 0) {
      return { format, chapters: [buildParsedChapter(baseTitle, "<p></p>")], warnings: [] };
    }
    const chapters = sections.map((sec, idx) => {
      const lines = sec.split("\n");
      const hasHeading = lines[0]?.startsWith("# ");
      const title = hasHeading ? lines[0].slice(2).trim() : idx === 0 ? baseTitle : `Chapter ${idx + 1}`;
      const body = hasHeading ? lines.slice(1).join("\n") : sec;
      return buildParsedChapter(title, markdownBodyToHtml(body));
    });
    return { format, chapters, warnings: [] };
  }

  if (format === "html") {
    const rawHtml = buffer.toString("utf-8");
    const bodyMatch = rawHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const chapters = splitHtmlIntoChapters(bodyMatch ? bodyMatch[1] : rawHtml, baseTitle);
    return { format, chapters, warnings: [] };
  }

  if (format === "txt") {
    const text = buffer.toString("utf-8").replace(/\r\n/g, "\n");
    const sections = text.split(/(?=^(?:Chapter|CHAPTER)\s+\d+[^\n]*$)/m).filter((s) => s.trim().length > 0);
    if (sections.length <= 1) {
      return {
        format,
        chapters: [buildParsedChapter(baseTitle, plainTextToHtml(text))],
        warnings: [],
      };
    }
    const chapters = sections.map((sec, idx) => {
      const lines = sec.split("\n");
      const firstLine = lines[0]?.trim() || `Chapter ${idx + 1}`;
      const body = lines.slice(1).join("\n");
      return buildParsedChapter(firstLine, plainTextToHtml(body));
    });
    return { format, chapters, warnings: [] };
  }

  if (format === "pdf") {
    const header = buffer.subarray(0, 5).toString("ascii");
    if (header !== "%PDF-") {
      throw new ValidationError("Invalid PDF file: missing %PDF- magic header");
    }
    const extracted = extractAssistedPdfText(buffer);
    const warnings = [
      "Assisted PDF extraction completed. PDF is a fixed-layout print format; please review chapter boundaries, headings, and paragraph breaks before publishing.",
    ];
    if (!extracted) {
      warnings.push(
        "No embedded plain-text stream was detected (the PDF may be scanned/image-only). An empty draft chapter was created for manual entry."
      );
    }
    return {
      format,
      chapters: [buildParsedChapter(baseTitle, plainTextToHtml(extracted || ""))],
      warnings,
    };
  }

  throw new ValidationError(`Unsupported import format: ${format}`);
}

function buildMultiPagePdfBuffer(title: string, chapters: ManuscriptChapter[]): Buffer {
  const safeAscii = (s: string) =>
    s
      .replace(/[^\x20-\x7E]/g, " ")
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");

  const lines: string[] = [title, ""];
  for (const ch of chapters) {
    lines.push(ch.title);
    const paragraphs = (ch.contentText || stripHtmlToText(ch.contentHtml))
      .split(/\n+/)
      .map((p) => p.trim())
      .filter(Boolean);
    for (const para of paragraphs) {
      const words = para.split(/\s+/).filter(Boolean);
      let current = "";
      for (const w of words) {
        if ((current + " " + w).trim().length > 78) {
          if (current.trim()) lines.push(current.trim());
          current = w;
        } else {
          current = (current + " " + w).trim();
        }
      }
      if (current.trim()) lines.push(current.trim());
      lines.push("");
    }
    lines.push("");
  }

  const LINES_PER_PAGE = 44;
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += LINES_PER_PAGE) {
    pages.push(lines.slice(i, i + LINES_PER_PAGE));
  }
  if (pages.length === 0) {
    pages.push([title]);
  }

  // Object numbering:
  // 1: Catalog
  // 2: Pages
  // 3: Font (Times-Roman)
  // For page p (0-based): pageObj = 4 + p*2, contentObj = 5 + p*2
  const pageObjNums: number[] = [];
  const pageObjects: string[] = [];

  for (let p = 0; p < pages.length; p += 1) {
    const pageObjNum = 4 + p * 2;
    const contentObjNum = 5 + p * 2;
    pageObjNums.push(pageObjNum);

    const pageLines = pages[p];
    const footerLine = `Page ${p + 1} of ${pages.length}`;
    const textCommands = [
      "BT",
      "/F1 11 Tf",
      "54 740 Td",
      "15 TL",
      ...pageLines.map((line, i) => (i === 0 ? `(${safeAscii(line)}) Tj` : `T* (${safeAscii(line)}) Tj`)),
      "ET",
      "BT",
      "/F1 9 Tf",
      "280 32 Td",
      `(${safeAscii(footerLine)}) Tj`,
      "ET",
    ].join("\n");

    pageObjects.push(
      `${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentObjNum} 0 R /Resources << /Font << /F1 3 0 R >> >> >>\nendobj\n`
    );
    pageObjects.push(
      `${contentObjNum} 0 obj\n<< /Length ${Buffer.byteLength(textCommands, "utf-8")} >>\nstream\n${textCommands}\nendstream\nendobj\n`
    );
  }

  const kidsList = pageObjNums.map((n) => `${n} 0 R`).join(" ");
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    `2 0 obj\n<< /Type /Pages /Kids [${kidsList}] /Count ${pages.length} >>\nendobj\n`,
    "3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>\nendobj\n",
    ...pageObjects,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf-8"));
    pdf += obj;
  }
  const xrefStart = Buffer.byteLength(pdf, "utf-8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(pdf, "utf-8");
}

export async function exportManuscriptArtifact(
  format: ExportFormat,
  book: {
    id: string;
    title: string;
    subtitle?: string;
    coverTitle: string;
    spineText?: string;
    coverColor: string;
    foilStamping: string;
    format: string;
  },
  manuscript: ManuscriptDocument
): Promise<ExportArtifact> {
  const safeSlug = slugifyTitle(book.title, "memoria-manuscript");
  const chapters = [...manuscript.chapters].sort((a, b) => a.sortOrder - b.sortOrder);

  if (format === "markdown") {
    const body = chapters
      .map((ch) => `# ${ch.title}\n\n${ch.contentText || stripHtmlToText(ch.contentHtml)}`)
      .join("\n\n---\n\n");
    const buffer = Buffer.from(body, "utf-8");
    return {
      format,
      fileName: `${safeSlug}.md`,
      mimeType: "text/markdown; charset=utf-8",
      buffer,
      checksumSha256: crypto.createHash("sha256").update(buffer).digest("hex"),
    };
  }

  if (format === "txt") {
    const header = `${book.title.toUpperCase()}\n${book.subtitle ? `${book.subtitle}\n` : ""}${manuscript.authorName ? `By ${manuscript.authorName}\n` : ""}\n`;
    const body = chapters
      .map((ch, idx) => `CHAPTER ${idx + 1}: ${ch.title}\n\n${ch.contentText || stripHtmlToText(ch.contentHtml)}`)
      .join("\n\n\n");
    const buffer = Buffer.from(`${header}${body}\n`, "utf-8");
    return {
      format,
      fileName: `${safeSlug}.txt`,
      mimeType: "text/plain; charset=utf-8",
      buffer,
      checksumSha256: crypto.createHash("sha256").update(buffer).digest("hex"),
    };
  }

  if (format === "html") {
    const chapterHtml = chapters
      .map(
        (ch) =>
          `<section class="chapter" data-section-type="${escapeXml(ch.sectionType)}"><h1>${escapeXml(ch.title)}</h1>${ch.subtitle ? `<p class="subtitle">${escapeXml(ch.subtitle)}</p>` : ""}${sanitizeManuscriptHtml(ch.contentHtml)}</section>`
      )
      .join("\n");
    const html = `<!DOCTYPE html>
<html lang="${escapeXml(manuscript.languageCode || "en")}">
<head>
  <meta charset="utf-8" />
  <title>${escapeXml(book.title)}</title>
  <style>
    @page { size: 6in 9in; margin: 0.85in 0.75in; }
    body { background: #F7F4EE; color: #20242C; font-family: Georgia, serif; line-height: 1.7; max-width: 42rem; margin: 0 auto; padding: 3rem 1.5rem; }
    header { text-align: center; border-bottom: 1px solid #DDD6C8; padding-bottom: 2rem; margin-bottom: 3rem; }
    h1 { color: #20242C; font-weight: 500; letter-spacing: 0.01em; }
    .subtitle { color: #76556F; font-style: italic; }
    .chapter { page-break-before: always; margin-bottom: 3rem; }
    blockquote { border-left: 3px solid #76556F; padding-left: 1rem; color: #4A515E; font-style: italic; }
  </style>
</head>
<body>
  <header>
    <h1>${escapeXml(book.title)}</h1>
    ${book.subtitle ? `<p class="subtitle">${escapeXml(book.subtitle)}</p>` : ""}
    ${manuscript.authorName ? `<p>${escapeXml(manuscript.authorName)}</p>` : ""}
  </header>
  <main>${chapterHtml}</main>
</body>
</html>`;
    const buffer = Buffer.from(html, "utf-8");
    return {
      format,
      fileName: `${safeSlug}.html`,
      mimeType: "text/html; charset=utf-8",
      buffer,
      checksumSha256: crypto.createHash("sha256").update(buffer).digest("hex"),
    };
  }

  if (format === "memoria") {
    const zip = new JSZip();
    const chaptersPayload = chapters.map((ch, idx) => ({
      orderIndex: idx,
      id: ch.id,
      sectionType: ch.sectionType,
      title: ch.title,
      subtitle: ch.subtitle ?? null,
      slug: ch.slug || slugifyTitle(ch.title, `chapter-${idx + 1}`),
      status: ch.status,
      wordCount: ch.wordCount,
      contentJson: ch.contentJson,
      contentHtml: ch.contentHtml,
      contentText: ch.contentText,
    }));
    const canonicalJson = JSON.stringify(chaptersPayload);
    const contentChecksum = crypto.createHash("sha256").update(canonicalJson).digest("hex");

    const manifest = {
      packageFormat: "memoria-author-studio" as const,
      schemaVersion: manuscript.schemaVersion || "1.0.0",
      exportedAt: new Date().toISOString(),
      book: {
        title: book.title,
        subtitle: book.subtitle,
        coverTitle: book.coverTitle,
        spineText: book.spineText,
        coverColor: book.coverColor,
        foilStamping: book.foilStamping,
        format: book.format,
      },
      manuscript: {
        trimSize: manuscript.trimSize,
        typographyPreset: manuscript.typographyPreset,
        themePreset: manuscript.themePreset,
        languageCode: manuscript.languageCode,
        authorName: manuscript.authorName,
        dedication: manuscript.dedication,
        epigraph: manuscript.epigraph,
      },
      chapterCount: chapters.length,
      totalWordCount: manuscript.totalWordCount,
      checksumSha256: contentChecksum,
    };

    zip.file("manifest.json", JSON.stringify(manifest, null, 2));
    zip.file("manuscript.json", JSON.stringify(manuscript, null, 2));
    for (let i = 0; i < chaptersPayload.length; i += 1) {
      const num = String(i + 1).padStart(3, "0");
      zip.file(`chapters/${num}-${chaptersPayload[i].slug}.json`, JSON.stringify(chaptersPayload[i], null, 2));
    }

    const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    return {
      format,
      fileName: `${safeSlug}.memoria`,
      mimeType: "application/vnd.memoria.book+zip",
      buffer,
      checksumSha256: crypto.createHash("sha256").update(buffer).digest("hex"),
    };
  }

  if (format === "epub") {
    const zip = new JSZip();
    // EPUB 3.3 specification requires uncompressed mimetype as first entry
    zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
    zip.file(
      "META-INF/container.xml",
      `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
    );

    const manifestItems: string[] = [
      `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
      `<item id="css" href="styles.css" media-type="text/css"/>`,
    ];
    const spineItems: string[] = [];
    const navLinks: string[] = [];

    zip.file(
      "OEBPS/styles.css",
      `body { font-family: Georgia, serif; color: #20242C; background: #F7F4EE; line-height: 1.65; } h1 { color: #20242C; }`
    );

    for (let i = 0; i < chapters.length; i += 1) {
      const ch = chapters[i];
      const id = `ch${i + 1}`;
      const href = `chapter-${String(i + 1).padStart(3, "0")}.xhtml`;
      manifestItems.push(`<item id="${id}" href="${href}" media-type="application/xhtml+xml"/>`);
      spineItems.push(`<itemref idref="${id}"/>`);
      navLinks.push(`<li><a href="${href}">${escapeXml(ch.title)}</a></li>`);

      const safeBody = sanitizeManuscriptHtml(ch.contentHtml).replace(/<br\s*\/?>/gi, "<br />").replace(/<hr\s*\/?>/gi, "<hr />");
      zip.file(
        `OEBPS/${href}`,
        `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="${escapeXml(manuscript.languageCode || "en")}">
<head><title>${escapeXml(ch.title)}</title><link rel="stylesheet" type="text/css" href="styles.css"/></head>
<body><h1>${escapeXml(ch.title)}</h1>${safeBody}</body>
</html>`
      );
    }

    zip.file(
      "OEBPS/nav.xhtml",
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Table of Contents</title></head>
<body><nav epub:type="toc"><h1>${escapeXml(book.title)}</h1><ol>${navLinks.join("")}</ol></nav></body>
</html>`
    );

    const modifiedIso = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    zip.file(
      "OEBPS/content.opf",
      `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">urn:uuid:${escapeXml(book.id)}</dc:identifier>
    <dc:title>${escapeXml(book.title)}</dc:title>
    <dc:creator>${escapeXml(manuscript.authorName || "Memoria Author")}</dc:creator>
    <dc:language>${escapeXml(manuscript.languageCode || "en")}</dc:language>
    <meta property="dcterms:modified">${modifiedIso}</meta>
  </metadata>
  <manifest>${manifestItems.join("\n    ")}</manifest>
  <spine>${spineItems.join("\n    ")}</spine>
</package>`
    );

    const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    return {
      format,
      fileName: `${safeSlug}.epub`,
      mimeType: "application/epub+zip",
      buffer,
      checksumSha256: crypto.createHash("sha256").update(buffer).digest("hex"),
    };
  }

  if (format === "docx") {
    const zip = new JSZip();
    zip.file(
      "[Content_Types].xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
    );
    zip.file(
      "_rels/.rels",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
    );

    const paragraphsXml: string[] = [];
    for (const ch of chapters) {
      paragraphsXml.push(
        `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t xml:space="preserve">${escapeXml(ch.title)}</w:t></w:r></w:p>`
      );
      const textParagraphs = (ch.contentText || stripHtmlToText(ch.contentHtml))
        .split(/\n+/)
        .map((p) => p.trim())
        .filter(Boolean);
      for (const p of textParagraphs) {
        paragraphsXml.push(
          `<w:p><w:r><w:t xml:space="preserve">${escapeXml(p)}</w:t></w:r></w:p>`
        );
      }
    }

    zip.file(
      "word/document.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphsXml.join("\n    ")}
    <w:sectPr/>
  </w:body>
</w:document>`
    );

    const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    return {
      format,
      fileName: `${safeSlug}.docx`,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      buffer,
      checksumSha256: crypto.createHash("sha256").update(buffer).digest("hex"),
    };
  }

  if (format === "pdf") {
    const buffer = buildMultiPagePdfBuffer(book.title, chapters);
    return {
      format,
      fileName: `${safeSlug}.pdf`,
      mimeType: "application/pdf",
      buffer,
      checksumSha256: crypto.createHash("sha256").update(buffer).digest("hex"),
    };
  }

  throw new ValidationError(`Unsupported export format: ${format}`);
}
