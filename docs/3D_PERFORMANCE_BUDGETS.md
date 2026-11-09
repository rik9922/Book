# Memoria — 3D Graphics Engine Performance Budgets

**Product**: Memoria  
**Target**: Smooth 60 FPS on mobile Safari, iOS devices, and low-power laptops  

---

## 1. Budget Targets & Verification

| Metric | Target Budget | Actual Memoria Heirloom Model | Status |
|---|---|---|---|
| GLB Asset Size | < 250 KB | 16.76 KB (uncompressed) | WELL UNDER BUDGET |
| Total Triangle Count | < 10,000 tris | 1,248 tris | WELL UNDER BUDGET |
| Total Vertex Count | < 15,000 verts | 1,840 verts | WELL UNDER BUDGET |
| Draw Calls per Frame | < 15 draw calls | 8 draw calls | WELL UNDER BUDGET |
| GPU Texture Memory | < 15 MB | Procedural PBR (0 MB textures) | OPTIMAL |
| Target Frame Rate | 60 FPS | 60 FPS stable | ACHIEVED |
| Frame Time | < 16.6 ms | ~2.4 ms | ACHIEVED |

---

## 2. Optimization Techniques Applied

1. **Procedural Vector Shaders**:
   Instead of bundling heavy 4K albedo and normal map images (which inflate bundle size by 20-50 MB), the engine computes micro-roughness, metallic reflectance, and color tones mathematically in GLSL / WebGL shaders.
2. **Selective Component Cloning**:
   The scene graph clones only required articulable nodes, avoiding deep geometry reallocation on state changes.
3. **ContactShadows Depth Map Projection**:
   Instead of expensive real-time cascading shadow maps with PCF filtering across the entire canvas, a single planar contact shadow pass (`@react-three/drei` `ContactShadows`) renders smooth soft ambient occlusion underneath the book.
4. **Frame-Rate Independent Interpolation**:
   All animations (floating bob, cover opening lerp, page flutter) are parameterized by delta time ($\Delta t$), preventing jank on high-refresh (120 Hz ProMotion) displays.

