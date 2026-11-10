# Memoria — iOS Memory & Resource Management

**Modules:**
- `apps/ios/Memoria/Sources/Memoria/RenderingEngine/BookAssetManager.swift`
- `apps/ios/Memoria/Sources/Memoria/RenderingEngine/TextureResourceManager.swift`
- `apps/ios/Memoria/Sources/Memoria/RenderingEngine/MemoryPressureManager.swift`
- `apps/ios/Memoria/Sources/Memoria/Services/BookStatePersistenceService.swift`

---

## 1. Resource Ownership & Lifecycle

| Resource Class | Owner | Cache Policy | Durable Storage | Status |
|---|---|---|---|---|
| **User Book Configuration & Reading Position** | `BookStatePersistenceService` | Never evicted | `Application Support/MemoriaArchive/book_states.json` (atomic `.atomic` writes) | `Implemented and measured` |
| **USDZ Template Entities** | `BookAssetManager` (`BookAssetCacheRegistry`) | Versioned LRU (`modelId@version#variant`) with byte budget (`12 MB` / `6 MB` / `2 MB`) | Bundled USDZ (`Resources/Models/`) | `Implemented and measured` |
| **Spread & Single-Page `TextureResource`s** | `TextureResourceManager` | Bounded window (`N-1, N, N+1`) + dimension-aware eviction (`<= maxTextureDimension`) | Re-renderable from `BookSpreadPreview` | `Implemented and measured` |
| **PBR `MaterialBundle`s & Leather Grain** | `TextureResourceManager` | Bounded (`<= 16` bundles); grain disabled below `6 MB` budget | Re-synthesizable from `Book3DContract` | `Implemented and measured` |
| **Mode A 2D Cover Thumbnails** | `TextureResourceManager` (`coverThumbnailCache`) | Bounded (`<= 24` images), cleared on memory warning | Re-synthesizable | `Implemented and measured` |
| **Per-Viewport RealityKit Entities & Subscriptions** | `BookSceneCoordinator` | Released cleanly via `detachScene()` in `.onDisappear` | Transient only | `Implemented and measured` |

---

## 2. Concurrent Loading, Deduplication & Cancellation

- **In-flight deduplication:** `BookAssetManager.loadBookSceneRoot` tracks `inFlightLoads[BookAssetCacheKey]` so simultaneous requests for the same variant await the same `Task` and receive independent `.clone(recursive: true)` instances. (`Implemented and measured`)
- **Cancellation on background / suspension:** `SceneLifecycleManager` invokes `onCancelObsoleteTasks` upon entering `.suspended`, `.failed`, or `.fallback`, cancelling active USDZ load tasks via `BookAssetManager.cancelAllInFlightLoads()`. (`Implemented and measured`)
- **iOS 17 + iOS 18 async parity:** Uses `Entity(contentsOf:)` on iOS 18+ and cancellation-safe `Entity.loadAsync(contentsOf:)` continuation wrapping on iOS 17. (`Implemented and measured`)

---

## 3. Memory-Pressure Response Policy

`MemoryPressureManager` observes both `UIApplication.didReceiveMemoryWarningNotification` and `DispatchSource.makeMemoryPressureSource(eventMask: [.warning, .critical, .normal])`:

| Pressure Level | `BookAssetManager` Action | `TextureResourceManager` Action | `RenderingQualityController` Action | Status |
|---|---|---|---|---|
| `.normal` | Standard LRU budget enforcement | Retain `N-1 .. N+1` spread window (if `allowPreloading`) | Allow gradual recovery after cooldown | `Implemented and measured` |
| `.warning` | `evictInactive(keeping: activeVariant)` | Evict off-screen spreads (`!= activeSpreadIndex`), clear grain & thumbnail caches | Cap quality at `Efficient` | `Implemented and measured` |
| `.critical` | `evictAll()` + `cancelAllInFlightLoads()` | `evictAllSpreads()`, clear `materialCache`, `pageTextureCache`, `leatherGrainCache`, `coverThumbnailCache` | Immediate transition to `Accessible 2D` (`fallback`) | `Implemented and measured` |

---

## 4. Verification & Open Physical-Device Work

- **Automated unit & simulator verification:** LRU eviction, dimension-cap downgrade eviction, active-spread preservation under `.warning`, critical purge, background cache trimming, and durable persistence across simulated failures are covered in `Adaptive3DEngineTests`. (`Implemented and measured`)
- **Instruments Allocations / Leaks soak (30-minute book switching):** `Implemented, measurement pending` (requires tethered physical iPhone in Xcode Instruments).
