# Memoria Author Studio — Product, Architecture, Import/Export & Web-PWA-Only Blueprint

**Document type:** Product and technical blueprint  
**Product:** Memoria — *Your memories, made timeless.*  
**Feature:** Author Studio / Professional Book Creation Studio  
**Status:** Approved & In Active Implementation  
**Research date:** 21 November 2026  
**Repository baseline:** `rik9922/Book`, branch `main`  
**Platform decision:** Web PWA + existing Admin Panel (`/admin`) only  
**Native application decision:** Native mobile apps (`apps/ios`) retired and removed; no native Android client will be developed  
**Operating constraint:** Zero-budget / no paid APIs / no card-gated infrastructure; self-hosted and permissively licensed open-source technologies only

---

## 1. Platform & Product Direction

- **Memoria Author Studio (`/author`)** is the single unified book-creation and book-design studio inside the **Memoria Web PWA** (`apps/web`), linked from `/`, `/dashboard`, `/spaces`, `/collections`, and `/sample-book`. The legacy standalone Photo Memory Books editor at `/studio` is retired and replaced by a compatibility redirect to `/author` preserving `bookId`, `spaceId`, and `tab`/`env` query parameters. Photo-Led Memory Books remain supported as a first-class book category inside Author Studio with Memory Archive curation and non-lossy spread composition.
- **Admin Panel Preservation**: The existing Admin Panel (`/admin`) and all 11 admin sections remain strictly preserved and untouched in scope.
- **Web-PWA-Only Client Architecture**: Native iOS (`apps/ios`), iOS-only package scripts, and the macOS Xcode/Swift CI job (`ios-swift-tests`) are retired and removed after dependency verification. Web 3D GLB assets (`apps/web/public/models/`), shared `@memory-capsule/*` contracts, and all Fastify microservices are preserved.

## 2. Unified Author Canvas (5 Environments)

Built on a semantic **`ManuscriptDocument`** model alongside the existing spread-based **`BookDocument`**:

1. **Write** — Distraction-free rich-text chapter editor powered by **Tiptap open-source core** (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-placeholder`, `@tiptap/extension-character-count`) on ProseMirror, with autosave, word count, section/chapter navigation, and IndexedDB offline draft persistence.
2. **Structure** — Front matter, chapters, parts, epilogue/back matter ordering, chapter creation/rename/reorder/delete, and manuscript word-count & pacing outline.
3. **Design & Format** — Living Archive typography & layout presets, trim size, paper stock, cloth/leather cover swatch, foil treatment, and spine/cover inscription.
4. **Preview / Book Theater** — Real manuscript chapters and spreads rendered directly into the existing **Web 3D Book Theater** (Three.js / R3F) with interactive page turning, material controls, and live manuscript pagination.
5. **Publish** — Immutable edition snapshots, revision history & restore, preflight checks, and multi-format export pipeline.

## 3. Canonical Data Model & Schema (`018_author_studio_manuscript_schema.sql`)

Additive PostgreSQL migration extending `book_db` without breaking existing `books`, `book_spreads`, or `book_editions`:

- `book_manuscripts`: One-to-one semantic manuscript metadata per book (`id`, `book_id`, `space_id`, `schema_version`, `trim_size`, `typography_preset`, `theme_preset`, `metadata_json`, `total_word_count`, `created_at`, `updated_at`).
- `book_chapters`: Ordered semantic manuscript sections (`id`, `book_id`, `parent_id`, `section_type` [`front_matter`, `part`, `chapter`, `epilogue`, `back_matter`], `title`, `subtitle`, `slug`, `order_index`, `content_json` [ProseMirror/Tiptap JSON], `content_html`, `content_text`, `word_count`, `status`, `created_at`, `updated_at`).
- `book_revisions`: Immutable version snapshots for restore and audit (`id`, `book_id`, `created_by`, `label`, `source_type` [`manual`, `autosave`, `import`, `publish`], `snapshot_json`, `word_count`, `checksum_sha256`, `created_at`).
- `book_editor_state`: Exact per-user resume checkpoint (`book_id`, `user_id`, `active_environment`, `active_chapter_id`, `cursor_offset`, `scroll_offset`, `panel_state_json`, `updated_at`).
- `book_import_jobs` & `book_export_jobs`: Auditable import/export records with format, status, warnings, checksums, and storage keys.

## 4. Import / Resume / Re-Import / Export Pipeline

### Import & Resume
- **`.memoria` Native Package** (ZIP containing `manifest.json`, `manuscript.json`, `chapters/*.json`, and optional `assets/`): Lossless full round-trip import/re-import/merge.
- **DOCX** (via `mammoth`, BSD-2-Clause): Converts Word documents into clean semantic HTML/ProseMirror chapters with heading-based chapter splitting.
- **Markdown (`.md`) & Plain Text (`.txt`)**: Deterministic chapter/heading splitting and paragraph normalization.
- **HTML (`.html`)**: Sanitized semantic import stripping scripts, event handlers, and unsafe URLs.
- **EPUB 3 (`.epub`)**: Safe zip extraction (zip-slip & decompression bomb guarded) reading OPF spine & XHTML chapters.
- **Assisted PDF Extraction (`.pdf`)**: Text extraction with explicit structural warnings when layout fidelity cannot be guaranteed.
- **Exact Resume**: Opening a book restores `book_editor_state` (active environment, chapter, cursor/scroll position) with IndexedDB offline fallback and sync reconciliation.

### Export Pipeline
- **`.memoria`** lossless editable archive (ZIP)
- **HTML** print-ready semantic HTML5 document with Living Archive CSS
- **Markdown (`.md`)** clean structured manuscript
- **Plain Text (`.txt`)** clean prose manuscript
- **EPUB 3.3 (`.epub`)** standards-compliant ZIP (`mimetype` uncompressed first, `META-INF/container.xml`, `OEBPS/content.opf`, `OEBPS/nav.xhtml`, chapter XHTML files)
- **DOCX (`.docx`)** valid OpenXML WordprocessingML package
- **PDF** via browser print / Paged.js print stylesheet or Playwright headless print export

## 5. Security & Zero-Budget Compliance

- **Strict Upload Validation**: Magic-byte verification, file size ceilings, ZIP path-traversal (zip-slip) rejection, decompression ratio & uncompressed size caps, and strict HTML sanitization (no `<script>`, `<iframe>`, `on*` handlers, or `javascript:` URLs).
- **Space & Book Authorization**: Every manuscript, chapter, revision, resume, import, and export route enforces JWT authentication and space membership/ownership isolation (zero BOLA/IDOR).
- **Living Archive Light Mode Only**: All Author Studio UI adheres strictly to `#F7F4EE` (Ivory), `#20242C` (Ink), `#76556F` (Plum), and `#849483` (Sage).
- **Zero-Budget Permissive OSS**: MIT / BSD / Apache-2.0 libraries only (`@tiptap/*`, `mammoth`, `jszip`, `zod`, `three`). No paid APIs or card-gated services.
