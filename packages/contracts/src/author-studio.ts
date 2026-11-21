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

export const LayoutModeSchema = z.enum([
  "flowing_manuscript",
  "designed_pages",
  "hybrid",
]);
export type LayoutMode = z.infer<typeof LayoutModeSchema>;

export const BookGenreSchema = z.enum([
  "memoir",
  "family_chronicle",
  "novel",
  "poetry_letters",
  "illustrated_history",
  "cookbook_anthology",
]);
export type BookGenre = z.infer<typeof BookGenreSchema>;

export const PreflightCheckStatusSchema = z.enum([
  "pass",
  "warning",
  "fail",
  "not_checked",
]);
export type PreflightCheckStatus = z.infer<typeof PreflightCheckStatusSchema>;

export const PreflightCheckItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: PreflightCheckStatusSchema,
  passed: z.boolean(),
  detail: z.string(),
  measuredValue: z.string().optional(),
  targetEnvironment: AuthorEnvironmentSchema.optional(),
  targetChapterId: z.string().optional(),
  targetSpreadIndex: z.number().int().min(0).optional(),
});
export type PreflightCheckItem = z.infer<typeof PreflightCheckItemSchema>;

export const ImportDiffStatusSchema = z.enum([
  "unchanged",
  "added",
  "removed",
  "modified",
]);
export type ImportDiffStatus = z.infer<typeof ImportDiffStatusSchema>;

export const ImportDiffChapterSchema = z.object({
  title: z.string(),
  status: ImportDiffStatusSchema,
  existingChapterId: z.string().optional(),
  existingWordCount: z.number().int().min(0).default(0),
  incomingWordCount: z.number().int().min(0).default(0),
  wordDelta: z.number().int().default(0),
  existingExcerpt: z.string().default(""),
  incomingExcerpt: z.string().default(""),
});
export type ImportDiffChapter = z.infer<typeof ImportDiffChapterSchema>;

export const ImportDiffPreviewSchema = z.object({
  format: ImportFormatSchema,
  fileName: z.string(),
  mergeStrategy: MergeStrategySchema,
  summary: z.object({
    unchanged: z.number().int().min(0),
    added: z.number().int().min(0),
    removed: z.number().int().min(0),
    modified: z.number().int().min(0),
  }),
  chapters: z.array(ImportDiffChapterSchema),
  warnings: z.array(z.string()).default([]),
});
export type ImportDiffPreview = z.infer<typeof ImportDiffPreviewSchema>;

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

export const AUTHOR_STUDIO_LAYOUT_MODES: Array<{
  id: LayoutMode;
  label: string;
  description: string;
}> = [
  {
    id: "flowing_manuscript",
    label: "Flowing Manuscript",
    description: "Continuous prose reflowing automatically across trim sizes & EPUB",
  },
  {
    id: "designed_pages",
    label: "Designed Pages",
    description: "Curated visual spreads with fixed photography & focal-point framing",
  },
  {
    id: "hybrid",
    label: "Hybrid Heirloom",
    description: "Long-form narrative chapters paired with illustrated photo plates",
  },
];

export const AUTHOR_STUDIO_GENRES: Array<{
  id: BookGenre;
  label: string;
  starterTheme: string;
  defaultTrimSize: TrimSize;
  defaultTypography: TypographyPreset;
  defaultLayoutMode: LayoutMode;
  description: string;
}> = [
  {
    id: "memoir",
    label: "Personal Memoir",
    starterTheme: "living_archive_ivory",
    defaultTrimSize: "6x9_trade",
    defaultTypography: "living_archive_serif",
    defaultLayoutMode: "flowing_manuscript",
    description: "First-person reflections, milestones, and life chapters",
  },
  {
    id: "family_chronicle",
    label: "Family Chronicle",
    starterTheme: "botanical_sage_folio",
    defaultTrimSize: "8x10_heirloom",
    defaultTypography: "editorial_classic",
    defaultLayoutMode: "hybrid",
    description: "Multi-generational stories paired with archival photographs",
  },
  {
    id: "novel",
    label: "Literary Novel",
    starterTheme: "classic_linen_press",
    defaultTrimSize: "6x9_trade",
    defaultTypography: "editorial_classic",
    defaultLayoutMode: "flowing_manuscript",
    description: "Structured parts, chapters, and distraction-free prose",
  },
  {
    id: "poetry_letters",
    label: "Letters & Poetry",
    starterTheme: "plum_correspondence",
    defaultTrimSize: "5x8_pocket",
    defaultTypography: "poetic_wide",
    defaultLayoutMode: "flowing_manuscript",
    description: "Airy verse, handwritten transcriptions, and epistolary notes",
  },
  {
    id: "illustrated_history",
    label: "Illustrated History",
    starterTheme: "archival_gallery_folio",
    defaultTrimSize: "8.5x11_archival",
    defaultTypography: "modern_memoir",
    defaultLayoutMode: "designed_pages",
    description: "Photo-led plates, captions, and curated visual timelines",
  },
  {
    id: "cookbook_anthology",
    label: "Recipes & Anthology",
    starterTheme: "hearth_kitchen_linen",
    defaultTrimSize: "8x10_heirloom",
    defaultTypography: "modern_memoir",
    defaultLayoutMode: "hybrid",
    description: "Heirloom family recipes, handwritten margin notes, and dishes",
  },
];
