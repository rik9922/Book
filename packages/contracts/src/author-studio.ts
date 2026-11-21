import { z } from "zod";

// ==========================================
// MEMORIA AUTHOR STUDIO — SEMANTIC MANUSCRIPT CONTRACTS
// ==========================================

export const AuthorEnvironmentSchema = z.enum([
  "write",
  "structure",
  "design",
  "preview",
  "publish",
]);
export type AuthorEnvironment = z.infer<typeof AuthorEnvironmentSchema>;

export const ChapterSectionTypeSchema = z.enum([
  "front_matter",
  "part",
  "chapter",
  "epilogue",
  "back_matter",
]);
export type ChapterSectionType = z.infer<typeof ChapterSectionTypeSchema>;

export const ChapterStatusSchema = z.enum(["draft", "revised", "final"]);
export type ChapterStatus = z.infer<typeof ChapterStatusSchema>;

export const TrimSizeSchema = z.enum([
  "5x8_pocket",
  "5.5x8.5_digest",
  "6x9_trade",
  "8x10_heirloom",
  "8.5x11_archival",
]);
export type TrimSize = z.infer<typeof TrimSizeSchema>;

export const TypographyPresetSchema = z.enum([
  "living_archive_serif",
  "editorial_classic",
  "modern_memoir",
  "poetic_wide",
]);
export type TypographyPreset = z.infer<typeof TypographyPresetSchema>;

export const ImportFormatSchema = z.enum([
  "memoria",
  "docx",
  "markdown",
  "txt",
  "html",
  "epub",
  "pdf",
]);
export type ImportFormat = z.infer<typeof ImportFormatSchema>;

export const ExportFormatSchema = z.enum([
  "memoria",
  "docx",
  "epub",
  "html",
  "markdown",
  "txt",
  "pdf",
]);
export type ExportFormat = z.infer<typeof ExportFormatSchema>;

export const MergeStrategySchema = z.enum([
  "append",
  "replace",
  "merge_by_title",
]);
export type MergeStrategy = z.infer<typeof MergeStrategySchema>;

export const ManuscriptChapterSchema = z.object({
  id: z.string().uuid(),
  bookId: z.string().uuid(),
  parentId: z.string().uuid().nullable().optional(),
  sectionType: ChapterSectionTypeSchema.default("chapter"),
  title: z.string().min(1).max(255),
  subtitle: z.string().max(255).nullable().optional(),
  slug: z.string().max(255).default(""),
  sortOrder: z.number().int().min(0).default(0),
  contentJson: z.record(z.string(), z.unknown()).default({
    type: "doc",
    content: [{ type: "paragraph" }],
  }),
  contentHtml: z.string().default("<p></p>"),
  contentText: z.string().default(""),
  wordCount: z.number().int().min(0).default(0),
  status: ChapterStatusSchema.default("draft"),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ManuscriptChapter = z.infer<typeof ManuscriptChapterSchema>;

export const ManuscriptDocumentSchema = z.object({
  id: z.string().uuid(),
  bookId: z.string().uuid(),
  spaceId: z.string().uuid(),
  schemaVersion: z.string().default("1.0.0"),
  trimSize: TrimSizeSchema.default("6x9_trade"),
  typographyPreset: TypographyPresetSchema.default("living_archive_serif"),
  themePreset: z.string().default("living_archive_ivory"),
  languageCode: z.string().default("en"),
  authorName: z.string().default(""),
  dedication: z.string().default(""),
  epigraph: z.string().default(""),
  metadata: z.record(z.string(), z.unknown()).default({}),
  totalWordCount: z.number().int().min(0).default(0),
  chapters: z.array(ManuscriptChapterSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ManuscriptDocument = z.infer<typeof ManuscriptDocumentSchema>;

export const BookRevisionSchema = z.object({
  id: z.string().uuid(),
  bookId: z.string().uuid(),
  createdBy: z.string().uuid(),
  label: z.string().min(1).max(255),
  sourceType: z.enum(["manual", "autosave", "import", "publish"]).default("manual"),
  wordCount: z.number().int().min(0).default(0),
  checksumSha256: z.string(),
  createdAt: z.string(),
});
export type BookRevision = z.infer<typeof BookRevisionSchema>;

export const BookEditorStateSchema = z.object({
  bookId: z.string().uuid(),
  userId: z.string().uuid(),
  activeEnvironment: AuthorEnvironmentSchema.default("write"),
  activeChapterId: z.string().uuid().nullable().optional(),
  cursorOffset: z.number().int().min(0).default(0),
  scrollOffset: z.number().int().min(0).default(0),
  panelState: z.record(z.string(), z.unknown()).default({}),
  updatedAt: z.string(),
});
export type BookEditorState = z.infer<typeof BookEditorStateSchema>;

export const MemoriaPackageManifestSchema = z.object({
  packageFormat: z.literal("memoria-author-studio"),
  schemaVersion: z.string().default("1.0.0"),
  exportedAt: z.string(),
  book: z.object({
    title: z.string().min(1),
    subtitle: z.string().optional(),
    coverTitle: z.string().optional(),
    spineText: z.string().optional(),
    coverColor: z.string().optional(),
    foilStamping: z.string().optional(),
    format: z.string().optional(),
  }),
  manuscript: z.object({
    trimSize: TrimSizeSchema.default("6x9_trade"),
    typographyPreset: TypographyPresetSchema.default("living_archive_serif"),
    themePreset: z.string().default("living_archive_ivory"),
    languageCode: z.string().default("en"),
    authorName: z.string().default(""),
    dedication: z.string().default(""),
    epigraph: z.string().default(""),
  }),
  chapterCount: z.number().int().min(0),
  totalWordCount: z.number().int().min(0),
  checksumSha256: z.string(),
});
export type MemoriaPackageManifest = z.infer<typeof MemoriaPackageManifestSchema>;

export const AUTHOR_STUDIO_TRIM_SIZES: Array<{
  id: TrimSize;
  label: string;
  dimensions: string;
  description: string;
}> = [
  { id: "5x8_pocket", label: "Pocket Edition", dimensions: '5" × 8"', description: "Intimate poetry & short essays" },
  { id: "5.5x8.5_digest", label: "Digest Memoir", dimensions: '5.5" × 8.5"', description: "Classic personal narrative" },
  { id: "6x9_trade", label: "Trade Hardcover", dimensions: '6" × 9"', description: "Standard literary nonfiction & novels" },
  { id: "8x10_heirloom", label: "Heirloom Illustrated", dimensions: '8" × 10"', description: "Family chronicles with photographs" },
  { id: "8.5x11_archival", label: "Archival Folio", dimensions: '8.5" × 11"', description: "Large-format legacy & genealogy volumes" },
];

export const AUTHOR_STUDIO_TYPOGRAPHY_PRESETS: Array<{
  id: TypographyPreset;
  label: string;
  bodyFont: string;
  headingFont: string;
  description: string;
}> = [
  {
    id: "living_archive_serif",
    label: "Living Archive Serif",
    bodyFont: "Georgia, 'Newsreader', serif",
    headingFont: "'Cormorant Garamond', Georgia, serif",
    description: "Warm editorial serif tuned for long-form heirloom reading",
  },
  {
    id: "editorial_classic",
    label: "Editorial Classic",
    bodyFont: "'Palatino Linotype', 'Book Antiqua', Palatino, serif",
    headingFont: "'Playfair Display', Georgia, serif",
    description: "Balanced literary proportions with generous leading",
  },
  {
    id: "modern_memoir",
    label: "Modern Memoir",
    bodyFont: "'Inter', system-ui, sans-serif",
    headingFont: "'Cormorant Garamond', Georgia, serif",
    description: "Clean humanist body with serif chapter openers",
  },
  {
    id: "poetic_wide",
    label: "Poetic Wide",
    bodyFont: "'Garamond', Georgia, serif",
    headingFont: "'Cormorant Garamond', Georgia, serif",
    description: "Airy margins and gentle rhythm for letters & verse",
  },
];
