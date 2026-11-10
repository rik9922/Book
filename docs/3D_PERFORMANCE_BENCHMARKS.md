# Memoria — 3D Book Engine Performance Benchmarks

**Benchmark Date:** 2026-11-10  
**Environment:** Apple Silicon macOS (Node.js v26.7.0, Next.js 16.4.5, Xcode 27.2 / iOS Simulator `iPhone 17 Pro`)  
**Model Version:** `2.0.0` (`memoria_heirloom_book_v2`)

---

## 1. Asset Payload & Geometry Telemetry

Verified directly from `scripts/generate_book_model.py`, `packages/contracts/src/book-3d-manifest.json`, and `tests/3d-engine-consistency.test.ts`:

| Metric | Budget Target | Measured Actual | Status |
|---|---|---|---|
| **GLB Binary Size** | `< 250 KB` | `18,776` bytes (`18.3 KB`) | PASS (7.3% of budget) |
| **USDZ Archive Size** | `< 350 KB` | `32,811` bytes (`32.0 KB`) | PASS (9.1% of budget) |
| **Total Vertex Count** | `< 15,000` | `313` vertices | PASS (2.1% of budget) |
| **Total Triangle Count** | `< 10,000` | `218` triangles | PASS (2.2% of budget) |
| **Material Texture VRAM** | `< 15 MB` | `0 MB` procedural PBR | PASS |
| **USDZ `xcrun usdchecker`** | `0` errors | `Success!` (exit code 0) | PASS |

---

## 2. Backend 3D Asset & Manifest Delivery Latency (`book-service`)

Measured via 100 sequential Fastify `app.inject` HTTP requests against `buildBookService()` (`services/book-service/src/server.ts`) including SHA-256 integrity verification on binary reads:

| Endpoint | Payload | Iterations | Avg Latency | p50 (Median) | p95 | p99 |
|---|---|---|---|---|---|---|
| `GET /api/v1/books/3d/manifest` | JSON contracts + manifest | 100 | `0.127 ms` | `0.043 ms` | `0.141 ms` | `7.344 ms` |
| `GET /api/v1/books/3d/assets/memoria_heirloom_book.glb?v=2.0.0` | `18,776` bytes (`model/gltf-binary`) | 100 | `0.162 ms` | `0.128 ms` | `0.234 ms` | `1.500 ms` |
| `GET /api/v1/books/3d/assets/MemoriaHeirloomBook.usdz?v=2.0.0` | `32,811` bytes (`model/vnd.usdz+zip`) | 100 | `0.173 ms` | `0.136 ms` | `0.456 ms` | `1.167 ms` |

- Conditional caching (`ETag` / `If-None-Match` -> `304 Not Modified`) and immutable `?v=2.0.0` `Cache-Control` headers eliminate redundant binary transfers after initial load.

---

## 3. Build, Test & Simulator Execution Timings

| Verification Suite | Scope | Result | Measured Duration |
|---|---|---|---|
| `pnpm --filter @memory-capsule/web build` | Next.js 16 + Turbopack + R3F TypeScript | `PASS` | `547 ms` compile / `508 ms` TS check |
| `tests/3d-engine-consistency.test.ts` | 5 suites: GLB/USDZ binary, CCW winding, `usdchecker`, contracts, `book-service` API | `5/5 PASS` | `226 ms` (test suite) |
| `cd apps/ios/Memoria && swift test` | 5 Swift tests across contracts & kinematics (macOS SwiftPM) | `5/5 PASS` | `1.93 s` build / `0.002 s` test |
| `pnpm run ios:test` (`iPhone 17 Pro` iOS Simulator) | 6 Swift tests including live RealityKit `Entity(contentsOf:)` USDZ load & hinge rotation | `6/6 PASS` | `3.604 s` test run |
| Headless Chrome WebGL (`SwiftShader`) + No-WebGL fallback check | Verified `<canvas>` 3D studio + automatic 2D fallback on `/` | `PASS` | `< 5 s` virtual time |

---

## 4. Runtime Rendering Notes & Unbenchmarked Aspects
- **WebGL / RealityKit GPU Frame Rate:** Real-device 60/120 Hz ProMotion GPU frame-time telemetry on physical iPhone hardware was not instrumented in this headless environment; all frame-loop updates use delta-time clamping (`dt <= 0.05s`) and low-poly geometry (`218` triangles) to stay well within `< 16.6 ms` mobile budgets.
