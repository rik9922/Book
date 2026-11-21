# Product Requirements Document (PRD) — Memory Capsule / Book

## 1. Executive Summary & Vision

Memory Capsule is a premier, privacy-first cross-platform ecosystem designed for the lifelong preservation of meaningful family and personal memories. The platform transcends basic photo-sharing and generic photobooks by integrating:
1. **Multi-Format Memory Archive**: Preserving photographs, multi-angle albums, 4K video clips, high-fidelity audio/voice recordings, oral history transcriptions, handwritten stories, and historical documents.
2. **Multi-Generational Collaboration**: Private-by-default memory spaces with fine-grained RBAC (Owner, Editor, Contributor, Viewer) for extended families, close friends, and milestone celebrations.
3. **Memoria Author Studio (`/author`)**: The single unified book-creation and book-design studio supporting manuscripts, Photo-Led Memory Books (via Memory Archive curation), non-lossy spread composition, cover/foil/leather binding design, Tiptap rich-text editing, lossless import/export, and immutable revision history. Legacy `/studio` links redirect seamlessly to `/author`.
4. **Photorealistic Interactive 3D Book Theater (Web PWA)**: Articulated Three.js / React Three Fiber 3D book model simulating authentic materials (cloth, linen, leather, textured paper stock, gold/silver/rose foil stamping) and physical page-curl mechanics. Native iOS apps are retired.
5. **Physical Print Publishing Engine**: Real automated print preflight verification (cover die bounds, spread/element count, printable page margin bounds, 300+ DPI image checks) and immutable edition freeze for production fulfillment.

---

## 2. Platform Core Pillars

### Pillar 1: Absolute Privacy & Heritage Protection
- All memories and family spaces are strictly private by default.
- Family content (especially featuring children and elders) is never mined, crawled, or used for public AI training without explicit consent.
- Media URLs are ephemeral and signed; direct-to-storage uploads bypass server bottlenecks.

### Pillar 2: $0 Cost & Cardless Infrastructure
- The entire development and initial self-hosted deployment operates under an absolute $0 financial budget with zero requirement for credit cards or billing methods.
- Local filesystem storage driver, local PostgreSQL, local NATS JetStream, and local Redis ensure total independence from proprietary cloud lock-in.

### Pillar 3: Single Canonical Book Document Model
- The 2D editor, the 3D WebGL reader, the native iOS RealityKit viewport, and the print preflight engine share the exact same canonical JSON document model. No disconnected styling or divergent layouts.

---

## 3. User Personas

1. **The Family Archivist (Elena, 42)**: Curates 3 generations of family photographs, audio interviews of grandparents, and milestones for her two children. Needs robust organization by person/pet profile, collaborative invites for siblings, and high-quality printed keepsakes.
2. **The Milestone Celebrator (Marcus & Sophia, 29)**: Preparing a wedding and travel book. Wants interactive 3D digital sharing with guests followed by a luxurious hardcover edition with gold foil debossing.
3. **The Heritage Contributor (David, 68)**: Records voice notes and oral stories using native iOS quick capture, easily attaching reflections to old scanned black-and-white family photographs.

