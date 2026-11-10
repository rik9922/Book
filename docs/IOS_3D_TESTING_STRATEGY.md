# Memoria — iOS 3D Testing & Profiling Strategy

**Test Suites:**  
- `apps/ios/Memoria/Tests/MemoriaTests/MemoriaTests.swift`  
- `apps/ios/Memoria/Tests/MemoriaTests/Adaptive3DEngineTests.swift`  
- `tests/3d-engine-consistency.test.ts`

---

## 1. Automated Scenario Coverage (A–J)

| Scenario | Automated Coverage | Verification Method |
|---|---|---|
| **A. Initial Model Loading** | `testUSDZVariantsAndAdaptiveRealityKitIntegration` | Async `BookAssetManager.loadBookSceneRoot(variant:)` across all 3 USDZ variants + cache hit assertion |
| **B. Continuous Rotation & Frame Pacing** | `testFrameDropDowngradeAndBackgroundTrim`, `testPerformanceMonitorStatistics` | Rolling avg/p95/variance frame-time math and runtime profile downgrade under >30% dropped frames |
| **C. Repeated Cover Open/Close** | `testUSDZVariantsAndAdaptiveRealityKitIntegration` | 4 repeated open/close cycles checking hinge convergence and zero post-settle ticks |
| **D. Extended Page Turning & Deferral** | `testDeferredTransitionDuringPageTurn` | Verifies quality downgrades defer during `.pageTurning` and apply cleanly in `.reading` |
| **E. Long Reading Session (Idle Suspension)** | `testIdleSuspensionAndBackgroundLifecycle` | Verifies `BookInteractionController.step` returns `nil` and increments `suspendedIdleTicks` when settled |
| **F. Thermal Pressure** | `testThermalEscalationAndGradualRecovery` | Tests `.serious` -> `Efficient` and `.critical` -> `Accessible 2D` fallback |
| **G. Thermal Recovery & Anti-Oscillation** | `testOscillationProtectionWithCooldowns` | Verifies cooldown hysteresis and one-step gradual recovery (`fallback -> efficient -> balanced -> premium`) |
| **H. Memory Pressure & LRU Eviction** | `testAssetAndTextureMemoryManagement` | Tests `BookAssetCacheRegistry` LRU eviction, `TextureResourceManager` `N-1..N+1` windowing, warning/critical trim |
| **I. Background & Foreground Lifecycle** | `testIdleSuspensionAndBackgroundLifecycle`, `testFrameDropDowngradeAndBackgroundTrim` | Verifies cache trimming, simulation suspension, and reading position preservation |
| **J. Unsupported / Failure Fallback** | `testDeviceCapabilityTiers`, `testFallbackControllerRetryCapAndCopy` | Verifies Tier D classification, retry cap (`maxRetryAttempts = 2`), and non-technical user copy |

---

## 2. Physical Device Profiling Checklist (Xcode Instruments)

Before production release on physical iPhones, execute in Xcode with a tethered physical device:
1. **Metal System Trace & GPU Counters:** Capture 60s continuous orbit + page turns on Tier A and Tier B/C devices; confirm p95 frame time stays within display budget (`16.67 ms` @ 60 Hz).
2. **Time Profiler & Allocations / Leaks:** Run 30-minute customization + repeated book open/close scenario (Scenario C); confirm zero retained `Entity` or `NotificationCenter` leaks.
3. **Energy Log & Thermal State Simulation:** Run 15-minute idle reading session (Scenario E) confirming near-zero GPU/CPU activity after hinge settlement, and verify thermal transitions via Xcode Devices & Simulators thermal condition overrides.
