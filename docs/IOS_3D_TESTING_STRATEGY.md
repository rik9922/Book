# Memoria — iOS 3D Test Plan & Profiling Strategy

**Test Suites:**  
- `apps/ios/Memoria/Tests/MemoriaTests/MemoriaTests.swift`  
- `apps/ios/Memoria/Tests/MemoriaTests/Adaptive3DEngineTests.swift`  
- `tests/3d-engine-consistency.test.ts`

---

## 1. Automated Scenario Coverage Matrix

| Scenario (Part XI.29) | Automated Coverage | Verification Status |
|---|---|---|
| **1–2. First Load & Cached Reopen** | `testBundledUSDZLoadingAndHierarchy`, `testUSDZVariantsAndAdaptiveRealityKitIntegration` | `Implemented and measured` (Simulator RealityKit + SwiftPM) |
| **3. Continuous Rotation & Frame Pacing** | `testFrameDropDowngradeAndBackgroundTrim`, `testPerformanceMonitorStatistics` | `Implemented and measured` |
| **4. Repeated Cover Open / Close** | `testUSDZVariantsAndAdaptiveRealityKitIntegration`, `testBookAnimationControllerInterruptionsAndInteractiveDrag` | `Implemented and measured` |
| **5–7. Forward, Backward & Repeated Page Turns** | `testPageDeformationPhysicsAndUVs`, `testUSDZVariantsAndAdaptiveRealityKitIntegration`, `testDeferredTransitionDuringPageTurn` | `Implemented and measured` |
| **8. Interrupted Page-Turn Gesture** | `testBookAnimationControllerInterruptionsAndInteractiveDrag` | `Implemented and measured` |
| **9–10. Book Customization & Book Switching** | `testBookStateDurablePersistence`, `testAssetAndTextureMemoryManagement` | `Implemented and measured` |
| **11–12. Long Reading Session & Idle Open Book** | `testIdleSuspensionAndBackgroundLifecycle` | `Implemented and measured` |
| **13–14. Background/Foreground & Interruption** | `testExplicit13StateLifecycleMachine`, `testIdleSuspensionAndBackgroundLifecycle` | `Implemented and measured` |
| **15. Memory Warning & Critical Purge** | `testAssetAndTextureMemoryManagement` | `Implemented and measured` |
| **16. Thermal Pressure & Recovery** | `testThermalEscalationAndGradualRecovery`, `testOscillationProtectionWithCooldowns`, `testScheduledAutoRecoveryWhileIdle` | `Implemented and measured` |
| **17–18. Corrupt / Failed Asset Fallback** | `testFallbackControllerRetryCapAndCopy`, `testScheduledAutoRecoveryWhileIdle` | `Implemented and measured` |
| **19–20. Reduce Motion & Accessibility** | `testPageDeformationPhysicsAndUVs` (flat curl under `curlIntensity = 0`), VoiceOver/Reduce Motion bindings in `Book3DRealityView` & `Book2DSpreadFallbackView` | `Implemented, measurement pending` (VoiceOver UI audit requires interactive run) |
| **21. Unsupported / Constrained Device Fallback** | `testDeviceCapabilityTiers` (Tier D), `testPresentationModeBudgetOverrides` | `Implemented and measured` |

---

## 2. Physical Device Profiling Procedure (Xcode Instruments) — `Blocked`

No physical iPhone is attached in the current workspace. Before production sign-off, execute on tethered Tier A (e.g., iPhone 15/16/17 Pro) and Tier B/C (e.g., iPhone SE / 12 / 13) devices:

1. **Metal System Trace & GPU Counters:** Record 60s continuous orbit + forward/backward page turns in Mode D (`Reading`); capture median/p95 frame time, GPU frame time, and dropped-frame count against `16.67 ms`.
2. **Time Profiler & Allocations / Leaks:** Run 30-minute Mode C (`Book Studio`) customization + 20 book-switching cycles; confirm stable resident memory and zero retained `Entity`/`TextureResource` leaks.
3. **Energy Log & Thermal State Override:** Run 15-minute idle reading session confirming near-zero GPU/CPU wakeups while settled, and verify `.fair -> .serious -> .critical -> .nominal` transitions via Xcode Devices & Simulators thermal condition overrides.
4. **MetricKit Verification:** Collect 24h production `MXMetricPayload` / `MXDiagnosticPayload` deliveries via `MetricKitDiagnosticsCollector` in `RenderingDiagnosticsView`.
