# MEMORIA — MASTER PRODUCT SCREEN SPECIFICATIONS

**Official Product Name**: **Memoria**  
**Official Product Tagline**: *Your memories, made timeless.*  
**Document Version**: 2.0.0 (Production Master Reference)  
**Generated Timestamp**: 2026-11-10T03:47:29.469Z  
**Total Canonical Screens**: **164 Screens** (82 Web/PWA, 56 Native iOS, 26 Admin Portal)  
**Architectural Governance**: Sections 2 and 10 of the Memoria Master Engineering Directive  

---

## EXECUTIVE ARCHITECTURE & DESIGN GOVERNANCE

This document establishes the exhaustive, binding single source of truth for all user-facing, native mobile, and administrative surfaces of the **Memoria** heirloom preservation platform.

### 1. Brand Identity & Visual Language
- **Design Philosophy**: Archival heirloom warmth, timeless editorial restraint, Cormorant Garamond headings, Inter body typography, subtle gold leaf foil embossing.
- **Strict Light Mode Only**: Zero dark mode. All screens are grounded on Warm Ivory canvas (`brand.ivory #F7F4EE`) with Deep Archival Ink (`brand.ink #20242C`), Heritage Plum (`brand.plum #76556F`), Forest Sage (`brand.sage #849483`), and Warm Ochre (`brand.ochre #D8973C`).
- **WCAG 2.2 AA Compliance**: Universal 44x44 pt/px touch targets, full VoiceOver/Screen Reader label coverage, and contrast ratios >= 7.2:1 for typography.

### 2. Strict Zero-Budget & Data Sovereignty Policy ($0 Budget, Cardless)
- **Cardless Infrastructure**: Zero dependencies on credit card-gated cloud services. Cloudflare R2 is explicitly prohibited unless verified cardless.
- **Local-First Storage**: Media files, thumbnails, and book models reside in local filesystem storage via `LocalDiskStorageDriver` (`storage/local/`).
- **Strict 500 MB Free Quota**: Storage quotas are strictly monitored per space with atomic pre-allocation checks and lossless WebP/AVIF derivative generation.

### 3. Hybrid Distributed Communication Architecture
- **Public Gateway**: RESTful HTTP/2 API Gateway with Zod input validation and JWT Bearer authorization.
- **Internal Inter-Service**: High-throughput gRPC channels with Protobuf contracts between microservices.
- **Asynchronous Messaging**: NATS JetStream distributed event bus for domain events.
- **Background Job Queues**: BullMQ workers backed by Redis for image processing, OCR, PDF generation, and email dispatch.
- **Transactional Outbox Pattern**: Multi-entity mutations stage events atomically in PostgreSQL `outbox_events` table before publication.

---

## TABLE OF CONTENTS

- [PART 1: WEB & PROGRESSIVE WEB APP (PWA-01 to PWA-82)](#part-1-web--progressive-web-app-pwa-01-to-pwa-82)
  - [1.1 Public Experience (PWA-01 to PWA-07)](#11-public-experience-pwa-01-to-pwa-07)
  - [1.2 Authentication & Onboarding (PWA-08 to PWA-18)](#12-authentication--onboarding-pwa-08-to-pwa-18)
  - [1.3 Home, Spaces, People & Collections (PWA-19 to PWA-32)](#13-home-spaces-people--collections-pwa-19-to-pwa-32)
  - [1.4 Memory Archive & Management (PWA-33 to PWA-48)](#14-memory-archive--management-pwa-33-to-pwa-48)
  - [1.5 Collaboration & Sharing (PWA-49 to PWA-55)](#15-collaboration--sharing-pwa-49-to-pwa-55)
  - [1.6 Book Creation & 3D Studio (PWA-56 to PWA-70)](#16-book-creation--3d-studio-pwa-56-to-pwa-70)
  - [1.7 Physical Book Commerce & Fulfillment (PWA-71 to PWA-76)](#17-physical-book-commerce--fulfillment-pwa-71-to-pwa-76)
  - [1.8 Account & Support (PWA-77 to PWA-82)](#18-account--support-pwa-77-to-pwa-82)
- [PART 2: NATIVE IOS EXPERIENCES (IOS-01 to IOS-56)](#part-2-native-ios-experiences-ios-01-to-ios-56)
  - [2.1 Native iOS Authentication & Onboarding (IOS-01 to IOS-10)](#21-native-ios-authentication--onboarding-ios-01-to-ios-10)
  - [2.2 Native iOS Home & Navigation (IOS-11 to IOS-16)](#22-native-ios-home--navigation-ios-11-to-ios-16)
  - [2.3 Native iOS Capture & Uploads (IOS-17 to IOS-22)](#23-native-ios-capture--uploads-ios-17-to-ios-22)
  - [2.4 Native iOS Memory Browsing & Management (IOS-23 to IOS-34)](#24-native-ios-memory-browsing--management-ios-23-to-ios-34)
  - [2.5 Native iOS Profiles & Collaboration (IOS-35 to IOS-42)](#25-native-ios-profiles--collaboration-ios-35-to-ios-42)
  - [2.6 Native iOS Books & Publishing (IOS-43 to IOS-51)](#26-native-ios-books--publishing-ios-43-to-ios-51)
  - [2.7 Native iOS Commerce & Account (IOS-52 to IOS-56)](#27-native-ios-commerce--account-ios-52-to-ios-56)
- [PART 3: ADMINISTRATIVE PORTAL (ADMIN-01 to ADMIN-26)](#part-3-administrative-portal-admin-01-to-admin-26)
  - [3.1 Platform & User Administration (ADMIN-01 to ADMIN-05)](#31-platform--user-administration-admin-01-to-admin-05)
  - [3.2 Content Moderation & Safety (ADMIN-06 to ADMIN-07)](#32-content-moderation--safety-admin-06-to-admin-07)
  - [3.3 Storage & Media Infrastructure (ADMIN-08 to ADMIN-10)](#33-storage--media-infrastructure-admin-08-to-admin-10)
  - [3.4 Background Processing & Engine Telemetry (ADMIN-11 to ADMIN-15)](#34-background-processing--engine-telemetry-admin-11-to-admin-15)
  - [3.5 Physical Print & Commerce Operations (ADMIN-16 to ADMIN-21)](#35-physical-print--commerce-operations-admin-16-to-admin-21)
  - [3.6 System Governance, Security & Audit (ADMIN-22 to ADMIN-26)](#36-system-governance-security--audit-admin-22-to-admin-26)
- [PART 4: MASTER TRACEABILITY MATRIX (ALL 164 SCREENS)](#part-4-master-traceability-matrix-all-164-screens)

---

## PART 1: WEB & PROGRESSIVE WEB APP (PWA-01 to PWA-82)

### 1.1 Public Experience (PWA-01 to PWA-07)

### PWA-01 — Landing & Heirloom Discovery Page

**Category**: Web & PWA — Public Experience  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Discover the Memoria heirloom preservation philosophy, view the interactive 3D memory book teaser, and begin preservation journey.
- **User Story**: "As an archival storyteller or family historian, I want to explore Memoria's core capabilities and open a live 3D book preview so that I can understand how our memories will be preserved."

#### 2. Navigation & Routing
- **Entry Routes**: `/`, `/home`, `/welcome`
- **Exit Routes**: `/register`, `/login`, `/how-it-works`, `/sample-book`, `/gallery`
- **Back Navigation**: `/`
- **Deep Link**: `https://memoria.local/`

#### 3. Personas & Authorization
- **Eligible Roles**: Anonymous Visitor, Authenticated Member
- **Required Capabilities**: `view_public_landing`, `interact_3d_teaser`
- **Authentication Required**: No (Public / Unauthenticated Access Allowed)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Brand header with logo, navigation links (How it Works, Gallery, Pricing, Help), and Sign In / Start Archiving CTA.
- **Main Content**: Hero section with headline 'Your memories, made timeless', interactive 3D WebGL book teaser, feature pillars (Archive, Collaborate, 3D Studio, Print), trust pledges.
- **Footer / Actions Bar**: Zero-budget self-hosting notice, privacy manifesto, documentation links, copyright.

#### 5. Interactive Controls & UI Elements
- Hero primary CTA: 'Start Your Archive' (Button)
- Hero secondary CTA: 'Explore 3D Book' (Button)
- Interactive 3D Book canvas with drag-to-orbit and click-to-open hinge gesture
- Feature carousel navigation dots and arrow buttons
- Header Sign In link button
- Footer documentation anchor links

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Skip to main content link`
- **Tab Sequence**: `Header navigation` -> `Hero primary button` -> `Hero secondary button` -> `3D Canvas interactive toggle` -> `Feature cards` -> `Footer`
- **Escape Key Action**: Resets 3D teaser rotation to resting hero pose

#### 8. States Matrix
- **Loading State**: Warm ivory skeleton placeholder with soft pulse on hero banner and canvas placeholder.
- **Empty State**: N/A (static marketing and real WebGL canvas)
- **Populated State**: Fully loaded 3D WebGL book canvas with emerald/gold foil cover, typography in Cormorant Garamond and Inter, responsive layout.
- **Error State**: WebGL failure fallback banner: displays high-resolution static photographic spread of the heirloom book with accessible 2D turn buttons.
- **Offline Mode**: Service Worker served cached landing assets; offline badge banner indicating local browsing.
- **Permission Denied**: N/A

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Landing page announcing Memoria brand, main navigation, interactive 3D book preview with accessible description, and call to action."
- **Touch Target Minimum**: `48x48 px minimum for all links and buttons`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1 (Deep Ink #20242C on Warm Ivory #F7F4EE)`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Single column stacked hero, 3D canvas height clamped to 280px with touch orbit enabled, collapsed hamburger menu.
- **Tablet (768px – 1024px)**: Two column hero with 3D canvas right-aligned (420px height), horizontal feature grid.
- **Desktop (> 1024px)**: Max-width 1280px container, cinematic two-column hero with high-framerate 3D R3F canvas, expansive typography.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/public/featured-teaser`
- **Authorization**: `None`
- **Response Payload**: `{ success: true, data: { featuredBookTitle: string, pageCount: number, coverColor: string } }`
- **Status Codes**: `200 OK`, `500 Internal Server Error`

#### 13. Service Architecture & Persistence
- **Backend Service**: `api-gateway / static web shell`
- **Database Tables**: `books (cached read)`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `public.landing_viewed`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `None`
- **Security Audit Logged**: No
- **Privacy Architecture**: Zero third-party trackers, zero advertising pixels, zero telemetry cookies.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] renders brand headline and tagline correctly
  - [ ] initializes WebGL canvas and fallback gracefully
- **Integration Tests**:
  - [ ] GET /api/public/featured-teaser returns 200 with schema validation
- **End-to-End Acceptance Tests**:
  - [ ] visitor visits /, clicks Start Your Archive, navigates to /register

#### 17. UI Component Inventory
`HeroSection`, `ExperienceCanvas`, `FeatureCards`, `PublicHeader`, `PublicFooter`

---

### PWA-02 — How Memoria Works — 4-Stage Preservation Flow

**Category**: Web & PWA — Public Experience  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Understand the end-to-end preservation lifecycle: Archive → Collaborate → Author → Print.
- **User Story**: "As a prospective archivist, I want to inspect each stage of Memoria's workflow so I know how our physical and digital memories will be converted into books."

#### 2. Navigation & Routing
- **Entry Routes**: `/`, `/how-it-works`
- **Exit Routes**: `/register`, `/sample-book`, `/pricing`
- **Back Navigation**: `/`
- **Deep Link**: `https://memoria.local/how-it-works`

#### 3. Personas & Authorization
- **Eligible Roles**: Anonymous Visitor, Member
- **Required Capabilities**: `view_public_content`
- **Authentication Required**: No (Public / Unauthenticated Access Allowed)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Public navigation header with active state on 'How it Works'.
- **Main Content**: Interactive stage stepper: 1. Preserving Originals (Lossless + SHA-256), 2. Family Collaboration & Storytelling, 3. 3D Book Layout & Fine Leather Binding, 4. Fine-Art Archival Print Fulfillment.
- **Footer / Actions Bar**: CTAs: 'Begin Preserving' and 'View Sample Edition'.

#### 5. Interactive Controls & UI Elements
- Stage tab switcher (Archive, Collaborate, Author, Print)
- Step media viewer with sample high-resolution zoom
- Interactive diagram showing direct-to-disk local storage architecture
- CTA Button 'Create Free Memory Space'

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Main stage stepper heading`
- **Tab Sequence**: `Stage tabs` -> `Step detail cards` -> `Next stage button` -> `Footer CTA`
- **Escape Key Action**: None

#### 8. States Matrix
- **Loading State**: Content skeleton cards with step progression bar.
- **Empty State**: N/A
- **Populated State**: High-contrast visual cards with typography, live diagram animations, and step breakdown.
- **Error State**: Error banner with retry reload action.
- **Offline Mode**: Service worker cached view accessible completely offline.
- **Permission Denied**: N/A

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Explains four stages of preservation with step-by-step headings and audio descriptions."
- **Touch Target Minimum**: `48x48 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1 (Deep Ink #20242C on Warm Ivory #F7F4EE)`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Vertical timeline card sequence with swipe gesture support.
- **Tablet (768px – 1024px)**: 2x2 grid of preservation stages with step connection badges.
- **Desktop (> 1024px)**: Horizontal multi-step stepper with animated workflow connector lines.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `N/A` `N/A (Static page)`
- **Authorization**: `None`
- **Response Payload**: `N/A`
- **Status Codes**: `200 OK`

#### 13. Service Architecture & Persistence
- **Backend Service**: `web`
- **Database Tables**: _None (Stateless / InMemory)_
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: _None_
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `None`
- **Security Audit Logged**: No
- **Privacy Architecture**: Public educational page.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] renders all 4 stages correctly
  - [ ] switches active stage on tab click
- **Integration Tests**:
  - [ ] page loads without console warnings or layout shifts
- **End-to-End Acceptance Tests**:
  - [ ] navigates from / to /how-it-works and tests tab clicks

#### 17. UI Component Inventory
`WorkflowStepper`, `StageCard`, `ArchivalDiagram`, `PublicHeader`

---

### PWA-03 — Use Cases & Heirloom Scenarios

**Category**: Web & PWA — Public Experience  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Explore targeted memory capsule use cases: Children milestones, Family heritage, Weddings, Memorials, Pets, and Journeys.
- **User Story**: "As a parent or grandchild, I want to view realistic examples of my specific memory scenario so I can envision the final keepsake book."

#### 2. Navigation & Routing
- **Entry Routes**: `/`, `/use-cases`
- **Exit Routes**: `/register`, `/gallery`, `/use-cases/:slug`
- **Back Navigation**: `/`
- **Deep Link**: `https://memoria.local/use-cases`

#### 3. Personas & Authorization
- **Eligible Roles**: Anonymous Visitor, Member
- **Required Capabilities**: `view_public_content`
- **Authentication Required**: No (Public / Unauthenticated Access Allowed)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Public navigation header with secondary breadcrumb.
- **Main Content**: Category filter pills (All, Childhood, Heritage, Weddings, Memorials, Pets), use case cards with sample photographs and excerpt stories.
- **Footer / Actions Bar**: CTA banner: 'Craft Your Family Edition'.

#### 5. Interactive Controls & UI Elements
- Filter chip selector (Childhood, Heritage, Wedding, Memorial, Pet)
- Card CTA: 'Inspect Sample Book'
- Card CTA: 'Start with this Template'

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First filter chip`
- **Tab Sequence**: `Filter chips` -> `Use case cards` -> `Card CTA buttons` -> `Footer`
- **Escape Key Action**: Clears active filters

#### 8. States Matrix
- **Loading State**: 6-card grid skeleton pulse.
- **Empty State**: Clear message if filter produces no matches with reset button.
- **Populated State**: Curated cards with archival photo previews, milestone timeline examples, and sample layouts.
- **Error State**: Error banner with refresh button.
- **Offline Mode**: Cached use case directory available offline.
- **Permission Denied**: N/A

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Use case gallery listing memory preservation scenarios with filter pills."
- **Touch Target Minimum**: `44x44 px for filter chips`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Single column card list with horizontal scrolling filter bar.
- **Tablet (768px – 1024px)**: Two column card grid.
- **Desktop (> 1024px)**: Three column balanced grid with subtle hover depth.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `N/A` `N/A`
- **Authorization**: `None`
- **Response Payload**: `N/A`
- **Status Codes**: `200 OK`

#### 13. Service Architecture & Persistence
- **Backend Service**: `web`
- **Database Tables**: _None (Stateless / InMemory)_
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: _None_
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `None`
- **Security Audit Logged**: No
- **Privacy Architecture**: Only licensed and synthetic public sample data.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] filters cards according to selected category
  - [ ] displays appropriate badges
- **Integration Tests**:
  - [ ] renders all 6 canonical categories
- **End-to-End Acceptance Tests**:
  - [ ] visitor filters by Childhood and clicks Start with Template

#### 17. UI Component Inventory
`FilterChipBar`, `UseCaseCard`, `PublicHeader`

---

### PWA-04 — Public Heirloom Book Gallery

**Category**: Web & PWA — Public Experience  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Browse published open-access heirloom editions, examine cover designs, and view community spread inspirations.
- **User Story**: "As an archivist seeking inspiration, I want to browse public memory books so I can evaluate typography and layout options."

#### 2. Navigation & Routing
- **Entry Routes**: `/`, `/gallery`
- **Exit Routes**: `/sample-book/:bookId`, `/register`, `/bookshelf`
- **Back Navigation**: `/`
- **Deep Link**: `https://memoria.local/gallery`

#### 3. Personas & Authorization
- **Eligible Roles**: Anonymous Visitor, Member
- **Required Capabilities**: `view_public_gallery`
- **Authentication Required**: No (Public / Unauthenticated Access Allowed)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Gallery navigation bar with search input and format filters (8x8, 8x10, 12x12).
- **Main Content**: Curated masonry grid of 3D book covers with foil accents, page counts, and creator attributions.
- **Footer / Actions Bar**: Standard public footer.

#### 5. Interactive Controls & UI Elements
- Format filter dropdown (Square 8x8, Standard 8x10, Grand 12x12)
- Book cover card click (opens 3D Reader)
- Quick spread inspection preview popover

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Gallery search bar`
- **Tab Sequence**: `Search bar` -> `Format filter` -> `Gallery cards` -> `Pagination`
- **Escape Key Action**: Closes spread preview popover

#### 8. States Matrix
- **Loading State**: Ivory book card skeleton placeholders with shimmering cover badges.
- **Empty State**: No public books found notice with suggestion to reset search criteria.
- **Populated State**: Rich grid of books featuring realistic cover cloth colors (Forest #304C43, Plum #76556F, Ink #20242C).
- **Error State**: Unable to load gallery notice with retry button.
- **Offline Mode**: Cached gallery items presented with offline indicator.
- **Permission Denied**: N/A

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Public book gallery displaying published heirloom editions with book title, page count, and format."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Single column book cover list with swipeable cover cards.
- **Tablet (768px – 1024px)**: Two column grid with hover foil elevation.
- **Desktop (> 1024px)**: Three or four column grid with smooth 3D cover tilt on pointer movement.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/public/books`
- **Authorization**: `None`
- **Response Payload**: `{ success: true, data: { items: Array<BookSummary>, total: number } }`
- **Status Codes**: `200 OK`, `500 Internal Server Error`

#### 13. Service Architecture & Persistence
- **Backend Service**: `book-service / api-gateway`
- **Database Tables**: `books`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `public.gallery_browsed`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `None`
- **Security Audit Logged**: No
- **Privacy Architecture**: Only books marked with explicit public consent are exposed.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] parses book format query filters correctly
  - [ ] renders cover badges
- **Integration Tests**:
  - [ ] GET /api/public/books returns only public editions
- **End-to-End Acceptance Tests**:
  - [ ] browses gallery, filters by format, clicks on sample book

#### 17. UI Component Inventory
`GalleryGrid`, `BookCoverPreview`, `FormatFilter`, `PublicHeader`

---

### PWA-05 — Interactive Sample 3D Book Experience

**Category**: Web & PWA — Public Experience  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Interact with a full 3D simulation of an heirloom memory book: open the front cover, turn pages with realistic curl, inspect spine flex.
- **User Story**: "As an archivist evaluating physical print fidelity, I want to interact with a realistic 3D book model on the web so I can verify page transitions and cover debossing."

#### 2. Navigation & Routing
- **Entry Routes**: `/`, `/sample-book`, `/gallery`
- **Exit Routes**: `/register`, `/gallery`, `/book-studio`
- **Back Navigation**: `/gallery`
- **Deep Link**: `https://memoria.local/sample-book`

#### 3. Personas & Authorization
- **Eligible Roles**: Anonymous Visitor, Member
- **Required Capabilities**: `interact_3d_engine`
- **Authentication Required**: No (Public / Unauthenticated Access Allowed)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Top minimal HUD: Book title, current spread indicator (e.g. 'Cover', 'Pages 4–5 of 48'), close button.
- **Main Content**: Full-viewport 3D WebGL Three.js canvas featuring articulated leather cover, spine flex, and turning pages.
- **Footer / Actions Bar**: Bottom floating HUD: Open Cover button, Previous Page, Next Page, Reset View, 2D Flat Proof Toggle, Fullscreen.

#### 5. Interactive Controls & UI Elements
- Open/Close Cover Toggle Button
- Next Spread Button (Right Arrow / Touch drag)
- Previous Spread Button (Left Arrow / Touch drag)
- Orbit / Pan / Zoom pointer drag controls
- Reset Camera View Button
- 2D Accessible Fallback Toggle Button
- Fullscreen Toggle Button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Open Cover Button in floating HUD`
- **Tab Sequence**: `Top HUD back` -> `Floating bottom controls (Prev, Open, Next, Reset, 2D)`
- **Keyboard Shortcuts**: `ArrowRight (Next Page)`, `ArrowLeft (Previous Page)`, `Space (Toggle Cover)`, `KeyR (Reset Camera)`, `Escape (Exit Fullscreen)`
- **Escape Key Action**: Exits fullscreen mode or closes reader

#### 8. States Matrix
- **Loading State**: Archival loading spinner with percentage texture download indicator.
- **Empty State**: N/A (Loads canonical sample edition 'The Henderson Chronicle 1948–2024').
- **Populated State**: Interactive 60 FPS WebGL scene with PBR lighting, leather micro-texture, and foil reflections.
- **Error State**: WebGL context lost or unsupported banner: switches automatically to high-resolution 2D spread viewer.
- **Offline Mode**: Service worker caches sample book GLTF model and textures for offline exploration.
- **Permission Denied**: N/A

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Interactive 3D book viewer. Announcing current spread number, page captions, and keyboard shortcuts."
- **Touch Target Minimum**: `48x48 px floating action buttons`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `8.5:1 (HUD buttons over canvas)`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Touch swipe gestures to turn pages; camera constrained to fixed reading cradle angle.
- **Tablet (768px – 1024px)**: Full touch orbit and pinch-to-zoom allowed, side navigation chevrons.
- **Desktop (> 1024px)**: Mouse drag orbit, scroll wheel zoom, full screen studio lighting mode.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/public/sample-book-model`
- **Authorization**: `None`
- **Response Payload**: `{ success: true, data: { modelUrl: string, title: string, spreads: Array<BookSpread> } }`
- **Status Codes**: `200 OK`, `404 Not Found`

#### 13. Service Architecture & Persistence
- **Backend Service**: `book-service / 3D Asset Pipeline`
- **Database Tables**: `books`, `book_spreads`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `3d.sample_reader_engaged`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `None`
- **Security Audit Logged**: No
- **Privacy Architecture**: Demo archival content only.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] handles page turn state transitions from spread 0 to N
  - [ ] activates 2D fallback on WebGL failure
- **Integration Tests**:
  - [ ] loads sample book document schema and validates spread elements
- **End-to-End Acceptance Tests**:
  - [ ] opens 3D viewer, turns 3 pages, clicks reset camera, toggles 2D proof

#### 17. UI Component Inventory
`ExperienceCanvas`, `ReaderHUD`, `PageTurnController`, `FlatProofFallback`

---

### PWA-06 — Zero-Cost Principles & Storage Transparency

**Category**: Web & PWA — Public Experience  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Understand Memoria's strict $0 budget self-hosting model, local-first storage architecture, and data sovereignty pledge.
- **User Story**: "As an privacy-conscious archivist, I want to review how Memoria ensures my data is stored locally without card-gated services or hidden costs."

#### 2. Navigation & Routing
- **Entry Routes**: `/`, `/pricing`, `/transparency`
- **Exit Routes**: `/register`, `/docs/self-hosting`, `/faq`
- **Back Navigation**: `/`
- **Deep Link**: `https://memoria.local/transparency`

#### 3. Personas & Authorization
- **Eligible Roles**: Anonymous Visitor, Member
- **Required Capabilities**: `view_public_content`
- **Authentication Required**: No (Public / Unauthenticated Access Allowed)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Standard public header with active 'Transparency' link.
- **Main Content**: Philosophy statement: 'Zero Card-Gated Features. Zero Cloud Lock-in.' Side-by-side comparison of local disk storage vs cloud vendors, breakdown of optional physical print at-cost pricing.
- **Footer / Actions Bar**: Self-hosting guide link and GitHub repository button.

#### 5. Interactive Controls & UI Elements
- Storage Calculator Widget (estimate local disk requirements based on photo/video count)
- Download Docker Compose / Architecture Blueprint Button
- CTA: 'Deploy Your Archive Locally'

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Storage calculator inputs`
- **Tab Sequence**: `Storage calculator sliders` -> `Blueprint button` -> `CTA Button`
- **Escape Key Action**: None

#### 8. States Matrix
- **Loading State**: Skeleton text and calculator widget loading state.
- **Empty State**: N/A
- **Populated State**: Interactive storage math showing 10,000 photos ~ 45 GB local storage with automatic thumb derivatives.
- **Error State**: Error banner with refresh link.
- **Offline Mode**: Fully available offline.
- **Permission Denied**: N/A

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Storage transparency page detailing zero-cost principles and local storage calculator."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Stacked calculator cards and simplified storage breakdown.
- **Tablet (768px – 1024px)**: Two-column comparison layout.
- **Desktop (> 1024px)**: Comprehensive 3-tier architecture breakdown with interactive sliders.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `N/A` `N/A (Static page)`
- **Authorization**: `None`
- **Response Payload**: `N/A`
- **Status Codes**: `200 OK`

#### 13. Service Architecture & Persistence
- **Backend Service**: `web`
- **Database Tables**: _None (Stateless / InMemory)_
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: _None_
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `None`
- **Security Audit Logged**: No
- **Privacy Architecture**: Public transparency pledge.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] calculates storage estimates correctly for given photo/video counts
- **Integration Tests**:
  - [ ] renders comparison matrix without styling anomalies
- **End-to-End Acceptance Tests**:
  - [ ] adjusts storage sliders and verifies computed disk consumption

#### 17. UI Component Inventory
`StorageCalculator`, `TransparencyMatrix`, `PublicHeader`

---

### PWA-07 — FAQ, Community Guides & Support Center

**Category**: Web & PWA — Public Experience  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Search answers to common archival questions, learn how to scan physical photos, and submit a support ticket.
- **User Story**: "As an archivist scanning grandmother's photo albums, I want to read scanning DPI recommendations and submit questions if I encounter issues."

#### 2. Navigation & Routing
- **Entry Routes**: `/`, `/faq`, `/support`
- **Exit Routes**: `/register`, `/docs/scanning`, `/contact-success`
- **Back Navigation**: `/`
- **Deep Link**: `https://memoria.local/faq`

#### 3. Personas & Authorization
- **Eligible Roles**: Anonymous Visitor, Member
- **Required Capabilities**: `view_faq`, `submit_support_inquiry`
- **Authentication Required**: No (Public / Unauthenticated Access Allowed)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Public navigation header with search input.
- **Main Content**: Accordion FAQ sections (Scanning & Media, 3D Book Layouts, Printing & Binding, Data Sovereignty, Troubleshooting), followed by a validated Support Inquiry Form.
- **Footer / Actions Bar**: Direct email contact and community links.

#### 5. Interactive Controls & UI Elements
- FAQ category filter chips
- Accordion expand/collapse headers
- Search FAQ input field
- Support Form Submit Button

#### 6. Form Validation & Data Schema

| Field Name | Data Type | Required | Limits & Constraints | Validation Rule | Error Copy |
|---|---|---|---|---|---|
| `name` | `text` | **Yes** | 2-80 chars | Standard type validation | Please provide your name. |
| `email` | `email` | **Yes** | 5-120 chars | Standard type validation | Please provide a valid email address. |
| `category` | `select` | **Yes** | N/A | Standard type validation | Please select an inquiry topic. |
| `message` | `textarea` | **Yes** | 10-2000 chars | Standard type validation | Inquiry must be between 10 and 2000 characters. |

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `FAQ search input`
- **Tab Sequence**: `Search bar` -> `Category chips` -> `Accordion headers` -> `Contact form inputs` -> `Submit button`
- **Escape Key Action**: Collapses open accordion panel

#### 8. States Matrix
- **Loading State**: Skeleton accordion panels pulsing gently.
- **Empty State**: Notice when FAQ search yields 0 results with prompt to contact support directly.
- **Populated State**: Expanded accordions with clear typography, scanning DPI guides (600 DPI for prints, 1200 DPI for slides).
- **Error State**: Form validation inline errors or API submission failure alert.
- **Offline Mode**: FAQ content fully readable offline; form submission queues locally until reconnected.
- **Permission Denied**: N/A

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Frequently asked questions with searchable accordion sections and contact form."
- **Touch Target Minimum**: `44x44 px for accordion triggers`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Full width accordion rows with larger tap targets; stacked contact form.
- **Tablet (768px – 1024px)**: Two-column layout (FAQ left 60%, Contact Form right 40%).
- **Desktop (> 1024px)**: Max-width 1100px centered layout with sticky category sidebar.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/public/support-inquiry`
- **Authorization**: `None (Rate Limited)`
- **Request Payload**: `{ name: string, email: string, category: string, message: string }`
- **Response Payload**: `{ success: true, data: { ticketId: string, status: 'received' } }`
- **Status Codes**: `200 OK`, `400 Bad Request`, `429 Too Many Requests`

#### 13. Service Architecture & Persistence
- **Backend Service**: `api-gateway`
- **Database Tables**: `audit_logs`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `support.inquiry_submitted`
- **BullMQ Background Jobs**: `process-support-ticket`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Inquiry contact details stored strictly for support response; zero marketing reuse.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] accordion expands and collapses on keypress
  - [ ] validates email format in inquiry form
- **Integration Tests**:
  - [ ] POST /api/public/support-inquiry creates outbox event
- **End-to-End Acceptance Tests**:
  - [ ] searches FAQ, fills contact form, receives ticket confirmation

#### 17. UI Component Inventory
`FAQAccordion`, `SearchInput`, `SupportForm`, `PublicHeader`

---

### 1.2 Authentication & Onboarding (PWA-08 to PWA-18)

### PWA-08 — User Registration View

**Category**: Web & PWA — Auth & Onboarding  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Create a secure Memoria account with full name, email, password, and privacy agreement.
- **User Story**: "As a new user, I want to create my personal archivist account so that I can begin creating family memory spaces."

#### 2. Navigation & Routing
- **Entry Routes**: `/register`, `/welcome`, `/invite/:token`
- **Exit Routes**: `/onboarding/purpose`, `/verify-email`, `/login`
- **Back Navigation**: `/`
- **Deep Link**: `https://memoria.local/register`

#### 3. Personas & Authorization
- **Eligible Roles**: Anonymous Visitor
- **Required Capabilities**: `register_account`
- **Authentication Required**: No (Public / Unauthenticated Access Allowed)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Memoria logo in Deep Ink #20242C, subtitle 'Begin your family living archive'.
- **Main Content**: Registration card containing Full Name, Email, Password, Password strength indicator, Terms & Privacy consent checkbox, and Submit CTA.
- **Footer / Actions Bar**: Already have an account? Sign In link button.

#### 5. Interactive Controls & UI Elements
- Full Name input field
- Email Address input field
- Password input field with toggle visibility eye icon
- Terms & Privacy consent checkbox
- Primary Button: 'Create Your Archive' (Button)
- Sign In navigation link

#### 6. Form Validation & Data Schema

| Field Name | Data Type | Required | Limits & Constraints | Validation Rule | Error Copy |
|---|---|---|---|---|---|
| `fullName` | `text` | **Yes** | 2-100 characters | minLength: 2 | Please enter your full name. |
| `email` | `email` | **Yes** | 5-255 characters | valid RFC 5322 email | Please provide a valid email address. |
| `password` | `password` | **Yes** | Min 8 chars, 1 uppercase, 1 number | complexity check | Password must be at least 8 characters with at least one number. |
| `consent` | `checkbox` | **Yes** | N/A | must be checked | You must agree to the data preservation terms. |

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Full Name input field`
- **Tab Sequence**: `Full Name` -> `Email` -> `Password` -> `Password Toggle` -> `Terms Checkbox` -> `Submit Button` -> `Sign In Link`
- **Escape Key Action**: None

#### 8. States Matrix
- **Loading State**: Submit button spinner with text 'Creating Archive...'; form inputs disabled during submit.
- **Empty State**: Fresh form with placeholder text and focus rings.
- **Populated State**: Active input values with real-time green/red password criteria checklist.
- **Error State**: Inline red validation error below invalid inputs; banner if email already registered.
- **Offline Mode**: Offline warning banner: 'Registration requires an active local server connection.'
- **Permission Denied**: N/A

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Registration form with name, email, password fields and submission button."
- **Touch Target Minimum**: `44x44 px for input fields and buttons`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1 (Deep Ink on Warm Ivory canvas)`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Card expands to 100% viewport width with 16px margins, vertical stack.
- **Tablet (768px – 1024px)**: Centered modal card max-width 440px.
- **Desktop (> 1024px)**: Centered card max-width 480px with subtle border #E7E2DA and warm shadow.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/auth/register`
- **Authorization**: `None`
- **Request Payload**: `{ fullName: string, email: string, password: string }`
- **Response Payload**: `{ success: true, data: { user: UserProfile, accessToken: string, refreshToken: string } }`
- **Status Codes**: `201 Created`, `400 Bad Request`, `409 Conflict (Email Exists)`

#### 13. Service Architecture & Persistence
- **Backend Service**: `identity-service`
- **Database Tables**: `users`, `user_sessions`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `identity.user_registered`
- **BullMQ Background Jobs**: `send-welcome-email`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Password hashed with Argon2id; zero plaintext credentials recorded.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] validates email and password requirements in RegisterRequestSchema
  - [ ] toggles password visibility
- **Integration Tests**:
  - [ ] POST /api/auth/register creates user row and returns valid JWT
- **End-to-End Acceptance Tests**:
  - [ ] fills registration form, handles duplicate email rejection, succeeds on unique email

#### 17. UI Component Inventory
`AuthCard`, `InputField`, `PasswordStrengthMeter`, `Button`, `Checkbox`

---

### PWA-09 — User Sign-In View

**Category**: Web & PWA — Auth & Onboarding  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Authenticate into Memoria using registered email and password to access private memory spaces.
- **User Story**: "As a registered member, I want to sign in securely so I can access my spaces, books, and pending invites."

#### 2. Navigation & Routing
- **Entry Routes**: `/login`, `/register`, `/invite/:token`
- **Exit Routes**: `/dashboard`, `/onboarding/purpose`, `/forgot-password`
- **Back Navigation**: `/`
- **Deep Link**: `https://memoria.local/login`

#### 3. Personas & Authorization
- **Eligible Roles**: Anonymous Visitor
- **Required Capabilities**: `login`
- **Authentication Required**: No (Public / Unauthenticated Access Allowed)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Brand emblem with title 'Welcome Back to Memoria'.
- **Main Content**: Sign-In card containing Email Address, Password, Remember Me checkbox, Forgot Password link, and Sign In button.
- **Footer / Actions Bar**: Don't have an archive yet? Create Account link.

#### 5. Interactive Controls & UI Elements
- Email Address input field
- Password input field with visibility toggle
- Remember Me checkbox (persists 30-day session)
- Forgot Password text link
- Primary Button: 'Sign In to Memoria'
- Register new account link

#### 6. Form Validation & Data Schema

| Field Name | Data Type | Required | Limits & Constraints | Validation Rule | Error Copy |
|---|---|---|---|---|---|
| `email` | `email` | **Yes** | N/A | Standard type validation | Please enter your registered email address. |
| `password` | `password` | **Yes** | N/A | Standard type validation | Please enter your password. |

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Email Address input field`
- **Tab Sequence**: `Email` -> `Password` -> `Password Toggle` -> `Remember Me` -> `Sign In Button` -> `Forgot Password Link` -> `Register Link`
- **Escape Key Action**: None

#### 8. States Matrix
- **Loading State**: Sign In button displays spinner; fields disabled.
- **Empty State**: Clean login form with clear focus rings.
- **Populated State**: Entered credentials ready for authentication.
- **Error State**: Generic secure error banner: 'Invalid email or password combination. Please try again.'
- **Offline Mode**: Offline notification: 'You appear to be offline. Reconnecting to local Memoria instance...'
- **Permission Denied**: Account suspended notification with support contact link.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Login form with email and password fields, submit button, and account recovery options."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Full width card, 16px margins, prominent touch targets.
- **Tablet (768px – 1024px)**: Centered 440px wide card.
- **Desktop (> 1024px)**: Centered 460px card with warm ivory backdrop and subtle plum accents.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/auth/login`
- **Authorization**: `None`
- **Request Payload**: `{ email: string, password: string }`
- **Response Payload**: `{ success: true, data: { accessToken: string, refreshToken: string, user: UserProfile } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`, `429 Too Many Requests`

#### 13. Service Architecture & Persistence
- **Backend Service**: `identity-service`
- **Database Tables**: `users`, `user_sessions`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `identity.user_logged_in`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Failed login attempts rate limited; IP and user agent logged for session security.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] validates LoginRequestSchema
  - [ ] handles visibility toggle click
- **Integration Tests**:
  - [ ] POST /api/auth/login sets session cookie and returns user profile
- **End-to-End Acceptance Tests**:
  - [ ] logs in with valid test credentials, navigates to dashboard

#### 17. UI Component Inventory
`AuthCard`, `InputField`, `Button`, `Checkbox`

---

### PWA-10 — Forgot Password Recovery Request

**Category**: Web & PWA — Auth & Onboarding  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Request a secure, time-limited password reset link via registered email address.
- **User Story**: "As a member who forgot my password, I want to request a reset link so I can regain access to my family memory space."

#### 2. Navigation & Routing
- **Entry Routes**: `/login`, `/forgot-password`
- **Exit Routes**: `/login`, `/reset-password`
- **Back Navigation**: `/login`
- **Deep Link**: `https://memoria.local/forgot-password`

#### 3. Personas & Authorization
- **Eligible Roles**: Anonymous Visitor
- **Required Capabilities**: `request_password_reset`
- **Authentication Required**: No (Public / Unauthenticated Access Allowed)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Recovery title 'Reset Your Password' with explanatory caption.
- **Main Content**: Card containing Email Address field and 'Send Reset Instructions' CTA button.
- **Footer / Actions Bar**: Return to Sign In link.

#### 5. Interactive Controls & UI Elements
- Email input field
- Submit Button: 'Send Reset Link'
- Back to Sign In link button

#### 6. Form Validation & Data Schema

| Field Name | Data Type | Required | Limits & Constraints | Validation Rule | Error Copy |
|---|---|---|---|---|---|
| `email` | `email` | **Yes** | N/A | Standard type validation | Please provide your registered email. |

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Email input field`
- **Tab Sequence**: `Email` -> `Send Reset Link Button` -> `Back to Sign In Link`
- **Escape Key Action**: Returns to /login

#### 8. States Matrix
- **Loading State**: Button loading spinner with text 'Sending Instructions...'
- **Empty State**: Input awaiting email address.
- **Populated State**: Valid email entered.
- **Error State**: Rate limit notification if exceeded.
- **Offline Mode**: Offline alert banner.
- **Permission Denied**: N/A

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Password reset request view. Enter your email to receive recovery instructions."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Full width card.
- **Tablet (768px – 1024px)**: Centered 440px card.
- **Desktop (> 1024px)**: Centered 440px card.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/auth/forgot-password`
- **Authorization**: `None`
- **Request Payload**: `{ email: string }`
- **Response Payload**: `{ success: true, data: { message: 'If an account exists, instructions have been sent.' } }`
- **Status Codes**: `200 OK`, `429 Too Many Requests`

#### 13. Service Architecture & Persistence
- **Backend Service**: `identity-service`
- **Database Tables**: `users`, `user_sessions`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `identity.password_reset_requested`
- **BullMQ Background Jobs**: `send-password-reset-email`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Medium`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Privacy-preserving neutral message returned regardless of whether the email exists in the database.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] returns generic neutral message preventing email enumeration
- **Integration Tests**:
  - [ ] POST /api/auth/forgot-password enqueues reset token job
- **End-to-End Acceptance Tests**:
  - [ ] submits email and verifies neutral confirmation message

#### 17. UI Component Inventory
`AuthCard`, `InputField`, `Button`

---

### PWA-11 — Password Reset Token Verification & New Input

**Category**: Web & PWA — Auth & Onboarding  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Set a new secure password using a cryptographic verification token received via recovery email.
- **User Story**: "As an archivist with a valid recovery token, I want to set a new strong password so I can sign back in."

#### 2. Navigation & Routing
- **Entry Routes**: `/reset-password?token=:token`
- **Exit Routes**: `/login`, `/dashboard`
- **Back Navigation**: `/login`
- **Deep Link**: `https://memoria.local/reset-password?token=:token`

#### 3. Personas & Authorization
- **Eligible Roles**: Anonymous Visitor with Valid Token
- **Required Capabilities**: `reset_password`
- **Authentication Required**: No (Public / Unauthenticated Access Allowed)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Title 'Create a New Password' with security guidelines.
- **Main Content**: Card with New Password input, Confirm Password input, Strength indicator, and 'Update Password' button.
- **Footer / Actions Bar**: Cancel and return to Sign In.

#### 5. Interactive Controls & UI Elements
- New Password input field with visibility toggle
- Confirm Password input field
- Submit Button: 'Update Password & Sign In'

#### 6. Form Validation & Data Schema

| Field Name | Data Type | Required | Limits & Constraints | Validation Rule | Error Copy |
|---|---|---|---|---|---|
| `password` | `password` | **Yes** | Min 8 chars, 1 uppercase, 1 number | Standard type validation | Password does not meet minimum strength requirements. |
| `confirmPassword` | `password` | **Yes** | N/A | Standard type validation | Passwords do not match. |

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `New Password field`
- **Tab Sequence**: `New Password` -> `Confirm Password` -> `Submit Button`
- **Escape Key Action**: None

#### 8. States Matrix
- **Loading State**: Submitting new password spinner.
- **Empty State**: Fields awaiting entry.
- **Populated State**: Matching passwords entered.
- **Error State**: Token expired or invalid banner with link to request a fresh link.
- **Offline Mode**: Offline notification.
- **Permission Denied**: Token invalid alert.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Enter new password and confirmation to reset your account password."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: 100% width card.
- **Tablet (768px – 1024px)**: Centered 440px card.
- **Desktop (> 1024px)**: Centered 460px card.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/auth/reset-password`
- **Authorization**: `Token`
- **Request Payload**: `{ token: string, newPassword: string }`
- **Response Payload**: `{ success: true, data: { message: 'Password updated successfully' } }`
- **Status Codes**: `200 OK`, `400 Bad Request`, `403 Forbidden (Token Expired)`

#### 13. Service Architecture & Persistence
- **Backend Service**: `identity-service`
- **Database Tables**: `users`, `user_sessions`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `identity.password_reset_completed`
- **BullMQ Background Jobs**: `revoke-prior-sessions`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: All existing sessions invalidated immediately upon successful password change.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] validates password confirmation equality
  - [ ] rejects reused token
- **Integration Tests**:
  - [ ] POST /api/auth/reset-password hashes password and revokes previous sessions
- **End-to-End Acceptance Tests**:
  - [ ] submits valid token with new password and signs in successfully

#### 17. UI Component Inventory
`AuthCard`, `InputField`, `PasswordStrengthMeter`, `Button`

---

### PWA-12 — Email Verification Confirmation Screen

**Category**: Web & PWA — Auth & Onboarding  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Confirm email address ownership via verification link or trigger a resend if link is expired.
- **User Story**: "As a newly registered member, I want to verify my email so that I can receive collaboration invites and print notifications."

#### 2. Navigation & Routing
- **Entry Routes**: `/verify-email`, `/verify-email?token=:token`
- **Exit Routes**: `/onboarding/purpose`, `/dashboard`
- **Back Navigation**: `/login`
- **Deep Link**: `https://memoria.local/verify-email?token=:token`

#### 3. Personas & Authorization
- **Eligible Roles**: Registered User
- **Required Capabilities**: `verify_email`
- **Authentication Required**: No (Public / Unauthenticated Access Allowed)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Memoria seal with title 'Verify Your Archival Email'.
- **Main Content**: Verification status icon (Pending / Success / Expired), confirmation message, 'Resend Verification' button with 60s cooldown timer.
- **Footer / Actions Bar**: Continue to Onboarding CTA button.

#### 5. Interactive Controls & UI Elements
- Button: 'Resend Verification Email' (with active cooldown countdown)
- Button: 'Continue to Setup Your Space'

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Continue CTA button`
- **Tab Sequence**: `Resend Button` -> `Continue CTA`
- **Escape Key Action**: None

#### 8. States Matrix
- **Loading State**: Verifying token spinner.
- **Empty State**: N/A
- **Populated State**: Green checkmark with 'Email verified successfully'.
- **Error State**: Expired token banner with resend trigger.
- **Offline Mode**: Offline notification.
- **Permission Denied**: Invalid token notification.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Email verification confirmation status and resend button."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Centered card layout.
- **Tablet (768px – 1024px)**: Centered 440px card.
- **Desktop (> 1024px)**: Centered 460px card.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/auth/verify-email`
- **Authorization**: `Token`
- **Request Payload**: `{ token: string }`
- **Response Payload**: `{ success: true, data: { verified: boolean, email: string } }`
- **Status Codes**: `200 OK`, `400 Bad Request`

#### 13. Service Architecture & Persistence
- **Backend Service**: `identity-service`
- **Database Tables**: `users`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `identity.email_verified`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Verification status recorded in audit log.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] enforces 60-second resend cooldown timer
- **Integration Tests**:
  - [ ] POST /api/auth/verify-email marks user verified in database
- **End-to-End Acceptance Tests**:
  - [ ] navigates with token, verifies success state, proceeds to onboarding

#### 17. UI Component Inventory
`StatusBadge`, `Button`, `CooldownTimer`

---

### PWA-13 — Collaborative Invitation Acceptance Landing

**Category**: Web & PWA — Auth & Onboarding  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Accept a family member or editor invitation to join an existing Memory Space.
- **User Story**: "As an invited family member, I want to review the inviter's space name and assigned role so I can join the collaborative archive."

#### 2. Navigation & Routing
- **Entry Routes**: `/invite/:token`
- **Exit Routes**: `/register?invite=:token`, `/login?invite=:token`, `/spaces/:spaceId`
- **Back Navigation**: `/`
- **Deep Link**: `https://memoria.local/invite/:token`

#### 3. Personas & Authorization
- **Eligible Roles**: Anonymous Visitor, Authenticated Member
- **Required Capabilities**: `accept_invitation`
- **Authentication Required**: No (Public / Unauthenticated Access Allowed)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Brand header with space invitation emblem.
- **Main Content**: Invitation preview card: Inviter name (e.g. 'Eleanor Vance'), Memory Space title ('Vance Family Archive'), Role badge ('Contributor'), Personal note excerpt, 'Accept Invitation' button, 'Decline' button.
- **Footer / Actions Bar**: Terms of contribution note.

#### 5. Interactive Controls & UI Elements
- Button: 'Accept Invitation & Join Space'
- Secondary Button: 'Decline Invitation'
- Link: 'Sign in with a different account'

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Accept Invitation button`
- **Tab Sequence**: `Accept button` -> `Decline button` -> `Switch account link`
- **Escape Key Action**: None

#### 8. States Matrix
- **Loading State**: Fetching invitation metadata skeleton.
- **Empty State**: N/A
- **Populated State**: Inviter details, space cover thumbnail, role capabilities explanation.
- **Error State**: Invitation expired, revoked, or already accepted banner.
- **Offline Mode**: Offline notification: 'Internet connection required to join collaborative space.'
- **Permission Denied**: Token invalid alert.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Space invitation from Eleanor Vance to join Vance Family Archive as a Contributor."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Full width card.
- **Tablet (768px – 1024px)**: Centered 480px card.
- **Desktop (> 1024px)**: Centered 520px card with space cover banner.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/spaces/invitations/:token/accept`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { spaceId: string, role: string } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`, `404 Not Found`, `410 Gone (Expired)`

#### 13. Service Architecture & Persistence
- **Backend Service**: `identity-service / memory-service`
- **Database Tables**: `space_invitations`, `space_members`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `collab.invitation_accepted`
- **BullMQ Background Jobs**: `notify-space-owner`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Member addition recorded in space audit trail.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] handles unauthenticated visitor redirect to registration preserving token
- **Integration Tests**:
  - [ ] POST /api/spaces/invitations/:token/accept creates space_members row
- **End-to-End Acceptance Tests**:
  - [ ] accepts invitation, redirects to target space timeline

#### 17. UI Component Inventory
`InvitationCard`, `SpaceBadge`, `Button`

---

### PWA-14 — Purpose Selection Onboarding Wizard

**Category**: Web & PWA — Auth & Onboarding  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Select the primary purpose for the first memory archive (Family Heritage, Child Milestones, Wedding, Memorial, Travel Journey, or Personal Story).
- **User Story**: "As a new user, I want to choose my primary memory purpose so that Memoria can customize initial prompts and book themes."

#### 2. Navigation & Routing
- **Entry Routes**: `/onboarding/purpose`, `/register`
- **Exit Routes**: `/onboarding/first-space`, `/dashboard`
- **Back Navigation**: `/register`
- **Deep Link**: `https://memoria.local/onboarding/purpose`

#### 3. Personas & Authorization
- **Eligible Roles**: Authenticated Member
- **Required Capabilities**: `complete_onboarding`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Step 1 of 4 progress indicator; title 'What kind of memory archive are you creating?'.
- **Main Content**: Grid of 6 purpose cards with archival illustrations: 1. Family Heritage, 2. Childhood Milestones, 3. Wedding & Love Story, 4. Memorial & Tribute, 5. Travel & Journeys, 6. Personal Memoir.
- **Footer / Actions Bar**: Bottom bar with 'Skip for now' link and 'Continue' CTA button.

#### 5. Interactive Controls & UI Elements
- Selectable Purpose Cards (single selection radio group)
- Button: 'Continue to Space Details'
- Link: 'Skip to Dashboard'

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First purpose card (Family Heritage)`
- **Tab Sequence**: `Purpose cards 1-6` -> `Skip link` -> `Continue button`
- **Keyboard Shortcuts**: `ArrowRight (Next card)`, `ArrowLeft (Prev card)`, `Space (Select card)`
- **Escape Key Action**: None

#### 8. States Matrix
- **Loading State**: Purpose card skeletons.
- **Empty State**: N/A
- **Populated State**: 6 cards with selected state indicated by Plum #76556F border and subtle checkmark badge.
- **Error State**: Selection error banner if submit attempted without picking a card.
- **Offline Mode**: Available offline in local session.
- **Permission Denied**: Redirect to login if unauthenticated.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Purpose selection wizard step 1. Radio group of 6 archive types."
- **Touch Target Minimum**: `48x48 px card targets`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Single column vertical list of cards.
- **Tablet (768px – 1024px)**: 2 column grid.
- **Desktop (> 1024px)**: 3 column balanced grid.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `PATCH` `/api/users/me/onboarding`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ purpose: 'family' | 'childhood' | 'wedding' | 'memorial' | 'journey' | 'personal' }`
- **Response Payload**: `{ success: true, data: { step: 'first-space', purpose: string } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `identity-service`
- **Database Tables**: `users`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `onboarding.purpose_selected`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `None`
- **Security Audit Logged**: No
- **Privacy Architecture**: Stored as user preference.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] selects card on click and keyboard arrow navigation
  - [ ] disables Continue button until selection made
- **Integration Tests**:
  - [ ] PATCH /api/users/me/onboarding stores purpose
- **End-to-End Acceptance Tests**:
  - [ ] selects Family Heritage and clicks Continue

#### 17. UI Component Inventory
`WizardHeader`, `PurposeCardGrid`, `OnboardingFooter`

---

### PWA-15 — Create First Memory Space Step

**Category**: Web & PWA — Auth & Onboarding  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Name and describe the initial memory space (e.g. 'The Morrison Family Living Archive').
- **User Story**: "As an archivist in onboarding, I want to configure my first space with a title, description, and privacy setting so my memories have a dedicated home."

#### 2. Navigation & Routing
- **Entry Routes**: `/onboarding/first-space`, `/onboarding/purpose`
- **Exit Routes**: `/onboarding/first-profile`, `/onboarding/purpose`
- **Back Navigation**: `/onboarding/purpose`
- **Deep Link**: `https://memoria.local/onboarding/first-space`

#### 3. Personas & Authorization
- **Eligible Roles**: Authenticated Member
- **Required Capabilities**: `create_memory_space`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Step 2 of 4 progress indicator; title 'Name your living archive'.
- **Main Content**: Form fields: Space Name (pre-populated with suggested name based on selected purpose), Short Description, Cover Color swatch picker (Forest, Plum, Ink, Sage).
- **Footer / Actions Bar**: Back button and 'Create Space & Continue' button.

#### 5. Interactive Controls & UI Elements
- Space Name text input field
- Description textarea
- Color swatch selector buttons
- Back Button
- Primary Button: 'Create Space & Continue'

#### 6. Form Validation & Data Schema

| Field Name | Data Type | Required | Limits & Constraints | Validation Rule | Error Copy |
|---|---|---|---|---|---|
| `name` | `text` | **Yes** | 1-100 characters | Standard type validation | Please give your memory space a name. |
| `description` | `text` | No | 0-500 characters | Standard type validation | Invalid value |

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Space Name input field`
- **Tab Sequence**: `Space Name` -> `Description` -> `Color swatches` -> `Back button` -> `Create button`
- **Escape Key Action**: Returns to previous step

#### 8. States Matrix
- **Loading State**: Creating space spinner on button.
- **Empty State**: Pre-filled default suggestion (e.g. 'My Family Archive').
- **Populated State**: Customized space details.
- **Error State**: Validation error banner.
- **Offline Mode**: Local IndexedDB draft preserved; syncs on reconnect.
- **Permission Denied**: Redirect to login.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Step 2 of onboarding. Name and configure your memory space."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Full width form.
- **Tablet (768px – 1024px)**: Centered 520px card.
- **Desktop (> 1024px)**: Centered 580px card.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/spaces`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ name: string, description?: string, type: 'family' | 'personal' | 'event' | 'journey' }`
- **Response Payload**: `{ success: true, data: { space: MemorySpace } }`
- **Status Codes**: `201 Created`, `400 Bad Request`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service`
- **Database Tables**: `memory_spaces`, `space_members`, `space_storage_quotas`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `memory.space_created`
- **BullMQ Background Jobs**: `initialize-space-defaults`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Creator automatically designated Owner.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] validates Space name schema
  - [ ] emits space_created event
- **Integration Tests**:
  - [ ] POST /api/spaces inserts row and owner membership
- **End-to-End Acceptance Tests**:
  - [ ] submits space name, navigates to profile creation

#### 17. UI Component Inventory
`SpaceForm`, `ColorSwatchPicker`, `Button`

---

### PWA-16 — Create First Profile (Person, Child, Pet, Couple)

**Category**: Web & PWA — Auth & Onboarding  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Add the first family member or subject profile to tag in future memories.
- **User Story**: "As an archivist, I want to add my child, ancestor, or family member's profile so that stories can be attached to them."

#### 2. Navigation & Routing
- **Entry Routes**: `/onboarding/first-profile`, `/onboarding/first-space`
- **Exit Routes**: `/onboarding/invite-members`, `/onboarding/first-space`
- **Back Navigation**: `/onboarding/first-space`
- **Deep Link**: `https://memoria.local/onboarding/first-profile`

#### 3. Personas & Authorization
- **Eligible Roles**: Authenticated Member (Space Owner)
- **Required Capabilities**: `create_profile`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Step 3 of 4; title 'Who is this archive celebrating?'.
- **Main Content**: Profile card: Profile Type selector (Individual, Child, Pet, Couple, Ancestor), Full Name, Relationship (e.g. 'Daughter', 'Grandmother'), Birth Date (optional), Avatar photo placeholder.
- **Footer / Actions Bar**: 'Skip profile creation' and 'Save Profile & Continue' buttons.

#### 5. Interactive Controls & UI Elements
- Profile Type selector pills
- Full Name input field
- Relationship input field
- Birth Date picker
- Avatar upload trigger button
- Skip button
- Continue button

#### 6. Form Validation & Data Schema

| Field Name | Data Type | Required | Limits & Constraints | Validation Rule | Error Copy |
|---|---|---|---|---|---|
| `name` | `text` | **Yes** | 1-100 characters | Standard type validation | Please enter the person's name. |
| `type` | `select` | **Yes** | N/A | Standard type validation | Please select a profile category. |
| `relationship` | `text` | No | 0-50 characters | Standard type validation | Invalid value |
| `birthDate` | `date` | No | N/A | Standard type validation | Invalid value |

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Full Name input field`
- **Tab Sequence**: `Profile Type pills` -> `Full Name` -> `Relationship` -> `Birth Date` -> `Skip` -> `Continue`
- **Escape Key Action**: Returns to step 2

#### 8. States Matrix
- **Loading State**: Saving profile spinner.
- **Empty State**: Blank form awaiting input.
- **Populated State**: Valid profile data entered with preview avatar.
- **Error State**: Validation error banner.
- **Offline Mode**: Queued locally in IndexedDB.
- **Permission Denied**: N/A

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Step 3 of onboarding. Add the first profile to your memory space."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Full width form.
- **Tablet (768px – 1024px)**: Centered 520px card.
- **Desktop (> 1024px)**: Centered 580px card.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/spaces/:spaceId/profiles`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ name: string, relationship?: string, type: ProfileType, birthDate?: string }`
- **Response Payload**: `{ success: true, data: { profile: SpaceProfile } }`
- **Status Codes**: `201 Created`, `400 Bad Request`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service`
- **Database Tables**: `space_profiles`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `memory.profile_created`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Children and personal dates protected by space tenant boundaries.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] validates ProfileTypeSchema
  - [ ] handles optional birth date parsing
- **Integration Tests**:
  - [ ] POST /api/spaces/:spaceId/profiles persists profile record
- **End-to-End Acceptance Tests**:
  - [ ] creates daughter profile with birthdate, navigates to invite contributors

#### 17. UI Component Inventory
`ProfileForm`, `TypeSelectorPill`, `AvatarUploadTrigger`, `Button`

---

### PWA-17 — Invite Family Members & Contributors Step

**Category**: Web & PWA — Auth & Onboarding  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Invite relatives or co-creators via email with designated roles (Editor, Contributor, Viewer).
- **User Story**: "As an archivist, I want to invite my siblings and spouse so they can add photos and memories to our shared space."

#### 2. Navigation & Routing
- **Entry Routes**: `/onboarding/invite-members`, `/onboarding/first-profile`
- **Exit Routes**: `/onboarding/first-upload`, `/dashboard`
- **Back Navigation**: `/onboarding/first-profile`
- **Deep Link**: `https://memoria.local/onboarding/invite-members`

#### 3. Personas & Authorization
- **Eligible Roles**: Authenticated Member (Space Owner)
- **Required Capabilities**: `invite_members`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Step 4 of 4; title 'Who will help preserve these memories?'.
- **Main Content**: Multi-row email invite form: Email input, Role dropdown (Contributor / Editor / Viewer), '+ Add another person' button, Sharable invite link generator.
- **Footer / Actions Bar**: 'Skip for now' and 'Send Invitations & Continue' buttons.

#### 5. Interactive Controls & UI Elements
- Email input fields (multi-row)
- Role select dropdowns
- Button: '+ Add another person'
- Button: 'Copy Private Invite Link'
- Button: 'Skip for now'
- Primary Button: 'Send Invites & Continue'

#### 6. Form Validation & Data Schema

| Field Name | Data Type | Required | Limits & Constraints | Validation Rule | Error Copy |
|---|---|---|---|---|---|
| `emails` | `email[]` | No | Valid email addresses | Standard type validation | Please check email formatting. |

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First email input field`
- **Tab Sequence**: `Email 1` -> `Role 1` -> `Add person button` -> `Copy link button` -> `Skip button` -> `Send button`
- **Escape Key Action**: Returns to step 3

#### 8. States Matrix
- **Loading State**: Sending invitation emails spinner.
- **Empty State**: Single empty email row with Contributor pre-selected.
- **Populated State**: Multiple invite rows with valid emails.
- **Error State**: Error banner if invitation delivery encounters failure.
- **Offline Mode**: Offline notification: 'Invitations will be dispatched when online.'
- **Permission Denied**: N/A

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Invite family members to collaborate on this memory space."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Stacked row layout.
- **Tablet (768px – 1024px)**: Row with email input (70%) and role selector (30%).
- **Desktop (> 1024px)**: Clean tabular layout max-width 640px.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/spaces/:spaceId/invitations`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ invitations: Array<{ email: string, role: 'editor' | 'contributor' | 'viewer' }> }`
- **Response Payload**: `{ success: true, data: { invitedCount: number } }`
- **Status Codes**: `201 Created`, `400 Bad Request`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service / identity-service`
- **Database Tables**: `space_invitations`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `collab.invitations_dispatched`
- **BullMQ Background Jobs**: `dispatch-invitation-emails`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Invitations generate secure cryptographically signed tokens.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] validates list of emails
  - [ ] disables send button when rows empty
- **Integration Tests**:
  - [ ] POST /api/spaces/:spaceId/invitations generates invitation records
- **End-to-End Acceptance Tests**:
  - [ ] adds 2 family emails, sends invitations, navigates to first upload

#### 17. UI Component Inventory
`InviteRowList`, `RoleSelectDropdown`, `Button`

---

### PWA-18 — First Memory Upload & Drag-and-Drop Prompt

**Category**: Web & PWA — Auth & Onboarding  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Upload the very first photograph, document, or audio memory to inaugurate the space.
- **User Story**: "As an archivist finishing onboarding, I want to drag-and-drop a few initial photos so my space immediately comes to life."

#### 2. Navigation & Routing
- **Entry Routes**: `/onboarding/first-upload`, `/onboarding/invite-members`
- **Exit Routes**: `/dashboard`, `/memories/:memoryId`
- **Back Navigation**: `/onboarding/invite-members`
- **Deep Link**: `https://memoria.local/onboarding/first-upload`

#### 3. Personas & Authorization
- **Eligible Roles**: Authenticated Member (Contributor+)
- **Required Capabilities**: `upload_media`, `create_memory`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Onboarding finale; title 'Add your first memory'.
- **Main Content**: Large dashed drag-and-drop target zone, 'Choose files from device' button, supported format badges (JPEG, PNG, HEIC, MP4, MP3, PDF up to 500MB), thumbnail preview queue with progress bar.
- **Footer / Actions Bar**: Finish button and 'Go to Dashboard' link.

#### 5. Interactive Controls & UI Elements
- Drag-and-Drop Dropzone area
- File input trigger button: 'Browse Photos & Documents'
- Remove item button on uploaded thumbnail cards
- Primary Button: 'Preserve & Enter Dashboard'

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Browse files button`
- **Tab Sequence**: `Browse files button` -> `Uploaded thumbnail items` -> `Finish button`
- **Escape Key Action**: None

#### 8. States Matrix
- **Loading State**: Uploading and hashing files with live percentage bar.
- **Empty State**: Archival camera illustration inviting first upload.
- **Populated State**: Grid of uploaded thumbnails with green checkmark badges.
- **Error State**: Error badge on oversized or unsupported format files with retry button.
- **Offline Mode**: Queued in local IndexedDB storage queue for background upload.
- **Permission Denied**: N/A

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Drop zone to upload photos and documents to your memory space."
- **Touch Target Minimum**: `48x48 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Compact dropzone with prominent mobile camera/photo library picker trigger.
- **Tablet (768px – 1024px)**: Expansive drag and drop zone with 3-column thumbnail preview.
- **Desktop (> 1024px)**: Spacious dropzone with drag hover glow, 4-column thumbnail preview.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/media/upload-session`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ spaceId: string, fileName: string, mimeType: string, fileSizeBytes: number, checksumSha256?: string }`
- **Response Payload**: `{ success: true, data: { mediaId: string, uploadUrl: string, storageKey: string } }`
- **Status Codes**: `200 OK`, `400 Bad Request`, `413 Payload Too Large`

#### 13. Service Architecture & Persistence
- **Backend Service**: `media-service`
- **Database Tables**: `media_assets`, `memories`, `memory_media`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `media.uploaded`, `memory.created`
- **BullMQ Background Jobs**: `generate-derivatives`, `extract-exif-metadata`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Original byte-for-byte SHA-256 verification; stored in tenant-isolated directory.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] validates file size limit and MIME whitelist
  - [ ] calculates client-side SHA-256 hash
- **Integration Tests**:
  - [ ] completes direct-to-disk upload and generates thumbnail record
- **End-to-End Acceptance Tests**:
  - [ ] drags photo fixture, observes progress, verifies redirect to dashboard

#### 17. UI Component Inventory
`DropZone`, `UploadQueueItem`, `Button`

---

### 1.3 Home, Spaces, People & Collections (PWA-19 to PWA-32)

### PWA-19 — Personal Dashboard & Living Archive Hub

**Category**: Web & PWA — Spaces & People  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: View recent memories, today-in-history, active spaces, miniature 3D bookshelf, and quick-capture entry points.
- **User Story**: "As an archivist, I want a comprehensive personal dashboard so that I can see what happened today in our family history and quickly add new stories."

#### 2. Navigation & Routing
- **Entry Routes**: `/dashboard`, `/login`, `/`
- **Exit Routes**: `/spaces/:spaceId`, `/memories/:memoryId`, `/books/:bookId`, `/create-memory`
- **Back Navigation**: `/`
- **Deep Link**: `https://memoria.local/dashboard`

#### 3. Personas & Authorization
- **Eligible Roles**: Authenticated Member
- **Required Capabilities**: `view_dashboard`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: App navigation bar: Memoria seal, space selector dropdown, search input, notification bell, user avatar menu.
- **Main Content**: 1. Today-in-History memory banner, 2. Quick capture action pills (+ Photo, + Story, + Voice Note), 3. Recent Memories masonry feed, 4. 3D Digital Bookshelf widget, 5. Storage health meter.
- **Aside / Sidebar**: Right sidebar: Space Members online, upcoming anniversaries, quick tags.
- **Footer / Actions Bar**: Minimal authenticated footer.

#### 5. Interactive Controls & UI Elements
- Quick Capture floating '+ Add Memory' button
- Capture type pills (Photo, Audio, Story, Scan)
- Space Switcher dropdown trigger
- Search trigger button (Command+K)
- Notification icon trigger with unread badge
- Bookshelf 'Open Studio' button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Main content landmark`
- **Tab Sequence**: `Header navigation` -> `Quick capture buttons` -> `Today-in-history card` -> `Recent memories grid` -> `Bookshelf preview`
- **Keyboard Shortcuts**: `Cmd+K (Search)`, `KeyC (Create Memory)`, `KeyB (Open Bookshelf)`
- **Escape Key Action**: Closes any open popovers or menus

#### 8. States Matrix
- **Loading State**: Dashboard masonry and widget skeletons.
- **Empty State**: Warm empty state with prompt: 'Your archive is quiet. Preserve your first family story today.'
- **Populated State**: Vibrant living archive feed with chronological memory cards, EXIF timestamps, audio players.
- **Error State**: Service error banner with refresh button.
- **Offline Mode**: IndexedDB cached memories rendered with amber offline sync indicator.
- **Permission Denied**: Redirect to login.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Personal Dashboard. Space switcher, quick capture, today in history, and recent memories."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1 (Deep Ink on Warm Ivory)`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Single column feed, bottom navigation bar with Quick Capture center button, collapsible widgets.
- **Tablet (768px – 1024px)**: Two-column layout with sidebar tucked into sheet.
- **Desktop (> 1024px)**: Three-column dashboard layout (Navigation left, Main feed center, Widgets right).

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/dashboard/overview`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { spaces: Array<MemorySpace>, recentMemories: Array<Memory>, todayInHistory: Array<Memory>, storageUsedBytes: number } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service / api-gateway`
- **Database Tables**: `memories`, `memory_spaces`, `space_storage_quotas`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `dashboard.viewed`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: No
- **Privacy Architecture**: Strict tenant isolation: only spaces where user has verified membership are fetched.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] renders today in history memory when date matches current month/day
  - [ ] opens quick capture sheet on + click
- **Integration Tests**:
  - [ ] GET /api/dashboard/overview returns authenticated user spaces and memories
- **End-to-End Acceptance Tests**:
  - [ ] loads dashboard, verifies memory feed items, clicks Quick Capture

#### 17. UI Component Inventory
`AppHeader`, `TodayInHistoryBanner`, `QuickCaptureBar`, `MemoryCard`, `BookshelfWidget`

---

### PWA-20 — All Memory Spaces Directory Grid

**Category**: Web & PWA — Spaces & People  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: View, filter, and switch between all owned and shared memory spaces.
- **User Story**: "As a member of multiple spaces (e.g. maternal family, paternal family, personal), I want to browse my spaces with member counts and role badges."

#### 2. Navigation & Routing
- **Entry Routes**: `/spaces`, `/dashboard`
- **Exit Routes**: `/spaces/:spaceId`, `/spaces/new`
- **Back Navigation**: `/dashboard`
- **Deep Link**: `https://memoria.local/spaces`

#### 3. Personas & Authorization
- **Eligible Roles**: Authenticated Member
- **Required Capabilities**: `view_spaces_directory`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Title 'Your Memory Spaces' with '+ Create New Space' button and search input.
- **Main Content**: Grid of Space Cards: Space Cover, Name, Role badge (Owner, Editor, Contributor), Member avatars, Memory count, Last activity timestamp.
- **Footer / Actions Bar**: Archived spaces link.

#### 5. Interactive Controls & UI Elements
- Button: '+ Create New Space'
- Search spaces input field
- Space card click (navigates to space overview)
- Space settings gear button on owned spaces

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Search spaces input`
- **Tab Sequence**: `Create space button` -> `Search input` -> `Space cards in grid`
- **Escape Key Action**: Clears search query

#### 8. States Matrix
- **Loading State**: 6-card space grid skeleton.
- **Empty State**: Empty directory prompt with '+ Create First Space' button.
- **Populated State**: Cards styled with distinct cover colors and member counts.
- **Error State**: Error banner with retry button.
- **Offline Mode**: Cached space directory rendered from IndexedDB.
- **Permission Denied**: Redirect to login.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Memory spaces directory listing all owned and shared spaces."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Single column card list.
- **Tablet (768px – 1024px)**: Two-column grid.
- **Desktop (> 1024px)**: Three-column grid with subtle hover elevation.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/spaces`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { items: Array<MemorySpace & { role: string, memberCount: number, memoryCount: number }> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service`
- **Database Tables**: `memory_spaces`, `space_members`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: _None_
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: No
- **Privacy Architecture**: Only spaces with active user membership returned.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] filters space cards by search text
  - [ ] displays correct role badge
- **Integration Tests**:
  - [ ] GET /api/spaces returns only member's spaces
- **End-to-End Acceptance Tests**:
  - [ ] navigates to /spaces, searches space name, clicks card to enter space

#### 17. UI Component Inventory
`SpaceGrid`, `SpaceCard`, `SearchInput`, `Button`

---

### PWA-21 — Create / Edit Memory Space Modal & View

**Category**: Web & PWA — Spaces & People  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Configure a memory space's name, description, cover color/photo, default privacy, and archival settings.
- **User Story**: "As a space owner, I want to edit our space details and cover photo so that our family members feel warmly welcomed."

#### 2. Navigation & Routing
- **Entry Routes**: `/spaces/new`, `/spaces/:spaceId/settings`
- **Exit Routes**: `/spaces/:spaceId`, `/spaces`
- **Back Navigation**: `/spaces/:spaceId`
- **Deep Link**: `https://memoria.local/spaces/:spaceId/edit`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Owner, Space Editor
- **Required Capabilities**: `edit_space_metadata`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Modal title: 'Create Memory Space' or 'Edit Space Details' with close (X) button.
- **Main Content**: Form fields: Space Name, Subtitle / Description, Space Type dropdown (Family, Personal, Event, Journey), Cover Theme / Image upload, Visibility defaults.
- **Footer / Actions Bar**: Cancel button and Save / Create Space button.

#### 5. Interactive Controls & UI Elements
- Space Name input field
- Description textarea
- Type dropdown selector
- Cover image upload / color swatch selector
- Save Changes button
- Cancel / Close button

#### 6. Form Validation & Data Schema

| Field Name | Data Type | Required | Limits & Constraints | Validation Rule | Error Copy |
|---|---|---|---|---|---|
| `name` | `text` | **Yes** | 1-100 characters | Standard type validation | Space name is required. |
| `description` | `text` | No | 0-1000 characters | Standard type validation | Invalid value |

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Space Name input field`
- **Tab Sequence**: `Space Name` -> `Description` -> `Type` -> `Cover Upload` -> `Cancel` -> `Save`
- **Escape Key Action**: Closes modal with unsaved changes prompt if form is dirty

#### 8. States Matrix
- **Loading State**: Saving changes spinner; button disabled.
- **Empty State**: Clean fields for creation.
- **Populated State**: Pre-filled with existing space metadata.
- **Error State**: Inline validation errors or server conflict banner.
- **Offline Mode**: Draft stored locally in IndexedDB.
- **Permission Denied**: Alert indicating only Owners and Editors can update space metadata.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Space configuration modal. Enter space name, description, and cover style."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Full screen sheet.
- **Tablet (768px – 1024px)**: Centered modal max-width 560px.
- **Desktop (> 1024px)**: Centered modal max-width 640px.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `PUT` `/api/spaces/:spaceId`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ name: string, description?: string, coverUrl?: string, type?: SpaceType }`
- **Response Payload**: `{ success: true, data: { space: MemorySpace } }`
- **Status Codes**: `200 OK`, `400 Bad Request`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service`
- **Database Tables**: `memory_spaces`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `memory.space_updated`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Space modifications logged in tenant audit log.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] prevents submission with empty space name
  - [ ] warns on dirty exit
- **Integration Tests**:
  - [ ] PUT /api/spaces/:spaceId updates database and verifies authorization
- **End-to-End Acceptance Tests**:
  - [ ] edits space description, clicks Save, observes updated banner

#### 17. UI Component Inventory
`Modal`, `InputField`, `ColorSwatchPicker`, `Button`

---

### PWA-22 — Memory Space Overview & Featured Stories

**Category**: Web & PWA — Spaces & People  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Explore a specific Memory Space's featured stories, recent member contributions, milestone snippets, and navigation tabs.
- **User Story**: "As a space contributor, I want to view our family space overview so that I can see the latest additions and navigate to timeline or members."

#### 2. Navigation & Routing
- **Entry Routes**: `/spaces/:spaceId`, `/spaces`
- **Exit Routes**: `/spaces/:spaceId/timeline`, `/spaces/:spaceId/members`, `/spaces/:spaceId/books`, `/create-memory?spaceId=:spaceId`
- **Back Navigation**: `/spaces`
- **Deep Link**: `https://memoria.local/spaces/:spaceId`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member (Owner, Editor, Contributor, Viewer)
- **Required Capabilities**: `view_space_overview`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Space hero banner with cover photography, space name, member badge count, '+ Add Memory' button, and tab bar (Overview, Timeline, People, Collections, Books, Settings).
- **Main Content**: 1. Featured archival memory spotlight card, 2. Recent stories carousel, 3. Chronological timeline preview, 4. Contributor avatars strip.
- **Footer / Actions Bar**: Space storage quota widget.

#### 5. Interactive Controls & UI Elements
- Navigation Tabs (Overview, Timeline, People, Collections, Books, Settings)
- Primary Button: '+ Add to this Space'
- Memory spotlight card click (opens memory detail modal)
- Invite members button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Active tab (Overview)`
- **Tab Sequence**: `Navigation tabs` -> `+ Add Memory button` -> `Featured card` -> `Recent cards` -> `Member avatars`
- **Escape Key Action**: None

#### 8. States Matrix
- **Loading State**: Space hero and featured card skeletons.
- **Empty State**: Notice inviting contributors to add the space's first memory.
- **Populated State**: Warm ivory canvas with featured photographic spotlight and contributor avatars.
- **Error State**: Error banner if space fails to load.
- **Offline Mode**: Offline indicator with cached space overview.
- **Permission Denied**: 403 Forbidden screen if user is not a member.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Memory space overview for Morrison Family Archive. Lists tabs, featured memories, and contributors."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Compact hero banner, horizontal scrolling tabs, stacked memory feed.
- **Tablet (768px – 1024px)**: Hero banner with inline tabs, two-column content grid.
- **Desktop (> 1024px)**: Cinematic hero banner with archival serif typography, 3-column structured layout.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/spaces/:spaceId`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { space: MemorySpace, memberCount: number, recentMemories: Array<Memory>, featuredMemory: Memory } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service`
- **Database Tables**: `memory_spaces`, `memories`, `space_members`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `space.overview_viewed`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: No
- **Privacy Architecture**: Restricted to authorized space members.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] renders tabs and checks authorization role for Settings tab
  - [ ] highlights active tab
- **Integration Tests**:
  - [ ] GET /api/spaces/:spaceId checks user membership
- **End-to-End Acceptance Tests**:
  - [ ] navigates between space tabs and clicks + Add Memory

#### 17. UI Component Inventory
`SpaceHero`, `TabBar`, `FeaturedMemoryCard`, `ContributorStrip`, `Button`

---

### PWA-23 — Space-Specific Chronological Timeline View

**Category**: Web & PWA — Spaces & People  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Explore the family timeline chronologically with year/decade jump index, milestones, and filtered view.
- **User Story**: "As a family member, I want to scroll through our chronological timeline from 1950 to 2024 so I can trace generations and milestones in order."

#### 2. Navigation & Routing
- **Entry Routes**: `/spaces/:spaceId/timeline`, `/spaces/:spaceId`
- **Exit Routes**: `/memories/:memoryId`, `/spaces/:spaceId/timeline?year=:year`
- **Back Navigation**: `/spaces/:spaceId`
- **Deep Link**: `https://memoria.local/spaces/:spaceId/timeline`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member
- **Required Capabilities**: `view_timeline`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Timeline filter bar: Search memories, Filter by Profile, Filter by Tag, Year range slider.
- **Main Content**: Chronological vertical spine: Year markers (e.g. '1974', '1982', '2004'), memory milestone cards with capture dates, thumbnails, and written story excerpts.
- **Aside / Sidebar**: Sticky Year Jump Index right sidebar (decades: 1950s, 60s, 70s, 80s, 90s, 2000s, 2010s, 2020s).
- **Footer / Actions Bar**: Timeline end marker.

#### 5. Interactive Controls & UI Elements
- Decade / Year jump pills (scrolling anchor)
- Profile filter dropdown
- Memory card click (opens detail modal)
- Sort toggle (Oldest First / Newest First)

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First decade jump pill`
- **Tab Sequence**: `Filter bar` -> `Decade pills` -> `Memory milestone cards`
- **Keyboard Shortcuts**: `PageDown (Next year)`, `PageUp (Previous year)`
- **Escape Key Action**: Clears active filters

#### 8. States Matrix
- **Loading State**: Timeline spine with pulsating card skeletons.
- **Empty State**: Notice: 'No memories recorded for this era yet. Add the first story from this year.'
- **Populated State**: Beautiful vertical spine in Soft Sage #849483 with Warm Ivory milestone cards.
- **Error State**: Error banner with reload button.
- **Offline Mode**: Cached timeline rendered with offline status badge.
- **Permission Denied**: 403 Forbidden alert.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Chronological timeline view. Year markers and memory cards arranged in historical sequence."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Single side vertical timeline with horizontal scrolling year jump bar at top.
- **Tablet (768px – 1024px)**: Alternating left-right timeline cards along central spine.
- **Desktop (> 1024px)**: Alternating milestone cards with sticky decade jump navigation sidebar.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/spaces/:spaceId/timeline`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { timeline: Array<{ year: number, memories: Array<Memory> }> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service`
- **Database Tables**: `memories`, `memory_media`, `space_profiles`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `timeline.browsed`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: No
- **Privacy Architecture**: Historical dates rendered in local capture timezone.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] groups memories correctly by capture year
  - [ ] handles leap years and BC dates
- **Integration Tests**:
  - [ ] GET /api/spaces/:spaceId/timeline orders memories by captured_at ASC
- **End-to-End Acceptance Tests**:
  - [ ] clicks 1980s decade pill, scrolls smoothly to target year marker

#### 17. UI Component Inventory
`TimelineSpine`, `YearMarker`, `MilestoneCard`, `DecadeJumpNav`

---

### PWA-24 — Space Member Directory & Role Roster

**Category**: Web & PWA — Spaces & People  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Review all contributors in the space, inspect their assigned roles, and manage permissions.
- **User Story**: "As a space owner, I want to view our member roster and change a relative from Viewer to Contributor so they can upload family photos."

#### 2. Navigation & Routing
- **Entry Routes**: `/spaces/:spaceId/members`, `/spaces/:spaceId`
- **Exit Routes**: `/spaces/:spaceId/invitations`, `/spaces/:spaceId`
- **Back Navigation**: `/spaces/:spaceId`
- **Deep Link**: `https://memoria.local/spaces/:spaceId/members`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member
- **Required Capabilities**: `view_members`, `manage_members (Owner/Editor only)`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Member roster title, '+ Invite New Member' button, and search input.
- **Main Content**: Member list table: Avatar, Name, Email (masked for non-owners), Role badge (Owner, Editor, Contributor, Viewer), Joined Date, Contribution count, Role dropdown / Remove button (Owners only).
- **Footer / Actions Bar**: Role capability definitions legend.

#### 5. Interactive Controls & UI Elements
- Button: '+ Invite Member'
- Member search input
- Role selector dropdown (Owner only)
- Remove member action button (with confirmation modal)
- Leave Space button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Member search input`
- **Tab Sequence**: `Invite button` -> `Search input` -> `Member rows` -> `Role dropdowns` -> `Action buttons`
- **Escape Key Action**: Closes confirmation dialog

#### 8. States Matrix
- **Loading State**: Table rows skeleton pulse.
- **Empty State**: N/A (At least 1 owner always exists).
- **Populated State**: Clean tabular roster with Plum #76556F role badges and clear action triggers.
- **Error State**: Error banner with refresh action.
- **Offline Mode**: Cached roster displayed.
- **Permission Denied**: 403 Forbidden alert if non-member.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Space member directory with roles and contribution counts."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Card list format with avatar, name, role badge, and kebab menu.
- **Tablet (768px – 1024px)**: Table view with simplified columns.
- **Desktop (> 1024px)**: Full data table with activity count and inline role editing.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/spaces/:spaceId/members`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { members: Array<{ userId: string, fullName: string, email: string, role: string, joinedAt: string, contributionCount: number }> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service / identity-service`
- **Database Tables**: `space_members`, `users`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `collab.member_role_changed`, `collab.member_removed`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Medium`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Member email addresses masked unless viewer is Space Owner.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] prevents removing the sole remaining Space Owner
  - [ ] masks emails for non-owners
- **Integration Tests**:
  - [ ] PATCH /api/spaces/:spaceId/members/:userId updates role in space_members
- **End-to-End Acceptance Tests**:
  - [ ] updates contributor role to Editor and confirms updated badge

#### 17. UI Component Inventory
`MemberTable`, `RoleBadge`, `InviteModal`, `Button`

---

### PWA-25 — Space Settings, Privacy & Danger Zone

**Category**: Web & PWA — Spaces & People  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Manage space-level privacy rules, storage quotas, data export, space ownership transfer, or archival deletion.
- **User Story**: "As a space owner, I want to configure sharing permissions, export our complete archive, or transfer ownership safely."

#### 2. Navigation & Routing
- **Entry Routes**: `/spaces/:spaceId/settings`, `/spaces/:spaceId`
- **Exit Routes**: `/spaces/:spaceId`, `/spaces`
- **Back Navigation**: `/spaces/:spaceId`
- **Deep Link**: `https://memoria.local/spaces/:spaceId/settings`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Owner
- **Required Capabilities**: `manage_space_settings`, `delete_space`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Settings navigation tabs (General, Privacy & Sharing, Storage & Export, Danger Zone).
- **Main Content**: Section 1: General Metadata, Section 2: Default link expiration rules, Section 3: One-click Full Archive Export (ZIP + JSON metadata), Section 4: Danger Zone (Transfer Ownership, Archive Space, Permanently Delete Space).
- **Footer / Actions Bar**: Save Changes floating banner.

#### 5. Interactive Controls & UI Elements
- Button: 'Export Entire Space (ZIP)'
- Button: 'Transfer Space Ownership'
- Button: 'Archive Space (Read-only)'
- Destructive Button: 'Permanently Delete Space' (Requires typing space name to confirm)

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First setting input`
- **Tab Sequence**: `Settings tabs` -> `General inputs` -> `Export button` -> `Transfer button` -> `Delete button`
- **Escape Key Action**: Closes modal dialogs

#### 8. States Matrix
- **Loading State**: Settings form loading skeleton.
- **Empty State**: N/A
- **Populated State**: Form populated with current space privacy rules and storage usage breakdown.
- **Error State**: Error banner with actionable message.
- **Offline Mode**: Settings updates disabled while offline.
- **Permission Denied**: 403 Forbidden screen: Only the Space Owner can access Space Settings.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Space settings. Privacy, export, and danger zone operations."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Stacked vertical settings sections.
- **Tablet (768px – 1024px)**: Left vertical settings menu, right content pane.
- **Desktop (> 1024px)**: Max-width 960px settings layout with dedicated danger zone card.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `DELETE` `/api/spaces/:spaceId`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ confirmationName: string }`
- **Response Payload**: `{ success: true, data: { scheduledDeletionDate: string } }`
- **Status Codes**: `200 OK`, `400 Bad Request`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service`
- **Database Tables**: `memory_spaces`, `audit_logs`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `memory.space_deleted`, `memory.space_archived`
- **BullMQ Background Jobs**: `schedule-space-data-cleanup`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Admin Audited`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Destructive space operations require exact name match confirmation and are immutable in audit logs.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] requires exact space name matching before enabling delete button
  - [ ] validates owner role
- **Integration Tests**:
  - [ ] DELETE /api/spaces/:spaceId soft-deletes space and records audit log
- **End-to-End Acceptance Tests**:
  - [ ] navigates to settings, requests ZIP export, verifies export job started

#### 17. UI Component Inventory
`SettingsLayout`, `ExportButton`, `DangerZoneCard`, `ConfirmModal`

---

### PWA-26 — People & Profiles Directory

**Category**: Web & PWA — Spaces & People  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Browse and search all individuals, children, pets, ancestors, and couples associated with the space.
- **User Story**: "As a family storyteller, I want to view all people profiles so I can find every memory connected to my grandfather."

#### 2. Navigation & Routing
- **Entry Routes**: `/spaces/:spaceId/people`, `/spaces/:spaceId`
- **Exit Routes**: `/spaces/:spaceId/people/:profileId`, `/spaces/:spaceId/people/new`
- **Back Navigation**: `/spaces/:spaceId`
- **Deep Link**: `https://memoria.local/spaces/:spaceId/people`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member
- **Required Capabilities**: `view_profiles`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Title 'People & Profiles' with '+ Add Person' button and search input.
- **Main Content**: Grid of Profile Avatar Cards: Avatar photograph, Full Name, Relationship tag, Profile Type badge (Child, Ancestor, Pet), Number of tagged memories.
- **Footer / Actions Bar**: Profile count summary.

#### 5. Interactive Controls & UI Elements
- Button: '+ Add Person'
- Profile search bar
- Type filter pills (All, Immediate Family, Ancestors, Pets)
- Profile card click (navigates to profile detail)

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Profile search bar`
- **Tab Sequence**: `Add Person button` -> `Search bar` -> `Filter pills` -> `Profile cards`
- **Escape Key Action**: Clears search bar

#### 8. States Matrix
- **Loading State**: Profile card grid skeleton.
- **Empty State**: Notice: 'No profiles created yet. Add family members to organize memories by person.'
- **Populated State**: Warm circular avatars with name badges and story counters.
- **Error State**: Error banner with refresh button.
- **Offline Mode**: Cached profiles rendered from local database.
- **Permission Denied**: 403 Forbidden if non-member.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "People and profiles directory with avatars, relationships, and memory counts."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: 2-column profile card grid.
- **Tablet (768px – 1024px)**: 3 or 4-column grid.
- **Desktop (> 1024px)**: 4 or 5-column balanced avatar grid.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/spaces/:spaceId/profiles`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { profiles: Array<SpaceProfile & { memoryCount: number }> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service`
- **Database Tables**: `space_profiles`, `memory_profiles`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: _None_
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: No
- **Privacy Architecture**: Profiles protected within space tenant boundaries.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] filters profile grid by name query
  - [ ] displays correct profile type pill
- **Integration Tests**:
  - [ ] GET /api/spaces/:spaceId/profiles returns profiles for space
- **End-to-End Acceptance Tests**:
  - [ ] searches grandfather profile, clicks card, navigates to profile detail

#### 17. UI Component Inventory
`ProfileGrid`, `ProfileCard`, `SearchInput`, `Button`

---

### PWA-27 — Profile Detail & Person Biography View

**Category**: Web & PWA — Spaces & People  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Inspect a person's biography, milestones, birthdate, linked memory timeline, and photo highlights.
- **User Story**: "As a grandchild, I want to explore my grandmother's dedicated profile view so I can read her biography and see all photos of her."

#### 2. Navigation & Routing
- **Entry Routes**: `/spaces/:spaceId/people/:profileId`, `/spaces/:spaceId/people`
- **Exit Routes**: `/spaces/:spaceId/people/:profileId/edit`, `/memories/:memoryId`
- **Back Navigation**: `/spaces/:spaceId/people`
- **Deep Link**: `https://memoria.local/spaces/:spaceId/people/:profileId`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member
- **Required Capabilities**: `view_profile_detail`, `edit_profile (Contributor+)`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Profile hero: Large circular avatar portrait, Full Name, Relationship (e.g. 'Paternal Grandmother 1928–2018'), 'Edit Profile' button.
- **Main Content**: 1. Biography narrative card, 2. Life Milestones chronological strip, 3. Tagged Memories photo grid, 4. Associated Books section.
- **Footer / Actions Bar**: Profile metadata note.

#### 5. Interactive Controls & UI Elements
- Button: 'Edit Profile'
- Button: '+ Tag in New Memory'
- Memory card click (opens memory modal)
- Filter memories by year pills

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Biography heading`
- **Tab Sequence**: `Edit Profile button` -> `+ Tag Memory button` -> `Milestone cards` -> `Memory grid`
- **Escape Key Action**: None

#### 8. States Matrix
- **Loading State**: Profile hero and memory grid skeletons.
- **Empty State**: Notice: 'No memories tagged with this person yet.' with + Tag Memory action.
- **Populated State**: Rich profile layout with archival portrait, biography text, and chronological photo grid.
- **Error State**: Error banner if profile not found.
- **Offline Mode**: Cached profile view accessible offline.
- **Permission Denied**: 403 Forbidden alert.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Profile details for Eleanor Morrison. Biography, milestones, and tagged memories."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Centered avatar, stacked biography and single-column memory feed.
- **Tablet (768px – 1024px)**: Two-column layout (Profile card left, Memory feed right).
- **Desktop (> 1024px)**: Three-column layout with biographical milestones in sticky sidebar.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/spaces/:spaceId/profiles/:profileId`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { profile: SpaceProfile, memories: Array<Memory>, milestones: Array<any> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`, `404 Not Found`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service`
- **Database Tables**: `space_profiles`, `memory_profiles`, `memories`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `profile.detail_viewed`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: No
- **Privacy Architecture**: Sensitive family milestones protected.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] formats lifespan dates correctly e.g. 1928–2018
  - [ ] renders linked memory count
- **Integration Tests**:
  - [ ] GET /api/spaces/:spaceId/profiles/:profileId returns profile with linked memories
- **End-to-End Acceptance Tests**:
  - [ ] views grandmother profile, inspects biography, clicks memory thumbnail

#### 17. UI Component Inventory
`ProfileHero`, `BiographyCard`, `MilestoneStrip`, `MemoryGrid`, `Button`

---

### PWA-28 — Create / Edit Profile View with Avatar Cropping

**Category**: Web & PWA — Spaces & People  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Create or edit a person profile with name, category, birthdate, relationship, and avatar cropping.
- **User Story**: "As an archivist, I want to edit my child's profile photo and crop her face cleanly so her portrait looks sharp throughout the archive."

#### 2. Navigation & Routing
- **Entry Routes**: `/spaces/:spaceId/people/new`, `/spaces/:spaceId/people/:profileId/edit`
- **Exit Routes**: `/spaces/:spaceId/people/:profileId`, `/spaces/:spaceId/people`
- **Back Navigation**: `/spaces/:spaceId/people`
- **Deep Link**: `https://memoria.local/spaces/:spaceId/people/:profileId/edit`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member (Owner, Editor, Contributor)
- **Required Capabilities**: `edit_profile`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Title: 'Edit Profile' or 'Add Person' with cancel button.
- **Main Content**: Form: 1. Avatar Photo Picker with circular crop preview, 2. Profile Category (Individual, Child, Pet, Couple, Ancestor), 3. Full Name, 4. Relationship, 5. Birth Date & Passing Date (optional), 6. Biography textarea.
- **Footer / Actions Bar**: Save Profile button and Cancel button.

#### 5. Interactive Controls & UI Elements
- Avatar Upload & Interactive Crop Modal trigger
- Profile Type radio pills
- Full Name input
- Relationship input
- Birth Date picker
- Passing Date picker (optional)
- Biography textarea
- Save Profile Button

#### 6. Form Validation & Data Schema

| Field Name | Data Type | Required | Limits & Constraints | Validation Rule | Error Copy |
|---|---|---|---|---|---|
| `name` | `text` | **Yes** | 1-100 characters | Standard type validation | Name is required. |
| `type` | `select` | **Yes** | N/A | Standard type validation | Please choose a category. |
| `biography` | `textarea` | No | 0-5000 characters | Standard type validation | Invalid value |

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Full Name input field`
- **Tab Sequence**: `Avatar upload` -> `Type pills` -> `Full Name` -> `Relationship` -> `Birth Date` -> `Biography` -> `Save button`
- **Escape Key Action**: Prompts on unsaved changes

#### 8. States Matrix
- **Loading State**: Saving profile spinner.
- **Empty State**: Fresh inputs.
- **Populated State**: Pre-filled with existing profile data.
- **Error State**: Inline validation error alerts.
- **Offline Mode**: Queued in IndexedDB.
- **Permission Denied**: 403 Forbidden alert.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Profile editor form. Edit name, dates, relationship, and portrait avatar."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Full width form.
- **Tablet (768px – 1024px)**: Centered 560px card.
- **Desktop (> 1024px)**: Centered 640px card with side-by-side avatar preview.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `PUT` `/api/spaces/:spaceId/profiles/:profileId`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ name: string, type: ProfileType, relationship?: string, birthDate?: string, avatarMediaId?: string }`
- **Response Payload**: `{ success: true, data: { profile: SpaceProfile } }`
- **Status Codes**: `200 OK`, `400 Bad Request`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service`
- **Database Tables**: `space_profiles`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `memory.profile_updated`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Biographical details protected by space isolation.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] validates name requirement
  - [ ] handles circular crop coordinate calculation
- **Integration Tests**:
  - [ ] PUT /api/spaces/:spaceId/profiles/:profileId updates profile
- **End-to-End Acceptance Tests**:
  - [ ] edits biography, uploads avatar, clicks Save, confirms updated detail

#### 17. UI Component Inventory
`ProfileForm`, `AvatarCropper`, `Button`

---

### PWA-29 — Collections Directory

**Category**: Web & PWA — Spaces & People  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Browse and manage themed groupings of memories (e.g. 'Summer at the Lake 1988', 'Liam Year 1', 'Wedding Kept Memories').
- **User Story**: "As an archivist, I want to view all curated collections so I can organize memories into meaningful thematic albums before turning them into books."

#### 2. Navigation & Routing
- **Entry Routes**: `/spaces/:spaceId/collections`, `/spaces/:spaceId`
- **Exit Routes**: `/spaces/:spaceId/collections/:collectionId`, `/spaces/:spaceId/collections/new`
- **Back Navigation**: `/spaces/:spaceId`
- **Deep Link**: `https://memoria.local/spaces/:spaceId/collections`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member
- **Required Capabilities**: `view_collections`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Title 'Thematic Collections' with '+ New Collection' button and sort dropdown.
- **Main Content**: Grid of Collection Cards: Cover image collage, Collection title, Memory item count, Date span, Creator avatar.
- **Footer / Actions Bar**: Collection count summary.

#### 5. Interactive Controls & UI Elements
- Button: '+ New Collection'
- Collection card click (opens collection detail)
- Sort dropdown (Recent, Title, Memory Count)
- Quick add memories to collection modal trigger

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First collection card`
- **Tab Sequence**: `New collection button` -> `Sort dropdown` -> `Collection cards in grid`
- **Escape Key Action**: None

#### 8. States Matrix
- **Loading State**: Collection card grid skeleton pulse.
- **Empty State**: Notice: 'No collections created yet. Group related memories into a curated collection.'
- **Populated State**: Grid of collection cards with warm border #E7E2DA and photographic covers.
- **Error State**: Error banner with refresh button.
- **Offline Mode**: Cached collections rendered from local IndexedDB.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Thematic collections directory with cover photos and memory counts."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Single column list with wide banner cards.
- **Tablet (768px – 1024px)**: Two-column grid.
- **Desktop (> 1024px)**: Three-column grid with subtle hover elevation.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/spaces/:spaceId/collections`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { collections: Array<{ id: string, title: string, description: string, memoryCount: number, coverUrl: string }> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service`
- **Database Tables**: `tags`, `memory_tags`, `memories`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: _None_
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Medium`
- **Security Audit Logged**: No
- **Privacy Architecture**: Collections scoped strictly to space members.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] sorts collections by title and memory count correctly
- **Integration Tests**:
  - [ ] GET /api/spaces/:spaceId/collections returns collections for space
- **End-to-End Acceptance Tests**:
  - [ ] navigates to collections, clicks on 'Summer at the Lake', verifies detail view

#### 17. UI Component Inventory
`CollectionGrid`, `CollectionCard`, `SortDropdown`, `Button`

---

### PWA-30 — Collection Detail & Curated Order View

**Category**: Web & PWA — Spaces & People  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: View all memories in a collection, reorder them, inspect the cover banner, and export to book authoring.
- **User Story**: "As an archivist preparing a book, I want to curate and reorder memories within a collection and click 'Create Book from Collection'."

#### 2. Navigation & Routing
- **Entry Routes**: `/spaces/:spaceId/collections/:collectionId`, `/spaces/:spaceId/collections`
- **Exit Routes**: `/spaces/:spaceId/collections/:collectionId/edit`, `/books/new?collectionId=:collectionId`, `/memories/:memoryId`
- **Back Navigation**: `/spaces/:spaceId/collections`
- **Deep Link**: `https://memoria.local/spaces/:spaceId/collections/:collectionId`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member
- **Required Capabilities**: `view_collection_detail`, `edit_collection (Contributor+)`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Collection hero banner: Cover photograph, Title, Description, Item count, 'Create Book' button, 'Edit Collection' button.
- **Main Content**: Curated reorderable masonry grid of memories with drag handles and chronological tags.
- **Footer / Actions Bar**: Batch actions bar when items are selected.

#### 5. Interactive Controls & UI Elements
- Button: 'Turn into Book'
- Button: 'Edit Collection'
- Button: '+ Add Memories'
- Drag handle on memory items for custom curation order
- Remove from collection button on items

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Turn into Book button`
- **Tab Sequence**: `Action buttons` -> `Memory grid items` -> `Drag handles`
- **Escape Key Action**: Deselects selected items

#### 8. States Matrix
- **Loading State**: Collection hero and memory grid skeletons.
- **Empty State**: Notice: 'This collection is empty. Add memories from your archive.'
- **Populated State**: Rich grid of memories organized in custom curated or chronological sequence.
- **Error State**: Error banner if collection not found.
- **Offline Mode**: Cached collection available offline.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Collection detail with title, description, and reorderable memories."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Single column list with tap-to-move-up/down controls for reordering.
- **Tablet (768px – 1024px)**: Two-column grid with touch drag-and-drop.
- **Desktop (> 1024px)**: Three-column grid with pointer drag reordering and floating batch action bar.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/spaces/:spaceId/collections/:collectionId`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { collection: any, memories: Array<Memory> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`, `404 Not Found`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service`
- **Database Tables**: `memories`, `memory_tags`, `tags`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `collection.viewed`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: No
- **Privacy Architecture**: Curated memory order persisted per collection.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] reorders memory array on drag drop completion
  - [ ] filters out deleted memories
- **Integration Tests**:
  - [ ] PUT /api/spaces/:spaceId/collections/:collectionId/reorder saves order in database
- **End-to-End Acceptance Tests**:
  - [ ] reorders 2 items in collection, clicks Turn into Book, loads wizard

#### 17. UI Component Inventory
`CollectionBanner`, `ReorderableGrid`, `BatchActionBar`, `Button`

---

### PWA-31 — Create / Edit Thematic Collection View

**Category**: Web & PWA — Spaces & People  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Create a new themed collection or edit its title, narrative description, and cover photo.
- **User Story**: "As an archivist, I want to create a collection titled 'Liam Year 1' and set a cover photo so I can group baby photos together."

#### 2. Navigation & Routing
- **Entry Routes**: `/spaces/:spaceId/collections/new`, `/spaces/:spaceId/collections/:collectionId/edit`
- **Exit Routes**: `/spaces/:spaceId/collections/:collectionId`, `/spaces/:spaceId/collections`
- **Back Navigation**: `/spaces/:spaceId/collections`
- **Deep Link**: `https://memoria.local/spaces/:spaceId/collections/new`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member (Contributor+)
- **Required Capabilities**: `create_collection`, `edit_collection`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Title: 'Create Collection' or 'Edit Collection Details'.
- **Main Content**: Form: Collection Title, Narrative Description, Cover Photo selector (from existing space memories or device upload), Privacy visibility setting.
- **Footer / Actions Bar**: Cancel button and Save Collection button.

#### 5. Interactive Controls & UI Elements
- Collection Title input field
- Description textarea
- Cover Photo selector modal trigger
- Save Collection Button
- Cancel Button

#### 6. Form Validation & Data Schema

| Field Name | Data Type | Required | Limits & Constraints | Validation Rule | Error Copy |
|---|---|---|---|---|---|
| `title` | `text` | **Yes** | 1-120 characters | Standard type validation | Please provide a collection title. |
| `description` | `textarea` | No | 0-2000 characters | Standard type validation | Invalid value |

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Collection Title input field`
- **Tab Sequence**: `Title` -> `Description` -> `Cover selector` -> `Save button` -> `Cancel button`
- **Escape Key Action**: Prompts if dirty before closing

#### 8. States Matrix
- **Loading State**: Saving collection spinner.
- **Empty State**: Fresh inputs.
- **Populated State**: Pre-filled with existing collection data.
- **Error State**: Inline validation error alerts.
- **Offline Mode**: Queued in IndexedDB.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Collection configuration form. Title, description, and cover photo."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Full width form.
- **Tablet (768px – 1024px)**: Centered 560px card.
- **Desktop (> 1024px)**: Centered 640px card.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/spaces/:spaceId/collections`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ title: string, description?: string, coverMediaId?: string }`
- **Response Payload**: `{ success: true, data: { collectionId: string, title: string } }`
- **Status Codes**: `201 Created`, `400 Bad Request`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service`
- **Database Tables**: `tags`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `collection.created`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Collection created under space ownership.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] validates title length requirement
  - [ ] handles cover media ID assignment
- **Integration Tests**:
  - [ ] POST /api/spaces/:spaceId/collections creates record
- **End-to-End Acceptance Tests**:
  - [ ] submits collection form and redirects to collection detail

#### 17. UI Component Inventory
`CollectionForm`, `CoverSelector`, `Button`

---

### PWA-32 — Notification Center & System Notices

**Category**: Web & PWA — Spaces & People  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Review all invites, comments, media processing completions, OCR results, and system announcements.
- **User Story**: "As a collaborator, I want to inspect notifications so I know when grandmother commented on a photo or when a 3D book render finished."

#### 2. Navigation & Routing
- **Entry Routes**: `/notifications`, `/dashboard`
- **Exit Routes**: `/spaces/:spaceId`, `/memories/:memoryId`, `/books/:bookId`
- **Back Navigation**: `/dashboard`
- **Deep Link**: `https://memoria.local/notifications`

#### 3. Personas & Authorization
- **Eligible Roles**: Authenticated Member
- **Required Capabilities**: `view_notifications`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Title 'Notification Center' with 'Mark all as read' button and filter tabs (All, Comments, Invites, Processing).
- **Main Content**: List of notification rows: Category icon, Notification text with actor attribution, Timestamp, Action CTA (View Memory, Accept Invite, Inspect Book), Unread indicator dot.
- **Footer / Actions Bar**: Notification preferences link.

#### 5. Interactive Controls & UI Elements
- Button: 'Mark all as read'
- Filter tabs (All, Comments, Invites, Processing)
- Notification row click (navigates to relevant entity and marks read)
- Delete notification swipe / button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First unread notification`
- **Tab Sequence**: `Mark all read` -> `Filter tabs` -> `Notification list items`
- **Escape Key Action**: None

#### 8. States Matrix
- **Loading State**: List row skeleton pulse.
- **Empty State**: Warm illustration: 'You're all caught up. No new notifications.'
- **Populated State**: List with unread rows highlighted in Warm Ivory #F7F4EE with Plum #76556F unread dot.
- **Error State**: Error banner with refresh button.
- **Offline Mode**: Cached notifications shown with offline badge.
- **Permission Denied**: Redirect to login.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Notification center listing system alerts, comments, and space invitations."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Full width list with swipe actions.
- **Tablet (768px – 1024px)**: Centered 600px list.
- **Desktop (> 1024px)**: Centered 720px list with quick action buttons.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/notifications`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { notifications: Array<{ id: string, category: string, title: string, body: string, isRead: boolean, createdAt: string, entityUrl: string }> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `identity-service / memory-service`
- **Database Tables**: `audit_logs`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `notification.marked_read`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: No
- **Privacy Architecture**: Previews omit confidential story bodies from push payloads.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] marks single and all notifications as read
  - [ ] filters by category
- **Integration Tests**:
  - [ ] GET /api/notifications returns user specific notices
- **End-to-End Acceptance Tests**:
  - [ ] marks all notifications as read, verifies unread count updates to 0

#### 17. UI Component Inventory
`NotificationList`, `NotificationItem`, `FilterTabs`, `Button`

---

### 1.4 Memory Archive & Management (PWA-33 to PWA-48)

### PWA-33 — Memory Archive Grid & Masonry View

**Category**: Web & PWA — Archive & Media  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Browse all preserved memories in a responsive masonry grid with thumbnail-first rendering, format filters, and selection.
- **User Story**: "As an archivist, I want to view all family photos, documents, and recordings in a responsive gallery so I can easily find and review memories."

#### 2. Navigation & Routing
- **Entry Routes**: `/spaces/:spaceId/archive`, `/spaces/:spaceId`
- **Exit Routes**: `/memories/:memoryId`, `/create-memory?spaceId=:spaceId`
- **Back Navigation**: `/spaces/:spaceId`
- **Deep Link**: `https://memoria.local/spaces/:spaceId/archive`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member
- **Required Capabilities**: `view_archive`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Filter & search bar: Search memories, Filter by Format (Photos, Audio, Video, Story, Document), Person filter, Date range, Grid density toggle (Compact, Comfortable, Large).
- **Main Content**: Masonry gallery of Memory Cards: Thumbnail preview, Format icon badge, Title, Capture date, Tagged profiles avatars, Favorite heart icon.
- **Footer / Actions Bar**: Item count summary and pagination/infinite scroll loader.

#### 5. Interactive Controls & UI Elements
- Format filter buttons (Photos, Video, Audio, Story, Document)
- Grid density selector (2-col, 3-col, 4-col)
- Memory card click (opens Memory Detail modal PWA-38)
- Favorite toggle heart button on card hover
- Multi-select mode toggle button for bulk actions

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First memory card in grid`
- **Tab Sequence**: `Filter bar` -> `Density selector` -> `Memory cards` -> `Favorite buttons`
- **Keyboard Shortcuts**: `KeyF (Toggle Favorite on focused item)`, `Enter (Open memory)`, `KeyS (Toggle Select mode)`
- **Escape Key Action**: Exits multi-select mode

#### 8. States Matrix
- **Loading State**: Masonry skeleton with shimmering ivory card placeholders.
- **Empty State**: Archival empty state: 'No memories found matching these filters. Try adjusting your search or add a memory.'
- **Populated State**: Responsive masonry grid with thumbnail-first progressive image loading.
- **Error State**: Error banner with retry reload action.
- **Offline Mode**: Cached thumbnails and memory records served from local IndexedDB.
- **Permission Denied**: 403 Forbidden alert.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Memory archive gallery. Grid of photos and stories with filter options."
- **Touch Target Minimum**: `44x44 px for action targets`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: 2-column masonry grid with touch hold to select.
- **Tablet (768px – 1024px)**: 3-column masonry grid.
- **Desktop (> 1024px)**: 4 or 5-column balanced masonry grid with hover metadata overlays.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/spaces/:spaceId/memories`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `Query: { format?: MemoryFormat, profileId?: string, tag?: string, limit?: number, cursor?: string }`
- **Response Payload**: `{ success: true, data: { items: Array<Memory>, nextCursor: string | null } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service`
- **Database Tables**: `memories`, `memory_media`, `media_assets`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `archive.browsed`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: No
- **Privacy Architecture**: Only authorized members of the space can query memories.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] filters memory list by format and profile
  - [ ] calculates stable aspect ratios
- **Integration Tests**:
  - [ ] GET /api/spaces/:spaceId/memories supports cursor pagination
- **End-to-End Acceptance Tests**:
  - [ ] filters by Photos, toggles Favorite, verifies heart state updates

#### 17. UI Component Inventory
`MasonryGrid`, `MemoryCard`, `FilterBar`, `DensityToggle`

---

### PWA-34 — Comprehensive Historical Timeline View

**Category**: Web & PWA — Archive & Media  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Explore all memories across all spaces or a specific space organized strictly by historical capture date.
- **User Story**: "As an archivist, I want a comprehensive timeline with a month-by-month index so I can trace historical progression across decades."

#### 2. Navigation & Routing
- **Entry Routes**: `/timeline`, `/spaces/:spaceId/timeline`
- **Exit Routes**: `/memories/:memoryId`, `/dashboard`
- **Back Navigation**: `/dashboard`
- **Deep Link**: `https://memoria.local/timeline`

#### 3. Personas & Authorization
- **Eligible Roles**: Authenticated Member
- **Required Capabilities**: `view_timeline`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Timeline controls: Year jump slider, Space selector, Filter by Person.
- **Main Content**: Central vertical timeline axis with month markers (e.g. 'October 1974'), memory cards branching left and right with high-res thumbnails and captions.
- **Aside / Sidebar**: Decade jump bar (1940s through 2020s).
- **Footer / Actions Bar**: Timeline end banner.

#### 5. Interactive Controls & UI Elements
- Decade jump links
- Year slider scrubber
- Memory card click
- Sort order toggle (Chronological / Reverse)

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Decade jump bar`
- **Tab Sequence**: `Controls` -> `Decade links` -> `Timeline memory cards`
- **Escape Key Action**: None

#### 8. States Matrix
- **Loading State**: Timeline spine with pulsating skeleton cards.
- **Empty State**: Notice: 'No memories recorded yet for this timeframe.'
- **Populated State**: Fluid timeline in Deep Ink #20242C and Sage #849483 with historical cards.
- **Error State**: Error banner with refresh action.
- **Offline Mode**: Cached timeline served offline.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Chronological historical timeline listing memories by capture year and month."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Single side timeline with top sticky month/year header.
- **Tablet (768px – 1024px)**: Alternating card layout.
- **Desktop (> 1024px)**: Alternating card layout with right-hand sticky decade navigator.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/memories/timeline`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { timeline: Array<{ year: number, months: Array<{ month: number, memories: Array<Memory> }> }> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service`
- **Database Tables**: `memories`, `memory_media`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: _None_
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: No
- **Privacy Architecture**: Historical timestamps strictly preserved.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] sorts memories by captured_at ASC
  - [ ] groups by year and month without gaps
- **Integration Tests**:
  - [ ] GET /api/memories/timeline returns structured chronological payload
- **End-to-End Acceptance Tests**:
  - [ ] scrubs year slider to 1980, verifies smooth scroll to 1980 markers

#### 17. UI Component Inventory
`TimelineSpine`, `MonthHeader`, `TimelineCard`, `DecadeScrubber`

---

### PWA-35 — Calendar Memory Heatmap & Anniversary View

**Category**: Web & PWA — Archive & Media  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Inspect memories mapped to a traditional calendar grid, discover anniversaries, and view 'This Day in History'.
- **User Story**: "As a family member, I want to open the calendar view for June to see all birthdays, wedding anniversaries, and summer vacations preserved on each date."

#### 2. Navigation & Routing
- **Entry Routes**: `/calendar`, `/spaces/:spaceId/calendar`
- **Exit Routes**: `/calendar/:year/:month/:day`, `/memories/:memoryId`
- **Back Navigation**: `/dashboard`
- **Deep Link**: `https://memoria.local/calendar`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member
- **Required Capabilities**: `view_calendar`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Calendar navigation: Month/Year header (e.g. 'June 2024'), Previous Month button, Next Month button, Today button, Filter by Space.
- **Main Content**: 7-column Month Calendar Grid: Day numbers, Anniversary indicator badges (Birthdays, Weddings), Thumbnail dots/previews representing memories on that date.
- **Aside / Sidebar**: Selected Date inspector sidebar: list of memories captured on that day across all years.
- **Footer / Actions Bar**: Calendar legend (Memories, Birthdays, Anniversaries).

#### 5. Interactive Controls & UI Elements
- Month navigation chevrons (Prev, Next)
- Today button
- Calendar cell click (selects date and opens day memory panel)
- Memory card click in sidebar

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Today's calendar cell`
- **Tab Sequence**: `Navigation buttons` -> `Calendar grid cells` -> `Sidebar memory cards`
- **Keyboard Shortcuts**: `ArrowLeft (Prev Day)`, `ArrowRight (Next Day)`, `ArrowUp (Prev Week)`, `ArrowDown (Next Week)`
- **Escape Key Action**: Closes selected day sidebar

#### 8. States Matrix
- **Loading State**: Calendar grid skeleton pulse.
- **Empty State**: Empty cells indicate zero memories on that date.
- **Populated State**: Calendar cells decorated with thumbnail circles and anniversary tags.
- **Error State**: Error banner with refresh button.
- **Offline Mode**: Cached calendar rendered from local database.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Calendar memory view. Select a day to view historical memories and anniversaries."
- **Touch Target Minimum**: `44x44 px for all calendar date cells`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Compact calendar cells with count badges; tapping day opens bottom drawer.
- **Tablet (768px – 1024px)**: Full calendar grid with side day inspector.
- **Desktop (> 1024px)**: Expanded calendar grid with multi-thumbnail previews per cell.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/memories/calendar`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `Query: { month: number, year: number, spaceId?: string }`
- **Response Payload**: `{ success: true, data: { days: Record<string, { memoryCount: number, anniversaries: Array<string>, memories: Array<Memory> }> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service`
- **Database Tables**: `memories`, `space_profiles`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: _None_
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: No
- **Privacy Architecture**: Birthdays and anniversaries kept confidential within space.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] generates accurate calendar grid for leap years
  - [ ] maps memories to correct local day
- **Integration Tests**:
  - [ ] GET /api/memories/calendar aggregates memories by day of month
- **End-to-End Acceptance Tests**:
  - [ ] navigates to June, clicks June 15, inspects anniversary memory in sidebar

#### 17. UI Component Inventory
`CalendarGrid`, `CalendarCell`, `AnniversaryBadge`, `DayInspectorPanel`

---

### PWA-36 — Global Search & Faceted Filter View

**Category**: Web & PWA — Archive & Media  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Search across memories, people, scanned document text (OCR), tags, and locations with instant faceted filtering.
- **User Story**: "As an archivist looking for grandmother's handwritten recipe, I want to search 'pie crust' to find the scanned postcard matching OCR text."

#### 2. Navigation & Routing
- **Entry Routes**: `/search`, `/search?q=:query`
- **Exit Routes**: `/memories/:memoryId`, `/spaces/:spaceId/people/:profileId`
- **Back Navigation**: `/dashboard`
- **Deep Link**: `https://memoria.local/search?q=:query`

#### 3. Personas & Authorization
- **Eligible Roles**: Authenticated Member
- **Required Capabilities**: `search_memories`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Prominent search bar with instant query input, clear button, and total match counter.
- **Main Content**: 1. People match chips, 2. Memory search results grid with OCR text snippet highlights, 3. Tag pills match list.
- **Aside / Sidebar**: Faceted filter sidebar: Formats (Photos, Scans, Audio), Tag filters, Date range picker, Spaces selector.
- **Footer / Actions Bar**: Search tips.

#### 5. Interactive Controls & UI Elements
- Search input field with real-time debounced query
- Clear query button
- Facet checkboxes (Format, Person, Space, Date)
- Result card click (navigates to memory detail with highlighted search terms)

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Search input field`
- **Tab Sequence**: `Search bar` -> `Facet filters` -> `Search result cards`
- **Keyboard Shortcuts**: `Cmd+K (Focus search)`, `Escape (Clear query)`
- **Escape Key Action**: Clears search input

#### 8. States Matrix
- **Loading State**: Search result card skeleton pulse.
- **Empty State**: Notice: 'No memories match your query. Try broadening your terms or checking other spaces.'
- **Populated State**: Highlighted search results with snippet matches in story text and OCR documents.
- **Error State**: Error banner with refresh button.
- **Offline Mode**: IndexedDB full-text search executed locally across cached memories.
- **Permission Denied**: 403 Forbidden alert.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Global search results. Filter by format, person, space, and date."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Search bar at top, filter button opens bottom filter sheet, single column results.
- **Tablet (768px – 1024px)**: Two-column layout (Left filters 30%, Right results 70%).
- **Desktop (> 1024px)**: Centered max-width 1200px layout with sticky facet sidebar.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/search`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `Query: { q: string, format?: string, spaceId?: string, profileId?: string, page?: number }`
- **Response Payload**: `{ success: true, data: { items: Array<Memory & { matchSnippet?: string }>, total: number } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service / search-service`
- **Database Tables**: `memories`, `media_assets`, `tags`, `space_profiles`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `search.executed`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: No
- **Privacy Architecture**: Search queries strictly restricted to spaces where user holds active membership.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] highlights query substring safely without XSS risk
  - [ ] debounces search input by 300ms
- **Integration Tests**:
  - [ ] GET /api/search returns matches across story text and tags
- **End-to-End Acceptance Tests**:
  - [ ] searches 'recipe', verifies matching memory card appears with highlighted snippet

#### 17. UI Component Inventory
`SearchBar`, `FacetSidebar`, `SearchResultCard`, `MatchSnippet`

---

### PWA-37 — Favorites Collection & Starred Memories

**Category**: Web & PWA — Archive & Media  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Access all personal starred or favorite memories in one dedicated view.
- **User Story**: "As an archivist, I want to quickly review my favorited memories so I can select the best family photos for our annual heirloom book."

#### 2. Navigation & Routing
- **Entry Routes**: `/favorites`, `/dashboard`
- **Exit Routes**: `/memories/:memoryId`, `/books/new?favorites=true`
- **Back Navigation**: `/dashboard`
- **Deep Link**: `https://memoria.local/favorites`

#### 3. Personas & Authorization
- **Eligible Roles**: Authenticated Member
- **Required Capabilities**: `view_favorites`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Title 'Favorited Memories' with 'Create Book from Favorites' button and filter pills.
- **Main Content**: Masonry gallery of starred memory cards with heart badges in Plum #76556F.
- **Footer / Actions Bar**: Favorite items count summary.

#### 5. Interactive Controls & UI Elements
- Button: 'Turn Favorites into Book'
- Memory card click
- Unstar heart button (with undo toast notification)
- Filter by Space dropdown

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First favorite memory card`
- **Tab Sequence**: `Turn into Book button` -> `Space filter` -> `Memory cards`
- **Escape Key Action**: None

#### 8. States Matrix
- **Loading State**: Masonry card skeletons.
- **Empty State**: Warm illustration: 'You have no favorited memories yet. Tap the heart on any memory to save it here.'
- **Populated State**: Curated grid of highest-sentiment family photographs and stories.
- **Error State**: Error banner with reload button.
- **Offline Mode**: Cached favorites displayed offline.
- **Permission Denied**: 401 Unauthorized.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Favorited memories gallery with option to author a book."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: 2-column masonry grid.
- **Tablet (768px – 1024px)**: 3-column grid.
- **Desktop (> 1024px)**: 4-column balanced grid.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/memories/favorites`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { items: Array<Memory> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service`
- **Database Tables**: `memories`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: _None_
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: No
- **Privacy Architecture**: Favorites stored per user-space membership.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] removes item from view with undo toast when heart clicked
- **Integration Tests**:
  - [ ] GET /api/memories/favorites filters by is_favorite = true
- **End-to-End Acceptance Tests**:
  - [ ] navigates to favorites, unstars a memory, verifies immediate update

#### 17. UI Component Inventory
`FavoritesGrid`, `MemoryCard`, `UndoToast`, `Button`

---

### PWA-38 — Full Memory Detail Modal & Narrative Page

**Category**: Web & PWA — Archive & Media  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Inspect a memory's high-resolution media, read the written narrative story, review EXIF metadata, listen to attached audio, and read comments.
- **User Story**: "As a family member, I want to open a memory to see the full photograph, read grandmother's handwritten recipe transcription, and listen to her voice recording."

#### 2. Navigation & Routing
- **Entry Routes**: `/memories/:memoryId`, `/spaces/:spaceId/archive`
- **Exit Routes**: `/spaces/:spaceId/archive`, `/memories/:memoryId/edit`
- **Back Navigation**: `/spaces/:spaceId/archive`
- **Deep Link**: `https://memoria.local/memories/:memoryId`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member
- **Required Capabilities**: `view_memory`, `edit_memory (Author/Editor)`, `comment_memory`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Top modal bar: Memory title, Capture date (e.g. 'August 14, 1968'), Location badge, Edit button, Favorite toggle, Close (X) button.
- **Main Content**: 1. High-resolution media viewer (image carousel, video player, audio player), 2. Story narrative card with serif typography, 3. Tagged profiles pills, 4. EXIF technical data panel (Camera, Lens, ISO, Dimensions, SHA-256), 5. Comments & family discussions thread.
- **Footer / Actions Bar**: Add comment input field and reaction buttons.

#### 5. Interactive Controls & UI Elements
- Image zoom & inspect trigger
- Audio play/pause waveform button
- Profile tag pills (click to view profile)
- Edit Memory Button (Author / Editor only)
- Favorite heart toggle button
- Comment submit form button
- Close Modal button (Escape)

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Modal title`
- **Tab Sequence**: `Close button` -> `Media viewer` -> `Audio player` -> `Edit button` -> `Comment input` -> `Submit button`
- **Keyboard Shortcuts**: `Escape (Close modal)`, `KeyE (Edit memory)`, `KeyF (Favorite)`
- **Escape Key Action**: Closes modal and restores background scroll position

#### 8. States Matrix
- **Loading State**: Modal detail skeleton with pulsing media area and text lines.
- **Empty State**: N/A
- **Populated State**: Immersive memory view with rich narrative in Cormorant Garamond, crisp archival photography, audio waveform.
- **Error State**: Error banner if memory is not found or has been deleted.
- **Offline Mode**: Cached memory details and thumbnails served offline.
- **Permission Denied**: 403 Forbidden screen if user lacks space membership.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Memory details: Title, capture date, location, attached photo with description, narrative story, and comments."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `7.2:1 (Deep Ink on Warm Ivory)`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Full screen sheet with vertical stack: media top, story middle, comments bottom.
- **Tablet (768px – 1024px)**: Two-column modal (Media left 55%, Narrative & Comments right 45%).
- **Desktop (> 1024px)**: Expansive two-column layout max-width 1200px with near-black photo viewing capability.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/memories/:memoryId`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { memory: Memory, media: Array<MediaAsset>, comments: Array<any>, profiles: Array<SpaceProfile> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service`
- **Database Tables**: `memories`, `memory_media`, `media_assets`, `memory_profiles`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `memory.viewed`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: No
- **Privacy Architecture**: Original byte checksum exposed for archival provenance; private media URLs signed.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] renders story markdown safely without HTML injection
  - [ ] formats capture date vs upload date clearly
- **Integration Tests**:
  - [ ] GET /api/memories/:memoryId returns complete memory record with media relations
- **End-to-End Acceptance Tests**:
  - [ ] opens memory detail, plays attached audio note, submits a family comment

#### 17. UI Component Inventory
`MemoryModal`, `MediaCarousel`, `WaveformPlayer`, `StoryTypography`, `CommentThread`

---

### PWA-39 — Create Memory Type Selection Dialog

**Category**: Web & PWA — Archive & Media  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Choose the primary format for a new memory (Photos, Video, Voice Recording, Written Story, or Scanned Document).
- **User Story**: "As an archivist, I want to choose whether I am uploading scanned photos, recording an audio story, or writing a memoir chapter."

#### 2. Navigation & Routing
- **Entry Routes**: `/create-memory`, `/dashboard`, `/spaces/:spaceId`
- **Exit Routes**: `/create-memory/media`, `/create-memory/audio`, `/create-memory/story`, `/create-memory/document`
- **Back Navigation**: `/dashboard`
- **Deep Link**: `https://memoria.local/create-memory`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member (Contributor+)
- **Required Capabilities**: `create_memory`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Dialog title: 'Preserve a New Memory' with close button.
- **Main Content**: 5 format option cards: 1. Photographs & Albums, 2. Video Clips & Home Movies, 3. Voice Recording & Oral History, 4. Written Memoir & Quotes, 5. Scanned Documents & Letters.
- **Footer / Actions Bar**: Cancel button.

#### 5. Interactive Controls & UI Elements
- Option card click: 'Photographs'
- Option card click: 'Video'
- Option card click: 'Voice Note'
- Option card click: 'Written Story'
- Option card click: 'Document'
- Close / Cancel button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First option card (Photographs)`
- **Tab Sequence**: `Option cards 1-5` -> `Cancel button`
- **Keyboard Shortcuts**: `KeyP (Photos)`, `KeyV (Video)`, `KeyA (Audio)`, `KeyS (Story)`, `KeyD (Document)`
- **Escape Key Action**: Closes dialog

#### 8. States Matrix
- **Loading State**: N/A
- **Empty State**: N/A
- **Populated State**: Cards decorated with archival icons and explanatory subtitles.
- **Error State**: N/A
- **Offline Mode**: Fully accessible offline.
- **Permission Denied**: Alert if user is only Viewer in the active space.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Select memory type dialog. Choose from photographs, video, voice note, story, or document."
- **Touch Target Minimum**: `48x48 px`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Bottom sheet with vertical list of buttons.
- **Tablet (768px – 1024px)**: Centered modal with 2-column card grid.
- **Desktop (> 1024px)**: Centered modal with 3-column card grid.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `N/A` `N/A (Client-side routing dialog)`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `N/A`
- **Status Codes**: `200 OK`

#### 13. Service Architecture & Persistence
- **Backend Service**: `web`
- **Database Tables**: _None (Stateless / InMemory)_
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: _None_
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `None`
- **Security Audit Logged**: No
- **Privacy Architecture**: Client dialog.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] routes to correct workflow on card selection
  - [ ] checks space contributor permissions
- **Integration Tests**:
  - [ ] opens target workflow with active spaceId preserved
- **End-to-End Acceptance Tests**:
  - [ ] clicks + button, selects Voice Recording, verifies microphone prompt

#### 17. UI Component Inventory
`TypeSelectionDialog`, `FormatOptionCard`, `Button`

---

### PWA-40 — Media Selection & Direct-to-Storage Upload Modal

**Category**: Web & PWA — Archive & Media  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Select multi-file photos, videos, or documents, preview them, and initiate direct-to-storage resumable uploads.
- **User Story**: "As an archivist, I want to select 20 family photos from my local disk and upload them with real-time SHA-256 integrity verification."

#### 2. Navigation & Routing
- **Entry Routes**: `/create-memory/media`, `/create-memory`
- **Exit Routes**: `/create-memory/metadata`, `/spaces/:spaceId/archive`
- **Back Navigation**: `/create-memory`
- **Deep Link**: `https://memoria.local/create-memory/media`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member (Contributor+)
- **Required Capabilities**: `upload_media`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Modal title: 'Upload Archival Media' with space name and close button.
- **Main Content**: 1. Drag-and-drop target zone, 2. 'Choose Files' button (multi-select), 3. Selected files preview list (thumbnail, file name, size, SHA-256 status), 4. Overall upload progress bar.
- **Footer / Actions Bar**: Cancel button and 'Continue to Memory Details' button.

#### 5. Interactive Controls & UI Elements
- File picker input trigger button
- Remove item button on individual file cards
- Upload All Button
- Cancel Button

#### 6. Form Validation & Data Schema

| Field Name | Data Type | Required | Limits & Constraints | Validation Rule | Error Copy |
|---|---|---|---|---|---|
| `files` | `file[]` | **Yes** | Max 500MB per file; max 50 files per batch | Standard type validation | File exceeds 500MB limit or format unsupported. |

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Choose Files button`
- **Tab Sequence**: `Choose Files` -> `Selected file cards` -> `Upload All button` -> `Cancel button`
- **Escape Key Action**: Warns if upload is active before closing

#### 8. States Matrix
- **Loading State**: Uploading files with individual and batch progress bars.
- **Empty State**: Dropzone prompt: 'Drag photos or documents here, or browse files.'
- **Populated State**: File cards showing instant thumbnail preview and byte size.
- **Error State**: Oversized file or network error badge with retry button.
- **Offline Mode**: Queued in IndexedDB offline upload queue.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Media selection modal. Choose files to upload with drag and drop support."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Full screen modal with direct camera / photo roll access.
- **Tablet (768px – 1024px)**: Centered modal max-width 640px.
- **Desktop (> 1024px)**: Centered modal max-width 780px with drag hover elevation.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/media/upload-session`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ spaceId: string, fileName: string, mimeType: string, fileSizeBytes: number, checksumSha256?: string }`
- **Response Payload**: `{ success: true, data: { mediaId: string, uploadUrl: string, storageKey: string } }`
- **Status Codes**: `200 OK`, `400 Bad Request`, `413 Payload Too Large`

#### 13. Service Architecture & Persistence
- **Backend Service**: `media-service`
- **Database Tables**: `media_assets`, `space_storage_quotas`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `media.upload_session_created`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Media uploaded directly to tenant-isolated disk storage.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] validates MIME type against whitelist
  - [ ] calculates progressive chunk upload percent
- **Integration Tests**:
  - [ ] POST /api/media/upload-session validates storage quota before issuing token
- **End-to-End Acceptance Tests**:
  - [ ] selects test image fixture, observes upload complete, proceeds to metadata form

#### 17. UI Component Inventory
`UploadModal`, `DropZone`, `FileListPreview`, `ProgressBar`, `Button`

---

### PWA-41 — Floating Upload Queue & Background Sync Hub

**Category**: Web & PWA — Archive & Media  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Monitor multi-file background upload progress, checksum hashing, and derivative thumbnail generation.
- **User Story**: "As an archivist uploading 50 scanned family letters, I want a floating upload queue widget so I can continue browsing while processing finishes."

#### 2. Navigation & Routing
- **Entry Routes**: `/upload-queue`, `Floating widget on all pages`
- **Exit Routes**: `/spaces/:spaceId/archive`, `/upload-failures`
- **Back Navigation**: `/`
- **Deep Link**: `https://memoria.local/upload-queue`

#### 3. Personas & Authorization
- **Eligible Roles**: Authenticated Member
- **Required Capabilities**: `view_upload_queue`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Floating pill header: 'Uploading 3 of 12 items (42%)', Minimize / Expand chevron button, Close button.
- **Main Content**: Scrollable queue list: File thumbnail, File name, Status badge (Queued, Uploading, Processing Derivatives, Complete, Failed), Progress bar, Cancel button.
- **Footer / Actions Bar**: 'Pause All' and 'Clear Completed' buttons.

#### 5. Interactive Controls & UI Elements
- Minimize / Expand widget toggle
- Cancel item upload (X button)
- Pause All uploads button
- Resume All uploads button
- Clear completed items button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Expand widget button`
- **Tab Sequence**: `Expand button` -> `Queue items` -> `Cancel buttons` -> `Clear button`
- **Escape Key Action**: Minimizes widget

#### 8. States Matrix
- **Loading State**: Live active transfer with streaming percentage bars.
- **Empty State**: Widget auto-minimizes when queue is empty.
- **Populated State**: Floating panel in bottom-right corner with smooth progress animations.
- **Error State**: Amber failed state indicator with 'View 2 failed items' link.
- **Offline Mode**: Paused badge with notice: 'Waiting for local network reconnection...'
- **Permission Denied**: N/A

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Floating upload queue announcing active transfer percentage and completed files."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Docked bottom bar expanding to full screen drawer.
- **Tablet (768px – 1024px)**: Floating bottom-right card (360px width).
- **Desktop (> 1024px)**: Floating bottom-right card (420px width) with backdrop blur.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/media/upload-sessions/active`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { activeSessions: Array<{ mediaId: string, fileName: string, progressPercent: number, status: string }> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `media-service`
- **Database Tables**: `media_assets`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `media.upload_progress_updated`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: No
- **Privacy Architecture**: Only shows user's own upload sessions.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] aggregates total batch percentage accurately
  - [ ] removes completed items on clear
- **Integration Tests**:
  - [ ] polls or listens to SSE upload progress events
- **End-to-End Acceptance Tests**:
  - [ ] minimizes and expands upload widget, cancels an active file

#### 17. UI Component Inventory
`FloatingQueuePill`, `QueueList`, `QueueItem`, `ProgressBar`, `Button`

---

### PWA-42 — Upload Failures, Conflict Resolution & Retry Center

**Category**: Web & PWA — Archive & Media  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Inspect failed uploads, resolve offline merge conflicts, review human-readable failure causes, and retry safely.
- **User Story**: "As an archivist working on an intermittent connection, I want to review failed uploads and resolve conflicts without losing either version."

#### 2. Navigation & Routing
- **Entry Routes**: `/upload-failures`, `/upload-queue`
- **Exit Routes**: `/spaces/:spaceId/archive`, `/dashboard`
- **Back Navigation**: `/dashboard`
- **Deep Link**: `https://memoria.local/upload-failures`

#### 3. Personas & Authorization
- **Eligible Roles**: Authenticated Member
- **Required Capabilities**: `retry_uploads`, `resolve_conflicts`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Title 'Upload Troubleshooting & Conflicts' with 'Retry All Failed' button.
- **Main Content**: Failed item cards: File preview, Failure reason (e.g. 'Network timeout during SHA-256 verification', 'Storage quota exceeded', 'Concurrent edit conflict'), 'Keep Both Versions' toggle, 'Retry' button, 'Discard' button.
- **Footer / Actions Bar**: Local disk space check helper.

#### 5. Interactive Controls & UI Elements
- Button: 'Retry All Failed'
- Button: 'Retry Item'
- Button: 'Keep Both (Resolve Conflict)'
- Button: 'Discard Item'

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First failed item card`
- **Tab Sequence**: `Retry All` -> `Failed items` -> `Resolution buttons`
- **Escape Key Action**: None

#### 8. States Matrix
- **Loading State**: Retrying transfer spinner.
- **Empty State**: Notice: 'All uploads verified and complete. Zero conflicts detected.'
- **Populated State**: Card list detailing exact failure diagnostics and resolution paths.
- **Error State**: Alert banner if retry fails again with suggested action.
- **Offline Mode**: Offline indicator explaining that retry will resume automatically on reconnection.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Upload failure and conflict resolution center. Review failed files and retry."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Single column card list.
- **Tablet (768px – 1024px)**: Centered 600px list.
- **Desktop (> 1024px)**: Centered 760px list with side-by-side conflict comparison.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/media/upload-sessions/:sessionId/retry`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { status: 'restarted', uploadUrl: string } }`
- **Status Codes**: `200 OK`, `400 Bad Request`, `404 Not Found`

#### 13. Service Architecture & Persistence
- **Backend Service**: `media-service`
- **Database Tables**: `media_assets`, `audit_logs`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `media.upload_retried`
- **BullMQ Background Jobs**: `resume-media-upload`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Conflict resolutions preserve both copies to prevent archival data loss.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] preserves both versions on conflict resolution
  - [ ] displays human-readable error messages
- **Integration Tests**:
  - [ ] POST /api/media/upload-sessions/:sessionId/retry re-opens upload session
- **End-to-End Acceptance Tests**:
  - [ ] retries failed file, observes progress update to complete

#### 17. UI Component Inventory
`FailureCard`, `ConflictResolver`, `Button`

---

### PWA-43 — High-Resolution Image Viewer & Non-Destructive Studio

**Category**: Web & PWA — Archive & Media  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Inspect photographs in full-viewport near-black canvas, zoom up to 400%, pan, rotate, and crop non-destructively.
- **User Story**: "As an archivist, I want to zoom in on a 1920 family portrait to examine faces in high detail without altering the original archival master."

#### 2. Navigation & Routing
- **Entry Routes**: `/memories/:memoryId/photo/:mediaId`, `/memories/:memoryId`
- **Exit Routes**: `/memories/:memoryId`, `/spaces/:spaceId/archive`
- **Back Navigation**: `/memories/:memoryId`
- **Deep Link**: `https://memoria.local/memories/:memoryId/photo/:mediaId`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member
- **Required Capabilities**: `view_high_res_photo`, `crop_photo (Contributor+)`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Minimal dark HUD over media: File name, Zoom level (e.g. '150%'), Download Original button, Close button.
- **Main Content**: Full-viewport near-black (#0D0E11) canvas with high-resolution pan and zoom canvas, crop boundary overlay.
- **Footer / Actions Bar**: Bottom floating HUD: Zoom in (+), Zoom out (-), Fit to screen, Rotate 90°, Crop toggle, Reset adjustments, Close.

#### 5. Interactive Controls & UI Elements
- Zoom In Button (+)
- Zoom Out Button (-)
- Fit to Screen Button
- Rotate 90° Clockwise Button
- Crop Tool Toggle Button
- Download Archival Original Button
- Close Viewer Button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Fit to screen button`
- **Tab Sequence**: `Top HUD buttons` -> `Bottom HUD controls`
- **Keyboard Shortcuts**: `Plus/Equal (Zoom in)`, `Minus (Zoom out)`, `KeyR (Rotate)`, `Key0 (Fit)`, `Escape (Close viewer)`
- **Escape Key Action**: Closes viewer and returns to memory detail

#### 8. States Matrix
- **Loading State**: Progressive rendering: displays fast blurred thumbnail while fetching full resolution master.
- **Empty State**: N/A
- **Populated State**: Crystal clear full resolution image with pan inertia.
- **Error State**: Error banner if master file fails to load.
- **Offline Mode**: Local high-res derivative cached in service worker.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Full-screen high-resolution photo viewer. Use keyboard shortcuts or HUD to zoom and pan."
- **Touch Target Minimum**: `48x48 px floating controls`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `12:1 (White icons over #0D0E11 near-black canvas)`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Pinch-to-zoom gestures, double-tap to toggle 200% zoom, swipe down to dismiss.
- **Tablet (768px – 1024px)**: Touch pan and pinch gestures, floating pill controls.
- **Desktop (> 1024px)**: Mouse wheel smooth zoom, drag to pan, full keyboard navigation.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/media/:mediaId/original`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `Binary stream with Content-Disposition header and SHA-256 header`
- **Status Codes**: `200 OK`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`

#### 13. Service Architecture & Persistence
- **Backend Service**: `media-service`
- **Database Tables**: `media_assets`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `media.original_viewed`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: No
- **Privacy Architecture**: Original master bytes preserved immutably; non-destructive crops stored as metadata transforms.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] calculates zoom scale and pan boundaries correctly
  - [ ] preserves original metadata during crop
- **Integration Tests**:
  - [ ] GET /api/media/:mediaId/original returns signed binary with correct SHA-256
- **End-to-End Acceptance Tests**:
  - [ ] zooms to 200%, pans canvas, presses Escape to exit back to memory detail

#### 17. UI Component Inventory
`NearBlackCanvas`, `PanZoomStage`, `ViewerHUD`, `CropOverlay`

---

### PWA-44 — Archival Video Player & Timestamp View

**Category**: Web & PWA — Archive & Media  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Play home movies and digitized VHS tapes with closed captions, memory timestamp bookmarks, and scrub controls.
- **User Story**: "As an archivist, I want to watch a digitized 1985 Christmas home video and jump directly to the timestamp when baby walked."

#### 2. Navigation & Routing
- **Entry Routes**: `/memories/:memoryId/video/:mediaId`, `/memories/:memoryId`
- **Exit Routes**: `/memories/:memoryId`, `/spaces/:spaceId/archive`
- **Back Navigation**: `/memories/:memoryId`
- **Deep Link**: `https://memoria.local/memories/:memoryId/video/:mediaId`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member
- **Required Capabilities**: `view_video`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Video title, capture date, download video button, close button.
- **Main Content**: 16:9 HTML5 video player with custom accessible controls, caption toggle, playback speed selector.
- **Aside / Sidebar**: Timestamp bookmarks panel (e.g. '01:24 Opening gifts', '04:10 Snowball fight').
- **Footer / Actions Bar**: Video narrative notes.

#### 5. Interactive Controls & UI Elements
- Play / Pause button (Space)
- Seek bar scrubber
- Volume slider and Mute button
- Closed Captions (CC) toggle
- Playback Speed menu (0.5x, 1x, 1.25x, 1.5x)
- Timestamp bookmark buttons
- Fullscreen toggle

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Play / Pause button`
- **Tab Sequence**: `Play` -> `Seek bar` -> `Volume` -> `Captions` -> `Speed` -> `Bookmarks` -> `Close`
- **Keyboard Shortcuts**: `Space (Toggle Play)`, `ArrowRight (Seek +5s)`, `ArrowLeft (Seek -5s)`, `KeyM (Mute)`, `KeyF (Fullscreen)`
- **Escape Key Action**: Exits fullscreen or closes video modal

#### 8. States Matrix
- **Loading State**: Video buffer spinner with poster frame.
- **Empty State**: N/A
- **Populated State**: Smooth playback with progressive streaming.
- **Error State**: Codec unsupported or network failure message with option to download original.
- **Offline Mode**: Offline playback available if video was pre-downloaded.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Video player. Use spacebar to play or pause, arrow keys to seek."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Full width video player with touch scrubber; bookmarks below player.
- **Tablet (768px – 1024px)**: Centered video with right-hand bookmarks panel.
- **Desktop (> 1024px)**: Max-width 1000px theater mode layout.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/media/:mediaId/stream`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `Byte-range streaming video (206 Partial Content)`
- **Status Codes**: `200 OK`, `206 Partial Content`, `401 Unauthorized`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `media-service`
- **Database Tables**: `media_assets`, `memories`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `media.video_played`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: No
- **Privacy Architecture**: Private home video streams token-authenticated.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] handles keyboard shortcuts for seek and mute
  - [ ] jumps to timestamp on bookmark click
- **Integration Tests**:
  - [ ] GET /api/media/:mediaId/stream supports Range header
- **End-to-End Acceptance Tests**:
  - [ ] starts video, seeks to 00:30 via bookmark, confirms video time

#### 17. UI Component Inventory
`VideoPlayer`, `CustomControls`, `TimestampList`, `CaptionOverlay`

---

### PWA-45 — Audio Recording Studio & Waveform Voice-Note Player

**Category**: Web & PWA — Archive & Media  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Record oral history stories directly in browser with live audio waveform visualization, pause/resume, and playback.
- **User Story**: "As an interviewer, I want to record grandfather telling the story of how he met grandmother, with live visual feedback and pause support."

#### 2. Navigation & Routing
- **Entry Routes**: `/create-memory/audio`, `/create-memory`
- **Exit Routes**: `/create-memory/metadata`, `/spaces/:spaceId/archive`
- **Back Navigation**: `/create-memory`
- **Deep Link**: `https://memoria.local/create-memory/audio`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member (Contributor+)
- **Required Capabilities**: `record_audio`, `upload_media`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Studio title: 'Oral History Recording' with microphone input selector.
- **Main Content**: 1. Large timer display (00:00 / max 60:00), 2. Live canvas audio waveform visualizer, 3. Recording controls (Record / Pause / Resume / Stop), 4. Playback review scrubber.
- **Footer / Actions Bar**: 'Discard Recording' button and 'Save Oral History' button.

#### 5. Interactive Controls & UI Elements
- Microphone permission prompt button
- Record / Pause Toggle Button (Red circular trigger)
- Stop & Review Button
- Playback Play/Pause button
- Discard Recording button (with confirmation modal)
- Save Audio & Continue button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Record button`
- **Tab Sequence**: `Microphone selector` -> `Record button` -> `Stop button` -> `Discard button` -> `Save button`
- **Keyboard Shortcuts**: `Space (Toggle Record/Pause)`, `KeyS (Stop)`
- **Escape Key Action**: Prompts if active recording exists

#### 8. States Matrix
- **Loading State**: Requesting microphone hardware permission spinner.
- **Empty State**: Ready to record with microphone icon and zeroed timer.
- **Populated State**: Live animated green/plum waveform reacting to vocal amplitude.
- **Error State**: Microphone permission denied banner with browser instructions.
- **Offline Mode**: Audio recorded locally into IndexedDB Blob; ready to sync.
- **Permission Denied**: Permission denied alert.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Audio recording studio. Live timer and recording controls for oral history."
- **Touch Target Minimum**: `56x56 px main record button`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Large tactile record button, simplified waveform display.
- **Tablet (768px – 1024px)**: Full canvas waveform with detailed timer and audio meter.
- **Desktop (> 1024px)**: Studio layout with audio input device dropdown and stereo level bars.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/media/upload-audio`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `Multipart audio/webm or audio/mp4 blob with spaceId`
- **Response Payload**: `{ success: true, data: { mediaId: string, durationSeconds: number, waveformUrl: string } }`
- **Status Codes**: `201 Created`, `400 Bad Request`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `media-service`
- **Database Tables**: `media_assets`, `memories`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `media.audio_recorded`
- **BullMQ Background Jobs**: `generate-audio-waveform`, `transcribe-audio`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Oral history voice recordings stored without cloud AI leakage.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] manages MediaRecorder state transitions (inactive, recording, paused)
  - [ ] formats timer accurately
- **Integration Tests**:
  - [ ] POST /api/media/upload-audio persists audio asset
- **End-to-End Acceptance Tests**:
  - [ ] grants mic mock, records 5 seconds, pauses, reviews playback, saves audio

#### 17. UI Component Inventory
`AudioStudio`, `WaveformCanvas`, `RecordButton`, `TimerDisplay`, `Button`

---

### PWA-46 — Story & Quote Rich-Text Typographic Editor

**Category**: Web & PWA — Archive & Media  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Write or edit rich narrative stories, family anecdotes, pull-quotes, and letters with editorial serif typography.
- **User Story**: "As an archivist, I want to compose a 2-page family story with pull quotes, drop caps, and italics that will print beautifully in our book."

#### 2. Navigation & Routing
- **Entry Routes**: `/create-memory/story`, `/memories/:memoryId/edit`
- **Exit Routes**: `/memories/:memoryId`, `/spaces/:spaceId/archive`
- **Back Navigation**: `/spaces/:spaceId/archive`
- **Deep Link**: `https://memoria.local/create-memory/story`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member (Contributor+)
- **Required Capabilities**: `edit_story`, `create_memory`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Editor toolbar: Heading 1, Heading 2, Bold, Italic, Pull Quote styling, Drop Cap toggle, Link, Attach Photo, Autosave indicator ('Saved 2s ago').
- **Main Content**: Distraction-free editorial canvas with Cormorant Garamond typography on Warm Ivory #F7F4EE background.
- **Aside / Sidebar**: Metadata drawer: Capture date picker, Location input, Tagged Profiles selector, Tags input.
- **Footer / Actions Bar**: Word count, reading time estimate, 'Cancel' and 'Publish Memory' buttons.

#### 5. Interactive Controls & UI Elements
- Formatting buttons (Bold, Italic, Quote, Heading)
- Story Title input field
- Rich text content area (ContentEditable / ProseMirror)
- Capture Date picker
- Attach Media button
- Publish Memory Button

#### 6. Form Validation & Data Schema

| Field Name | Data Type | Required | Limits & Constraints | Validation Rule | Error Copy |
|---|---|---|---|---|---|
| `title` | `text` | **Yes** | 1-120 characters | Standard type validation | Please provide a title for this story. |
| `content` | `textarea` | **Yes** | 1-20000 characters | Standard type validation | Story content cannot be empty. |

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Story Title input`
- **Tab Sequence**: `Toolbar` -> `Title` -> `Content area` -> `Metadata inputs` -> `Publish button`
- **Keyboard Shortcuts**: `Cmd+B (Bold)`, `Cmd+I (Italic)`, `Cmd+S (Save draft)`
- **Escape Key Action**: Warns if unsaved changes exist

#### 8. States Matrix
- **Loading State**: Saving story spinner.
- **Empty State**: Title and content placeholders encouraging heartfelt writing.
- **Populated State**: Typographically styled text with pull quotes and drop caps.
- **Error State**: Conflict banner if edited concurrently by another family member.
- **Offline Mode**: Autosaved continuously into local IndexedDB.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Rich text story editor. Write family memories with formatting toolbar."
- **Touch Target Minimum**: `44x44 px for toolbar buttons`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Mobile keyboard toolbar above virtual keyboard, full width editor.
- **Tablet (768px – 1024px)**: Centered 680px editor canvas.
- **Desktop (> 1024px)**: Centered 780px distraction-free canvas with right-hand metadata drawer.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/memories`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ spaceId: string, title: string, content: string, format: 'story', capturedAt: string, associatedProfileIds?: string[], tags?: string[] }`
- **Response Payload**: `{ success: true, data: { memory: Memory } }`
- **Status Codes**: `201 Created`, `400 Bad Request`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service`
- **Database Tables**: `memories`, `memory_profiles`, `memory_tags`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `memory.created`
- **BullMQ Background Jobs**: `index-memory-search`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Personal family writings protected by space authorization.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] sanitizes HTML input preventing XSS attacks
  - [ ] autosaves to localStorage every 5 seconds
- **Integration Tests**:
  - [ ] POST /api/memories stores story content and relations in transaction
- **End-to-End Acceptance Tests**:
  - [ ] types story with bold text, adds capture date, clicks Publish, verifies rendered detail

#### 17. UI Component Inventory
`RichTextEditor`, `EditorToolbar`, `MetadataDrawer`, `AutosaveBadge`, `Button`

---

### PWA-47 — Archival Document Viewer & OCR Inspector

**Category**: Web & PWA — Archive & Media  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Inspect scanned historical documents, letters, postcards, and certificates alongside extracted OCR text.
- **User Story**: "As an archivist, I want to inspect a scanned 1918 birth certificate and view the machine OCR text side-by-side with confidence scores."

#### 2. Navigation & Routing
- **Entry Routes**: `/memories/:memoryId/document/:mediaId`, `/memories/:memoryId`
- **Exit Routes**: `/memories/:memoryId`, `/spaces/:spaceId/archive`
- **Back Navigation**: `/memories/:memoryId`
- **Deep Link**: `https://memoria.local/memories/:memoryId/document/:mediaId`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member
- **Required Capabilities**: `view_document`, `edit_ocr (Contributor+)`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Document title, page counter ('Page 1 of 4'), Download Original PDF/Image button, Close button.
- **Main Content**: Two-panel split view: Left panel: High-resolution zoomable scanned document page. Right panel: Extracted OCR text with editable corrections, confidence score badge (e.g. 'OCR Confidence: 94%'), copy text button.
- **Footer / Actions Bar**: Page navigation chevrons and zoom HUD.

#### 5. Interactive Controls & UI Elements
- Previous Page Button
- Next Page Button
- Zoom In / Out buttons
- Copy Extracted Text button
- Edit OCR text trigger button
- Download Archival PDF button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Document canvas`
- **Tab Sequence**: `Page chevrons` -> `Zoom controls` -> `Copy text button` -> `OCR text area`
- **Keyboard Shortcuts**: `ArrowRight (Next page)`, `ArrowLeft (Prev page)`, `Cmd+C (Copy text)`
- **Escape Key Action**: Closes viewer

#### 8. States Matrix
- **Loading State**: Rendering PDF canvas and loading OCR text skeleton.
- **Empty State**: Notice: 'No OCR text extracted yet. OCR processing is running in background.'
- **Populated State**: Side-by-side archival scan and searchable digitized text.
- **Error State**: Error banner if document fails to rasterize.
- **Offline Mode**: Cached document pages available offline.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Document viewer showing scanned historical document with synchronized OCR text transcription."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Tabbed view: Document tab and OCR Text tab.
- **Tablet (768px – 1024px)**: Stacked view: Document top, OCR text bottom.
- **Desktop (> 1024px)**: Side-by-side 50/50 split view with adjustable splitter divider.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/media/:mediaId/ocr`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { text: string, confidence: number, pages: Array<{ pageNumber: number, text: string }> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`, `404 Not Found`

#### 13. Service Architecture & Persistence
- **Backend Service**: `media-service`
- **Database Tables**: `media_assets`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `document.ocr_viewed`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: No
- **Privacy Architecture**: OCR text derived and indexed locally via Tesseract engine.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] renders multipage navigation
  - [ ] allows correcting OCR text and updates search index
- **Integration Tests**:
  - [ ] GET /api/media/:mediaId/ocr returns structured page OCR payload
- **End-to-End Acceptance Tests**:
  - [ ] navigates document pages, copies OCR text to clipboard, confirms feedback toast

#### 17. UI Component Inventory
`DocumentCanvas`, `OCRSplitView`, `PageNavigator`, `ConfidenceBadge`

---

### PWA-48 — Trash, Soft-Deleted Memories & 30-Day Recovery View

**Category**: Web & PWA — Archive & Media  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Review soft-deleted memories, restore accidentally deleted items, or confirm permanent deletion.
- **User Story**: "As an archivist, I want to review memories deleted in the last 30 days and restore a photo that was removed by mistake."

#### 2. Navigation & Routing
- **Entry Routes**: `/spaces/:spaceId/trash`, `/spaces/:spaceId/settings`
- **Exit Routes**: `/spaces/:spaceId/archive`, `/spaces/:spaceId`
- **Back Navigation**: `/spaces/:spaceId`
- **Deep Link**: `https://memoria.local/spaces/:spaceId/trash`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member (Owner / Editor)
- **Required Capabilities**: `restore_memory`, `permanent_delete_memory`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Title 'Archival Trash' with notice: 'Items here are preserved for 30 days before permanent purging.', 'Empty Trash' button.
- **Main Content**: Grid of deleted memory cards: Thumbnail with soft red tint, Title, Deletion timestamp, Days remaining countdown (e.g. '18 days left to recover'), 'Restore' button, 'Delete Permanently' button.
- **Footer / Actions Bar**: Recovery summary note.

#### 5. Interactive Controls & UI Elements
- Button: 'Restore Memory' (returns memory to archive)
- Button: 'Delete Permanently' (opens confirmation modal)
- Button: 'Empty Trash' (requires owner confirmation)
- Select all checkbox for bulk restoration

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First restore button`
- **Tab Sequence**: `Empty Trash button` -> `Deleted item cards` -> `Restore buttons` -> `Permanent delete buttons`
- **Escape Key Action**: Closes confirmation dialogs

#### 8. States Matrix
- **Loading State**: Trash grid skeleton pulse.
- **Empty State**: Clean message: 'Trash is empty. No deleted memories.'
- **Populated State**: Grid of deleted memories with clear recovery deadlines.
- **Error State**: Error banner with refresh button.
- **Offline Mode**: Offline indicator; restoration requires connection.
- **Permission Denied**: 403 Forbidden: Only space owners and editors can manage trash.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Trash and recovery view. Shows soft-deleted memories and recovery deadlines."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Single column list with Restore and Delete buttons.
- **Tablet (768px – 1024px)**: Two-column grid.
- **Desktop (> 1024px)**: Three-column grid with hover action triggers.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/memories/:memoryId/restore`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { memoryId: string, status: 'active' } }`
- **Status Codes**: `200 OK`, `400 Bad Request`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service`
- **Database Tables**: `memories`, `audit_logs`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `memory.restored`, `memory.permanently_deleted`
- **BullMQ Background Jobs**: `purge-expired-trash`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Admin Audited`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Permanent deletion verifies zero book spread references before removing files.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] enforces 30-day retention countdown
  - [ ] prevents non-owners from permanent deletion
- **Integration Tests**:
  - [ ] POST /api/memories/:memoryId/restore clears deleted_at timestamp
- **End-to-End Acceptance Tests**:
  - [ ] restores memory from trash, verifies it reappears in main archive grid

#### 17. UI Component Inventory
`TrashGrid`, `DeletedMemoryCard`, `CountdownBadge`, `ConfirmDialog`, `Button`

---

### 1.5 Collaboration & Sharing (PWA-49 to PWA-55)

### PWA-49 — Outbound Invitation Management View

**Category**: Web & PWA — Collaboration  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Track pending invitation links, inspect expiration dates, resend invites, or revoke access.
- **User Story**: "As a space owner, I want to see which family members have not yet accepted their invitations and resend them."

#### 2. Navigation & Routing
- **Entry Routes**: `/spaces/:spaceId/invitations`, `/spaces/:spaceId/members`
- **Exit Routes**: `/spaces/:spaceId/members`, `/spaces/:spaceId`
- **Back Navigation**: `/spaces/:spaceId/members`
- **Deep Link**: `https://memoria.local/spaces/:spaceId/invitations`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Owner, Space Editor
- **Required Capabilities**: `manage_invitations`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Title 'Pending Space Invitations' with '+ Send New Invite' button.
- **Main Content**: Table of invitations: Recipient Email, Role Assigned (Editor, Contributor, Viewer), Sent Date, Expiration Date, Status badge (Pending, Expired, Revoked), Resend button, Revoke button.
- **Footer / Actions Bar**: Active sharable invite links section with copy button.

#### 5. Interactive Controls & UI Elements
- Button: '+ Send New Invite'
- Button: 'Resend Invitation' (with 60s cooldown)
- Destructive Button: 'Revoke Invitation'
- Button: 'Copy Sharable Link'

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Send New Invite button`
- **Tab Sequence**: `New invite button` -> `Table rows` -> `Resend buttons` -> `Revoke buttons`
- **Escape Key Action**: None

#### 8. States Matrix
- **Loading State**: Table skeleton pulse.
- **Empty State**: Notice: 'No pending invitations. All invited members have joined.'
- **Populated State**: Clear tabular view with amber 'Pending' badges and expiration counters.
- **Error State**: Error banner with refresh button.
- **Offline Mode**: Cached invitations view.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Outbound invitation manager. Shows pending invitations with resend and revoke options."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Card list format with kebab action menus.
- **Tablet (768px – 1024px)**: Table view with simplified columns.
- **Desktop (> 1024px)**: Full width table with direct inline actions.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/spaces/:spaceId/invitations`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { invitations: Array<{ id: string, email: string, role: string, expiresAt: string, status: string }> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `identity-service / memory-service`
- **Database Tables**: `space_invitations`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `collab.invitation_revoked`, `collab.invitation_resent`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Invitation tokens cryptographically signed and salted.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] disables resend button during active cooldown
  - [ ] marks status expired after deadline
- **Integration Tests**:
  - [ ] DELETE /api/spaces/:spaceId/invitations/:id revokes invitation token
- **End-to-End Acceptance Tests**:
  - [ ] revokes pending invite, verifies status updates to Revoked immediately

#### 17. UI Component Inventory
`InvitationTable`, `StatusBadge`, `CopyLinkButton`, `Button`

---

### PWA-50 — Member Access Management & Capability Matrix

**Category**: Web & PWA — Collaboration  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Inspect and toggle fine-grained capabilities for space members (e.g. Can Upload, Can Edit Stories, Can Order Books, Can Invite Others).
- **User Story**: "As an archivist, I want to allow my cousin to contribute photos but restrict her from ordering printed books or deleting memories."

#### 2. Navigation & Routing
- **Entry Routes**: `/spaces/:spaceId/permissions`, `/spaces/:spaceId/members`
- **Exit Routes**: `/spaces/:spaceId/members`, `/spaces/:spaceId`
- **Back Navigation**: `/spaces/:spaceId/members`
- **Deep Link**: `https://memoria.local/spaces/:spaceId/permissions`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Owner
- **Required Capabilities**: `manage_permissions`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Title 'Member Capabilities & Permissions' with 'Reset to Defaults' button.
- **Main Content**: Permission Matrix Table: Columns for roles (Owner, Editor, Contributor, Viewer). Rows for capabilities (Upload Media, Edit Memories, Delete Memories, Create Books, Place Print Orders, Invite Members, Manage Settings). Checkbox toggles in each cell.
- **Footer / Actions Bar**: Save Permissions Button.

#### 5. Interactive Controls & UI Elements
- Capability toggle checkboxes
- Button: 'Reset Role Defaults'
- Save Permissions Button
- Cancel Button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First editable checkbox`
- **Tab Sequence**: `Reset button` -> `Matrix checkboxes` -> `Save button`
- **Escape Key Action**: Warns if dirty before leaving

#### 8. States Matrix
- **Loading State**: Matrix loading skeleton.
- **Empty State**: N/A
- **Populated State**: Interactive grid with checked and locked boxes (Owner permissions permanently locked).
- **Error State**: Error banner with reload button.
- **Offline Mode**: Permission editing disabled offline.
- **Permission Denied**: 403 Forbidden screen: Only Space Owners can configure role matrices.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Member permissions matrix table. Toggle specific capabilities for each space role."
- **Touch Target Minimum**: `44x44 px for checkboxes`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Accordion by role with toggle switches.
- **Tablet (768px – 1024px)**: Scrollable capability table.
- **Desktop (> 1024px)**: Clean tabular matrix with clear visual distinction between locked and customizable capabilities.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `PUT` `/api/spaces/:spaceId/permissions`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ matrix: Record<string, string[]> }`
- **Response Payload**: `{ success: true, data: { updated: boolean } }`
- **Status Codes**: `200 OK`, `400 Bad Request`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service`
- **Database Tables**: `space_members`, `audit_logs`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `collab.permissions_updated`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Admin Audited`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Changes to space capabilities are recorded in audit logs.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] prevents unchecking Owner master permissions
  - [ ] validates capability strings
- **Integration Tests**:
  - [ ] PUT /api/spaces/:spaceId/permissions updates permissions and enforces instantly
- **End-to-End Acceptance Tests**:
  - [ ] toggles Contributor print permission off, clicks Save, verifies updated state

#### 17. UI Component Inventory
`PermissionMatrix`, `CheckboxToggle`, `Button`

---

### PWA-51 — Custom Role & Permission Editor

**Category**: Web & PWA — Collaboration  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Define custom space roles (e.g. 'Family Historian', 'Guest Storyteller') with tailored capability sets.
- **User Story**: "As a space owner, I want to create a custom role called 'Junior Contributor' that can upload photos but needs owner approval to publish."

#### 2. Navigation & Routing
- **Entry Routes**: `/spaces/:spaceId/roles/new`, `/spaces/:spaceId/permissions`
- **Exit Routes**: `/spaces/:spaceId/permissions`, `/spaces/:spaceId/members`
- **Back Navigation**: `/spaces/:spaceId/permissions`
- **Deep Link**: `https://memoria.local/spaces/:spaceId/roles/new`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Owner
- **Required Capabilities**: `create_custom_role`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Title: 'Create Custom Role' with role name and description fields.
- **Main Content**: Categorized capability checklist: 1. Media & Memories, 2. Books & Authoring, 3. Collaboration & Comments, 4. Publishing & Export.
- **Footer / Actions Bar**: Cancel and 'Create Role' buttons.

#### 5. Interactive Controls & UI Elements
- Role Name input field
- Role Description textarea
- Capability toggle checkboxes
- Submit Button: 'Create Custom Role'

#### 6. Form Validation & Data Schema

| Field Name | Data Type | Required | Limits & Constraints | Validation Rule | Error Copy |
|---|---|---|---|---|---|
| `roleName` | `text` | **Yes** | 2-40 characters | Standard type validation | Role name is required. |
| `capabilities` | `array` | **Yes** | N/A | Standard type validation | Please select at least one capability. |

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Role Name input`
- **Tab Sequence**: `Role Name` -> `Description` -> `Checkboxes` -> `Submit button`
- **Escape Key Action**: Prompts if dirty

#### 8. States Matrix
- **Loading State**: Saving role spinner.
- **Empty State**: Blank form with capability checkboxes.
- **Populated State**: Filled form ready for submission.
- **Error State**: Validation error banner.
- **Offline Mode**: Disabled offline.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Custom role creation form with name and capability toggles."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Full width form.
- **Tablet (768px – 1024px)**: Centered 560px card.
- **Desktop (> 1024px)**: Centered 680px card.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/spaces/:spaceId/roles`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ name: string, description?: string, capabilities: string[] }`
- **Response Payload**: `{ success: true, data: { roleId: string, name: string } }`
- **Status Codes**: `201 Created`, `400 Bad Request`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service`
- **Database Tables**: `audit_logs`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `collab.custom_role_created`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Role changes audited.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] requires non-empty role name and at least 1 capability
- **Integration Tests**:
  - [ ] POST /api/spaces/:spaceId/roles stores role
- **End-to-End Acceptance Tests**:
  - [ ] creates 'Guest Historian' role, verifies it appears in member role selector

#### 17. UI Component Inventory
`RoleForm`, `CapabilityChecklist`, `Button`

---

### PWA-52 — Public / Restricted Sharing Settings & Passphrase Protection

**Category**: Web & PWA — Collaboration  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Configure external sharing links for memory stories or books with optional passphrase and expiration dates.
- **User Story**: "As an archivist, I want to create a passphrase-protected share link for our 50th anniversary book so distant relatives can view it without registering."

#### 2. Navigation & Routing
- **Entry Routes**: `/spaces/:spaceId/sharing`, `/books/:bookId/share`, `/memories/:memoryId/share`
- **Exit Routes**: `/spaces/:spaceId`, `/books/:bookId`
- **Back Navigation**: `/spaces/:spaceId`
- **Deep Link**: `https://memoria.local/spaces/:spaceId/sharing`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Owner, Space Editor
- **Required Capabilities**: `manage_sharing`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Title: 'Share Living Archive' with link status toggle (Disabled / Active).
- **Main Content**: 1. Generated sharable URL with Copy button, 2. Access scope selector (Entire Space, Selected Books, Curated Collection), 3. Passphrase protection input (optional), 4. Expiration date picker (7 days, 30 days, 1 year, Never), 5. Active guest access logs.
- **Footer / Actions Bar**: 'Revoke All Links' and 'Save Sharing Settings' buttons.

#### 5. Interactive Controls & UI Elements
- Share link active toggle switch
- Copy Link Button
- Passphrase input field (with generate random passphrase button)
- Expiration dropdown
- Revoke All Links Button

#### 6. Form Validation & Data Schema

| Field Name | Data Type | Required | Limits & Constraints | Validation Rule | Error Copy |
|---|---|---|---|---|---|
| `passphrase` | `text` | No | Min 6 chars if provided | Standard type validation | Invalid value |

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Share toggle switch`
- **Tab Sequence**: `Toggle` -> `Copy link` -> `Passphrase input` -> `Expiration dropdown` -> `Save button` -> `Revoke button`
- **Escape Key Action**: None

#### 8. States Matrix
- **Loading State**: Saving sharing configuration spinner.
- **Empty State**: Sharing disabled state with explanation.
- **Populated State**: Active secure link with QR code generator preview.
- **Error State**: Error banner with refresh button.
- **Offline Mode**: Sharing changes disabled offline.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Sharing settings. Generate secure links with optional passphrase and expiration."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Stacked vertical controls with large Copy Link button.
- **Tablet (768px – 1024px)**: Centered 560px card.
- **Desktop (> 1024px)**: Centered 640px card with QR code display.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/spaces/:spaceId/share-link`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ enabled: boolean, passphrase?: string, expiresAt?: string }`
- **Response Payload**: `{ success: true, data: { shareUrl: string, expiresAt: string, hasPassphrase: boolean } }`
- **Status Codes**: `200 OK`, `400 Bad Request`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service`
- **Database Tables**: `memory_spaces`, `audit_logs`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `collab.share_link_generated`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Admin Audited`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Passphrases hashed using Argon2id; links use cryptographically random 256-bit tokens.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] verifies minimum passphrase length when enabled
  - [ ] generates valid QR code data
- **Integration Tests**:
  - [ ] POST /api/spaces/:spaceId/share-link creates token
- **End-to-End Acceptance Tests**:
  - [ ] generates link with passphrase, copies to clipboard, tests guest access

#### 17. UI Component Inventory
`ShareSettingsCard`, `CopyLinkButton`, `QRCodePreview`, `PassphraseInput`

---

### PWA-53 — Space Activity & Contribution Live Stream

**Category**: Web & PWA — Collaboration  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Follow recent family additions, story edits, comments, and book drafts in an observable activity feed.
- **User Story**: "As an archivist, I want to see what my sister uploaded yesterday so I can review her new photographs."

#### 2. Navigation & Routing
- **Entry Routes**: `/spaces/:spaceId/activity`, `/spaces/:spaceId`
- **Exit Routes**: `/memories/:memoryId`, `/spaces/:spaceId`
- **Back Navigation**: `/spaces/:spaceId`
- **Deep Link**: `https://memoria.local/spaces/:spaceId/activity`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member
- **Required Capabilities**: `view_activity`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Title 'Space Activity Stream' with date filter and contributor filter.
- **Main Content**: Chronological stream of activity cards: Actor avatar, Action description (e.g. 'Sarah added 8 photos to Liam Year 1', 'David commented on Summer Vacation 1984'), Timestamp, Entity thumbnail preview, Deep link to item.
- **Footer / Actions Bar**: End of recent activity marker.

#### 5. Interactive Controls & UI Elements
- Activity item card click (deep links to affected memory or book)
- Filter by contributor dropdown
- Filter by event type (Uploads, Edits, Comments, Books)

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First activity item`
- **Tab Sequence**: `Filters` -> `Activity cards`
- **Escape Key Action**: None

#### 8. States Matrix
- **Loading State**: Activity stream skeleton pulse.
- **Empty State**: Notice: 'No recent activity recorded in this space.'
- **Populated State**: Real-time stream with actor attribution and clean typography.
- **Error State**: Error banner with refresh button.
- **Offline Mode**: Cached activity rendered offline.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Space activity stream. Recent contributions and edits by family members."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Single column list with compact avatars.
- **Tablet (768px – 1024px)**: Centered 600px stream.
- **Desktop (> 1024px)**: Centered 720px stream with inline photographic thumbnails.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/spaces/:spaceId/activity`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { items: Array<{ id: string, actorName: string, action: string, entityType: string, timestamp: string, entityUrl: string }> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service`
- **Database Tables**: `audit_logs`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: _None_
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Medium`
- **Security Audit Logged**: No
- **Privacy Architecture**: Activity feed strictly scoped to space boundaries.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] formats relative timestamps (e.g. '2 hours ago', 'Yesterday at 4:15 PM')
  - [ ] filters by actor
- **Integration Tests**:
  - [ ] GET /api/spaces/:spaceId/activity returns events for space
- **End-to-End Acceptance Tests**:
  - [ ] views stream, filters by 'Uploads', clicks on activity item to open memory

#### 17. UI Component Inventory
`ActivityStream`, `ActivityItem`, `FilterBar`

---

### PWA-54 — Memory Change History & Version Attribution Detail

**Category**: Web & PWA — Collaboration  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Inspect the audit trail of modifications made to a memory story or metadata, and compare revisions side-by-side.
- **User Story**: "As an archivist, I want to compare revisions of a story to see what date correction was made and by whom."

#### 2. Navigation & Routing
- **Entry Routes**: `/memories/:memoryId/history`, `/memories/:memoryId`
- **Exit Routes**: `/memories/:memoryId`, `/spaces/:spaceId/archive`
- **Back Navigation**: `/memories/:memoryId`
- **Deep Link**: `https://memoria.local/memories/:memoryId/history`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member (Editor+)
- **Required Capabilities**: `view_history`, `restore_revision`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Title: 'Version History' with current revision badge (v3) and back button.
- **Main Content**: Split comparison view: Left: Revision list (v1, v2, v3 with author name and timestamp). Right: Visual diff highlighting added text in functional sage green (#5F735E) and removed text with strike-through.
- **Footer / Actions Bar**: 'Restore This Revision' button.

#### 5. Interactive Controls & UI Elements
- Revision selector pills
- Side-by-side vs Inline Diff toggle
- Button: 'Restore Revision as New Draft'
- Close Button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Revision selector`
- **Tab Sequence**: `Revisions` -> `Diff toggle` -> `Restore button` -> `Close`
- **Escape Key Action**: Returns to memory detail

#### 8. States Matrix
- **Loading State**: Revision list skeleton pulse.
- **Empty State**: Notice: 'This memory has not been modified since original creation.'
- **Populated State**: Clear diff view with green/red syntax highlighting for textual alterations.
- **Error State**: Error banner with reload button.
- **Offline Mode**: Offline indicator.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Memory change history. Compare text revisions with author attribution."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Inline diff view with red/green highlights.
- **Tablet (768px – 1024px)**: Side-by-side diff with scroll synchronization.
- **Desktop (> 1024px)**: Side-by-side diff max-width 1000px.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/memories/:memoryId/history`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { versions: Array<{ version: number, authorName: string, title: string, content: string, updatedAt: string }> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service`
- **Database Tables**: `memories`, `audit_logs`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `memory.history_inspected`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Admin Audited`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Immutable history records prevent silent alteration of family accounts.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] computes text differences correctly
  - [ ] restores selected revision without rewriting history
- **Integration Tests**:
  - [ ] GET /api/memories/:memoryId/history returns audit records
- **End-to-End Acceptance Tests**:
  - [ ] selects revision v1, verifies diff highlights, clicks Restore

#### 17. UI Component Inventory
`RevisionList`, `DiffViewer`, `RestoreButton`

---

### PWA-55 — Dedicated Discussion Threads & Memory Annotation Panel

**Category**: Web & PWA — Collaboration  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Engage in family conversations and add annotations on specific photographs or memory moments.
- **User Story**: "As a family member, I want to comment 'Is that Uncle Joe on the far left?' so my aunt can clarify the identification."

#### 2. Navigation & Routing
- **Entry Routes**: `/memories/:memoryId#discussions`, `/memories/:memoryId`
- **Exit Routes**: `/memories/:memoryId`, `/dashboard`
- **Back Navigation**: `/memories/:memoryId`
- **Deep Link**: `https://memoria.local/memories/:memoryId#discussions`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member
- **Required Capabilities**: `view_comments`, `post_comment`, `delete_own_comment`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Title 'Family Discussions' with comment counter and real-time active contributor avatars.
- **Main Content**: Threaded comment list: Contributor avatar, Name, Timestamp, Comment message body, Reply button, Emoji reactions strip (Heart, Clapping, Teary, Folded Hands), Delete comment button (for comment author or owner).
- **Footer / Actions Bar**: Rich comment input box with '@mention' person support, emoji picker, and Send button.

#### 5. Interactive Controls & UI Elements
- Comment input field (auto-expanding textarea)
- Button: 'Post Comment'
- Reply button on comment
- Emoji reaction buttons (Heart, Hug, Laugh, Star)
- Delete comment button

#### 6. Form Validation & Data Schema

| Field Name | Data Type | Required | Limits & Constraints | Validation Rule | Error Copy |
|---|---|---|---|---|---|
| `message` | `textarea` | **Yes** | 1-1000 characters | Standard type validation | Please write a comment. |

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Comment textarea`
- **Tab Sequence**: `Comment input` -> `Send button` -> `Comment rows` -> `Reply buttons`
- **Keyboard Shortcuts**: `Cmd+Enter (Submit comment)`
- **Escape Key Action**: Cancels reply

#### 8. States Matrix
- **Loading State**: Comment thread skeleton pulse.
- **Empty State**: Notice: 'No comments yet. Start the conversation about this memory.'
- **Populated State**: Threaded conversation with warm avatars and emoji reaction counts.
- **Error State**: Error banner with retry button.
- **Offline Mode**: Queued in local outbox for delivery when reconnected.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Discussion thread with comments and reactions."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Bottom sticky comment box, stacked thread.
- **Tablet (768px – 1024px)**: Right-hand drawer (400px width).
- **Desktop (> 1024px)**: Integrated side discussion panel alongside memory details.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/memories/:memoryId/comments`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ message: string, parentCommentId?: string }`
- **Response Payload**: `{ success: true, data: { commentId: string, createdAt: string } }`
- **Status Codes**: `201 Created`, `400 Bad Request`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service`
- **Database Tables**: `audit_logs`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `collab.comment_added`
- **BullMQ Background Jobs**: `notify-space-contributors`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Medium`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Comments strictly private to space contributors.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] submits comment with Cmd+Enter
  - [ ] increments reaction count idempotently
- **Integration Tests**:
  - [ ] POST /api/memories/:memoryId/comments creates comment and triggers outbox
- **End-to-End Acceptance Tests**:
  - [ ] posts comment, verifies immediate insertion in thread, adds reaction

#### 17. UI Component Inventory
`DiscussionThread`, `CommentItem`, `ReactionStrip`, `CommentInput`

---

### 1.6 Book Creation & 3D Studio (PWA-56 to PWA-70)

### PWA-56 — Digital Bookshelf Library & Miniature Covers

**Category**: Web & PWA — Books & 3D Studio  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Browse published and draft heirloom books displayed on an archival wooden digital bookshelf with 3D miniature covers.
- **User Story**: "As an archivist, I want to see our family's printed and draft volumes resting on a digital library shelf so I can choose a book to read or edit."

#### 2. Navigation & Routing
- **Entry Routes**: `/bookshelf`, `/dashboard`, `/spaces/:spaceId/books`
- **Exit Routes**: `/books/:bookId`, `/books/new`, `/sample-book`
- **Back Navigation**: `/dashboard`
- **Deep Link**: `https://memoria.local/bookshelf`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member
- **Required Capabilities**: `view_bookshelf`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Bookshelf title: 'Heirloom Library' with '+ Create New Book' button and format filter.
- **Main Content**: Interactive Bookshelf View: Wooden archival shelves (Walnut #3A2E26) displaying upright 3D books with spine titles in gold foil, leather cover colors, and page count ribbons.
- **Footer / Actions Bar**: Library statistics: Total volumes, total printed pages, archival status.

#### 5. Interactive Controls & UI Elements
- Button: '+ Create New Heirloom Book'
- Book spine / cover click (pulls book forward and opens Book Overview PWA-57)
- 2D Grid vs 3D Shelf view mode toggle button
- Filter by Space dropdown

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First book on top shelf`
- **Tab Sequence**: `Create Book button` -> `Filter dropdown` -> `Shelf books`
- **Keyboard Shortcuts**: `ArrowRight (Next book)`, `ArrowLeft (Prev book)`, `Enter (Open book)`
- **Escape Key Action**: None

#### 8. States Matrix
- **Loading State**: Bookshelf wood texture loads with pulsing silhouette book spines.
- **Empty State**: Notice: 'Your heirloom library is empty. Craft your first memory book today.'
- **Populated State**: Rich Three.js / CSS 3D shelf with realistic leather materials and gold spine debossing.
- **Error State**: Error banner with refresh button.
- **Offline Mode**: Cached shelf rendered from IndexedDB.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Digital bookshelf with 3D interactive book covers. Select a volume to inspect."
- **Touch Target Minimum**: `48x48 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Horizontal scrolling book carousel with touch swipe; 2D fallback button.
- **Tablet (768px – 1024px)**: Two-shelf 3D display.
- **Desktop (> 1024px)**: Three-shelf interactive library with depth of field and gentle mouse parallax.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/books`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { books: Array<BookDocument & { pageCount: number, coverThumbnailUrl: string }> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `book-service`
- **Database Tables**: `books`, `book_spreads`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `bookshelf.viewed`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: No
- **Privacy Architecture**: Only books within authorized spaces are rendered.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] renders books upright on shelves
  - [ ] toggles between 3D and 2D grid
- **Integration Tests**:
  - [ ] GET /api/books returns user's space books
- **End-to-End Acceptance Tests**:
  - [ ] navigates to bookshelf, clicks volume spine, opens Book Overview

#### 17. UI Component Inventory
`BookshelfStage`, `BookSpineItem`, `ShelfControls`, `Button`

---

### PWA-57 — Book Overview, Edition Details & Contributor List

**Category**: Web & PWA — Books & 3D Studio  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Review a book's edition status, cover title, physical dimensions, page count, contributors, and launch editor or reader.
- **User Story**: "As an archivist, I want to inspect a book's status (Draft / Frozen for Print), view all contributors, and launch the 3D Reader."

#### 2. Navigation & Routing
- **Entry Routes**: `/books/:bookId`, `/bookshelf`
- **Exit Routes**: `/books/:bookId/editor`, `/books/:bookId/reader`, `/books/:bookId/preflight`, `/books/:bookId/order`
- **Back Navigation**: `/bookshelf`
- **Deep Link**: `https://memoria.local/books/:bookId`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member
- **Required Capabilities**: `view_book`, `edit_book (Contributor+)`, `print_book`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Book title in Cormorant Garamond, subtitle, edition badge ('Edition 1 · Draft' or 'Edition 2 · Frozen for Print').
- **Main Content**: 1. 3D Cover preview with foil stamping, 2. Specifications card (Dimensions 8x10 Standard, Pages: 48, Binding: Fine Leather Forest), 3. Contributors avatar strip, 4. Chapter breakdown list.
- **Footer / Actions Bar**: Action bar: 'Read in 3D' button, 'Edit Spreads' button, 'Preflight Inspection' button, 'Order Hardcover' button.

#### 5. Interactive Controls & UI Elements
- Primary Button: 'Open 3D Reader' (PWA-68)
- Secondary Button: 'Open 2D Spread Editor' (PWA-64)
- Button: 'Preflight Print Check' (PWA-69)
- Button: 'Order Fine-Art Hardcover' (PWA-71)
- Delete Draft Book button (Owner only)

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Open 3D Reader button`
- **Tab Sequence**: `Action buttons` -> `Specification items` -> `Chapter list`
- **Escape Key Action**: Returns to bookshelf

#### 8. States Matrix
- **Loading State**: Book overview skeleton pulse.
- **Empty State**: N/A
- **Populated State**: Detailed edition summary with foil debossed cover badge and action triggers.
- **Error State**: Book not found error banner.
- **Offline Mode**: Cached book metadata displayed offline.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Book overview: The Vance Family Chronicle. 48 pages, standard 8x10 hardcover. Options to read or edit."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Stacked view: cover top, specifications middle, action bar fixed at bottom.
- **Tablet (768px – 1024px)**: Two-column layout (Cover left 40%, Specs & actions right 60%).
- **Desktop (> 1024px)**: Max-width 1100px layout with high-resolution 3D cover tilt.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/books/:bookId`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { book: BookDocument, pageCount: number, contributors: Array<UserProfile>, printStatus: string } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`, `404 Not Found`

#### 13. Service Architecture & Persistence
- **Backend Service**: `book-service`
- **Database Tables**: `books`, `book_spreads`, `users`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `book.overview_viewed`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: No
- **Privacy Architecture**: Restricted to authorized space members.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] formats book dimensions accurately based on format code
  - [ ] disables edit buttons if frozen for print
- **Integration Tests**:
  - [ ] GET /api/books/:bookId returns complete document schema
- **End-to-End Acceptance Tests**:
  - [ ] navigates from bookshelf to book overview, clicks 'Open 3D Reader'

#### 17. UI Component Inventory
`BookOverviewCard`, `CoverFoilPreview`, `SpecList`, `ActionBar`, `Button`

---

### PWA-58 — Create-Book Wizard: Format, Dimensions & Purpose

**Category**: Web & PWA — Books & 3D Studio  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Configure a new book's title, trim dimensions (8x8, 8x10, 12x12), and archival purpose.
- **User Story**: "As an archivist, I want to start authoring an 8x10 hardcover book for our family heritage so I can begin selecting memories."

#### 2. Navigation & Routing
- **Entry Routes**: `/books/new`, `/bookshelf`
- **Exit Routes**: `/books/new/source`, `/bookshelf`
- **Back Navigation**: `/bookshelf`
- **Deep Link**: `https://memoria.local/books/new`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member (Contributor+)
- **Required Capabilities**: `create_book`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Step 1 of 5; title 'Craft an Heirloom Memory Book'.
- **Main Content**: 1. Book Title & Subtitle inputs, 2. Physical Trim Format selector cards: Square 8x8 (Intimate milestones), Standard 8x10 (Classic family history), Grand 12x12 (Fine-art heirloom), 3. Purpose tags (Heritage, Wedding, Memorial, Travel).
- **Footer / Actions Bar**: Cancel and 'Continue to Memory Selection' buttons.

#### 5. Interactive Controls & UI Elements
- Title input field
- Subtitle input field
- Format selector radio cards (8x8, 8x10, 12x12)
- Continue Button
- Cancel Button

#### 6. Form Validation & Data Schema

| Field Name | Data Type | Required | Limits & Constraints | Validation Rule | Error Copy |
|---|---|---|---|---|---|
| `title` | `text` | **Yes** | 1-120 characters | Standard type validation | Please enter a book title. |
| `format` | `radio` | **Yes** | N/A | Standard type validation | Please select a book trim format. |

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Book Title input`
- **Tab Sequence**: `Title` -> `Subtitle` -> `Format cards` -> `Continue button` -> `Cancel button`
- **Escape Key Action**: Prompts if dirty

#### 8. States Matrix
- **Loading State**: Initializing draft book spinner.
- **Empty State**: Fresh form with 8x10 pre-selected as recommended.
- **Populated State**: Valid book details entered.
- **Error State**: Validation error alert.
- **Offline Mode**: Draft stored in IndexedDB.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Create book wizard step 1. Select book dimensions and title."
- **Touch Target Minimum**: `48x48 px format cards`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Vertical stack of format cards.
- **Tablet (768px – 1024px)**: 3-column format comparison.
- **Desktop (> 1024px)**: Centered 840px container with 3D trim proportion illustrations.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/books/drafts`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ spaceId: string, title: string, subtitle?: string, format: BookFormat }`
- **Response Payload**: `{ success: true, data: { draftBookId: string } }`
- **Status Codes**: `201 Created`, `400 Bad Request`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `book-service`
- **Database Tables**: `books`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `book.draft_initialized`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Draft book initialized under user space.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] validates BookFormatSchema enum values
  - [ ] generates initial default spread structure
- **Integration Tests**:
  - [ ] POST /api/books/drafts inserts draft record in database
- **End-to-End Acceptance Tests**:
  - [ ] fills title 'The Morrison Chronicle', selects 8x10, clicks Continue

#### 17. UI Component Inventory
`BookWizardHeader`, `FormatSelectorCard`, `InputField`, `Button`

---

### PWA-59 — Source Space & Profile Selector

**Category**: Web & PWA — Books & 3D Studio  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Select which memory space and profiles will provide content for the book.
- **User Story**: "As an archivist, I want to select our family space and filter by grandmother's profile so only memories involving her are pulled into the book draft."

#### 2. Navigation & Routing
- **Entry Routes**: `/books/new/source`, `/books/new`
- **Exit Routes**: `/books/new/curate`, `/books/new`
- **Back Navigation**: `/books/new`
- **Deep Link**: `https://memoria.local/books/new/source`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member
- **Required Capabilities**: `create_book`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Step 2 of 5; title 'Select Sources & People'.
- **Main Content**: 1. Memory Space dropdown, 2. People Multi-Select Pills (All, or specific family profiles), 3. Date Range filter (From year to year).
- **Footer / Actions Bar**: Back button and 'Continue to Memory Curation' button.

#### 5. Interactive Controls & UI Elements
- Space selector dropdown
- Profile multi-select chips
- Date range sliders
- Continue Button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Space selector dropdown`
- **Tab Sequence**: `Space dropdown` -> `Profile chips` -> `Date sliders` -> `Continue button`
- **Escape Key Action**: Returns to step 1

#### 8. States Matrix
- **Loading State**: Loading spaces and profiles skeleton.
- **Empty State**: N/A
- **Populated State**: Active space selected with matching profile avatars.
- **Error State**: Error banner with refresh button.
- **Offline Mode**: Offline indicator.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Step 2. Select memory spaces and people profiles to include in this volume."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Vertical stack.
- **Tablet (768px – 1024px)**: Centered 600px form.
- **Desktop (> 1024px)**: Centered 720px card.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `PATCH` `/api/books/drafts/:draftBookId/sources`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ spaceId: string, profileIds?: string[], dateRange?: { start: string, end: string } }`
- **Response Payload**: `{ success: true, data: { candidateMemoryCount: number } }`
- **Status Codes**: `200 OK`, `400 Bad Request`

#### 13. Service Architecture & Persistence
- **Backend Service**: `book-service`
- **Database Tables**: `books`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: _None_
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: No
- **Privacy Architecture**: Sourcing verified against membership.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] filters memory pool based on profileIds
  - [ ] updates candidate count
- **Integration Tests**:
  - [ ] PATCH /api/books/drafts/:id/sources updates draft
- **End-to-End Acceptance Tests**:
  - [ ] selects 2 profiles, verifies candidate memory counter updates

#### 17. UI Component Inventory
`SourceSelector`, `ProfileChipGroup`, `DateRangeSlider`, `Button`

---

### PWA-60 — Memory Curation & Chronologic Grouping

**Category**: Web & PWA — Books & 3D Studio  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Review candidate memories, select/deselect items, and group them chronologically for book compilation.
- **User Story**: "As an archivist, I want to select 45 best photos from 120 candidates and automatically organize them by capture year."

#### 2. Navigation & Routing
- **Entry Routes**: `/books/new/curate`, `/books/new/source`
- **Exit Routes**: `/books/new/chapters`, `/books/new/source`
- **Back Navigation**: `/books/new/source`
- **Deep Link**: `https://memoria.local/books/new/curate`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member
- **Required Capabilities**: `create_book`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Step 3 of 5; title 'Curate Memories for this Book' with selected counter ('42 memories selected · Est. 32 pages').
- **Main Content**: Chronological candidate grid: Grouped by year/month, multi-select checkboxes on each memory card, 'Select All in Year' shortcuts.
- **Footer / Actions Bar**: Selection count summary, 'Auto-Layout Pages' button, and 'Continue to Chapters' button.

#### 5. Interactive Controls & UI Elements
- Select all / deselect all button
- Memory card click (toggles selection)
- Filter by Favorite button
- Primary Button: 'Continue to Chapters'

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First memory card`
- **Tab Sequence**: `Select All button` -> `Filter button` -> `Candidate cards` -> `Continue button`
- **Keyboard Shortcuts**: `Space (Toggle focused card selection)`
- **Escape Key Action**: Returns to step 2

#### 8. States Matrix
- **Loading State**: Candidate memory grid skeleton.
- **Empty State**: Notice: 'No memories match selected source criteria.'
- **Populated State**: Grid of photos with green checkmark selection badges.
- **Error State**: Error banner with refresh button.
- **Offline Mode**: Local candidates available offline.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Memory curation grid. Select memories to include in the book."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: 2-column grid with tap selection.
- **Tablet (768px – 1024px)**: 3-column grid.
- **Desktop (> 1024px)**: 4-column grid with estimated page count sticky header.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/books/drafts/:draftBookId/curate`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ selectedMemoryIds: string[] }`
- **Response Payload**: `{ success: true, data: { spreadCount: number } }`
- **Status Codes**: `200 OK`, `400 Bad Request`

#### 13. Service Architecture & Persistence
- **Backend Service**: `book-service`
- **Database Tables**: `books`, `book_spreads`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `book.memories_curated`
- **BullMQ Background Jobs**: `generate-auto-spreads`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: No
- **Privacy Architecture**: Curated selections persisted in book document.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] estimates page count dynamically from memory count and layout defaults
  - [ ] selects all in year
- **Integration Tests**:
  - [ ] POST /api/books/drafts/:id/curate stores memory links in spreads
- **End-to-End Acceptance Tests**:
  - [ ] selects 10 memories, verifies estimated page count is 8, continues

#### 17. UI Component Inventory
`CurationGrid`, `SelectionBadge`, `PageEstimator`, `Button`

---

### PWA-61 — Chapter & Section Structure Organizer

**Category**: Web & PWA — Books & 3D Studio  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Organize memories into structured book chapters (e.g. 'Chapter 1: The Early Years', 'Chapter 2: Family Journeys').
- **User Story**: "As an author, I want to create named chapters with divider title pages and reorder sections easily."

#### 2. Navigation & Routing
- **Entry Routes**: `/books/new/chapters`, `/books/new/curate`
- **Exit Routes**: `/books/new/templates`, `/books/new/curate`
- **Back Navigation**: `/books/new/curate`
- **Deep Link**: `https://memoria.local/books/new/chapters`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member
- **Required Capabilities**: `create_book`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Step 4 of 5; title 'Organize Book Chapters' with '+ Add Chapter' button.
- **Main Content**: Chapter list cards with drag handles: Chapter title input, Date range badge, Memory count, Expand/collapse thumbnail drawer, Reorder handles.
- **Footer / Actions Bar**: Back button and 'Continue to Spread Layouts' button.

#### 5. Interactive Controls & UI Elements
- Button: '+ Add Chapter'
- Chapter drag handles for reordering
- Chapter title inline text edit
- Delete chapter button (unassigns memories back to unassigned tray)
- Continue Button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First chapter title input`
- **Tab Sequence**: `Add Chapter` -> `Chapter titles` -> `Drag handles` -> `Continue button`
- **Escape Key Action**: Returns to step 3

#### 8. States Matrix
- **Loading State**: Chapter list skeleton pulse.
- **Empty State**: Notice: 'No chapters created yet. Add chapters to divide your book into eras.'
- **Populated State**: Organized chapter cards with memory counts and reorderable layout.
- **Error State**: Error banner with refresh button.
- **Offline Mode**: Cached chapters rendered offline.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Chapter organizer. Reorder chapters and assign section titles."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Stacked vertical list with move up/down chevrons.
- **Tablet (768px – 1024px)**: Centered 640px list.
- **Desktop (> 1024px)**: Centered 780px list with drag-and-drop reordering.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `PUT` `/api/books/drafts/:draftBookId/chapters`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ chapters: Array<{ title: string, memoryIds: string[], orderIndex: number }> }`
- **Response Payload**: `{ success: true, data: { updated: boolean } }`
- **Status Codes**: `200 OK`, `400 Bad Request`

#### 13. Service Architecture & Persistence
- **Backend Service**: `book-service`
- **Database Tables**: `books`, `book_spreads`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: _None_
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: No
- **Privacy Architecture**: Chapter metadata stored in book document.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] reorders chapters correctly
  - [ ] validates non-empty chapter titles
- **Integration Tests**:
  - [ ] PUT /api/books/drafts/:id/chapters persists structure
- **End-to-End Acceptance Tests**:
  - [ ] creates 'The Early Years' chapter, reorders to first position, continues

#### 17. UI Component Inventory
`ChapterList`, `ChapterCard`, `DragHandle`, `Button`

---

### PWA-62 — Template Layout Selector

**Category**: Web & PWA — Books & 3D Studio  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Choose default typographic and layout themes (Editorial Classic, Photojournalism, Fine-Art Minimalist).
- **User Story**: "As an archivist, I want to select 'Editorial Classic' so our book uses elegant serif typography, generous margins, and pull-quote spreads."

#### 2. Navigation & Routing
- **Entry Routes**: `/books/new/templates`, `/books/new/chapters`
- **Exit Routes**: `/books/:bookId/editor`, `/books/new/chapters`
- **Back Navigation**: `/books/new/chapters`
- **Deep Link**: `https://memoria.local/books/new/templates`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member
- **Required Capabilities**: `create_book`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Step 5 of 5; title 'Select Spread Aesthetic & Typography'.
- **Main Content**: 3 Theme Cards with sample spread previews: 1. Editorial Classic (Cormorant Garamond, subtle margins, archival captions), 2. Photo-Journal (Bold full-bleed spreads, chronological stamps), 3. Fine-Art Minimalist (Expansive white space, off-center portraits, subtle lines).
- **Footer / Actions Bar**: Finish button: 'Generate Spreads & Open Studio'.

#### 5. Interactive Controls & UI Elements
- Theme selector cards (radio selection)
- Spread preview zoom popover
- Finish Button: 'Generate Spreads & Open Studio'

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First theme card (Editorial Classic)`
- **Tab Sequence**: `Theme cards` -> `Finish button`
- **Escape Key Action**: Returns to step 4

#### 8. States Matrix
- **Loading State**: Generating initial spreads spinner.
- **Empty State**: N/A
- **Populated State**: Theme cards with high-fidelity sample spread illustrations.
- **Error State**: Error banner with retry button.
- **Offline Mode**: Offline indicator.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Select spread aesthetic. Choose between Editorial Classic, Photo-Journal, or Fine-Art Minimalist."
- **Touch Target Minimum**: `48x48 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Single column card list.
- **Tablet (768px – 1024px)**: 3-column grid.
- **Desktop (> 1024px)**: 3-column grid with spread inspection previews on hover.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/books/drafts/:draftBookId/generate-spreads`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ aestheticTheme: 'editorial_classic' | 'photo_journal' | 'fine_art_minimalist' }`
- **Response Payload**: `{ success: true, data: { bookId: string, spreadCount: number } }`
- **Status Codes**: `200 OK`, `400 Bad Request`

#### 13. Service Architecture & Persistence
- **Backend Service**: `book-service`
- **Database Tables**: `books`, `book_spreads`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `book.spreads_generated`
- **BullMQ Background Jobs**: `compile-initial-book-spreads`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Spreads generated and stored in Drizzle database.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] applies layout rules matching chosen aesthetic theme
  - [ ] initializes spread elements correctly
- **Integration Tests**:
  - [ ] POST /api/books/drafts/:id/generate-spreads populates book_spreads rows
- **End-to-End Acceptance Tests**:
  - [ ] selects Editorial Classic, clicks Generate Spreads, redirects to 2D Editor

#### 17. UI Component Inventory
`ThemeCardGrid`, `SpreadPreviewModal`, `Button`

---

### PWA-63 — Cover Customization Studio (PBR Leather & Foil)

**Category**: Web & PWA — Books & 3D Studio  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Customize the physical book cover: cloth/leather PBR material, foil stamping debossing, cover title, spine text, and emblem.
- **User Story**: "As an archivist, I want to select Forest Green leather with gold foil debossed tree-of-life emblem and inspect real-time reflections in 3D."

#### 2. Navigation & Routing
- **Entry Routes**: `/books/:bookId/cover`, `/books/:bookId/editor`
- **Exit Routes**: `/books/:bookId/editor`, `/books/:bookId`
- **Back Navigation**: `/books/:bookId/editor`
- **Deep Link**: `https://memoria.local/books/:bookId/cover`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member (Contributor+)
- **Required Capabilities**: `edit_book`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Top bar: 'Cover Customization Studio', Save button, Reset to Default, Close button.
- **Main Content**: Interactive 3D Three.js Cover Canvas: Articulated 3D book cover with real-time PBR normal mapping, gold/silver foil specular highlights, and rotatable camera.
- **Aside / Sidebar**: Cover options control panel: 1. Material (Fine Leather, Pebbled Leather, Bookcloth, Linen), 2. Cover Color swatch picker (Forest #304C43, Plum #76556F, Ink #20242C, Sage #849483), 3. Foil stamping type (Gold, Silver, Blind Emboss), 4. Cover Title & Spine Text inputs, 5. Emblem selector (Tree of Life, Archival Seal, Custom).
- **Footer / Actions Bar**: Safe-area bleed guide toggle and preflight check status.

#### 5. Interactive Controls & UI Elements
- Material selector pills (Leather, Pebbled, Cloth, Linen)
- Color swatch buttons
- Foil selector pills (Gold, Silver, Blind Emboss)
- Cover Title input field
- Spine Text input field
- Emblem icon selector
- Save Cover Button

#### 6. Form Validation & Data Schema

| Field Name | Data Type | Required | Limits & Constraints | Validation Rule | Error Copy |
|---|---|---|---|---|---|
| `coverTitle` | `text` | **Yes** | 1-60 characters | Standard type validation | Cover title is required for spine stamping. |
| `spineText` | `text` | No | 0-40 characters | Standard type validation | Invalid value |

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Cover Title input field`
- **Tab Sequence**: `Cover Title` -> `Spine Text` -> `Material pills` -> `Color swatches` -> `Foil pills` -> `Save button`
- **Escape Key Action**: Returns to editor

#### 8. States Matrix
- **Loading State**: PBR texture shader compiling spinner.
- **Empty State**: N/A
- **Populated State**: Photorealistic 3D cover with physically based roughness and bump maps.
- **Error State**: WebGL fallback banner.
- **Offline Mode**: Cached 3D model with offline badge.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Cover Customization Studio. Choose leather material, foil stamping, and spine text with 3D preview."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Top half 3D canvas (280px height), bottom half scrollable control drawer.
- **Tablet (768px – 1024px)**: Side-by-side (Canvas 60%, Controls 40%).
- **Desktop (> 1024px)**: Full studio layout with draggable 3D canvas and floating customization dock.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `PUT` `/api/books/:bookId/cover`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ coverColor: string, foilStamping: 'gold' | 'silver' | 'blind_emboss' | 'none', coverTitle: string, spineText?: string, materialType: string }`
- **Response Payload**: `{ success: true, data: { book: BookDocument } }`
- **Status Codes**: `200 OK`, `400 Bad Request`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `book-service`
- **Database Tables**: `books`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `book.cover_updated`
- **BullMQ Background Jobs**: `render-cover-texture-cache`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Cover parameters saved in book schema.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] updates Three.js material uniforms when color swatch clicked
  - [ ] validates spine text character limit
- **Integration Tests**:
  - [ ] PUT /api/books/:bookId/cover saves cover parameters
- **End-to-End Acceptance Tests**:
  - [ ] changes cover color to Plum, selects Gold foil, confirms 3D foil reflection, clicks Save

#### 17. UI Component Inventory
`CoverCanvas`, `MaterialPicker`, `FoilSelector`, `SpineInput`, `Button`

---

### PWA-64 — 2D Page & Spread Editor (5-Panel Publishing Studio)

**Category**: Web & PWA — Books & 3D Studio  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Edit book page spreads in a professional 5-panel layout with canvas rulers, guides, bleed areas, snapping, and rich frames.
- **User Story**: "As an archivist author, I want a publishing spread editor with safe margins, photo frame cropping, and text boxes to arrange our memories."

#### 2. Navigation & Routing
- **Entry Routes**: `/books/:bookId/editor`, `/books/:bookId`
- **Exit Routes**: `/books/:bookId/reader`, `/books/:bookId/proof`, `/books/:bookId`
- **Back Navigation**: `/books/:bookId`
- **Deep Link**: `https://memoria.local/books/:bookId/editor`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member (Contributor+)
- **Required Capabilities**: `edit_book`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Top Studio Bar: Book title, Current Spread indicator ('Spread 4 of 24 · Pages 6–7'), Undo/Redo buttons, Zoom selector, 'Preflight Check' button, '3D Preview' button, 'Save' indicator.
- **Main Content**: Center Stage: High-fidelity 2D Spread Canvas (Left page + Right page) with millimeter rulers, 3mm red bleed guides, safe zone margins, magnetic snapping guides.
- **Aside / Sidebar**: Left Panel: Asset tray (memories, photos, documents ready to drag onto canvas). Right Panel: Element Inspector (coordinates, dimensions, font size, frame fit/fill, border, opacity).
- **Footer / Actions Bar**: Bottom Strip: Horizontal thumbnail page manager strip (PWA-65) with add spread (+) button.

#### 5. Interactive Controls & UI Elements
- Undo Button (Cmd+Z)
- Redo Button (Cmd+Shift+Z)
- Add Image Frame tool button
- Add Text Frame tool button
- Add Heading tool button
- Zoom In / Out / Fit buttons
- Page Spread Navigation chevrons (Prev, Next Spread)
- Open 3D Reader Button
- Run Preflight Button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Spread canvas stage`
- **Tab Sequence**: `Top bar` -> `Left asset tray` -> `Canvas elements` -> `Right inspector` -> `Thumbnail strip`
- **Keyboard Shortcuts**: `Cmd+Z (Undo)`, `Cmd+Shift+Z (Redo)`, `Delete/Backspace (Delete element)`, `Cmd+S (Save)`
- **Escape Key Action**: Deselects active element

#### 8. States Matrix
- **Loading State**: Canvas loading skeleton with ruler markings.
- **Empty State**: Blank spread with template layout placeholders.
- **Populated State**: Interactive spreads with high-resolution photo frames and serif text boxes.
- **Error State**: Error banner if spread fails to load.
- **Offline Mode**: Full spread state stored locally in IndexedDB with optimistic saves.
- **Permission Denied**: 403 Forbidden: Read-only mode activated.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "2D Spread Editor. Currently editing pages 6 and 7. Use inspector to modify elements."
- **Touch Target Minimum**: `44x44 px for toolbar actions`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Simplified single-page mobile layout with bottom drawer inspector.
- **Tablet (768px – 1024px)**: Collapsed side panels with tap-to-expand trays.
- **Desktop (> 1024px)**: Full 5-panel professional studio layout with draggable asset tray and inspector dock.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `PUT` `/api/books/:bookId/spreads/:spreadId`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ leftPage: BookPage | null, rightPage: BookPage | null }`
- **Response Payload**: `{ success: true, data: { spread: BookSpread } }`
- **Status Codes**: `200 OK`, `400 Bad Request`, `409 Conflict`

#### 13. Service Architecture & Persistence
- **Backend Service**: `book-service`
- **Database Tables**: `books`, `book_spreads`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `book.spread_updated`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Optimistic concurrency versioning prevents spread overwrites.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] enforces 3mm bleed constraint and safe zone bounds
  - [ ] executes undo/redo stack accurately
- **Integration Tests**:
  - [ ] PUT /api/books/:bookId/spreads/:spreadId validates schema and saves in database
- **End-to-End Acceptance Tests**:
  - [ ] drags image from asset tray to left page, edits caption text, clicks Save

#### 17. UI Component Inventory
`SpreadStudio`, `RulerCanvas`, `AssetTray`, `ElementInspector`, `PageStrip`

---

### PWA-65 — Page Manager, Thumbnail Strip & Re-Ordering Grid

**Category**: Web & PWA — Books & 3D Studio  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: View all book spreads as a miniature thumbnail grid, reorder spreads via drag-and-drop, add/delete spreads, and inspect pagination.
- **User Story**: "As an author, I want to drag Spread 12 before Spread 8 to reorganize our family vacation chapter."

#### 2. Navigation & Routing
- **Entry Routes**: `/books/:bookId/pages`, `/books/:bookId/editor#pages`
- **Exit Routes**: `/books/:bookId/editor`, `/books/:bookId`
- **Back Navigation**: `/books/:bookId/editor`
- **Deep Link**: `https://memoria.local/books/:bookId/pages`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member (Contributor+)
- **Required Capabilities**: `edit_book`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Title 'Book Page Manager' with total spread count ('24 spreads · 48 pages'), '+ Insert Spread' button.
- **Main Content**: Grid of Spread Thumbnails (left and right page pairs with page numbers), drag handles, duplicate spread button, delete spread button.
- **Footer / Actions Bar**: 'Save New Page Sequence' button and Cancel button.

#### 5. Interactive Controls & UI Elements
- Button: '+ Insert Blank Spread'
- Drag handle on thumbnail spreads
- Duplicate Spread button
- Delete Spread button (with confirmation modal)
- Spread thumbnail click (jumps directly to spread in editor)

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First spread thumbnail`
- **Tab Sequence**: `Insert button` -> `Thumbnails` -> `Action buttons`
- **Keyboard Shortcuts**: `Cmd+D (Duplicate focused spread)`, `Delete (Delete focused spread)`
- **Escape Key Action**: Returns to editor

#### 8. States Matrix
- **Loading State**: Thumbnail grid skeleton pulse.
- **Empty State**: Notice: 'Book has no pages yet.'
- **Populated State**: Crisp vector-rendered miniature spreads with accurate photo placement.
- **Error State**: Error banner with refresh button.
- **Offline Mode**: Cached page structure available offline.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Page manager thumbnail grid. Drag spreads to reorder book pagination."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Vertical list of spreads with Move Up / Move Down buttons.
- **Tablet (768px – 1024px)**: 3-column thumbnail grid.
- **Desktop (> 1024px)**: 4 or 5-column thumbnail grid with drag ghost animation.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `PUT` `/api/books/:bookId/spreads/reorder`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ spreadIds: string[] }`
- **Response Payload**: `{ success: true, data: { updated: boolean } }`
- **Status Codes**: `200 OK`, `400 Bad Request`

#### 13. Service Architecture & Persistence
- **Backend Service**: `book-service`
- **Database Tables**: `book_spreads`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `book.spreads_reordered`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Page order strictly sequential; preserves page numbering.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] updates page numbers (1..N) automatically when spreads reordered
  - [ ] prevents odd page counts
- **Integration Tests**:
  - [ ] PUT /api/books/:bookId/spreads/reorder saves order in transaction
- **End-to-End Acceptance Tests**:
  - [ ] drags spread 3 to position 1, verifies renumbered pages

#### 17. UI Component Inventory
`PageManagerGrid`, `SpreadThumbnail`, `DragHandle`, `Button`

---

### PWA-66 — Asset Placement, Image Box Cropping & Focal Point Adjustment

**Category**: Web & PWA — Books & 3D Studio  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Position photos inside page picture boxes, adjust focal point centering, set zoom scale, and review DPI warnings.
- **User Story**: "As an archivist, I want to adjust the focal point on grandfather's face inside a circular portrait frame so he is centered without cropping his hat."

#### 2. Navigation & Routing
- **Entry Routes**: `/books/:bookId/editor#crop`, `/books/:bookId/editor`
- **Exit Routes**: `/books/:bookId/editor`, `/books/:bookId`
- **Back Navigation**: `/books/:bookId/editor`
- **Deep Link**: `https://memoria.local/books/:bookId/editor#crop`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member (Contributor+)
- **Required Capabilities**: `edit_book`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Crop modal bar: Picture frame name, Print resolution status badge (e.g. '312 DPI · Print Quality Excellent'), Done button.
- **Main Content**: Interactive focal point stage: Image box boundary with crosshair reticle, slider for scale (100% to 300%), pan drag controls.
- **Footer / Actions Bar**: Fit options: 'Fit to Frame', 'Fill Frame', 'Reset Crop', Done button.

#### 5. Interactive Controls & UI Elements
- Fit to Frame Button
- Fill Frame Button
- Scale Slider
- Focal Point Crosshair drag target
- Done Button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Scale slider`
- **Tab Sequence**: `Fit buttons` -> `Scale slider` -> `Done button`
- **Escape Key Action**: Cancels crop edits

#### 8. States Matrix
- **Loading State**: Loading full-resolution asset skeleton.
- **Empty State**: N/A
- **Populated State**: Interactive crop frame with real-time DPI calculation.
- **Error State**: DPI warning badge in amber if resolution falls below 200 DPI.
- **Offline Mode**: Offline adjustments saved locally.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Asset placement and focal crop editor. Adjust image zoom and centering in frame."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Full screen crop sheet.
- **Tablet (768px – 1024px)**: Centered modal max-width 600px.
- **Desktop (> 1024px)**: Centered modal max-width 700px with high-precision drag reticle.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `PATCH` `/api/books/:bookId/spreads/:spreadId/elements/:elementId`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ style: { cropX: number, cropY: number, cropScale: number } }`
- **Response Payload**: `{ success: true, data: { updatedElement: PageElement } }`
- **Status Codes**: `200 OK`, `400 Bad Request`

#### 13. Service Architecture & Persistence
- **Backend Service**: `book-service`
- **Database Tables**: `book_spreads`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: _None_
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: No
- **Privacy Architecture**: Non-destructive coordinates saved in element schema.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] calculates effective print DPI based on physical box size and source pixel dimensions
  - [ ] clamps crop bounds
- **Integration Tests**:
  - [ ] PATCH updates element style in database
- **End-to-End Acceptance Tests**:
  - [ ] adjusts scale slider to 125%, drags focal crosshair, clicks Done

#### 17. UI Component Inventory
`CropModal`, `FocalReticle`, `DPIMeter`, `Button`

---

### PWA-67 — 2D Full Book Proofing & Bleed Preview

**Category**: Web & PWA — Books & 3D Studio  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Inspect the complete book in continuous 2D spreads with bleed guides toggled off for print sign-off.
- **User Story**: "As an archivist author, I want to flip through high-resolution 2D proofs of all 48 pages to check typos and margin alignments before ordering."

#### 2. Navigation & Routing
- **Entry Routes**: `/books/:bookId/proof`, `/books/:bookId`
- **Exit Routes**: `/books/:bookId/editor`, `/books/:bookId/preflight`
- **Back Navigation**: `/books/:bookId`
- **Deep Link**: `https://memoria.local/books/:bookId/proof`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member
- **Required Capabilities**: `view_book`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Proof viewer header: Book title, Spread indicator ('Spread 12 of 24'), Bleed Guides Toggle switch, Zoom control, Fullscreen button.
- **Main Content**: Continuous horizontal spread stage with realistic paper texture and shadow crease at spine.
- **Footer / Actions Bar**: Bottom floating HUD: Previous Spread chevron, Next Spread chevron, 'Approve Proof' button, 'Return to Editor' button.

#### 5. Interactive Controls & UI Elements
- Previous Spread button (ArrowLeft)
- Next Spread button (ArrowRight)
- Bleed & Safe Area Guides Toggle
- Approve Proof Button
- Return to Editor Button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Next Spread button`
- **Tab Sequence**: `Top bar` -> `Navigation chevrons` -> `Approve button`
- **Keyboard Shortcuts**: `ArrowRight (Next)`, `ArrowLeft (Prev)`, `KeyB (Toggle Bleed Guides)`
- **Escape Key Action**: Returns to book overview

#### 8. States Matrix
- **Loading State**: High-resolution proof rendering spinner.
- **Empty State**: N/A
- **Populated State**: Crisp archival proofs rendered in permanent Light Mode Living Archive palette.
- **Error State**: Error banner with refresh button.
- **Offline Mode**: Cached proofs available offline.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "2D Book Proof Viewer. Review spreads sequentially with page numbers."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Single page view with horizontal swipe gestures.
- **Tablet (768px – 1024px)**: Side-by-side spread view.
- **Desktop (> 1024px)**: Side-by-side spread view with realistic paper drop shadow.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/books/:bookId/proof`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { spreads: Array<BookSpread>, isPrintReady: boolean } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `book-service`
- **Database Tables**: `books`, `book_spreads`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `book.proof_viewed`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: No
- **Privacy Architecture**: Proofs rendered with watermarking if unapproved.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] toggles bleed guides on and off
  - [ ] navigates through all spreads sequentially
- **Integration Tests**:
  - [ ] GET /api/books/:bookId/proof compiles spread elements
- **End-to-End Acceptance Tests**:
  - [ ] flips through 5 spreads, toggles bleed guides, clicks Preflight Check

#### 17. UI Component Inventory
`ProofViewerStage`, `BleedGuideOverlay`, `ProofHUD`, `Button`

---

### PWA-68 — Interactive 3D Book Reader & Page-Curl Engine

**Category**: Web & PWA — Books & 3D Studio  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Immerse in the final memory book in a realistic 3D simulation with cover opening, articulated spine flex, gesture page-curl, and reading cradle.
- **User Story**: "As an archivist, I want to open our heirloom book in 3D, flip through pages with realistic curl physics, and share the interactive keepsake with family."

#### 2. Navigation & Routing
- **Entry Routes**: `/books/:bookId/reader`, `/books/:bookId`
- **Exit Routes**: `/books/:bookId`, `/bookshelf`
- **Back Navigation**: `/books/:bookId`
- **Deep Link**: `https://memoria.local/books/:bookId/reader`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member
- **Required Capabilities**: `view_book`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Top Reader Bar: Book title, Current page counter, Close (X) button.
- **Main Content**: Three.js WebGL canvas: Complete 3D articulated book model with leather covers, cambered spine flex, gold silk ribbon bookmark, and curled turning pages.
- **Footer / Actions Bar**: Bottom floating HUD: Open / Close Cover, Previous Page, Next Page, Reset Camera Angle, 2D Flat Proof Toggle, Fullscreen.

#### 5. Interactive Controls & UI Elements
- Open Cover / Close Cover Button
- Next Page Button (ArrowRight / Mouse drag on page corner)
- Previous Page Button (ArrowLeft / Mouse drag on left corner)
- Orbit / Pan / Zoom pointer drag controls
- Reset Camera View Button
- 2D Accessible Fallback Toggle Button
- Fullscreen Button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Open Cover button in HUD`
- **Tab Sequence**: `Close button` -> `Bottom HUD buttons`
- **Keyboard Shortcuts**: `ArrowRight (Next Page)`, `ArrowLeft (Prev Page)`, `Space (Toggle Cover)`, `KeyR (Reset Camera)`, `Key2 (Toggle 2D Proof)`
- **Escape Key Action**: Exits fullscreen or returns to book overview

#### 8. States Matrix
- **Loading State**: 3D asset and texture loading spinner with percentage bar.
- **Empty State**: N/A
- **Populated State**: Silky 60 FPS Three.js / R3F experience with archival materials and realistic page deformation.
- **Error State**: WebGL fallback banner: switches seamlessly to 2D Proof Viewer (PWA-67).
- **Offline Mode**: 3D model and textures served from service worker cache.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "3D Book Reader. Use arrow keys to turn pages, Space to toggle cover. 2D accessible alternative available."
- **Touch Target Minimum**: `48x48 px floating action buttons`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `8.5:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Touch swipe gestures to turn pages; fixed cradle angle.
- **Tablet (768px – 1024px)**: Touch orbit and pinch-to-zoom allowed, side navigation chevrons.
- **Desktop (> 1024px)**: Mouse drag orbit, scroll wheel zoom, full screen studio lighting mode.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/books/:bookId/3d-model`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { modelUrl: string, textureUrls: Record<string, string>, spreads: Array<BookSpread> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`, `404 Not Found`

#### 13. Service Architecture & Persistence
- **Backend Service**: `book-service / 3D Asset Pipeline`
- **Database Tables**: `books`, `book_spreads`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `3d.reader_opened`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: No
- **Privacy Architecture**: Book page textures rendered on-the-fly and token protected.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] executes page turn animation from spread 0 to N
  - [ ] activates 2D fallback on WebGL context loss
- **Integration Tests**:
  - [ ] GET /api/books/:bookId/3d-model returns valid texture and spread metadata
- **End-to-End Acceptance Tests**:
  - [ ] opens 3D reader, turns 3 pages via right arrow, presses Space to close cover

#### 17. UI Component Inventory
`ExperienceCanvas`, `ReaderHUD`, `PageTurnController`, `FlatProofFallback`

---

### PWA-69 — Automated Print Preflight Validator

**Category**: Web & PWA — Books & 3D Studio  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Validate print readiness: bleed margins, trim lines, image resolution (DPI >= 300), font embedding, and spine thickness.
- **User Story**: "As an archivist, I want an automated preflight check to identify any low-resolution photos or text cut off by trim lines before printing."

#### 2. Navigation & Routing
- **Entry Routes**: `/books/:bookId/preflight`, `/books/:bookId/editor`
- **Exit Routes**: `/books/:bookId/order`, `/books/:bookId/editor`
- **Back Navigation**: `/books/:bookId`
- **Deep Link**: `https://memoria.local/books/:bookId/preflight`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member (Contributor+)
- **Required Capabilities**: `preflight_book`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Title 'Archival Print Preflight Inspection' with overall status badge ('Ready for Print' or '2 Warnings Detected').
- **Main Content**: Categorized validation checklist: 1. Bleed & Safe Margins (3mm bleed verification), 2. Image Resolution (Checks all photos >= 300 DPI), 3. Spine Width Calculation (computed based on 48 pages @ 140gsm), 4. Missing Assets Check, 5. Color Profile (CMYK Fogra39 compliance).
- **Aside / Sidebar**: Warning resolution helper: click warning to jump directly to offending spread in editor.
- **Footer / Actions Bar**: 'Freeze Edition & Proceed to Print' button (disabled if blocking errors exist).

#### 5. Interactive Controls & UI Elements
- Button: 'Re-Run Preflight Checks'
- Click warning item (deep links to spread in 2D editor)
- Primary Button: 'Freeze Edition & Order Hardcover'
- Download Preflight Audit Report (PDF)

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First preflight check item`
- **Tab Sequence**: `Check items` -> `Warning links` -> `Proceed button`
- **Escape Key Action**: Returns to book overview

#### 8. States Matrix
- **Loading State**: Scanning all pages and calculating image DPI spinner.
- **Empty State**: N/A
- **Populated State**: Checklist with green checkmarks and amber warning tags.
- **Error State**: Blocking red error alerts if photos are missing or bleed violated.
- **Offline Mode**: Offline preflight executed via client-side canvas checks.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Print preflight validator. Lists passed checks and warnings for physical print readiness."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Single column checklist.
- **Tablet (768px – 1024px)**: Two-column layout (Checklist left, Spread preview right).
- **Desktop (> 1024px)**: Max-width 1000px structured preflight dashboard.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/books/:bookId/preflight`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { isPassed: boolean, warningsCount: number, errorsCount: number, checks: Array<{ name: string, status: 'pass' | 'warn' | 'fail', details: string, spreadIndex?: number }> } }`
- **Status Codes**: `200 OK`, `400 Bad Request`

#### 13. Service Architecture & Persistence
- **Backend Service**: `book-service`
- **Database Tables**: `books`, `book_spreads`, `audit_logs`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `book.preflight_executed`
- **BullMQ Background Jobs**: `verify-book-dpi-integrity`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Preflight results stored in edition metadata.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] flags image with effective DPI < 200 as warning
  - [ ] computes spine width from page count correctly
- **Integration Tests**:
  - [ ] POST /api/books/:bookId/preflight executes validation rules
- **End-to-End Acceptance Tests**:
  - [ ] runs preflight on valid book, verifies 100% pass, clicks Freeze Edition

#### 17. UI Component Inventory
`PreflightDashboard`, `ChecklistCard`, `WarningCallout`, `Button`

---

### PWA-70 — Version History, Edition Diffs & Frozen Print Archives

**Category**: Web & PWA — Books & 3D Studio  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Inspect frozen print edition snapshots, review immutable SHA-256 hashes, compare edition diffs, and restore prior editions as new drafts.
- **User Story**: "As an archivist, I want to inspect Edition 1 printed in 2023, verify its immutable hash, and create an expanded Edition 2 for 2024."

#### 2. Navigation & Routing
- **Entry Routes**: `/books/:bookId/editions`, `/books/:bookId`
- **Exit Routes**: `/books/:bookId`, `/books/new?forkFrom=:editionId`
- **Back Navigation**: `/books/:bookId`
- **Deep Link**: `https://memoria.local/books/:bookId/editions`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member
- **Required Capabilities**: `view_editions`, `freeze_edition (Owner/Editor)`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Title 'Archival Edition History' with book title and current version badge.
- **Main Content**: Chronological edition timeline: Edition 1 (Frozen Oct 2023 · SHA-256: e3b0c442... · 48 pages · Printed 3 copies), Edition 2 (Current Draft · 56 pages). Diffs inspector showing added/removed pages.
- **Footer / Actions Bar**: 'Branch into New Edition' button.

#### 5. Interactive Controls & UI Elements
- Button: 'Branch as New Editable Edition'
- Button: 'Download Frozen Edition PDF Archive'
- Compare Editions toggle button
- Copy SHA-256 Checksum button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First edition card`
- **Tab Sequence**: `Edition cards` -> `Branch button` -> `Download PDF button`
- **Escape Key Action**: Returns to book overview

#### 8. States Matrix
- **Loading State**: Edition timeline skeleton pulse.
- **Empty State**: Notice: 'No frozen editions yet. Freeze an edition when ready for printing.'
- **Populated State**: Detailed timeline of immutable historical editions with verified checksums.
- **Error State**: Error banner with reload button.
- **Offline Mode**: Cached edition history available offline.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Version history and frozen print archives. Inspect prior printed editions."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Single column vertical list.
- **Tablet (768px – 1024px)**: Centered 680px timeline.
- **Desktop (> 1024px)**: Centered 840px layout with side-by-side edition comparison.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/books/:bookId/editions`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { editions: Array<{ editionNumber: number, frozenHash: string, frozenAt: string, pageCount: number, printOrdersCount: number }> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `book-service`
- **Database Tables**: `books`, `audit_logs`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `book.edition_viewed`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Admin Audited`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Frozen editions cannot be overwritten or altered.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] verifies SHA-256 checksum formatting
  - [ ] prevents mutating frozen edition records
- **Integration Tests**:
  - [ ] GET /api/books/:bookId/editions returns historical snapshots
- **End-to-End Acceptance Tests**:
  - [ ] views Edition 1, copies hash, clicks 'Branch as New Edition'

#### 17. UI Component Inventory
`EditionTimeline`, `EditionCard`, `ChecksumBadge`, `Button`

---

### 1.7 Physical Book Commerce & Fulfillment (PWA-71 to PWA-76)

### PWA-71 — Print Format, Paper Weight & Binding Selector

**Category**: Web & PWA — Commerce  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Select fine-art paper weight (140gsm archival matte or 170gsm photo lustre) and binding finish with transparent at-cost pricing.
- **User Story**: "As an archivist ordering a physical heirloom book, I want to choose 170gsm lustre paper and leather binding with complete price transparency."

#### 2. Navigation & Routing
- **Entry Routes**: `/books/:bookId/order`, `/books/:bookId/preflight`
- **Exit Routes**: `/books/:bookId/order/shipping`, `/books/:bookId`
- **Back Navigation**: `/books/:bookId/preflight`
- **Deep Link**: `https://memoria.local/books/:bookId/order`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member (Contributor+)
- **Required Capabilities**: `order_book`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Order Step 1 of 4; title 'Select Heirloom Paper & Binding'.
- **Main Content**: 1. Paper Stock selector: 140gsm Archival Matte (Warm, non-glare, fine-text) vs 170gsm Photo Lustre (Vibrant colors, rich contrast), 2. Binding Finish: Archival Fine Leather vs Premium Bookcloth, 3. Quantity selector (1 to 20 copies with volume discount breakdown), 4. Transparent cost summary.
- **Footer / Actions Bar**: Cost total ($0 software markups, at-cost printing only) and 'Continue to Shipping' button.

#### 5. Interactive Controls & UI Elements
- Paper Stock radio cards (140gsm Matte / 170gsm Lustre)
- Binding selector radio cards (Fine Leather / Bookcloth)
- Quantity increment / decrement buttons (+/-)
- Continue Button: 'Proceed to Shipping Address'

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First paper stock card`
- **Tab Sequence**: `Paper cards` -> `Binding cards` -> `Quantity buttons` -> `Continue button`
- **Escape Key Action**: Returns to book overview

#### 8. States Matrix
- **Loading State**: Calculating printing print catalog rates spinner.
- **Empty State**: N/A
- **Populated State**: Interactive pricing breakdown updating in real-time as options change.
- **Error State**: Error banner with refresh button.
- **Offline Mode**: Commerce options require local/online server connection.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Print options: Choose paper stock, binding finish, and quantity. Transparent at-cost pricing displayed."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Stacked option cards with sticky bottom price bar.
- **Tablet (768px – 1024px)**: Two-column layout (Options left, Price summary right).
- **Desktop (> 1024px)**: Max-width 1000px layout with paper macro photography previews.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/commerce/catalog/options`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { paperStocks: Array<any>, bindings: Array<any>, basePriceCents: number } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `commerce-service / api-gateway`
- **Database Tables**: `print_orders`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: _None_
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: No
- **Privacy Architecture**: Transparent $0 markup local printing catalog.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] calculates total order cost based on page count and selected paper stock
  - [ ] clamps quantity between 1 and 20
- **Integration Tests**:
  - [ ] GET /api/commerce/catalog/options returns valid stock choices
- **End-to-End Acceptance Tests**:
  - [ ] selects 170gsm Lustre, sets quantity 2, verifies updated total, clicks Continue

#### 17. UI Component Inventory
`StockSelector`, `BindingPicker`, `QuantityStepper`, `PriceSummary`, `Button`

---

### PWA-72 — Shipping Address & Delivery Estimator

**Category**: Web & PWA — Commerce  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Enter delivery address, validate postal formatting, and calculate real shipping rates.
- **User Story**: "As an archivist, I want to enter my home shipping address and choose standard or priority archival shipping."

#### 2. Navigation & Routing
- **Entry Routes**: `/books/:bookId/order/shipping`, `/books/:bookId/order`
- **Exit Routes**: `/books/:bookId/order/checkout`, `/books/:bookId/order`
- **Back Navigation**: `/books/:bookId/order`
- **Deep Link**: `https://memoria.local/books/:bookId/order/shipping`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member
- **Required Capabilities**: `order_book`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Order Step 2 of 4; title 'Shipping Destination'.
- **Main Content**: Form: Full Name, Street Address, Apartment/Suite, City, State/Province, Postal Code, Country selector, Phone number (for delivery courier), Shipping speed selector (Standard Archival 5–7 days vs Express Courier 2–3 days).
- **Footer / Actions Bar**: Order summary sidebar with estimated delivery date and 'Continue to Review & Pay' button.

#### 5. Interactive Controls & UI Elements
- Address form inputs
- Country dropdown
- Shipping speed radio options
- Continue Button

#### 6. Form Validation & Data Schema

| Field Name | Data Type | Required | Limits & Constraints | Validation Rule | Error Copy |
|---|---|---|---|---|---|
| `fullName` | `text` | **Yes** | 2-100 chars | Standard type validation | Full name is required. |
| `addressLine1` | `text` | **Yes** | 5-120 chars | Standard type validation | Street address is required. |
| `city` | `text` | **Yes** | 2-80 chars | Standard type validation | City is required. |
| `postalCode` | `text` | **Yes** | 3-12 chars | Standard type validation | Valid postal code is required. |
| `country` | `select` | **Yes** | N/A | Standard type validation | Country is required. |

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Full Name field`
- **Tab Sequence**: `Name` -> `Address 1` -> `Address 2` -> `City` -> `State` -> `Postal Code` -> `Country` -> `Shipping speed` -> `Continue`
- **Escape Key Action**: Returns to step 1

#### 8. States Matrix
- **Loading State**: Validating address with postal database spinner.
- **Empty State**: Blank address form.
- **Populated State**: Valid address entered with shipping estimate.
- **Error State**: Inline address validation error alerts.
- **Offline Mode**: Offline warning.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Shipping address form. Enter delivery location and select courier speed."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Single column form.
- **Tablet (768px – 1024px)**: Centered 600px form.
- **Desktop (> 1024px)**: Two-column layout (Address form left 65%, Order summary right 35%).

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/commerce/shipping/estimate`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ country: string, postalCode: string, quantity: number, format: BookFormat }`
- **Response Payload**: `{ success: true, data: { rates: Array<{ id: string, name: string, priceCents: number, estimatedDays: string }> } }`
- **Status Codes**: `200 OK`, `400 Bad Request`

#### 13. Service Architecture & Persistence
- **Backend Service**: `commerce-service`
- **Database Tables**: `print_orders`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: _None_
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Shipping addresses treated as confidential PII; zero third-party broker exposure.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] validates postal code formats for US/UK/CA/EU
  - [ ] computes shipping estimates
- **Integration Tests**:
  - [ ] POST /api/commerce/shipping/estimate returns courier rates
- **End-to-End Acceptance Tests**:
  - [ ] fills address form, selects Standard shipping, continues to checkout

#### 17. UI Component Inventory
`ShippingForm`, `CourierSpeedSelector`, `OrderSummarySidebar`, `Button`

---

### PWA-73 — Order Checkout & Payment Sandbox Review

**Category**: Web & PWA — Commerce  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Review total itemized costs (printing, binding, shipping, taxes) and submit payment via authorized sandbox/live provider.
- **User Story**: "As an archivist, I want to review the exact order details and complete payment with zero hidden fees."

#### 2. Navigation & Routing
- **Entry Routes**: `/books/:bookId/order/checkout`, `/books/:bookId/order/shipping`
- **Exit Routes**: `/orders/:orderId/confirmation`, `/books/:bookId/order/shipping`
- **Back Navigation**: `/books/:bookId/order/shipping`
- **Deep Link**: `https://memoria.local/books/:bookId/order/checkout`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member
- **Required Capabilities**: `place_order`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Order Step 3 of 4; title 'Review & Confirm Print Order'.
- **Main Content**: 1. Order Item Breakdown (Book title, edition hash, cover color, paper stock, quantity), 2. Shipping Address review card, 3. Itemized invoice (Subtotal, Shipping, Tax, Total), 4. Payment boundary card (Card details / Local Sandbox Test Card).
- **Footer / Actions Bar**: 'Confirm & Place Order' button and cancellation link.

#### 5. Interactive Controls & UI Elements
- Place Order Button (disabled until payment details validated)
- Edit shipping address link
- Edit book options link

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Place Order button`
- **Tab Sequence**: `Review cards` -> `Payment inputs` -> `Place Order button`
- **Escape Key Action**: Returns to shipping

#### 8. States Matrix
- **Loading State**: Processing payment and creating immutable print order spinner.
- **Empty State**: N/A
- **Populated State**: Complete transparent invoice with clear breakdown.
- **Error State**: Payment declined or provider failure alert with actionable retry.
- **Offline Mode**: Orders cannot be placed offline.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Checkout review. Itemized order costs and payment submission."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Stacked review cards with sticky bottom Place Order button.
- **Tablet (768px – 1024px)**: Two-column layout.
- **Desktop (> 1024px)**: Max-width 900px structured checkout layout.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/commerce/orders`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ bookId: string, frozenEditionHash: string, quantity: number, paperStock: string, shippingAddress: any, paymentToken?: string }`
- **Response Payload**: `{ success: true, data: { orderId: string, totalCents: number, status: 'confirmed' } }`
- **Status Codes**: `201 Created`, `400 Bad Request`, `402 Payment Required`

#### 13. Service Architecture & Persistence
- **Backend Service**: `commerce-service`
- **Database Tables**: `print_orders`, `order_items`, `fulfilment_records`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `commerce.order_placed`
- **BullMQ Background Jobs**: `generate-print-pdf-package`, `dispatch-order-to-press`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Admin Audited`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Zero raw credit card numbers stored; uses authorized tokenization only.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] enforces idempotency key on order submission to prevent double billing
  - [ ] verifies edition hash matches book
- **Integration Tests**:
  - [ ] POST /api/commerce/orders creates print_orders record
- **End-to-End Acceptance Tests**:
  - [ ] submits test order, observes confirmation redirect with order ID

#### 17. UI Component Inventory
`CheckoutReview`, `InvoiceTable`, `PaymentCard`, `Button`

---

### PWA-74 — Order Confirmation & Printable Archival Receipt

**Category**: Web & PWA — Commerce  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Receive verified order confirmation, receipt with immutable edition hash, estimated dispatch date, and printable PDF invoice.
- **User Story**: "As an archivist, I want a printable archival receipt with order number and edition hash so I have a permanent physical record."

#### 2. Navigation & Routing
- **Entry Routes**: `/orders/:orderId/confirmation`, `/books/:bookId/order/checkout`
- **Exit Routes**: `/orders/:orderId/tracking`, `/bookshelf`, `/dashboard`
- **Back Navigation**: `/dashboard`
- **Deep Link**: `https://memoria.local/orders/:orderId/confirmation`

#### 3. Personas & Authorization
- **Eligible Roles**: Order Placer, Space Owner
- **Required Capabilities**: `view_order_confirmation`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Confirmation seal: 'Order Confirmed · Your memories are being crafted into print'.
- **Main Content**: 1. Order Reference Number (e.g. '#MEM-84920'), 2. Immutable Edition Hash badge, 3. Estimated Delivery Date, 4. Full itemized receipt, 5. Delivery address.
- **Footer / Actions Bar**: Action buttons: 'Track Production & Shipping' (PWA-75), 'Print Receipt (PDF)', 'Return to Bookshelf'.

#### 5. Interactive Controls & UI Elements
- Button: 'Track Production Progress'
- Button: 'Download Printable Receipt (PDF)'
- Button: 'Return to Bookshelf'

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Track Production button`
- **Tab Sequence**: `Track button` -> `Download PDF button` -> `Return button`
- **Escape Key Action**: None

#### 8. States Matrix
- **Loading State**: Fetching confirmed order record skeleton.
- **Empty State**: N/A
- **Populated State**: Celebratory archival receipt card in Warm Ivory #F7F4EE with Soft Sage #849483 checkmark.
- **Error State**: Error banner if order lookup fails.
- **Offline Mode**: Cached receipt view available offline.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Order confirmation. Order #MEM-84920 confirmed. Estimated delivery June 24."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Single column receipt card.
- **Tablet (768px – 1024px)**: Centered 600px card.
- **Desktop (> 1024px)**: Centered 680px archival receipt with print stylesheet.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/commerce/orders/:orderId`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { order: any, items: Array<any>, status: string } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`, `404 Not Found`

#### 13. Service Architecture & Persistence
- **Backend Service**: `commerce-service`
- **Database Tables**: `print_orders`, `order_items`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: _None_
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: No
- **Privacy Architecture**: Order receipts protected by user authorization.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] renders print stylesheet cleanly without navigation headers
  - [ ] formats currency values
- **Integration Tests**:
  - [ ] GET /api/commerce/orders/:orderId returns confirmed order
- **End-to-End Acceptance Tests**:
  - [ ] verifies order confirmation details match placed items

#### 17. UI Component Inventory
`ReceiptCard`, `ConfirmationHeader`, `PrintButton`, `Button`

---

### PWA-75 — Real-Time Print Order Production & Shipping Tracker

**Category**: Web & PWA — Commerce  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Track physical book production through 5 verified stages: Preflight Verified → Printing Pages → Leather Binding → Dispatched → Delivered.
- **User Story**: "As an archivist waiting for our family keepsake, I want to see which stage of binding the book is in and view live courier tracking."

#### 2. Navigation & Routing
- **Entry Routes**: `/orders/:orderId/tracking`, `/orders/:orderId/confirmation`
- **Exit Routes**: `/bookshelf`, `/dashboard`
- **Back Navigation**: `/dashboard`
- **Deep Link**: `https://memoria.local/orders/:orderId/tracking`

#### 3. Personas & Authorization
- **Eligible Roles**: Order Placer, Space Owner
- **Required Capabilities**: `track_order`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Title 'Production & Delivery Tracker' with Order ID and estimated arrival.
- **Main Content**: 1. 5-Stage Stepper: Preflight Checked → Fine-Art Press Printing → Hand Binding & Debossing → Dispatched → Delivered. 2. Courier tracking link (FedEx/DHL/Postal), 3. Production notes log with timestamps.
- **Footer / Actions Bar**: Contact Support button regarding this order.

#### 5. Interactive Controls & UI Elements
- Courier external tracking link button
- Refresh tracking status button
- Support regarding order button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Active stage step`
- **Tab Sequence**: `Refresh button` -> `Tracking steps` -> `Courier link` -> `Support button`
- **Escape Key Action**: None

#### 8. States Matrix
- **Loading State**: Tracking timeline skeleton pulse.
- **Empty State**: N/A
- **Populated State**: Step indicator showing current active stage in Plum #76556F with completed steps in Sage #5F735E.
- **Error State**: Error banner with refresh button.
- **Offline Mode**: Cached tracking status served offline.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Order production tracker. Current stage: Hand Binding and Debossing. Estimated delivery in 4 days."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Vertical timeline stepper.
- **Tablet (768px – 1024px)**: Vertical timeline stepper with detailed stage notes.
- **Desktop (> 1024px)**: Horizontal multi-step stepper with animated progress connector.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/commerce/orders/:orderId/tracking`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { currentStage: string, estimatedDelivery: string, courierName?: string, trackingNumber?: string, history: Array<any> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`, `404 Not Found`

#### 13. Service Architecture & Persistence
- **Backend Service**: `commerce-service`
- **Database Tables**: `print_orders`, `fulfilment_records`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `order.tracking_viewed`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: No
- **Privacy Architecture**: Only genuine production milestones rendered.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] renders correct active step corresponding to order status
  - [ ] formats courier tracking URL
- **Integration Tests**:
  - [ ] GET /api/commerce/orders/:orderId/tracking returns fulfillment records
- **End-to-End Acceptance Tests**:
  - [ ] navigates to tracking, verifies current production step

#### 17. UI Component Inventory
`OrderStepper`, `StageCard`, `CourierLink`, `Button`

---

### PWA-76 — Reorder Dashboard & Immutable Print Edition Archive

**Category**: Web & PWA — Commerce  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Order additional identical copies of previously printed editions without altering any page layout.
- **User Story**: "As an archivist whose cousins loved our printed family book, I want to reorder 5 identical copies referencing the exact frozen Edition 1 hash."

#### 2. Navigation & Routing
- **Entry Routes**: `/books/:bookId/reorder`, `/books/:bookId`
- **Exit Routes**: `/books/:bookId/order/checkout`, `/books/:bookId`
- **Back Navigation**: `/books/:bookId`
- **Deep Link**: `https://memoria.local/books/:bookId/reorder`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member
- **Required Capabilities**: `order_book`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Title 'Reorder Prior Edition' with book title and edition selector.
- **Main Content**: 1. Frozen Edition Card (Hash, original print date, page count), 2. Quantity selector (1 to 50 copies), 3. Reorder price estimate, 4. Guarantee: 'Exact byte-for-byte reprint of frozen edition.'
- **Footer / Actions Bar**: 'Proceed to Reorder Checkout' button.

#### 5. Interactive Controls & UI Elements
- Edition dropdown selector
- Quantity increment / decrement buttons
- Button: 'Proceed to Reorder Checkout'

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Quantity selector`
- **Tab Sequence**: `Edition selector` -> `Quantity` -> `Checkout button`
- **Escape Key Action**: Returns to book overview

#### 8. States Matrix
- **Loading State**: Fetching frozen edition specifications spinner.
- **Empty State**: Notice: 'No prior editions have been printed for this book yet.'
- **Populated State**: Edition preview with verified checksum and quantity controls.
- **Error State**: Error banner with refresh button.
- **Offline Mode**: Offline indicator.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Reorder prior edition. Order additional copies of previously printed books."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Stacked vertical card.
- **Tablet (768px – 1024px)**: Centered 600px card.
- **Desktop (> 1024px)**: Centered 720px card.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/commerce/orders/reorder`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ originalOrderId: string, frozenEditionHash: string, quantity: number }`
- **Response Payload**: `{ success: true, data: { orderDraftId: string } }`
- **Status Codes**: `200 OK`, `400 Bad Request`

#### 13. Service Architecture & Persistence
- **Backend Service**: `commerce-service`
- **Database Tables**: `print_orders`, `order_items`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `commerce.reorder_initiated`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Reprint guaranteed to use identical frozen asset bundle.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] ensures reorder references existing frozen hash without regenerating spreads
- **Integration Tests**:
  - [ ] POST /api/commerce/orders/reorder creates order draft
- **End-to-End Acceptance Tests**:
  - [ ] selects 3 copies for reorder, proceeds to checkout

#### 17. UI Component Inventory
`ReorderCard`, `QuantityStepper`, `ChecksumBadge`, `Button`

---

### 1.8 Account & Support (PWA-77 to PWA-82)

### PWA-77 — User Profile, Avatar & Security Settings

**Category**: Web & PWA — Account & Support  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Manage account identity: update full name, upload profile avatar, change password, and view active sessions.
- **User Story**: "As an archivist, I want to update my profile picture and review which browsers are currently signed into my account."

#### 2. Navigation & Routing
- **Entry Routes**: `/settings/profile`, `/dashboard`
- **Exit Routes**: `/settings/preferences`, `/dashboard`
- **Back Navigation**: `/dashboard`
- **Deep Link**: `https://memoria.local/settings/profile`

#### 3. Personas & Authorization
- **Eligible Roles**: Authenticated Member
- **Required Capabilities**: `manage_account`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Settings Navigation (Profile, Preferences, Privacy, Storage, Data Export, Support).
- **Main Content**: 1. Avatar photo uploader with circular preview, 2. Full Name input, 3. Email Address (verified badge), 4. Change Password section (Current password, New password, Confirm), 5. Active Sessions list with 'Sign Out All Other Devices' button.
- **Footer / Actions Bar**: Save Profile Changes button.

#### 5. Interactive Controls & UI Elements
- Avatar photo picker button
- Full Name input field
- Change Password inputs
- Button: 'Update Password'
- Button: 'Sign Out All Other Sessions'
- Save Changes Button

#### 6. Form Validation & Data Schema

| Field Name | Data Type | Required | Limits & Constraints | Validation Rule | Error Copy |
|---|---|---|---|---|---|
| `fullName` | `text` | **Yes** | 2-100 characters | Standard type validation | Please enter your name. |

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Full Name input field`
- **Tab Sequence**: `Avatar` -> `Name` -> `Save button` -> `Password fields` -> `Sign out sessions`
- **Escape Key Action**: None

#### 8. States Matrix
- **Loading State**: Saving profile spinner.
- **Empty State**: N/A
- **Populated State**: Account details pre-filled.
- **Error State**: Inline validation error alerts.
- **Offline Mode**: Account changes disabled offline.
- **Permission Denied**: Redirect to login.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "User profile settings. Update name, avatar, password, and review active sessions."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Stacked vertical sections.
- **Tablet (768px – 1024px)**: Two-column settings layout (Nav left 30%, Content right 70%).
- **Desktop (> 1024px)**: Max-width 1000px settings layout with sticky sidebar.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `PATCH` `/api/users/me`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ fullName?: string, avatarUrl?: string }`
- **Response Payload**: `{ success: true, data: { user: UserProfile } }`
- **Status Codes**: `200 OK`, `400 Bad Request`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `identity-service`
- **Database Tables**: `users`, `user_sessions`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `identity.profile_updated`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Session revocations take effect immediately across all microservices.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] validates full name input
  - [ ] revokes all other user_sessions rows on sign out
- **Integration Tests**:
  - [ ] PATCH /api/users/me updates user record
- **End-to-End Acceptance Tests**:
  - [ ] updates name to 'Eleanor Vance-Morrison', clicks Save, confirms header update

#### 17. UI Component Inventory
`SettingsNav`, `AvatarUploader`, `InputField`, `SessionList`, `Button`

---

### PWA-78 — Application Preferences (Strict Light Living Archive)

**Category**: Web & PWA — Account & Support  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Configure interface preferences: language, reduced motion mode, default space, and email notifications (Theme toggle permanently disabled).
- **User Story**: "As an archivist with motion sensitivity, I want to enable reduced motion so 3D book page turns use gentle crossfades rather than curling motion."

#### 2. Navigation & Routing
- **Entry Routes**: `/settings/preferences`, `/settings/profile`
- **Exit Routes**: `/settings/profile`, `/dashboard`
- **Back Navigation**: `/dashboard`
- **Deep Link**: `https://memoria.local/settings/preferences`

#### 3. Personas & Authorization
- **Eligible Roles**: Authenticated Member
- **Required Capabilities**: `manage_preferences`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Title 'Application Preferences' with Living Archive theme declaration.
- **Main Content**: 1. Brand Identity notice: 'Memoria uses a permanent Light Living Archive appearance (#F7F4EE Warm Ivory). Zero dark mode switching.' 2. Reduced Motion toggle switch (replaces 3D physics with smooth 2D crossfade), 3. Default Landing Space dropdown, 4. Date formatting style (e.g. 'DD/MM/YYYY' vs 'Month DD, YYYY'), 5. Notification toggles.
- **Footer / Actions Bar**: Save Preferences Button.

#### 5. Interactive Controls & UI Elements
- Reduced Motion toggle switch
- Default Space selector dropdown
- Date format selector pills
- Notification email toggle switches
- Save Preferences Button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Reduced Motion toggle`
- **Tab Sequence**: `Reduced motion` -> `Default space` -> `Date format` -> `Notification toggles` -> `Save button`
- **Escape Key Action**: None

#### 8. States Matrix
- **Loading State**: Saving preferences spinner.
- **Empty State**: N/A
- **Populated State**: Current user preferences pre-selected.
- **Error State**: Error banner with reload button.
- **Offline Mode**: Preferences stored in local IndexedDB.
- **Permission Denied**: Redirect to login.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Preferences settings. Toggle reduced motion and choose date formatting. Permanent light mode enforced."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Stacked vertical form.
- **Tablet (768px – 1024px)**: Settings layout with side navigation.
- **Desktop (> 1024px)**: Max-width 800px preferences card.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `PATCH` `/api/users/me/preferences`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ reducedMotion: boolean, defaultSpaceId?: string, dateFormat: string, notifyComments: boolean }`
- **Response Payload**: `{ success: true, data: { preferences: any } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `identity-service`
- **Database Tables**: `users`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: _None_
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: No
- **Privacy Architecture**: Local user preferences.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] enforces light mode only; rejects dark mode preference keys
  - [ ] disables WebGL animations when reducedMotion is true
- **Integration Tests**:
  - [ ] PATCH /api/users/me/preferences updates user settings
- **End-to-End Acceptance Tests**:
  - [ ] toggles reduced motion on, verifies 3D reader uses 2D transition

#### 17. UI Component Inventory
`SettingsNav`, `ToggleSwitch`, `SelectDropdown`, `Button`

---

### PWA-79 — Privacy, Signed Link Duration & Sharing Controls

**Category**: Web & PWA — Account & Support  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Configure space privacy defaults, default expiration duration for external signed media links, and access audit logs.
- **User Story**: "As an archivist, I want to set default signed media link expiration to 1 hour to prevent unauthorized link sharing."

#### 2. Navigation & Routing
- **Entry Routes**: `/settings/privacy`, `/settings/profile`
- **Exit Routes**: `/settings/profile`, `/dashboard`
- **Back Navigation**: `/dashboard`
- **Deep Link**: `https://memoria.local/settings/privacy`

#### 3. Personas & Authorization
- **Eligible Roles**: Authenticated Member
- **Required Capabilities**: `manage_privacy`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Title 'Privacy & Archival Security Controls'.
- **Main Content**: 1. Signed Media URL Expiration duration selector (15 minutes, 1 hour, 24 hours), 2. Default space visibility (Private to invited members only), 3. Anonymous telemetry toggle (default OFF, zero external analytics), 4. Recent Security Access Events list (logins, IP addresses, timestamp).
- **Footer / Actions Bar**: Save Privacy Settings Button.

#### 5. Interactive Controls & UI Elements
- Signed Link Expiration dropdown (15m, 1h, 24h)
- Zero-Telemetry pledge badge
- Download Security Log Button
- Save Settings Button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Link expiration dropdown`
- **Tab Sequence**: `Dropdown` -> `Security logs` -> `Save button`
- **Escape Key Action**: None

#### 8. States Matrix
- **Loading State**: Saving privacy settings spinner.
- **Empty State**: N/A
- **Populated State**: Configured privacy parameters and security event audit list.
- **Error State**: Error banner with refresh button.
- **Offline Mode**: Offline indicator.
- **Permission Denied**: 401 Unauthorized.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Privacy and security settings. Configure link expiration and review security access logs."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Stacked vertical sections.
- **Tablet (768px – 1024px)**: Settings layout.
- **Desktop (> 1024px)**: Max-width 840px structured privacy card.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `PATCH` `/api/users/me/privacy`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ signedLinkDurationMinutes: number, privateSpaceDefaults: boolean }`
- **Response Payload**: `{ success: true, data: { updated: boolean } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `identity-service`
- **Database Tables**: `users`, `audit_logs`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `privacy.settings_updated`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Admin Audited`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Strict tenant isolation and zero external tracking enforced.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] enforces maximum 24h link duration
  - [ ] verifies audit log rendering
- **Integration Tests**:
  - [ ] PATCH /api/users/me/privacy persists security settings
- **End-to-End Acceptance Tests**:
  - [ ] changes signed link duration to 15m, clicks Save, confirms confirmation toast

#### 17. UI Component Inventory
`PrivacyCard`, `DurationDropdown`, `AuditLogTable`, `Button`

---

### PWA-80 — Storage Usage Dashboard & Quota Meters

**Category**: Web & PWA — Account & Support  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Inspect local disk storage consumption: original media bytes, derivative thumbnails, space breakdown, and orphan cleanup.
- **User Story**: "As an archivist self-hosting Memoria on my Mac, I want to inspect my local disk usage (42 GB used of 500 GB allocated) and clear derivative caches safely."

#### 2. Navigation & Routing
- **Entry Routes**: `/settings/storage`, `/settings/profile`
- **Exit Routes**: `/settings/export`, `/dashboard`
- **Back Navigation**: `/dashboard`
- **Deep Link**: `https://memoria.local/settings/storage`

#### 3. Personas & Authorization
- **Eligible Roles**: Authenticated Member (Space Owner)
- **Required Capabilities**: `view_storage_dashboard`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Title 'Storage & Disk Consumption' with total allocated quota meter.
- **Main Content**: 1. Storage Meter Bar: Originals (34.2 GB), Derivatives (5.1 GB), Document OCR text (120 MB), Free space (460 GB). 2. Space-by-space breakdown table with media counts, 3. 'Re-generate Missing Thumbnails' maintenance tool, 4. 'Clean Orphan Derivatives' tool (guaranteed never to delete originals).
- **Footer / Actions Bar**: Direct-to-disk local storage architecture note.

#### 5. Interactive Controls & UI Elements
- Button: 'Clean Orphan Thumbnail Caches'
- Button: 'Verify Checksums Across All Originals'
- Button: 'Re-generate Missing Derivatives'

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Storage meter`
- **Tab Sequence**: `Storage bar` -> `Space breakdown table` -> `Maintenance buttons`
- **Escape Key Action**: None

#### 8. States Matrix
- **Loading State**: Scanning local storage directories spinner.
- **Empty State**: Zero usage state with clear quota display.
- **Populated State**: Detailed graphical disk breakdown with accurate byte counts.
- **Error State**: Error banner if disk inspection encounters I/O failure.
- **Offline Mode**: Cached storage metrics displayed.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Storage dashboard. 39.4 gigabytes used of 500 gigabytes allocated."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Stacked vertical meter and summary cards.
- **Tablet (768px – 1024px)**: Two-column layout.
- **Desktop (> 1024px)**: Max-width 900px storage dashboard with visual breakdown bar.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/storage/overview`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { usedBytes: number, quotaBytes: number, originalsBytes: number, derivativesBytes: number, spacesBreakdown: Array<any> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `media-service`
- **Database Tables**: `space_storage_quotas`, `media_assets`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: _None_
- **BullMQ Background Jobs**: `verify-media-checksums`, `prune-orphan-derivatives`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: No
- **Privacy Architecture**: Storage calculations never alter or delete original master files.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] formats byte sizes human-readably (GB, MB, KB)
  - [ ] prevents pruning originals
- **Integration Tests**:
  - [ ] GET /api/storage/overview returns actual disk consumption from database
- **End-to-End Acceptance Tests**:
  - [ ] navigates to storage, runs checksum verification, observes success badge

#### 17. UI Component Inventory
`StorageMeterBar`, `BreakdownTable`, `MaintenanceTools`, `Button`

---

### PWA-81 — Data Sovereignty Export & Account Deletion

**Category**: Web & PWA — Account & Support  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Download a full archive export (ZIP of byte-for-byte originals + JSON metadata + manifest) or permanently delete account.
- **User Story**: "As an archivist, I want to export our entire family archive as an uncompressed ZIP with JSON metadata so we maintain 100% data sovereignty."

#### 2. Navigation & Routing
- **Entry Routes**: `/settings/export`, `/settings/profile`
- **Exit Routes**: `/dashboard`, `/login`
- **Back Navigation**: `/dashboard`
- **Deep Link**: `https://memoria.local/settings/export`

#### 3. Personas & Authorization
- **Eligible Roles**: Authenticated Member (Space Owner)
- **Required Capabilities**: `export_archive`, `delete_account`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Title 'Data Sovereignty, Export & Deletion'.
- **Main Content**: Section 1: Complete Archive Export (Button: 'Generate Full Archive ZIP', includes original photos, audio notes, book spreads JSON, and SHA-256 manifest. Download link valid for 48 hours). Section 2: Danger Zone — Permanent Account Deletion (Requires password confirmation and typing 'DELETE FOREVER').
- **Footer / Actions Bar**: Data sovereignty pledge: You own 100% of your memories. Zero proprietary formats.

#### 5. Interactive Controls & UI Elements
- Button: 'Generate Full Archive ZIP'
- Download Archive ZIP button (active when export job finishes)
- Destructive Button: 'Permanently Delete Account' (triggers double confirmation modal)

#### 6. Form Validation & Data Schema

| Field Name | Data Type | Required | Limits & Constraints | Validation Rule | Error Copy |
|---|---|---|---|---|---|
| `deleteConfirmation` | `text` | **Yes** | N/A | exact match 'DELETE FOREVER' | Please type DELETE FOREVER to confirm. |
| `password` | `password` | **Yes** | N/A | Standard type validation | Please verify your account password. |

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Generate Export button`
- **Tab Sequence**: `Export button` -> `Download link` -> `Delete account button`
- **Escape Key Action**: Closes deletion modal

#### 8. States Matrix
- **Loading State**: Generating archive export ZIP background job spinner.
- **Empty State**: N/A
- **Populated State**: Export status card with file size estimate and download link.
- **Error State**: Error banner with refresh action.
- **Offline Mode**: Export generation disabled offline.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Data sovereignty export and permanent account deletion."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Stacked vertical sections.
- **Tablet (768px – 1024px)**: Centered 640px card.
- **Desktop (> 1024px)**: Centered 780px layout with dedicated export and danger zone panels.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/users/me/export`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { jobId: string, estimatedSizeBytes: number } }`
- **Status Codes**: `202 Accepted`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `identity-service / media-service`
- **Database Tables**: `audit_logs`, `users`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `account.export_requested`, `account.deletion_requested`
- **BullMQ Background Jobs**: `compile-archive-export-zip`, `purge-user-account`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Admin Audited`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Export generated locally without cloud leaks; account deletion cleans all sessions and soft-deletes records.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] requires exact confirmation string 'DELETE FOREVER' before enabling button
  - [ ] verifies password
- **Integration Tests**:
  - [ ] POST /api/users/me/export enqueues ZIP compilation job
- **End-to-End Acceptance Tests**:
  - [ ] triggers export, observes progress indicator, verifies download button appears

#### 17. UI Component Inventory
`ExportPanel`, `DangerZoneCard`, `ConfirmModal`, `Button`

---

### PWA-82 — Help Documentation, Keyboard Shortcuts & Ticket Support

**Category**: Web & PWA — Account & Support  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Search user guides, review accessibility keyboard shortcuts, and submit support tickets directly from within the app.
- **User Story**: "As an archivist, I want to review keyboard shortcuts (Cmd+K for search, Arrow keys for 3D page turns) and submit an inquiry if I need scanning help."

#### 2. Navigation & Routing
- **Entry Routes**: `/help`, `/settings/support`
- **Exit Routes**: `/dashboard`, `/spaces/:spaceId`
- **Back Navigation**: `/dashboard`
- **Deep Link**: `https://memoria.local/help`

#### 3. Personas & Authorization
- **Eligible Roles**: Authenticated Member
- **Required Capabilities**: `view_help`, `submit_ticket`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Title 'Help, Shortcuts & Archival Support' with documentation search input.
- **Main Content**: 1. Keyboard Shortcuts Cheat Sheet (Navigation, Archive, 3D Reader, Spread Editor), 2. Archival Scanning Best Practices Guide (DPI, color space, storage), 3. In-App Support Ticket Form with optional diagnostic log attachment.
- **Footer / Actions Bar**: Version and build hash footer (e.g. 'Memoria v2.4.0 · Build c3a83d5').

#### 5. Interactive Controls & UI Elements
- Keyboard shortcuts modal trigger (Key?)
- Search documentation input field
- Support Ticket submit button
- Attach diagnostic logs checkbox

#### 6. Form Validation & Data Schema

| Field Name | Data Type | Required | Limits & Constraints | Validation Rule | Error Copy |
|---|---|---|---|---|---|
| `subject` | `text` | **Yes** | 3-120 chars | Standard type validation | Please provide a subject. |
| `message` | `textarea` | **Yes** | 10-2000 chars | Standard type validation | Please describe your inquiry. |

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Search documentation input`
- **Tab Sequence**: `Search bar` -> `Shortcuts sheet` -> `Support form` -> `Submit button`
- **Keyboard Shortcuts**: `QuestionMark (Show shortcuts modal)`
- **Escape Key Action**: Closes shortcuts modal

#### 8. States Matrix
- **Loading State**: Submitting ticket spinner.
- **Empty State**: Clean documentation cards.
- **Populated State**: Documentation search results and shortcuts matrix.
- **Error State**: Error banner with retry action.
- **Offline Mode**: Documentation fully readable offline; ticket queues locally.
- **Permission Denied**: 401 Unauthorized.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA
- **Screen Reader Summary**: "Help documentation and keyboard shortcuts cheat sheet."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Stacked vertical guide cards; shortcuts listed with mobile touch alternatives.
- **Tablet (768px – 1024px)**: Two-column layout.
- **Desktop (> 1024px)**: Max-width 1000px layout with sticky navigation.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/support/tickets`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ subject: string, message: string, includeDiagnostics: boolean }`
- **Response Payload**: `{ success: true, data: { ticketId: string, status: 'open' } }`
- **Status Codes**: `201 Created`, `400 Bad Request`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `identity-service`
- **Database Tables**: `audit_logs`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `support.ticket_created`
- **BullMQ Background Jobs**: `route-support-ticket`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Diagnostic logs scrubbed of private photo URLs and story text before sending.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] displays keyboard shortcuts modal on '?' keypress
  - [ ] scrubs diagnostics payload
- **Integration Tests**:
  - [ ] POST /api/support/tickets stores support ticket
- **End-to-End Acceptance Tests**:
  - [ ] presses '?', views shortcuts dialog, closes modal, submits support ticket

#### 17. UI Component Inventory
`ShortcutsCheatSheet`, `DocSearch`, `TicketForm`, `Button`

---

## PART 2: NATIVE IOS EXPERIENCES (IOS-01 to IOS-56)

### 2.1 Native iOS Authentication & Onboarding (IOS-01 to IOS-10)

### IOS-01 — Launch Splash & Heirloom Branding Animation

**Category**: Native iOS — Auth & Onboarding  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Launch the native Memoria app smoothly with branded 3D book emblem animation and fast session restoration.
- **User Story**: "As an iPhone user, I want the app to open instantly with an elegant heirloom animation, validating Keychain credentials without decorative delays."

#### 2. Navigation & Routing
- **Entry Routes**: `SpringBoard launch`, `Universal link`
- **Exit Routes**: `IOS-11 Home Feed (if session valid)`, `IOS-02 / IOS-03 Auth (if unauthenticated)`, `IOS-06 Deep Link`
- **Back Navigation**: `N/A`
- **Deep Link**: `memoria://launch`

#### 3. Personas & Authorization
- **Eligible Roles**: Anonymous Visitor, Authenticated Member
- **Required Capabilities**: `launch_app`
- **Authentication Required**: No (Public / Unauthenticated Access Allowed)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: N/A (Full screen branding view).
- **Main Content**: Deep Ink #20242C emblem of the Memoria archival book on Warm Ivory #F7F4EE canvas; golden tree-of-life foil shimmer.
- **Footer / Actions Bar**: Tagline: 'Your memories, made timeless.'

#### 5. Interactive Controls & UI Elements
- Animated brand emblem (Lottie / SwiftUI keyframe animation)
- Automatic navigation trigger upon Keychain session resolution

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `N/A (Splash transition)`
- **Tab Sequence**: N/A
- **Escape Key Action**: N/A

#### 8. States Matrix
- **Loading State**: Smooth 60/120 FPS SwiftUI phase animator; Keychain check executes asynchronously.
- **Empty State**: N/A
- **Populated State**: Brand logo with Cormorant Garamond typography.
- **Error State**: Falls back to Sign-In screen if session token is corrupted or expired.
- **Offline Mode**: Session restored directly from local Keychain without network dependency.
- **Permission Denied**: N/A

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: VoiceOver accessible
- **Screen Reader Summary**: "Memoria. Your memories, made timeless. Loading your living archive."
- **Touch Target Minimum**: `N/A`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1 (Deep Ink on Warm Ivory)`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Adapts to Dynamic Island, notch, and home indicator across all iPhone models.
- **Tablet (768px – 1024px)**: Centered branding asset with proportional iPad typography.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/auth/session/validate`
- **Authorization**: `Keychain Bearer JWT`
- **Response Payload**: `{ success: true, data: { valid: boolean, user: UserProfile } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `identity-service / Local iOS Keychain`
- **Database Tables**: `user_sessions`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `ios.app_launched`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: No
- **Privacy Architecture**: Tokens stored in kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] restores session from mock Keychain within 200ms
  - [ ] routes to HomeFeed when valid
- **Integration Tests**:
  - [ ] GET /api/auth/session/validate validates token
- **End-to-End Acceptance Tests**:
  - [ ] launches simulator app, verifies transition to HomeFeed or Sign-In

#### 17. UI Component Inventory
`LaunchSplashView`, `BrandEmblemAnimation`, `TypographyTitle`

---

### IOS-02 — Native Sign-Up with Apple Sign-In / Email

**Category**: Native iOS — Auth & Onboarding  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Create a Memoria account natively using Sign in with Apple or email/password with privacy consent.
- **User Story**: "As an iOS user, I want to tap 'Sign in with Apple' to create my account in 2 seconds with biometric privacy."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-01`, `memoria://register`
- **Exit Routes**: `IOS-07 Onboarding Carousel`, `IOS-08 First Space`, `IOS-03 Sign-In`
- **Back Navigation**: `IOS-01`
- **Deep Link**: `memoria://register`

#### 3. Personas & Authorization
- **Eligible Roles**: Anonymous Visitor
- **Required Capabilities**: `register_account`
- **Authentication Required**: No (Public / Unauthenticated Access Allowed)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Navigation bar with 'Already have an account? Sign In' button.
- **Main Content**: 1. Brand Title: 'Begin Your Family Archive', 2. Sign in with Apple button (SignInWithAppleButton), 3. 'or with email' divider, 4. Full Name TextField, 5. Email TextField, 6. SecureField Password, 7. Data Privacy consent toggle.
- **Footer / Actions Bar**: Primary Button: 'Create Living Archive'.

#### 5. Interactive Controls & UI Elements
- SignInWithAppleButton (White on Ink style)
- Full Name TextField
- Email Address TextField
- Password SecureField with reveal eye button
- Data Sovereignty & Terms Toggle
- Button: 'Create Living Archive'

#### 6. Form Validation & Data Schema

| Field Name | Data Type | Required | Limits & Constraints | Validation Rule | Error Copy |
|---|---|---|---|---|---|
| `fullName` | `text` | **Yes** | 2-100 chars | Standard type validation | Please enter your name. |
| `email` | `email` | **Yes** | RFC 5322 | Standard type validation | Please enter a valid email. |
| `password` | `password` | **Yes** | Min 8 chars, 1 number | Standard type validation | Password must be at least 8 characters with a number. |

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Full Name field`
- **Tab Sequence**: `Apple button` -> `Name` -> `Email` -> `Password` -> `Toggle` -> `Submit`
- **Escape Key Action**: Dismisses keyboard on tap outside

#### 8. States Matrix
- **Loading State**: ProgressView on button; fields disabled.
- **Empty State**: Fresh native form fields with SF Symbols icons.
- **Populated State**: Valid input with real-time green checkmarks on password rules.
- **Error State**: Inline red validation callout under affected fields; Haptic feedback (UINotificationFeedbackGenerator error).
- **Offline Mode**: Alert: 'Internet connection required to create a new archive.'
- **Permission Denied**: N/A

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: VoiceOver accessible
- **Screen Reader Summary**: "Sign up view. Sign in with Apple or create account with name, email, and password."
- **Touch Target Minimum**: `44x44 pt minimum`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Native scroll view with keyboard avoidance (ignoresSafeArea(.keyboard)).
- **Tablet (768px – 1024px)**: Centered form card max-width 480pt on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/auth/register`
- **Authorization**: `None`
- **Request Payload**: `{ fullName: string, email: string, password: string }`
- **Response Payload**: `{ success: true, data: { user: UserProfile, accessToken: string, refreshToken: string } }`
- **Status Codes**: `201 Created`, `400 Bad Request`, `409 Conflict`

#### 13. Service Architecture & Persistence
- **Backend Service**: `identity-service / iOS Keychain`
- **Database Tables**: `users`, `user_sessions`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `identity.user_registered`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: JWT tokens saved directly to Keychain; biometric access control enabled.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] validates email regex and password rules in Swift ViewModel
  - [ ] haptics fire on validation error
- **Integration Tests**:
  - [ ] POST /api/auth/register creates user and returns tokens
- **End-to-End Acceptance Tests**:
  - [ ] submits registration in iOS Simulator, verifies Keychain write and transition to onboarding

#### 17. UI Component Inventory
`NativeRegisterView`, `SignInWithAppleButton`, `SecureField`, `Button`

---

### IOS-03 — Native Sign-In & FaceID / Biometric Unlock

**Category**: Native iOS — Auth & Onboarding  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Sign in with email/password or unlock an existing session instantly using Face ID / Touch ID.
- **User Story**: "As an archivist opening the app, I want Face ID to scan my face and open my family memories seamlessly."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-01`, `IOS-02`, `memoria://login`
- **Exit Routes**: `IOS-11 Home Feed`, `IOS-04 Password Recovery`
- **Back Navigation**: `IOS-01`
- **Deep Link**: `memoria://login`

#### 3. Personas & Authorization
- **Eligible Roles**: Registered Member
- **Required Capabilities**: `login`, `biometric_unlock`
- **Authentication Required**: No (Public / Unauthenticated Access Allowed)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Brand seal with title 'Welcome Back'.
- **Main Content**: 1. Face ID quick unlock trigger button (if biometric enrolled), 2. Email TextField, 3. Password SecureField, 4. Forgot Password button, 5. Sign In Button.
- **Footer / Actions Bar**: Don't have an archive yet? Create Account button.

#### 5. Interactive Controls & UI Elements
- Button: 'Unlock with Face ID' (LAContext evaluation)
- Email TextField
- Password SecureField
- Button: 'Forgot Password?'
- Primary Button: 'Sign In'
- Create Account button

#### 6. Form Validation & Data Schema

| Field Name | Data Type | Required | Limits & Constraints | Validation Rule | Error Copy |
|---|---|---|---|---|---|
| `email` | `email` | **Yes** | N/A | Standard type validation | Please enter your email. |
| `password` | `password` | **Yes** | N/A | Standard type validation | Please enter your password. |

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Face ID prompt or Email field`
- **Tab Sequence**: `Face ID` -> `Email` -> `Password` -> `Sign In` -> `Forgot Password`
- **Escape Key Action**: Dismisses keyboard on scroll

#### 8. States Matrix
- **Loading State**: ProgressView on Sign In button; fields disabled.
- **Empty State**: Clean fields with autofill email/password from iOS AutoFill Keychain.
- **Populated State**: Valid credentials entered.
- **Error State**: Haptic notification error with banner: 'Invalid email or password.'
- **Offline Mode**: Offline alert; cached biometric unlock permitted if offline mode enabled.
- **Permission Denied**: Account suspended alert.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: VoiceOver accessible
- **Screen Reader Summary**: "Sign in view. Face ID unlock or enter email and password."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Native scroll view with Dynamic Type support.
- **Tablet (768px – 1024px)**: Centered 440pt card on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/auth/login`
- **Authorization**: `None`
- **Request Payload**: `{ email: string, password: string }`
- **Response Payload**: `{ success: true, data: { accessToken: string, refreshToken: string, user: UserProfile } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `identity-service / iOS Keychain`
- **Database Tables**: `users`, `user_sessions`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `identity.user_logged_in`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Biometric unlock verified locally via LocalAuthentication framework.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] triggers LAContext evaluatePolicy for biometrics
  - [ ] saves tokens securely on successful login
- **Integration Tests**:
  - [ ] POST /api/auth/login validates credentials
- **End-to-End Acceptance Tests**:
  - [ ] logs in with test user in simulator, checks HomeFeed displays

#### 17. UI Component Inventory
`NativeLoginView`, `BiometricButton`, `SecureField`, `Button`

---

### IOS-04 — Password Recovery Request Sheet

**Category**: Native iOS — Auth & Onboarding  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Request a secure password recovery email via native iOS sheet.
- **User Story**: "As an iOS user who forgot my password, I want to enter my email in a clean native sheet and receive recovery instructions."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-03`
- **Exit Routes**: `IOS-05 Verification Code Sheet`, `IOS-03`
- **Back Navigation**: `IOS-03`
- **Deep Link**: `memoria://recovery`

#### 3. Personas & Authorization
- **Eligible Roles**: Anonymous Visitor
- **Required Capabilities**: `request_password_reset`
- **Authentication Required**: No (Public / Unauthenticated Access Allowed)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Sheet navigation bar: 'Reset Password' with Cancel button.
- **Main Content**: 1. Explanatory text, 2. Email Address TextField, 3. 'Send Recovery Code' Button.
- **Footer / Actions Bar**: Privacy reminder.

#### 5. Interactive Controls & UI Elements
- Email Address TextField
- Button: 'Send Recovery Code'
- Cancel sheet button

#### 6. Form Validation & Data Schema

| Field Name | Data Type | Required | Limits & Constraints | Validation Rule | Error Copy |
|---|---|---|---|---|---|
| `email` | `email` | **Yes** | N/A | Standard type validation | Please enter your email. |

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Email field`
- **Tab Sequence**: `Cancel` -> `Email` -> `Send button`
- **Escape Key Action**: Dismisses sheet

#### 8. States Matrix
- **Loading State**: ProgressView on button.
- **Empty State**: Empty email input.
- **Populated State**: Valid email entered.
- **Error State**: Inline error callout.
- **Offline Mode**: Offline alert.
- **Permission Denied**: N/A

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: VoiceOver accessible
- **Screen Reader Summary**: "Password reset request sheet. Enter email to receive a recovery code."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Standard iOS modal sheet with presentationDetents([.medium]).
- **Tablet (768px – 1024px)**: Form sheet on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/auth/forgot-password`
- **Authorization**: `None`
- **Request Payload**: `{ email: string }`
- **Response Payload**: `{ success: true, data: { message: 'Instructions sent if account exists.' } }`
- **Status Codes**: `200 OK`

#### 13. Service Architecture & Persistence
- **Backend Service**: `identity-service`
- **Database Tables**: `users`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `identity.password_reset_requested`
- **BullMQ Background Jobs**: `send-recovery-code-email`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Privacy-preserving neutral message.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] validates email format before dispatch
  - [ ] handles sheet dismiss
- **Integration Tests**:
  - [ ] POST /api/auth/forgot-password enqueues job
- **End-to-End Acceptance Tests**:
  - [ ] submits recovery email in simulator, sheet advances to code entry

#### 17. UI Component Inventory
`RecoverySheetView`, `TextField`, `Button`

---

### IOS-05 — Verification Code Entry Sheet

**Category**: Native iOS — Auth & Onboarding  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Enter a 6-digit verification code received via email with AutoFill One-Time Code support.
- **User Story**: "As an archivist, I want the 6-digit code from my email to AutoFill automatically above the iOS keyboard so I can confirm instantly."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-04`, `IOS-02`
- **Exit Routes**: `IOS-08 First Space`, `IOS-03 Sign-In`
- **Back Navigation**: `IOS-04`
- **Deep Link**: `memoria://verify?code=:code`

#### 3. Personas & Authorization
- **Eligible Roles**: User with Code
- **Required Capabilities**: `verify_code`
- **Authentication Required**: No (Public / Unauthenticated Access Allowed)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Sheet title 'Enter Verification Code' with email recipient subtitle.
- **Main Content**: 1. 6-digit code input boxes with .oneTimeCode contentType, 2. 'Resend Code' button with 60s cooldown timer, 3. 'Verify & Continue' button.
- **Footer / Actions Bar**: Trouble receiving code? contact link.

#### 5. Interactive Controls & UI Elements
- 6-digit OTP code text field (.textContentType(.oneTimeCode))
- Button: 'Verify & Continue'
- Button: 'Resend Code' (with timer)

#### 6. Form Validation & Data Schema

| Field Name | Data Type | Required | Limits & Constraints | Validation Rule | Error Copy |
|---|---|---|---|---|---|
| `code` | `text` | **Yes** | Exactly 6 digits | Standard type validation | Please enter the complete 6-digit code. |

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Code input field (opens number keypad automatically)`
- **Tab Sequence**: `Code boxes` -> `Verify button` -> `Resend button`
- **Escape Key Action**: Dismisses sheet

#### 8. States Matrix
- **Loading State**: Verifying code spinner.
- **Empty State**: Empty 6-box pin entry.
- **Populated State**: 6 digits filled; automatically triggers verification submit.
- **Error State**: Haptic error; boxes turn red with shake animation: 'Incorrect code. Please try again.'
- **Offline Mode**: Offline alert.
- **Permission Denied**: Code expired alert with resend option.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: VoiceOver accessible
- **Screen Reader Summary**: "Verification code entry. Enter the 6-digit code sent to your email."
- **Touch Target Minimum**: `44x44 pt for digit boxes`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Centered keypad sheet with presentationDetents([.medium]).
- **Tablet (768px – 1024px)**: Centered sheet on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/auth/verify-code`
- **Authorization**: `None`
- **Request Payload**: `{ email: string, code: string }`
- **Response Payload**: `{ success: true, data: { verified: boolean, accessToken: string } }`
- **Status Codes**: `200 OK`, `400 Bad Request`

#### 13. Service Architecture & Persistence
- **Backend Service**: `identity-service`
- **Database Tables**: `users`, `user_sessions`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `identity.code_verified`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Verification codes expire after 15 minutes.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] auto-submits when 6th digit entered
  - [ ] triggers UINotificationFeedbackGenerator on error
- **Integration Tests**:
  - [ ] POST /api/auth/verify-code validates code
- **End-to-End Acceptance Tests**:
  - [ ] enters code '123456', verifies auto-submit and navigation

#### 17. UI Component Inventory
`OTPCodeField`, `CountdownTimer`, `Button`

---

### IOS-06 — Deep-Linked Invitation Acceptance View

**Category**: Native iOS — Auth & Onboarding  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Accept a space invitation launched via universal link (https://memoria.local/invite/:token).
- **User Story**: "As an invited family member tapping a link in Messages, I want Memoria to open directly to the space invitation card with Accept button."

#### 2. Navigation & Routing
- **Entry Routes**: `Universal link`, `memoria://invite/:token`
- **Exit Routes**: `IOS-11 Home Feed (target space selected)`, `IOS-02 Register`
- **Back Navigation**: `IOS-11`
- **Deep Link**: `https://memoria.local/invite/:token`

#### 3. Personas & Authorization
- **Eligible Roles**: Invited Recipient
- **Required Capabilities**: `accept_invitation`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Navigation bar with close button.
- **Main Content**: 1. Space cover photo banner, 2. Space Name, 3. Inviter attribution ('Eleanor invited you to collaborate'), 4. Assigned Role badge ('Contributor'), 5. Personal invitation note.
- **Footer / Actions Bar**: Buttons: 'Accept & Enter Space' and 'Decline'.

#### 5. Interactive Controls & UI Elements
- Button: 'Accept Invitation & Enter Space'
- Button: 'Decline'
- Haptic feedback on tap (.impact(.medium))

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Accept button`
- **Tab Sequence**: `Accept button` -> `Decline button`
- **Escape Key Action**: Dismisses sheet

#### 8. States Matrix
- **Loading State**: Fetching invitation details spinner.
- **Empty State**: N/A
- **Populated State**: Vibrant invitation card with cover photo and inviter avatar.
- **Error State**: Alert: 'This invitation has expired or been revoked.'
- **Offline Mode**: Offline alert; requires network to join space.
- **Permission Denied**: Token invalid alert.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: VoiceOver accessible
- **Screen Reader Summary**: "Space invitation from Eleanor to join Vance Family Archive as a Contributor."
- **Touch Target Minimum**: `48x48 pt`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Native modal sheet with rich card.
- **Tablet (768px – 1024px)**: Form sheet on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/spaces/invitations/:token/accept`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { spaceId: string, role: string } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`, `410 Gone`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service`
- **Database Tables**: `space_invitations`, `space_members`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `collab.invitation_accepted`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Space addition logged.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] parses universal link token parameter in SceneDelegate / MemoriaApp
  - [ ] navigates on accept
- **Integration Tests**:
  - [ ] POST /api/spaces/invitations/:token/accept creates space_members row
- **End-to-End Acceptance Tests**:
  - [ ] launches deep link, taps Accept, verifies active space updates

#### 17. UI Component Inventory
`InvitationSheetView`, `SpaceBanner`, `RoleBadge`, `Button`

---

### IOS-07 — Mobile Onboarding Carousel

**Category**: Native iOS — Auth & Onboarding  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Swipe through 3 visual cards explaining Memoria's philosophy (Originals Preserved, Family Collaboration, 3D Heirloom Books).
- **User Story**: "As a new mobile archivist, I want a brief 3-page walkthrough of how our memories become keepsake books with page indicator dots."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-02 Sign-Up`, `IOS-03 Sign-In`
- **Exit Routes**: `IOS-08 Create First Space`, `IOS-11 Home Feed`
- **Back Navigation**: `N/A`
- **Deep Link**: `memoria://onboarding`

#### 3. Personas & Authorization
- **Eligible Roles**: Authenticated Member
- **Required Capabilities**: `complete_onboarding`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Top bar with 'Skip' text button.
- **Main Content**: TabView with .tabViewStyle(.page): 1. Lossless Archival Media (SHA-256 byte integrity), 2. Collaborative Family Spaces, 3. Articulated 3D Books with RealityKit.
- **Footer / Actions Bar**: UIPageControl dots, 'Continue' Primary Button.

#### 5. Interactive Controls & UI Elements
- Swipe gestures across TabView pages
- Page indicator dots (tap to change page)
- Button: 'Skip'
- Primary Button: 'Continue' / 'Get Started'

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Continue button`
- **Tab Sequence**: `Skip button` -> `Continue button`
- **Escape Key Action**: None

#### 8. States Matrix
- **Loading State**: N/A
- **Empty State**: N/A
- **Populated State**: High-resolution archival imagery, Cormorant Garamond headings, smooth page transitions.
- **Error State**: N/A
- **Offline Mode**: Fully available offline.
- **Permission Denied**: N/A

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: VoiceOver accessible
- **Screen Reader Summary**: "Onboarding page 1 of 3: Lossless Archival Media. Swipe right to view next page."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Full screen page view with safe area padding.
- **Tablet (768px – 1024px)**: Centered 500pt carousel on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `N/A` `N/A (Client presentation)`
- **Authorization**: `None`
- **Response Payload**: `N/A`
- **Status Codes**: `200 OK`

#### 13. Service Architecture & Persistence
- **Backend Service**: `Local UserDefaults / AppStorage`
- **Database Tables**: _None (Stateless / InMemory)_
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `ios.onboarding_completed`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `None`
- **Security Audit Logged**: No
- **Privacy Architecture**: Local state.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] advances page index on button click
  - [ ] sets hasSeenOnboarding flag in AppStorage
- **Integration Tests**:
  - [ ] renders all 3 pages cleanly
- **End-to-End Acceptance Tests**:
  - [ ] swipes through 3 onboarding pages, taps Get Started, lands on Create Space

#### 17. UI Component Inventory
`OnboardingCarouselView`, `PageCard`, `PageIndicator`, `Button`

---

### IOS-08 — Create First Space Sheet

**Category**: Native iOS — Auth & Onboarding  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Name and choose a theme color for the first family memory space natively in iOS.
- **User Story**: "As a new user, I want a clean native sheet to name our space 'Vance Family Heritage' and select Forest Green."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-07`, `IOS-12 Space Switcher`
- **Exit Routes**: `IOS-09 First Profile`, `IOS-11 Home Feed`
- **Back Navigation**: `IOS-07`
- **Deep Link**: `memoria://spaces/new`

#### 3. Personas & Authorization
- **Eligible Roles**: Authenticated Member
- **Required Capabilities**: `create_memory_space`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Sheet navigation bar: 'New Memory Space' with 'Cancel' and 'Create' buttons.
- **Main Content**: 1. Space Name TextField (with clear button), 2. Space Type Picker (Family, Personal, Event, Journey), 3. Theme Color circular swatch selector (Forest, Plum, Ink, Sage), 4. Description TextField.
- **Footer / Actions Bar**: Privacy explanation note.

#### 5. Interactive Controls & UI Elements
- Space Name TextField
- Segmented Space Type Picker
- Color Swatch Buttons with haptic selection (.selection)
- Create NavigationBarButton

#### 6. Form Validation & Data Schema

| Field Name | Data Type | Required | Limits & Constraints | Validation Rule | Error Copy |
|---|---|---|---|---|---|
| `name` | `text` | **Yes** | 1-100 chars | Standard type validation | Please name your space. |

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Space Name field`
- **Tab Sequence**: `Cancel` -> `Name` -> `Type picker` -> `Swatches` -> `Create`
- **Escape Key Action**: Dismisses sheet

#### 8. States Matrix
- **Loading State**: ProgressView in navigation bar; Create button disabled.
- **Empty State**: Placeholder: 'e.g. Vance Family Archive'.
- **Populated State**: Valid space details entered.
- **Error State**: Haptic notification error with inline alert.
- **Offline Mode**: Queued in local SQLite for background sync.
- **Permission Denied**: N/A

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: VoiceOver accessible
- **Screen Reader Summary**: "Create memory space sheet. Enter space name and select a color theme."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Native sheet presentationDetents([.large]).
- **Tablet (768px – 1024px)**: Form sheet on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/spaces`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ name: string, type: SpaceType, coverColor?: string }`
- **Response Payload**: `{ success: true, data: { space: MemorySpace } }`
- **Status Codes**: `201 Created`, `400 Bad Request`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service / Local SQLite`
- **Database Tables**: `memory_spaces`, `space_members`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `memory.space_created`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Owner role assigned.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] enforces non-empty name before enabling Create button
  - [ ] fires haptic on swatch tap
- **Integration Tests**:
  - [ ] POST /api/spaces creates space row in database
- **End-to-End Acceptance Tests**:
  - [ ] enters space name, taps Create, verifies transition to Profile sheet

#### 17. UI Component Inventory
`CreateSpaceSheet`, `ColorSwatchRow`, `SegmentedPicker`, `Button`

---

### IOS-09 — Create First Profile Sheet

**Category**: Native iOS — Auth & Onboarding  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Add the first family member, child, ancestor, or pet profile using native iOS form controls.
- **User Story**: "As an archivist, I want to add my daughter's profile with her photo from my iPhone camera roll and birthdate."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-08`, `IOS-35 People Directory`
- **Exit Routes**: `IOS-10 Invite Contacts`, `IOS-11 Home Feed`
- **Back Navigation**: `IOS-08`
- **Deep Link**: `memoria://profiles/new`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member (Contributor+)
- **Required Capabilities**: `create_profile`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Sheet navigation bar: 'Add Person or Subject' with 'Skip' and 'Save' buttons.
- **Main Content**: 1. Avatar photo circular picker button (with camera badge), 2. Full Name TextField, 3. Profile Category Picker (Person, Child, Pet, Couple, Ancestor), 4. Relationship TextField, 5. Birthdate DatePicker (.graphical or .compact).
- **Footer / Actions Bar**: Privacy note.

#### 5. Interactive Controls & UI Elements
- Avatar photo picker button (PhotosPicker)
- Name TextField
- Type Picker
- Relationship TextField
- DatePicker (Birthdate)
- Save NavigationBarButton

#### 6. Form Validation & Data Schema

| Field Name | Data Type | Required | Limits & Constraints | Validation Rule | Error Copy |
|---|---|---|---|---|---|
| `name` | `text` | **Yes** | 1-100 chars | Standard type validation | Please enter a name. |

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Name TextField`
- **Tab Sequence**: `Avatar` -> `Name` -> `Type` -> `Relationship` -> `Birthdate` -> `Save`
- **Escape Key Action**: Dismisses sheet

#### 8. States Matrix
- **Loading State**: Saving profile spinner.
- **Empty State**: Blank form.
- **Populated State**: Name entered and photo selected.
- **Error State**: Inline red error callout.
- **Offline Mode**: Queued in local SQLite.
- **Permission Denied**: N/A

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: VoiceOver accessible
- **Screen Reader Summary**: "Create profile sheet. Enter name, relationship, and optional birthdate."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Native sheet presentationDetents([.large]).
- **Tablet (768px – 1024px)**: Form sheet on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/spaces/:spaceId/profiles`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ name: string, type: ProfileType, relationship?: string, birthDate?: string }`
- **Response Payload**: `{ success: true, data: { profile: SpaceProfile } }`
- **Status Codes**: `201 Created`, `400 Bad Request`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service / Local SQLite`
- **Database Tables**: `space_profiles`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `memory.profile_created`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Children and personal dates protected by space tenant boundary.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] parses birthdate to ISO string
  - [ ] handles PhotosPicker selection
- **Integration Tests**:
  - [ ] POST /api/spaces/:spaceId/profiles creates profile
- **End-to-End Acceptance Tests**:
  - [ ] creates profile with photo, verifies saved state in database

#### 17. UI Component Inventory
`CreateProfileSheet`, `AvatarPickerButton`, `DatePickerField`, `Button`

---

### IOS-10 — Contact Picker Contributor Invite View

**Category**: Native iOS — Auth & Onboarding  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Invite family members using native iOS CNContactPickerViewController or manual email entry.
- **User Story**: "As an archivist, I want to tap 'Pick from Contacts' to select my brother's email address and send him a space invitation."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-09`, `IOS-38 Members`
- **Exit Routes**: `IOS-11 Home Feed`, `IOS-16 Quick Capture`
- **Back Navigation**: `IOS-09`
- **Deep Link**: `memoria://spaces/:spaceId/invite`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Owner, Space Editor
- **Required Capabilities**: `invite_members`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Sheet navigation bar: 'Invite Family' with 'Skip' and 'Send' buttons.
- **Main Content**: 1. 'Choose from Contacts' Button with SF Symbol person.crop.circle.badge.plus, 2. Invited recipients token field, 3. Role selector (Contributor, Editor, Viewer), 4. Personal note TextField, 5. Sharable Link button.
- **Footer / Actions Bar**: Invitations are private and secure note.

#### 5. Interactive Controls & UI Elements
- Button: 'Choose from Contacts' (triggers CNContactPickerViewController)
- Manual Email TextField
- Role Picker (Contributor / Editor / Viewer)
- Button: 'Copy Private Invite Link'
- Send Button

#### 6. Form Validation & Data Schema

| Field Name | Data Type | Required | Limits & Constraints | Validation Rule | Error Copy |
|---|---|---|---|---|---|
| `emails` | `email[]` | No | N/A | Standard type validation | Please verify email format. |

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Manual Email field`
- **Tab Sequence**: `Choose Contacts` -> `Email field` -> `Role picker` -> `Copy link` -> `Send`
- **Escape Key Action**: Dismisses sheet

#### 8. States Matrix
- **Loading State**: Sending invites spinner.
- **Empty State**: Empty recipient list.
- **Populated State**: Selected contact chips with avatars and emails.
- **Error State**: Error banner with retry.
- **Offline Mode**: Queued for dispatch on reconnect.
- **Permission Denied**: Contact permission denied: manual email input remains available.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: VoiceOver accessible
- **Screen Reader Summary**: "Invite contributors. Choose from iOS contacts or enter email manually."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Native sheet presentationDetents([.large]).
- **Tablet (768px – 1024px)**: Form sheet on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/spaces/:spaceId/invitations`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ invitations: Array<{ email: string, role: string }> }`
- **Response Payload**: `{ success: true, data: { invitedCount: number } }`
- **Status Codes**: `201 Created`, `400 Bad Request`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service / identity-service`
- **Database Tables**: `space_invitations`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `collab.invitations_dispatched`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Contacts accessed only via user-selected CNContactPicker; zero address book mass scanning.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] handles CNContactPicker delegate callbacks without requesting broad contacts permission
- **Integration Tests**:
  - [ ] POST /api/spaces/:spaceId/invitations stores invitations
- **End-to-End Acceptance Tests**:
  - [ ] selects email, sends invite, completes onboarding, lands on HomeFeed

#### 17. UI Component Inventory
`ContactInviteSheet`, `RecipientTokenField`, `RolePicker`, `Button`

---

### 2.2 Native iOS Home & Navigation (IOS-11 to IOS-16)

### IOS-11 — TabBar Home View & Memory Feed

**Category**: Native iOS — Home & Navigation  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Browse the living memory feed, view today-in-history, switch spaces, and navigate between native tabs.
- **User Story**: "As an iPhone user, I want a smooth 120 FPS native feed of family photos and today-in-history with bottom tabs."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-01 Launch`, `IOS-03 Login`, `memoria://home`
- **Exit Routes**: `IOS-26 Memory Detail`, `IOS-16 Quick Capture`, `IOS-12 Space Switcher`, `IOS-43 Bookshelf`
- **Back Navigation**: `N/A (Root Tab)`
- **Deep Link**: `memoria://home`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member
- **Required Capabilities**: `view_feed`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Top Navigation Bar: Active Space Name button with chevron, Search icon button (IOS-15), Notification bell with unread badge (IOS-14).
- **Main Content**: LazyVStack Feed: 1. 'Today in History' memory card (if memories exist on today's calendar date), 2. Chronological memory cards with photo thumbnails, EXIF capture date, location, and heart button.
- **Footer / Actions Bar**: Native UITabBar (5 tabs: Home, Archive, + Capture Center, Books, Settings).

#### 5. Interactive Controls & UI Elements
- Space Switcher navigation bar title button (opens IOS-12)
- Search icon button
- Notification bell button
- Memory card tap (opens IOS-26)
- Favorite heart button with haptic feedback (.impact(.light))
- Center TabBar '+' Capture button (opens IOS-16)

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First memory card`
- **Tab Sequence**: `Space switcher` -> `Search` -> `Notifications` -> `Memory cards` -> `Tabs`
- **Escape Key Action**: N/A

#### 8. States Matrix
- **Loading State**: Skeleton shimmer cards matching Warm Ivory #F7F4EE canvas.
- **Empty State**: Archival empty state card with prompt: 'Your archive is quiet. Tap + to add the first memory.'
- **Populated State**: High-performance LazyVStack with async Image loading, cached thumbnails, and fluid inertial scrolling.
- **Error State**: Error banner with pull-to-refresh trigger.
- **Offline Mode**: Offline indicator pill in navigation bar; feed served directly from local SQLite database.
- **Permission Denied**: Redirect to sign-in.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: VoiceOver accessible
- **Screen Reader Summary**: "Home memory feed for Vance Family Archive. Today in history and recent memories."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Native iOS TabBar with safe area inset handling on all iPhone sizes.
- **Tablet (768px – 1024px)**: NavigationSplitView with sidebar on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/dashboard/overview`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { recentMemories: Array<Memory>, todayInHistory: Array<Memory> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service / Local SQLite`
- **Database Tables**: `memories`, `memory_media`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `ios.feed_viewed`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: No
- **Privacy Architecture**: Memories cached securely in app sandbox.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] renders Today in History card when dates match
  - [ ] triggers haptic on heart tap
- **Integration Tests**:
  - [ ] GET /api/dashboard/overview populates feed
- **End-to-End Acceptance Tests**:
  - [ ] launches app to HomeFeedView, scrolls through feed, taps memory card

#### 17. UI Component Inventory
`HomeFeedView`, `TodayInHistoryCard`, `MemoryFeedCard`, `MemoriaTabBar`

---

### IOS-12 — Memory Space Switcher Sheet with Haptic Feedback

**Category**: Native iOS — Home & Navigation  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Switch between owned and shared memory spaces with haptic feedback or create a new space.
- **User Story**: "As a member of multiple family spaces, I want to tap the title to switch from my personal space to our family space with a satisfying haptic click."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-11`, `IOS-13`
- **Exit Routes**: `IOS-11 (with new space active)`, `IOS-08 New Space Sheet`
- **Back Navigation**: `IOS-11`
- **Deep Link**: `memoria://spaces`

#### 3. Personas & Authorization
- **Eligible Roles**: Authenticated Member
- **Required Capabilities**: `switch_space`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Sheet navigation bar: 'Your Memory Spaces' with '+ New Space' button.
- **Main Content**: List of Space Rows: Color swatch indicator, Space Name, Role badge (Owner, Editor, Contributor), Member avatars count, Checkmark on currently active space.
- **Footer / Actions Bar**: Storage summary note.

#### 5. Interactive Controls & UI Elements
- Space row tap (switches active space, triggers .selection haptic, dismisses sheet)
- Button: '+ New Memory Space' (opens IOS-08)
- Dismiss drag gesture

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Active space row`
- **Tab Sequence**: `New space button` -> `Space rows`
- **Escape Key Action**: Dismisses sheet

#### 8. States Matrix
- **Loading State**: List skeleton pulse.
- **Empty State**: Notice: 'No spaces found.'
- **Populated State**: Clean list of spaces with checkmark on active row.
- **Error State**: Error banner with refresh button.
- **Offline Mode**: Cached space list served from SQLite.
- **Permission Denied**: N/A

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: VoiceOver accessible
- **Screen Reader Summary**: "Memory space switcher sheet. Currently selected: Vance Family Archive. Double tap another space to switch."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Native sheet presentationDetents([.medium, .large]).
- **Tablet (768px – 1024px)**: Popover on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/spaces`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { items: Array<MemorySpace & { role: string }> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service / Local SQLite`
- **Database Tables**: `memory_spaces`, `space_members`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `ios.space_switched`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: No
- **Privacy Architecture**: Active space ID saved in AppStorage.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] fires UISelectionFeedbackGenerator on space tap
  - [ ] updates active space state
- **Integration Tests**:
  - [ ] GET /api/spaces returns spaces list
- **End-to-End Acceptance Tests**:
  - [ ] opens space switcher, selects second space, verifies home feed reloads

#### 17. UI Component Inventory
`SpaceSwitcherSheet`, `SpaceRow`, `RoleBadge`, `Button`

---

### IOS-13 — Space Overview & Mobile Quick Actions

**Category**: Native iOS — Home & Navigation  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Inspect active space details, contributor avatars, storage meter, and launch quick capture actions.
- **User Story**: "As an archivist, I want a dedicated space overview view to see member counts, storage status, and open space settings."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-11`, `IOS-12`
- **Exit Routes**: `IOS-38 Members`, `IOS-23 Timeline`, `IOS-16 Capture Hub`
- **Back Navigation**: `IOS-11`
- **Deep Link**: `memoria://spaces/:spaceId`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member
- **Required Capabilities**: `view_space_overview`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Space Cover parallax header: Space title, role badge, settings gear icon.
- **Main Content**: 1. Quick action grid: + Photo, + Audio, + Story, 2. Space Stats card (Memories count, Contributors count, Books count), 3. Recent activity highlights, 4. Storage meter bar.
- **Footer / Actions Bar**: Invite contributors banner.

#### 5. Interactive Controls & UI Elements
- Quick action buttons (+ Photo, + Audio, + Story)
- Settings gear button (opens space settings sheet)
- Members strip tap (opens IOS-38)
- View Timeline button (opens IOS-23)

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Quick action buttons`
- **Tab Sequence**: `Settings gear` -> `Quick actions` -> `Stats cards` -> `Timeline button`
- **Escape Key Action**: Returns to home

#### 8. States Matrix
- **Loading State**: Parallax header and stats skeletons.
- **Empty State**: Notice inviting first contribution.
- **Populated State**: Rich space view with photographic cover and stats.
- **Error State**: Error banner with reload.
- **Offline Mode**: Cached overview available.
- **Permission Denied**: 403 Forbidden alert.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: VoiceOver accessible
- **Screen Reader Summary**: "Space overview for Vance Family Archive. 142 memories, 6 members. Quick action buttons."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Native scroll view with sticky nav bar on scroll.
- **Tablet (768px – 1024px)**: Two-column overview on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/spaces/:spaceId`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { space: MemorySpace, memberCount: number, memoryCount: number } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service / Local SQLite`
- **Database Tables**: `memory_spaces`, `space_members`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: _None_
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: No
- **Privacy Architecture**: Space tenant isolated.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] renders correct member count and role badge
  - [ ] navigates to settings on gear tap
- **Integration Tests**:
  - [ ] GET /api/spaces/:spaceId returns valid metadata
- **End-to-End Acceptance Tests**:
  - [ ] navigates to space overview, taps + Photo quick action

#### 17. UI Component Inventory
`SpaceOverviewView`, `ParallaxHeader`, `QuickActionGrid`, `StatsCard`

---

### IOS-14 — Native Notification List with Action Buttons

**Category**: Native iOS — Home & Navigation  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Review in-app family notifications, comment mentions, space invitations, and media processing updates.
- **User Story**: "As an archivist, I want to tap the notification bell to see when family members comment on our memories and tap directly into the photo."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-11`, `Push notification tap`
- **Exit Routes**: `IOS-26 Memory Detail`, `IOS-06 Invite`, `IOS-11`
- **Back Navigation**: `IOS-11`
- **Deep Link**: `memoria://notifications`

#### 3. Personas & Authorization
- **Eligible Roles**: Authenticated Member
- **Required Capabilities**: `view_notifications`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Navigation bar: 'Notifications' with 'Mark All as Read' button.
- **Main Content**: List of notification rows: Category icon (Comment, Invite, Processing, Book), Title, Relative timestamp ('2h ago'), Preview snippet, Unread indicator dot, Swipe-to-delete action.
- **Footer / Actions Bar**: End of notifications marker.

#### 5. Interactive Controls & UI Elements
- Notification row tap (navigates to target entity, marks read)
- Button: 'Mark All as Read'
- Swipe-to-delete row action

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First unread notification`
- **Tab Sequence**: `Mark All button` -> `Notification rows`
- **Escape Key Action**: Returns to home

#### 8. States Matrix
- **Loading State**: List row skeleton pulse.
- **Empty State**: Notice: 'No notifications. You're all caught up.'
- **Populated State**: List of notifications with unread items styled in Warm Ivory and Plum accent dot.
- **Error State**: Error banner with refresh button.
- **Offline Mode**: Cached notifications served offline.
- **Permission Denied**: Redirect to sign-in.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: VoiceOver accessible
- **Screen Reader Summary**: "Notifications list. Eleanor commented on Family Reunion 1984. 2 hours ago."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Native List with swipe actions.
- **Tablet (768px – 1024px)**: Centered 600pt list on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/notifications`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { notifications: Array<any> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `identity-service / Local SQLite`
- **Database Tables**: `audit_logs`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `ios.notifications_read`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: No
- **Privacy Architecture**: Sensitive story content excluded from lock screen push notifications.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] marks single item read on tap
  - [ ] deletes notification on swipe
- **Integration Tests**:
  - [ ] GET /api/notifications returns user alerts
- **End-to-End Acceptance Tests**:
  - [ ] opens notifications, taps row, confirms navigation to memory

#### 17. UI Component Inventory
`NotificationListView`, `NotificationRow`, `SwipeActions`, `Button`

---

### IOS-15 — Global Search with Voice Search Integration

**Category**: Native iOS — Home & Navigation  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Search memories, profiles, scanned OCR text, and tags using keyboard or Siri / Speech framework dictation.
- **User Story**: "As an archivist, I want to tap the microphone and say 'Grandpa fishing 1972' to find matching photos instantly."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-11`, `memoria://search`
- **Exit Routes**: `IOS-26 Memory Detail`, `IOS-36 Profile Detail`, `IOS-11`
- **Back Navigation**: `IOS-11`
- **Deep Link**: `memoria://search?q=:query`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member
- **Required Capabilities**: `search_memories`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Native search bar (.searchable) with voice dictation button and clear query button.
- **Main Content**: 1. Recent searches chips, 2. People results horizontal bubble strip, 3. Memory results grid with OCR text snippet matches, 4. Tag chips.
- **Footer / Actions Bar**: Search results count.

#### 5. Interactive Controls & UI Elements
- Search TextField (.searchable)
- Voice dictation button (SFSpeechRecognizer)
- Filter chip selector (All, Photos, Audio, OCR Scans)
- Memory result card tap (opens IOS-26)

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Search input field`
- **Tab Sequence**: `Search bar` -> `Filter chips` -> `Result cards`
- **Escape Key Action**: Cancels search

#### 8. States Matrix
- **Loading State**: Search skeleton pulse.
- **Empty State**: Notice: 'No memories found matching your search.'
- **Populated State**: Categorized search results with highlighted matching words.
- **Error State**: Error banner with refresh.
- **Offline Mode**: Local SQLite FTS5 full-text search executed offline.
- **Permission Denied**: Voice search permission denied: standard typing remains active.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: VoiceOver accessible
- **Screen Reader Summary**: "Search view. Search across memories, people, and scanned text with voice search support."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Native searchable interface with dynamic keyboard.
- **Tablet (768px – 1024px)**: Expanded grid on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/search`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `Query: { q: string, spaceId?: string }`
- **Response Payload**: `{ success: true, data: { items: Array<Memory>, total: number } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `search-service / Local SQLite FTS5`
- **Database Tables**: `memories`, `media_assets`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `search.executed`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: No
- **Privacy Architecture**: Search strictly scoped to authorized spaces.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] debounces query input by 300ms
  - [ ] executes local SQLite FTS when offline
- **Integration Tests**:
  - [ ] GET /api/search returns query matches
- **End-to-End Acceptance Tests**:
  - [ ] types query 'wedding', verifies results appear, taps result card

#### 17. UI Component Inventory
`NativeSearchView`, `SearchFilterChips`, `ResultCard`, `VoiceDictationButton`

---

### IOS-16 — Quick Capture Modal Hub (+ Button Sheet)

**Category**: Native iOS — Home & Navigation  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Launch any memory capture workflow from the center '+' tab bar button: Take Photo, Pick from Roll, Record Video, Record Audio, or Write Story.
- **User Story**: "As an archivist, I want to tap the big '+' button to immediately choose whether I am snapping a photo, recording a voice note, or writing a thought."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-11 TabBar '+' center button`, `memoria://capture`
- **Exit Routes**: `IOS-17 Camera / PHPicker`, `IOS-18 Video Capture`, `IOS-19 Voice Recorder`, `IOS-20 Quick Story`
- **Back Navigation**: `IOS-11`
- **Deep Link**: `memoria://capture`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member (Contributor+)
- **Required Capabilities**: `create_memory`, `upload_media`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Sheet title 'Preserve a Memory' with space indicator and close button.
- **Main Content**: Grid of 5 tactile capture buttons with SF Symbols and warm color accents: 1. Camera / Photo Roll, 2. Record Home Video, 3. Record Voice Note, 4. Write Quick Story, 5. Scan Physical Document.
- **Footer / Actions Bar**: Cancel button.

#### 5. Interactive Controls & UI Elements
- Capture option buttons (Camera, Video, Audio, Story, Scan)
- Close / Cancel button
- Haptic feedback on tap (.impact(.medium))

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First capture button (Camera)`
- **Tab Sequence**: `Capture buttons` -> `Cancel`
- **Escape Key Action**: Dismisses sheet

#### 8. States Matrix
- **Loading State**: N/A
- **Empty State**: N/A
- **Populated State**: Warm Ivory sheet with tactile Plum/Sage button cards.
- **Error State**: N/A
- **Offline Mode**: All capture actions fully supported offline.
- **Permission Denied**: Alert if user is only Viewer in the active space.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: VoiceOver accessible
- **Screen Reader Summary**: "Quick capture hub. Choose photo, video, voice note, story, or document scanning."
- **Touch Target Minimum**: `56x56 pt`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Native sheet presentationDetents([.medium]).
- **Tablet (768px – 1024px)**: Centered modal popover on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `N/A` `N/A (Client workflow router)`
- **Authorization**: `None`
- **Response Payload**: `N/A`
- **Status Codes**: `200 OK`

#### 13. Service Architecture & Persistence
- **Backend Service**: `iOS Client`
- **Database Tables**: _None (Stateless / InMemory)_
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: _None_
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `None`
- **Security Audit Logged**: No
- **Privacy Architecture**: Local action router.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] routes to correct subview on button tap
  - [ ] checks space role permissions
- **Integration Tests**:
  - [ ] opens target sheet with active spaceId
- **End-to-End Acceptance Tests**:
  - [ ] taps center '+' tab bar button, verifies Quick Capture sheet appears with all 5 options

#### 17. UI Component Inventory
`QuickCaptureSheet`, `CaptureOptionCard`, `Button`

---

### 2.3 Native iOS Capture & Uploads (IOS-17 to IOS-22)

### IOS-17 — Custom Camera Viewfinder & PHPicker Integration

**Category**: Native iOS — Capture & Uploads  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Capture new photos with AVFoundation camera or select multiple high-resolution photos via PHPickerViewController.
- **User Story**: "As an archivist, I want to take a crisp photo of grandmother's heirloom necklace or select 10 photos from my camera roll with lossless SHA-256 preservation."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-16`, `memoria://camera`
- **Exit Routes**: `IOS-27 Edit Metadata`, `IOS-21 Upload Queue`, `IOS-11`
- **Back Navigation**: `IOS-16`
- **Deep Link**: `memoria://camera`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member (Contributor+)
- **Required Capabilities**: `capture_photo`, `upload_media`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Camera top bar: Flash toggle (Auto/On/Off), Camera flip button, Cancel button.
- **Main Content**: AVCaptureVideoPreviewLayer full screen viewfinder with framing grid, or PHPicker multi-selection sheet.
- **Footer / Actions Bar**: Shutter button (circular white trigger with haptic feedback), Photo roll thumbnail button (opens PHPicker).

#### 5. Interactive Controls & UI Elements
- Shutter Button (AVCapturePhotoOutput trigger)
- Photo Roll Picker button (PHPickerConfiguration with .images filter and selectionLimit: 50)
- Flash Toggle button
- Camera Flip button
- Close button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Shutter button`
- **Tab Sequence**: `Flash` -> `Camera flip` -> `Shutter` -> `Photo roll` -> `Close`
- **Escape Key Action**: Dismisses camera

#### 8. States Matrix
- **Loading State**: Camera session initializing spinner.
- **Empty State**: Live camera stream.
- **Populated State**: Captured photo preview thumbnail displayed in bottom-left corner.
- **Error State**: Camera permission denied alert with 'Open Settings' button.
- **Offline Mode**: Captured photos saved locally to Documents/memoria_originals and queued in SQLite.
- **Permission Denied**: Camera / Photos permission denied alert.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: VoiceOver accessible
- **Screen Reader Summary**: "Camera viewfinder. Double tap shutter button to take a photo. Tap photo roll to select existing photos."
- **Touch Target Minimum**: `64x64 pt shutter button`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `12:1 (White controls over camera feed)`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Full screen viewfinder adapted to device aspect ratio.
- **Tablet (768px – 1024px)**: Viewfinder on iPad with side shutter control.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/media/upload-session`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ spaceId: string, fileName: string, mimeType: string, fileSizeBytes: number, checksumSha256: string }`
- **Response Payload**: `{ success: true, data: { mediaId: string, uploadUrl: string } }`
- **Status Codes**: `200 OK`, `400 Bad Request`

#### 13. Service Architecture & Persistence
- **Backend Service**: `media-service / Local Disk Storage`
- **Database Tables**: `media_assets`, `memories`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `media.photo_captured`
- **BullMQ Background Jobs**: `generate-derivatives`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Original byte-for-byte SHA-256 preserved; EXIF GPS coordinates retained locally.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] computes SHA-256 of captured image data before upload
  - [ ] handles PHPicker result array
- **Integration Tests**:
  - [ ] creates upload session on backend
- **End-to-End Acceptance Tests**:
  - [ ] simulates photo capture, verifies image saved to local disk and upload queued

#### 17. UI Component Inventory
`CameraViewfinder`, `ShutterButton`, `PHPickerWrapper`, `Button`

---

### IOS-18 — Video Capture & Native Trim Preview

**Category**: Native iOS — Capture & Uploads  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Record short family video clips (up to 10 minutes) and trim start/end points using UIVideoEditorController.
- **User Story**: "As an archivist, I want to record my children singing happy birthday to grandfather and trim out the first 2 seconds."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-16`
- **Exit Routes**: `IOS-27 Edit Metadata`, `IOS-21 Upload Queue`
- **Back Navigation**: `IOS-16`
- **Deep Link**: `memoria://video/capture`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member (Contributor+)
- **Required Capabilities**: `capture_video`, `upload_media`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Recording timer (00:00 / 10:00 max) and cancel button.
- **Main Content**: Live camera stream during recording; or AVPlayer video preview with frame scrubber during trim review.
- **Footer / Actions Bar**: Record/Stop button; or Trim scrubber bar with 'Use Video' button.

#### 5. Interactive Controls & UI Elements
- Record / Stop Button (Red circular trigger)
- Trim Start and End drag handles
- Play / Pause preview button
- Button: 'Use Video'
- Button: 'Retake'

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Record button`
- **Tab Sequence**: `Record` -> `Trim handles` -> `Use video` -> `Retake`
- **Escape Key Action**: Prompts if unsaved video exists

#### 8. States Matrix
- **Loading State**: Exporting trimmed video spinner.
- **Empty State**: Live viewfinder ready to record.
- **Populated State**: Recorded video loaded in AVPlayer preview.
- **Error State**: Camera/Mic permission denied alert.
- **Offline Mode**: Saved to local storage and queued in SQLite offline queue.
- **Permission Denied**: Permission denied alert.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: VoiceOver accessible
- **Screen Reader Summary**: "Video recording. Double tap to start recording. Maximum length 10 minutes."
- **Touch Target Minimum**: `64x64 pt record button`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `12:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Full screen video capture.
- **Tablet (768px – 1024px)**: Full screen with iPad layout.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/media/upload-session`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ spaceId: string, fileName: string, mimeType: 'video/mp4', fileSizeBytes: number }`
- **Response Payload**: `{ success: true, data: { mediaId: string, uploadUrl: string } }`
- **Status Codes**: `200 OK`, `400 Bad Request`

#### 13. Service Architecture & Persistence
- **Backend Service**: `media-service / Local Storage`
- **Database Tables**: `media_assets`, `memories`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `media.video_captured`
- **BullMQ Background Jobs**: `generate-video-poster`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Home videos encrypted at rest on device.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] enforces 10-minute maximum recording limit
  - [ ] trims AVAsset using AVAssetExportSession
- **Integration Tests**:
  - [ ] initiates upload session for MP4 video
- **End-to-End Acceptance Tests**:
  - [ ] records 3-second test clip, trims 1 second, confirms export

#### 17. UI Component Inventory
`VideoCaptureView`, `VideoTrimScrubber`, `AVPlayerPreview`, `Button`

---

### IOS-19 — Native Voice Note Recorder & Live Waveform

**Category**: Native iOS — Capture & Uploads  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Record high-quality oral history voice notes with AVAudioRecorder, live audio waveform rendering, and pause/resume.
- **User Story**: "As an interviewer, I want to record grandfather telling war stories with live audio wave visualization on my iPhone and pause when he takes a sip of water."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-16`, `memoria://record`
- **Exit Routes**: `IOS-27 Edit Metadata`, `IOS-21 Upload Queue`
- **Back Navigation**: `IOS-16`
- **Deep Link**: `memoria://record`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member (Contributor+)
- **Required Capabilities**: `record_audio`, `upload_media`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Navigation bar: 'Oral History Recording' with Cancel button.
- **Main Content**: 1. Timer display (00:00 / max 60:00), 2. Live SwiftUI audio waveform reacting to AVAudioRecorder.averagePower, 3. Record / Pause / Resume controls, 4. Audio review playback scrubber.
- **Footer / Actions Bar**: Buttons: 'Discard' and 'Save Oral History'.

#### 5. Interactive Controls & UI Elements
- Large Record / Pause circular button (with haptic feedback)
- Stop & Review button
- Playback Play/Pause button
- Button: 'Save Audio Recording'
- Button: 'Discard' (with confirmation prompt)

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Record button`
- **Tab Sequence**: `Record` -> `Stop` -> `Save` -> `Discard`
- **Escape Key Action**: Prompts if recording active

#### 8. States Matrix
- **Loading State**: Configuring AVAudioSession spinner.
- **Empty State**: Ready to record with microphone emblem and zeroed timer.
- **Populated State**: Animated green/plum waveform reacting to vocal decibels.
- **Error State**: Microphone permission denied alert.
- **Offline Mode**: Audio saved locally in m4a format and queued for sync.
- **Permission Denied**: Microphone permission alert.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: VoiceOver accessible
- **Screen Reader Summary**: "Oral history voice recorder. Double tap record button to start."
- **Touch Target Minimum**: `64x64 pt record trigger`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Native sheet with full screen recording stage.
- **Tablet (768px – 1024px)**: Centered 500pt recording card on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/media/upload-audio`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `Multipart audio/m4a binary payload with spaceId`
- **Response Payload**: `{ success: true, data: { mediaId: string, durationSeconds: number } }`
- **Status Codes**: `201 Created`, `400 Bad Request`

#### 13. Service Architecture & Persistence
- **Backend Service**: `media-service / Local Storage`
- **Database Tables**: `media_assets`, `memories`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `media.audio_recorded`
- **BullMQ Background Jobs**: `generate-audio-waveform`, `transcribe-audio`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Audio recorded via AAC codec; stored locally in app Documents.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] updates timer every 0.1s during active recording
  - [ ] handles audio interruptions e.g. phone calls
- **Integration Tests**:
  - [ ] POST /api/media/upload-audio stores audio asset
- **End-to-End Acceptance Tests**:
  - [ ] records 4 seconds, pauses, resumes, saves, verifies audio file exists

#### 17. UI Component Inventory
`VoiceRecorderView`, `AudioWaveformCanvas`, `RecordButton`, `Button`

---

### IOS-20 — Quick Thought, Quote & Micro-Story Composer

**Category**: Native iOS — Capture & Uploads  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Compose a family quote or written memory quickly with title, body, date, and person tag.
- **User Story**: "As an archivist, I want to quickly jot down a funny quote my daughter said at breakfast before I forget it."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-16`
- **Exit Routes**: `IOS-11 Home Feed`, `IOS-26 Memory Detail`
- **Back Navigation**: `IOS-16`
- **Deep Link**: `memoria://story/new`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member (Contributor+)
- **Required Capabilities**: `create_memory`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Sheet navigation bar: 'Quick Story & Quote' with Cancel and 'Publish' buttons.
- **Main Content**: 1. Story Title TextField, 2. TextEditor for story narrative / quotation, 3. Tag Person selector pill, 4. DatePicker for when it was said/happened.
- **Footer / Actions Bar**: Word count badge.

#### 5. Interactive Controls & UI Elements
- Title TextField
- Narrative TextEditor
- Tag Person selector button
- DatePicker (Capture Date)
- Publish NavigationBarButton

#### 6. Form Validation & Data Schema

| Field Name | Data Type | Required | Limits & Constraints | Validation Rule | Error Copy |
|---|---|---|---|---|---|
| `title` | `text` | **Yes** | 1-120 chars | Standard type validation | Please provide a title. |
| `content` | `text` | **Yes** | 1-10000 chars | Standard type validation | Story content cannot be empty. |

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Title TextField`
- **Tab Sequence**: `Title` -> `TextEditor` -> `Person pill` -> `DatePicker` -> `Publish`
- **Escape Key Action**: Prompts on unsaved text

#### 8. States Matrix
- **Loading State**: Publishing story spinner.
- **Empty State**: Placeholder: 'What happened? Write down the words, date, and who said them.'
- **Populated State**: Valid narrative entered.
- **Error State**: Validation error banner.
- **Offline Mode**: Saved to local SQLite database; immediately visible in feed.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: VoiceOver accessible
- **Screen Reader Summary**: "Quick story composer. Write a quote or story, tag a person, and publish."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Native sheet with keyboard avoidance.
- **Tablet (768px – 1024px)**: Centered sheet on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/memories`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ spaceId: string, title: string, content: string, format: 'story', capturedAt: string }`
- **Response Payload**: `{ success: true, data: { memory: Memory } }`
- **Status Codes**: `201 Created`, `400 Bad Request`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service / Local SQLite`
- **Database Tables**: `memories`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `memory.created`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Written memoirs protected by space tenant boundary.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] validates non-empty title and content
  - [ ] stores memory optimistically in SQLite
- **Integration Tests**:
  - [ ] POST /api/memories stores story
- **End-to-End Acceptance Tests**:
  - [ ] composes quote, tags person, taps Publish, confirms appears in HomeFeed

#### 17. UI Component Inventory
`StoryComposerView`, `TextEditor`, `TagPersonPill`, `Button`

---

### IOS-21 — Background Upload Queue & Progress Sheet

**Category**: Native iOS — Capture & Uploads  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Monitor multi-file background URLSession transfers, SHA-256 hashing, and processing progress.
- **User Story**: "As an archivist uploading 30 photos over cellular, I want to see upload progress and know transfers continue in background even if I switch apps."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-11 navigation bar upload pill`, `IOS-17`
- **Exit Routes**: `IOS-11`, `IOS-22 Offline Queue`
- **Back Navigation**: `IOS-11`
- **Deep Link**: `memoria://uploads`

#### 3. Personas & Authorization
- **Eligible Roles**: Authenticated Member
- **Required Capabilities**: `view_uploads`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Sheet navigation bar: 'Upload Status' with overall percentage bar and close button.
- **Main Content**: List of active transfers: Thumbnail, File name, Byte progress (e.g. '12.4 MB of 18.2 MB · 68%'), Status badge (Hashing, Uploading, Processing), Cancel button.
- **Footer / Actions Bar**: Buttons: 'Pause All' and 'Clear Completed'.

#### 5. Interactive Controls & UI Elements
- Cancel item button (X)
- Pause All uploads button
- Resume All uploads button
- Clear completed items button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First active upload row`
- **Tab Sequence**: `Pause button` -> `Upload rows` -> `Clear button`
- **Escape Key Action**: Dismisses sheet

#### 8. States Matrix
- **Loading State**: Active streaming progress bars.
- **Empty State**: Notice: 'All media items verified and uploaded.'
- **Populated State**: List of active URLSessionUploadTask items with progress indicators.
- **Error State**: Amber failed state with 'Retry' button.
- **Offline Mode**: Paused badge: 'Uploads will resume automatically when online.'
- **Permission Denied**: N/A

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: VoiceOver accessible
- **Screen Reader Summary**: "Background upload queue. Uploading 4 of 12 items. 45% complete."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Native sheet presentationDetents([.medium, .large]).
- **Tablet (768px – 1024px)**: Sheet on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `N/A` `Native URLSession background delegate events`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `N/A`
- **Status Codes**: `200 OK`

#### 13. Service Architecture & Persistence
- **Backend Service**: `iOS Background URLSession / Local SQLite`
- **Database Tables**: `media_assets`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `media.upload_progress_updated`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: No
- **Privacy Architecture**: Upload tasks persist across app restarts using background URLSessionConfiguration.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] handles URLSession delegate progress updates
  - [ ] resumes interrupted tasks
- **Integration Tests**:
  - [ ] completes multi-part direct upload to media service
- **End-to-End Acceptance Tests**:
  - [ ] initiates 2 uploads, verifies progress bars advance to 100%

#### 17. UI Component Inventory
`UploadQueueSheet`, `UploadTaskRow`, `ProgressBar`, `Button`

---

### IOS-22 — Offline Queue, Retry Management & Conflict Sheet

**Category**: Native iOS — Capture & Uploads  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Inspect offline pending mutations, retry failed network requests, and resolve sync conflicts safely.
- **User Story**: "As an archivist traveling in rural areas without cellular service, I want to review my offline created memories and ensure they sync without data loss when I reach Wi-Fi."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-21`, `IOS-55 Storage & Sync`
- **Exit Routes**: `IOS-11`, `IOS-26`
- **Back Navigation**: `IOS-11`
- **Deep Link**: `memoria://offline-queue`

#### 3. Personas & Authorization
- **Eligible Roles**: Authenticated Member
- **Required Capabilities**: `manage_offline_queue`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Sheet navigation bar: 'Offline Sync Queue' with 'Sync Now' button.
- **Main Content**: 1. Network status banner (Offline / Reconnecting / Connected), 2. Pending mutations list (Created Memories, Uploaded Photos, Profile Edits), 3. Conflict resolution section (Keep Local vs Keep Server vs Keep Both).
- **Footer / Actions Bar**: All offline changes are preserved safely in local SQLite note.

#### 5. Interactive Controls & UI Elements
- Button: 'Sync Now' (triggers immediate retry)
- Button: 'Keep Both Versions' (on conflict)
- Delete pending offline change button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Sync Now button`
- **Tab Sequence**: `Sync button` -> `Pending item rows` -> `Resolution buttons`
- **Escape Key Action**: Dismisses sheet

#### 8. States Matrix
- **Loading State**: Synchronizing mutations spinner.
- **Empty State**: Notice: 'All offline changes synchronized with server.'
- **Populated State**: List of pending database mutations awaiting network transmission.
- **Error State**: Error banner with diagnostic code.
- **Offline Mode**: Amber offline badge: 'Waiting for network connection...'
- **Permission Denied**: N/A

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: VoiceOver accessible
- **Screen Reader Summary**: "Offline sync queue. 5 changes pending network synchronization."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Native sheet presentationDetents([.medium, .large]).
- **Tablet (768px – 1024px)**: Sheet on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/sync/batch`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ mutations: Array<{ operationId: string, type: string, payload: any, timestamp: string }> }`
- **Response Payload**: `{ success: true, data: { processedCount: number, conflicts: Array<any> } }`
- **Status Codes**: `200 OK`, `409 Conflict`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service / Local SQLite outbox`
- **Database Tables**: `memories`, `outbox_events`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `ios.offline_sync_completed`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Idempotency keys prevent duplicate records on reconnect.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] queues mutations in SQLite outbox table when network unreachable
  - [ ] replays in order
- **Integration Tests**:
  - [ ] POST /api/sync/batch processes batch idempotently
- **End-to-End Acceptance Tests**:
  - [ ] creates memory in airplane mode, turns on network, confirms auto-sync to server

#### 17. UI Component Inventory
`OfflineQueueSheet`, `PendingMutationRow`, `ConflictCard`, `Button`

---

### 2.4 Native iOS Memory Browsing & Management (IOS-23 to IOS-34)

### IOS-23 — Native Fluid Timeline with Inertial Scrolling

**Category**: Native iOS — Browsing & Management  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Scroll through family memories chronologically with buttery smooth 120 FPS ProMotion inertia and year jump scrubbing.
- **User Story**: "As an archivist, I want to glide smoothly through 50 years of family history with decade markers and tap to open any memory."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-11 TabBar (Archive Tab)`, `IOS-13`
- **Exit Routes**: `IOS-26 Memory Detail`, `IOS-25 Calendar`
- **Back Navigation**: `IOS-11`
- **Deep Link**: `memoria://timeline`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member
- **Required Capabilities**: `view_timeline`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Navigation bar: 'Timeline' with Year jump button, Filter icon button, and view mode toggle (Timeline / Grid / Calendar).
- **Main Content**: Continuous LazyVStack Timeline: Year headers (e.g. '1974', '1982'), timeline nodes in Soft Sage #849483, memory cards with photo thumbnails, EXIF dates, and audio play buttons.
- **Aside / Sidebar**: Right-hand vertical decade scrubber index (tap or drag to scrub years).
- **Footer / Actions Bar**: Timeline origin milestone.

#### 5. Interactive Controls & UI Elements
- Decade scrubber vertical bar (haptic ticks on year boundaries)
- View mode segmented picker (Timeline / Grid / Calendar)
- Memory card tap (opens IOS-26)
- Audio play button on audio memories

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First memory card`
- **Tab Sequence**: `View picker` -> `Scrubber` -> `Timeline cards`
- **Escape Key Action**: None

#### 8. States Matrix
- **Loading State**: Pulsing timeline skeleton spine.
- **Empty State**: Notice: 'No memories recorded yet. Add memories to start your timeline.'
- **Populated State**: ProMotion 120 FPS timeline with thumbnail caching and smooth scrolling.
- **Error State**: Error banner with refresh action.
- **Offline Mode**: Fully available from local SQLite database.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: VoiceOver accessible
- **Screen Reader Summary**: "Chronological timeline view. Year markers and memory cards arranged in historical sequence."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Single vertical timeline spine with right-hand scrubber.
- **Tablet (768px – 1024px)**: Two-column staggered timeline on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/spaces/:spaceId/timeline`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { timeline: Array<{ year: number, memories: Array<Memory> }> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service / Local SQLite`
- **Database Tables**: `memories`, `memory_media`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: _None_
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: No
- **Privacy Architecture**: Historical capture dates indexed locally.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] groups memories by capture year accurately
  - [ ] fires UISelectionFeedbackGenerator during scrubbing
- **Integration Tests**:
  - [ ] GET /api/spaces/:spaceId/timeline orders chronologically
- **End-to-End Acceptance Tests**:
  - [ ] scrubs timeline to 1980, verifies smooth scroll, taps memory card

#### 17. UI Component Inventory
`TimelineView`, `TimelineNode`, `DecadeScrubberBar`, `MemoryCard`

---

### IOS-24 — Responsive Media Grid with Pinch-to-Zoom Density

**Category**: Native iOS — Browsing & Management  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Browse family photos and scans in a responsive grid with pinch gestures to toggle between 2, 3, and 5 columns.
- **User Story**: "As an archivist, I want to pinch the photo grid to zoom out to 5 columns for bird's-eye browsing or pinch in to 2 columns for large previews."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-11 TabBar (Archive Tab)`, `IOS-23`
- **Exit Routes**: `IOS-26 Memory Detail`, `IOS-28 Image Editor`
- **Back Navigation**: `IOS-11`
- **Deep Link**: `memoria://grid`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member
- **Required Capabilities**: `view_grid`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Navigation bar: 'Media Grid' with column density picker and filter button.
- **Main Content**: LazyVGrid with dynamic columns (2, 3, or 5 columns) responding to magnification gesture: square thumbnail cells with format badges (Video length, Audio waveform icon, Document badge).
- **Footer / Actions Bar**: Total photos count badge.

#### 5. Interactive Controls & UI Elements
- MagnificationGesture (pinch in/out changes column count 2 ↔ 3 ↔ 5)
- Column density button in toolbar
- Thumbnail cell tap (opens IOS-26)
- Select mode button for batch operations

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First grid cell`
- **Tab Sequence**: `Toolbar` -> `Grid cells`
- **Escape Key Action**: Exits select mode

#### 8. States Matrix
- **Loading State**: Grid skeleton shimmer.
- **Empty State**: Notice: 'No photos or media in this space.'
- **Populated State**: High-density photo grid with thumbnail caching.
- **Error State**: Error banner with refresh.
- **Offline Mode**: Cached thumbnails served from local disk cache.
- **Permission Denied**: 403 Forbidden alert.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: VoiceOver accessible
- **Screen Reader Summary**: "Photo media grid. 142 items. Double tap photo to inspect."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: 2 to 5 columns on iPhone.
- **Tablet (768px – 1024px)**: 4 to 8 columns on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/spaces/:spaceId/memories`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `Query: { format: 'image' }`
- **Response Payload**: `{ success: true, data: { items: Array<Memory> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service / Local SQLite`
- **Database Tables**: `memories`, `media_assets`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: _None_
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: No
- **Privacy Architecture**: Thumbnails stored in local caches directory.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] updates grid column count on magnification gesture
  - [ ] handles thumbnail cache memory pressure
- **Integration Tests**:
  - [ ] GET /api/spaces/:spaceId/memories returns media list
- **End-to-End Acceptance Tests**:
  - [ ] pinches grid, verifies column transition from 3 to 2, taps cell

#### 17. UI Component Inventory
`MediaGridView`, `GridThumbnailCell`, `DensityPicker`, `Button`

---

### IOS-25 — Interactive Calendar Memory Heatmap

**Category**: Native iOS — Browsing & Management  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Explore memories and family anniversaries mapped onto an interactive calendar heatmap on iOS.
- **User Story**: "As an archivist, I want to tap on June 18 in the calendar to see all memories from that date across different years."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-23`, `IOS-11`
- **Exit Routes**: `IOS-26 Memory Detail`, `IOS-23 Timeline`
- **Back Navigation**: `IOS-23`
- **Deep Link**: `memoria://calendar`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member
- **Required Capabilities**: `view_calendar`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Navigation bar: 'Memory Calendar' with month/year navigation chevrons and 'Today' button.
- **Main Content**: 1. 7-column Calendar Grid: Day numbers with colored dots representing memory volume (Heatmap: Sage for 1-3, Plum for 4+), 2. Day memory list below calendar for selected date.
- **Footer / Actions Bar**: Calendar legend.

#### 5. Interactive Controls & UI Elements
- Month navigation chevrons (Prev, Next)
- Calendar day cell tap (selects date, triggers .selection haptic)
- Today button
- Memory row tap in bottom drawer

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Today's cell`
- **Tab Sequence**: `Navigation` -> `Calendar days` -> `Day memories`
- **Escape Key Action**: None

#### 8. States Matrix
- **Loading State**: Calendar grid skeleton pulse.
- **Empty State**: Clean calendar cells without memory dots.
- **Populated State**: Heatmap decorated with memory dots and anniversary flags.
- **Error State**: Error banner with reload.
- **Offline Mode**: Cached calendar rendered from SQLite.
- **Permission Denied**: 403 Forbidden alert.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: VoiceOver accessible
- **Screen Reader Summary**: "Calendar memory view. June 18 has 4 memories. Double tap to view."
- **Touch Target Minimum**: `44x44 pt for all day cells`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Calendar top half, memory list bottom half.
- **Tablet (768px – 1024px)**: Side-by-side calendar and day inspector on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/memories/calendar`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `Query: { month: number, year: number }`
- **Response Payload**: `{ success: true, data: { days: Record<string, any> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service / Local SQLite`
- **Database Tables**: `memories`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: _None_
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: No
- **Privacy Architecture**: Birthdays and anniversaries kept confidential.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] computes heatmap dot colors based on daily memory count
  - [ ] handles month transitions
- **Integration Tests**:
  - [ ] GET /api/memories/calendar returns aggregated data
- **End-to-End Acceptance Tests**:
  - [ ] taps June 18 cell, confirms memory list updates below calendar

#### 17. UI Component Inventory
`CalendarHeatmapView`, `CalendarDayCell`, `DayMemoryList`, `Button`

---

### IOS-26 — Memory Detail View with Parallax Header & Audio Player

**Category**: Native iOS — Browsing & Management  
**Verified Status**: `Implemented & Verified`

#### 1. Core Intent & User Story
- **User Goal**: Inspect a memory's high-resolution media, narrative story, EXIF data, listen to audio recording, and read family comments.
- **User Story**: "As an archivist, I want to open a memory to see the high-res photo with parallax scroll, listen to grandmother's voice recording, and read family comments."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-11`, `IOS-23`, `IOS-24`, `memoria://memories/:memoryId`
- **Exit Routes**: `IOS-27 Edit Metadata`, `IOS-28 Image Editor`, `IOS-42 Comments`, `IOS-11`
- **Back Navigation**: `IOS-11`
- **Deep Link**: `memoria://memories/:memoryId`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member
- **Required Capabilities**: `view_memory`, `edit_memory (Author/Editor)`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Parallax media header: Photo carousel / video player with safe area blur navigation bar (Back button, Favorite heart, Edit button, Share button).
- **Main Content**: 1. Memory title in Cormorant Garamond, 2. Capture date and location badge, 3. Tagged profiles bubbles, 4. Audio player waveform bar (if audio attached), 5. Written narrative story card, 6. EXIF data section (Camera, Lens, ISO, SHA-256), 7. Comments preview row.
- **Footer / Actions Bar**: Comment input field.

#### 5. Interactive Controls & UI Elements
- Favorite heart button (.impact(.medium))
- Edit button (opens IOS-27)
- Image tap (opens full-screen near-black photo viewer)
- Audio Play / Pause button
- Tagged profile bubble tap (opens IOS-36)
- Comments row tap (opens IOS-42)

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Memory title`
- **Tab Sequence**: `Navigation buttons` -> `Media carousel` -> `Audio player` -> `Profile bubbles` -> `Comments`
- **Escape Key Action**: Returns to feed

#### 8. States Matrix
- **Loading State**: Parallax header and text skeletons.
- **Empty State**: N/A
- **Populated State**: Immersive memory view with high-res photography and Cormorant Garamond typography.
- **Error State**: Memory not found alert.
- **Offline Mode**: Cached memory details served from local SQLite and disk cache.
- **Permission Denied**: 403 Forbidden alert.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: VoiceOver accessible
- **Screen Reader Summary**: "Memory detail: 50th Wedding Anniversary. August 14, 1968. Photo attached. Double tap to hear audio."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Native scroll view with smooth parallax header stretch.
- **Tablet (768px – 1024px)**: Two-column detail layout on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/memories/:memoryId`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { memory: Memory, media: Array<MediaAsset> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`, `404 Not Found`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service / Local SQLite`
- **Database Tables**: `memories`, `media_assets`, `memory_media`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `ios.memory_viewed`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: No
- **Privacy Architecture**: Original photo bytes verified by SHA-256.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] calculates parallax offset during scroll
  - [ ] toggles favorite state in SQLite
- **Integration Tests**:
  - [ ] GET /api/memories/:memoryId returns full memory
- **End-to-End Acceptance Tests**:
  - [ ] opens memory detail, plays audio recording, taps edit button

#### 17. UI Component Inventory
`MemoryDetailView`, `ParallaxMediaHeader`, `AudioWaveformBar`, `StoryText`, `Button`

---

### IOS-27 — Edit Memory Metadata Sheet

**Category**: Native iOS — Browsing & Management  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Edit memory title, capture date/time, location, tagged profiles, and tags via native iOS sheet.
- **User Story**: "As an archivist, I want to correct the capture date from 1974 to 1976 and tag my aunt in the memory."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-26`
- **Exit Routes**: `IOS-26`
- **Back Navigation**: `IOS-26`
- **Deep Link**: `memoria://memories/:memoryId/edit`

#### 3. Personas & Authorization
- **Eligible Roles**: Author, Space Owner, Space Editor
- **Required Capabilities**: `edit_memory`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Sheet navigation bar: 'Edit Memory' with 'Cancel' and 'Save' buttons.
- **Main Content**: Form: 1. Title TextField, 2. Story Content TextEditor, 3. DatePicker for Capture Date, 4. Location TextField with MapPin symbol, 5. Associated Profiles picker, 6. Tags TextField.
- **Footer / Actions Bar**: Delete Memory button (red destructive callout with confirmation).

#### 5. Interactive Controls & UI Elements
- Title TextField
- Story TextEditor
- Capture DatePicker
- Location TextField
- Profile tag selector
- Save Button
- Destructive Button: 'Move to Trash'

#### 6. Form Validation & Data Schema

| Field Name | Data Type | Required | Limits & Constraints | Validation Rule | Error Copy |
|---|---|---|---|---|---|
| `title` | `text` | **Yes** | 1-120 chars | Standard type validation | Title is required. |

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Title field`
- **Tab Sequence**: `Title` -> `Story` -> `DatePicker` -> `Location` -> `Profiles` -> `Save`
- **Escape Key Action**: Prompts if dirty

#### 8. States Matrix
- **Loading State**: Saving memory spinner.
- **Empty State**: N/A
- **Populated State**: Pre-filled with existing metadata.
- **Error State**: Inline red error callout.
- **Offline Mode**: Optimistically updated in SQLite; queued in sync outbox.
- **Permission Denied**: 403 Forbidden alert.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: VoiceOver accessible
- **Screen Reader Summary**: "Edit memory sheet. Update title, story text, capture date, and tagged people."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Native sheet presentationDetents([.large]).
- **Tablet (768px – 1024px)**: Form sheet on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `PUT` `/api/memories/:memoryId`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ title: string, content?: string, capturedAt: string, location?: string }`
- **Response Payload**: `{ success: true, data: { memory: Memory } }`
- **Status Codes**: `200 OK`, `400 Bad Request`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service / Local SQLite`
- **Database Tables**: `memories`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `memory.updated`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Version history preserved; prior version staged in memory_history.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] validates title input
  - [ ] stages update in SQLite outbox
- **Integration Tests**:
  - [ ] PUT /api/memories/:memoryId updates record
- **End-to-End Acceptance Tests**:
  - [ ] edits title, taps Save, verifies updated title in detail view

#### 17. UI Component Inventory
`EditMemorySheet`, `TextField`, `DatePicker`, `Button`

---

### IOS-28 — CoreImage-Powered Filter, Crop & Orientation Editor

**Category**: Native iOS — Browsing & Management  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Rotate, crop, and adjust archival contrast/warmth non-destructively using Apple's CoreImage framework.
- **User Story**: "As an archivist, I want to rotate a scanned photo 90 degrees and warm up faded colors without overwriting the master archival file."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-26`, `IOS-24`
- **Exit Routes**: `IOS-26`
- **Back Navigation**: `IOS-26`
- **Deep Link**: `memoria://editor/:mediaId`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member (Contributor+)
- **Required Capabilities**: `edit_media`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Dark navigation bar: 'Archival Photo Studio' with 'Reset' and 'Save Derivative' buttons.
- **Main Content**: CoreImage metal canvas with interactive crop boundary handles, rotation wheel, and filter intensity sliders (Exposure, Contrast, Warmth, Monochrome Sepia).
- **Footer / Actions Bar**: Filter preset pills (Original, Archival Warm, Faded Print, High Contrast Black & White).

#### 5. Interactive Controls & UI Elements
- Rotate 90° Clockwise Button
- Crop aspect ratio picker (Free, Original, Square, 8x10)
- Adjustment sliders (Warmth, Exposure, Contrast)
- Filter preset buttons
- Save Button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Rotate button`
- **Tab Sequence**: `Rotate` -> `Crop` -> `Sliders` -> `Presets` -> `Save`
- **Escape Key Action**: Prompts if adjustments uncommitted

#### 8. States Matrix
- **Loading State**: Rendering CoreImage pipeline spinner.
- **Empty State**: N/A
- **Populated State**: Live GPU Metal shader rendering filter adjustments with zero lag.
- **Error State**: Error banner with retry.
- **Offline Mode**: CoreImage runs 100% locally on device GPU.
- **Permission Denied**: 403 Forbidden alert.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: VoiceOver accessible
- **Screen Reader Summary**: "Photo editor. Rotate, crop, and adjust photo warmth with CoreImage."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `12:1 (White controls over near-black canvas)`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Full screen photo editor with bottom adjustment drawer.
- **Tablet (768px – 1024px)**: Side-by-side photo and slider panel on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/media/:mediaId/derivatives`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ crop: any, rotationDegrees: number, filterSettings: any }`
- **Response Payload**: `{ success: true, data: { derivativeUrl: string } }`
- **Status Codes**: `200 OK`, `400 Bad Request`

#### 13. Service Architecture & Persistence
- **Backend Service**: `media-service / Local Storage`
- **Database Tables**: `media_assets`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `media.derivative_created`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: No
- **Privacy Architecture**: Original master bytes remain 100% immutable; only derivative recipe saved.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] applies CIFilter pipeline without modifying original image data
  - [ ] calculates crop coordinates
- **Integration Tests**:
  - [ ] POST /api/media/:mediaId/derivatives saves derivative metadata
- **End-to-End Acceptance Tests**:
  - [ ] rotates image 90 degrees, applies Archival Warm preset, taps Save

#### 17. UI Component Inventory
`CoreImageCanvas`, `CropHandles`, `AdjustmentSlider`, `Button`

---

### IOS-29 — AVPlayer Native Video Playback View

**Category**: Native iOS — Browsing & Management  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Watch recorded family video memories with native hardware-accelerated AVPlayer, scrubbing controls, and AirPlay streaming.
- **User Story**: "As a family member, I want to watch high-definition video memories with smooth scrubbing and AirPlay support on my iOS device."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-24 Media Grid`, `IOS-26 Memory Detail`, `memoria://video/:mediaId`
- **Exit Routes**: `IOS-26 Memory Detail`, `IOS-28 Image/Video Editor`
- **Back Navigation**: `IOS-26`
- **Deep Link**: `memoria://video/:mediaId`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member, Space Contributor, Space Admin
- **Required Capabilities**: `view_media`, `stream_video`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Dismiss close button, AirPlay route picker button, title overlay with capture date.
- **Main Content**: AVPlayerLayer with native video canvas, gesture controls (double tap to skip 10s, pinch to zoom), custom scrubber with thumbnail preview track.
- **Footer / Actions Bar**: Playback controls bar (Play/Pause, time elapsed/remaining, volume, picture-in-picture button).

#### 5. Interactive Controls & UI Elements
- AVPlayerViewController / Custom AVPlayer controls
- Play/Pause toggle button
- ScrubberSlider with AVAssetImageGenerator thumbnail preview
- 10-second Rewind and Forward buttons
- Picture-in-Picture (AVPictureInPictureController) button
- AirPlay route picker button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Play/Pause button`
- **Tab Sequence**: `Dismiss` -> `AirPlay` -> `Video Canvas` -> `Scrubber` -> `Play/Pause` -> `Skip buttons` -> `PiP`
- **Escape Key Action**: Dismisses full screen video

#### 8. States Matrix
- **Loading State**: AVPlayer status .unknown spinner on black backdrop.
- **Empty State**: Notice: 'Video asset unavailable.'
- **Populated State**: Active video playback with smooth 60fps rendering via Metal AVPlayerLayer.
- **Error State**: Alert: 'Video failed to play. Check connection or file format.' with Retry button.
- **Offline Mode**: Plays cached video asset from local Caches/media/ if previously downloaded.
- **Permission Denied**: 403 Forbidden alert.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA / VoiceOver accessible
- **Screen Reader Summary**: "Video player for family memory. Duration and elapsed time reported dynamically. Double tap to toggle play/pause."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `14:1 (White controls over dark video overlay)`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Full screen portrait or landscape rotation with auto-hiding controls after 3 seconds.
- **Tablet (768px – 1024px)**: Modal presentation or split view on iPad with picture-in-picture option.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/media/:mediaId/stream`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `Binary video stream (HLS / MP4 chunk) with range headers 206 Partial Content`
- **Status Codes**: `200 OK`, `206 Partial Content`, `401 Unauthorized`, `404 Not Found`

#### 13. Service Architecture & Persistence
- **Backend Service**: `media-service / Local Disk Storage`
- **Database Tables**: `media_assets`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `media.streamed`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: No
- **Privacy Architecture**: Encrypted stream URL; video memory protected under space tenant boundaries.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] initializes AVPlayerItem with authenticated media URL
  - [ ] handles backgrounding and PiP transitions
- **Integration Tests**:
  - [ ] GET /api/media/:mediaId/stream supports 206 range requests
- **End-to-End Acceptance Tests**:
  - [ ] taps video thumbnail, verifies playback starts, scrubs forward 30 seconds

#### 17. UI Component Inventory
`AVPlayerCanvasView`, `VideoScrubberSlider`, `AirPlayPicker`, `PlaybackControlBar`

---

### IOS-30 — Audio Player with Synchronized Transcript View

**Category**: Native iOS — Browsing & Management  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Listen to recorded elder voice notes or oral history audio with synchronized scrolling transcript.
- **User Story**: "As a grandchild, I want to listen to Grandma's voice note while watching the spoken words highlight in real time so I can follow every treasured detail."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-26 Memory Detail`, `memoria://audio/:memoryId`
- **Exit Routes**: `IOS-26 Memory Detail`, `IOS-27 Edit Memory`
- **Back Navigation**: `IOS-26`
- **Deep Link**: `memoria://audio/:memoryId`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member, Space Contributor, Space Admin
- **Required Capabilities**: `listen_audio`, `read_transcript`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Navigation bar with 'Audio Story', speaker avatar, and close sheet button.
- **Main Content**: 1. Animated waveform visualizer reflecting amplitude, 2. Synchronized transcript list (ScrollView with highlighted sentence based on currentTime), 3. Audio scrubber slider with timestamp labels.
- **Footer / Actions Bar**: Playback controls (0.75x, 1x, 1.25x speed selector, Play/Pause, 15s skip buttons).

#### 5. Interactive Controls & UI Elements
- Waveform visualizer scrubber
- Play/Pause button (large circular Ivory/Ink)
- 15-second skip backward and forward buttons
- Playback speed selector menu (0.75x, 1x, 1.25x, 1.5x)
- Transcript sentence tap gesture (scrubs audio directly to timestamp)
- Copy transcript button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Play/Pause button`
- **Tab Sequence**: `Close button` -> `Waveform` -> `Transcript` -> `Play/Pause` -> `Skip backward` -> `Skip forward` -> `Speed menu`
- **Escape Key Action**: Dismisses audio player sheet

#### 8. States Matrix
- **Loading State**: Waveform shimmer and transcript skeleton pulse.
- **Empty State**: Displays audio player with placeholder: 'Transcript generating via Whisper engine...'
- **Populated State**: Waveform oscillates with audio power; transcript auto-scrolls with active sentence highlighted in Warm Ochre.
- **Error State**: Alert: 'Audio decoding failed.' with Retry button.
- **Offline Mode**: Plays cached audio from local cache; cached transcript rendered from SQLite.
- **Permission Denied**: 403 Forbidden alert.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA / VoiceOver accessible
- **Screen Reader Summary**: "Audio story player with real-time transcript. VoiceOver announces spoken words and playback progress."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1 (Deep Ink on Warm Ivory)`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Half-sheet or full modal presentation with swipe down dismissal.
- **Tablet (768px – 1024px)**: Side panel or floating inspector on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/memories/:memoryId/audio-transcript`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { audioUrl: string, durationSeconds: number, transcript: Array<{ start: number, end: number, text: string }> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`, `404 Not Found`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service / Local SQLite`
- **Database Tables**: `memories`, `media_assets`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `audio.played`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: No
- **Privacy Architecture**: Voice recordings and transcriptions contain family oral histories; zero third-party leakage.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] syncs active transcript line with audio playback time
  - [ ] handles audio interruptions (phone call) gracefully
- **Integration Tests**:
  - [ ] GET /api/memories/:memoryId/audio-transcript returns valid timestamps
- **End-to-End Acceptance Tests**:
  - [ ] plays voice note, taps on transcript sentence at 0:45, verifies playback jumps to 0:45

#### 17. UI Component Inventory
`AudioWaveformVisualizer`, `TranscriptScrollView`, `AudioPlaybackBar`, `SpeedSelectorMenu`

---

### IOS-31 — Favorites Filter View & Quick Collection

**Category**: Native iOS — Browsing & Management  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Quickly view starred and treasured family moments filtered by favorites flag across all media formats.
- **User Story**: "As a family curator, I want to quickly pull up all starred heirloom memories so I can select them for the annual print book."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-11 TabBar`, `IOS-23 Timeline`, `IOS-24 Grid`
- **Exit Routes**: `IOS-26 Memory Detail`, `IOS-45 Book Creator Wizard`
- **Back Navigation**: `IOS-11`
- **Deep Link**: `memoria://favorites`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member, Space Contributor, Space Admin
- **Required Capabilities**: `view_favorites`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Navigation bar with 'Treasured Memories' title, Star icon counter, and 'Create Book' action.
- **Main Content**: 2-column Masonry photo and story card feed of all is_favorite=true memories; filter chip bar (All, Photos, Stories, Audio).
- **Footer / Actions Bar**: Batch selection floating pill ('Add X items to Book').

#### 5. Interactive Controls & UI Elements
- Format filter chips (All, Photos, Audio, Stories)
- Favorite star button on each card (toggles is_favorite)
- Card tap gesture (opens IOS-26)
- Select mode toggle button in toolbar
- Floating 'Create Book from Favorites' CTA

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First favorite card`
- **Tab Sequence**: `Filter chips` -> `Cards` -> `Select mode` -> `Create Book CTA`
- **Escape Key Action**: Dismisses selection mode

#### 8. States Matrix
- **Loading State**: Masonry shimmer skeleton with golden star badges.
- **Empty State**: Notice: 'No treasured memories yet. Tap the star icon on any memory to collect it here.'
- **Populated State**: Rich masonry grid of starred memories with gold star badge and capture date.
- **Error State**: Error banner with refresh button.
- **Offline Mode**: Loads favorites from local SQLite database seamlessly.
- **Permission Denied**: 403 Forbidden alert.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA / VoiceOver accessible
- **Screen Reader Summary**: "Favorites archive. Starred family memories list. Double tap memory to view."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: 2-column masonry grid on iPhone.
- **Tablet (768px – 1024px)**: 3 or 4-column masonry grid on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/spaces/:spaceId/memories`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `Query: { is_favorite: true }`
- **Response Payload**: `{ success: true, data: { items: Array<Memory> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service / Local SQLite`
- **Database Tables**: `memories`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: _None_
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: No
- **Privacy Architecture**: Favorite tags kept private within space boundary.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] filters memory store by is_favorite == true
  - [ ] optimistically updates star state
- **Integration Tests**:
  - [ ] GET /api/spaces/:spaceId/memories?is_favorite=true returns only starred memories
- **End-to-End Acceptance Tests**:
  - [ ] toggles favorite on memory, opens Favorites view, verifies memory appears

#### 17. UI Component Inventory
`MasonryGridView`, `MemoryCard`, `FavoriteToggleBadge`, `FilterChipBar`, `FloatingCTAButton`

---

### IOS-32 — Collections & Thematic Albums Library

**Category**: Native iOS — Browsing & Management  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Browse and manage thematic albums (e.g., 'Summer Vacations', 'Family Recipes', 'Baby Firsts', 'Military Service') on iOS.
- **User Story**: "As an archivist, I want to see our thematic memory collections in beautiful card albums so that our stories are structured logically."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-11 TabBar (Collections)`, `IOS-23`
- **Exit Routes**: `IOS-33 Collection Detail`, `IOS-32 New Collection Sheet`
- **Back Navigation**: `IOS-11`
- **Deep Link**: `memoria://collections`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member, Space Contributor, Space Admin
- **Required Capabilities**: `view_collections`, `create_collection`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Navigation bar with 'Collections' title, search bar, and '+' create album button.
- **Main Content**: Card list / 2-column grid of collections: Cover image collage with linen texture border, collection title, memory count badge, and contributors avatars.
- **Footer / Actions Bar**: Total collections count.

#### 5. Interactive Controls & UI Elements
- Create Collection '+' button in toolbar
- Search Collections text field
- Collection card tap (opens IOS-33)
- Context menu on collection card (Edit, Share, Delete)
- Sort order selector (Recent, Alphabetical, Memory Count)

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Search collections field`
- **Tab Sequence**: `Create button` -> `Search field` -> `Sort menu` -> `Collection cards`
- **Escape Key Action**: Clears search filter

#### 8. States Matrix
- **Loading State**: Collection cards skeleton pulse.
- **Empty State**: Archival placeholder: 'No collections yet. Group your memories into thematic chapters like Summer Vacations or Milestones.' with 'Create Collection' button.
- **Populated State**: Rich cards with album cover composites and Cormorant Garamond typography.
- **Error State**: Error banner with retry.
- **Offline Mode**: Rendered from SQLite collection table cache.
- **Permission Denied**: 403 Forbidden alert.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA / VoiceOver accessible
- **Screen Reader Summary**: "Collections list. Shows themed memory collections with counts. Double tap to open."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Single column list or 2-column grid on iPhone.
- **Tablet (768px – 1024px)**: 3-column grid with wide album cover cards on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/spaces/:spaceId/collections`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { collections: Array<Collection> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service / Local SQLite`
- **Database Tables**: `memory_spaces`, `memories`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: _None_
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Medium`
- **Security Audit Logged**: No
- **Privacy Architecture**: Collection names and cover selections restricted to space members.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] sorts collections by recent activity
  - [ ] filters collections via search query
- **Integration Tests**:
  - [ ] GET /api/spaces/:spaceId/collections returns collections list with item counts
- **End-to-End Acceptance Tests**:
  - [ ] taps '+' button, creates 'Summer 1990' album, verifies it appears in list

#### 17. UI Component Inventory
`CollectionGrid`, `CollectionCard`, `AlbumCoverCollage`, `SearchTextField`, `Button`

---

### IOS-33 — Collection Detail & Memory Curator View

**Category**: Native iOS — Browsing & Management  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: View all memories within a specific collection, reorder them, add new memories, or launch book creation from this collection.
- **User Story**: "As an archivist, I want to open our 'Grandpa's Letters' collection to read the letters in chronological order and add new scans."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-32 Collections Library`, `memoria://collections/:collectionId`
- **Exit Routes**: `IOS-26 Memory Detail`, `IOS-45 Book Creator Wizard`, `IOS-16 Quick Capture Hub`
- **Back Navigation**: `IOS-32`
- **Deep Link**: `memoria://collections/:collectionId`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member, Space Contributor, Space Admin
- **Required Capabilities**: `view_collection`, `edit_collection`, `add_to_collection`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Collapsing parallax header with collection cover photo, title, description, memory count, and contributor bubbles.
- **Main Content**: Chronological feed or grid of memories in this collection with drag handle to reorder (if custom sort enabled).
- **Footer / Actions Bar**: Floating action bar: 'Add Memories' and 'Print as Book'.

#### 5. Interactive Controls & UI Elements
- Collection Edit button in toolbar
- View toggle (Grid vs Timeline)
- Add Memories button (opens memory picker sheet)
- 'Print as Book' primary CTA button
- Reorder handle in list view
- Memory card tap gesture

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Add Memories button`
- **Tab Sequence**: `Edit button` -> `View toggle` -> `Collection header` -> `Memory cards` -> `Print CTA`
- **Escape Key Action**: Pops navigation stack back to IOS-32

#### 8. States Matrix
- **Loading State**: Parallax header shimmer and memory grid skeleton.
- **Empty State**: Archival empty state: 'This collection is empty. Tap Add Memories to curate items from your space.'
- **Populated State**: Rich list of memories with timeline indicators, dates, and media cards.
- **Error State**: Alert: 'Failed to load collection.' with retry.
- **Offline Mode**: Served from local SQLite cache.
- **Permission Denied**: 403 Forbidden alert.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA / VoiceOver accessible
- **Screen Reader Summary**: "Collection detail view. Shows title, description, and curated items. Double tap to open item."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Parallax header with sticky title on scroll, dynamic grid.
- **Tablet (768px – 1024px)**: Split-view on iPad with album metadata on left and memory grid on right.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/spaces/:spaceId/collections/:collectionId`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { collection: Collection, memories: Array<Memory> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`, `404 Not Found`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service / Local SQLite`
- **Database Tables**: `memories`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: _None_
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: No
- **Privacy Architecture**: Preserves personal notes and letters securely.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] parses collection items array
  - [ ] handles parallax scroll offset calculations
- **Integration Tests**:
  - [ ] GET /api/spaces/:spaceId/collections/:id returns items in specified sort order
- **End-to-End Acceptance Tests**:
  - [ ] opens collection, reorders two items, verifies new order persists

#### 17. UI Component Inventory
`ParallaxHeaderView`, `MemoryGridView`, `ReorderableList`, `FloatingActionBar`, `Button`

---

### IOS-34 — Trash & Soft-Delete Restoration Sheet

**Category**: Native iOS — Browsing & Management  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Inspect soft-deleted memories, restore accidentally deleted heirloom items, or permanently purge them within 30-day grace window.
- **User Story**: "As a space admin or memory creator, I want to view deleted memories in the trash so that I can restore an accidentally removed photo before 30 days elapse."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-54 Space Settings`, `IOS-13 Space Overview`
- **Exit Routes**: `IOS-11 Home Feed`, `IOS-54 Settings`
- **Back Navigation**: `IOS-54`
- **Deep Link**: `memoria://trash`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Admin, Space Member (own items)
- **Required Capabilities**: `view_trash`, `restore_memory`, `purge_memory`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Navigation bar with 'Trash' title, 'Select' mode button, and Close sheet button.
- **Main Content**: 1. Archival warning banner: 'Items in trash will be permanently purged after 30 days', 2. List of soft-deleted items with thumbnail, title, deletion date, and days remaining badge.
- **Footer / Actions Bar**: Toolbar buttons: 'Restore All' and 'Empty Trash'.

#### 5. Interactive Controls & UI Elements
- Individual item Restore button (curved arrow SF Symbol)
- Individual item Permanent Delete button (trash SF Symbol)
- Select mode checkbox on cards
- Bottom toolbar: 'Restore (X)' and 'Delete Permanently (X)'
- Close sheet button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First trashed item`
- **Tab Sequence**: `Close button` -> `Warning banner` -> `Trashed items` -> `Restore button` -> `Empty Trash button`
- **Escape Key Action**: Dismisses trash sheet

#### 8. States Matrix
- **Loading State**: Trash list skeleton pulse.
- **Empty State**: Notice: 'Trash is empty. All heirloom memories are safe in your living archive.'
- **Populated State**: Cards with soft red accent border, deleted date, and days remaining badge.
- **Error State**: Error banner with retry.
- **Offline Mode**: Action requires network or queued for sync.
- **Permission Denied**: Alert: 'Only space administrators or authors can manage trash.'

#### 9. Confirmation & Cancellation Workflows
Permanent deletion requires double confirmation modal: 'This cannot be undone. All original media and metadata will be permanently deleted from local disk.'

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA / VoiceOver accessible
- **Screen Reader Summary**: "Trash sheet. Lists deleted items with restoration and permanent delete options."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Modal sheet with scrollable list and sticky bottom action bar.
- **Tablet (768px – 1024px)**: Form sheet modal on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/spaces/:spaceId/trash`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { items: Array<DeletedMemory> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service / Local SQLite`
- **Database Tables**: `memories`, `media_assets`, `outbox_events`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `memory.restored`, `memory.purged`
- **BullMQ Background Jobs**: `purge-expired-trash`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Purge removes disk assets and database records permanently.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] calculates remaining days from deleted_at + 30 days
  - [ ] verifies soft-delete filtering
- **Integration Tests**:
  - [ ] POST /api/spaces/:spaceId/trash/restore restores memory.deleted_at to null
- **End-to-End Acceptance Tests**:
  - [ ] deletes memory to trash, opens trash sheet, taps Restore, verifies memory returns to feed

#### 17. UI Component Inventory
`TrashListView`, `TrashedMemoryCard`, `AlertModal`, `ToolbarActionBar`, `Button`

---

### 2.5 Native iOS Profiles & Collaboration (IOS-35 to IOS-42)

### IOS-35 — People & Profiles Directory with Family Bubbles

**Category**: Native iOS — Profiles & Collaboration  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Explore family tree members, children, ancestors, and beloved pets in an interactive visual bubble directory.
- **User Story**: "As a family member, I want to tap on my grandfather's profile bubble to explore his life milestones, stories, and photographs."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-11 TabBar (People Tab)`, `IOS-13 Space Overview`
- **Exit Routes**: `IOS-36 Profile Detail`, `IOS-37 Create Profile Sheet`
- **Back Navigation**: `IOS-11`
- **Deep Link**: `memoria://people`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member, Space Contributor, Space Admin
- **Required Capabilities**: `view_profiles`, `create_profile`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Navigation bar with 'People & Profiles' title, filter segmented control (All, Family, Ancestors, Pets), and '+' button.
- **Main Content**: 1. Top horizontal scroll of large featured avatar bubbles with gold archival rings, 2. Alphabetical list of profiles with relationship tags, birth/passing years, and memory counts.
- **Footer / Actions Bar**: Total profiles count badge.

#### 5. Interactive Controls & UI Elements
- Segmented control filter (All, Immediate, Ancestors, Pets)
- Add Profile '+' button in navigation bar
- Avatar bubble tap (opens IOS-36)
- Profile list row tap (opens IOS-36)
- Search bar filtering by name or relationship

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Search people field`
- **Tab Sequence**: `Add button` -> `Segmented filter` -> `Search field` -> `Avatar bubbles` -> `Profile rows`
- **Escape Key Action**: Clears search field

#### 8. States Matrix
- **Loading State**: Circular avatar shimmer placeholders and list skeleton.
- **Empty State**: Notice: 'No profiles created yet. Add family members to tag them in memories.'
- **Populated State**: Vibrant avatar bubbles with high-res portraits, relationship badges, and memory counts.
- **Error State**: Error banner with refresh action.
- **Offline Mode**: Served from local SQLite space_profiles cache.
- **Permission Denied**: 403 Forbidden alert.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA / VoiceOver accessible
- **Screen Reader Summary**: "Family profiles directory. 12 members. Double tap member to view life milestones and stories."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Avatar bubble carousel on top with full list below on iPhone.
- **Tablet (768px – 1024px)**: 3-column grid of rich profile cards on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/spaces/:spaceId/profiles`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { profiles: Array<Profile> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service / Local SQLite`
- **Database Tables**: `space_profiles`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: _None_
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: No
- **Privacy Architecture**: Contains family relationships and birth dates; strictly isolated to space members.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] groups profiles by relationship category
  - [ ] matches search queries across names and aliases
- **Integration Tests**:
  - [ ] GET /api/spaces/:spaceId/profiles returns profiles with media count metadata
- **End-to-End Acceptance Tests**:
  - [ ] taps '+' button, creates child profile, verifies avatar bubble appears

#### 17. UI Component Inventory
`AvatarBubbleCarousel`, `ProfileRowCell`, `SegmentedControl`, `SearchTextField`, `Button`

---

### IOS-36 — Profile Milestone Detail & Biographical Archive

**Category**: Native iOS — Profiles & Collaboration  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: View an individual's complete biographical dossier, life milestones, tagged memories, and audio oral histories.
- **User Story**: "As a grandchild, I want to view my grandmother's profile to see all memories where she is tagged, sorted from her youth to present day."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-35 People Directory`, `IOS-26 Memory Detail (tagged user bubble)`
- **Exit Routes**: `IOS-37 Edit Profile Sheet`, `IOS-26 Memory Detail`, `IOS-45 Create Book for Profile`
- **Back Navigation**: `IOS-35`
- **Deep Link**: `memoria://people/:profileId`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member, Space Contributor, Space Admin
- **Required Capabilities**: `view_profile`, `edit_profile`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Collapsing hero with large portrait, full name, relationship badge, birth & passing dates, and Edit button.
- **Main Content**: 1. Biographical summary & quotes card, 2. Life milestone timeline (Birth, School, Marriage, Career, Milestones), 3. Tagged memories grid.
- **Footer / Actions Bar**: Primary CTA button: 'Generate Biography Book'.

#### 5. Interactive Controls & UI Elements
- Edit Profile button in navigation bar
- Milestone card tap gesture
- Memory thumbnail tap (opens IOS-26)
- 'Generate Biography Book' CTA button
- Add Milestone '+' button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Edit button`
- **Tab Sequence**: `Edit button` -> `Hero header` -> `Milestones` -> `Memory grid` -> `Generate Book CTA`
- **Escape Key Action**: Pops navigation view back to IOS-35

#### 8. States Matrix
- **Loading State**: Hero portrait shimmer and timeline skeleton.
- **Empty State**: Notice: 'No memories or milestones tagged for this person yet.'
- **Populated State**: Rich biographical page with sepia photo frame, milestone markers, and tagged photos.
- **Error State**: Error banner with retry.
- **Offline Mode**: Cached biographical data and offline photos displayed from SQLite.
- **Permission Denied**: 403 Forbidden alert.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA / VoiceOver accessible
- **Screen Reader Summary**: "Profile for Eleanor Vance. Grandmother. Born May 12, 1932. 48 memories recorded. Double tap to view milestones."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Collapsing hero portrait with vertical milestone timeline on iPhone.
- **Tablet (768px – 1024px)**: Two-column layout with biographical dossier on left and memory grid on right on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/spaces/:spaceId/profiles/:profileId`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { profile: Profile, milestones: Array<Milestone>, memories: Array<Memory> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`, `404 Not Found`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service / Local SQLite`
- **Database Tables**: `space_profiles`, `memories`, `memory_profiles`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: _None_
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: No
- **Privacy Architecture**: Contains full birth/death dates and personal family history.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] sorts tagged memories chronologically by captured_at
  - [ ] formats life date span correctly
- **Integration Tests**:
  - [ ] GET /api/spaces/:spaceId/profiles/:id returns profile with associated milestones
- **End-to-End Acceptance Tests**:
  - [ ] navigates to Grandma profile, scrolls to 1954 wedding photo, taps photo to view detail

#### 17. UI Component Inventory
`ProfileHeroHeader`, `MilestoneTimelineView`, `MemoryThumbnailGrid`, `Button`

---

### IOS-37 — Profile Creator & Editor Sheet

**Category**: Native iOS — Profiles & Collaboration  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Create or edit a person profile with full name, relationship, birthdate, portrait photo, and biographical notes.
- **User Story**: "As a space contributor, I want to create a profile for my newborn daughter with her birth date and baby picture."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-35 People Directory`, `IOS-36 Profile Detail`
- **Exit Routes**: `IOS-36 Profile Detail`, `IOS-35 People Directory`
- **Back Navigation**: `Cancel sheet dismiss`
- **Deep Link**: `memoria://people/new`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Admin, Space Contributor
- **Required Capabilities**: `create_profile`, `edit_profile`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Sheet navigation bar: 'Cancel' on left, 'New Profile' in center, 'Save' on right.
- **Main Content**: 1. Avatar picker button with camera/photos prompt, 2. Full Name TextField, 3. Relationship picker (Self, Parent, Child, Grandparent, Pet, Ancestor), 4. Date of Birth DatePicker, 5. Deceased toggle with Passing Date DatePicker, 6. Short Bio TextEditor.
- **Footer / Actions Bar**: Privacy disclaimer: 'Profile info is only visible to invited space members.'

#### 5. Interactive Controls & UI Elements
- Avatar photo picker (PhotosPicker / Camera)
- Full Name TextField
- Relationship menu / picker
- Birth Date DatePicker (wheel / graphical style)
- Is Deceased toggle switch
- Passing Date DatePicker (conditional)
- Biography TextEditor
- Save button (navigation bar)
- Cancel button

#### 6. Form Validation & Data Schema

| Field Name | Data Type | Required | Limits & Constraints | Validation Rule | Error Copy |
|---|---|---|---|---|---|
| `name` | `text` | **Yes** | 1-100 characters | Standard type validation | Please enter a profile name. |
| `relationship` | `select` | **Yes** | N/A | Standard type validation | Please select a relationship. |
| `birthDate` | `date` | No | N/A | Date must not be in the future | Birth date cannot be in the future. |

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Full Name field`
- **Tab Sequence**: `Cancel` -> `Avatar` -> `Full Name` -> `Relationship` -> `Birth Date` -> `Deceased Toggle` -> `Bio` -> `Save`
- **Escape Key Action**: Prompts if unsaved changes exist

#### 8. States Matrix
- **Loading State**: Save button shows ProgressView; inputs disabled.
- **Empty State**: Clean form with default avatar placeholder.
- **Populated State**: Pre-filled with existing profile data when editing.
- **Error State**: Red inline validation text and UINotificationFeedbackGenerator(.error).
- **Offline Mode**: Queues profile mutation into local outbox queue for synchronization.
- **Permission Denied**: Alert: 'You do not have permission to edit profiles in this space.'

#### 9. Confirmation & Cancellation Workflows
If user taps Cancel after modifying fields: ActionSheet 'Discard Unsaved Changes?' with 'Keep Editing' and 'Discard' buttons.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA / VoiceOver accessible
- **Screen Reader Summary**: "Profile editor sheet. Enter name, relationship, and birthday. Double tap Save to finish."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Modal form sheet with keyboard avoidance on iPhone.
- **Tablet (768px – 1024px)**: Centered form sheet max-width 540pt on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/spaces/:spaceId/profiles`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ name: string, relationship: string, birthDate?: string, bio?: string, avatarMediaId?: string }`
- **Response Payload**: `{ success: true, data: { profile: Profile } }`
- **Status Codes**: `201 Created`, `400 Bad Request`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service / Local SQLite`
- **Database Tables**: `space_profiles`, `outbox_events`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `profile.created`, `profile.updated`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Child profiles and dates protected under strict space permissions.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] validates name is not empty
  - [ ] ensures passing date is after birth date
- **Integration Tests**:
  - [ ] POST /api/spaces/:spaceId/profiles writes to database and stages outbox event
- **End-to-End Acceptance Tests**:
  - [ ] fills profile form, picks avatar, taps Save, verifies profile created in directory

#### 17. UI Component Inventory
`PhotosPicker`, `TextField`, `DatePicker`, `Toggle`, `TextEditor`, `Button`

---

### IOS-38 — Space Members & Access Governance List

**Category**: Native iOS — Profiles & Collaboration  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Manage collaborative contributors in a memory space, inspect assigned roles, and adjust contributor permissions.
- **User Story**: "As a space administrator, I want to see which family members have joined our space and verify that kids are set to Contributor role."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-13 Space Overview`, `IOS-54 Space Settings`
- **Exit Routes**: `IOS-39 Invitation Share Sheet`, `IOS-40 Role Permission Editor`
- **Back Navigation**: `IOS-13`
- **Deep Link**: `memoria://space/:spaceId/members`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Admin, Space Member
- **Required Capabilities**: `view_members`, `manage_roles`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Navigation bar with 'Space Members' title and 'Invite Member' '+' button.
- **Main Content**: 1. Member list grouped by role (Owners, Admins, Contributors, Viewers), 2. Each row displays avatar, user name, email, join date, and current role pill.
- **Footer / Actions Bar**: Role explanations footer (Owner: Full control; Contributor: Can add memories; Viewer: Read-only).

#### 5. Interactive Controls & UI Elements
- Invite Member button in toolbar
- Member row tap (opens IOS-40 if admin)
- Swipe-to-remove member action (with confirmation)
- Role description info button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First member row`
- **Tab Sequence**: `Invite button` -> `Member rows` -> `Role footer`
- **Escape Key Action**: Pops navigation view back

#### 8. States Matrix
- **Loading State**: Members list skeleton pulse.
- **Empty State**: Notice: 'You are the only member in this space. Invite family to collaborate!'
- **Populated State**: Alphabetical rows grouped by role with status badges.
- **Error State**: Error banner with refresh button.
- **Offline Mode**: Cached membership directory from SQLite.
- **Permission Denied**: 403 Forbidden alert.

#### 9. Confirmation & Cancellation Workflows
Removing a member triggers modal alert: 'Remove [Name] from space? They will lose access to all memories in this space.'

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA / VoiceOver accessible
- **Screen Reader Summary**: "Space members list. 5 members. Double tap member to view or edit permissions."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Native inset grouped list on iPhone.
- **Tablet (768px – 1024px)**: Sidebar and detail pane on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/spaces/:spaceId/members`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { members: Array<SpaceMember> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `identity-service / Local SQLite`
- **Database Tables**: `space_members`, `users`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: _None_
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Medium`
- **Security Audit Logged**: No
- **Privacy Architecture**: Member emails visible only to space administrators.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] groups members by role hierarchy (Owner > Admin > Contributor > Viewer)
  - [ ] prevents removing space owner
- **Integration Tests**:
  - [ ] GET /api/spaces/:spaceId/members returns list of active collaborators
- **End-to-End Acceptance Tests**:
  - [ ] opens member list, taps on contributor, inspects role settings

#### 17. UI Component Inventory
`MembersListView`, `MemberRowCell`, `RolePillBadge`, `Button`

---

### IOS-39 — Native Invitation Link & Share Sheet

**Category**: Native iOS — Profiles & Collaboration  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Generate and share cryptographic invitation links to bring relatives into a memory space via iOS UIActivityViewController.
- **User Story**: "As an archivist, I want to tap 'Invite Family' and send an invitation link directly via iMessage or AirDrop to my sister."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-38 Members List`, `IOS-10 Contact Picker Invite`, `IOS-13 Space Overview`
- **Exit Routes**: `IOS-38 Members List`, `System Share Sheet`
- **Back Navigation**: `Dismiss sheet`
- **Deep Link**: `memoria://space/:spaceId/invite`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Admin, Space Member
- **Required Capabilities**: `create_invite_link`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Sheet navigation bar: 'Invite to Family Archive' with Close 'X' button.
- **Main Content**: 1. Space cover emblem and welcome headline, 2. Default assigned role picker (Contributor vs Viewer), 3. Expiration picker (7 days, 30 days, Never), 4. Generated invite link card with 'Copy Link' button, 5. QR Code preview for in-person scanning.
- **Footer / Actions Bar**: Primary CTA: 'Share via Messages / AirDrop' (opens UIActivityViewController).

#### 5. Interactive Controls & UI Elements
- Role picker menu (Contributor, Viewer)
- Link expiration menu
- Copy Link button (with 'Copied!' toast confirmation)
- QR Code tap gesture (magnifies for scanning)
- Native Share Sheet button (UIActivityViewController)
- Close button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Share button`
- **Tab Sequence**: `Close button` -> `Role picker` -> `Expiration picker` -> `Copy Link` -> `Share Button`
- **Escape Key Action**: Dismisses sheet

#### 8. States Matrix
- **Loading State**: Generating cryptographic token spinner.
- **Empty State**: N/A
- **Populated State**: Active invite link display with QR code rendered via CoreImage CIFilter.
- **Error State**: Alert: 'Could not generate invite link.' with retry.
- **Offline Mode**: Alert: 'Internet connection required to generate secure invite link.'
- **Permission Denied**: Alert: 'Only space administrators can invite new members.'

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA / VoiceOver accessible
- **Screen Reader Summary**: "Invitation sheet. Share secure invite link for Vance Family Archive. Double tap to open system share sheet."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Medium detent modal sheet on iPhone.
- **Tablet (768px – 1024px)**: Centered modal presentation on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/spaces/:spaceId/invites`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ role: 'contributor' | 'viewer', expiresInDays: number }`
- **Response Payload**: `{ success: true, data: { inviteUrl: string, token: string, expiresAt: string } }`
- **Status Codes**: `201 Created`, `401 Unauthorized`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `identity-service`
- **Database Tables**: `space_invitations`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `space.invite_created`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Invitation tokens are cryptographically signed with HMAC-SHA256 and expire automatically.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] generates QR code from invite URL with CIFilter
  - [ ] copies invite text to UIPasteboard
- **Integration Tests**:
  - [ ] POST /api/spaces/:spaceId/invites generates valid cryptographic token in database
- **End-to-End Acceptance Tests**:
  - [ ] generates invite, taps Copy Link, verifies link in clipboard

#### 17. UI Component Inventory
`QRCodeImageView`, `CopyLinkBox`, `UIActivityViewController`, `Menu`, `Button`

---

### IOS-40 — Role & Permission Granular Editor

**Category**: Native iOS — Profiles & Collaboration  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Modify a member's role (Admin, Contributor, Viewer) or adjust granular capabilities (upload, delete, export, order books).
- **User Story**: "As a space administrator, I want to change Uncle Bob's role to Admin so he can help manage scanned letters and member invites."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-38 Members List`
- **Exit Routes**: `IOS-38 Members List`
- **Back Navigation**: `IOS-38`
- **Deep Link**: `memoria://space/:spaceId/members/:userId/role`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Admin, Space Owner
- **Required Capabilities**: `change_member_role`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Navigation bar with 'Edit Permissions' and 'Save' button.
- **Main Content**: 1. Member profile card (Avatar, name, email, current role), 2. Role selection list (Admin, Contributor, Viewer) with detailed permission checkmarks, 3. Granular override toggles (Allow 3D Book Orders, Allow Media Export, Allow Member Invites).
- **Footer / Actions Bar**: Destructive button: 'Remove Member from Space'.

#### 5. Interactive Controls & UI Elements
- Role selection radio rows (Admin, Contributor, Viewer)
- Toggle switch: Can order print books
- Toggle switch: Can export full archive
- Toggle switch: Can invite new members
- Save button in toolbar
- Destructive 'Remove Member' button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Role selection list`
- **Tab Sequence**: `Role rows` -> `Permission toggles` -> `Save button` -> `Remove button`
- **Escape Key Action**: Prompts if unsaved changes exist

#### 8. States Matrix
- **Loading State**: Saving permission updates spinner.
- **Empty State**: N/A
- **Populated State**: Current role selected with active capability toggles.
- **Error State**: Error banner with retry.
- **Offline Mode**: Alert: 'Internet connection required to modify security permissions.'
- **Permission Denied**: Alert: 'Only space owners or administrators can change roles.'

#### 9. Confirmation & Cancellation Workflows
Demoting an Admin or removing a member prompts: 'Confirm permission change for [Name]?'

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA / VoiceOver accessible
- **Screen Reader Summary**: "Role editor for Robert Vance. Current role: Contributor. Double tap to change to Admin or Viewer."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Grouped form list on iPhone.
- **Tablet (768px – 1024px)**: Centered form sheet on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `PATCH` `/api/spaces/:spaceId/members/:userId`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ role: 'admin' | 'contributor' | 'viewer', permissionsOverrides?: Record<string, boolean> }`
- **Response Payload**: `{ success: true, data: { member: SpaceMember } }`
- **Status Codes**: `200 OK`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `identity-service`
- **Database Tables**: `space_members`, `outbox_events`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `space.member_role_updated`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Role changes are recorded in immutable security audit logs.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] prevents self-demotion if caller is the sole space owner
  - [ ] maps role to permission flags
- **Integration Tests**:
  - [ ] PATCH /api/spaces/:spaceId/members/:userId updates role in database and publishes event
- **End-to-End Acceptance Tests**:
  - [ ] changes contributor to admin, taps Save, verifies badge updates to Admin in member list

#### 17. UI Component Inventory
`RoleSelectionRow`, `Toggle`, `DestructiveButton`, `Button`

---

### IOS-41 — Collaborative Activity Stream with Pull-to-Refresh

**Category**: Native iOS — Profiles & Collaboration  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Follow recent family uploads, newly published books, audio additions, and member contributions in a real-time activity feed.
- **User Story**: "As a family member, I want to pull down to refresh the space activity stream to see what new stories Uncle Dave added today."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-11 TabBar`, `IOS-13 Space Overview`
- **Exit Routes**: `IOS-26 Memory Detail`, `IOS-36 Profile Detail`, `IOS-44 Book Detail`
- **Back Navigation**: `IOS-11`
- **Deep Link**: `memoria://activity`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member, Space Contributor, Space Admin
- **Required Capabilities**: `view_activity`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Navigation bar: 'Family Activity' with filter button (All, Memories, Books, Members).
- **Main Content**: Chronological activity event timeline: Avatar of actor, event copy ('Sarah added 4 photos to Summer 1984'), timestamp ('2 hours ago'), embedded thumbnail preview strip.
- **Footer / Actions Bar**: End of recent activity notice.

#### 5. Interactive Controls & UI Elements
- Pull-to-refresh gesture (UIRefreshControl)
- Filter menu (All events, Memories added, Books created, New members)
- Activity row tap gesture (routes to affected entity)
- Quick heart reaction button on activity item

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First activity row`
- **Tab Sequence**: `Filter button` -> `Activity rows`
- **Escape Key Action**: None

#### 8. States Matrix
- **Loading State**: Activity rows skeleton pulse.
- **Empty State**: Archival notice: 'No recent activity in this space. Add a memory or photo to get started!'
- **Populated State**: Smooth scrolling list of collaborative actions with rich thumbnail previews.
- **Error State**: Error banner with retry.
- **Offline Mode**: Served from local SQLite activity cache.
- **Permission Denied**: 403 Forbidden alert.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA / VoiceOver accessible
- **Screen Reader Summary**: "Family activity stream. 8 recent events. Sarah added 4 photos 2 hours ago. Double tap to view."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Native scroll view with pull-to-refresh on iPhone.
- **Tablet (768px – 1024px)**: Activity stream panel with detail inspector on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/spaces/:spaceId/activity`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { activities: Array<ActivityItem> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service / Local SQLite`
- **Database Tables**: `space_activity`, `users`, `memories`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: _None_
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Medium`
- **Security Audit Logged**: No
- **Privacy Architecture**: Activity feed restricted strictly to members of the space.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] formats relative timestamps (just now, 2h ago, yesterday)
  - [ ] dispatches pull-to-refresh reload
- **Integration Tests**:
  - [ ] GET /api/spaces/:spaceId/activity returns recent events in descending order
- **End-to-End Acceptance Tests**:
  - [ ] pulls down to refresh activity feed, verifies spinner spins and new items appear

#### 17. UI Component Inventory
`ActivityFeedView`, `ActivityRowCell`, `ThumbnailPreviewStrip`, `UIRefreshControl`

---

### IOS-42 — Memory Comments & Emotional Reaction Sheet

**Category**: Native iOS — Profiles & Collaboration  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Leave heartfelt comments, family voice reactions, and warm emotional reflections on an archival memory.
- **User Story**: "As an aunt, I want to comment on my nephew's baby photo and attach a 10-second voice note remembering that day."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-26 Memory Detail`
- **Exit Routes**: `IOS-26 Memory Detail`
- **Back Navigation**: `Dismiss sheet`
- **Deep Link**: `memoria://memories/:memoryId/comments`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member, Space Contributor, Space Admin
- **Required Capabilities**: `view_comments`, `post_comment`, `add_reaction`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Sheet navigation bar: 'Reflections & Notes' with close 'X' button.
- **Main Content**: 1. Heartfelt reaction bar (Heart, Tear of Joy, Vintage Camera, Hug, Clapping), 2. Chronological comments stream with author avatar, timestamp, text, and optional voice snippet player.
- **Footer / Actions Bar**: Comment composer bar: Avatar, TextEditor ('Share a memory or reflection...'), Voice note microphone button, Send button.

#### 5. Interactive Controls & UI Elements
- Reaction buttons bar (haptic feedback on selection)
- Comment TextEditor input
- Voice snippet record button (hold to record audio snippet)
- Send comment button (SF Symbol arrow.up.circle.fill)
- Delete comment context menu (for author/admin)
- Close sheet button

#### 6. Form Validation & Data Schema

| Field Name | Data Type | Required | Limits & Constraints | Validation Rule | Error Copy |
|---|---|---|---|---|---|
| `commentText` | `text` | **Yes** | 1-1000 characters | Standard type validation | Please write a comment or record a voice note. |

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Comment text editor`
- **Tab Sequence**: `Reactions bar` -> `Comments list` -> `TextEditor` -> `Mic button` -> `Send button`
- **Escape Key Action**: Dismisses keyboard then sheet

#### 8. States Matrix
- **Loading State**: Comments list skeleton pulse.
- **Empty State**: Archival notice: 'Be the first to leave a reflection on this treasured moment.'
- **Populated State**: Heartwarming list of family reflections and audio reactions.
- **Error State**: Error banner with retry.
- **Offline Mode**: Queues new comments locally; syncs upon reconnect.
- **Permission Denied**: 403 Forbidden alert.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA / VoiceOver accessible
- **Screen Reader Summary**: "Comments and reflections for this memory. 4 comments. Double tap text field to write a reflection."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Medium-to-large detent presentation sheet with keyboard avoidance on iPhone.
- **Tablet (768px – 1024px)**: Side inspector sheet on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/memories/:memoryId/comments`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ content: string, audioMediaId?: string }`
- **Response Payload**: `{ success: true, data: { comment: MemoryComment } }`
- **Status Codes**: `201 Created`, `400 Bad Request`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service / Local SQLite`
- **Database Tables**: `memory_comments`, `memory_reactions`, `outbox_events`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `memory.comment_added`, `memory.reaction_added`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: No
- **Privacy Architecture**: Comments are strictly private to space collaborators.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] enforces 1000 character limit on comment text
  - [ ] triggers UIImpactFeedbackGenerator on reaction tap
- **Integration Tests**:
  - [ ] POST /api/memories/:memoryId/comments inserts comment and returns hydrated record
- **End-to-End Acceptance Tests**:
  - [ ] types reflection, taps Send, verifies comment appears in thread

#### 17. UI Component Inventory
`ReactionBar`, `CommentsListView`, `CommentCell`, `CommentComposerBar`, `Button`

---

### 2.6 Native iOS Books & Publishing (IOS-43 to IOS-51)

### IOS-43 — 3D Bookshelf with Apple RealityKit Interactive Models

**Category**: Native iOS — Books & RealityKit 3D  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Browse family memory volumes rendered as interactive 3D books on a virtual wooden library shelf using RealityKit.
- **User Story**: "As an archivist, I want to see our published volumes on an interactive 3D shelf, rotate them in 3D space, and tap to read."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-11 TabBar (Books Tab)`, `IOS-13 Space Overview`
- **Exit Routes**: `IOS-44 Book Detail Sheet`, `IOS-49 Immersive 3D Reader`, `IOS-45 Book Creator Wizard`
- **Back Navigation**: `IOS-11`
- **Deep Link**: `memoria://bookshelf`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member, Space Contributor, Space Admin
- **Required Capabilities**: `view_books`, `read_books`, `create_book`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Navigation bar with 'Archival Bookshelf', view toggle (3D Shelf vs 2D Grid), and '+' Create Book button.
- **Main Content**: RealityView rendering realistic 3D wooden library shelf: 3D book models with cloth materials (Deep Ink, Heritage Plum, Forest Sage), gold foil stamped spines, and dynamic lighting.
- **Footer / Actions Bar**: Selected book banner with title, volume number, page count, and 'Open Book' button.

#### 5. Interactive Controls & UI Elements
- RealityView touch gesture (drag to orbit shelf, pinch to zoom)
- Entity tap gesture (RealityKit SpatialTapGesture selects 3D book with haptic pop)
- View toggle button in navigation bar (3D Shelf vs 2D Grid)
- Create Book '+' button
- Selected book 'Open Volume' primary CTA button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First book entity`
- **Tab Sequence**: `Create button` -> `View toggle` -> `Bookshelf canvas` -> `Open Volume CTA`
- **Escape Key Action**: Deselects highlighted 3D book

#### 8. States Matrix
- **Loading State**: Wood grain shelf skeleton with soft ambient light fade-in.
- **Empty State**: Notice: 'Your bookshelf is empty. Create your first family memory book to fill your archive.' with 'Create Volume' button.
- **Populated State**: Photorealistic RealityKit 3D scene with physical cloth textures, foil shimmers, and smooth 60fps rendering.
- **Error State**: Falls back to high-resolution 2D book cover grid if Metal/RealityKit fails.
- **Offline Mode**: Cached book models and textures loaded directly from local app bundle/cache.
- **Permission Denied**: 403 Forbidden alert.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA / VoiceOver accessible
- **Screen Reader Summary**: "3D memory bookshelf. 4 family books on display. Double tap Volume 1: Vance Family Chronicle 1970-1990 to open."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Single shelf row with horizontal swipe carousel on iPhone.
- **Tablet (768px – 1024px)**: Multi-tier library bookcase in RealityKit on iPad with full perspective orbit.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/spaces/:spaceId/books`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { books: Array<Book> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `book-service / Local RealityKit USDZ Assets`
- **Database Tables**: `books`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: _None_
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: No
- **Privacy Architecture**: Book metadata and spine titles rendered locally.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] initializes RealityKit scene with correct book entities
  - [ ] handles fallback to 2D grid when RealityView unavailable
- **Integration Tests**:
  - [ ] GET /api/spaces/:spaceId/books returns list of space books
- **End-to-End Acceptance Tests**:
  - [ ] taps 3D book model on shelf, verifies selection banner updates, taps Open Volume

#### 17. UI Component Inventory
`RealityView`, `BookshelfSceneEntity`, `BookModel3D`, `BookDetailBanner`, `Button`

---

### IOS-44 — Book Detail Sheet & Specifications Inspector

**Category**: Native iOS — Books & RealityKit 3D  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Inspect book specifications (page count, format, cover finish, frozen print status) and launch reader or ordering.
- **User Story**: "As an archivist, I want to inspect our 8x10 Hardcover volume to see its page count, chapters, and print readiness."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-43 3D Bookshelf`, `memoria://books/:bookId`
- **Exit Routes**: `IOS-49 3D Book Reader`, `IOS-50 2D Spread Previewer`, `IOS-51 Print Preflight`, `IOS-52 Apple Pay Checkout`
- **Back Navigation**: `Dismiss sheet`
- **Deep Link**: `memoria://books/:bookId`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member, Space Contributor, Space Admin
- **Required Capabilities**: `view_book_detail`, `order_book`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Sheet navigation bar with book title, Close 'X' button, and Edit button (if admin).
- **Main Content**: 1. 3D Book preview thumbnail with cloth texture, 2. Book metadata (Title, Subtitle, Space name, Volume number, Page count, Last updated), 3. Physical specification pills (Format: 8x10 Hardcover, Paper: 148gsm Archival Matte, Foil: Gold Leaf), 4. Chapter breakdown list.
- **Footer / Actions Bar**: Action bar: 'Read 3D Book' (Secondary) and 'Order Heirloom Print' (Primary CTA).

#### 5. Interactive Controls & UI Elements
- Read 3D Book button (opens IOS-49)
- View 2D Spreads button (opens IOS-50)
- Order Heirloom Print button (opens IOS-51/52)
- Edit Book button in toolbar
- Chapter row tap (jumps to spread in reader)
- Close button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Read 3D Book button`
- **Tab Sequence**: `Close button` -> `Edit button` -> `Read 3D button` -> `Order button` -> `Chapter rows`
- **Escape Key Action**: Dismisses sheet

#### 8. States Matrix
- **Loading State**: Metadata cards skeleton pulse.
- **Empty State**: Notice: 'This book has no chapters or pages yet.'
- **Populated State**: Complete book specifications, chapter index, and print status indicators.
- **Error State**: Error banner with retry.
- **Offline Mode**: Cached book specs rendered from local SQLite.
- **Permission Denied**: 403 Forbidden alert.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA / VoiceOver accessible
- **Screen Reader Summary**: "Book details for Vance Family Chronicle. 64 pages. 8 by 10 hardcover. Double tap Read 3D Book to open reader."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Medium-to-large detent presentation sheet on iPhone.
- **Tablet (768px – 1024px)**: Side inspector panel alongside 3D shelf on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/books/:bookId`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { book: Book, spreadsCount: number, chapters: Array<Chapter> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`, `404 Not Found`

#### 13. Service Architecture & Persistence
- **Backend Service**: `book-service / Local SQLite`
- **Database Tables**: `books`, `book_spreads`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: _None_
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: No
- **Privacy Architecture**: Book specifications contain public volume metadata.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] computes total page count accurately from spreads
  - [ ] formats physical specs description
- **Integration Tests**:
  - [ ] GET /api/books/:bookId returns book structure and chapters
- **End-to-End Acceptance Tests**:
  - [ ] taps book on shelf, verifies detail sheet displays 64 pages, taps Read 3D Book

#### 17. UI Component Inventory
`BookPreviewCard`, `SpecPillGroup`, `ChapterList`, `PrimaryActionButton`, `Button`

---

### IOS-45 — Mobile Book Creator Wizard & Curated Assembler

**Category**: Native iOS — Books & RealityKit 3D  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Assemble a new heirloom memory volume step-by-step from selected dates, tags, people, or collections.
- **User Story**: "As an archivist, I want a 3-step wizard on iOS to compile all 2024 memories into an annual family yearbook."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-43 Bookshelf`, `IOS-31 Favorites`, `IOS-33 Collection Detail`
- **Exit Routes**: `IOS-46 Memory Selection Tray`, `IOS-48 Cover & Foil Sheet`, `IOS-43 Bookshelf`
- **Back Navigation**: `Cancel / Previous Step`
- **Deep Link**: `memoria://books/create`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Admin, Space Member
- **Required Capabilities**: `create_book`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Wizard navigation bar: Step indicator (1 of 3: Details; 2 of 3: Memories; 3 of 3: Cover & Theme), Cancel button.
- **Main Content**: Step 1: Book Title TextField, Subtitle TextField, Curation Strategy picker (Date Range, Entire Space, Specific Collection, Starred Favorites), Format selector (Standard 8x10 Hardcover, Compact 6x8, Deluxe Leather 10x12).
- **Footer / Actions Bar**: Bottom navigation: 'Next: Select Memories' primary button.

#### 5. Interactive Controls & UI Elements
- Title TextField with Cormorant Garamond font preview
- Subtitle TextField
- Curation strategy picker (segmented control / cards)
- Book format cards (Standard Hardcover, Compact, Deluxe Leather)
- Next Step button
- Cancel wizard button

#### 6. Form Validation & Data Schema

| Field Name | Data Type | Required | Limits & Constraints | Validation Rule | Error Copy |
|---|---|---|---|---|---|
| `title` | `text` | **Yes** | 1-100 characters | Standard type validation | Please enter a book title. |
| `format` | `select` | **Yes** | N/A | Standard type validation | Please select a physical book format. |

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Title field`
- **Tab Sequence**: `Cancel` -> `Title` -> `Subtitle` -> `Strategy` -> `Format` -> `Next Button`
- **Escape Key Action**: Prompts to discard book draft

#### 8. States Matrix
- **Loading State**: Generating draft layout spinner.
- **Empty State**: Clean wizard fields with placeholder examples.
- **Populated State**: Valid titles and selected curation strategy with memory estimate badge ('~45 memories found').
- **Error State**: Inline red validation callout under affected fields.
- **Offline Mode**: Draft book creation saved locally in SQLite.
- **Permission Denied**: Alert: 'You do not have permission to create books in this space.'

#### 9. Confirmation & Cancellation Workflows
Tapping Cancel prompts: 'Discard book creation? Your draft settings will not be saved.'

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA / VoiceOver accessible
- **Screen Reader Summary**: "Book creator wizard. Step 1 of 3. Enter volume title and format. Double tap Next to proceed."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Modal wizard sheet with keyboard avoidance on iPhone.
- **Tablet (768px – 1024px)**: Centered modal wizard container on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/spaces/:spaceId/books`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ title: string, subtitle?: string, format: string, curationStrategy: string }`
- **Response Payload**: `{ success: true, data: { book: Book } }`
- **Status Codes**: `201 Created`, `400 Bad Request`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `book-service / Local SQLite`
- **Database Tables**: `books`, `outbox_events`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `book.created`
- **BullMQ Background Jobs**: `generate-auto-book-layout`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Medium`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Draft book stored locally before final publication.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] validates title length and format options
  - [ ] advances wizard steps sequentially
- **Integration Tests**:
  - [ ] POST /api/spaces/:spaceId/books creates book record with draft status
- **End-to-End Acceptance Tests**:
  - [ ] completes step 1, verifies transition to Step 2 Memory Selection Tray

#### 17. UI Component Inventory
`WizardStepBar`, `TextField`, `FormatSelectionCard`, `SegmentedPicker`, `Button`

---

### IOS-46 — Memory Selection & Inclusion Tray

**Category**: Native iOS — Books & RealityKit 3D  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Select, filter, and organize the exact photos, voice notes, and stories to include in a book volume.
- **User Story**: "As an archivist, I want to scroll through our photos and tap checkmarks to include 40 specific pictures in the new book."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-45 Book Creator Wizard (Step 2)`, `IOS-44 Book Detail (Add Memories)`
- **Exit Routes**: `IOS-47 Spread Reordering`, `IOS-45 Step 1`
- **Back Navigation**: `IOS-45 Step 1`
- **Deep Link**: `memoria://books/:bookId/select-memories`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Admin, Space Member
- **Required Capabilities**: `edit_book`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Navigation bar with 'Select Memories', selected counter badge ('38 selected'), and 'Select All' button.
- **Main Content**: 3-column photo grid with round selection checkmarks: filter chips on top (All, Photos, Stories, Starred, People).
- **Footer / Actions Bar**: Bottom floating bar: Selected memories preview tray and 'Next: Arrange Spreads' primary CTA.

#### 5. Interactive Controls & UI Elements
- Memory cell tap (toggles selection checkmark with haptic feedback)
- Select All / Deselect All button in toolbar
- Filter chip bar (All, Favorites, People, Media Type)
- Bottom tray horizontal thumbnail strip of selected items
- 'Next: Arrange Spreads' CTA button
- Back button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First memory cell`
- **Tab Sequence**: `Filter chips` -> `Select All` -> `Memory cells` -> `Next Button`
- **Escape Key Action**: Clears selection or goes back

#### 8. States Matrix
- **Loading State**: 3-column grid skeleton pulse.
- **Empty State**: Notice: 'No memories match current filter.'
- **Populated State**: Grid of photos and stories with prominent blue checkmarks on selected items.
- **Error State**: Error banner with refresh.
- **Offline Mode**: Selects from cached SQLite memories.
- **Permission Denied**: 403 Forbidden alert.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA / VoiceOver accessible
- **Screen Reader Summary**: "Memory selection tray. 38 items selected. Double tap to toggle item selection."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: 3-column grid on iPhone with collapsible bottom tray.
- **Tablet (768px – 1024px)**: 4-column grid with persistent right-side selection tray on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `PUT` `/api/books/:bookId/memories`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ memoryIds: Array<string> }`
- **Response Payload**: `{ success: true, data: { book: Book, selectedCount: number } }`
- **Status Codes**: `200 OK`, `400 Bad Request`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `book-service / Local SQLite`
- **Database Tables**: `books`, `memories`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: _None_
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: No
- **Privacy Architecture**: Selected memories mapped strictly within space.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] toggles memory selection in state array
  - [ ] calculates estimated book spread count
- **Integration Tests**:
  - [ ] PUT /api/books/:bookId/memories saves selected memory list
- **End-to-End Acceptance Tests**:
  - [ ] selects 10 photos, verifies counter updates to 10, taps Next

#### 17. UI Component Inventory
`SelectableMediaGrid`, `CheckmarkOverlay`, `SelectionTrayStrip`, `FilterChipBar`, `Button`

---

### IOS-47 — Drag-and-Drop Chapter & Spread Reordering Studio

**Category**: Native iOS — Books & RealityKit 3D  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Visually reorder chapters, individual pages, and photo spreads using native iOS drag-and-drop gestures.
- **User Story**: "As an archivist, I want to long-press and drag our wedding spread before the honeymoon chapter so the book flows chronologically."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-46 Memory Selection`, `IOS-44 Book Detail`
- **Exit Routes**: `IOS-48 Cover & Foil Sheet`, `IOS-50 2D Spread Previewer`
- **Back Navigation**: `IOS-46`
- **Deep Link**: `memoria://books/:bookId/arrange`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Admin, Space Member
- **Required Capabilities**: `edit_book`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Navigation bar with 'Arrange Spreads', 'Auto-Chronological' sort button, and 'Next' button.
- **Main Content**: 2-column spread thumbnail grid (Left Page + Right Page miniature card) with page numbers, chapter divider headers, and drag handles.
- **Footer / Actions Bar**: Page count warning banner (e.g., 'Total: 48 pages • Multiples of 4 required for print binding').

#### 5. Interactive Controls & UI Elements
- Long-press and drag gesture to reorder spreads (SwiftUI .onDrag / .onDrop)
- Auto-Chronological sort button in toolbar
- Add Blank Spread / Title Page button
- Delete spread button on miniature card
- Chapter divider tap (renames chapter)
- Next: Cover & Foil button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First spread thumbnail`
- **Tab Sequence**: `Auto sort` -> `Spread thumbnails` -> `Add Page` -> `Next Button`
- **Escape Key Action**: Cancels active drag operation

#### 8. States Matrix
- **Loading State**: Miniature spread thumbnails loading shimmer.
- **Empty State**: Notice: 'No spreads in book yet.'
- **Populated State**: Visual grid of 2-page spreads with realistic paper textures and page numbers.
- **Error State**: Error banner with retry.
- **Offline Mode**: Reorders locally in SQLite state store.
- **Permission Denied**: 403 Forbidden alert.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA / VoiceOver accessible
- **Screen Reader Summary**: "Spread reordering studio. Spread 12: Pages 24 and 25. Double tap and hold to drag or use actions rotor to move up or down."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Single column of 2-page spread pairs on iPhone.
- **Tablet (768px – 1024px)**: Multi-column spread board with chapter outline drawer on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `PUT` `/api/books/:bookId/spreads/reorder`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ orderedSpreadIds: Array<string> }`
- **Response Payload**: `{ success: true, data: { spreadsCount: number } }`
- **Status Codes**: `200 OK`, `400 Bad Request`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `book-service / Local SQLite`
- **Database Tables**: `books`, `book_spreads`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: _None_
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: No
- **Privacy Architecture**: Spread order layout stored locally.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] handles drag-and-drop array reordering correctly
  - [ ] validates page count divisible by 4 for print
- **Integration Tests**:
  - [ ] PUT /api/books/:bookId/spreads/reorder updates spread_index values
- **End-to-End Acceptance Tests**:
  - [ ] drags spread 3 to position 1, verifies new order persists and page numbers recalculate

#### 17. UI Component Inventory
`SpreadReorderGrid`, `SpreadMiniatureCard`, `ChapterDividerView`, `Button`

---

### IOS-48 — Cover Style, Fabric & Metallic Foil Studio

**Category**: Native iOS — Books & RealityKit 3D  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Customize physical cover fabric (Linen, Buckram, Leather), foil stamping color (Gold, Silver, Rose, Copper), and cover typography.
- **User Story**: "As an archivist, I want to choose Deep Forest Green cloth with embossed Gold Foil lettering for our heirloom family bible volume."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-47 Spread Studio`, `IOS-44 Book Detail`
- **Exit Routes**: `IOS-49 Immersive 3D Reader`, `IOS-43 Bookshelf`
- **Back Navigation**: `IOS-47`
- **Deep Link**: `memoria://books/:bookId/cover-style`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Admin, Space Member
- **Required Capabilities**: `edit_book`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Navigation bar with 'Cover & Foil Studio' and 'Finish Volume' button.
- **Main Content**: 1. Interactive 3D cover model preview reacting to device gyroscope (tilts to show metallic foil specular reflection via Metal shader), 2. Cloth material swatch picker, 3. Foil color swatch picker, 4. Cover typography style selector (Serif, Sans, Classic Archival).
- **Footer / Actions Bar**: Primary CTA button: 'Save & View in 3D Reader'.

#### 5. Interactive Controls & UI Elements
- Interactive 3D cover preview (drag to rotate, gyroscope shimmer)
- Cloth material swatches (Deep Ink #20242C, Heritage Plum #76556F, Forest Sage #849483, Warm Ochre #D8973C, Crimson Leather)
- Metallic foil swatches (Gold Leaf, Platinum Silver, Rose Gold, Blind Deboss)
- Typography selector menu (Cormorant Garamond, Inter, Bodoni)
- Embossed Title TextField
- Finish Volume button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Title TextField`
- **Tab Sequence**: `Title` -> `Cloth swatches` -> `Foil swatches` -> `Typography menu` -> `Finish Button`
- **Escape Key Action**: Pops back to IOS-47

#### 8. States Matrix
- **Loading State**: Generating Metal material shader spinner.
- **Empty State**: N/A
- **Populated State**: Photorealistic 3D cover reacting to ambient gyroscope motion with dynamic foil gleam.
- **Error State**: Error banner with retry.
- **Offline Mode**: Renders Metal shader locally on GPU.
- **Permission Denied**: 403 Forbidden alert.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA / VoiceOver accessible
- **Screen Reader Summary**: "Cover styling studio. Deep Forest Sage cloth with Gold Leaf foil selected. Double tap swatches to change."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Top half 3D cover canvas, bottom half scrollable swatch controls on iPhone.
- **Tablet (768px – 1024px)**: Side-by-side 3D book cover and material inspector on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `PATCH` `/api/books/:bookId/cover`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ coverColor: string, materialType: string, foilColor: string, typographyStyle: string }`
- **Response Payload**: `{ success: true, data: { book: Book } }`
- **Status Codes**: `200 OK`, `400 Bad Request`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `book-service / Local SQLite`
- **Database Tables**: `books`, `outbox_events`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `book.cover_updated`
- **BullMQ Background Jobs**: `generate-book-3d-model`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: No
- **Privacy Architecture**: Cover style preferences stored in book record.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] updates cover color hex and foil type in state
  - [ ] binds gyroscope tilt to Metal shader uniform
- **Integration Tests**:
  - [ ] PATCH /api/books/:bookId/cover persists cover styling
- **End-to-End Acceptance Tests**:
  - [ ] selects Heritage Plum and Gold Foil, tilts phone, verifies foil shimmers, taps Finish

#### 17. UI Component Inventory
`Cover3DPreviewCanvas`, `MaterialSwatchPicker`, `FoilSwatchPicker`, `TypographySelector`, `Button`

---

### IOS-49 — Immersive RealityKit 3D Book Reader & Physics Page Turn

**Category**: Native iOS — Books & RealityKit 3D  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Read a published memory book with lifelike 3D cloth binding, page curl physics, and spatial audio paper sounds using RealityKit.
- **User Story**: "As a reader, I want to swipe my finger across the screen to turn the physical-feeling paper pages and hear the gentle paper rustle sound."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-43 3D Bookshelf`, `IOS-44 Book Detail Sheet`
- **Exit Routes**: `IOS-43 3D Bookshelf`, `IOS-50 2D Spread Previewer`, `IOS-42 Memory Comments`
- **Back Navigation**: `IOS-43`
- **Deep Link**: `memoria://books/:bookId/read`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member, Space Contributor, Space Admin
- **Required Capabilities**: `read_book`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Floating semi-transparent navigation bar (fades out during reading): Back to Shelf button, Book Title, Page Scrubber slider ('Page 24 of 64'), Table of Contents button.
- **Main Content**: Full screen RealityView: Dynamic 3D Book entity with realistic paper shader, curled page geometry responding to drag gesture in real time, cast shadows, and cloth spine.
- **Footer / Actions Bar**: Bottom floating reading bar: Audio memory play icon (if voice note attached to spread), Bookmark button, 2D view toggle.

#### 5. Interactive Controls & UI Elements
- Horizontal drag gesture on page edge (curls page dynamically with RealityKit vertex deformation)
- Single tap on page edge (triggers animated smooth page turn)
- RealityKit SpatialAudio (plays subtle binaural paper rustle audio sample upon page turn)
- Page scrubber slider in top toolbar
- Table of Contents drawer button
- Floating Audio Play button (plays attached memory voice note)
- Back button (closes reader)

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Page Canvas`
- **Tab Sequence**: `Back button` -> `Table of contents` -> `Page Scrubber` -> `Page Canvas` -> `Audio button`
- **Escape Key Action**: Closes 3D reader

#### 8. States Matrix
- **Loading State**: Opening book animation with ivory page skeleton pulse.
- **Empty State**: Notice: 'Book has no pages.'
- **Populated State**: Full 60/120fps RealityKit interactive 3D book with high-res page spreads, soft lighting, and dynamic shadows.
- **Error State**: Falls back to IOS-50 2D Spread Previewer if RealityKit pipeline encounters GPU memory pressure.
- **Offline Mode**: All page spreads and 3D textures cached in local storage.
- **Permission Denied**: 403 Forbidden alert.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA / VoiceOver accessible
- **Screen Reader Summary**: "3D Book Reader. Pages 24 and 25 of 64. Left page: Summer Picnic 1984. Right page: Photo of Grandma smiling by the lake. Swipe left to turn page."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Single page view in portrait, full two-page open spread in landscape on iPhone.
- **Tablet (768px – 1024px)**: Two-page spread open with natural desk shadow on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/books/:bookId/spreads`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { spreads: Array<BookSpread> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`, `404 Not Found`

#### 13. Service Architecture & Persistence
- **Backend Service**: `book-service / Local RealityKit Assets`
- **Database Tables**: `books`, `book_spreads`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `book.read`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: No
- **Privacy Architecture**: Page contents kept strictly within space tenancy.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] deforms page mesh vertices according to drag gesture percent
  - [ ] plays spatial audio sound effect on page turn completion
- **Integration Tests**:
  - [ ] GET /api/books/:bookId/spreads returns all pages with layout nodes
- **End-to-End Acceptance Tests**:
  - [ ] swipes left to turn page, verifies page curl animation executes smoothly and page index advances to 2

#### 17. UI Component Inventory
`RealityView`, `PageCurlEntity`, `SpatialAudioPlayer`, `PageScrubberBar`, `Button`

---

### IOS-50 — 2D Flat Spread Previewer & Accessible Reader

**Category**: Native iOS — Books & RealityKit 3D  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Read book spreads in a clean, accessible 2D layout with zoomable high-resolution imagery and selectable text.
- **User Story**: "As a reader with visual impairments or on low-battery mode, I want a flat 2D spread viewer where I can zoom in on captions and photos."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-49 3D Reader`, `IOS-44 Book Detail`
- **Exit Routes**: `IOS-49 3D Reader`, `IOS-44 Book Detail`
- **Back Navigation**: `IOS-44`
- **Deep Link**: `memoria://books/:bookId/spreads/:spreadIndex`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Member, Space Contributor, Space Admin
- **Required Capabilities**: `read_book`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Navigation bar with '2D Spread Viewer', Spread index ('Spread 12 of 32'), and 'Switch to 3D' button.
- **Main Content**: Horizontal paging ScrollView / TabView: High-resolution left and right pages with double-tap zoom (UIScrollView pinch-to-zoom), rendered typography, and tap-to-inspect photos.
- **Footer / Actions Bar**: Bottom thumbnail filmstrip for rapid page scrubbing.

#### 5. Interactive Controls & UI Elements
- Horizontal paging swipe gesture
- Pinch-to-zoom gesture on pages (up to 4x magnification)
- Double-tap to reset zoom
- Switch to 3D Reader button in toolbar
- Bottom thumbnail filmstrip scrubbing
- Audio note play button on spreads with recordings

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Active spread canvas`
- **Tab Sequence**: `Toolbar` -> `Active spread` -> `Switch to 3D` -> `Scrubbing filmstrip`
- **Escape Key Action**: Exits reader

#### 8. States Matrix
- **Loading State**: Spread placeholder skeleton.
- **Empty State**: Notice: 'No spreads available.'
- **Populated State**: High-resolution flat page layout with crisp vector Cormorant Garamond typography.
- **Error State**: Error banner with retry.
- **Offline Mode**: Served from local SQLite and image cache.
- **Permission Denied**: 403 Forbidden alert.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AAA / Dynamic Type & VoiceOver
- **Screen Reader Summary**: "2D spread view. Spread 12. Left page: Grandpa's Workshop. Right page: Family photo. Double tap to inspect."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1 (Deep Ink on Warm Ivory)`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Single page paging in portrait; side-by-side spread in landscape on iPhone.
- **Tablet (768px – 1024px)**: Side-by-side spread with thumbnail filmstrip on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/books/:bookId/spreads`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { spreads: Array<BookSpread> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `book-service / Local SQLite`
- **Database Tables**: `books`, `book_spreads`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: _None_
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: No
- **Privacy Architecture**: Local rendering of archival memory spreads.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] handles pinch-to-zoom scales up to 4x
  - [ ] updates spread index upon horizontal page scroll
- **Integration Tests**:
  - [ ] GET /api/books/:bookId/spreads returns spread data correctly
- **End-to-End Acceptance Tests**:
  - [ ] swipes through 2D spreads, double-taps to zoom in on image

#### 17. UI Component Inventory
`PagingSpreadScrollView`, `ZoomablePageView`, `ThumbnailFilmstripBar`, `Button`

---

### IOS-51 — Print Preflight & Archival Quality Inspection Sheet

**Category**: Native iOS — Books & RealityKit 3D  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Validate that all images meet 300 DPI print standards, verify bleed margins, check page counts, and inspect print readiness before checkout.
- **User Story**: "As an archivist, I want the preflight tool to warn me if an old scanned photo is too low resolution so that my printed book looks sharp."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-44 Book Detail`, `IOS-50 Spread Previewer`
- **Exit Routes**: `IOS-52 Apple Pay Checkout`, `IOS-47 Spread Studio (to fix issues)`
- **Back Navigation**: `IOS-44`
- **Deep Link**: `memoria://books/:bookId/preflight`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Admin, Space Member
- **Required Capabilities**: `preflight_book`, `order_book`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Sheet navigation bar: 'Print Preflight Inspection' with Close button.
- **Main Content**: 1. Overall Readiness Badge ('Ready for Heirloom Printing' or '2 Warnings Found'), 2. Automated audit checklist (Page count is multiple of 4: PASS; All photos >= 300 DPI: 1 WARNING; Bleed & safety margins: PASS; CMYK color profile conversion: PASS), 3. Interactive warning locator list (tapping warning shows affected page thumbnail).
- **Footer / Actions Bar**: Primary CTA button: 'Proceed to Checkout' (or 'Fix Warnings').

#### 5. Interactive Controls & UI Elements
- Preflight check rows tap (expands technical details: actual DPI vs required DPI)
- Jump to Page button on warning row (opens spread in editor)
- Proceed to Checkout button (enabled if 0 blocking errors)
- Ignore Non-Blocking Warnings checkbox
- Close sheet button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Proceed to Checkout button`
- **Tab Sequence**: `Close button` -> `Checklist rows` -> `Ignore checkbox` -> `Proceed button`
- **Escape Key Action**: Dismisses sheet

#### 8. States Matrix
- **Loading State**: Scanning image resolutions and margin bounds spinner.
- **Empty State**: N/A
- **Populated State**: Complete technical report with green checkmarks and amber warning callouts.
- **Error State**: Alert: 'Preflight analysis failed.' with retry.
- **Offline Mode**: Executes preflight validation locally using CoreGraphics image inspection.
- **Permission Denied**: 403 Forbidden alert.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA / VoiceOver accessible
- **Screen Reader Summary**: "Print preflight report. Status: Ready with 1 warning. Page 14 has photo below 300 DPI. Double tap to inspect."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Modal inspection sheet on iPhone.
- **Tablet (768px – 1024px)**: Centered inspection card on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/books/:bookId/preflight`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { isReady: boolean, checks: Array<{ name: string, status: 'pass' | 'warn' | 'fail', details: string, pageNumber?: number }> } }`
- **Status Codes**: `200 OK`, `400 Bad Request`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `book-service / Local CoreGraphics`
- **Database Tables**: `books`, `book_spreads`, `media_assets`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `book.preflight_executed`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: No
- **Privacy Architecture**: Preflight evaluates image pixel dimensions and bounding boxes.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] flags photos below 300 DPI as warnings
  - [ ] verifies spread count conforms to print signature rules
- **Integration Tests**:
  - [ ] POST /api/books/:bookId/preflight returns structured checklist array
- **End-to-End Acceptance Tests**:
  - [ ] runs preflight on book, inspects warning on page 14, proceeds to checkout

#### 17. UI Component Inventory
`PreflightChecklistView`, `ChecklistStatusRow`, `WarningDetailCallout`, `Button`

---

### 2.7 Native iOS Commerce & Account (IOS-52 to IOS-56)

### IOS-52 — Apple Pay & Physical Print Checkout Sheet

**Category**: Native iOS — Commerce & Account  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Order a physical heirloom memory book with one-tap native Apple Pay, shipping address validation, and quantity selection.
- **User Story**: "As a customer, I want to tap Apple Pay on my iPhone to buy 3 copies of our family book for Christmas gifts with biometric Touch/Face ID."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-51 Print Preflight`, `IOS-44 Book Detail Sheet`
- **Exit Routes**: `IOS-53 Order Status & Tracking`, `IOS-44 Book Detail`
- **Back Navigation**: `Cancel sheet dismiss`
- **Deep Link**: `memoria://books/:bookId/checkout`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Admin, Space Member
- **Required Capabilities**: `order_book`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Sheet navigation bar: 'Order Heirloom Print' with Cancel button.
- **Main Content**: 1. Book summary card (Thumbnail, title, format, page count), 2. Quantity stepper (1 to 20 copies), 3. Shipping method selector (Standard 5-7 days, Express 2-3 days, Archival Presentation Box included), 4. Price breakdown (Book copies, Shipping, Sales Tax, Total).
- **Footer / Actions Bar**: Primary CTA: Native Apple Pay button (PKPaymentButton) and fallback credit card option.

#### 5. Interactive Controls & UI Elements
- Quantity Stepper (+ / - buttons)
- Shipping address picker (or fetched via PKPaymentRequest)
- Shipping speed segmented picker (Standard vs Express)
- Native Apple Pay PKPaymentButton (Black, .buy style)
- Fallback manual card entry button
- Cancel button

#### 6. Form Validation & Data Schema

| Field Name | Data Type | Required | Limits & Constraints | Validation Rule | Error Copy |
|---|---|---|---|---|---|
| `quantity` | `number` | **Yes** | 1-20 copies | Standard type validation | Please select between 1 and 20 copies. |
| `shippingAddress` | `text` | **Yes** | N/A | Standard type validation | Please provide a valid shipping address. |

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Quantity Stepper`
- **Tab Sequence**: `Quantity` -> `Shipping method` -> `Apple Pay button` -> `Cancel`
- **Escape Key Action**: Dismisses checkout sheet

#### 8. States Matrix
- **Loading State**: PKPaymentAuthorizationController biometric processing overlay.
- **Empty State**: N/A
- **Populated State**: Calculated itemized pricing breakdown with tax and shipping.
- **Error State**: Alert: 'Payment authorization failed. Please try again or use another payment method.'
- **Offline Mode**: Alert: 'Internet connection required to place physical print orders.'
- **Permission Denied**: Alert: 'You do not have permission to place print orders for this space.'

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA / VoiceOver accessible
- **Screen Reader Summary**: "Checkout sheet. 1 copy of Vance Family Chronicle. Total $84.00. Double tap Apple Pay to complete order."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Modal checkout sheet with native PKPaymentButton on iPhone.
- **Tablet (768px – 1024px)**: Centered modal checkout container on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/orders/checkout`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ bookId: string, quantity: number, shippingMethod: string, applePayToken?: string, shippingAddress: ShippingAddress }`
- **Response Payload**: `{ success: true, data: { orderId: string, status: string, totalCents: number } }`
- **Status Codes**: `201 Created`, `400 Bad Request`, `401 Unauthorized`, `402 Payment Required`

#### 13. Service Architecture & Persistence
- **Backend Service**: `commerce-service / Local SQLite`
- **Database Tables**: `print_orders`, `outbox_events`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `order.placed`
- **BullMQ Background Jobs**: `generate-print-cmyk-pdf`, `notify-fulfillment-partner`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Payment tokens processed through secure PassKit framework; zero raw credit card numbers stored.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] builds PKPaymentRequest with correct line items and merchant ID
  - [ ] computes total cents with tax and shipping
- **Integration Tests**:
  - [ ] POST /api/orders/checkout writes print_orders record and publishes order.placed outbox event
- **End-to-End Acceptance Tests**:
  - [ ] selects 2 copies, authorizes Apple Pay simulator sheet, verifies navigation to Order Status screen

#### 17. UI Component Inventory
`PKPaymentButton`, `QuantityStepper`, `PriceBreakdownCard`, `ShippingMethodPicker`, `Button`

---

### IOS-53 — Order Status, Binding & Shipping Tracking Timeline

**Category**: Native iOS — Commerce & Account  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Track physical book production status (Preflight Approved, Printing, Hand Binding, Shipped, Delivered) in real time.
- **User Story**: "As an excited customer, I want to check my order status and view the courier tracking link so I know when our family book arrives."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-52 Apple Pay Checkout`, `IOS-54 User Account Orders`, `memoria://orders/:orderId`
- **Exit Routes**: `IOS-11 Home Feed`, `External Courier Tracking URL`, `IOS-56 Support Sheet`
- **Back Navigation**: `IOS-11`
- **Deep Link**: `memoria://orders/:orderId`

#### 3. Personas & Authorization
- **Eligible Roles**: Order Placer, Space Admin
- **Required Capabilities**: `view_order_status`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Navigation bar with 'Order Details', Order number ('#MEM-8921'), and Share Receipt button.
- **Main Content**: 1. Animated status illustration with status badge ('In Hand Binding'), 2. Production step progress timeline (Order Placed -> Digital Preflight -> Printing -> Hand Binding -> Shipped -> Delivered) with completion dates, 3. Shipping courier tracking card with tracking number and 'Track Package' button, 4. Order summary & shipping address card.
- **Footer / Actions Bar**: Support CTA: 'Questions about your order? Contact Archival Support'.

#### 5. Interactive Controls & UI Elements
- Share Receipt button in toolbar
- 'Track Package' courier button (opens Safari with carrier URL)
- Contact Support button (opens IOS-56 with pre-filled order ID)
- Download PDF Proof button
- Done / Back to Home button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Done button`
- **Tab Sequence**: `Share button` -> `Track Package button` -> `Contact Support` -> `Done button`
- **Escape Key Action**: Pops back to home feed

#### 8. States Matrix
- **Loading State**: Order tracking skeleton pulse.
- **Empty State**: Notice: 'Order details not found.'
- **Populated State**: Real-time production step tracker with active pulse on current stage.
- **Error State**: Error banner with refresh action.
- **Offline Mode**: Cached order status displayed from SQLite.
- **Permission Denied**: 403 Forbidden alert.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA / VoiceOver accessible
- **Screen Reader Summary**: "Order status for order MEM-8921. Current stage: Hand Binding. Estimated delivery December 22. Double tap to track package."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Vertical timeline scroll view on iPhone.
- **Tablet (768px – 1024px)**: Two-column order summary and timeline layout on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/orders/:orderId`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { order: Order, trackingUrl?: string, stages: Array<{ name: string, completed: boolean, date?: string }> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`, `404 Not Found`

#### 13. Service Architecture & Persistence
- **Backend Service**: `commerce-service / Local SQLite`
- **Database Tables**: `print_orders`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: _None_
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: No
- **Privacy Architecture**: Shipping address and tracking details restricted strictly to order creator.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] maps order status enum to progress timeline step index
  - [ ] formats tracking carrier URL
- **Integration Tests**:
  - [ ] GET /api/orders/:orderId returns order details and stages
- **End-to-End Acceptance Tests**:
  - [ ] opens order status view, verifies 'Hand Binding' active, taps Track Package

#### 17. UI Component Inventory
`OrderTimelineView`, `StatusIllustrationCard`, `CarrierTrackingBox`, `Button`

---

### IOS-54 — User Profile, Biometric Security & Preferences

**Category**: Native iOS — Commerce & Account  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Manage account details, Face ID / Touch ID biometric locks, notification preferences, and active spaces.
- **User Story**: "As an iOS user, I want to enable Face ID app lock so that my private family journals remain secure even if someone borrows my unlocked phone."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-11 TabBar (Account Tab)`, `IOS-13 Space Overview`
- **Exit Routes**: `IOS-55 Storage & Export`, `IOS-56 Help & Support`, `IOS-02 Sign-Out`
- **Back Navigation**: `IOS-11`
- **Deep Link**: `memoria://account`

#### 3. Personas & Authorization
- **Eligible Roles**: Authenticated Member
- **Required Capabilities**: `manage_account`, `configure_security`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Navigation bar with 'Account & Preferences' and Edit Profile button.
- **Main Content**: 1. User profile card (Avatar, full name, verified email, member since date), 2. Security Section (Face ID / Biometric Lock toggle, Change Password, Active Devices & Sessions), 3. Notification Preferences (Daily memory prompt, Family activity, Order updates), 4. App Preferences (Appearance: Light Archival Theme, Haptic Feedback toggle, Auto-play audio toggle), 5. Data & Storage link.
- **Footer / Actions Bar**: Destructive Sign Out and Delete Account buttons.

#### 5. Interactive Controls & UI Elements
- Avatar photo change button
- Face ID / Biometrics toggle switch (LocalAuthentication context)
- Push Notifications toggle switches
- Haptic Feedback toggle switch
- Active Sessions row (tap to view logged-in devices)
- Storage & Export row (navigates to IOS-55)
- Sign Out button
- Delete Account button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First preference toggle`
- **Tab Sequence**: `Profile card` -> `Face ID toggle` -> `Notifications` -> `Storage` -> `Sign Out`
- **Escape Key Action**: None

#### 8. States Matrix
- **Loading State**: Preferences skeleton pulse.
- **Empty State**: N/A
- **Populated State**: Account preferences loaded with active toggle states.
- **Error State**: Error banner with retry.
- **Offline Mode**: Security toggles (Face ID) configurable offline in local Keychain.
- **Permission Denied**: 403 Forbidden alert.

#### 9. Confirmation & Cancellation Workflows
Sign Out prompts: 'Sign out of Memoria? Your local cache will be preserved.' Delete Account prompts double confirmation modal.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA / VoiceOver accessible
- **Screen Reader Summary**: "Account preferences. Profile: Jane Vance. Face ID lock is enabled. Double tap to toggle settings."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Native inset grouped list on iPhone.
- **Tablet (768px – 1024px)**: Split view settings layout on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `PATCH` `/api/users/me/preferences`
- **Authorization**: `Bearer JWT`
- **Request Payload**: `{ notificationsEnabled?: boolean, biometricLockEnabled?: boolean, hapticsEnabled?: boolean }`
- **Response Payload**: `{ success: true, data: { user: UserProfile } }`
- **Status Codes**: `200 OK`, `400 Bad Request`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `identity-service / Local iOS Keychain`
- **Database Tables**: `users`, `user_sessions`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `user.preferences_updated`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Biometric preference stored locally; password changes revoke active refresh tokens.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] triggers LAContext evaluatePolicy for biometric enrollment
  - [ ] persists haptic settings to UserDefaults
- **Integration Tests**:
  - [ ] PATCH /api/users/me/preferences updates user record in database
- **End-to-End Acceptance Tests**:
  - [ ] toggles Face ID lock, locks app, verifies Face ID prompt appears on re-entry

#### 17. UI Component Inventory
`AccountProfileCard`, `Toggle`, `ListRowNavigation`, `DestructiveButton`, `Button`

---

### IOS-55 — Storage Quota Meter, Offline Cache & Data Export Console

**Category**: Native iOS — Commerce & Account  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Inspect space storage utilization against 500MB free quota, clear local thumbnail caches, or download full archival backup.
- **User Story**: "As an archivist, I want to see how much of our 500MB storage quota is used and export our full family archive to my local Mac."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-54 Account Preferences`, `IOS-13 Space Overview`
- **Exit Routes**: `IOS-54 Account Preferences`, `System Share Sheet (Export Archive)`
- **Back Navigation**: `IOS-54`
- **Deep Link**: `memoria://storage`

#### 3. Personas & Authorization
- **Eligible Roles**: Space Admin, Space Member
- **Required Capabilities**: `view_storage`, `export_data`, `clear_cache`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Navigation bar with 'Storage & Data Sovereignty'.
- **Main Content**: 1. Circular / Bar storage gauge: Used MB / 500 MB limit (e.g., '142 MB of 500 MB used • 28%'), 2. Media breakdown bar (Photos: 94 MB, Audio: 36 MB, Books: 12 MB), 3. On-Device Cache section: 'Thumbnail Cache: 45 MB' with 'Clear Local Cache' button, 4. Data Sovereignty & Export card: 'Export Entire Living Archive' button (generates signed ZIP containing original uncompressed files and JSON metadata).
- **Footer / Actions Bar**: Zero-budget policy pledge: 'Memoria guarantees $0 cardless hosting and absolute data ownership.'

#### 5. Interactive Controls & UI Elements
- Storage meter progress bar
- Clear Local Cache button (frees disk space on device without touching cloud archive)
- Export Archive button (triggers background zip compilation and share sheet)
- Offline sync status toggle
- Back button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Export Archive button`
- **Tab Sequence**: `Storage gauge` -> `Clear Cache button` -> `Export Archive button`
- **Escape Key Action**: Pops back to IOS-54

#### 8. States Matrix
- **Loading State**: Calculating disk storage breakdown spinner.
- **Empty State**: N/A
- **Populated State**: Detailed byte usage breakdown with color-coded category meter.
- **Error State**: Error banner with refresh.
- **Offline Mode**: Displays cached local storage statistics.
- **Permission Denied**: 403 Forbidden alert.

#### 9. Confirmation & Cancellation Workflows
Tapping 'Clear Local Cache' confirms: 'Clear 45 MB of cached thumbnails? High-resolution photos will re-download when viewed.'

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA / VoiceOver accessible
- **Screen Reader Summary**: "Storage management. 142 megabytes used of 500 megabyte quota. 28 percent full. Double tap Export to download full archive."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Native grouped scroll view on iPhone.
- **Tablet (768px – 1024px)**: Card grid layout on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/spaces/:spaceId/storage/breakdown`
- **Authorization**: `Bearer JWT`
- **Response Payload**: `{ success: true, data: { usedBytes: number, maxBytes: number, breakdown: { photos: number, audio: number, books: number } } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `media-service / Local SQLite`
- **Database Tables**: `space_storage_quotas`, `media_assets`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `storage.cache_cleared`
- **BullMQ Background Jobs**: `compile-space-export-zip`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Export file encrypted and delivered securely over HTTPS.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] calculates storage percentage accurately against 500MB cap
  - [ ] removes files in CachesDirectory upon cache clear
- **Integration Tests**:
  - [ ] GET /api/spaces/:spaceId/storage/breakdown returns exact quota bytes
- **End-to-End Acceptance Tests**:
  - [ ] taps Clear Local Cache, confirms dialog, verifies cache size resets to 0 MB

#### 17. UI Component Inventory
`StorageUsageGauge`, `StorageCategoryBreakdownBar`, `ActionCard`, `Button`

---

### IOS-56 — Help, Archival Knowledge Base & Support Submission Sheet

**Category**: Native iOS — Commerce & Account  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Search preservation guides (scanning tips, audio recording guidelines, book binding advice) or submit support ticket.
- **User Story**: "As an archivist, I want to read tips on how to scan fragile 19th-century tintypes without glare, or message support if I have questions."

#### 2. Navigation & Routing
- **Entry Routes**: `IOS-54 Account Preferences`, `IOS-53 Order Status`
- **Exit Routes**: `IOS-54 Account Preferences`, `Article Reader View`
- **Back Navigation**: `Dismiss sheet`
- **Deep Link**: `memoria://support`

#### 3. Personas & Authorization
- **Eligible Roles**: Authenticated Member, Anonymous Visitor
- **Required Capabilities**: `view_faq`, `submit_ticket`
- **Authentication Required**: No (Public / Unauthenticated Access Allowed)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Sheet navigation bar: 'Preservation Help & Support' with Close button.
- **Main Content**: 1. Search FAQ text field, 2. Preservation Guides section (How to scan old photos, Recording oral histories, Customizing book covers), 3. Frequently Asked Questions accordion, 4. 'Contact Archival Support' message form (Subject, Category picker, Message text area, Attach diagnostic logs toggle).
- **Footer / Actions Bar**: Primary CTA button: 'Submit Support Request'.

#### 5. Interactive Controls & UI Elements
- Search FAQ TextField
- Preservation guide article tap (opens modal article reader)
- FAQ accordion disclosure groups
- Support Category picker (Book Printing, Media Uploads, Account, Bug Report)
- Message TextEditor
- Attach Diagnostic Logs toggle
- Submit Request button
- Close button

#### 6. Form Validation & Data Schema

| Field Name | Data Type | Required | Limits & Constraints | Validation Rule | Error Copy |
|---|---|---|---|---|---|
| `category` | `select` | **Yes** | N/A | Standard type validation | Please select a topic category. |
| `message` | `text` | **Yes** | 10-2000 characters | Standard type validation | Please enter a message of at least 10 characters. |

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Search FAQ field`
- **Tab Sequence**: `Search field` -> `FAQ items` -> `Category` -> `Message` -> `Submit` -> `Close`
- **Escape Key Action**: Dismisses sheet

#### 8. States Matrix
- **Loading State**: Submitting ticket spinner.
- **Empty State**: N/A
- **Populated State**: Rich FAQ articles and interactive support submission form.
- **Error State**: Error banner with retry.
- **Offline Mode**: FAQ articles available offline from local bundle.
- **Permission Denied**: N/A

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA / VoiceOver accessible
- **Screen Reader Summary**: "Help and support sheet. Search preservation guides or submit support request. Double tap to search."
- **Touch Target Minimum**: `44x44 pt`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Modal form sheet on iPhone.
- **Tablet (768px – 1024px)**: Centered modal container on iPad.
- **Desktop (> 1024px)**: N/A

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/support/tickets`
- **Authorization**: `Bearer JWT or Anonymous`
- **Request Payload**: `{ category: string, subject: string, message: string, appVersion: string, deviceModel: string }`
- **Response Payload**: `{ success: true, data: { ticketId: string, status: 'received' } }`
- **Status Codes**: `201 Created`, `400 Bad Request`

#### 13. Service Architecture & Persistence
- **Backend Service**: `identity-service`
- **Database Tables**: `support_tickets`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `support.ticket_created`
- **BullMQ Background Jobs**: `send-support-confirmation-email`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Diagnostic logs sanitize all private memory content and tokens.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] validates support message length requirement
  - [ ] filters FAQ items by search keywords
- **Integration Tests**:
  - [ ] POST /api/support/tickets creates support ticket in database
- **End-to-End Acceptance Tests**:
  - [ ] fills out support form, attaches logs, taps Submit, verifies success confirmation alert

#### 17. UI Component Inventory
`FAQAccordionView`, `SearchTextField`, `Picker`, `TextEditor`, `Toggle`, `Button`

---

## PART 3: ADMINISTRATIVE PORTAL (ADMIN-01 to ADMIN-26)

### 3.1 Platform & User Administration (ADMIN-01 to ADMIN-05)

### ADMIN-01 — Platform Executive Overview & Health Dashboard

**Category**: Admin Portal — Platform & User Administration  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Monitor platform-wide health metrics, active family spaces, storage utilization, background job throughput, and active user growth in real time.
- **User Story**: "As a platform operations lead, I want an executive overview dashboard with real-time telemetry cards and storage metrics to ensure the $0 local infrastructure runs smoothly."

#### 2. Navigation & Routing
- **Entry Routes**: `/admin`, `/admin/dashboard`
- **Exit Routes**: `/admin/users`, `/admin/spaces`, `/admin/storage`, `/admin/queues`, `/admin/orders`
- **Back Navigation**: `/admin`
- **Deep Link**: `https://admin.memoria.local/dashboard`

#### 3. Personas & Authorization
- **Eligible Roles**: Platform Superadmin, Operations Admin
- **Required Capabilities**: `view_executive_dashboard`, `view_platform_telemetry`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Admin global topbar with Memoria Archival insignia, active admin badge, live WebSocket cluster heartbeat indicator, and quick search shortcut (Cmd+K).
- **Main Content**: 1. KPI Summary Cards: Active Spaces (e.g. 1,420), Total Memories Preserved (e.g. 84,310), Storage Reserved (e.g. 312 GB / 500 GB local limit), BullMQ Job Throughput (99.8% success), 2. High-priority alerts drawer, 3. Microservice health status grid, 4. Recent system security log feed.
- **Aside / Sidebar**: Collapsible admin sidebar navigation with section headers: Operations, Content, Infrastructure, Commerce, Governance.

#### 5. Interactive Controls & UI Elements
- Timeframe selector pill group (Last 1h, 24h, 7d, 30d)
- Global search bar (Cmd+K)
- Service restart / reload telemetry button
- Export platform KPI snapshot button (JSON/CSV)
- Alert drawer dismiss / acknowledge action

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Timeframe selector`
- **Tab Sequence**: `Sidebar navigation` -> `Timeframe selector` -> `KPI Cards` -> `Alerts Drawer` -> `Service Grid`
- **Keyboard Shortcuts**: `Cmd+K (Quick Search)`, `Shift+R (Refresh Metrics)`
- **Escape Key Action**: Closes modal overlays and resets filter

#### 8. States Matrix
- **Loading State**: Warm Ivory skeleton shimmer over all 4 KPI summary cards and telemetry charts.
- **Empty State**: Notice: 'No telemetry data collected for current window.'
- **Populated State**: Real-time updated stat cards with color-coded trend badges (Emerald green +4.2%, Sage neutral).
- **Error State**: Prominent error banner: 'Failed to stream telemetry from NATS event bus. Falling back to polling.'
- **Offline Mode**: Offline indicator banner: 'Disconnected from admin gateway. Read-only cached state.'
- **Permission Denied**: 403 Forbidden screen: 'Superadmin privileges required to access executive dashboard.'

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA compliant
- **Screen Reader Summary**: "Executive overview dashboard. Total active spaces 1,420. Storage at 62 percent of budget. All microservices operational."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1 (Deep Ink #20242C on Warm Ivory #F7F4EE)`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Single column stacked stat cards with swipeable KPI strip.
- **Tablet (768px – 1024px)**: 2-column KPI grid with collapsible drawer navigation.
- **Desktop (> 1024px)**: 4-column metric grid with persistent sidebar and real-time canvas chart.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/admin/overview/metrics`
- **Authorization**: `Bearer JWT + Admin Role`
- **Response Payload**: `{ success: true, data: { activeSpaces: number, totalMemories: number, storageBytes: number, queueSuccessRate: number, services: Array<ServiceHealth> } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `api-gateway / identity-service`
- **Database Tables**: `users`, `memory_spaces`, `space_storage_quotas`, `memories`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `admin.dashboard_viewed`
- **BullMQ Background Jobs**: `aggregate-daily-platform-kpis`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Admin Audited`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Aggregated statistical figures only; zero individual memory payloads or private family names exposed.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] formats byte sizes to GB with 1 decimal precision
  - [ ] calculates queue health percentage without divide-by-zero error
- **Integration Tests**:
  - [ ] GET /api/admin/overview/metrics returns valid HTTP 200 with all KPI fields
- **End-to-End Acceptance Tests**:
  - [ ] logs in as superadmin, loads dashboard, validates all 4 metric cards populate within 1.5 seconds

#### 17. UI Component Inventory
`AdminTopbar`, `SidebarNavigation`, `KPISummaryCard`, `ServiceHealthGrid`, `AlertDrawer`

---

### ADMIN-02 — User Directory, Status Governance & Verification Console

**Category**: Admin Portal — Platform & User Administration  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Search, filter, and inspect registered user accounts, manage account locks, verify identity credentials, and enforce terms compliance.
- **User Story**: "As an administrative compliance officer, I want to search registered accounts by email or ID, inspect verification badges, and suspend compromised accounts."

#### 2. Navigation & Routing
- **Entry Routes**: `/admin`, `/admin/dashboard`, `/admin/users`
- **Exit Routes**: `/admin/users/:userId`, `/admin/audit-logs`
- **Back Navigation**: `/admin/dashboard`
- **Deep Link**: `https://admin.memoria.local/users`

#### 3. Personas & Authorization
- **Eligible Roles**: Platform Superadmin, Compliance Officer, Support Lead
- **Required Capabilities**: `view_users`, `manage_user_status`, `verify_users`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Breadcrumb navigation (Admin > Users), page title 'User Directory', search input, and export CSV button.
- **Main Content**: 1. Filter toolbar (Verification: All/Verified/Pending, Status: Active/Suspended/Banned, Role: Member/Contributor/Admin), 2. Paginated tabular directory (Avatar, Full Name, Email, Spaces Owned, Created Date, MFA Status, Account Status pill), 3. Action context menu per row.
- **Footer / Actions Bar**: Keyset pagination bar with items per page selector (25, 50, 100) and total count indicator.

#### 5. Interactive Controls & UI Elements
- User search input with debounced API lookup
- Filter chip dropdowns (Status, Verification, MFA)
- Row action button: 'Inspect User Details'
- Row action button: 'Suspend Account' (opens confirmation modal)
- Export user directory CSV button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `User search input`
- **Tab Sequence**: `Search input` -> `Filter dropdowns` -> `Table rows` -> `Pagination controls`
- **Escape Key Action**: Clears active search query

#### 8. States Matrix
- **Loading State**: Tabular skeleton rows with pulsing pill placeholders.
- **Empty State**: Notice: 'No users match the specified search or filter criteria.'
- **Populated State**: Crisp table rows with Cormorant Garamond names, Inter monospace UUIDs, and color-coded status badges.
- **Error State**: Error callout: 'Unable to load user directory. Please retry.'
- **Offline Mode**: Offline banner: 'Admin portal requires active connection to identity-service.'
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA compliant
- **Screen Reader Summary**: "User directory table. 2,410 total users. Showing page 1 of 48. Double tap any user row to view details."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Card list view with user avatar and essential status pills.
- **Tablet (768px – 1024px)**: Compact table with horizontal scrolling for secondary metadata.
- **Desktop (> 1024px)**: Full desktop data grid with inline sortable columns and action menus.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/admin/users`
- **Authorization**: `Bearer JWT + Admin Role`
- **Request Payload**: `Query: { page: number, limit: number, search?: string, status?: string }`
- **Response Payload**: `{ success: true, data: { users: Array<AdminUserSummary>, total: number, page: number } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `identity-service`
- **Database Tables**: `users`, `user_sessions`, `memory_spaces`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `admin.user_directory_searched`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Admin Audited`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Admin searches and user listings are logged to immutable audit records with admin ID.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] debounces search input by 300ms
  - [ ] formats account status badges according to design tokens
- **Integration Tests**:
  - [ ] GET /api/admin/users?search=test filters database records correctly
- **End-to-End Acceptance Tests**:
  - [ ] enters query in search bar, verifies results update, clicks on user row to navigate to details

#### 17. UI Component Inventory
`DataTable`, `SearchInput`, `FilterDropdown`, `StatusBadge`, `PaginationBar`

---

### ADMIN-03 — User Security Dossier & Session Invalidation Console

**Category**: Admin Portal — Platform & User Administration  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Deep-inspect an individual user's security posture, active login sessions, MFA enrollment, authentication logs, and trigger global session invalidation.
- **User Story**: "As an admin investigating suspected account takeover, I want to review all active sessions and invalidate them immediately to protect family memories."

#### 2. Navigation & Routing
- **Entry Routes**: `/admin/users`, `/admin/users/:userId`
- **Exit Routes**: `/admin/users`, `/admin/audit-logs?userId=:userId`
- **Back Navigation**: `/admin/users`
- **Deep Link**: `https://admin.memoria.local/users/:userId`

#### 3. Personas & Authorization
- **Eligible Roles**: Platform Superadmin, Compliance Officer, Support Lead
- **Required Capabilities**: `view_user_security`, `revoke_user_sessions`, `manage_user_status`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Breadcrumbs (Admin > Users > [User Name]), user header card with avatar, email, verification status, and 'Revoke All Sessions' button.
- **Main Content**: 1. Account Overview Card (User ID, registered date, last active IP, password last changed), 2. Active Sessions Table (Device, IP, User Agent, Issued At, Expires At, Revoke button per session), 3. Associated Memory Spaces List, 4. Security Event Timeline (Login attempts, password resets, role changes).
- **Footer / Actions Bar**: Danger Zone card: 'Suspend User', 'Force Password Reset', 'Schedule Account Deletion'.

#### 5. Interactive Controls & UI Elements
- Global 'Revoke All Active Sessions' button (prompts modal confirmation)
- Individual session 'Revoke' button
- 'Force Password Reset' button
- 'Suspend Account' toggle with reason text area
- Back to User Directory button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Back to User Directory button`
- **Tab Sequence**: `Back button` -> `Revoke All button` -> `Session table rows` -> `Danger Zone buttons`
- **Escape Key Action**: Closes confirmation modal if open

#### 8. States Matrix
- **Loading State**: Profile skeleton cards and session table shimmer.
- **Empty State**: Notice: 'No active sessions found for this user.'
- **Populated State**: Complete security dossier with session geography, hashed token metadata, and audit log trail.
- **Error State**: Error banner: 'Failed to fetch user security dossier.'
- **Offline Mode**: Offline indicator; destructive actions disabled.
- **Permission Denied**: 403 Forbidden screen.

#### 9. Confirmation & Cancellation Workflows
Revoking sessions or suspending account requires modal confirmation with mandatory reason entry: 'Confirm immediate revocation of all sessions for user [email]?'

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA compliant
- **Screen Reader Summary**: "User security dossier for Eleanor Vance. 2 active sessions found. Double tap Revoke All Sessions to log out user on all devices."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Vertical stack of profile cards and session cards.
- **Tablet (768px – 1024px)**: Two-column grid with user profile on left and active sessions on right.
- **Desktop (> 1024px)**: Three-column modular layout with security audit stream in side column.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/admin/users/:userId/sessions/revoke-all`
- **Authorization**: `Bearer JWT + Admin Role`
- **Request Payload**: `{ reason: string }`
- **Response Payload**: `{ success: true, data: { revokedSessionsCount: number } }`
- **Status Codes**: `200 OK`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `identity-service`
- **Database Tables**: `users`, `user_sessions`, `outbox_events`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `admin.user_sessions_revoked`, `user.force_logout`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Admin Audited`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Session revocation is written to immutable audit logs with admin identity and rationale.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] validates mandatory reason string before dispatching session revocation
  - [ ] correctly formats IP address location hints
- **Integration Tests**:
  - [ ] POST /api/admin/users/:userId/sessions/revoke-all purges user_sessions table records
- **End-to-End Acceptance Tests**:
  - [ ] opens user dossier, clicks Revoke All Sessions, types reason, verifies session count becomes 0

#### 17. UI Component Inventory
`UserProfileCard`, `SessionsTable`, `DangerZoneBox`, `ConfirmationModal`, `Button`

---

### ADMIN-04 — Memory Space Oversight & Hierarchy Governance Console

**Category**: Admin Portal — Platform & User Administration  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Inspect space metadata, storage quotas, member rosters, and ownership chains across all collaborative capsules on the platform.
- **User Story**: "As an administrator, I want to inspect space parameters, identify orphaned family spaces, and audit contributor access hierarchies."

#### 2. Navigation & Routing
- **Entry Routes**: `/admin`, `/admin/spaces`
- **Exit Routes**: `/admin/spaces/:spaceId`, `/admin/storage`
- **Back Navigation**: `/admin/dashboard`
- **Deep Link**: `https://admin.memoria.local/spaces`

#### 3. Personas & Authorization
- **Eligible Roles**: Platform Superadmin, Compliance Officer
- **Required Capabilities**: `view_spaces_oversight`, `manage_spaces`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Breadcrumbs (Admin > Spaces), search bar by space name or owner email, space type filter (Family, Memorial, Personal), and space quota summary.
- **Main Content**: 1. Filter bar, 2. Tabular space directory (Cover thumbnail, Space Name, Space Type, Owner Name/Email, Members Count, Storage Used / 500 MB, Created Date, Status), 3. Space detail expansion row (shows member role breakdown).
- **Footer / Actions Bar**: Pagination bar with total spaces count (e.g. '1,420 spaces active').

#### 5. Interactive Controls & UI Elements
- Space search input
- Space type filter dropdown
- Quota utilization filter (>80%, Normal)
- Row action button: 'Inspect Space Governance'
- Transfer ownership action (for support recovery)

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Space search input`
- **Tab Sequence**: `Search input` -> `Filter dropdowns` -> `Table rows` -> `Pagination controls`
- **Escape Key Action**: Resets space filter

#### 8. States Matrix
- **Loading State**: Tabular skeleton with pulsing storage bars.
- **Empty State**: Notice: 'No memory spaces match specified filters.'
- **Populated State**: Detailed table rows with progress bars for quota usage and owner avatars.
- **Error State**: Error banner: 'Failed to load memory spaces.'
- **Offline Mode**: Offline indicator; read-only cached view.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA compliant
- **Screen Reader Summary**: "Memory spaces oversight directory. 1,420 total spaces. Double tap any row to inspect governance and members."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Card list view showing space name, owner, and storage progress bar.
- **Tablet (768px – 1024px)**: Compact table with essential columns.
- **Desktop (> 1024px)**: Full data table with inline storage gauges and member chips.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/admin/spaces`
- **Authorization**: `Bearer JWT + Admin Role`
- **Request Payload**: `Query: { page: number, limit: number, search?: string, type?: string }`
- **Response Payload**: `{ success: true, data: { spaces: Array<AdminSpaceSummary>, total: number } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service`
- **Database Tables**: `memory_spaces`, `space_storage_quotas`, `users`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `admin.spaces_oversight_viewed`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Admin Audited`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Space oversight access is strictly logged to security audit logs.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] renders storage percentage gauge accurately
  - [ ] filters spaces by quota overflow flag
- **Integration Tests**:
  - [ ] GET /api/admin/spaces returns paginated spaces with quota calculation
- **End-to-End Acceptance Tests**:
  - [ ] filters by 'Family' space type, verifies list renders only family type records

#### 17. UI Component Inventory
`DataTable`, `SearchInput`, `StorageUsageBar`, `FilterDropdown`, `PaginationBar`

---

### ADMIN-05 — Authorized Support Access Request & Multi-Party Approval Console

**Category**: Admin Portal — Platform & User Administration  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Enforce strict zero-knowledge privacy governance by requiring cryptographic multi-party authorization before any admin can access user data for technical support.
- **User Story**: "As a support engineer, I want to submit a time-bounded support access request requiring dual-admin cryptographic sign-off before inspecting customer issues."

#### 2. Navigation & Routing
- **Entry Routes**: `/admin`, `/admin/access-requests`
- **Exit Routes**: `/admin/access-requests/:requestId`, `/admin/dashboard`
- **Back Navigation**: `/admin/dashboard`
- **Deep Link**: `https://admin.memoria.local/access-requests`

#### 3. Personas & Authorization
- **Eligible Roles**: Platform Superadmin, Compliance Officer, Support Lead
- **Required Capabilities**: `request_support_access`, `approve_support_access`, `view_access_requests`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Breadcrumbs (Admin > Support Access Requests), page title 'Multi-Party Support Access Console', and 'New Access Request' button.
- **Main Content**: 1. Dual-Custody Privacy Policy Banner (explaining that no admin can view memories without two cryptographic signatures and user consent ticket), 2. Active Requests Table (Request ID, Requester, Target Space/User, Reason, Ticket Ref, Duration, Approvals Status [1/2], Time Remaining), 3. Approval action modal with biometric / security key signature prompt.
- **Footer / Actions Bar**: Historical approved & revoked access sessions log.

#### 5. Interactive Controls & UI Elements
- New Support Access Request button (opens request modal)
- Approve Request button (requires 2FA / WebAuthn token)
- Deny / Revoke Request button
- Filter by status (Pending, Approved, Expired, Revoked)
- Search by support ticket reference

#### 6. Form Validation & Data Schema

| Field Name | Data Type | Required | Limits & Constraints | Validation Rule | Error Copy |
|---|---|---|---|---|---|
| `targetSpaceId` | `text` | **Yes** | N/A | Standard type validation | Please provide a valid space or user UUID. |
| `supportTicketRef` | `text` | **Yes** | 5-50 characters | Standard type validation | Valid customer ticket reference required. |
| `justification` | `text` | **Yes** | 20-500 characters | Standard type validation | Detailed technical justification required (minimum 20 characters). |
| `durationMinutes` | `number` | **Yes** | 15 to 120 minutes | Standard type validation | Access duration must be between 15 and 120 minutes. |

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `New Support Access Request button`
- **Tab Sequence**: `New Request button` -> `Filter chips` -> `Requests table` -> `Approval buttons`
- **Escape Key Action**: Dismisses request modal

#### 8. States Matrix
- **Loading State**: Requests table skeleton shimmer.
- **Empty State**: Notice: 'No pending support access requests. System is operating under full privacy lock.'
- **Populated State**: Detailed table with dual-custody verification chips (e.g. 'Approver 1: Approved • Approver 2: Pending').
- **Error State**: Error banner: 'Failed to synchronize access requests with identity authority.'
- **Offline Mode**: Offline indicator; approvals cannot be granted offline.
- **Permission Denied**: 403 Forbidden screen: 'Dual-custody approval requires Compliance Officer privileges.'

#### 9. Confirmation & Cancellation Workflows
Approving an access grant requires hardware security key or TOTP token and prompts: 'Confirm granting 30 minutes of audited support access to [targetSpace]?'

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA compliant
- **Screen Reader Summary**: "Authorized support access console. 1 pending request awaiting your signature. Target space: Vance Family Archive. Reason: corrupted media restoration."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Card list view with approval status banners.
- **Tablet (768px – 1024px)**: Compact table with quick approve modal sheet.
- **Desktop (> 1024px)**: Full audit grid with dual signature telemetry and countdown timers.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/admin/access-requests/:requestId/approve`
- **Authorization**: `Bearer JWT + Admin Role + WebAuthn`
- **Request Payload**: `{ secondFactorToken: string, notes?: string }`
- **Response Payload**: `{ success: true, data: { status: 'approved', expiresAt: string, token: string } }`
- **Status Codes**: `200 OK`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `identity-service`
- **Database Tables**: `support_access_requests`, `audit_logs`, `outbox_events`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `admin.access_request_approved`, `admin.access_session_started`
- **BullMQ Background Jobs**: `revoke-expired-support-access-tokens`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Admin Audited`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Dual-custody access requests and every action taken during support sessions are permanently recorded in immutable audit logs.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] prevents requester from approving their own access request
  - [ ] enforces max duration limit of 120 minutes
- **Integration Tests**:
  - [ ] POST /api/admin/access-requests/:id/approve requires 2 distinct admin signatures before status becomes 'approved'
- **End-to-End Acceptance Tests**:
  - [ ] creates support request, logs in as second admin, approves request, verifies countdown timer begins

#### 17. UI Component Inventory
`AccessRequestModal`, `DualApprovalBadge`, `DataTable`, `WebAuthnSignaturePrompt`, `Button`

---

### 3.2 Content Moderation & Safety (ADMIN-06 to ADMIN-07)

### ADMIN-06 — Flagged Content Moderation Queue & Resolution Console

**Category**: Admin Portal — Content Moderation & Safety  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Review automated and user-reported content flags, inspect flagged text and media metadata, and take moderation action (dismiss, soft-delete, quarantine).
- **User Story**: "As a safety moderator, I want to inspect flagged photos or stories to resolve policy violations while protecting family privacy."

#### 2. Navigation & Routing
- **Entry Routes**: `/admin`, `/admin/moderation`
- **Exit Routes**: `/admin/moderation/:flagId`, `/admin/reports`
- **Back Navigation**: `/admin/dashboard`
- **Deep Link**: `https://admin.memoria.local/moderation`

#### 3. Personas & Authorization
- **Eligible Roles**: Platform Superadmin, Compliance Officer, Content Moderator
- **Required Capabilities**: `moderate_content`, `view_flagged_content`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Breadcrumbs (Admin > Moderation), queue counter badge ('14 pending items'), filter by violation type (Copyright, Abuse, Malware, CSAM/Illegal), and auto-refresh toggle.
- **Main Content**: 1. Moderation items list / split card view: Flagged item card with reporter reason, risk score, automated classification tags, blurred thumbnail (tap to reveal), and associated space, 2. Item inspector panel showing memory text, EXIF metadata, and uploader history.
- **Footer / Actions Bar**: Batch resolution action bar: 'Quarantine Selected', 'Dismiss Selected', 'Escalate to Legal'.

#### 5. Interactive Controls & UI Elements
- Blur toggle button (tap to reveal sensitive content)
- Resolution action button: 'Approve & Dismiss Flag'
- Resolution action button: 'Quarantine Media' (removes from public/space view)
- Resolution action button: 'Delete Permanently' (with confirmation)
- Filter by risk score threshold (>80%, >50%, All)

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First moderation item`
- **Tab Sequence**: `Filter bar` -> `Item list` -> `Action buttons` -> `Resolution notes`
- **Keyboard Shortcuts**: `A (Approve)`, `Q (Quarantine)`, `D (Delete)`
- **Escape Key Action**: Clears selection

#### 8. States Matrix
- **Loading State**: Moderation queue skeleton shimmer.
- **Empty State**: Notice: 'All clear! No pending items in moderation queue.' with green archival seal.
- **Populated State**: Card feed of flagged assets with risk score pills and blurred image overlays.
- **Error State**: Error banner: 'Failed to retrieve moderation queue.'
- **Offline Mode**: Offline indicator; moderation actions require online connection.
- **Permission Denied**: 403 Forbidden screen.

#### 9. Confirmation & Cancellation Workflows
Quarantining or deleting content prompts modal: 'Confirm moderation action on item [id]? Action will be recorded in safety audit log.'

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA compliant
- **Screen Reader Summary**: "Moderation queue. 14 items pending review. First item: Flagged photo in Miller Family space. Risk score high. Double tap to review."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Single column card review feed with swipe actions.
- **Tablet (768px – 1024px)**: Split view with queue list on left and item inspector on right.
- **Desktop (> 1024px)**: Three-pane layout: Queue list, media technical inspector, and resolution actions panel.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/admin/moderation/:flagId/resolve`
- **Authorization**: `Bearer JWT + Admin Role`
- **Request Payload**: `{ action: 'dismiss' | 'quarantine' | 'delete', reason: string, notes?: string }`
- **Response Payload**: `{ success: true, data: { flagId: string, resolvedAt: string, status: string } }`
- **Status Codes**: `200 OK`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `memory-service / media-service`
- **Database Tables**: `moderation_flags`, `memories`, `media_assets`, `outbox_events`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `moderation.item_resolved`, `media.quarantined`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Admin Audited`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Moderation actions and review timestamps are permanently logged for legal compliance.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] applies blur filter by default to flagged images
  - [ ] maps keyboard shortcuts A/Q/D to corresponding actions
- **Integration Tests**:
  - [ ] POST /api/admin/moderation/:id/resolve updates flag status and media_asset visibility
- **End-to-End Acceptance Tests**:
  - [ ] opens moderation item, toggles image blur, selects Quarantine with rationale, verifies item removed from queue

#### 17. UI Component Inventory
`ModerationCard`, `SensitiveImageBlurView`, `ResolutionActionBar`, `ConfirmationModal`, `Button`

---

### ADMIN-07 — User Incident Reports & Policy Abuse Case Manager

**Category**: Admin Portal — Content Moderation & Safety  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Investigate interpersonal abuse reports, harassment complaints, intellectual property claims, and terms violations filed by community members.
- **User Story**: "As an abuse investigator, I want to review formal user reports, view communication logs between parties, and communicate case findings."

#### 2. Navigation & Routing
- **Entry Routes**: `/admin`, `/admin/reports`
- **Exit Routes**: `/admin/reports/:reportId`, `/admin/users/:userId`
- **Back Navigation**: `/admin/moderation`
- **Deep Link**: `https://admin.memoria.local/reports`

#### 3. Personas & Authorization
- **Eligible Roles**: Platform Superadmin, Compliance Officer, Content Moderator
- **Required Capabilities**: `manage_abuse_reports`, `view_user_reports`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Breadcrumbs (Admin > Incident Reports), active cases counter ('3 open reports'), and status tab filter (Open, In Investigation, Resolved, Dismissed).
- **Main Content**: 1. Incident reports table (Report ID, Reporting User, Reported User/Space, Violation Category, Date Filed, Priority [Urgent/Standard], Status), 2. Incident dossier modal: Full text of report, supporting evidence attachments, prior report history of reported user, moderator internal notes.
- **Footer / Actions Bar**: Case closure bar with resolution template selector and message to reporter.

#### 5. Interactive Controls & UI Elements
- Status tab filter (Open, Under Investigation, Resolved)
- Priority filter (Urgent, High, Normal)
- Row action button: 'Open Incident Dossier'
- Resolution dropdown (No Action, Warning Issued, User Suspended, Content Removed)
- Internal moderator note text editor
- Close Case button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First open report row`
- **Tab Sequence**: `Status tabs` -> `Reports table` -> `Dossier modal` -> `Resolution dropdown` -> `Close Case button`
- **Escape Key Action**: Closes incident dossier

#### 8. States Matrix
- **Loading State**: Reports table skeleton shimmer.
- **Empty State**: Notice: 'No open user reports found. All cases resolved.'
- **Populated State**: Detailed incident list with priority chips and time elapsed indicators.
- **Error State**: Error banner: 'Failed to retrieve incident reports.'
- **Offline Mode**: Offline indicator; case management requires live connection.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA compliant
- **Screen Reader Summary**: "Incident reports manager. 3 open reports. Urgent case: Unauthorized photo upload in Vance Space. Double tap to open dossier."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Card list view with priority badges and tap-to-review sheet.
- **Tablet (768px – 1024px)**: Two-pane layout with report list and case resolution drawer.
- **Desktop (> 1024px)**: Full case management console with split inspector and resolution workflows.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `PATCH` `/api/admin/reports/:reportId`
- **Authorization**: `Bearer JWT + Admin Role`
- **Request Payload**: `{ status: 'resolved' | 'dismissed' | 'investigating', resolution: string, internalNotes: string }`
- **Response Payload**: `{ success: true, data: { report: IncidentReport } }`
- **Status Codes**: `200 OK`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `identity-service / memory-service`
- **Database Tables**: `user_reports`, `audit_logs`, `outbox_events`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `report.status_updated`, `user.notified`
- **BullMQ Background Jobs**: `send-incident-resolution-notice`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Admin Audited`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Reporter identities protected under strict whistleblower safety policies.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] sorts reports by priority (Urgent > High > Normal) and creation date
  - [ ] validates resolution explanation length
- **Integration Tests**:
  - [ ] PATCH /api/admin/reports/:id updates status and writes resolution audit trail
- **End-to-End Acceptance Tests**:
  - [ ] opens open report, selects Warning Issued, enters resolution notes, closes case

#### 17. UI Component Inventory
`ReportsTable`, `IncidentDossierModal`, `PriorityPill`, `ResolutionDropdown`, `Button`

---

### 3.3 Storage & Media Infrastructure (ADMIN-08 to ADMIN-10)

### ADMIN-08 — Storage Engine Dashboard, Quota Utilization & Orphan File Manager

**Category**: Admin Portal — Storage & Media Infrastructure  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Inspect physical disk storage across local filesystem volumes (`storage/local/`), monitor space quotas, detect orphan assets, and run garbage collection.
- **User Story**: "As an infrastructure engineer, I want to inspect local disk usage, locate unreferenced orphan files, and safely reclaim disk space without card-gated cloud expenses."

#### 2. Navigation & Routing
- **Entry Routes**: `/admin`, `/admin/storage`
- **Exit Routes**: `/admin/storage/orphans`, `/admin/storage/assets`, `/admin/dashboard`
- **Back Navigation**: `/admin/dashboard`
- **Deep Link**: `https://admin.memoria.local/storage`

#### 3. Personas & Authorization
- **Eligible Roles**: Platform Superadmin, Infrastructure Admin
- **Required Capabilities**: `manage_storage`, `view_storage_metrics`, `run_garbage_collection`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Breadcrumbs (Admin > Storage), disk space status gauge (e.g. '312 GB used / 500 GB allocated • 62%'), and 'Run Orphan Scan' button.
- **Main Content**: 1. Storage Utilization Breakdown: Originals (210 GB), Web Derivatives (72 GB), Thumbnails (24 GB), PDF Previews (6 GB), 2. Top Storage Spaces Leaderboard, 3. Orphan Files & Ghost Assets Card: Detected unreferenced files with estimated reclaimable space, 4. Storage driver health telemetry (LocalDiskStorageDriver).
- **Footer / Actions Bar**: Zero-budget storage pledge: 'Operating strictly on local filesystem; Cloudflare R2 prohibited.'

#### 5. Interactive Controls & UI Elements
- Run Orphan Scan button (triggers BullMQ asynchronous crawler)
- Trigger Garbage Collection button (prompts confirmation modal)
- Refresh disk usage statistics button
- Filter storage spaces by quota threshold (>90%, >75%, All)
- Export storage utilization report (CSV)

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Run Orphan Scan button`
- **Tab Sequence**: `Scan button` -> `Utilization cards` -> `Spaces table` -> `Garbage Collection button`
- **Escape Key Action**: Closes confirmation modal

#### 8. States Matrix
- **Loading State**: Storage gauge and space breakdown skeleton shimmer.
- **Empty State**: Notice: 'Storage volume empty. Zero media files stored.'
- **Populated State**: Rich visual bar chart with color-coded derivative buckets and orphan asset counts.
- **Error State**: Error banner: 'Failed to read filesystem telemetry from storage/local/.'
- **Offline Mode**: Offline indicator; storage maintenance disabled.
- **Permission Denied**: 403 Forbidden screen.

#### 9. Confirmation & Cancellation Workflows
Garbage collection prompts: 'Reclaim [X] MB of confirmed orphan files? This will permanently delete unreferenced assets from storage/local/.'

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA compliant
- **Screen Reader Summary**: "Storage engine dashboard. 312 gigabytes used of 500 gigabyte local disk quota. 120 megabytes reclaimable orphan files found. Double tap to scan."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Single column gauge and top spaces card list.
- **Tablet (768px – 1024px)**: Two-column storage overview and orphan cleaner.
- **Desktop (> 1024px)**: Full three-column storage architecture control console.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/admin/storage/stats`
- **Authorization**: `Bearer JWT + Admin Role`
- **Response Payload**: `{ success: true, data: { totalUsedBytes: number, maxBudgetBytes: number, originalBytes: number, derivativeBytes: number, orphanFilesCount: number, orphanBytes: number } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `media-service / LocalDiskStorageDriver`
- **Database Tables**: `media_assets`, `space_storage_quotas`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `admin.storage_scanned`
- **BullMQ Background Jobs**: `scan-orphan-media-files`, `purge-orphan-media-files`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Admin Audited`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Storage metadata reports disk capacity and file hashes; zero user photos inspected.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] computes reclaimable space accurately from orphan file list
  - [ ] verifies storage driver path conforms to storage/local/
- **Integration Tests**:
  - [ ] GET /api/admin/storage/stats returns accurate byte counts from filesystem and database
- **End-to-End Acceptance Tests**:
  - [ ] clicks Run Orphan Scan, waits for job completion, verifies orphan count updates

#### 17. UI Component Inventory
`StorageGaugeWidget`, `DerivativeBreakdownBar`, `SpacesQuotaTable`, `OrphanManagerCard`, `Button`

---

### ADMIN-09 — Media Asset Technical Inspector & Derivative Health Analyzer

**Category**: Admin Portal — Storage & Media Infrastructure  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Deep-inspect technical media metadata (EXIF, color profiles, pixel dimensions, Sharp/FFmpeg derivative generation status, SHA-256 hashes).
- **User Story**: "As an archival media engineer, I want to inspect corrupted photo uploads, review EXIF date extraction, and re-trigger derivative generation."

#### 2. Navigation & Routing
- **Entry Routes**: `/admin/storage`, `/admin/storage/assets`
- **Exit Routes**: `/admin/storage/assets/:mediaId`, `/admin/storage`
- **Back Navigation**: `/admin/storage`
- **Deep Link**: `https://admin.memoria.local/storage/assets`

#### 3. Personas & Authorization
- **Eligible Roles**: Platform Superadmin, Infrastructure Admin
- **Required Capabilities**: `view_media_metadata`, `reprocess_media`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Breadcrumbs (Admin > Storage > Media Inspector), search bar by Media UUID or filename, and filter by status (Ready, Processing, Failed).
- **Main Content**: 1. Asset Technical Inspector Card: Media ID, Original Filename, MIME type, File Size, SHA-256 Checksum, Storage Key path, 2. EXIF Data Grid: Camera model, Lens, Exposure, Date Taken, GPS coordinates (redacted for privacy), Color Space (sRGB/Display P3), 3. Derivative Generation Health: Thumbnail (300x300), Web (1600x1200), Print Master (300 DPI CMYK), 4. Processing log stream.
- **Footer / Actions Bar**: Action bar: 'Re-generate Derivatives', 'Re-extract EXIF Metadata', 'Download Original'.

#### 5. Interactive Controls & UI Elements
- Media UUID / filename search input
- Re-generate Derivatives button (dispatches BullMQ job)
- Re-extract EXIF button
- View Raw JSON metadata modal button
- Download Original Asset button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Media UUID search input`
- **Tab Sequence**: `Search input` -> `Metadata grid` -> `Derivative cards` -> `Re-generate button`
- **Escape Key Action**: Pops back to storage directory

#### 8. States Matrix
- **Loading State**: Technical inspector skeleton shimmer.
- **Empty State**: Notice: 'No media asset selected. Enter Media ID or select from storage directory.'
- **Populated State**: Complete technical dossier with derivative previews and processing logs.
- **Error State**: Error banner: 'Asset not found or media metadata corrupted.'
- **Offline Mode**: Offline indicator; inspection requires live database access.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA compliant
- **Screen Reader Summary**: "Media technical inspector for asset IMG_8912.jpeg. 3 derivatives generated successfully. EXIF capture date June 18, 1984. Double tap to re-process."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Vertical stack of metadata cards and derivative status list.
- **Tablet (768px – 1024px)**: Two-column layout: Asset overview on left, EXIF and derivatives on right.
- **Desktop (> 1024px)**: Three-column technical workstation: Metadata, EXIF inspector, and live derivative canvas.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/admin/media/:mediaId/reprocess`
- **Authorization**: `Bearer JWT + Admin Role`
- **Request Payload**: `{ pipeline: 'derivatives' | 'exif' | 'all' }`
- **Response Payload**: `{ success: true, data: { jobId: string, status: 'queued' } }`
- **Status Codes**: `200 OK`, `400 Bad Request`, `401 Unauthorized`, `404 Not Found`

#### 13. Service Architecture & Persistence
- **Backend Service**: `media-service`
- **Database Tables**: `media_assets`, `outbox_events`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `media.reprocessing_requested`
- **BullMQ Background Jobs**: `generate-image-derivatives`, `extract-media-exif`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Admin Audited`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Inspects technical file headers; personal photo bytes never logged to telemetry.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] parses raw EXIF tags into human-readable aperture and ISO strings
  - [ ] validates SHA-256 hash formatting
- **Integration Tests**:
  - [ ] POST /api/admin/media/:id/reprocess enqueues generate-image-derivatives BullMQ job
- **End-to-End Acceptance Tests**:
  - [ ] searches media UUID, clicks Re-generate Derivatives, verifies queued toast notification

#### 17. UI Component Inventory
`TechnicalInspectorCard`, `EXIFMetadataGrid`, `DerivativeHealthRow`, `LogStreamConsole`, `Button`

---

### ADMIN-10 — Active Upload Sessions & Presigned Token Telemetry Console

**Category**: Admin Portal — Storage & Media Infrastructure  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Monitor in-flight client chunk uploads, presigned upload tokens, transfer rates, expired sessions, and network interruptions.
- **User Story**: "As an infrastructure admin, I want to view active client upload sessions and diagnose stalled client transfers in real time."

#### 2. Navigation & Routing
- **Entry Routes**: `/admin/storage`, `/admin/uploads`
- **Exit Routes**: `/admin/storage`, `/admin/queues`
- **Back Navigation**: `/admin/storage`
- **Deep Link**: `https://admin.memoria.local/uploads`

#### 3. Personas & Authorization
- **Eligible Roles**: Platform Superadmin, Infrastructure Admin
- **Required Capabilities**: `view_upload_telemetry`, `abort_upload_sessions`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Breadcrumbs (Admin > Uploads), active sessions counter badge ('8 active transfers'), and aggregate bandwidth throughput indicator.
- **Main Content**: 1. Uploads telemetry grid: Session ID, User/Space ID, Filename, Size, Uploaded Bytes (Progress Bar), Transfer Speed (e.g. 4.2 MB/s), Status (In Progress, Stalled, Completed, Expired), 2. Token Security Inspector: Token issuance timestamp, HMAC signature validity, expiration countdown.
- **Footer / Actions Bar**: Bulk cleanup bar: 'Abort Stalled Sessions', 'Purge Expired Upload Slots'.

#### 5. Interactive Controls & UI Elements
- Abort Upload Session button per row
- Filter sessions by status (Active, Stalled, Expired)
- Auto-refresh interval selector (5s, 15s, 30s)
- Purge Expired Sessions button
- Search by Space ID or Session ID

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First active upload row`
- **Tab Sequence**: `Filter chips` -> `Upload table` -> `Abort buttons` -> `Purge button`
- **Escape Key Action**: Resets table filters

#### 8. States Matrix
- **Loading State**: Transfer table skeleton shimmer with pulsing progress bars.
- **Empty State**: Notice: 'No active upload sessions in progress. All transfers quiescent.'
- **Populated State**: Live updating transfer table with animated progress stripes and speed meters.
- **Error State**: Error banner: 'Failed to stream upload session telemetry.'
- **Offline Mode**: Offline indicator; live transfer telemetry requires active connection.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA compliant
- **Screen Reader Summary**: "Active upload sessions telemetry. 8 transfers in progress. Total throughput 12 megabytes per second. Double tap any row to inspect."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Card list view showing filename, progress bar, and speed.
- **Tablet (768px – 1024px)**: Compact table with essential transfer metrics.
- **Desktop (> 1024px)**: Full data table with inline progress bars, chunk telemetry, and token inspector.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/admin/uploads/sessions`
- **Authorization**: `Bearer JWT + Admin Role`
- **Response Payload**: `{ success: true, data: { sessions: Array<UploadSessionTelemetry>, aggregateSpeedBytesPerSec: number } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `media-service / LocalDiskStorageDriver`
- **Database Tables**: `media_assets`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `admin.upload_telemetry_viewed`
- **BullMQ Background Jobs**: `cleanup-expired-upload-sessions`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Admin Audited`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Tracks transfer byte rates and token states without reading user file content.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] calculates transfer completion percentage accurately
  - [ ] formats transfer speed in MB/s
- **Integration Tests**:
  - [ ] GET /api/admin/uploads/sessions returns list of active upload records
- **End-to-End Acceptance Tests**:
  - [ ] opens uploads console, verifies active upload progress updates smoothly every 5 seconds

#### 17. UI Component Inventory
`UploadSessionsTable`, `TransferProgressBar`, `SpeedGaugeBadge`, `Button`

---

### 3.4 Background Processing & Engine Telemetry (ADMIN-11 to ADMIN-15)

### ADMIN-11 — BullMQ Background Queue Monitor & Worker Fleet Console

**Category**: Admin Portal — Background Processing & Engine Telemetry  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Monitor background job queues (media processing, OCR, book PDF generation, email notifications, maintenance) and worker concurrency.
- **User Story**: "As an operations engineer, I want to monitor BullMQ queue latency, active worker concurrency, and job throughput to ensure zero processing backlogs."

#### 2. Navigation & Routing
- **Entry Routes**: `/admin`, `/admin/queues`
- **Exit Routes**: `/admin/queues/dlq`, `/admin/queues/:queueName`, `/admin/dashboard`
- **Back Navigation**: `/admin/dashboard`
- **Deep Link**: `https://admin.memoria.local/queues`

#### 3. Personas & Authorization
- **Eligible Roles**: Platform Superadmin, Infrastructure Admin
- **Required Capabilities**: `view_queues`, `manage_queue_workers`, `pause_queues`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Breadcrumbs (Admin > Queues), global queue throughput card (e.g. '124 jobs/min • 0 failed'), and 'Pause All Queues' emergency button.
- **Main Content**: 1. Queue Cards Grid: `media-processing`, `book-rendering`, `ocr-extraction`, `notifications`, `database-maintenance`, 2. Per-Queue Telemetry: Waiting, Active, Completed, Failed, Delayed job counts, 3. Worker Fleet Panel: Active worker threads, CPU load, memory consumption, job duration histograms.
- **Footer / Actions Bar**: Queue control actions: 'Pause Queue', 'Resume Queue', 'Drain Completed Jobs'.

#### 5. Interactive Controls & UI Elements
- Pause / Resume Queue button per queue
- Drain Completed Jobs button (cleans Redis memory)
- Worker concurrency slider (1 to 8 workers)
- Auto-refresh toggle (3s, 10s, 30s)
- Navigate to Dead-Letter Queue button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First queue card`
- **Tab Sequence**: `Pause button` -> `Queue cards` -> `Worker panel` -> `DLQ button`
- **Escape Key Action**: Resets queue selection

#### 8. States Matrix
- **Loading State**: Queue cards skeleton shimmer with pulsing gauge bars.
- **Empty State**: Notice: 'All queues idle. 0 jobs waiting or processing.'
- **Populated State**: Real-time updated queue telemetry with active worker indicators and latency meters.
- **Error State**: Error banner: 'Failed to connect to Redis / BullMQ telemetry bus.'
- **Offline Mode**: Offline indicator; queue controls disabled.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA compliant
- **Screen Reader Summary**: "BullMQ queue monitor. 5 queues active. Media processing queue has 3 active jobs, 0 failed. Double tap to inspect."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Card list view showing queue name and job count pills.
- **Tablet (768px – 1024px)**: 2-column queue cards layout with quick pause buttons.
- **Desktop (> 1024px)**: Full grid view with real-time throughput sparklines and worker telemetry.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/admin/queues/telemetry`
- **Authorization**: `Bearer JWT + Admin Role`
- **Response Payload**: `{ success: true, data: { queues: Array<QueueStats>, totalThroughput: number } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `jobs package / Redis BullMQ`
- **Database Tables**: _None (Stateless / InMemory)_
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `admin.queues_viewed`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Admin Audited`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Job telemetry displays queue names and execution counts without payload PII.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] aggregates total waiting and active jobs across all queues
  - [ ] validates worker concurrency limits
- **Integration Tests**:
  - [ ] GET /api/admin/queues/telemetry returns structured queue counts from BullMQ
- **End-to-End Acceptance Tests**:
  - [ ] opens queue dashboard, pauses media queue, verifies status updates to Paused, resumes queue

#### 17. UI Component Inventory
`QueueCard`, `JobCountBadgeGroup`, `WorkerFleetPanel`, `ThroughputSparkline`, `Button`

---

### ADMIN-12 — Dead-Letter Queue (DLQ) & Failed Job Retry Console

**Category**: Admin Portal — Background Processing & Engine Telemetry  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Inspect failed asynchronous background jobs, analyze stack traces and error causes, edit job parameters, and dispatch bulk retries.
- **User Story**: "As an operations engineer, I want to inspect dead-letter jobs, read the root cause stack trace, and retry them after fixing network or file issues."

#### 2. Navigation & Routing
- **Entry Routes**: `/admin/queues`, `/admin/queues/dlq`
- **Exit Routes**: `/admin/queues`, `/admin/dashboard`
- **Back Navigation**: `/admin/queues`
- **Deep Link**: `https://admin.memoria.local/queues/dlq`

#### 3. Personas & Authorization
- **Eligible Roles**: Platform Superadmin, Infrastructure Admin
- **Required Capabilities**: `manage_dlq`, `retry_failed_jobs`, `purge_failed_jobs`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Breadcrumbs (Admin > Queues > Dead-Letter Queue), failed jobs counter ('2 failed jobs'), and 'Retry All Failed' button.
- **Main Content**: 1. Failed Jobs Table: Job ID, Queue Name, Job Name, Failed At, Attempts (e.g. 3/3), Error Message summary, Action buttons (Retry, Discard, Inspect), 2. Job Stack Trace Inspector: Full error stack, original input payload, worker hostname, execution duration.
- **Footer / Actions Bar**: Bulk actions bar: 'Retry Selected', 'Discard Selected (Permanent)'.

#### 5. Interactive Controls & UI Elements
- Retry Single Job button per row
- Retry All Failed Jobs button in header
- Discard / Purge Job button
- Inspect Stack Trace drawer toggle
- Filter by Queue Name dropdown
- Search by Job ID or Error Keyword

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Retry All button`
- **Tab Sequence**: `Retry All` -> `Filter dropdown` -> `Failed jobs table` -> `Stack trace inspector`
- **Escape Key Action**: Closes stack trace drawer

#### 8. States Matrix
- **Loading State**: DLQ table skeleton shimmer.
- **Empty State**: Notice: 'Dead-letter queue is completely empty. Zero failed jobs!' with celebration checkmark.
- **Populated State**: Detailed table of failed jobs with red error chips and collapsible stack traces.
- **Error State**: Error banner: 'Failed to load dead-letter queue records.'
- **Offline Mode**: Offline indicator; retries cannot be dispatched offline.
- **Permission Denied**: 403 Forbidden screen.

#### 9. Confirmation & Cancellation Workflows
Discarding jobs permanently prompts: 'Discard [count] failed jobs? Job data will be removed from Redis DLQ without reprocessing.'

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA compliant
- **Screen Reader Summary**: "Dead letter queue. 2 failed jobs. First failure: Book PDF compilation in book-rendering queue. Double tap to inspect stack trace or retry."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Card list view showing failed job name, error snippet, and retry button.
- **Tablet (768px – 1024px)**: Compact table with stack trace modal sheet.
- **Desktop (> 1024px)**: Full table with side-by-side stack trace inspector and payload viewer.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/admin/queues/:queueName/jobs/:jobId/retry`
- **Authorization**: `Bearer JWT + Admin Role`
- **Response Payload**: `{ success: true, data: { jobId: string, newJobId: string, status: 'retried' } }`
- **Status Codes**: `200 OK`, `400 Bad Request`, `401 Unauthorized`, `404 Not Found`

#### 13. Service Architecture & Persistence
- **Backend Service**: `jobs package / Redis BullMQ`
- **Database Tables**: _None (Stateless / InMemory)_
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `admin.job_retried`, `admin.dlq_cleared`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Admin Audited`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Stack traces and job retry operations are logged in security audit records.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] formats stack trace lines with syntax highlighting
  - [ ] filters out sensitive tokens from job payloads in viewer
- **Integration Tests**:
  - [ ] POST /api/admin/queues/:queue/jobs/:id/retry re-enqueues failed job into BullMQ active queue
- **End-to-End Acceptance Tests**:
  - [ ] selects failed job, clicks Inspect, reads stack trace, clicks Retry, verifies job disappears from DLQ

#### 17. UI Component Inventory
`DLQTable`, `StackTraceDrawer`, `ErrorChip`, `PayloadViewer`, `Button`

---

### ADMIN-13 — Microservice Topology, Health & Resource Telemetry Console

**Category**: Admin Portal — Background Processing & Engine Telemetry  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Inspect the operational health, CPU, memory usage, latency percentiles (p50, p95, p99), and gRPC/REST connectivity across all Memoria microservices.
- **User Story**: "As a backend systems engineer, I want to inspect microservice telemetry (api-gateway, identity, memory, media, book) to identify bottlenecks."

#### 2. Navigation & Routing
- **Entry Routes**: `/admin`, `/admin/services`
- **Exit Routes**: `/admin/services/:serviceName`, `/admin/dashboard`
- **Back Navigation**: `/admin/dashboard`
- **Deep Link**: `https://admin.memoria.local/services`

#### 3. Personas & Authorization
- **Eligible Roles**: Platform Superadmin, Infrastructure Admin
- **Required Capabilities**: `view_microservices_telemetry`, `manage_services`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Breadcrumbs (Admin > Services), cluster health badge ('5 of 5 Services Healthy'), and average response latency ('38ms').
- **Main Content**: 1. Service Mesh Cards: `api-gateway` (Port 4000), `identity-service` (Port 4001 / gRPC 50051), `memory-service` (Port 4002 / gRPC 50052), `media-service` (Port 4003 / gRPC 50053), `book-service` (Port 4004 / gRPC 50054), 2. Per-Service Telemetry: Process Uptime, Memory RSS / Heap Used, CPU %, gRPC connection pool status, NATS event bus subscriber status, 3. Latency Percentiles chart (p50, p95, p99).
- **Footer / Actions Bar**: Service control bar: 'Trigger Health Check', 'Inspect Environment Flags'.

#### 5. Interactive Controls & UI Elements
- Trigger Service Health Ping button
- Timeframe selector (15m, 1h, 6h, 24h)
- Service Card tap (opens deep telemetry drawer)
- Copy Service Endpoint button
- Inspect gRPC Channel Pool status button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First service card`
- **Tab Sequence**: `Health Ping button` -> `Service cards` -> `Latency chart`
- **Escape Key Action**: Closes deep telemetry drawer

#### 8. States Matrix
- **Loading State**: Service cards skeleton shimmer with pulsing CPU meters.
- **Empty State**: Notice: 'No microservices detected on registry.'
- **Populated State**: Dynamic cards with green status beacons, live memory gauges, and response time sparklines.
- **Error State**: Critical alert banner: 'Service `media-service` unreachable via gRPC health check!'
- **Offline Mode**: Offline indicator; telemetry connection lost.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA compliant
- **Screen Reader Summary**: "Microservice health console. All 5 services operational. Gateway latency 38 milliseconds. Memory usage normal."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Single column stacked service health cards.
- **Tablet (768px – 1024px)**: Two-column service grid with compact latency charts.
- **Desktop (> 1024px)**: Five-column service topology view with real-time latency waterfall.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/admin/services/health`
- **Authorization**: `Bearer JWT + Admin Role`
- **Response Payload**: `{ success: true, data: { services: Array<MicroserviceHealthSummary>, clusterUptimeSeconds: number } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `api-gateway / all microservices`
- **Database Tables**: _None (Stateless / InMemory)_
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `admin.services_health_checked`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Admin Audited`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: System metrics monitor server process resources; zero customer data inspected.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] formats uptime seconds to days, hours, minutes
  - [ ] calculates p95 and p99 percentiles from latency samples
- **Integration Tests**:
  - [ ] GET /api/admin/services/health polls gRPC and HTTP health endpoints for all 5 services
- **End-to-End Acceptance Tests**:
  - [ ] loads services console, verifies all 5 service cards show green beacon and valid port numbers

#### 17. UI Component Inventory
`ServiceTopologyCard`, `HealthBeaconBadge`, `ResourceGauge`, `LatencyPercentileChart`, `Button`

---

### ADMIN-14 — Book Rendering, Three.js 3D & PDF Compilation Monitor

**Category**: Admin Portal — Background Processing & Engine Telemetry  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Monitor digital book 3D model generation, page spread layout engines, Puppeteer / PDFKit CMYK compilation, and render queues.
- **User Story**: "As a publishing engineer, I want to track PDF compilation jobs and 3D GLTF asset compression to ensure books compile in under 30 seconds."

#### 2. Navigation & Routing
- **Entry Routes**: `/admin`, `/admin/books/rendering`
- **Exit Routes**: `/admin/books`, `/admin/queues`
- **Back Navigation**: `/admin/dashboard`
- **Deep Link**: `https://admin.memoria.local/books/rendering`

#### 3. Personas & Authorization
- **Eligible Roles**: Platform Superadmin, Infrastructure Admin, Publishing Specialist
- **Required Capabilities**: `view_book_rendering`, `manage_compilation_jobs`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Breadcrumbs (Admin > Books > Rendering), active compilations badge ('2 jobs rendering'), and average compile duration ('18.4s').
- **Main Content**: 1. Compilation Job Queue: Book ID, Title, Format (8x10 Hardcover), Total Pages (e.g. 64), Target Output (Print PDF CMYK vs WebGL GLTF 3D), Stage (Rasterizing Pages -> Bleed Margin Check -> CMYK Profile Conversion -> PDF Assembly), Progress %, Elapsed Time, 2. PDF Engine Telemetry: Memory allocation, font subsetting status, image downsampling cache, 3. Render failure log drawer.
- **Footer / Actions Bar**: Control actions: 'Cancel Compilation', 'Re-render Book', 'Inspect Output Artifact'.

#### 5. Interactive Controls & UI Elements
- Cancel Compilation button per active job
- Re-render Book button (prompts Book UUID input)
- Download Output PDF / GLTF button
- Filter by Output Type (Print CMYK PDF, 3D WebGL Model)
- View Compilation Logs toggle

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First rendering job row`
- **Tab Sequence**: `Filter chips` -> `Jobs table` -> `Re-render button` -> `Logs toggle`
- **Escape Key Action**: Dismisses log drawer

#### 8. States Matrix
- **Loading State**: Compilation table skeleton shimmer with animated progress stripes.
- **Empty State**: Notice: 'No active book rendering jobs. Engine ready for new book orders.'
- **Populated State**: Live rendering status table with stage indicators and thumbnail page previews.
- **Error State**: Error banner: 'PDF compilation worker encountered memory exception.'
- **Offline Mode**: Offline indicator; live rendering telemetry requires active connection.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA compliant
- **Screen Reader Summary**: "Book rendering monitor. 2 jobs currently compiling. Vance Family Chronicle at 74 percent, stage CMYK conversion. Double tap to inspect."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Card list view showing book title, rendering stage, and progress bar.
- **Tablet (768px – 1024px)**: Compact table with rendering stage pills and cancel buttons.
- **Desktop (> 1024px)**: Full rendering console with live stage waterfall and PDF engine telemetry.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/admin/books/rendering/jobs`
- **Authorization**: `Bearer JWT + Admin Role`
- **Response Payload**: `{ success: true, data: { activeJobs: Array<BookRenderingJob>, averageDurationSec: number } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `book-service / jobs package`
- **Database Tables**: `books`, `book_spreads`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `admin.book_rendering_monitored`
- **BullMQ Background Jobs**: `generate-print-cmyk-pdf`, `generate-book-3d-model`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Admin Audited`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Inspects compilation performance and page metrics; book text remains confidential.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] calculates overall compilation percentage based on weighted stages
  - [ ] formats elapsed seconds with 1 decimal precision
- **Integration Tests**:
  - [ ] GET /api/admin/books/rendering/jobs returns active BullMQ rendering jobs
- **End-to-End Acceptance Tests**:
  - [ ] opens monitor, observes active book compile job progress from 20% to 100%, verifies artifact generation

#### 17. UI Component Inventory
`CompilationTable`, `StageProgressBar`, `OutputArtifactCard`, `EngineTelemetryBox`, `Button`

---

### ADMIN-15 — Print Preflight Inspection Telemetry & Margin Validator Console

**Category**: Admin Portal — Background Processing & Engine Telemetry  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Analyze automated print preflight validation results across all ordered books (DPI audits, CMYK ink limits, bleed safety margins, signature multiples).
- **User Story**: "As a prepress quality engineer, I want to review preflight audit logs across customer books to catch print defects before physical printing."

#### 2. Navigation & Routing
- **Entry Routes**: `/admin/books`, `/admin/preflight`
- **Exit Routes**: `/admin/orders`, `/admin/books`
- **Back Navigation**: `/admin/dashboard`
- **Deep Link**: `https://admin.memoria.local/preflight`

#### 3. Personas & Authorization
- **Eligible Roles**: Platform Superadmin, Publishing Specialist, Prepress Operator
- **Required Capabilities**: `view_preflight_telemetry`, `override_preflight_warning`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Breadcrumbs (Admin > Preflight), preflight pass rate badge (e.g. '98.4% First-Pass Yield'), and filter by check status (Pass, Warn, Fail).
- **Main Content**: 1. Preflight Audit Summary: DPI Validation (>=300 DPI), Bleed Margins (0.125 inch bleed), Signature Page Multiple (Divisible by 4), CMYK Total Area Coverage (TAC <= 300%), 2. Recent Preflight Audits Table: Book ID, Space, Pages, Status (Passed, Warning Overridden, Failed), Critical Warnings count, Preflight Date, 3. Inspection Drawer: Visual spread preview highlighting low-DPI photos or margin violations in orange overlay.
- **Footer / Actions Bar**: Admin Override bar: 'Override Warnings & Approve for Print' (requires prepress sign-off notes).

#### 5. Interactive Controls & UI Elements
- Filter by preflight check result (Pass, Warning, Fail)
- Inspect Book Preflight Report button
- Override Warnings button (with mandatory prepress operator signature)
- Export Preflight Summary report (PDF/CSV)
- Search by Book UUID or Order ID

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First preflight audit row`
- **Tab Sequence**: `Filter chips` -> `Audit table` -> `Inspection drawer` -> `Override button`
- **Escape Key Action**: Dismisses inspection drawer

#### 8. States Matrix
- **Loading State**: Preflight table skeleton shimmer with pulsing status pills.
- **Empty State**: Notice: 'No recent preflight audits recorded.'
- **Populated State**: Comprehensive audit records with green checkmarks, amber warning chips, and resolution coordinates.
- **Error State**: Error banner: 'Failed to retrieve preflight telemetry.'
- **Offline Mode**: Offline indicator; preflight overrides require active connection.
- **Permission Denied**: 403 Forbidden screen.

#### 9. Confirmation & Cancellation Workflows
Overriding preflight warnings prompts: 'Approve book with low-resolution warnings for physical press? Customer will receive printed output as-is.'

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA compliant
- **Screen Reader Summary**: "Print preflight telemetry console. 98.4 percent pass rate. Double tap any audit row to inspect page-by-page technical results."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Card list view showing book name, pass/fail status, and warning count.
- **Tablet (768px – 1024px)**: Compact table with preflight report modal sheet.
- **Desktop (> 1024px)**: Full table with split screen visual spread inspector showing margin overlay boxes.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/admin/preflight/:bookId/override`
- **Authorization**: `Bearer JWT + Admin Role`
- **Request Payload**: `{ reason: string, operatorNotes: string }`
- **Response Payload**: `{ success: true, data: { bookId: string, status: 'overridden', approvedAt: string } }`
- **Status Codes**: `200 OK`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `book-service`
- **Database Tables**: `books`, `book_spreads`, `outbox_events`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `preflight.warning_overridden`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Admin Audited`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Preflight overrides and prepress operator identities are recorded in quality audit logs.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] verifies that page count is divisible by 4 for case-bound books
  - [ ] flags TAC above 300% as critical warning
- **Integration Tests**:
  - [ ] POST /api/admin/preflight/:id/override updates book print status to approved
- **End-to-End Acceptance Tests**:
  - [ ] opens book with 1 warning, inspects margin overlay on page 12, enters override reason, verifies status changes to Approved

#### 17. UI Component Inventory
`PreflightAuditTable`, `MarginOverlayPreview`, `PreflightMetricCard`, `OverrideModal`, `Button`

---

### 3.5 Physical Print & Commerce Operations (ADMIN-16 to ADMIN-21)

### ADMIN-16 — Physical Print Catalog, Materials & Paper Stocks Manager

**Category**: Admin Portal — Physical Print & Commerce Operations  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Manage physical book product offerings, dimensions (8x10, 6x8, 10x12), paper stock weights (148gsm archival matte), cloth cover fabrics, and foil colors.
- **User Story**: "As a product manager, I want to manage physical specifications, toggle available linen fabrics, and configure foil stamping options."

#### 2. Navigation & Routing
- **Entry Routes**: `/admin`, `/admin/catalog`
- **Exit Routes**: `/admin/pricing`, `/admin/orders`
- **Back Navigation**: `/admin/dashboard`
- **Deep Link**: `https://admin.memoria.local/catalog`

#### 3. Personas & Authorization
- **Eligible Roles**: Platform Superadmin, Product Manager, Publishing Specialist
- **Required Capabilities**: `manage_catalog`, `edit_materials`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Breadcrumbs (Admin > Catalog), page title 'Print Catalog & Material Specifications', and 'Add New Book Format' button.
- **Main Content**: 1. Format Cards: Standard 8x10 Hardcover, Compact 6x8 Keepsake, Deluxe 10x12 Heirloom (dimensions, spine calculation formulas, min/max page limits), 2. Paper Stocks Inventory: 148gsm Archival Matte, 170gsm Lustre, 200gsm Heavy Art Cotton, 3. Cloth & Cover Fabric Swatches: Deep Ink #20242C, Heritage Plum #76556F, Forest Sage #849483, Warm Ochre #D8973C, 4. Metallic Foil Options: Gold Leaf, Silver Foil, Rose Gold, Blind Deboss.
- **Footer / Actions Bar**: Save Catalog Changes floating bar with pending modifications counter.

#### 5. Interactive Controls & UI Elements
- Add Book Format button (opens configuration modal)
- Toggle Material Availability switch per swatch
- Edit Spine Formula text field
- Min / Max Page limit numeric steppers
- Save Changes button (commits to database)

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First format card`
- **Tab Sequence**: `Add Format button` -> `Format cards` -> `Material swatches` -> `Save button`
- **Escape Key Action**: Discards uncommitted changes

#### 8. States Matrix
- **Loading State**: Catalog cards skeleton shimmer.
- **Empty State**: Notice: 'No physical book formats configured in catalog.'
- **Populated State**: Rich visual cards with physical dimension schematics, swatch preview chips, and page limits.
- **Error State**: Error banner: 'Failed to load print catalog.'
- **Offline Mode**: Offline indicator; modifications disabled.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA compliant
- **Screen Reader Summary**: "Print catalog manager. 3 formats configured. Standard 8 by 10 hardcover active with 4 cloth colors and 4 foil options. Double tap to edit."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Card list view with expandable material sections.
- **Tablet (768px – 1024px)**: Two-column grid of formats and materials.
- **Desktop (> 1024px)**: Three-column modular layout: Formats, Paper stocks, and Cloth/Foil finishes.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `PUT` `/api/admin/catalog/formats/:formatId`
- **Authorization**: `Bearer JWT + Admin Role`
- **Request Payload**: `{ dimensions: string, minPages: number, maxPages: number, availableMaterials: Array<string>, spineMmPerPage: number }`
- **Response Payload**: `{ success: true, data: { format: CatalogFormat } }`
- **Status Codes**: `200 OK`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `commerce-service / book-service`
- **Database Tables**: `print_catalog_formats`, `outbox_events`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `catalog.format_updated`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Product catalog modifications are tracked in operational audit logs.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] calculates book spine thickness based on page count and paper weight formula
  - [ ] validates min/max page bounds
- **Integration Tests**:
  - [ ] PUT /api/admin/catalog/formats/:id updates database record and emits outbox event
- **End-to-End Acceptance Tests**:
  - [ ] toggles Forest Sage swatch off, clicks Save, verifies swatch reflects disabled state

#### 17. UI Component Inventory
`FormatCard`, `MaterialSwatchGrid`, `DimensionSchematicBox`, `PageLimitStepper`, `Button`

---

### ADMIN-17 — Product Pricing Matrix, Shipping Zones & Tax Rate Manager

**Category**: Admin Portal — Physical Print & Commerce Operations  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Configure retail book prices, base costs, additional page fees, international shipping rates, and regional sales tax rules.
- **User Story**: "As an operations lead, I want to adjust base book prices and configure flat-rate domestic shipping tiers to maintain sustainable margins."

#### 2. Navigation & Routing
- **Entry Routes**: `/admin/catalog`, `/admin/pricing`
- **Exit Routes**: `/admin/catalog`, `/admin/orders`
- **Back Navigation**: `/admin/catalog`
- **Deep Link**: `https://admin.memoria.local/pricing`

#### 3. Personas & Authorization
- **Eligible Roles**: Platform Superadmin, Product Manager, Finance Lead
- **Required Capabilities**: `manage_pricing`, `edit_shipping_rates`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Breadcrumbs (Admin > Pricing), currency selector (USD, EUR, GBP, CAD), and 'Save Pricing Matrix' button.
- **Main Content**: 1. Base Product Pricing Table: Format, Base Pages (e.g. 48), Base Price (e.g. $74.00), Cost per Additional 4 Pages (e.g. $3.50), Deluxe Fabric Surcharge, 2. Shipping Zone Matrix: Domestic Ground ($9.00), Express ($18.00), International ($28.00), Archival Box Add-on ($15.00), 3. Tax Nexus & Rules table.
- **Footer / Actions Bar**: Margin calculator summary card (calculates estimated gross margin percentage based on current pricing).

#### 5. Interactive Controls & UI Elements
- Base price numeric inputs (formatted as currency)
- Additional page increment fee inputs
- Shipping rate tier inputs by zone
- Currency selector dropdown
- Save Pricing Matrix button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First price input field`
- **Tab Sequence**: `Currency dropdown` -> `Pricing table inputs` -> `Shipping inputs` -> `Save button`
- **Escape Key Action**: Discards uncommitted price edits

#### 8. States Matrix
- **Loading State**: Pricing table skeleton shimmer.
- **Empty State**: Notice: 'Pricing matrix uninitialized.'
- **Populated State**: Structured pricing grid with inline editable currency inputs and live margin percentage calculations.
- **Error State**: Error banner: 'Failed to save pricing changes. Please verify numeric inputs.'
- **Offline Mode**: Offline indicator; pricing edits disabled.
- **Permission Denied**: 403 Forbidden screen.

#### 9. Confirmation & Cancellation Workflows
Saving pricing modifications prompts confirmation: 'Apply updated price matrix to all future book checkout sessions?'

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA compliant
- **Screen Reader Summary**: "Product pricing matrix. Standard 8 by 10 hardcover base price is 74 dollars for 48 pages. Double tap input to edit."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Card list view with currency input rows.
- **Tablet (768px – 1024px)**: Compact table with editable inputs.
- **Desktop (> 1024px)**: Full financial matrix with real-time margin calculation sidebar.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/admin/pricing/matrix`
- **Authorization**: `Bearer JWT + Admin Role`
- **Request Payload**: `{ currency: string, items: Array<PricingItem>, shippingZones: Array<ShippingZoneRate> }`
- **Response Payload**: `{ success: true, data: { version: string, updatedCount: number } }`
- **Status Codes**: `200 OK`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `commerce-service`
- **Database Tables**: `pricing_matrix`, `shipping_rates`, `outbox_events`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `pricing.matrix_updated`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Pricing changes are recorded with admin identity in financial audit logs.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] validates all prices are positive numbers
  - [ ] computes estimated gross margin given cost of goods input
- **Integration Tests**:
  - [ ] POST /api/admin/pricing/matrix writes pricing rows and publishes pricing.matrix_updated event
- **End-to-End Acceptance Tests**:
  - [ ] edits Standard book price from $74 to $78, clicks Save, verifies updated price persists

#### 17. UI Component Inventory
`PricingTable`, `CurrencyInputField`, `ShippingZoneCard`, `MarginSummaryBox`, `Button`

---

### ADMIN-18 — Physical Print Order Processing & Fulfillment Queue

**Category**: Admin Portal — Physical Print & Commerce Operations  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Track incoming customer print orders, monitor prepress verification, batch print jobs, and advance fulfillment stages.
- **User Story**: "As a print fulfillment operator, I want to view all submitted book orders and advance them to 'In Production' after prepress approval."

#### 2. Navigation & Routing
- **Entry Routes**: `/admin`, `/admin/orders`
- **Exit Routes**: `/admin/orders/:orderId`, `/admin/orders/refunds`
- **Back Navigation**: `/admin/dashboard`
- **Deep Link**: `https://admin.memoria.local/orders`

#### 3. Personas & Authorization
- **Eligible Roles**: Platform Superadmin, Publishing Specialist, Print Operator
- **Required Capabilities**: `view_orders`, `process_orders`, `manage_fulfillment`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Breadcrumbs (Admin > Orders), active orders counter ('18 in queue'), and stage filter tabs (Submitted, Preflight Approved, In Production, Shipped, Delivered).
- **Main Content**: 1. Orders Queue Table: Order Number (#MEM-8921), Customer Name/Email, Book Title, Format, Quantity, Total Amount ($84.00), Order Date, Stage Status pill, Action button, 2. Batch operations bar: 'Send Selected to Press', 'Download Batch Print PDFs', 3. Filter sidebar (Date range, Format, Shipping Speed).
- **Footer / Actions Bar**: Pagination bar with total orders count and export orders CSV button.

#### 5. Interactive Controls & UI Elements
- Stage tab filters (Submitted, In Production, Shipped)
- Row action button: 'Inspect Order & Production Details'
- Select all orders checkbox
- Batch action button: 'Advance to In Production'
- Search input by Order Number or Customer Email

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Order search input`
- **Tab Sequence**: `Stage tabs` -> `Search input` -> `Orders table` -> `Batch actions` -> `Pagination`
- **Escape Key Action**: Resets order search

#### 8. States Matrix
- **Loading State**: Orders queue skeleton shimmer.
- **Empty State**: Notice: 'No orders matching current stage filter.'
- **Populated State**: Detailed table of customer orders with format badges, quantities, and production stage pills.
- **Error State**: Error banner: 'Failed to retrieve print orders.'
- **Offline Mode**: Offline indicator; order status updates disabled.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA compliant
- **Screen Reader Summary**: "Print orders queue. 18 active orders. Showing page 1. First order: MEM-8921 for Vance Family Chronicle, quantity 1, stage Submitted. Double tap to view."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Card list view showing order number, title, amount, and stage pill.
- **Tablet (768px – 1024px)**: Compact table with horizontal scrolling for address details.
- **Desktop (> 1024px)**: Full enterprise data grid with batch selection, stage filters, and export tools.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/admin/orders`
- **Authorization**: `Bearer JWT + Admin Role`
- **Request Payload**: `Query: { page: number, limit: number, status?: string, search?: string }`
- **Response Payload**: `{ success: true, data: { orders: Array<AdminOrderSummary>, total: number } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `commerce-service`
- **Database Tables**: `print_orders`, `books`, `users`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `admin.orders_viewed`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Order recipient addresses and customer emails are accessed under strict fulfillment audits.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] filters orders array by fulfillment stage accurately
  - [ ] computes total order revenue across active items
- **Integration Tests**:
  - [ ] GET /api/admin/orders returns paginated orders with customer metadata
- **End-to-End Acceptance Tests**:
  - [ ] filters by Submitted status, selects first order, advances to In Production, verifies stage pill updates

#### 17. UI Component Inventory
`OrdersTable`, `StageFilterTabGroup`, `BatchActionBar`, `SearchInput`, `Button`

---

### ADMIN-19 — Order Detail, Shipping Tracking Injection & Fulfillment Dossier

**Category**: Admin Portal — Physical Print & Commerce Operations  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Inspect an individual print order, view shipping destination, inject carrier tracking numbers (FedEx, UPS, DHL), and trigger customer shipment notifications.
- **User Story**: "As a fulfillment specialist, I want to input the courier tracking number and mark an order as shipped so the customer receives their tracking link."

#### 2. Navigation & Routing
- **Entry Routes**: `/admin/orders`, `/admin/orders/:orderId`
- **Exit Routes**: `/admin/orders`, `/admin/orders/refunds`
- **Back Navigation**: `/admin/orders`
- **Deep Link**: `https://admin.memoria.local/orders/:orderId`

#### 3. Personas & Authorization
- **Eligible Roles**: Platform Superadmin, Publishing Specialist, Print Operator
- **Required Capabilities**: `view_order_details`, `update_order_shipping`, `manage_fulfillment`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Breadcrumbs (Admin > Orders > [Order #]), order title card with status pill, creation date, and 'Download Print PDF' button.
- **Main Content**: 1. Order Overview: Customer Name, Email, Book Title, Format, Quantity, Total Amount Paid ($84.00), Payment ID, 2. Shipping Address Dossier: Recipient Name, Street Address, City, State, ZIP, Country, Shipping Method (Express), 3. Carrier Tracking Injection Card: Carrier selector (FedEx, UPS, USPS, DHL), Tracking Number text field, Tracking URL preview, 4. Order Production History log (Submitted -> Preflight Passed -> Sent to Press -> Bound -> Shipped).
- **Footer / Actions Bar**: Action bar: 'Mark as Shipped & Send Tracking Email' (primary CTA), 'Issue Refund' (secondary).

#### 5. Interactive Controls & UI Elements
- Carrier selector dropdown (FedEx, UPS, USPS, DHL)
- Tracking Number input field
- Mark as Shipped button (validates tracking number, dispatches customer email)
- Download High-Resolution CMYK Print PDF button
- Issue Refund button (routes to ADMIN-20)

#### 6. Form Validation & Data Schema

| Field Name | Data Type | Required | Limits & Constraints | Validation Rule | Error Copy |
|---|---|---|---|---|---|
| `carrier` | `select` | **Yes** | N/A | Standard type validation | Please select a courier carrier. |
| `trackingNumber` | `text` | **Yes** | 8-40 characters | Standard type validation | Please enter a valid tracking number. |

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Tracking Number input`
- **Tab Sequence**: `Download PDF button` -> `Carrier dropdown` -> `Tracking input` -> `Mark as Shipped button`
- **Escape Key Action**: Pops back to orders list

#### 8. States Matrix
- **Loading State**: Order detail skeleton shimmer.
- **Empty State**: Notice: 'Order not found.'
- **Populated State**: Complete customer order record with verified address format and production history.
- **Error State**: Error banner: 'Failed to update order tracking details.'
- **Offline Mode**: Offline indicator; shipping updates require active connection.
- **Permission Denied**: 403 Forbidden screen.

#### 9. Confirmation & Cancellation Workflows
Marking as Shipped prompts: 'Mark order as shipped with tracking [trackingNumber]? Customer notification email will be dispatched immediately.'

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA compliant
- **Screen Reader Summary**: "Order detail for order MEM-8921. 1 copy of Vance Family Chronicle. Shipped to Jane Vance in Portland, Oregon. Double tap to enter tracking number."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Single column scroll view of order cards and tracking form.
- **Tablet (768px – 1024px)**: Two-column layout: Order and address on left, tracking form and history on right.
- **Desktop (> 1024px)**: Three-column modular console: Order summary, shipping injection, and production audit timeline.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/admin/orders/:orderId/ship`
- **Authorization**: `Bearer JWT + Admin Role`
- **Request Payload**: `{ carrier: string, trackingNumber: string, trackingUrl?: string }`
- **Response Payload**: `{ success: true, data: { orderId: string, status: 'shipped', shippedAt: string } }`
- **Status Codes**: `200 OK`, `400 Bad Request`, `401 Unauthorized`, `404 Not Found`

#### 13. Service Architecture & Persistence
- **Backend Service**: `commerce-service`
- **Database Tables**: `print_orders`, `outbox_events`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `order.shipped`
- **BullMQ Background Jobs**: `send-shipping-notification-email`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Shipping addresses are treated as strictly confidential PII and audited upon inspection.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] constructs carrier tracking URL based on carrier enum and tracking code
  - [ ] validates tracking number length
- **Integration Tests**:
  - [ ] POST /api/admin/orders/:id/ship writes tracking data and enqueues customer notification email
- **End-to-End Acceptance Tests**:
  - [ ] inputs FedEx tracking number, clicks Mark as Shipped, verifies status updates to Shipped and toast confirms email

#### 17. UI Component Inventory
`OrderDetailCard`, `ShippingAddressBox`, `CarrierTrackingForm`, `ProductionTimeline`, `Button`

---

### ADMIN-20 — Refund, Cancellation & Remake Request Manager

**Category**: Admin Portal — Physical Print & Commerce Operations  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Process customer refund requests, authorize print damage remakes, handle order cancellations within the grace window, and document refund reasons.
- **User Story**: "As a customer support manager, I want to review a damaged book report, authorize a free reprint remake, or issue a full refund."

#### 2. Navigation & Routing
- **Entry Routes**: `/admin/orders`, `/admin/orders/:orderId`, `/admin/refunds`
- **Exit Routes**: `/admin/orders/:orderId`, `/admin/transactions`
- **Back Navigation**: `/admin/orders`
- **Deep Link**: `https://admin.memoria.local/refunds`

#### 3. Personas & Authorization
- **Eligible Roles**: Platform Superadmin, Finance Lead, Support Lead
- **Required Capabilities**: `manage_refunds`, `authorize_remakes`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Breadcrumbs (Admin > Refunds & Remakes), open requests badge ('2 pending refund requests'), and total refunded this month card ($168.00).
- **Main Content**: 1. Refund Requests Table: Request ID, Order #, Customer, Amount, Reason (Print Defect, Shipping Damage, Late Delivery, Cancellation), Date Requested, Status, 2. Refund Decision Modal: Full vs Partial refund amount input, 'Authorize Free Remake' option, Customer notice message editor, Internal finance notes.
- **Footer / Actions Bar**: Action bar: 'Process Refund', 'Authorize Remake (Zero Cost Order)', 'Decline Request'.

#### 5. Interactive Controls & UI Elements
- Process Full Refund button
- Process Partial Refund button (with amount input)
- Authorize Remake button (spawns replacement print order)
- Decline Refund button (with mandatory explanation)
- Refund reason category dropdown

#### 6. Form Validation & Data Schema

| Field Name | Data Type | Required | Limits & Constraints | Validation Rule | Error Copy |
|---|---|---|---|---|---|
| `refundAmountCents` | `number` | **Yes** | N/A | Standard type validation | Refund amount cannot exceed original order total. |
| `reasonCategory` | `select` | **Yes** | N/A | Standard type validation | Please select a refund reason category. |
| `internalNotes` | `text` | **Yes** | 10-500 characters | Standard type validation | Please document the justification for this refund. |

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First pending refund row`
- **Tab Sequence**: `Refunds table` -> `Amount input` -> `Reason dropdown` -> `Process button`
- **Escape Key Action**: Dismisses decision modal

#### 8. States Matrix
- **Loading State**: Refunds table skeleton shimmer.
- **Empty State**: Notice: 'No pending refund or remake requests.'
- **Populated State**: Detailed table with customer photos of damaged prints, payment transaction IDs, and decision actions.
- **Error State**: Error banner: 'Failed to process refund through payment gateway.'
- **Offline Mode**: Offline indicator; financial operations disabled offline.
- **Permission Denied**: 403 Forbidden screen.

#### 9. Confirmation & Cancellation Workflows
Processing refund prompts double confirmation: 'Issue refund of [amount] for order [orderId]? Transaction cannot be reversed.'

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA compliant
- **Screen Reader Summary**: "Refund and cancellation manager. 2 pending requests. First request: Order MEM-8921 requesting remake for cover scuffing. Double tap to review."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Card list view with refund amount and quick review button.
- **Tablet (768px – 1024px)**: Compact table with decision modal sheet.
- **Desktop (> 1024px)**: Full financial dispute console with side-by-side evidence inspection and payment gateway telemetry.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/admin/orders/:orderId/refund`
- **Authorization**: `Bearer JWT + Admin Role`
- **Request Payload**: `{ amountCents: number, reasonCategory: string, internalNotes: string, actionType: 'refund' | 'remake' }`
- **Response Payload**: `{ success: true, data: { refundId: string, status: 'processed', refundedCents: number } }`
- **Status Codes**: `200 OK`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `commerce-service`
- **Database Tables**: `print_orders`, `order_refunds`, `outbox_events`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `order.refunded`, `order.remake_authorized`
- **BullMQ Background Jobs**: `send-refund-notification-email`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Refund amounts and rationale are logged to immutable financial audit records.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] prevents refund amount greater than order total_cents
  - [ ] validates mandatory finance note
- **Integration Tests**:
  - [ ] POST /api/admin/orders/:id/refund records refund in database and emits outbox event
- **End-to-End Acceptance Tests**:
  - [ ] opens refund request, selects Full Refund with justification, confirms modal, verifies order status updates to Refunded

#### 17. UI Component Inventory
`RefundsTable`, `DamageEvidencePreview`, `RefundDecisionModal`, `AmountInputField`, `Button`

---

### ADMIN-21 — Payment Gateway Logs, Transaction Ledger & Status Overview

**Category**: Admin Portal — Physical Print & Commerce Operations  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Audit raw payment transaction events, Apple Pay tokens, webhook deliveries, settlement statuses, and reconciliation mismatches.
- **User Story**: "As a finance engineer, I want to review payment webhook logs and transaction settlement statuses to reconcile daily commerce revenue."

#### 2. Navigation & Routing
- **Entry Routes**: `/admin/orders`, `/admin/transactions`
- **Exit Routes**: `/admin/orders/:orderId`, `/admin/dashboard`
- **Back Navigation**: `/admin/orders`
- **Deep Link**: `https://admin.memoria.local/transactions`

#### 3. Personas & Authorization
- **Eligible Roles**: Platform Superadmin, Finance Lead
- **Required Capabilities**: `view_transactions`, `reconcile_payments`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Breadcrumbs (Admin > Transactions), total volume card ($2,480.00 today), and transaction search by Payment ID or Order #.
- **Main Content**: 1. Transaction Ledger Table: Transaction ID, Order #, Customer, Amount, Payment Method (Apple Pay, Credit Card), Gateway Response (200 OK, Authorized, Settled), Timestamp, Status pill, 2. Webhook Event Inspector Drawer: Raw payload, signature header, webhook retry count, delivery latency.
- **Footer / Actions Bar**: Export financial ledger CSV / QuickBooks format button.

#### 5. Interactive Controls & UI Elements
- Search input by Transaction ID or Order Number
- Filter by payment status (Settled, Authorized, Failed, Refunded)
- Inspect Webhook Payload button
- Re-deliver Webhook button (for failed webhook retries)
- Export Ledger button (CSV)

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Transaction search input`
- **Tab Sequence**: `Search input` -> `Status filter` -> `Ledger table` -> `Inspect Webhook button`
- **Escape Key Action**: Closes webhook inspector drawer

#### 8. States Matrix
- **Loading State**: Transaction ledger skeleton shimmer.
- **Empty State**: Notice: 'No transactions recorded for selected period.'
- **Populated State**: Detailed ledger table with monospace transaction hashes and color-coded status badges.
- **Error State**: Error banner: 'Failed to retrieve transaction ledger.'
- **Offline Mode**: Offline indicator; financial ledger requires live connection.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA compliant
- **Screen Reader Summary**: "Transaction ledger. 42 transactions recorded today. Double tap any transaction to inspect payment webhook details."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Card list view showing transaction amount, payment method, and status.
- **Tablet (768px – 1024px)**: Compact table with transaction details modal.
- **Desktop (> 1024px)**: Full financial audit ledger with side-by-side webhook payload viewer.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/admin/transactions`
- **Authorization**: `Bearer JWT + Admin Role`
- **Request Payload**: `Query: { page: number, limit: number, status?: string, date?: string }`
- **Response Payload**: `{ success: true, data: { transactions: Array<TransactionRecord>, totalVolumeCents: number } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `commerce-service`
- **Database Tables**: `payment_transactions`, `print_orders`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `admin.transactions_viewed`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `High - Confidential`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Cardholder data is tokenized; zero raw card numbers stored or displayed.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] formats cents into currency string with decimal
  - [ ] verifies webhook signature hashing logic
- **Integration Tests**:
  - [ ] GET /api/admin/transactions returns paginated transaction records
- **End-to-End Acceptance Tests**:
  - [ ] searches transaction by order ID, clicks Inspect Webhook, validates 200 OK delivery status

#### 17. UI Component Inventory
`TransactionLedgerTable`, `WebhookInspectorDrawer`, `VolumeSummaryCard`, `SearchInput`, `Button`

---

### 3.6 System Governance, Security & Audit (ADMIN-22 to ADMIN-26)

### ADMIN-22 — System Notification & Email Template Architecture Studio

**Category**: Admin Portal — System Governance, Security & Audit  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Author, preview, and test system transactional emails (Welcome, Invite, Memory Prompt, Order Receipt, Shipping Notification) in responsive HTML.
- **User Story**: "As a communications manager, I want to edit transactional email templates with brand typography (Cormorant Garamond) and test rendered previews."

#### 2. Navigation & Routing
- **Entry Routes**: `/admin`, `/admin/templates`
- **Exit Routes**: `/admin/dashboard`, `/admin/settings`
- **Back Navigation**: `/admin/dashboard`
- **Deep Link**: `https://admin.memoria.local/templates`

#### 3. Personas & Authorization
- **Eligible Roles**: Platform Superadmin, Product Manager, Support Lead
- **Required Capabilities**: `manage_email_templates`, `send_test_email`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Breadcrumbs (Admin > Templates), template selector dropdown, language locale picker (en-US), and 'Send Test Email' button.
- **Main Content**: 1. Template List Sidebar: Welcome to Memoria, Space Invitation, Daily Memory Prompt, Order Confirmation & Receipt, Order Shipped with Tracking, Password Reset, 2. Split Workspace: Left side Monaco / code editor with MJML / Handlebars template markup, Right side live responsive rendered HTML iframe (Desktop and Mobile view toggles), 3. Dynamic test variables JSON editor.
- **Footer / Actions Bar**: Save Template button with version history comparison link.

#### 5. Interactive Controls & UI Elements
- Template selector dropdown
- Code editor (MJML / HTML / Handlebars)
- Live preview device toggle (Mobile vs Desktop)
- Send Test Email button (prompts recipient email)
- Save Template button
- Restore Default Template button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Code editor`
- **Tab Sequence**: `Template selector` -> `Code editor` -> `Variable editor` -> `Send Test button` -> `Save button`
- **Escape Key Action**: Discards unsaved template edits

#### 8. States Matrix
- **Loading State**: Template workspace skeleton shimmer.
- **Empty State**: Notice: 'Select a template from the library to begin editing.'
- **Populated State**: Syntax-highlighted template markup on left and pixel-perfect rendered email preview on right.
- **Error State**: Error banner: 'Handlebars syntax error in template markup at line 14.'
- **Offline Mode**: Offline indicator; saving templates requires active connection.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA compliant
- **Screen Reader Summary**: "Notification template editor. Currently editing Order Shipped template. Double tap code editor to modify markup."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Tabbed view toggling between code editor and rendered preview.
- **Tablet (768px – 1024px)**: Side-by-side editor and preview with variable drawer.
- **Desktop (> 1024px)**: Three-pane design studio: Templates sidebar, code editor, and live responsive previewer.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `PUT` `/api/admin/templates/:templateKey`
- **Authorization**: `Bearer JWT + Admin Role`
- **Request Payload**: `{ subject: string, htmlBody: string, textBody: string, sampleVariables: Record<string, any> }`
- **Response Payload**: `{ success: true, data: { templateKey: string, version: number, updatedAt: string } }`
- **Status Codes**: `200 OK`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `identity-service`
- **Database Tables**: `email_templates`, `outbox_events`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `template.updated`
- **BullMQ Background Jobs**: `send-test-email`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Low`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Template modifications are recorded in audit logs with author and diff.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] renders Handlebars sample variables without syntax error
  - [ ] validates MJML compiles to valid HTML
- **Integration Tests**:
  - [ ] PUT /api/admin/templates/:key updates template in database and enqueues test email
- **End-to-End Acceptance Tests**:
  - [ ] selects Invite template, edits subject line, previews in mobile frame, clicks Send Test Email

#### 17. UI Component Inventory
`TemplateSidebar`, `MonacoCodeEditor`, `LiveEmailPreviewFrame`, `VariableJsonEditor`, `Button`

---

### ADMIN-23 — Dynamic Feature Flag & Staged Rollout Manager

**Category**: Admin Portal — System Governance, Security & Audit  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Toggle platform feature flags (e.g. `realitykit_3d_viewer`, `whisper_voice_transcription`, `tesseract_ocr`, `apple_pay_checkout`), configure rollout percentages, and restrict beta features.
- **User Story**: "As an engineering lead, I want to toggle feature flags dynamically with percentage rollouts without redeploying microservices."

#### 2. Navigation & Routing
- **Entry Routes**: `/admin`, `/admin/feature-flags`
- **Exit Routes**: `/admin/dashboard`, `/admin/settings`
- **Back Navigation**: `/admin/dashboard`
- **Deep Link**: `https://admin.memoria.local/feature-flags`

#### 3. Personas & Authorization
- **Eligible Roles**: Platform Superadmin, Infrastructure Admin, Engineering Lead
- **Required Capabilities**: `manage_feature_flags`, `toggle_system_features`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Breadcrumbs (Admin > Feature Flags), active flags count ('12 flags active'), and 'Create New Feature Flag' button.
- **Main Content**: 1. Feature Flags Table: Flag Key (`tesseract_ocr_enabled`, `realitykit_bookshelf`, `apple_pay_v2`), Description, Status toggle (Enabled/Disabled), Rollout Percentage slider (0% to 100%), Target Audience (All, Beta Testers, Internal Admins Only), Last Modified timestamp, 2. Audit Trail drawer showing flag change history.
- **Footer / Actions Bar**: Save Flags button (dispatches real-time flag invalidation via NATS JetStream).

#### 5. Interactive Controls & UI Elements
- Feature Flag toggle switch per row
- Rollout Percentage slider (0% to 100%)
- Target Audience dropdown (All Users, Beta Group, Admin Only)
- Create New Flag button (opens modal)
- Delete Flag button (with confirmation)

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First feature flag toggle`
- **Tab Sequence**: `Create Flag button` -> `Flag toggles` -> `Rollout sliders` -> `Save button`
- **Escape Key Action**: Dismisses modal

#### 8. States Matrix
- **Loading State**: Feature flags table skeleton shimmer.
- **Empty State**: Notice: 'No dynamic feature flags defined. Using code defaults.'
- **Populated State**: Interactive table with instant toggle switches and percentage sliders.
- **Error State**: Error banner: 'Failed to synchronize feature flags with configuration store.'
- **Offline Mode**: Offline indicator; flag changes disabled offline.
- **Permission Denied**: 403 Forbidden screen.

#### 9. Confirmation & Cancellation Workflows
Toggling a critical flag prompts: 'Update feature flag [flagKey] rollout to [percentage]%? Changes take effect immediately across all client sessions.'

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA compliant
- **Screen Reader Summary**: "Feature flag manager. 12 flags configured. Tesseract OCR is enabled at 100 percent. Double tap toggle to disable."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Card list view with flag name, status toggle, and percentage slider.
- **Tablet (768px – 1024px)**: Compact table with inline sliders.
- **Desktop (> 1024px)**: Full feature governance grid with rollout telemetry and user targeting rules.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `PATCH` `/api/admin/feature-flags/:flagKey`
- **Authorization**: `Bearer JWT + Admin Role`
- **Request Payload**: `{ isEnabled: boolean, rolloutPercentage: number, targetGroup?: string }`
- **Response Payload**: `{ success: true, data: { flagKey: string, isEnabled: boolean, rolloutPercentage: number } }`
- **Status Codes**: `200 OK`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `api-gateway / identity-service`
- **Database Tables**: `feature_flags`, `outbox_events`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `feature_flag.updated`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Admin Audited`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Feature flag state changes are permanently logged to security audit trail.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] enforces percentage bounds between 0 and 100
  - [ ] evaluates flag enablement against mock user UUID hash
- **Integration Tests**:
  - [ ] PATCH /api/admin/feature-flags/:key updates database and broadcasts NATS event
- **End-to-End Acceptance Tests**:
  - [ ] toggles realitykit_bookshelf from 50% to 100%, saves change, verifies update broadcast

#### 17. UI Component Inventory
`FeatureFlagsTable`, `ToggleSwitch`, `RolloutSlider`, `TargetGroupDropdown`, `Button`

---

### ADMIN-24 — Immutable Security Audit Logs & Access Forensics Console

**Category**: Admin Portal — System Governance, Security & Audit  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Review tamper-evident, append-only security audit logs covering all administrative actions, logins, permission escalations, and support sessions.
- **User Story**: "As an auditor or security officer, I want to search immutable audit logs by admin ID, action type, and date to verify full accountability."

#### 2. Navigation & Routing
- **Entry Routes**: `/admin`, `/admin/audit-logs`
- **Exit Routes**: `/admin/dashboard`, `/admin/users`
- **Back Navigation**: `/admin/dashboard`
- **Deep Link**: `https://admin.memoria.local/audit-logs`

#### 3. Personas & Authorization
- **Eligible Roles**: Platform Superadmin, Compliance Officer
- **Required Capabilities**: `view_security_audit_logs`, `export_audit_logs`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Breadcrumbs (Admin > Security Logs), audit integrity verification badge ('Cryptographic Chain Verified • 0 Tamper Events'), and Export Log Archive button.
- **Main Content**: 1. Audit Filter Bar: Actor Admin, Action Type (Login, Role Change, Session Revoke, Quota Override, Support Access), Date Range, IP Address, 2. Paginated Audit Table: Timestamp (ISO 8601), Actor, Action, Target Entity, IP Address, Geo Hint, Result (Success/Fail), Monospace Cryptographic SHA-256 Record Hash, 3. Audit Record Inspector drawer: Full before/after state diff, user agent string, session token hash.
- **Footer / Actions Bar**: Cryptographic verification verification bar: 'Verify Hash Chain'.

#### 5. Interactive Controls & UI Elements
- Filter by Action Type dropdown
- Filter by Actor Admin input
- Date range picker (Last 24h, 7d, 30d, Custom)
- Verify Hash Chain button (validates append-only SHA-256 chain)
- Export Signed Audit Log button (JSON / CSV with cryptographic signature)

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Action Type filter`
- **Tab Sequence**: `Action filter` -> `Date range` -> `Audit table` -> `Record inspector` -> `Verify Chain button`
- **Escape Key Action**: Closes record inspector

#### 8. States Matrix
- **Loading State**: Audit table skeleton shimmer with monospace hash placeholders.
- **Empty State**: Notice: 'No audit records match the specified search parameters.'
- **Populated State**: Cryptographically chained audit table with timestamp microsecond precision and before/after diffs.
- **Error State**: Error banner: 'Failed to retrieve security audit logs.'
- **Offline Mode**: Offline indicator; live audit logs require active connection.
- **Permission Denied**: 403 Forbidden screen: 'Compliance Officer or Superadmin role required.'

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA compliant
- **Screen Reader Summary**: "Security audit logs. Hash chain verified. 1,840 audit events recorded. Double tap any row to view record diff."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Card list view showing timestamp, actor, action, and result badge.
- **Tablet (768px – 1024px)**: Compact table with record detail drawer.
- **Desktop (> 1024px)**: Full enterprise security console with cryptographic chain validator and JSON diff inspector.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `GET` `/api/admin/audit-logs`
- **Authorization**: `Bearer JWT + Admin Role`
- **Request Payload**: `Query: { page: number, limit: number, actor?: string, action?: string, from?: string, to?: string }`
- **Response Payload**: `{ success: true, data: { logs: Array<AuditLogRecord>, total: number, chainValid: boolean } }`
- **Status Codes**: `200 OK`, `401 Unauthorized`, `403 Forbidden`

#### 13. Service Architecture & Persistence
- **Backend Service**: `identity-service`
- **Database Tables**: `audit_logs`
- **Transactional Outbox**: Disabled

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `admin.audit_logs_exported`
- **BullMQ Background Jobs**: `verify-audit-log-cryptographic-chain`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Admin Audited`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Audit logs are strictly append-only; records cannot be updated or deleted by any user or administrator.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] verifies that audit log chain hashes match SHA-256(previous_hash + current_record)
  - [ ] formats state diff correctly
- **Integration Tests**:
  - [ ] GET /api/admin/audit-logs returns immutable records in descending chronological order
- **End-to-End Acceptance Tests**:
  - [ ] filters by 'Session Revoke' action, inspects record diff, clicks Verify Hash Chain, receives positive validation toast

#### 17. UI Component Inventory
`AuditLogsTable`, `RecordDiffInspector`, `HashChainBadge`, `DateRangePicker`, `Button`

---

### ADMIN-25 — Customer Support Ticketing & Resolution Console

**Category**: Admin Portal — System Governance, Security & Audit  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Triage customer inquiries, assist users with scanning / audio upload issues, review book ordering questions, and respond to support tickets.
- **User Story**: "As an archival support specialist, I want to review incoming customer tickets, read diagnostic logs, and send helpful guidance."

#### 2. Navigation & Routing
- **Entry Routes**: `/admin`, `/admin/tickets`
- **Exit Routes**: `/admin/tickets/:ticketId`, `/admin/dashboard`
- **Back Navigation**: `/admin/dashboard`
- **Deep Link**: `https://admin.memoria.local/tickets`

#### 3. Personas & Authorization
- **Eligible Roles**: Platform Superadmin, Support Lead, Support Agent
- **Required Capabilities**: `manage_support_tickets`, `reply_to_tickets`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Breadcrumbs (Admin > Support Tickets), open tickets counter ('6 open tickets'), and ticket category filter (All, Book Printing, Audio Transcription, Account, Billing).
- **Main Content**: 1. Support Tickets Table: Ticket #, Customer Name, Email, Subject, Category, Priority (High/Normal/Low), Status (Open, In Progress, Waiting Customer, Resolved), Created Date, 2. Ticket Workspace Drawer: Customer message thread, attached diagnostic logs viewer, pre-written canned response macros dropdown, Reply message editor.
- **Footer / Actions Bar**: Ticket resolution bar: 'Send Reply', 'Resolve Ticket', 'Assign to Specialist'.

#### 5. Interactive Controls & UI Elements
- Category filter dropdown
- Status tab selector (Open, Waiting, Resolved)
- Canned response macros dropdown ('How to clean scanner glass', 'Audio format tips', 'Tracking help')
- Reply TextEditor input
- Send Reply button (sends email to customer and appends to thread)
- Resolve Ticket button

#### 6. Form Validation & Data Schema

| Field Name | Data Type | Required | Limits & Constraints | Validation Rule | Error Copy |
|---|---|---|---|---|---|
| `replyMessage` | `text` | **Yes** | 5-2000 characters | Standard type validation | Please enter a reply message. |

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `First open ticket row`
- **Tab Sequence**: `Category filter` -> `Tickets table` -> `Reply editor` -> `Macros dropdown` -> `Send button`
- **Escape Key Action**: Closes ticket workspace drawer

#### 8. States Matrix
- **Loading State**: Tickets table skeleton shimmer.
- **Empty State**: Notice: 'Zero open support tickets. Inbox zero achieved!' with archival emblem.
- **Populated State**: Detailed tickets queue with customer avatar, priority badges, and thread length indicators.
- **Error State**: Error banner: 'Failed to retrieve support tickets.'
- **Offline Mode**: Offline indicator; ticket replies disabled offline.
- **Permission Denied**: 403 Forbidden screen.

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA compliant
- **Screen Reader Summary**: "Customer support ticketing console. 6 open tickets. First ticket: Audio upload failing for grandfather interview. Double tap to open thread."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Disabled (natural page flow)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Card list view with customer inquiry and tap-to-reply sheet.
- **Tablet (768px – 1024px)**: Two-pane layout with ticket list on left and conversation thread on right.
- **Desktop (> 1024px)**: Full support desk console with conversation thread, macros picker, and diagnostic inspector.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/admin/tickets/:ticketId/reply`
- **Authorization**: `Bearer JWT + Admin Role`
- **Request Payload**: `{ message: string, newStatus?: string, internalNote?: boolean }`
- **Response Payload**: `{ success: true, data: { ticketId: string, replyId: string, status: string } }`
- **Status Codes**: `201 Created`, `400 Bad Request`, `401 Unauthorized`, `404 Not Found`

#### 13. Service Architecture & Persistence
- **Backend Service**: `identity-service`
- **Database Tables**: `support_tickets`, `support_replies`, `outbox_events`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `support.reply_sent`
- **BullMQ Background Jobs**: `send-support-reply-email`

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Admin Audited`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Support communications are preserved for customer service quality assurance.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] validates reply message length requirement
  - [ ] applies canned macro text to reply box
- **Integration Tests**:
  - [ ] POST /api/admin/tickets/:id/reply stores reply and dispatches customer email outbox event
- **End-to-End Acceptance Tests**:
  - [ ] opens ticket, inserts canned macro, clicks Send Reply, verifies status changes to Waiting on Customer

#### 17. UI Component Inventory
`TicketsTable`, `ConversationThreadView`, `CannedMacroPicker`, `ReplyEditorBox`, `Button`

---

### ADMIN-26 — Admin Personal Profile, Hardware 2FA & FIDO2 Security Keys

**Category**: Admin Portal — System Governance, Security & Audit  
**Verified Status**: `Implemented (UI/Route Scaffolded)`

#### 1. Core Intent & User Story
- **User Goal**: Manage administrative credentials, enroll physical FIDO2 / WebAuthn hardware security keys (YubiKey), configure TOTP 2FA, and inspect personal admin session history.
- **User Story**: "As an administrator, I want to register my hardware YubiKey and configure biometric passkeys to satisfy dual-custody security standards."

#### 2. Navigation & Routing
- **Entry Routes**: `/admin`, `/admin/profile`
- **Exit Routes**: `/admin/dashboard`, `/admin/login`
- **Back Navigation**: `/admin/dashboard`
- **Deep Link**: `https://admin.memoria.local/profile`

#### 3. Personas & Authorization
- **Eligible Roles**: Platform Superadmin, Operations Admin, Compliance Officer, Support Agent
- **Required Capabilities**: `manage_own_admin_profile`, `enroll_fido2_keys`
- **Authentication Required**: Yes (Authenticated Session)

#### 4. Content Hierarchy & Visual Wireframe
- **Header**: Breadcrumbs (Admin > My Security Profile), admin badge card, role badge ('Platform Superadmin'), and session expiry countdown.
- **Main Content**: 1. Admin Identity Card: Display Name, Work Email, Assigned Role, Account Created Date, 2. Hardware Security Keys & FIDO2 (WebAuthn): Registered YubiKeys list (Key Name, Enrolled Date, Last Used), 'Register New Security Key' button, 3. Time-Based One-Time Password (TOTP) Authenticator: Authenticator App status, Re-configure QR code, 4. Active Admin Sessions: Device, IP, login time, Revoke Session button.
- **Footer / Actions Bar**: Destructive Emergency Sign Out button (invalidates all admin tokens).

#### 5. Interactive Controls & UI Elements
- Register New Security Key button (initiates WebAuthn navigator.credentials.create flow)
- Rename / Remove Security Key button
- Configure TOTP Authenticator button
- Revoke Session button
- Sign Out of Admin Portal button

#### 7. Focus Management & Keyboard Navigation
- **Initial Focus**: `Register New Security Key button`
- **Tab Sequence**: `Identity card` -> `Register Key button` -> `Security keys list` -> `TOTP section` -> `Sign Out button`
- **Escape Key Action**: Cancels WebAuthn prompt

#### 8. States Matrix
- **Loading State**: Profile skeleton cards and security keys list shimmer.
- **Empty State**: Notice: 'No hardware keys registered. We strongly recommend enrolling a FIDO2 key for elevated privileges.'
- **Populated State**: Complete security profile with active hardware key listings and green 2FA verified beacon.
- **Error State**: Error banner: 'WebAuthn hardware key registration failed or was cancelled by user.'
- **Offline Mode**: Offline indicator; security key registration requires online identity verification.
- **Permission Denied**: 403 Forbidden screen.

#### 9. Confirmation & Cancellation Workflows
Removing a hardware security key prompts: 'Remove security key [KeyName]? At least one 2FA method must remain registered.'

#### 10. Accessibility (WCAG 2.2 AA / VoiceOver)
- **Standard**: WCAG 2.2 AA compliant
- **Screen Reader Summary**: "Admin security profile. 2FA is active. 1 YubiKey registered. Double tap Register New Security Key to add another hardware key."
- **Touch Target Minimum**: `44x44 px`
- **Focus Trapping**: Enforced (modal context)
- **Contrast Ratio**: `7.2:1`

#### 11. Responsive & Adaptive Layouts
- **Mobile (< 768px)**: Single column card stack for admin profile and 2FA settings.
- **Tablet (768px – 1024px)**: Two-column grid: Admin identity on left, hardware keys and TOTP on right.
- **Desktop (> 1024px)**: Three-column security center: Profile, WebAuthn keys, and active admin session telemetry.

#### 12. API Contract & Network Communication
- **Method & Endpoint**: `POST` `/api/admin/profile/webauthn/register`
- **Authorization**: `Bearer JWT + Admin Role`
- **Request Payload**: `{ credential: PublicKeyCredentialJSON, name: string }`
- **Response Payload**: `{ success: true, data: { keyId: string, name: string, enrolledAt: string } }`
- **Status Codes**: `201 Created`, `400 Bad Request`, `401 Unauthorized`

#### 13. Service Architecture & Persistence
- **Backend Service**: `identity-service`
- **Database Tables**: `admin_users`, `admin_security_keys`, `audit_logs`
- **Transactional Outbox**: **Enabled** (Guarantees at-least-once distributed event publishing)

#### 14. Event Contracts & Background Jobs
- **Events Emitted**: `admin.security_key_registered`
- **BullMQ Background Jobs**: _None_

#### 15. Audit Logging & Data Sovereignty
- **PII Sensitivity Level**: `Admin Audited`
- **Security Audit Logged**: **Yes** (Appended to immutable audit ledger)
- **Privacy Architecture**: Security key registrations and 2FA modifications are recorded in the security audit ledger.

#### 16. Test Acceptance Criteria
- **Unit Tests**:
  - [ ] validates WebAuthn registration attestation response
  - [ ] requires at least one active 2FA method
- **Integration Tests**:
  - [ ] POST /api/admin/profile/webauthn/register stores public key credential in database
- **End-to-End Acceptance Tests**:
  - [ ] enrolls virtual authenticator key, verifies key appears in registered list with timestamp

#### 17. UI Component Inventory
`AdminProfileCard`, `FIDO2KeyList`, `WebAuthnPromptModal`, `TOTPConfigBox`, `Button`

---

## PART 4: MASTER TRACEABILITY MATRIX (ALL 164 SCREENS)

The following traceability matrix establishes the direct mapping between each screen, its user story, user interface components, API endpoints, microservices, database tables, event contracts, test acceptance criteria, and verified implementation status.

| Screen ID | User Story | UI Components | API Endpoint | Service | DB Tables | Events/Jobs | Test Criteria | Verified Status |
|---|---|---|---|---|---|---|---|---|
| `PWA-01` | As an archival storyteller or family historian, I want to explore Memoria's core capabilities and open a live 3D book preview so that I can understand how our memories will be preserved. | HeroSection, ExperienceCanvas, FeatureCards, PublicHeader (+1) | GET /api/public/featured-teaser | api-gateway | books (cached read) | Events: public.landing_viewed | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `PWA-02` | As a prospective archivist, I want to inspect each stage of Memoria's workflow so I know how our physical and digital memories will be converted into books. | WorkflowStepper, StageCard, ArchivalDiagram, PublicHeader | N/A N/A (Static page) | web | None | None | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-03` | As a parent or grandchild, I want to view realistic examples of my specific memory scenario so I can envision the final keepsake book. | FilterChipBar, UseCaseCard, PublicHeader | N/A N/A | web | None | None | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-04` | As an archivist seeking inspiration, I want to browse public memory books so I can evaluate typography and layout options. | GalleryGrid, BookCoverPreview, FormatFilter, PublicHeader | GET /api/public/books | book-service | books | Events: public.gallery_browsed | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-05` | As an archivist evaluating physical print fidelity, I want to interact with a realistic 3D book model on the web so I can verify page transitions and cover debossing. | ExperienceCanvas, ReaderHUD, PageTurnController, FlatProofFallback | GET /api/public/sample-book-model | book-service | books, book_spreads | Events: 3d.sample_reader_engaged | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `PWA-06` | As an privacy-conscious archivist, I want to review how Memoria ensures my data is stored locally without card-gated services or hidden costs. | StorageCalculator, TransparencyMatrix, PublicHeader | N/A N/A (Static page) | web | None | None | Unit: 1, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-07` | As an archivist scanning grandmother's photo albums, I want to read scanning DPI recommendations and submit questions if I encounter issues. | FAQAccordion, SearchInput, SupportForm, PublicHeader | POST /api/public/support-inquiry | api-gateway | audit_logs | Events: support.inquiry_submitted; Jobs: process-support-ticket | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-08` | As a new user, I want to create my personal archivist account so that I can begin creating family memory spaces. | AuthCard, InputField, PasswordStrengthMeter, Button (+1) | POST /api/auth/register | identity-service | users, user_sessions | Events: identity.user_registered; Jobs: send-welcome-email | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `PWA-09` | As a registered member, I want to sign in securely so I can access my spaces, books, and pending invites. | AuthCard, InputField, Button, Checkbox | POST /api/auth/login | identity-service | users, user_sessions | Events: identity.user_logged_in | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `PWA-10` | As a member who forgot my password, I want to request a reset link so I can regain access to my family memory space. | AuthCard, InputField, Button | POST /api/auth/forgot-password | identity-service | users, user_sessions | Events: identity.password_reset_requested; Jobs: send-password-reset-email | Unit: 1, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-11` | As an archivist with a valid recovery token, I want to set a new strong password so I can sign back in. | AuthCard, InputField, PasswordStrengthMeter, Button | POST /api/auth/reset-password | identity-service | users, user_sessions | Events: identity.password_reset_completed; Jobs: revoke-prior-sessions | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-12` | As a newly registered member, I want to verify my email so that I can receive collaboration invites and print notifications. | StatusBadge, Button, CooldownTimer | POST /api/auth/verify-email | identity-service | users | Events: identity.email_verified | Unit: 1, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-13` | As an invited family member, I want to review the inviter's space name and assigned role so I can join the collaborative archive. | InvitationCard, SpaceBadge, Button | POST /api/spaces/invitations/:token/accept | identity-service | space_invitations, space_members | Events: collab.invitation_accepted; Jobs: notify-space-owner | Unit: 1, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-14` | As a new user, I want to choose my primary memory purpose so that Memoria can customize initial prompts and book themes. | WizardHeader, PurposeCardGrid, OnboardingFooter | PATCH /api/users/me/onboarding | identity-service | users | Events: onboarding.purpose_selected | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-15` | As an archivist in onboarding, I want to configure my first space with a title, description, and privacy setting so my memories have a dedicated home. | SpaceForm, ColorSwatchPicker, Button | POST /api/spaces | memory-service | memory_spaces, space_members, space_storage_quotas | Events: memory.space_created; Jobs: initialize-space-defaults | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `PWA-16` | As an archivist, I want to add my child, ancestor, or family member's profile so that stories can be attached to them. | ProfileForm, TypeSelectorPill, AvatarUploadTrigger, Button | POST /api/spaces/:spaceId/profiles | memory-service | space_profiles | Events: memory.profile_created | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `PWA-17` | As an archivist, I want to invite my siblings and spouse so they can add photos and memories to our shared space. | InviteRowList, RoleSelectDropdown, Button | POST /api/spaces/:spaceId/invitations | memory-service | space_invitations | Events: collab.invitations_dispatched; Jobs: dispatch-invitation-emails | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-18` | As an archivist finishing onboarding, I want to drag-and-drop a few initial photos so my space immediately comes to life. | DropZone, UploadQueueItem, Button | POST /api/media/upload-session | media-service | media_assets, memories, memory_media | Events: media.uploaded, memory.created; Jobs: generate-derivatives, extract-exif-metadata | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `PWA-19` | As an archivist, I want a comprehensive personal dashboard so that I can see what happened today in our family history and quickly add new stories. | AppHeader, TodayInHistoryBanner, QuickCaptureBar, MemoryCard (+1) | GET /api/dashboard/overview | memory-service | memories, memory_spaces, space_storage_quotas | Events: dashboard.viewed | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `PWA-20` | As a member of multiple spaces (e.g. maternal family, paternal family, personal), I want to browse my spaces with member counts and role badges. | SpaceGrid, SpaceCard, SearchInput, Button | GET /api/spaces | memory-service | memory_spaces, space_members | None | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `PWA-21` | As a space owner, I want to edit our space details and cover photo so that our family members feel warmly welcomed. | Modal, InputField, ColorSwatchPicker, Button | PUT /api/spaces/:spaceId | memory-service | memory_spaces | Events: memory.space_updated | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `PWA-22` | As a space contributor, I want to view our family space overview so that I can see the latest additions and navigate to timeline or members. | SpaceHero, TabBar, FeaturedMemoryCard, ContributorStrip (+1) | GET /api/spaces/:spaceId | memory-service | memory_spaces, memories, space_members | Events: space.overview_viewed | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `PWA-23` | As a family member, I want to scroll through our chronological timeline from 1950 to 2024 so I can trace generations and milestones in order. | TimelineSpine, YearMarker, MilestoneCard, DecadeJumpNav | GET /api/spaces/:spaceId/timeline | memory-service | memories, memory_media, space_profiles | Events: timeline.browsed | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `PWA-24` | As a space owner, I want to view our member roster and change a relative from Viewer to Contributor so they can upload family photos. | MemberTable, RoleBadge, InviteModal, Button | GET /api/spaces/:spaceId/members | memory-service | space_members, users | Events: collab.member_role_changed, collab.member_removed | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-25` | As a space owner, I want to configure sharing permissions, export our complete archive, or transfer ownership safely. | SettingsLayout, ExportButton, DangerZoneCard, ConfirmModal | DELETE /api/spaces/:spaceId | memory-service | memory_spaces, audit_logs | Events: memory.space_deleted, memory.space_archived; Jobs: schedule-space-data-cleanup | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-26` | As a family storyteller, I want to view all people profiles so I can find every memory connected to my grandfather. | ProfileGrid, ProfileCard, SearchInput, Button | GET /api/spaces/:spaceId/profiles | memory-service | space_profiles, memory_profiles | None | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `PWA-27` | As a grandchild, I want to explore my grandmother's dedicated profile view so I can read her biography and see all photos of her. | ProfileHero, BiographyCard, MilestoneStrip, MemoryGrid (+1) | GET /api/spaces/:spaceId/profiles/:profileId | memory-service | space_profiles, memory_profiles, memories | Events: profile.detail_viewed | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `PWA-28` | As an archivist, I want to edit my child's profile photo and crop her face cleanly so her portrait looks sharp throughout the archive. | ProfileForm, AvatarCropper, Button | PUT /api/spaces/:spaceId/profiles/:profileId | memory-service | space_profiles | Events: memory.profile_updated | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `PWA-29` | As an archivist, I want to view all curated collections so I can organize memories into meaningful thematic albums before turning them into books. | CollectionGrid, CollectionCard, SortDropdown, Button | GET /api/spaces/:spaceId/collections | memory-service | tags, memory_tags, memories | None | Unit: 1, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-30` | As an archivist preparing a book, I want to curate and reorder memories within a collection and click 'Create Book from Collection'. | CollectionBanner, ReorderableGrid, BatchActionBar, Button | GET /api/spaces/:spaceId/collections/:collectionId | memory-service | memories, memory_tags, tags | Events: collection.viewed | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-31` | As an archivist, I want to create a collection titled 'Liam Year 1' and set a cover photo so I can group baby photos together. | CollectionForm, CoverSelector, Button | POST /api/spaces/:spaceId/collections | memory-service | tags | Events: collection.created | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-32` | As a collaborator, I want to inspect notifications so I know when grandmother commented on a photo or when a 3D book render finished. | NotificationList, NotificationItem, FilterTabs, Button | GET /api/notifications | identity-service | audit_logs | Events: notification.marked_read | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-33` | As an archivist, I want to view all family photos, documents, and recordings in a responsive gallery so I can easily find and review memories. | MasonryGrid, MemoryCard, FilterBar, DensityToggle | GET /api/spaces/:spaceId/memories | memory-service | memories, memory_media, media_assets | Events: archive.browsed | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `PWA-34` | As an archivist, I want a comprehensive timeline with a month-by-month index so I can trace historical progression across decades. | TimelineSpine, MonthHeader, TimelineCard, DecadeScrubber | GET /api/memories/timeline | memory-service | memories, memory_media | None | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `PWA-35` | As a family member, I want to open the calendar view for June to see all birthdays, wedding anniversaries, and summer vacations preserved on each date. | CalendarGrid, CalendarCell, AnniversaryBadge, DayInspectorPanel | GET /api/memories/calendar | memory-service | memories, space_profiles | None | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-36` | As an archivist looking for grandmother's handwritten recipe, I want to search 'pie crust' to find the scanned postcard matching OCR text. | SearchBar, FacetSidebar, SearchResultCard, MatchSnippet | GET /api/search | memory-service | memories, media_assets, tags, space_profiles | Events: search.executed | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `PWA-37` | As an archivist, I want to quickly review my favorited memories so I can select the best family photos for our annual heirloom book. | FavoritesGrid, MemoryCard, UndoToast, Button | GET /api/memories/favorites | memory-service | memories | None | Unit: 1, Int: 1, E2E: 1 | Implemented & Verified |
| `PWA-38` | As a family member, I want to open a memory to see the full photograph, read grandmother's handwritten recipe transcription, and listen to her voice recording. | MemoryModal, MediaCarousel, WaveformPlayer, StoryTypography (+1) | GET /api/memories/:memoryId | memory-service | memories, memory_media, media_assets, memory_profiles | Events: memory.viewed | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `PWA-39` | As an archivist, I want to choose whether I am uploading scanned photos, recording an audio story, or writing a memoir chapter. | TypeSelectionDialog, FormatOptionCard, Button | N/A N/A (Client-side routing dialog) | web | None | None | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `PWA-40` | As an archivist, I want to select 20 family photos from my local disk and upload them with real-time SHA-256 integrity verification. | UploadModal, DropZone, FileListPreview, ProgressBar (+1) | POST /api/media/upload-session | media-service | media_assets, space_storage_quotas | Events: media.upload_session_created | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `PWA-41` | As an archivist uploading 50 scanned family letters, I want a floating upload queue widget so I can continue browsing while processing finishes. | FloatingQueuePill, QueueList, QueueItem, ProgressBar (+1) | GET /api/media/upload-sessions/active | media-service | media_assets | Events: media.upload_progress_updated | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `PWA-42` | As an archivist working on an intermittent connection, I want to review failed uploads and resolve conflicts without losing either version. | FailureCard, ConflictResolver, Button | POST /api/media/upload-sessions/:sessionId/retry | media-service | media_assets, audit_logs | Events: media.upload_retried; Jobs: resume-media-upload | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-43` | As an archivist, I want to zoom in on a 1920 family portrait to examine faces in high detail without altering the original archival master. | NearBlackCanvas, PanZoomStage, ViewerHUD, CropOverlay | GET /api/media/:mediaId/original | media-service | media_assets | Events: media.original_viewed | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `PWA-44` | As an archivist, I want to watch a digitized 1985 Christmas home video and jump directly to the timestamp when baby walked. | VideoPlayer, CustomControls, TimestampList, CaptionOverlay | GET /api/media/:mediaId/stream | media-service | media_assets, memories | Events: media.video_played | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-45` | As an interviewer, I want to record grandfather telling the story of how he met grandmother, with live visual feedback and pause support. | AudioStudio, WaveformCanvas, RecordButton, TimerDisplay (+1) | POST /api/media/upload-audio | media-service | media_assets, memories | Events: media.audio_recorded; Jobs: generate-audio-waveform, transcribe-audio | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `PWA-46` | As an archivist, I want to compose a 2-page family story with pull quotes, drop caps, and italics that will print beautifully in our book. | RichTextEditor, EditorToolbar, MetadataDrawer, AutosaveBadge (+1) | POST /api/memories | memory-service | memories, memory_profiles, memory_tags | Events: memory.created; Jobs: index-memory-search | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `PWA-47` | As an archivist, I want to inspect a scanned 1918 birth certificate and view the machine OCR text side-by-side with confidence scores. | DocumentCanvas, OCRSplitView, PageNavigator, ConfidenceBadge | GET /api/media/:mediaId/ocr | media-service | media_assets | Events: document.ocr_viewed | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `PWA-48` | As an archivist, I want to review memories deleted in the last 30 days and restore a photo that was removed by mistake. | TrashGrid, DeletedMemoryCard, CountdownBadge, ConfirmDialog (+1) | POST /api/memories/:memoryId/restore | memory-service | memories, audit_logs | Events: memory.restored, memory.permanently_deleted; Jobs: purge-expired-trash | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-49` | As a space owner, I want to see which family members have not yet accepted their invitations and resend them. | InvitationTable, StatusBadge, CopyLinkButton, Button | GET /api/spaces/:spaceId/invitations | identity-service | space_invitations | Events: collab.invitation_revoked, collab.invitation_resent | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-50` | As an archivist, I want to allow my cousin to contribute photos but restrict her from ordering printed books or deleting memories. | PermissionMatrix, CheckboxToggle, Button | PUT /api/spaces/:spaceId/permissions | memory-service | space_members, audit_logs | Events: collab.permissions_updated | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-51` | As a space owner, I want to create a custom role called 'Junior Contributor' that can upload photos but needs owner approval to publish. | RoleForm, CapabilityChecklist, Button | POST /api/spaces/:spaceId/roles | memory-service | audit_logs | Events: collab.custom_role_created | Unit: 1, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-52` | As an archivist, I want to create a passphrase-protected share link for our 50th anniversary book so distant relatives can view it without registering. | ShareSettingsCard, CopyLinkButton, QRCodePreview, PassphraseInput | POST /api/spaces/:spaceId/share-link | memory-service | memory_spaces, audit_logs | Events: collab.share_link_generated | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-53` | As an archivist, I want to see what my sister uploaded yesterday so I can review her new photographs. | ActivityStream, ActivityItem, FilterBar | GET /api/spaces/:spaceId/activity | memory-service | audit_logs | None | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-54` | As an archivist, I want to compare revisions of a story to see what date correction was made and by whom. | RevisionList, DiffViewer, RestoreButton | GET /api/memories/:memoryId/history | memory-service | memories, audit_logs | Events: memory.history_inspected | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-55` | As a family member, I want to comment 'Is that Uncle Joe on the far left?' so my aunt can clarify the identification. | DiscussionThread, CommentItem, ReactionStrip, CommentInput | POST /api/memories/:memoryId/comments | memory-service | audit_logs | Events: collab.comment_added; Jobs: notify-space-contributors | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-56` | As an archivist, I want to see our family's printed and draft volumes resting on a digital library shelf so I can choose a book to read or edit. | BookshelfStage, BookSpineItem, ShelfControls, Button | GET /api/books | book-service | books, book_spreads | Events: bookshelf.viewed | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `PWA-57` | As an archivist, I want to inspect a book's status (Draft / Frozen for Print), view all contributors, and launch the 3D Reader. | BookOverviewCard, CoverFoilPreview, SpecList, ActionBar (+1) | GET /api/books/:bookId | book-service | books, book_spreads, users | Events: book.overview_viewed | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `PWA-58` | As an archivist, I want to start authoring an 8x10 hardcover book for our family heritage so I can begin selecting memories. | BookWizardHeader, FormatSelectorCard, InputField, Button | POST /api/books/drafts | book-service | books | Events: book.draft_initialized | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `PWA-59` | As an archivist, I want to select our family space and filter by grandmother's profile so only memories involving her are pulled into the book draft. | SourceSelector, ProfileChipGroup, DateRangeSlider, Button | PATCH /api/books/drafts/:draftBookId/sources | book-service | books | None | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-60` | As an archivist, I want to select 45 best photos from 120 candidates and automatically organize them by capture year. | CurationGrid, SelectionBadge, PageEstimator, Button | POST /api/books/drafts/:draftBookId/curate | book-service | books, book_spreads | Events: book.memories_curated; Jobs: generate-auto-spreads | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-61` | As an author, I want to create named chapters with divider title pages and reorder sections easily. | ChapterList, ChapterCard, DragHandle, Button | PUT /api/books/drafts/:draftBookId/chapters | book-service | books, book_spreads | None | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-62` | As an archivist, I want to select 'Editorial Classic' so our book uses elegant serif typography, generous margins, and pull-quote spreads. | ThemeCardGrid, SpreadPreviewModal, Button | POST /api/books/drafts/:draftBookId/generate-spreads | book-service | books, book_spreads | Events: book.spreads_generated; Jobs: compile-initial-book-spreads | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-63` | As an archivist, I want to select Forest Green leather with gold foil debossed tree-of-life emblem and inspect real-time reflections in 3D. | CoverCanvas, MaterialPicker, FoilSelector, SpineInput (+1) | PUT /api/books/:bookId/cover | book-service | books | Events: book.cover_updated; Jobs: render-cover-texture-cache | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `PWA-64` | As an archivist author, I want a publishing spread editor with safe margins, photo frame cropping, and text boxes to arrange our memories. | SpreadStudio, RulerCanvas, AssetTray, ElementInspector (+1) | PUT /api/books/:bookId/spreads/:spreadId | book-service | books, book_spreads | Events: book.spread_updated | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `PWA-65` | As an author, I want to drag Spread 12 before Spread 8 to reorganize our family vacation chapter. | PageManagerGrid, SpreadThumbnail, DragHandle, Button | PUT /api/books/:bookId/spreads/reorder | book-service | book_spreads | Events: book.spreads_reordered | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-66` | As an archivist, I want to adjust the focal point on grandfather's face inside a circular portrait frame so he is centered without cropping his hat. | CropModal, FocalReticle, DPIMeter, Button | PATCH /api/books/:bookId/spreads/:spreadId/elements/:elementId | book-service | book_spreads | None | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-67` | As an archivist author, I want to flip through high-resolution 2D proofs of all 48 pages to check typos and margin alignments before ordering. | ProofViewerStage, BleedGuideOverlay, ProofHUD, Button | GET /api/books/:bookId/proof | book-service | books, book_spreads | Events: book.proof_viewed | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `PWA-68` | As an archivist, I want to open our heirloom book in 3D, flip through pages with realistic curl physics, and share the interactive keepsake with family. | ExperienceCanvas, ReaderHUD, PageTurnController, FlatProofFallback | GET /api/books/:bookId/3d-model | book-service | books, book_spreads | Events: 3d.reader_opened | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `PWA-69` | As an archivist, I want an automated preflight check to identify any low-resolution photos or text cut off by trim lines before printing. | PreflightDashboard, ChecklistCard, WarningCallout, Button | POST /api/books/:bookId/preflight | book-service | books, book_spreads, audit_logs | Events: book.preflight_executed; Jobs: verify-book-dpi-integrity | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `PWA-70` | As an archivist, I want to inspect Edition 1 printed in 2023, verify its immutable hash, and create an expanded Edition 2 for 2024. | EditionTimeline, EditionCard, ChecksumBadge, Button | GET /api/books/:bookId/editions | book-service | books, audit_logs | Events: book.edition_viewed | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-71` | As an archivist ordering a physical heirloom book, I want to choose 170gsm lustre paper and leather binding with complete price transparency. | StockSelector, BindingPicker, QuantityStepper, PriceSummary (+1) | GET /api/commerce/catalog/options | commerce-service | print_orders | None | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-72` | As an archivist, I want to enter my home shipping address and choose standard or priority archival shipping. | ShippingForm, CourierSpeedSelector, OrderSummarySidebar, Button | POST /api/commerce/shipping/estimate | commerce-service | print_orders | None | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-73` | As an archivist, I want to review the exact order details and complete payment with zero hidden fees. | CheckoutReview, InvoiceTable, PaymentCard, Button | POST /api/commerce/orders | commerce-service | print_orders, order_items, fulfilment_records | Events: commerce.order_placed; Jobs: generate-print-pdf-package, dispatch-order-to-press | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-74` | As an archivist, I want a printable archival receipt with order number and edition hash so I have a permanent physical record. | ReceiptCard, ConfirmationHeader, PrintButton, Button | GET /api/commerce/orders/:orderId | commerce-service | print_orders, order_items | None | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-75` | As an archivist waiting for our family keepsake, I want to see which stage of binding the book is in and view live courier tracking. | OrderStepper, StageCard, CourierLink, Button | GET /api/commerce/orders/:orderId/tracking | commerce-service | print_orders, fulfilment_records | Events: order.tracking_viewed | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-76` | As an archivist whose cousins loved our printed family book, I want to reorder 5 identical copies referencing the exact frozen Edition 1 hash. | ReorderCard, QuantityStepper, ChecksumBadge, Button | POST /api/commerce/orders/reorder | commerce-service | print_orders, order_items | Events: commerce.reorder_initiated | Unit: 1, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-77` | As an archivist, I want to update my profile picture and review which browsers are currently signed into my account. | SettingsNav, AvatarUploader, InputField, SessionList (+1) | PATCH /api/users/me | identity-service | users, user_sessions | Events: identity.profile_updated | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `PWA-78` | As an archivist with motion sensitivity, I want to enable reduced motion so 3D book page turns use gentle crossfades rather than curling motion. | SettingsNav, ToggleSwitch, SelectDropdown, Button | PATCH /api/users/me/preferences | identity-service | users | None | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `PWA-79` | As an archivist, I want to set default signed media link expiration to 1 hour to prevent unauthorized link sharing. | PrivacyCard, DurationDropdown, AuditLogTable, Button | PATCH /api/users/me/privacy | identity-service | users, audit_logs | Events: privacy.settings_updated | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `PWA-80` | As an archivist self-hosting Memoria on my Mac, I want to inspect my local disk usage (42 GB used of 500 GB allocated) and clear derivative caches safely. | StorageMeterBar, BreakdownTable, MaintenanceTools, Button | GET /api/storage/overview | media-service | space_storage_quotas, media_assets | Jobs: verify-media-checksums, prune-orphan-derivatives | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `PWA-81` | As an archivist, I want to export our entire family archive as an uncompressed ZIP with JSON metadata so we maintain 100% data sovereignty. | ExportPanel, DangerZoneCard, ConfirmModal, Button | POST /api/users/me/export | identity-service | audit_logs, users | Events: account.export_requested, account.deletion_requested; Jobs: compile-archive-export-zip, purge-user-account | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `PWA-82` | As an archivist, I want to review keyboard shortcuts (Cmd+K for search, Arrow keys for 3D page turns) and submit an inquiry if I need scanning help. | ShortcutsCheatSheet, DocSearch, TicketForm, Button | POST /api/support/tickets | identity-service | audit_logs | Events: support.ticket_created; Jobs: route-support-ticket | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-01` | As an iPhone user, I want the app to open instantly with an elegant heirloom animation, validating Keychain credentials without decorative delays. | LaunchSplashView, BrandEmblemAnimation, TypographyTitle | GET /api/auth/session/validate | identity-service | user_sessions | Events: ios.app_launched | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `IOS-02` | As an iOS user, I want to tap 'Sign in with Apple' to create my account in 2 seconds with biometric privacy. | NativeRegisterView, SignInWithAppleButton, SecureField, Button | POST /api/auth/register | identity-service | users, user_sessions | Events: identity.user_registered | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `IOS-03` | As an archivist opening the app, I want Face ID to scan my face and open my family memories seamlessly. | NativeLoginView, BiometricButton, SecureField, Button | POST /api/auth/login | identity-service | users, user_sessions | Events: identity.user_logged_in | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `IOS-04` | As an iOS user who forgot my password, I want to enter my email in a clean native sheet and receive recovery instructions. | RecoverySheetView, TextField, Button | POST /api/auth/forgot-password | identity-service | users | Events: identity.password_reset_requested; Jobs: send-recovery-code-email | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-05` | As an archivist, I want the 6-digit code from my email to AutoFill automatically above the iOS keyboard so I can confirm instantly. | OTPCodeField, CountdownTimer, Button | POST /api/auth/verify-code | identity-service | users, user_sessions | Events: identity.code_verified | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-06` | As an invited family member tapping a link in Messages, I want Memoria to open directly to the space invitation card with Accept button. | InvitationSheetView, SpaceBanner, RoleBadge, Button | POST /api/spaces/invitations/:token/accept | memory-service | space_invitations, space_members | Events: collab.invitation_accepted | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-07` | As a new mobile archivist, I want a brief 3-page walkthrough of how our memories become keepsake books with page indicator dots. | OnboardingCarouselView, PageCard, PageIndicator, Button | N/A N/A (Client presentation) | Local UserDefaults | None | Events: ios.onboarding_completed | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `IOS-08` | As a new user, I want a clean native sheet to name our space 'Vance Family Heritage' and select Forest Green. | CreateSpaceSheet, ColorSwatchRow, SegmentedPicker, Button | POST /api/spaces | memory-service | memory_spaces, space_members | Events: memory.space_created | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `IOS-09` | As an archivist, I want to add my daughter's profile with her photo from my iPhone camera roll and birthdate. | CreateProfileSheet, AvatarPickerButton, DatePickerField, Button | POST /api/spaces/:spaceId/profiles | memory-service | space_profiles | Events: memory.profile_created | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `IOS-10` | As an archivist, I want to tap 'Pick from Contacts' to select my brother's email address and send him a space invitation. | ContactInviteSheet, RecipientTokenField, RolePicker, Button | POST /api/spaces/:spaceId/invitations | memory-service | space_invitations | Events: collab.invitations_dispatched | Unit: 1, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-11` | As an iPhone user, I want a smooth 120 FPS native feed of family photos and today-in-history with bottom tabs. | HomeFeedView, TodayInHistoryCard, MemoryFeedCard, MemoriaTabBar | GET /api/dashboard/overview | memory-service | memories, memory_media | Events: ios.feed_viewed | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `IOS-12` | As a member of multiple family spaces, I want to tap the title to switch from my personal space to our family space with a satisfying haptic click. | SpaceSwitcherSheet, SpaceRow, RoleBadge, Button | GET /api/spaces | memory-service | memory_spaces, space_members | Events: ios.space_switched | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `IOS-13` | As an archivist, I want a dedicated space overview view to see member counts, storage status, and open space settings. | SpaceOverviewView, ParallaxHeader, QuickActionGrid, StatsCard | GET /api/spaces/:spaceId | memory-service | memory_spaces, space_members | None | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-14` | As an archivist, I want to tap the notification bell to see when family members comment on our memories and tap directly into the photo. | NotificationListView, NotificationRow, SwipeActions, Button | GET /api/notifications | identity-service | audit_logs | Events: ios.notifications_read | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-15` | As an archivist, I want to tap the microphone and say 'Grandpa fishing 1972' to find matching photos instantly. | NativeSearchView, SearchFilterChips, ResultCard, VoiceDictationButton | GET /api/search | search-service | memories, media_assets | Events: search.executed | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `IOS-16` | As an archivist, I want to tap the big '+' button to immediately choose whether I am snapping a photo, recording a voice note, or writing a thought. | QuickCaptureSheet, CaptureOptionCard, Button | N/A N/A (Client workflow router) | iOS Client | None | None | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `IOS-17` | As an archivist, I want to take a crisp photo of grandmother's heirloom necklace or select 10 photos from my camera roll with lossless SHA-256 preservation. | CameraViewfinder, ShutterButton, PHPickerWrapper, Button | POST /api/media/upload-session | media-service | media_assets, memories | Events: media.photo_captured; Jobs: generate-derivatives | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `IOS-18` | As an archivist, I want to record my children singing happy birthday to grandfather and trim out the first 2 seconds. | VideoCaptureView, VideoTrimScrubber, AVPlayerPreview, Button | POST /api/media/upload-session | media-service | media_assets, memories | Events: media.video_captured; Jobs: generate-video-poster | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-19` | As an interviewer, I want to record grandfather telling war stories with live audio wave visualization on my iPhone and pause when he takes a sip of water. | VoiceRecorderView, AudioWaveformCanvas, RecordButton, Button | POST /api/media/upload-audio | media-service | media_assets, memories | Events: media.audio_recorded; Jobs: generate-audio-waveform, transcribe-audio | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-20` | As an archivist, I want to quickly jot down a funny quote my daughter said at breakfast before I forget it. | StoryComposerView, TextEditor, TagPersonPill, Button | POST /api/memories | memory-service | memories | Events: memory.created | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-21` | As an archivist uploading 30 photos over cellular, I want to see upload progress and know transfers continue in background even if I switch apps. | UploadQueueSheet, UploadTaskRow, ProgressBar, Button | N/A Native URLSession background delegate events | iOS Background URLSession | media_assets | Events: media.upload_progress_updated | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-22` | As an archivist traveling in rural areas without cellular service, I want to review my offline created memories and ensure they sync without data loss when I reach Wi-Fi. | OfflineQueueSheet, PendingMutationRow, ConflictCard, Button | POST /api/sync/batch | memory-service | memories, outbox_events | Events: ios.offline_sync_completed | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-23` | As an archivist, I want to glide smoothly through 50 years of family history with decade markers and tap to open any memory. | TimelineView, TimelineNode, DecadeScrubberBar, MemoryCard | GET /api/spaces/:spaceId/timeline | memory-service | memories, memory_media | None | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-24` | As an archivist, I want to pinch the photo grid to zoom out to 5 columns for bird's-eye browsing or pinch in to 2 columns for large previews. | MediaGridView, GridThumbnailCell, DensityPicker, Button | GET /api/spaces/:spaceId/memories | memory-service | memories, media_assets | None | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-25` | As an archivist, I want to tap on June 18 in the calendar to see all memories from that date across different years. | CalendarHeatmapView, CalendarDayCell, DayMemoryList, Button | GET /api/memories/calendar | memory-service | memories | None | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-26` | As an archivist, I want to open a memory to see the high-res photo with parallax scroll, listen to grandmother's voice recording, and read family comments. | MemoryDetailView, ParallaxMediaHeader, AudioWaveformBar, StoryText (+1) | GET /api/memories/:memoryId | memory-service | memories, media_assets, memory_media | Events: ios.memory_viewed | Unit: 2, Int: 1, E2E: 1 | Implemented & Verified |
| `IOS-27` | As an archivist, I want to correct the capture date from 1974 to 1976 and tag my aunt in the memory. | EditMemorySheet, TextField, DatePicker, Button | PUT /api/memories/:memoryId | memory-service | memories | Events: memory.updated | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-28` | As an archivist, I want to rotate a scanned photo 90 degrees and warm up faded colors without overwriting the master archival file. | CoreImageCanvas, CropHandles, AdjustmentSlider, Button | POST /api/media/:mediaId/derivatives | media-service | media_assets | Events: media.derivative_created | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-29` | As a family member, I want to watch high-definition video memories with smooth scrubbing and AirPlay support on my iOS device. | AVPlayerCanvasView, VideoScrubberSlider, AirPlayPicker, PlaybackControlBar | GET /api/media/:mediaId/stream | media-service | media_assets | Events: media.streamed | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-30` | As a grandchild, I want to listen to Grandma's voice note while watching the spoken words highlight in real time so I can follow every treasured detail. | AudioWaveformVisualizer, TranscriptScrollView, AudioPlaybackBar, SpeedSelectorMenu | GET /api/memories/:memoryId/audio-transcript | memory-service | memories, media_assets | Events: audio.played | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-31` | As a family curator, I want to quickly pull up all starred heirloom memories so I can select them for the annual print book. | MasonryGridView, MemoryCard, FavoriteToggleBadge, FilterChipBar (+1) | GET /api/spaces/:spaceId/memories | memory-service | memories | None | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-32` | As an archivist, I want to see our thematic memory collections in beautiful card albums so that our stories are structured logically. | CollectionGrid, CollectionCard, AlbumCoverCollage, SearchTextField (+1) | GET /api/spaces/:spaceId/collections | memory-service | memory_spaces, memories | None | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-33` | As an archivist, I want to open our 'Grandpa's Letters' collection to read the letters in chronological order and add new scans. | ParallaxHeaderView, MemoryGridView, ReorderableList, FloatingActionBar (+1) | GET /api/spaces/:spaceId/collections/:collectionId | memory-service | memories | None | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-34` | As a space admin or memory creator, I want to view deleted memories in the trash so that I can restore an accidentally removed photo before 30 days elapse. | TrashListView, TrashedMemoryCard, AlertModal, ToolbarActionBar (+1) | GET /api/spaces/:spaceId/trash | memory-service | memories, media_assets, outbox_events | Events: memory.restored, memory.purged; Jobs: purge-expired-trash | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-35` | As a family member, I want to tap on my grandfather's profile bubble to explore his life milestones, stories, and photographs. | AvatarBubbleCarousel, ProfileRowCell, SegmentedControl, SearchTextField (+1) | GET /api/spaces/:spaceId/profiles | memory-service | space_profiles | None | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-36` | As a grandchild, I want to view my grandmother's profile to see all memories where she is tagged, sorted from her youth to present day. | ProfileHeroHeader, MilestoneTimelineView, MemoryThumbnailGrid, Button | GET /api/spaces/:spaceId/profiles/:profileId | memory-service | space_profiles, memories, memory_profiles | None | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-37` | As a space contributor, I want to create a profile for my newborn daughter with her birth date and baby picture. | PhotosPicker, TextField, DatePicker, Toggle (+2) | POST /api/spaces/:spaceId/profiles | memory-service | space_profiles, outbox_events | Events: profile.created, profile.updated | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-38` | As a space administrator, I want to see which family members have joined our space and verify that kids are set to Contributor role. | MembersListView, MemberRowCell, RolePillBadge, Button | GET /api/spaces/:spaceId/members | identity-service | space_members, users | None | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-39` | As an archivist, I want to tap 'Invite Family' and send an invitation link directly via iMessage or AirDrop to my sister. | QRCodeImageView, CopyLinkBox, UIActivityViewController, Menu (+1) | POST /api/spaces/:spaceId/invites | identity-service | space_invitations | Events: space.invite_created | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-40` | As a space administrator, I want to change Uncle Bob's role to Admin so he can help manage scanned letters and member invites. | RoleSelectionRow, Toggle, DestructiveButton, Button | PATCH /api/spaces/:spaceId/members/:userId | identity-service | space_members, outbox_events | Events: space.member_role_updated | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-41` | As a family member, I want to pull down to refresh the space activity stream to see what new stories Uncle Dave added today. | ActivityFeedView, ActivityRowCell, ThumbnailPreviewStrip, UIRefreshControl | GET /api/spaces/:spaceId/activity | memory-service | space_activity, users, memories | None | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-42` | As an aunt, I want to comment on my nephew's baby photo and attach a 10-second voice note remembering that day. | ReactionBar, CommentsListView, CommentCell, CommentComposerBar (+1) | POST /api/memories/:memoryId/comments | memory-service | memory_comments, memory_reactions, outbox_events | Events: memory.comment_added, memory.reaction_added | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-43` | As an archivist, I want to see our published volumes on an interactive 3D shelf, rotate them in 3D space, and tap to read. | RealityView, BookshelfSceneEntity, BookModel3D, BookDetailBanner (+1) | GET /api/spaces/:spaceId/books | book-service | books | None | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-44` | As an archivist, I want to inspect our 8x10 Hardcover volume to see its page count, chapters, and print readiness. | BookPreviewCard, SpecPillGroup, ChapterList, PrimaryActionButton (+1) | GET /api/books/:bookId | book-service | books, book_spreads | None | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-45` | As an archivist, I want a 3-step wizard on iOS to compile all 2024 memories into an annual family yearbook. | WizardStepBar, TextField, FormatSelectionCard, SegmentedPicker (+1) | POST /api/spaces/:spaceId/books | book-service | books, outbox_events | Events: book.created; Jobs: generate-auto-book-layout | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-46` | As an archivist, I want to scroll through our photos and tap checkmarks to include 40 specific pictures in the new book. | SelectableMediaGrid, CheckmarkOverlay, SelectionTrayStrip, FilterChipBar (+1) | PUT /api/books/:bookId/memories | book-service | books, memories | None | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-47` | As an archivist, I want to long-press and drag our wedding spread before the honeymoon chapter so the book flows chronologically. | SpreadReorderGrid, SpreadMiniatureCard, ChapterDividerView, Button | PUT /api/books/:bookId/spreads/reorder | book-service | books, book_spreads | None | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-48` | As an archivist, I want to choose Deep Forest Green cloth with embossed Gold Foil lettering for our heirloom family bible volume. | Cover3DPreviewCanvas, MaterialSwatchPicker, FoilSwatchPicker, TypographySelector (+1) | PATCH /api/books/:bookId/cover | book-service | books, outbox_events | Events: book.cover_updated; Jobs: generate-book-3d-model | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-49` | As a reader, I want to swipe my finger across the screen to turn the physical-feeling paper pages and hear the gentle paper rustle sound. | RealityView, PageCurlEntity, SpatialAudioPlayer, PageScrubberBar (+1) | GET /api/books/:bookId/spreads | book-service | books, book_spreads | Events: book.read | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-50` | As a reader with visual impairments or on low-battery mode, I want a flat 2D spread viewer where I can zoom in on captions and photos. | PagingSpreadScrollView, ZoomablePageView, ThumbnailFilmstripBar, Button | GET /api/books/:bookId/spreads | book-service | books, book_spreads | None | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-51` | As an archivist, I want the preflight tool to warn me if an old scanned photo is too low resolution so that my printed book looks sharp. | PreflightChecklistView, ChecklistStatusRow, WarningDetailCallout, Button | POST /api/books/:bookId/preflight | book-service | books, book_spreads, media_assets | Events: book.preflight_executed | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-52` | As a customer, I want to tap Apple Pay on my iPhone to buy 3 copies of our family book for Christmas gifts with biometric Touch/Face ID. | PKPaymentButton, QuantityStepper, PriceBreakdownCard, ShippingMethodPicker (+1) | POST /api/orders/checkout | commerce-service | print_orders, outbox_events | Events: order.placed; Jobs: generate-print-cmyk-pdf, notify-fulfillment-partner | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-53` | As an excited customer, I want to check my order status and view the courier tracking link so I know when our family book arrives. | OrderTimelineView, StatusIllustrationCard, CarrierTrackingBox, Button | GET /api/orders/:orderId | commerce-service | print_orders | None | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-54` | As an iOS user, I want to enable Face ID app lock so that my private family journals remain secure even if someone borrows my unlocked phone. | AccountProfileCard, Toggle, ListRowNavigation, DestructiveButton (+1) | PATCH /api/users/me/preferences | identity-service | users, user_sessions | Events: user.preferences_updated | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-55` | As an archivist, I want to see how much of our 500MB storage quota is used and export our full family archive to my local Mac. | StorageUsageGauge, StorageCategoryBreakdownBar, ActionCard, Button | GET /api/spaces/:spaceId/storage/breakdown | media-service | space_storage_quotas, media_assets | Events: storage.cache_cleared; Jobs: compile-space-export-zip | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `IOS-56` | As an archivist, I want to read tips on how to scan fragile 19th-century tintypes without glare, or message support if I have questions. | FAQAccordionView, SearchTextField, Picker, TextEditor (+2) | POST /api/support/tickets | identity-service | support_tickets | Events: support.ticket_created; Jobs: send-support-confirmation-email | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `ADMIN-01` | As a platform operations lead, I want an executive overview dashboard with real-time telemetry cards and storage metrics to ensure the $0 local infrastructure runs smoothly. | AdminTopbar, SidebarNavigation, KPISummaryCard, ServiceHealthGrid (+1) | GET /api/admin/overview/metrics | api-gateway | users, memory_spaces, space_storage_quotas, memories | Events: admin.dashboard_viewed; Jobs: aggregate-daily-platform-kpis | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `ADMIN-02` | As an administrative compliance officer, I want to search registered accounts by email or ID, inspect verification badges, and suspend compromised accounts. | DataTable, SearchInput, FilterDropdown, StatusBadge (+1) | GET /api/admin/users | identity-service | users, user_sessions, memory_spaces | Events: admin.user_directory_searched | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `ADMIN-03` | As an admin investigating suspected account takeover, I want to review all active sessions and invalidate them immediately to protect family memories. | UserProfileCard, SessionsTable, DangerZoneBox, ConfirmationModal (+1) | POST /api/admin/users/:userId/sessions/revoke-all | identity-service | users, user_sessions, outbox_events | Events: admin.user_sessions_revoked, user.force_logout | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `ADMIN-04` | As an administrator, I want to inspect space parameters, identify orphaned family spaces, and audit contributor access hierarchies. | DataTable, SearchInput, StorageUsageBar, FilterDropdown (+1) | GET /api/admin/spaces | memory-service | memory_spaces, space_storage_quotas, users | Events: admin.spaces_oversight_viewed | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `ADMIN-05` | As a support engineer, I want to submit a time-bounded support access request requiring dual-admin cryptographic sign-off before inspecting customer issues. | AccessRequestModal, DualApprovalBadge, DataTable, WebAuthnSignaturePrompt (+1) | POST /api/admin/access-requests/:requestId/approve | identity-service | support_access_requests, audit_logs, outbox_events | Events: admin.access_request_approved, admin.access_session_started; Jobs: revoke-expired-support-access-tokens | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `ADMIN-06` | As a safety moderator, I want to inspect flagged photos or stories to resolve policy violations while protecting family privacy. | ModerationCard, SensitiveImageBlurView, ResolutionActionBar, ConfirmationModal (+1) | POST /api/admin/moderation/:flagId/resolve | memory-service | moderation_flags, memories, media_assets, outbox_events | Events: moderation.item_resolved, media.quarantined | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `ADMIN-07` | As an abuse investigator, I want to review formal user reports, view communication logs between parties, and communicate case findings. | ReportsTable, IncidentDossierModal, PriorityPill, ResolutionDropdown (+1) | PATCH /api/admin/reports/:reportId | identity-service | user_reports, audit_logs, outbox_events | Events: report.status_updated, user.notified; Jobs: send-incident-resolution-notice | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `ADMIN-08` | As an infrastructure engineer, I want to inspect local disk usage, locate unreferenced orphan files, and safely reclaim disk space without card-gated cloud expenses. | StorageGaugeWidget, DerivativeBreakdownBar, SpacesQuotaTable, OrphanManagerCard (+1) | GET /api/admin/storage/stats | media-service | media_assets, space_storage_quotas | Events: admin.storage_scanned; Jobs: scan-orphan-media-files, purge-orphan-media-files | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `ADMIN-09` | As an archival media engineer, I want to inspect corrupted photo uploads, review EXIF date extraction, and re-trigger derivative generation. | TechnicalInspectorCard, EXIFMetadataGrid, DerivativeHealthRow, LogStreamConsole (+1) | POST /api/admin/media/:mediaId/reprocess | media-service | media_assets, outbox_events | Events: media.reprocessing_requested; Jobs: generate-image-derivatives, extract-media-exif | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `ADMIN-10` | As an infrastructure admin, I want to view active client upload sessions and diagnose stalled client transfers in real time. | UploadSessionsTable, TransferProgressBar, SpeedGaugeBadge, Button | GET /api/admin/uploads/sessions | media-service | media_assets | Events: admin.upload_telemetry_viewed; Jobs: cleanup-expired-upload-sessions | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `ADMIN-11` | As an operations engineer, I want to monitor BullMQ queue latency, active worker concurrency, and job throughput to ensure zero processing backlogs. | QueueCard, JobCountBadgeGroup, WorkerFleetPanel, ThroughputSparkline (+1) | GET /api/admin/queues/telemetry | jobs package | None | Events: admin.queues_viewed | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `ADMIN-12` | As an operations engineer, I want to inspect dead-letter jobs, read the root cause stack trace, and retry them after fixing network or file issues. | DLQTable, StackTraceDrawer, ErrorChip, PayloadViewer (+1) | POST /api/admin/queues/:queueName/jobs/:jobId/retry | jobs package | None | Events: admin.job_retried, admin.dlq_cleared | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `ADMIN-13` | As a backend systems engineer, I want to inspect microservice telemetry (api-gateway, identity, memory, media, book) to identify bottlenecks. | ServiceTopologyCard, HealthBeaconBadge, ResourceGauge, LatencyPercentileChart (+1) | GET /api/admin/services/health | api-gateway | None | Events: admin.services_health_checked | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `ADMIN-14` | As a publishing engineer, I want to track PDF compilation jobs and 3D GLTF asset compression to ensure books compile in under 30 seconds. | CompilationTable, StageProgressBar, OutputArtifactCard, EngineTelemetryBox (+1) | GET /api/admin/books/rendering/jobs | book-service | books, book_spreads | Events: admin.book_rendering_monitored; Jobs: generate-print-cmyk-pdf, generate-book-3d-model | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `ADMIN-15` | As a prepress quality engineer, I want to review preflight audit logs across customer books to catch print defects before physical printing. | PreflightAuditTable, MarginOverlayPreview, PreflightMetricCard, OverrideModal (+1) | POST /api/admin/preflight/:bookId/override | book-service | books, book_spreads, outbox_events | Events: preflight.warning_overridden | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `ADMIN-16` | As a product manager, I want to manage physical specifications, toggle available linen fabrics, and configure foil stamping options. | FormatCard, MaterialSwatchGrid, DimensionSchematicBox, PageLimitStepper (+1) | PUT /api/admin/catalog/formats/:formatId | commerce-service | print_catalog_formats, outbox_events | Events: catalog.format_updated | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `ADMIN-17` | As an operations lead, I want to adjust base book prices and configure flat-rate domestic shipping tiers to maintain sustainable margins. | PricingTable, CurrencyInputField, ShippingZoneCard, MarginSummaryBox (+1) | POST /api/admin/pricing/matrix | commerce-service | pricing_matrix, shipping_rates, outbox_events | Events: pricing.matrix_updated | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `ADMIN-18` | As a print fulfillment operator, I want to view all submitted book orders and advance them to 'In Production' after prepress approval. | OrdersTable, StageFilterTabGroup, BatchActionBar, SearchInput (+1) | GET /api/admin/orders | commerce-service | print_orders, books, users | Events: admin.orders_viewed | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `ADMIN-19` | As a fulfillment specialist, I want to input the courier tracking number and mark an order as shipped so the customer receives their tracking link. | OrderDetailCard, ShippingAddressBox, CarrierTrackingForm, ProductionTimeline (+1) | POST /api/admin/orders/:orderId/ship | commerce-service | print_orders, outbox_events | Events: order.shipped; Jobs: send-shipping-notification-email | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `ADMIN-20` | As a customer support manager, I want to review a damaged book report, authorize a free reprint remake, or issue a full refund. | RefundsTable, DamageEvidencePreview, RefundDecisionModal, AmountInputField (+1) | POST /api/admin/orders/:orderId/refund | commerce-service | print_orders, order_refunds, outbox_events | Events: order.refunded, order.remake_authorized; Jobs: send-refund-notification-email | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `ADMIN-21` | As a finance engineer, I want to review payment webhook logs and transaction settlement statuses to reconcile daily commerce revenue. | TransactionLedgerTable, WebhookInspectorDrawer, VolumeSummaryCard, SearchInput (+1) | GET /api/admin/transactions | commerce-service | payment_transactions, print_orders | Events: admin.transactions_viewed | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `ADMIN-22` | As a communications manager, I want to edit transactional email templates with brand typography (Cormorant Garamond) and test rendered previews. | TemplateSidebar, MonacoCodeEditor, LiveEmailPreviewFrame, VariableJsonEditor (+1) | PUT /api/admin/templates/:templateKey | identity-service | email_templates, outbox_events | Events: template.updated; Jobs: send-test-email | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `ADMIN-23` | As an engineering lead, I want to toggle feature flags dynamically with percentage rollouts without redeploying microservices. | FeatureFlagsTable, ToggleSwitch, RolloutSlider, TargetGroupDropdown (+1) | PATCH /api/admin/feature-flags/:flagKey | api-gateway | feature_flags, outbox_events | Events: feature_flag.updated | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `ADMIN-24` | As an auditor or security officer, I want to search immutable audit logs by admin ID, action type, and date to verify full accountability. | AuditLogsTable, RecordDiffInspector, HashChainBadge, DateRangePicker (+1) | GET /api/admin/audit-logs | identity-service | audit_logs | Events: admin.audit_logs_exported; Jobs: verify-audit-log-cryptographic-chain | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `ADMIN-25` | As an archival support specialist, I want to review incoming customer tickets, read diagnostic logs, and send helpful guidance. | TicketsTable, ConversationThreadView, CannedMacroPicker, ReplyEditorBox (+1) | POST /api/admin/tickets/:ticketId/reply | identity-service | support_tickets, support_replies, outbox_events | Events: support.reply_sent; Jobs: send-support-reply-email | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |
| `ADMIN-26` | As an administrator, I want to register my hardware YubiKey and configure biometric passkeys to satisfy dual-custody security standards. | AdminProfileCard, FIDO2KeyList, WebAuthnPromptModal, TOTPConfigBox (+1) | POST /api/admin/profile/webauthn/register | identity-service | admin_users, admin_security_keys, audit_logs | Events: admin.security_key_registered | Unit: 2, Int: 1, E2E: 1 | Implemented (UI/Route Scaffolded) |

---

**End of Specification Document.** *Memoria — Your memories, made timeless.*
