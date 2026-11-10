# Memoria — iOS 3D Asset & Material Pipeline

**Product:** Memoria (*Your memories, made timeless.*)  
**Authoring Script:** `scripts/generate_book_model.py`  
**Canonical Contract:** `packages/contracts/src/book-3d-manifest.json` & `apps/ios/Memoria/Sources/Memoria/Models/Book3DContract.swift`  
**Runtime Assets:** `apps/ios/Memoria/Resources/Models/`

---

## 1. Asset Separation Architecture

Memoria separates master authoring sources from iOS runtime assets so mobile optimizations never destructively degrade the canonical book identity:

| Stage | Format / Location | Status | Notes |
|---|---|---|---|
| **Master Authoring Generator** | `scripts/generate_book_model.py` (Python procedural geometry + canonical PBR) | `Implemented and measured` | Generates identical physical dimensions (`0.20m × 0.26m × 0.022m` textblock), hinge pivots, normals, and UVs for GLB and USDZ. |
| **Blender Master Source** | Blender (`bpy`) authoring pipeline | `Blocked` | Blender CLI is not installed in the current build host (`which blender` exited non-zero); Python generator serves as the reproducible deterministic source. |
| **Interchange / Validation** | OpenUSD USDA -> USDZ via `/usr/bin/usdzip` & `xcrun usdchecker` | `Implemented and measured` | All 3 USDZ variants pass Apple `usdchecker` with exit code `0`. |
| **iOS Runtime Variants** | `MemoriaHeirloomBook_Premium.usdz`, `MemoriaHeirloomBook.usdz` (Balanced), `MemoriaHeirloomBook_Efficient.usdz` | `Implemented and measured` | Selected dynamically by `BookRenderingManager` / `RenderingQualityController` without altering the 11-node hierarchy. |
| **Reality File (`.reality`)** | Reality Composer Pro compiled scene | `Proposed` | Deferred until physical-device benchmarks show load-time gains over USDZ async `Entity(contentsOf:)`. |

---

## 2. Canonical & Runtime Scene Hierarchy

Every USDZ runtime variant exposes the 11 required canonical nodes (`Book3DHierarchy.requiredNodes`), verified by both `tests/3d-engine-consistency.test.ts` and `MemoriaTests`:

- `HeirloomBookRoot` (root component Xform)
  - `Spine` (cambered cylindrical leather arch)
  - `BackCover` (rigid binder board, `3.5 mm`)
  - `TextBlock` (archival cotton-rag page block, `22.0 mm`)
  - `SilkRibbonBookmark` (sage/customizable satin bookmark)
  - `FrontCoverHinge` (pivot at `x = 0, y = 0, z = 0`, axis `+Z`)
    - `FrontCover`
    - `TreeOfLifeEmblem`
    - `CornerGuards`
  - `TurningPageHinge` (`x = 0.005, y = 0.0099, z = 0`)
    - `TurningPageLeaf` (canonical static leaf in USDZ; hidden during interactive 3D deformation)

At runtime, `BookSceneCoordinator` attaches the reading geometry onto the loaded root without modifying the USDZ binary contract (`Implemented and measured`):
- `LeftPageStack` & `LeftPageSurface` (child of `FrontCoverHinge`, oriented `180°` around `+Z` so left pages remain upright and un-mirrored)
- `RightPageSurface` (resting cleanly at `y = +0.0113 m` atop `TextBlock`)
- `FrontEndpaper` & `BackEndpaper`
- `ActiveTurningPage` (`RealityKitDeformablePageMesh` driven by `PageDeformationController` with dual front/back material parts and real-time subdivided vertex curl)

---

## 3. Geometry & Texture Budgets

| Variant | Vertices | Triangles | USDZ Bytes | Page Mesh Subdivisions (`X×Z`) | `usdchecker` | Status |
|---|---|---|---|---|---|---|
| **Premium** | `441` | `314` | `44,061` | `16 × 6` | PASS | `Implemented and measured` |
| **Balanced** | `313` | `218` | `32,811` | `10 × 4` | PASS | `Implemented and measured` |
| **Efficient** | `185` | `114` | `21,807` | `6 × 2` | PASS | `Implemented and measured` |

### Texture Budgets (`TextureResourceManager`)
- **Base USDZ bitmap textures:** `0 bytes` (PBR base color, metallic, roughness, and clearcoat parameters are applied via cached `PhysicallyBasedMaterial` instances). (`Implemented and measured`)
- **Leather micro-grain roughness map:** `256 × 256` procedural grayscale (`1` byte semantic `.raw`), generated only when `budgetBytes >= 6 MB` (`Premium`/`Balanced`) and evicted on memory warning. (`Implemented and measured`)
- **On-demand spread/page textures:** Rendered via `UIGraphicsImageRenderer` capped by profile (`1024 px` Premium / `512 px` Balanced / `256 px` Efficient), cached in LRU window `N-1 .. N+1`. (`Implemented and measured`)
- **Mode A Library Cover Thumbnails:** Lightweight `2D` cached thumbnails (`coverThumbnailImage`) rendered without instantiating RealityKit scenes. (`Implemented and measured`)
