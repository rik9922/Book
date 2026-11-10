# BRAND IDENTITY SPECIFICATION — MEMORIA
**Official Project & Product Brand Guidelines**
**Document Version:** 1.0.0  
**Effective Date:** 2026-11-09  
**Status:** Approved & Implemented  

---

## 1. PRODUCT BRAND & VISION

### 1.1 Official Name & Tagline
- **Official Name**: **Memoria**
- **Official Tagline**: **Your memories, made timeless.**
- **Core Mission**: An heirloom memory preservation and publishing platform where families and individuals preserve their most cherished memories, stories, and photographs, collaborate across generations, experience them in immersive 3D, and publish them into museum-grade physical books.

### 1.2 Legacy Identifiers & Technical Stability
- **Product & User-Facing Brand**: **Memoria** (used across web titles, PWA manifests, iOS app bundles, headers, landing pages, marketing, and physical print book title pages).
- **Internal Technical Identifiers**: In accordance with enterprise architectural hygiene, underlying database identifiers (`identity_db`, `memory_db`), package namespaces (`@memory-capsule/*`), Git repository URL, and internal event subjects (`CAPSULE_EVENTS`) remain stable to preserve technical compatibility, avoid regressions, and maintain pristine Git history.

---

## 2. OFFICIAL APP ICON

### 2.1 Visual Design Concept
The approved Memoria 3D icon reflects the Living Archive design philosophy — timeless, elegant, and focused on memory preservation:
- **Monogram**: Sculpted three-dimensional serif letter "M" in Muted Plum (`#76556F`) with tactile beveled edges.
- **Living Leaf**: Sculpted organic leaf motif emerging from the central stem in Soft Sage (`#849483`), symbolizing personal growth and living family heritage.
- **Open Book Foundation**: Graceful curved book spreads at the base in Muted Plum with layered Warm Ivory page linings.
- **Canvas**: Warm Ivory (`#F7F4EE`) textured matte substrate with subtle ambient lighting.
- **Format**: Rounded-square squircle app icon composition.

### 2.2 Asset Directory & Manifest Mapping
All icon assets are centralized in `apps/web/public/branding/`:
| File | Dimensions | Purpose |
|---|---|---|
| `memoria-app-icon.png` | 1024 × 1024 | Master high-resolution source copy. |
| `memoria-app-icon-1024.png` | 1024 × 1024 | App Store / High-DPI display asset. |
| `memoria-app-icon-512.png` | 512 × 512 | Standard PWA application icon (`any`). |
| `memoria-app-icon-maskable-512.png` | 512 × 512 | PWA maskable icon with safe zone padding on Warm Ivory background. |
| `memoria-app-icon-192.png` | 192 × 192 | Mobile home-screen shortcut icon (`any`). |
| `memoria-app-icon-maskable-192.png` | 192 × 192 | Mobile home-screen maskable icon. |
| `memoria-emblem.png` | 1024 × 1024 | Standalone transparent PNG emblem (Plum & Sage M on alpha). |
| `memoria-logo.png` | 1024 × 1024 | High-resolution logo mark with alpha transparency. |
| `apple-touch-icon.png` | 180 × 180 | iOS Safari web clip & bookmark icon. |
| `favicon-32x32.png` / `favicon.ico` | 32 × 32 | Browser tab favicon. |
| `favicon-16x16.png` | 16 × 16 | Compact address bar favicon. |

---

## 3. COLOR PALETTE & DESIGN SYSTEM TOKENS

The Memoria visual identity is anchored in the **Living Archive** light-only palette:

| Role | Color Name | Hex Code | Usage |
|---|---|---|---|
| **Primary Brand** | Muted Plum | `#76556F` | Key brand actions, primary buttons, interactive highlights, monogram emblem. |
| **Living Accent** | Soft Sage | `#849483` | Living leaf motif, secondary badges, gentle accent indicators. |
| **Functional Sage**| Functional Forest Sage | `#5F735E` | Accessible status indicators, success badges (WCAG 2.2 AA compliant). |
| **Structural Text**| Deep Ink | `#20242C` | Primary display headings, high-contrast navigation text (14.17:1 on ivory). |
| **Body Text** | Archival Charcoal | `#28272A` | Long-form reading narrative, metadata text (12.44:1 contrast). |
| **Canvas** | Warm Ivory | `#F7F4EE` | Main application canvas, light-mode background. |
| **Subtle Border** | Natural Linen | `#E7E2DA` | Card dividers, section separators. |
| **Strong Border** | Archival Stone | `#8D857A` | Form field boundaries, input focus borders. |
| **Primary Brand** | Deep Emerald | `#123F35` | Dominant brand color, PWA theme color, book binding reference, header accents. |
| **Secondary Brand**| Forest Green | `#304C43` | Borders, subtle card backgrounds, navigation outlines. |
| **Accent / Luxury** | Antique Gold | `#C49A4A` | Foil stamping, badges, active states, key icons, tree-of-life highlights. |
| **Surface / Light** | Warm Ivory | `#F7F4ED` | Primary typography on dark backgrounds, physical print page stock simulation. |
| **Deep Neutral** | Dark Ink | `#0D1714` | Primary dark-mode backdrop, viewport container framing. |
| **Muted Neutral** | Archival Sage | `#91A593` | Secondary metadata labels, timestamps, subtle dividers. |

---

## 4. TYPOGRAPHY DIRECTION

1. **Display & Headings**: Elegant serif typography (Playfair Display / Merriweather / Georgia) conveying literary heritage, archival craftsmanship, and human storytelling.
2. **Body & UI**: Clean, warm humanistic sans-serif (Inter / Plus Jakarta Sans) with open apertures for maximum legibility on mobile screens and reading tablets.
3. **Monospace & Metadata**: System mono for dates, version tags, and edition hashes (`v1.0.2`, `sha256:...`).

---

## 5. PLATFORM INTEGRATION REQUIREMENTS

### 5.1 PWA (Progressive Web Application)
- **Manifest**: Located at `apps/web/src/app/manifest.ts` (serves `/manifest.webmanifest`).
- **Display**: `standalone`.
- **Theme Color**: `#123F35`.
- **Background Color**: `#F7F4ED`.
- **Icons**: Properly linked with both `any` and `maskable` variants.

### 5.2 Native iOS Application (Asset Catalog Guidance)
For future iOS project compilation:
- **Catalog Name**: `Assets.xcassets/AppIcon.appiconset`.
- **Single 1024x1024 Icon**: Use `memoria-app-icon-1024.png` without alpha transparency (Xcode automatically downsamples for iPhone, iPad, Spotlight, and Settings).
- **Display Name**: Set `CFBundleDisplayName` to `Memoria` in `Info.plist`.

---

## 6. BRAND USAGE RULES & INTEGRITY

- **DO NOT** stretch, distort, rotate, or alter the aspect ratio of the Memoria app icon.
- **DO NOT** substitute the approved 3D book icon with generic vector clip-art.
- **DO NOT** overload every interface with excessive gold foils or heavy illustrations. The application UI must remain clean, accessible, and content-first, allowing user memories and photographs to shine.
