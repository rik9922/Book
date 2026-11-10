# Memoria — iOS 3D Performance Benchmarks (Verified Measurements)

**Benchmark Date:** 2026-11-10  
**Host Environment:** Apple Silicon macOS, Xcode 27.2 (`27B52`), iPhone Simulator `iPhone 17 Pro` (iOS 26.5)  
**Physical Device Attached:** None (`xcrun devicectl list devices` reported simulated devices only)

---

## 1. USDZ Runtime Asset Variants (Measured from `scripts/generate_book_model.py`)

All three USDZ variants share the exact 11 canonical `Book3DHierarchy` nodes and pass `xcrun usdchecker`:

| Variant | File | Vertices | Triangles | Archive Size | Page Mesh Subdivisions (`X×Z`) | `usdchecker` | Status |
|---|---|---|---|---|---|---|---|
| **Premium** | `MemoriaHeirloomBook_Premium.usdz` | `441` | `314` | `44,061` bytes | `16 × 6` | PASS (exit 0) | `Implemented and measured` |
| **Balanced (Canonical)** | `MemoriaHeirloomBook.usdz` | `313` | `218` | `32,811` bytes | `10 × 4` | PASS (exit 0) | `Implemented and measured` |
| **Efficient** | `MemoriaHeirloomBook_Efficient.usdz` | `185` | `114` | `21,807` bytes | `6 × 2` | PASS (exit 0) | `Implemented and measured` |

- **Geometry reduction (Premium -> Efficient):** **-58.0% vertices** (`441 -> 185`), **-63.7% triangles** (`314 -> 114`), **-50.5% archive bytes** (`44,061 -> 21,807`).
- **Base texture VRAM:** `0 MB` external bitmap textures (procedural PBR parameters + bounded LRU spread/page textures).

---

## 2. Automated Build & Test Execution Benchmarks

| Check | Scope | Result | Measured Duration | Status |
|---|---|---|---|---|
| `cd apps/ios/Memoria && swift test` | 24 Swift tests across 3 suites (Engine, 13-state Lifecycle, Page Deformation Physics, Interactive Drag Continuity, Persistence, Contracts, Storage) | `24/24 PASS` | `3.34 s` build / `0.83 s` test | `Implemented and measured` |
| `pnpm run ios:test` (`iPhone 17 Pro` Simulator) | 27 tests across 3 suites including live RealityKit loading of all 3 USDZ variants, dual-material deformable `ActiveTurningPage` mesh generation, interactive coordinator turn & cache key isolation, `LeftPageSurface`/`RightPageSurface`, Mode A 2D cover thumbnails, and clean scene detachment | `27/27 PASS` | `0.960 s` test execution (`3.606 s` Xcode runner) | `Implemented and measured` |
| `tests/3d-engine-consistency.test.ts` | 6 consistency tests (GLB/USDZ parity, CCW winding, `usdchecker`, `book-service`, Swift lock) | `6/6 PASS` | Verified via `node --test` | `Implemented and measured` |

---

## 3. Unmeasured Physical-Device Metrics (Honest Disclosure — `Blocked`)

Because no physical iPhone was attached during this session:
- Real iPhone GPU frame time (ms), Metal shader occupancy, physical battery drain (% per 5/15/30 min), peak resident physical memory during 20 book switches, and real silicon thermal ramp curves (`Nominal -> Fair -> Serious -> Critical`) are **not fabricated** and remain **unverified on physical hardware**.
- Simulator RealityKit tests verified async USDZ loading, cache hits (`cacheHit == true`), lighting rig counts, hinge convergence, dual-material deformable turning-page mesh generation (`ActiveTurningPage`), non-intersecting deformation math, idle tick suspension (`suspendedIdleTicks >= 60`), and clean teardown (`detachScene()`).
