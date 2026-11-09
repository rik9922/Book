# 3D Asset Pipeline & Procedural Generation

## 1. Asset Pipeline Flow

```
+--------------------------+
|  Blender Python Script   |
| (Procedural Book Mesh)   |
+------------+-------------+
             |
             v
+--------------------------+
| High-Fidelity Geometry   |
| UV Unwrapping & Seams    |
+------------+-------------+
             |
             v
+--------------------------+
|  PBR Material Baking     |
| (Cloth/Leather, Normal)  |
+------------+-------------+
             |
      +------+------+
      |             |
      v             v
+-----------+ +-----------+
| Web GLB   | | iOS USDZ  |
| (Draco)   | | (Reality) |
+-----+-----+ +-----+-----+
      |             |
      v             v
+-----------+ +-----------+
| Three.js  | |RealityKit |
| R3F Web   | |SwiftUI iOS|
+-----------+ +-----------+
```

## 2. Reproducible Blender Python Generator

To ensure zero cost and 100% reproducibility without relying on paid 3D asset marketplaces, the project includes an automated Python generator script (`scripts/generate_book_model.py` / `packages/storage/scripts/generate_book.py`).

### Script Responsibilities:
1. Generate front cover, back cover, cambered spine, and paper block primitives with exact chamfered edge bevels.
2. Generate UV coordinates with seamless unwrapping for cover materials and page textures.
3. Apply vertex color groups for spine deformation and hinge flex lines.
4. Export web-optimized `.glb` with Draco mesh compression.
5. Generate `.usdz` asset for Apple RealityKit on iOS.

## 3. WebGL Texture Memory Management

To prevent out-of-memory crashes on mobile browsers when rendering a 100-page book:
- Only the **Current Spread ($N$)**, **Previous Spread ($N-1$)**, and **Next Spread ($N+1$)** reside in active GPU VRAM as high-resolution textures (2048x2048).
- Distant spreads use low-resolution 256x256 mipmap placeholders until the user approaches those pages.
- When navigating away, WebGL textures are explicitly disposed via `texture.dispose()`.

