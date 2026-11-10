# Memoria — iOS Thermal Management & Scene Lifecycle

**Modules:**  
- `apps/ios/Memoria/Sources/Memoria/RenderingEngine/ThermalMonitor.swift`  
- `apps/ios/Memoria/Sources/Memoria/RenderingEngine/SceneLifecycleManager.swift`  
- `apps/ios/Memoria/Sources/Memoria/RenderingEngine/RenderingQualityController.swift`  
- `apps/ios/Memoria/Sources/Memoria/RenderingEngine/BookRenderingManager.swift`

---

## 1. Native Observation Mechanisms (`Implemented and measured`)

Memoria observes iOS thermal and power conditions exclusively through supported public Foundation APIs (zero private APIs or undocumented temperature sensors):
- `ProcessInfo.processInfo.thermalState`
- `ProcessInfo.thermalStateDidChangeNotification`
- `ProcessInfo.processInfo.isLowPowerModeEnabled`
- `Notification.Name.NSProcessInfoPowerStateDidChange`

---

## 2. Thermal State Response Matrix

| Reported `ProcessInfo.ThermalState` | Policy Directive | Engine Action | Status |
|---|---|---|---|
| `.nominal` | `.normal` | Normal adaptive rendering up to device capability tier; gradual 1-step recovery allowed after stability cooldown. | `Implemented and measured` |
| `.fair` | `.conserveBackground` | Caps maximum profile at `Balanced`, pauses expensive preloading if needed, avoids aggressive upgrades. | `Implemented and measured` |
| `.serious` | `.reduceWorkload` | Immediately transitions to `Efficient` profile (shadowless 2-light rig, lightweight USDZ, no clearcoat, 30 Hz step cadence) and trims inactive asset caches. | `Implemented and measured` |
| `.critical` | `.emergencySafeMode` | Immediately halts intensive 3D work and activates `Book2DSpreadFallbackView` with a calm, non-technical notice while preserving book customization and reading position. | `Implemented and measured` |

---

## 3. Hysteresis, Cooldowns, and Gradual Recovery (`Implemented and measured`)

- **Anti-Oscillation Cooldowns:** Non-emergency downgrades honor a `2.5s` cooldown; recovery requires `12.0s` of sustained healthy frame pacing and `.nominal`/`.fair` thermal state before stepping up **one tier at a time** (`fallback -> efficient -> balanced -> premium`).
- **Interaction Deferral:** Non-emergency quality transitions are deferred if `SceneLifecycleState` is `.opening`, `.closing`, or `.turningPage`, applying cleanly once the animation settles.
- **Transient Safety:** A single thermal notification never permanently blacklists a device; once thermal pressure subsides and stability is verified, quality restores progressively.
- **Physical Thermal Soak Validation:** `Blocked` (no physical iPhone attached; behavior verified in unit tests and developer simulation controls in `RenderingDiagnosticsView`).

---

## 4. Explicit 13-State Scene Lifecycle (`Implemented and measured`)

`SceneLifecycleManager` enforces validated state transitions and entry/exit actions across:
`notLoaded -> loading -> ready -> idle / reading <-> interacting / opening / closing / turningPage -> suspended -> recovering -> ready / reading / idle`, plus `failed` and `fallback` recovery paths.

- **Idle suspension:** Continuous transforms and per-frame deformation stop whenever `isSimulationSuspended` is true (`idle`, `reading`, `suspended`, `fallback`, `failed`, or occluded).
- **Backgrounding:** Cancels obsolete USDZ loads (`onCancelObsoleteTasks`), trims inactive caches, and preserves `Book3DConfiguration` and `currentSpreadIndex` on disk (`BookStatePersistenceService`).
