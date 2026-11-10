# Memoria — iOS 3D Performance Budgets

**Module:** `apps/ios/Memoria/Sources/Memoria/RenderingEngine/RenderingConfiguration.swift` & `PerformanceMonitor.swift`  
**Minimum Target:** iOS 17.0

---

## 1. Frame Deadlines & Target Cadence

| Display Refresh | Hardware Frame Deadline | Memoria Target Cadence | Rationale | Status |
|---|---|---|---|---|
| **120 Hz ProMotion** | `8.33 ms` | `60 Hz` (`16.67 ms` budget) in `Premium` / `Balanced` | Caps interactive simulation at `60 Hz` to preserve thermal headroom and battery life during sustained reading/studio sessions. | `Implemented, measurement pending` |
| **60 Hz Standard** | `16.67 ms` | `60 Hz` (`16.67 ms`) in `Premium`/`Balanced`; `30 Hz` (`33.33 ms`) in `Efficient` | `Efficient` uses a frame-pacing accumulator (`simulationStepIntervalSeconds = 1/30`) during active motion and `0 Hz` when idle. | `Implemented and measured` |
| **Idle / Static Reading** | N/A | `0 Hz` (Zero entity/camera mutations) | `BookInteractionController.step(...)` returns `nil` once transforms converge within `0.0005`. | `Implemented and measured` |

---

## 2. Explicit Per-Profile Configuration Matrix

| Setting | `Premium` | `Balanced` | `Efficient` | `Accessible 2D (fallback)` |
|---|---|---|---|---|
| **USDZ Asset Variant** | `MemoriaHeirloomBook_Premium` (`314` tris) | `MemoriaHeirloomBook` (`218` tris) | `MemoriaHeirloomBook_Efficient` (`114` tris) | None (2D SwiftUI) |
| **Lighting Rig** | `fourPointStudio` (4 lights) | `threePointBalanced` (3 lights) | `twoPointMinimal` (2 directional lights) | None |
| **Shadows** | `full` (`maxDistance: 2.0`) | `reduced` (`maxDistance: 1.4`) | `disabled` (`nil`) | None |
| **Clearcoat PBR** | `true` (with 256px leather grain map) | `true` (with 256px leather grain map) | `false` | `false` |
| **Page Deformation Grid** | `16 × 6` subdivisions | `10 × 4` subdivisions | `6 × 2` subdivisions | `0 × 0` (Disabled) |
| **High-Detail Page Curl** | `true` (unless Reduce Motion) | `true` (unless Reduce Motion) | `false` (reduced arch amplitude) | `false` |
| **Max Texture Dimension** | `1024 px` | `512 px` | `256 px` | `256 px` (2D thumbnails only) |
| **Texture Memory Budget** | `24 MB` | `10 MB` | `4 MB` | `0 MB` |
| **Entity Cache Budget** | `12 MB` | `6 MB` | `2 MB` | `0 MB` |
| **Adjacent Spread Preload** | `true` (when thermal `<= .fair`) | `true` (when thermal `<= .fair`) | `false` | `false` |

---

## 3. Presentation Mode Budget Overrides (Part III)

| Mode | View | Budget Adjustment | Status |
|---|---|---|---|
| **Mode A — Library** | `BookshelfView` | Zero RealityKit scenes; lightweight cached 2D `BookCoverThumbnailView` cards. | `Implemented and measured` |
| **Mode B — Book Preview** | `BookPreviewView` | Downgrades `Premium` -> `Balanced` variant/lighting, disables spread preloading while closed, caps texture budget at `2 MB`. | `Implemented and measured` |
| **Mode C — Book Studio** | `BookStudioView` | Full profile budget; material/typography updates reuse cached PBR bundles without reloading USDZ geometry. | `Implemented and measured` |
| **Mode D — Reading** | `Book3DReaderView` | Full profile budget during cover/page animation; immediately suspends simulation (`0 Hz`) when settled on a spread. | `Implemented and measured` |

---

## 4. Degradation & Acceptance Thresholds (`PerformanceMonitor`)

- **Rolling window:** Up to `180` active frame samples (excluding `> 250 ms` background-resume outliers).
- **Dropped frame definition:** `frameTimeMs > max(18.0, targetFrameBudgetMs * 1.25)` (e.g., `> 20.8 ms` at `60 Hz`).
- **Health classification (minimum `15` active samples):**
  - `moderateDegradation`: `droppedRatio >= 12%` OR `p95 > 1.45 × budget` OR `stdDev > 0.75 × budget`
  - `severeDegradation`: `droppedRatio >= 30%` OR `p95 > 2.0 × budget`
- **Physical-device GPU/energy validation:** `Blocked` (no physical iPhone attached; see `docs/IOS_3D_PERFORMANCE_BENCHMARKS.md`).
