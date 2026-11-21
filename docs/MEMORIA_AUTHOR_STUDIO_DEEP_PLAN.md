# Memoria Author Studio — Deep Product, Experience, 3D, Visual Design & Free Technology Plan

**Product**: Memoria — *Your memories, made timeless.*  
**Surface**: Web/PWA (`/author`, with legacy `/studio` compatibility redirect)  
**Design System**: Living Archive — Light Mode Only  
**Budget Policy**: Strict $0 Open-Source / Cardless Local-First Stack  

---

## Part I — Product Vision & Architectural Pillars

Memoria Author Studio unifies long-form heirloom manuscript authoring, Memory Archive curation, real-time 3D Book Theater proofing, and archival print/digital publishing into a single browser-native studio. All existing platform surfaces (`/admin`, Memory Archive, Media Library, Circles, Billing, Orders, Export) remain first-class and fully preserved.

### Core Principles
1. **Single Semantic Manuscript Source of Truth**: Chapters, sections, front/back matter, typography, trim size, and cover bindings live in a structured schema (`book_manuscripts`, `book_chapters`, `book_revisions`, `book_editor_state`) that powers both 2D proof layouts and the 3D Book Theater.
2. **Zero Silent Data Loss**: Every edit is persisted immediately to IndexedDB (`memoria_author_studio_v1` v2), including full book shells and chapter drafts, enabling cold offline reloads without falling back to a guest sandbox.
3. **Truthful Preflight & Immutable Editions**: Print preflight never fabricates green checks. Every check reports a measured status (`pass`, `warning`, `fail`, or `not_checked`) with actionable Jump-to-Fix navigation, and freezing an edition seals full cryptographic hashes across manuscript, chapters, assets, theme, and 3D renderer version.
4. **Zero-Budget Open-Source Stack**: TipTap/ProseMirror, Three.js / React Three Fiber, Mammoth.js, JSZip, Sharp, Node `zlib`, PostgreSQL, Fastify, and Next.js — zero paid SaaS or card-gated services.

---

## Part II — Core Authoring Workflows & Screen Specifications

### AS-01: Project Shelf
- **Continue Where You Left Off**: Prominent resume card displaying the active or most recently edited project, chapter count, total word count, and one-click resume into the exact last environment and chapter.
- **Project Directory**: Searchable project shelf with Grid/List toggle and status filters (`All`, `Draft`, `Frozen`, `Archived`).
- **Quick Actions**: Open project, Duplicate project (clones book, manuscript, chapters, and spreads), Export `.memoria` lossless backup package, and Archive/Unarchive.

### AS-02: Guided New Project Setup
- Guided creation drawer capturing:
  - **Title** & **Subtitle**
  - **Author Name** & **Language** (`en`, `es`, `fr`, `de`, `it`, `ja`)
  - **Genre** (`Memoir`, `Family Chronicle`, `Literary Novel`, `Letters & Poetry`, `Illustrated History`, `Recipes & Anthology`)
  - **Layout Mode**: `Flowing Manuscript`, `Designed Pages`, or `Hybrid`
  - **Starter Genre Theme** & **Hardcover Trim Format**
- Persists both book metadata (`POST /api/v1/books`) and semantic manuscript configuration (`PATCH /api/v1/books/:id/manuscript`).

### AS-11: Full 2D Proof Viewer
- Paginated 2D archival proof sheet displaying trim boundaries, 3mm bleed guide, and 12mm safe inner margin.
- Direct **Jump to Source** navigation from any proof page/chapter directly into the corresponding chapter in the `Write` environment.

### AS-13: Publish Environment & Truthful Preflight
- Displays measured preflight checks with explicit states:
  - `Pass` (`#5F735E` Botanical Sage)
  - `Warning` (Warm Amber)
  - `Fail` (Crimson)
  - `Not checked` (`#8D857A` Muted Stone — used whenever binary verification cannot be performed, e.g., raster image bytes unavailable on disk)
- Every non-passing check provides a **Jump to Fix** action targeting the exact environment (`write`, `design`, `preview`), chapter ID, or spread index.

### AS-14: Re-Import Diff & Merge Preview
- Non-destructive dry-run endpoint (`POST /api/v1/books/:id/manuscript/import/preview`) parses incoming `.memoria`, `.docx`, `.epub`, `.md`, `.html`, `.txt`, or `.pdf` files and compares incoming chapters against the current manuscript.
- Classifies every chapter as `unchanged`, `added`, `removed`, or `modified` with word-count deltas before the author commits the merge.
- Automatic pre-import revision checkpoint is always recorded before mutation.

### AS-22: Version Compare & Restore
- Revision comparison endpoint (`GET /api/v1/books/:id/manuscript/revisions/:revisionId/compare`) diffs any saved revision snapshot against the live manuscript.
- Authors inspect added, removed, modified, and unchanged chapters before confirming a transactional restore.

---

## Part III — Durable Offline Continuation & PDF FlateDecode Extraction

### Offline Project Shell Caching (`author-offline-db.ts`)
- IndexedDB stores:
  - `chapter_drafts`: Per-chapter dirty drafts with `pendingSync` flag.
  - `resume_checkpoints`: Per-book environment, chapter, cursor, and scroll state.
  - `project_shells`: Cached `BookDTO` + `ManuscriptDocumentDTO` shells keyed by `bookId`.
- On cold offline reload (`navigator.onLine === false` or unreachable API), Author Studio recovers the author's cached real project shell and overlays any pending offline chapter drafts rather than dropping into the guest sandbox.

### Assisted PDF Extraction (`author-studio-io.ts`)
- `extractAssistedPdfText` inspects PDF `stream ... endstream` blocks, detects `/FlateDecode` filters, safely decompresses streams via `node:zlib` (`inflateSync` / `inflateRawSync`) under a strict memory ceiling, and extracts text from `Tj` / `TJ` operators alongside uncompressed parenthesized literals.

---

## Part IV — Visual Design & Living Archive Light-Mode Palette

Strict Light Mode Only — no dark-mode inversions:
- **Canvas Ivory**: `#F7F4EE`
- **Archival Ink**: `#20242C`
- **Muted Plum (Primary Accent)**: `#76556F`
- **Soft Sage (Secondary Accent)**: `#849483`
- **Deep Charcoal**: `#28272A`
- **Warm Parchment Border**: `#E7E2DA`
- **Botanical Success**: `#5F735E`
- **Stone Muted Text**: `#8D857A`

Typography pairs editorial display serifs (`Cormorant Garamond` / `Playfair Display`) with long-form reading serifs (`Newsreader` / `Georgia`) and clean UI sans (`Inter`).

---

## Part V — 3D Book Theater Anatomy & Texture Memory Management

Upgrades to `ExperienceCanvas.tsx` and `packages/contracts/src/book-3d.ts`:
1. **Physical Book Anatomy**:
   - Subtle sculpted **raised spine bands** (5 archival cords along the spine).
   - Woven **top and bottom cloth headbands** (endbands) anchored at the head and tail of the textblock spine.
   - Configurable **Page Edge Finish**: `Natural` (matte cotton rag), `Gilded` (24k metallic gold leaf), and `Deckled` (rough-cut archival edge).
2. **Material Modes**:
   - **Full-Grain Leather**: Vegetable-tanned morocco normal/roughness maps with subtle clearcoat and sheen.
   - **Bookcloth Linen**: High-roughness matte woven cloth surface with softer sheen and zero glossy clearcoat.
3. **Revision-Keyed Page Textures & Bounded LRU Cache**:
   - Spread page `CanvasTexture` instances are cached in a bounded LRU map (max 12 textures) keyed by revision/content fingerprint.
   - Evicted textures and unmount textures are deterministically `.dispose()`d to prevent WebGL memory leaks.
   - Real user manuscripts (`bookId !== "sample"`) never display fake "The Bennett Heritage" sample prose.

---

## Part VI — Free Open-Source Technology Stack ($0 Budget)

| Layer | Technology | License / Cost |
| :--- | :--- | :--- |
| Rich Text Editor | TipTap / ProseMirror | MIT / $0 |
| 3D Book Theater | Three.js, React Three Fiber, Drei | MIT / $0 |
| Document I/O | Mammoth.js, JSZip, Node `zlib` | BSD/MIT / $0 |
| Image Measurement | Sharp (libvips) | Apache-2.0 / $0 |
| Offline Storage | Browser IndexedDB + Service Worker | Web Standard / $0 |
| Backend & DB | Fastify, PostgreSQL, Zod, LocalDiskStorage | MIT/PG / $0 |

---

## Part VII — Truthful Measured Print Preflight

`evaluateBookPreflight` in `services/book-service/src/server.ts` evaluates:
1. **Title & Author Metadata**: Validates cover title length (2–80 chars; `fail` otherwise) and author attribution (`warning` if blank).
2. **Manuscript Chapter Completeness**: Inspects actual manuscript chapters; flags empty chapters (0 words) as `fail` with `targetChapterId` for Jump-to-Fix.
3. **Media Asset References**: Detects missing/empty image references on spreads (`fail`).
4. **Image Resolution & Effective DPI**: Measures real pixel dimensions via `sharp` when source media is on local disk (or explicit pixel/DPI metadata), computing effective DPI against physical trim dimensions (`< 200 DPI` = `fail`, `200–299 DPI` = `warning`, `>= 300 DPI` = `pass`). When placed images exist but source binaries cannot be inspected, reports explicit `not_checked` rather than faking green.
5. **Trim, Bleed & Gutter Geometry**: Verifies all layout elements remain within printable bounds and reports trim dimensions, 3mm bleed, and gutter clearance.

---

## Part VIII — Immutable Edition Snapshots

Freezing an edition (`POST /api/v1/books/:id/freeze`) computes and persists:
- `manuscriptHash`: SHA-256 of manuscript metadata & settings
- `chaptersHash`: SHA-256 of ordered chapter contents
- `assetsHash`: SHA-256 of referenced media IDs and spread elements
- `themeHash`: SHA-256 of trim size, typography, theme, cover color, and foil stamping
- `rendererVersion`: `CANONICAL_BOOK_3D_MANIFEST.version`
- `editionHash`: Master SHA-256 binding all component hashes and book version

---

## Part IX–XII — Quality Gates, Testing & Verification

Every change must pass:
1. `pnpm run check:quality` — zero `console.*` calls, zero empty `catch` blocks.
2. `pnpm build` — clean TypeScript compilation across all workspaces + Next.js production build.
3. `NODE_ENV=test pnpm test` — full backend & unit regression suite including measured preflight, FlateDecode PDF extraction, re-import diff preview, revision compare, and 3D contract tests.
4. `tests/e2e/web-pwa-e2e.test.ts` — Web PWA SSR verification.
5. `tests/e2e/playwright-browser-e2e.test.ts` — live Chromium Playwright E2E covering Author Studio, Project Shelf, Guided Setup, Re-Import Diff, Preflight, 3D Material/Edge controls, and all existing platform flows.
