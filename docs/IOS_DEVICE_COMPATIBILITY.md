# Memoria — iOS Device Capability & Compatibility Matrix

**Analyzer:** `apps/ios/Memoria/Sources/Memoria/RenderingEngine/DeviceCapabilityAnalyzer.swift`  
**Minimum Deployment Target:** iOS 17.0 (`IPHONEOS_DEPLOYMENT_TARGET = 17.0`)

---

## 1. Capability Classification Model (Evidence-Based)

`DeviceCapabilityAnalyzer` never selects quality profiles using marketing iPhone model strings alone. Initial classification combines:
1. Physical memory (`ProcessInfo.processInfo.physicalMemory`)
2. Processor core count & active cores (`processorCount`, `activeProcessorCount`)
3. Metal GPU availability & family (`MTLCreateSystemDefaultDevice()`, `.apple4` support, `recommendedMaxWorkingSetSize`)
4. Display refresh capability (`UIScreen.main.maximumFramesPerSecond`)
5. Accessibility & power state (`UIAccessibility.isReduceMotionEnabled`, `isLowPowerModeEnabled`, `thermalState`)
6. Measured historical runtime performance (`historicalAverageFrameTimeMs`, `historicalDroppedFrameRatio`)

| Capability Tier | Classification Criteria | Maximum Profile | Runtime Behavior |
|---|---|---|---|
| **Tier A** | `>= 5.0 GiB` reported RAM (6 GB+ class after kernel carve-out), `>= 6` cores, Metal Apple4+ GPU, `>= 1024 MB` working set, healthy history | `Premium` | Full 4-light studio rig, shadow enabled, clearcoat PBR + grain map, `Premium` USDZ |
| **Tier B** | `>= 2.7 GiB` reported RAM (3–4 GB class), `>= 4` cores, Metal Apple4+ GPU (or Tier A constrained by dropped frames) | `Balanced` | 3-light rig, reduced shadow, canonical `Balanced` USDZ |
| **Tier C** | `< 2.7 GiB` reported RAM or `< 4` cores with valid Metal Apple4+ GPU | `Efficient` | 2-light shadowless rig, lightweight `Efficient` USDZ, no clearcoat, 30 Hz cadence |
| **Tier D** | Missing Metal device, `< 1.4 GiB` reported RAM, or GPU below Apple4 baseline | `Accessible 2D` | Native `Book2DSpreadFallbackView` without attempting unstable 3D rendering |

---

## 2. Observed Test Matrix (Verified vs. Untested Hardware)

*Per engineering governance, untested physical iPhone models are explicitly marked **Not Tested** rather than promised as verified.*

| Environment / Device | iOS Version | Refresh Rate | Selected Profile | Test Status | Notes |
|---|---|---|---|---|---|
| **iPhone 17 Pro (iOS Simulator)** | iOS 26.5 (SDK 27.2) | 120 Hz (host simulated) | `Premium` (Tier A) | **Tested (Automated Suite)** | 20/20 Swift & RealityKit tests passed; simulator reflects host Apple Silicon GPU, not iPhone thermal/battery hardware |
| **macOS SwiftPM (`arm64e`)** | macOS 14+ toolchain | N/A | Unit-tested Tiers A–D | **Tested (18/18 Unit Tests)** | Verified capability analyzer, thermal hysteresis, auto-recovery, cache LRU, lifecycle, fallback |
| **Physical Legacy iPhone (e.g., iPhone SE / 12 / 13)** | iOS 17–18 | 60 Hz | Expected Tier B/C (unverified) | **Not Tested (No physical device attached)** | Requires physical hardware run in Xcode Instruments before release |
| **Physical ProMotion iPhone (e.g., iPhone 15/16/17 Pro)** | iOS 17–26 | 120 Hz | Expected Tier A (unverified) | **Not Tested (No physical device attached)** | Requires Metal System Trace, Energy Log, and 30-min thermal soak on physical hardware |
