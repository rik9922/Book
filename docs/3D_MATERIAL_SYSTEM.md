# Memoria — Photorealistic 3D PBR Material System

**Product**: Memoria  
**Specification**: Physically Based Rendering (PBR) Materials  

---

## 1. Material Catalog

Memoria defines 4 core archival materials matching physical heirloom books:

### 1. Heirloom Leather Binding (Vegetable-Tanned Archival Morocco)
- **Base Color**:
  - *Heirloom Emerald*: `#1B382B` (`[0.08, 0.22, 0.16, 1.0]`)
  - *Archival Navy*: `#16233B` (`[0.09, 0.14, 0.23, 1.0]`)
  - *Vintage Burgundy*: `#3B141C` (`[0.23, 0.08, 0.11, 1.0]`)
  - *Midnight Onyx*: `#1C1C1E` (`[0.11, 0.11, 0.12, 1.0]`)
- **Metallic Factor**: `0.02 - 0.04` (non-conductive dielectric leather)
- **Roughness Factor**: `0.80 - 0.84` (soft diffused micro-facet sheen)
- **Clearcoat**: `0.1` with subtle normal bump simulation

### 2. Archival Paper Stock (Acid-Free Cotton Rag)
- **Base Color**: Warm Archival Ivory `#F7F4ED` (`[0.97, 0.95, 0.91, 1.0]`)
- **Metallic Factor**: `0.0` (pure dielectric cellulose)
- **Roughness Factor**: `0.94 - 0.96` (matte, velvety diffuse dispersion)
- **Edge Layering**: Simulated via UV striping and multi-quad edge margins

### 3. Hot Foil Stamping & Brass Hardware (Metallic Leaf)
- **Variants**:
  - *Champagne Gold Foil*: `#D4AF37` (`[0.86, 0.70, 0.24, 1.0]`)
  - *Rose Gold Foil*: `#B76E79` (`[0.72, 0.43, 0.47, 1.0]`)
  - *Sterling Silver Foil*: `#C0C0C0` (`[0.75, 0.75, 0.75, 1.0]`)
- **Metallic Factor**: `0.92 - 0.96` (fully conductive metal conductor)
- **Roughness Factor**: `0.22 - 0.26` (mirror-like specular reflections with sharp highlights)

### 4. Silk Ribbon Bookmark (Woven Archival Habotai)
- **Base Color**: `#D49B29` (`[0.83, 0.61, 0.16, 1.0]`)
- **Metallic Factor**: `0.35` (simulating anisotropic woven thread sheen)
- **Roughness Factor**: `0.55` (sheen across thread orientation)

---

## 2. Dynamic Shader Swapping in React Three Fiber

Materials are dynamically manipulated at runtime without rebuilding the scene graph:

```typescript
clonedScene.traverse((child) => {
  if ((child as THREE.Mesh).isMesh) {
    const mesh = child as THREE.Mesh;
    if (mesh.name.includes("FrontCover") || mesh.name.includes("Spine")) {
      mesh.material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(coverColor),
        roughness: 0.82,
        metalness: 0.04,
      });
    }
  }
});
```
