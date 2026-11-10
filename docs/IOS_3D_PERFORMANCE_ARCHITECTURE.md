# Memoria — iOS Adaptive 3D Rendering & Performance Architecture

**Product:** Memoria (*Your memories, made timeless.*)  
**Platform:** Native iOS 17.0+ (SwiftUI + RealityKit)  
**Engine Module:** `apps/ios/Memoria/Sources/Memoria/RenderingEngine/`  
**Theme Policy:** Living Archive Light-Only (`#F7F4EE` Warm Ivory, `#76556F` Muted Plum)

---

## 1. Architectural Goals

The **Memoria Adaptive 3D Rendering Engine** preserves the physical heirloom realism of Memoria's 3D books while protecting iPhone thermal headroom, battery life, memory stability, and UI responsiveness.

- **Separation of Concerns:** The rendering engine is isolated under `RenderingEngine/` and decoupled from book content models, authentication, and backend sync services.
- **No WebView Fallback Shortcut:** Native SwiftUI + RealityKit (`RealityView` on iOS 18+, `ARView(cameraMode: .nonAR)` on iOS 17) drives 3D rendering; constrained devices fall back cleanly to the native SwiftUI `Book2DSpreadFallbackView`.
- **Measured Runtime Adaptation:** Quality profiles adapt to real measured frame pacing, `ProcessInfo.thermalState`, Low Power Mode, and memory pressure rather than hardcoded iPhone model names alone.

---

## 2. Module Topology

```text
BookRenderingManager (@MainActor ObservableObject)
├── DeviceCapabilityAnalyzer   (RAM, cores, Metal GPU family, refresh rate, history -> Tier A-D)
├── ThermalMonitor             (ProcessInfo.thermalState + Low Power Mode observer & history)
├── PerformanceMonitor         (Rolling avg, p95, stdDev, dropped-frame ratio, load timings)
├── MemoryPressureManager      (UIApplication memory warnings + DispatchSource memory pressure)
├── RenderingQualityController (Hysteresis, cooldowns, interaction deferral, 1-step recovery)
├── BookAssetManager           (Versioned LRU entity template cache + coalesced async USDZ loads)
├── TextureResourceManager     (Spread windowing N-1..N+1 + cached PhysicallyBasedMaterial reuse)
└── BookFallbackController     (Calm non-technical fallback + retry cap + progress preservation)

Per-Viewport Scene Runtime (Book3DRealityController)
├── SceneLifecycleManager      (Explicit interaction states + idle simulation suspension)
├── BookInteractionController  (Cover/page hinge kinematics + settled-epsilon detection)
└── Book3DRealityView          (RealityView iOS 18+ / ARView iOS 17 + scenePhase lifecycle)
```

---

## 3. Adaptive Quality Profiles

| Parameter | Premium | Balanced | Efficient | Accessible 2D (`fallback`) |
|---|---|---|---|---|
| **USDZ Asset Variant** | `MemoriaHeirloomBook_Premium.usdz` (441 verts, 314 tris) | `MemoriaHeirloomBook.usdz` (313 verts, 218 tris) | `MemoriaHeirloomBook_Efficient.usdz` (185 verts, 114 tris) | Native SwiftUI 2D Spread |
| **Lighting Rig** | 4 lights (Key + Fill + Foil + Rim) | 3 lights (Key + Fill + Foil) | 2 lights (Key + Fill, no point lights) | N/A |
| **Shadow Configuration** | Key shadow (`maxDistance: 2.0`) | Reduced shadow (`maxDistance: 1.4`) | Disabled (`shadow = nil`) | N/A |
| **Clearcoat PBR Pass** | Enabled | Enabled | Disabled | N/A |
| **Target Simulation Cadence** | 60 Hz (capped from 120 Hz for thermal headroom) | `min(60, maxRefreshRate)` Hz | 30 Hz step accumulator | 0 Hz (idle) |
| **Spread Texture Budget** | 24 MB (max 1024 px) | 10 MB (max 512 px) | 4 MB (max 256 px) | 0 MB |
| **Entity Cache Budget** | 12 MB | 6 MB | 2 MB | 0 MB |
| **Adjacent Preloading** | Allowed (when thermal <= Fair) | Allowed (when thermal <= Fair) | Disabled | Disabled |

---

## 4. Interaction-Based Lifecycle & Idle Suspension

`SceneLifecycleManager` enforces explicit states: `closed`, `idle`, `opening`, `closing`, `interactive`, `pageTurning`, `reading`, `backgrounded`, and `fallback`.

1. **Idle Zero-Mutation Gate:** `BookInteractionController.step(...)` checks `hasPendingMotion()`. Once cover hinge, page turn, and camera preset transforms converge within `0.0005`, `SceneEvents.Update` returns immediately in `O(1)` without mutating entity transforms or camera matrices.
2. **Shelf Occlusion Suspension:** When `BookshelfView` presents `Book3DReaderView` or `Book2DSpreadFallbackView`, `isSceneActive` becomes `false`, suspending the shelf preview scene while keeping its cached template reusable via `BookAssetManager`.
3. **Background / Foreground Lifecycle:** Entering `.background` cancels in-flight asset loads, trims inactive cache variants, trims adjacent spread buffers, resets transient frame samples, and preserves `Book3DConfiguration` and `currentSpreadIndex`.

---

## 5. RealityKit Public API Boundaries

Public RealityKit `RealityView` (`iOS 18+`) does **not** expose a public GPU utilization percentage API or a direct `preferredFramesPerSecond` property on `RealityView`. Accordingly:
- The engine uses **supported public mechanisms**: `ProcessInfo.thermalState`, `SceneEvents.Update` delta-time telemetry, `MTLCreateSystemDefaultDevice()` capability checks, idle transform gating, adaptive light/shadow complexity, USDZ LOD variants, and `ARView.renderOptions` on iOS 17.
- GPU shader/rasterization profiling must be performed in Xcode Metal System Trace / Instruments on physical hardware.
