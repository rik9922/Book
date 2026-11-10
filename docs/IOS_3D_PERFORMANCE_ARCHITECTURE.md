# Memoria — iOS Adaptive 3D Rendering & Performance Architecture

**Product:** Memoria (*Your memories, made timeless.*)  
**Platform:** Native iOS 17.0+ (SwiftUI + RealityKit)  
**Engine Module:** `apps/ios/Memoria/Sources/Memoria/RenderingEngine/`  
**Theme Policy:** Living Archive Light-Only (`#F7F4EE` Warm Ivory, `#76556F` Muted Plum)

---

## 1. Architectural Goals

The **Memoria Adaptive 3D Rendering Engine** preserves the physical heirloom realism of Memoria's 3D books while protecting iPhone thermal headroom, battery life, memory stability, and UI responsiveness.

- **Separation of Concerns (`Implemented and measured`):** Business data and durable reading state (`BookStatePersistenceService`) are decoupled from transient RealityKit entities (`BookSceneCoordinator`) and SwiftUI view hosting (`BookSceneHost` / `Book3DRealityView`).
- **Presentation Mode Isolation (`Implemented and measured`):**
  - **Mode A (`BookshelfView`):** Uses cached 2D cover artwork (`BookCoverThumbnailView`) in scrolling library lists with zero RealityKit scenes.
  - **Mode B (`BookPreviewView`):** Lightweight single-model 3D inspection (`presentationMode: .preview`), capping texture memory and avoiding spread preloading while closed.
  - **Mode C (`BookStudioView`):** Real-time material, paper stock, ribbon, and typography studio (`presentationMode: .studio`) reusing cached PBR bundles without scene rebuilds.
  - **Mode D (`Book3DReaderView`):** Long-session reading (`presentationMode: .reading`) with on-demand spread windowing, genuine active-page deformation, Reduce Motion compliance, and non-3D fallback.
- **No WebView Fallback Shortcut (`Implemented and measured`):** Native SwiftUI + RealityKit (`RealityView` on iOS 18+, `ARView(cameraMode: .nonAR)` on iOS 17) drives 3D rendering; constrained or thermal-critical devices fall back cleanly to `Book2DSpreadFallbackView`.

---

## 2. Module Topology

```text
BookRenderingManager (@MainActor ObservableObject)
├── DeviceCapabilityAnalyzer      (RAM, cores, Metal GPU family, refresh rate, history -> Tier A-D)
├── ThermalMonitor                (ProcessInfo.thermalState + Low Power Mode observer & history)
├── PerformanceMonitor            (Rolling avg, p95, stdDev, dropped-frame ratio, load timings)
├── MemoryPressureManager         (UIApplication memory warnings + DispatchSource memory pressure)
├── RenderingQualityController    (Hysteresis, cooldowns, interaction deferral, 1-step recovery)
├── BookAssetManager              (Versioned LRU entity template cache + coalesced async USDZ loads)
├── TextureResourceManager        (Spread/page LRU windowing N-1..N+1 + Mode A 2D cover thumbnails + PBR cache)
├── BookFallbackController        (Calm non-technical fallback + retry cap + progress preservation)
└── MetricKitDiagnosticsCollector (MXMetricManagerSubscriber for OS metric & diagnostic payloads)

Per-Viewport Scene Runtime
├── BookSceneHost (Book3DRealityView)   (SwiftUI <-> RealityKit boundary, gestures, accessibility)
├── BookSceneCoordinator                (Anchor, adaptive lighting rig, camera, Left/Right page stacks, endpapers)
├── BookAnimationController             (Interruptible cover hinge, ribbon sway, interactive/button page turns)
├── PageDeformationController           (Subdivided conical vertex curl + dual-sided front/back page mesh)
├── BookInteractionController           (Camera orbit/zoom interpolation + idle zero-mutation gate)
└── SceneLifecycleManager               (Explicit 13-state machine + task cancellation + idle suspension)

Durable Persistence
└── BookStatePersistenceService         (Atomic Application Support JSON store per bookId)
```

---

## 3. Adaptive Quality Profiles (`Implemented and measured`)

| Parameter | Premium | Balanced | Efficient | Accessible 2D (`fallback`) |
|---|---|---|---|---|
| **USDZ Asset Variant** | `MemoriaHeirloomBook_Premium.usdz` (441 verts, 314 tris) | `MemoriaHeirloomBook.usdz` (313 verts, 218 tris) | `MemoriaHeirloomBook_Efficient.usdz` (185 verts, 114 tris) | Native SwiftUI 2D Spread |
| **Page Deformation Grid** | `16 × 6` subdivisions | `10 × 4` subdivisions | `6 × 2` subdivisions | Disabled |
| **Lighting Rig** | 4 lights (Key + Fill + Foil + Rim) | 3 lights (Key + Fill + Foil) | 2 lights (Key + Fill, no point lights) | N/A |
| **Shadow Configuration** | Key shadow (`maxDistance: 2.0`) | Reduced shadow (`maxDistance: 1.4`) | Disabled (`shadow = nil`) | N/A |
| **Clearcoat PBR Pass** | Enabled | Enabled | Disabled | N/A |
| **Target Simulation Cadence** | 60 Hz (capped from 120 Hz for thermal headroom) | `min(60, maxRefreshRate)` Hz | 30 Hz step accumulator | 0 Hz (idle) |
| **Spread Texture Budget** | 24 MB (max 1024 px) | 10 MB (max 512 px) | 4 MB (max 256 px) | 0 MB |
| **Entity Cache Budget** | 12 MB | 6 MB | 2 MB | 0 MB |
| **Adjacent Preloading** | Allowed (when thermal <= Fair) | Allowed (when thermal <= Fair) | Disabled | Disabled |

---

## 4. Explicit 13-State Lifecycle & Idle Suspension (`Implemented and measured`)

`SceneLifecycleManager` enforces validated transitions across all 13 explicit states:
`notLoaded`, `loading`, `ready`, `idle`, `interacting`, `opening`, `closing`, `turningPage`, `reading`, `suspended`, `recovering`, `fallback`, and `failed`.

1. **Idle Zero-Mutation Gate:** `BookInteractionController.step(...)` checks `hasPendingMotion()`. Once cover hinge, page deformation, and camera preset transforms converge within `0.0005`, `SceneEvents.Update` returns `nil` immediately without mutating entity transforms or camera matrices.
2. **Task Cancellation:** Transitioning to `suspended`, `failed`, or `fallback` triggers `onCancelObsoleteTasks` to cancel in-flight async USDZ loads.
3. **Background / Foreground Lifecycle:** Entering `.background` persists configuration via `BookStatePersistenceService`, cancels in-flight loads, trims inactive caches, resets transient frame samples, and restores cleanly on foreground without losing reading position.

---

## 5. RealityKit Public API Boundaries

Public RealityKit `RealityView` (`iOS 18+`) does **not** expose a public GPU utilization percentage API or a direct `preferredFramesPerSecond` property on `RealityView`. Accordingly:
- The engine uses **supported public mechanisms**: `ProcessInfo.thermalState`, `SceneEvents.Update` delta-time telemetry, `MTLCreateSystemDefaultDevice()` capability checks, `MetricKit` payload subscription, idle transform gating, adaptive light/shadow complexity, USDZ LOD variants, and `ARView.renderOptions` on iOS 17.
- GPU shader/rasterization profiling (`Metal System Trace` / `Time Profiler`) requires tethered physical hardware (`Blocked`).
