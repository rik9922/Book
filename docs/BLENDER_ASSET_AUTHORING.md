# Memoria — Blender & Procedural 3D Asset Authoring Pipeline

**Product**: Memoria  
**Pipeline**: Automated 3D Book Generation (`scripts/generate_book_model.py`)  

---

## 1. Zero-Dependency Standalone Synthesis vs. Blender Headless

Memoria supports two automated authoring execution paths:

1. **Standalone Zero-Dependency Binary Synthesis**:
   - Implemented in `scripts/generate_book_model.py`.
   - Generates 100% compliant GLTF 2.0 binary (`.glb`) files using pure Python without requiring Blender, Docker, or external binaries.
   - Ideal for CI/CD runners, lightweight developer machines, and fast rebuilds.
2. **Blender Headless Mode (`bpy`)**:
   - Headless script execution via:
     ```bash
     blender --background --python scripts/generate_book_model.py
     ```
   - Enables high-poly subdivision surface baking, displacement map generation, and procedural leather texture baking when Blender is installed on the workstation.

---

## 2. Anatomical Dimensions & Physical Tolerances

The generator adheres to historical bookbinding ratios:

- **Book Width ($W$)**: $0.20\,\text{m}$ ($200\,\text{mm}$)
- **Book Height ($H$)**: $0.26\,\text{m}$ ($260\,\text{mm}$)
- **Cover Board Thickness ($T_b$)**: $0.0035\,\text{m}$ ($3.5\,\text{mm}$) archival binder's board
- **Text Block Thickness ($T_p$)**: $0.022\,\text{m}$ ($22\,\text{mm}$) simulating ~160 pages of 120 gsm archival stock
- **Text Block Recess**: Margins recessed $4\,\text{mm}$ from cover board edges on top, bottom, and right to protect leaf edges
- **Spine Camber**: Semicircular cylindrical curvature with radius $R = T_p / 2 + T_b = 0.0145\,\text{m}$ ($14.5\,\text{mm}$)
- **Emblem Medallion**: $45\,\text{mm}$ radius embossed Tree of Life medallion centered on the front cover

---

## 3. Vertex Attributes & Buffer Packing

All geometry buffers are packed into a single binary buffer conforming to the GLTF 2.0 specification:

- `POSITION`: `FLOAT` (`5126`), 3 components (`VEC3`), with strict min/max bounding boxes
- `NORMAL`: `FLOAT` (`5126`), 3 components (`VEC3`), normalized surface normals
- `TEXCOORD_0`: `FLOAT` (`5126`), 2 components (`VEC2`), UV mapping coordinates
- `indices`: `UNSIGNED_SHORT` (`5123`), `SCALAR`, indexed triangle primitives

All buffer chunks are aligned to 4-byte boundaries per the GLTF 2.0 spec.

---

## 4. Regeneration Command

To re-synthesize the 3D models at any time:

```bash
python3 scripts/generate_book_model.py
```

Outputs:
- `apps/web/public/models/heirloom_book.glb`
- `apps/web/public/models/memoria_heirloom_book.glb`
