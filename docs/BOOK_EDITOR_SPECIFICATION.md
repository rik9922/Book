# Memoria Author Studio & Non-Lossy Spread Editor Specification

## 1. Consolidated 5-Environment Studio Anatomy (`/author`)

All book authoring and spread design in Memoria is consolidated into **Memoria Author Studio** (`/author`; legacy `/studio` redirects to `/author` preserving book IDs and query parameters):

1. **Write** — Distraction-free Tiptap/ProseMirror multi-chapter manuscript editor with binder navigation and IndexedDB offline autosave.
2. **Structure** — Chapter/section architecture plus **Memory Curation ("Add from Memory Archive")** to compile photographs and stories into chronological spreads.
3. **Design & Format** — Book category selector (including Photo-Led Memory Books), trim size, Living Archive typography presets, cover title, spine inscription, leather/cloth swatches, and foil stamping.
4. **Book Theater** — Expansive 7/5 workstation pairing the live WebGL **3D Book Theater** (`ExperienceCanvas` / `AccessibleSpreadReader`) with a **Non-Lossy Spread Composer** that updates headings, captions, templates, and image focal points while preserving all existing placed images and elements.
5. **Publish** — Real automated print preflight validation, 2D proof summary, edition freeze & clone, multi-format import/export (`.memoria`, DOCX, EPUB 3.3, PDF, HTML, MD, TXT), immutable revisions, and print order checkout.

