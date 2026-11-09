# Professional 3D Modelling & Book Anatomy Specification

## 1. Mechanical Anatomy of the Physical Book

The 3D book model is built to exacting physical specifications, avoiding flat planes, primitive cubes, or generic boxes.

```
                  +----------------------------------------------+
                  |              Front Cover Board               |
                  | Thickness: 3.5mm • Beveled Edge: 0.8mm       |
                  | Wrapped Bookcloth / Leather PBR Material     |
                  +-------+--------------------------------------+
                          |
                          | Flexible Hinge Line (1.5mm depression)
                          |
             +------------+------------+
             |      Cambered Spine     |  Arc Curvature: 14°
             | Height matches spread   |  Flexible backing cloth
             +------------+------------+
                          |
                          | Flexible Hinge Line
                          |
                  +-------+--------------------------------------+
                  |              Back Cover Board                |
                  | Thickness: 3.5mm • Structural Board Core     |
                  +----------------------------------------------+
                                \                 /
                                 \   Endpapers   /
                                  \=============//
                                  | Paper Block  | [Page block thickness: 18mm]
                                  | Layered Edges| [Individual paper roughness 0.85]
                                  +--------------+
```

### Component Breakdown
1. **Front & Back Cover Boards**: 3.5mm thickness with smooth chamfered edges. Backed with high-resolution PBR textures (linen cloth, woven fabric, pebble leather).
2. **Cambered Spine**: Anatomically curved outer spine that flattens realistically when the book rests open on a flat surface.
3. **Flexible Hinges (Joints)**: Subsurface bending zones between the spine and cover boards allowing fluid opening angles from 0° (closed) to 180° (lay-flat open).
4. **Endpapers**: Marbled or textured archival endpapers bridging the inside cover to the page block.
5. **Page Block (Text Block)**: Realistic paper stack with micro-layered edge geometry, subtle paper roughness, and organic paper fiber normal maps.
6. **Active Turning Pages**: Dynamic parametric meshes capable of conical page-curl bending during user swipe or drag gestures.

---

## 2. PBR Material Architecture

| Surface Component | Texture Maps Required | Roughness | Metalness | Normal Map Pattern |
| :--- | :--- | :--- | :--- | :--- |
| **Heirloom Bookcloth** | BaseColor, Roughness, Normal, AO | `0.75 - 0.90` | `0.00` | Fine linen cross-weave |
| **Pebble Leather** | BaseColor, Roughness, Normal, AO | `0.45 - 0.65` | `0.00` | Organic leather grain |
| **Gold / Silver Foil** | Metallic, Roughness, Mask | `0.15 - 0.25` | `1.00` | Crisp vector typography deboss |
| **Archival Paper** | BaseColor, Normal, Translucency | `0.85 - 0.95` | `0.00` | Cellulose paper fiber |
| **Paper Block Edge** | BaseColor, Normal, Roughness | `0.80 - 0.90` | `0.00` | Horizontal micro-strata striations |

---

## 3. Parametric Page-Turning Curl Algorithm

During interactive page turning, the turning page geometry is deformed in real-time along a moving conical axis parameterized by the user's drag vector $(x_d, y_d)$ and progress $t \in [0, 1]$:

$$\theta(u, v) = \frac{\pi \cdot t}{1 + e^{-k(u - t)}}$$

The vertex shader evaluates:
1. **Longitudinal Bend**: Curvature along the page width from the spine gutter to the outer edge.
2. **Diagonal Lift**: Conical curl lifting the top or bottom corner depending on the drag origin.
3. **Backside Occlusion**: Accurate front-page vs back-page texture coordinate mapping preventing mirror-image text artifacts.
