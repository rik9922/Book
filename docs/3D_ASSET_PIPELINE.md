# Memoria — Unified 3D Asset Pipeline

**Generator Script:** `scripts/generate_book_model.py`  
**Manifest Output:** `packages/contracts/src/book-3d-manifest.json`  
**Pipeline Version:** 2.0.0 (`memoria_heirloom_book_v2`)  
**Policy:** $0 Budget, Deterministic Procedural Generation, Zero External Paid Assets

---

## 1. End-to-End Dual-Format Pipeline

```text
scripts/generate_book_model.py
  ├── Canonical Physical Dimensions (0.20m × 0.26m × 0.029m)
  ├── Canonical PBR Materials (MutedPlumLeather, ArchivalPaperIvory, MetallicGoldFoil, SilkRibbonSage)
  ├── Strict CCW Mesh Primitives & Articulated Hinges
  │
  ├──► GlbBuilder ──► apps/web/public/models/memoria_heirloom_book.glb (18,776 bytes)
  │               ──► apps/web/public/models/heirloom_book.glb (legacy alias)
  │
  ├──► UsdBuilder ──► /usr/bin/usdzip ──► xcrun usdchecker (Apple Compliance Check)
  │               ──► apps/web/public/models/MemoriaHeirloomBook.usdz (32,811 bytes)
  │               ──► apps/ios/Memoria/Resources/Models/MemoriaHeirloomBook.usdz
  │
  └──► Manifest   ──► packages/contracts/src/book-3d-manifest.json (SHA-256, topology, kinematics)
```

---

## 2. Canonical Geometry & Topology Budget

| Component | Generator Function | Parent Node | Material |
|---|---|---|---|
| Cambered Spine | `create_curved_spine(steps=20)` | `HeirloomBookRoot` | `MutedPlumLeather` |
| Back Cover Board | `create_box_mesh(0.20, 0.0035, 0.26)` | `HeirloomBookRoot` | `MutedPlumLeather` |
| Text Block | `create_box_mesh(0.192, 0.022, 0.25)` | `HeirloomBookRoot` | `ArchivalPaperIvory` |
| Silk Ribbon Bookmark | `create_box_mesh(0.012, 0.0005, 0.299)` | `HeirloomBookRoot` | `SilkRibbonSage` |
| Front Cover Board | `create_box_mesh(0.20, 0.0035, 0.26)` | `FrontCoverHinge` | `MutedPlumLeather` |
| Embossed Medallion | `create_memoria_emblem(segments=32)` | `FrontCoverHinge` | `MetallicGoldFoil` |
| Brass Corner Brackets | `create_corner_bracket(...)` | `FrontCoverHinge` | `MetallicGoldFoil` |
| Turning Page Leaf | `create_turning_page_leaf(steps_x=16)` | `TurningPageHinge` | `ArchivalPaperIvory` |

- **Total Vertices:** `313`
- **Total Triangles:** `218`
- **GLB Size:** `18,776` bytes
- **USDZ Size:** `32,811` bytes

---

## 3. Reproducibility & Validation Commands

To regenerate both GLB and USDZ outputs and update `packages/contracts/src/book-3d-manifest.json`:

```bash
python3 scripts/generate_book_model.py
```

To verify Apple USDZ schema, material bindings, and packaging compliance:

```bash
xcrun usdchecker apps/web/public/models/MemoriaHeirloomBook.usdz
```

To verify binary headers, node hierarchy parity, outward CCW winding, SHA-256 checksums, and API delivery:

```bash
NODE_ENV=test node --env-file=.env --import tsx --test tests/3d-engine-consistency.test.ts
```

---

## 4. WebGL & Metal Texture Lifecycle Policy

- Because base geometry and PBR micro-surfaces are evaluated procedurally using lightweight metallic/roughness/clearcoat parameters, base 3D book assets require **0 MB of external bitmap textures**.
- When displaying high-resolution photographic memory spreads, WebGL and RealityKit retain only the active spread ($N$) and adjacent spreads ($N-1$, $N+1$) in GPU memory, disposing off-screen resources on unmount.
