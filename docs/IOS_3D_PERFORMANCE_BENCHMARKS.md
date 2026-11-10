# Memoria — iOS 3D Performance Benchmarks (Verified Measurements)

**Benchmark Date:** 2026-11-10  
**Host Environment:** Apple Silicon macOS, Xcode 27.2 (`27B52`), iPhone Simulator `iPhone 17 Pro` (iOS 26.5)  
**Physical Device Attached:** None (`xcrun devicectl list devices` reported simulated devices only)

---

## 1. USDZ Runtime Asset Variants (Measured from `scripts/generate_book_model.py`)

All three USDZ variants share the exact 11 canonical `Book3DHierarchy` nodes and pass `xcrun usdchecker`:

| Variant | File | Vertices | Triangles | Archive Size | `usdchecker` |
|---|---|---|---|---|---|
| **Premium** | `MemoriaHeirloomBook_Premium.usdz` | `441` | `314` | `44,061` bytes | PASS (exit 0) |
| **Balanced (Canonical)** | `MemoriaHeirloomBook.usdz` | `313` | `218` | `32,811` bytes | PASS (exit 0) |
| **Efficient** | `MemoriaHeirloomBook_Efficient.usdz` | `185` | `114` | `21,807` bytes | PASS (exit 0) |

- **Geometry reduction (Premium -> Efficient):** **-58.0% vertices** (`441 -> 185`), **-63.7% triangles** (`314 -> 114`), **-50.5% archive bytes** (`44,061 -> 21,807`).
- **Base texture VRAM:** `0 MB` external bitmap textures (procedural PBR parameters).

---

## 2. Automated Build & Test Execution Benchmarks

| Check | Scope | Result | Measured Duration |
|---|---|---|---|
| `cd apps/ios/Memoria && swift test` | 15 Swift tests across 3 suites (Engine, Contracts, Storage) | `15/15 PASS` | `1.69 s` build / `0.003 s` test |
| `pnpm run ios:test` (`iPhone 17 Pro` Simulator) | 17 tests across 3 suites including live RealityKit loading of all 3 USDZ variants | `17/17 PASS` | `0.445 s` test run |
| `tests/3d-engine-consistency.test.ts` | 6 consistency tests (GLB/USDZ parity, CCW winding, `usdchecker`, `book-service`, Swift lock) | `6/6 PASS` | `172.38 ms` |

---

## 3. Unmeasured Physical-Device Metrics (Honest Disclosure)

Because no physical iPhone was attached during this session:
- Real iPhone GPU frame time (ms), Metal shader occupancy, physical battery drain (% per 15/30 min), and real silicon thermal ramp curves (`Nominal -> Fair -> Serious -> Critical`) are **not fabricated** and remain **unverified on physical hardware**.
- Simulator RealityKit tests verified scene loading, cache hits (`cacheHit == true` on repeated loads), lighting rig counts, hinge convergence, and idle tick suspension (`suspendedIdleTicks >= 60` with `0` active simulation ticks after settling).
