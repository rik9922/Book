# Memoria — iOS Thermal Management Specification

**Module:** `apps/ios/Memoria/Sources/Memoria/RenderingEngine/ThermalMonitor.swift`  
**Coordinator:** `RenderingQualityController.swift` & `BookRenderingManager.swift`

---

## 1. Native Observation Mechanisms

Memoria observes iOS thermal and power conditions exclusively through supported public Foundation APIs (zero private APIs or undocumented temperature sensors):
- `ProcessInfo.processInfo.thermalState`
- `ProcessInfo.thermalStateDidChangeNotification`
- `ProcessInfo.processInfo.isLowPowerModeEnabled`
- `Notification.Name.NSProcessInfoPowerStateDidChange`

---

## 2. Thermal State Response Matrix

| Reported `ProcessInfo.ThermalState` | Policy Directive | Engine Action |
|---|---|---|
| `.nominal` | `.normal` | Normal adaptive rendering up to device capability tier; gradual 1-step recovery allowed after stability cooldown. |
| `.fair` | `.conserveBackground` | Caps maximum profile at `Balanced`, pauses expensive preloading if needed, avoids aggressive upgrades. |
| `.serious` | `.reduceWorkload` | Immediately transitions to `Efficient` profile (shadowless 2-light rig, lightweight USDZ, no clearcoat, 30 Hz step cadence) and trims inactive asset caches. |
| `.critical` | `.emergencySafeMode` | Immediately halts intensive 3D work and activates `Book2DSpreadFallbackView` with a calm, non-technical notice while preserving book customization and reading position. |

---

## 3. Hysteresis, Cooldowns, and Gradual Recovery

- **Anti-Oscillation Cooldowns:** Non-emergency downgrades honor a `2.5s` cooldown; recovery requires `12.0s` of sustained healthy frame pacing and `.nominal`/`.fair` thermal state before stepping up **one tier at a time** (`fallback -> efficient -> balanced -> premium`).
- **Interaction Deferral:** Non-emergency quality transitions are deferred if `BookInteractionState` is `.opening`, `.closing`, or `.pageTurning`, applying cleanly once the animation settles.
- **Transient Safety:** A single thermal notification never permanently blacklists a device; once thermal pressure subsides and stability is verified, quality restores progressively.
- **No Unverified Claims:** Thermal behavior has been verified with unit-tested state transitions and Xcode-style simulated state changes; physical-device thermal soak runs remain required before production release sign-off.
