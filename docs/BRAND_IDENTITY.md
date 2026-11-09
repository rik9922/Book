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
The approved Memoria 3D icon symbolizes permanence, heritage, and the living continuity of family life:
- **Binding**: Deep emerald-green genuine leather-bound archival heirloom book with tactile pebble-grain texturing.
- **Emblem**: Embossed sculpted golden tree-of-life emblem with organic flowing roots and detailed leaves.
- **Pages**: Heavy ivory deckle-edge layered pages.
- **Accents**: Gold metal protective corners and an archival golden satin ribbon bookmark.
- **Photographs**: Archival family photographs (generations holding hands, family home, mountain landscapes) gently emerging behind the book.
- **Lighting & Ambiance**: Warm cinematic golden rim lighting, volumetric bokeh, and subtle atmospheric dust motes.
- **Format**: Rounded-square app icon composition.

### 2.2 Asset Directory & Manifest Mapping
All icon assets are centralized in `apps/web/public/branding/`:
| File | Dimensions | Purpose |
|---|---|---|
| `memoria-app-icon.png` | 1024 × 1024 | Master high-resolution source copy. |
| `memoria-app-icon-1024.png` | 1024 × 1024 | App Store / High-DPI display asset. |
| `memoria-app-icon-512.png` | 512 × 512 | Standard PWA application icon (`any`). |
| `memoria-app-icon-maskable-512.png` | 512 × 512 | PWA maskable icon with safe zone padding on emerald background. |
| `memoria-app-icon-192.png` | 192 × 192 | Mobile home-screen shortcut icon (`any`). |
| `memoria-app-icon-maskable-192.png` | 192 × 192 | Mobile home-screen maskable icon. |
| `apple-touch-icon.png` | 180 × 180 | iOS Safari web clip & bookmark icon. |
| `favicon-32x32.png` / `favicon.ico` | 32 × 32 | Browser tab favicon. |
| `favicon-16x16.png` | 16 × 16 | Compact address bar favicon. |

---

## 3. COLOR PALETTE & DESIGN SYSTEM TOKENS

The Memoria visual identity is anchored in the **Modern Heirloom** aesthetic:

| Role | Color Name | Hex Code | Usage |
|---|---|---|---|
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
