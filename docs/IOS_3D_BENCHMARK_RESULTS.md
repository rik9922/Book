# Memoria iOS & 3D Benchmark Results

## 1. Verified Automated Checks
- **Swift Package Tests (`cd apps/ios/Memoria && swift test`):** Verified on local macOS environment (including `OfflineSyncIntegrityTests`).
- **Xcode Simulator Build (`xcodebuild ... generic/platform=iOS Simulator build`):** Verified `** BUILD SUCCEEDED **`.
- **Xcode Simulator Unit & UI Tests (`xcodebuild ... iPhone 17 Pro test`):** Executed against iOS 26.5 Simulator (`MemoriaTests` and `MemoriaUITests`).
- **Web 3D Consistency (`tests/3d-engine-consistency.test.ts`) & Build (`pnpm build`):** Verified.

## 2. Physical Device Benchmarks (Unverified / Hardware Unavailable)
- **Status:** **NOT VERIFIED — BLOCKED BY HARDWARE AVAILABILITY.**
- Physical iPhone hardware (frame-time p95, thermal state, Metal GPU memory footprint, and 120Hz ProMotion telemetry via Instruments/ETTrace) was not attached to this build environment. Do not infer physical-device FPS or thermal headroom from Simulator runs.
