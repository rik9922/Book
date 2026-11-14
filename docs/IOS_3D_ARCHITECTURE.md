# Memoria 3D Book Engine Architecture (Web & Native iOS)

## 1. Shared Canonical Specification
- `packages/contracts/src/book-3d.ts` defines `CANONICAL_BOOK_3D_MANIFEST`, `BOOK_LEATHER_SWATCHES`, `BOOK_FOIL_SWATCHES`, `BOOK_CAMERA_PRESETS`, `BOOK_LIGHTING_INTENT`, and deterministic cover/page curl math.
- Cross-platform consistency is enforced by `tests/3d-engine-consistency.test.ts`.

## 2. Web Three.js / R3F Engine (`apps/web/src/components/3d/ExperienceCanvas.tsx`)
- Adaptive `qualityTier` (`low`, `balanced`, `high`) initialized from `navigator.hardwareConcurrency`, `deviceMemory`, and `prefers-reduced-motion`, dynamically adjusted by `@react-three/drei` `PerformanceMonitor`.
- Scales `dpr` (`[1, 1.25]` / `[1, 1.5]` / `[1, 2]`), directional `shadow-mapSize` (`[512, 512]` / `[1024, 1024]`), and `ContactShadows` frame baking (`frames={1}` when idle, `4` during interaction).
- Uses `frameloop="demand"` when idle (with `OrbitControls` invalidating on pointer/wheel interaction) and `frameloop="always"` during cover/page-turn/camera animations.

## 3. Native iOS 3D Engine (`apps/ios/Memoria`)
- Uses RealityKit / SceneKit 3D book presentation with fallback-safe spread reading and matching Living Archive light-only studio surface (`#F7F4EE`).
