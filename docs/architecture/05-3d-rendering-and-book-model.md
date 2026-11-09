# 3D Book Experience & Geometry Engine

## 1. Physical Book Structural Model

The 3D Book simulation rejects simplistic textured cube approximations and models the full mechanical anatomy of a premium hardcover book:

```
  +-------------------------------------------------------------+
  |                      Front Cover Board                      |
  |  [Book Cloth / Leather PBR Material, Foil Stamping / Emboss]|
  +---+---------------------------------------------------------+
      |  Hinge / Joint (Subsurface bending line)
  +---+---+
  | Spine |  [Cambered arch with natural flex]
  +---+---+
      |  Hinge / Joint
  +---+---------------------------------------------------------+
  |                      Back Cover Board                       |
  +-------------------------------------------------------------+
               \                                    /
                \            Endpapers             /
                 \================================/
                 |        Page Block Stack        |
                 | [Layered paper edge thickness] |
                 | [Rigid body spine connection]  |
                 +--------------------------------+
```

## 2. Realistic Page Mechanics & Turning Shaders

- **Spine Dynamics**: Curved spine with procedural vertex deformation as opening angles transition from 0° (closed) to 180° (flat open) or 120° (reading cradle).
- **Page Curl Vertex Shader**: Simulates dynamic paper stiffness and conical curvature during page-turning transitions using a dual-bend spline algorithm:
  $$y = A \cdot \sin(kx) \cdot (1 - e^{-\alpha z})$$
- **Paper PBR Material**: Roughness ~0.85, metalness 0.0, micro-fiber normal map, and subtle subsurface scattering (SSS) for light bleed through organic paper stock.
- **Progressive Memory Management**: Rather than loading all spreads into GPU VRAM, only the active spread $N$, preceding spread $N-1$, and upcoming spread $N+1$ maintain active WebGL textures. Distant spreads use low-resolution mipmapped proxy textures.

