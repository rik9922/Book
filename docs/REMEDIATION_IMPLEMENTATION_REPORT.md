# Memoria Remediation & Production-Readiness Report

**Product:** Memoria — Your memories, made timeless.  
**Branch:** `main`  
**Budget Constraint:** $0 (100% local/open-source tooling, cardless).

## 1. Implementation Matrix (Verified Against Source & Runtime)

| Area | Source Location | Remediation Implemented | Verification |
|---|---|---|---|
| **Offline Memory Durability (iOS)** | `apps/ios/Memoria/Sources/Memoria/Services/LocalStorageService.swift`, `OfflineSyncService.swift`, `MemoryCreateView.swift` | Replaced disposable Caches JSON + `try?` swallowing with durable `Application Support/MemoriaArchive/Originals/`, atomic writes, SHA-256 checksums (`CryptoKit`), and persistent `PendingMutation` queue with exponential backoff + jitter and account isolation. | `cd apps/ios/Memoria && swift test` (`OfflineSyncIntegrityTests`) |
| **Sync Idempotency & Conflicts** | `packages/database/migrations/015_memory_sync_idempotency_and_revisions.sql`, `services/memory-service/src/server.ts`, `services/media-service/src/server.ts` | Added `client_mutation_id`, `revision`, and `media_assets.idempotency_key` unique indexes; `POST` memory/upload-session idempotency; `PATCH` `409 VERSION_CONFLICT` on stale `expectedRevision`. | `tests/security-and-processing.test.ts` + `swift test` |
| **Fail-Closed Backup & Restore** | `scripts/backup.ts`, `scripts/restore.ts`, `tests/backup-restore.test.ts` | Fail-closed manifest (`schemaVersion`, `assetManifest` per-file SHA-256, `fileCount`, `tar -tzf` check), `--verify-only` extraction check, `--confirm-live-restore` guard, isolated `--target-db-suffix` restore rehearsal, and machine-readable `RestorationReport`. | `tests/backup-restore.test.ts` against live PostgreSQL 18.6 |
| **OCR Idempotency & Graceful Jobs** | `packages/database/migrations/016_ocr_idempotency.sql`, `packages/jobs/src/index.ts`, `services/media-service/src/server.ts` | Unique index on `(media_id, page_number, language)` with `ON CONFLICT DO UPDATE`, canonical `jobId` deduplication (`ocr_<id>_<lang>`, `proc_<id>`), `InMemoryJobManager.close()` awaits in-flight tasks, explicit media statuses (`original_verified`, `completed_partial`, `retryable_failure`, `permanent_failure`). | `tests/security-and-processing.test.ts` + `tests/ocr-pipeline.test.ts` |
| **Storage Containment & Infra** | `packages/storage/src/index.ts`, `docker-compose.yml` | `LocalDiskStorageDriver.resolvePath` rejects `..`, null bytes, and symlink escapes via `realpathSync`; Docker Compose ports bound to `127.0.0.1`. | `tests/security-and-processing.test.ts` |
| **Admin Portal Real Aggregates** | `services/memory-service/src/server.ts`, `services/media-service/src/server.ts`, `apps/web/src/app/admin/page.tsx` | Replaced hardcoded placeholders (`memberCount: 1`, `memoryCount: 0`, `usedPercentage: 10`, `"Live DB"`) with real DB counts and quota stats (`"Unavailable"` fallback when unmeasured). | `pnpm build` + `tests/security-and-processing.test.ts` |
| **Web 3D Adaptive Rendering** | `apps/web/src/components/3d/ExperienceCanvas.tsx` | Added hardware-aware `qualityTier` (`low`/`balanced`/`high`), `@react-three/drei` `PerformanceMonitor`, adaptive `dpr` & shadow map sizes, `ContactShadows` frame baking, and `frameloop="demand"` when idle. | `pnpm build` |
| **CI Pipeline & Brand Reconciliation** | `.github/workflows/ci.yml`, `docs/BRAND_IDENTITY.md` | Added Playwright Chromium install in CI, toolchain/SHA logging, `macos-15` PostgreSQL 17 (`max_connections=300`) + Redis + NATS JetStream + Node microservices startup for live iOS E2E, `xcodebuild` build & test job, and removed contradictory legacy emerald/gold rows from `BRAND_IDENTITY.md`. | CI run `43709387139` (`354234c`): `backend-and-web` & `ios-swift-tests` green |
| **iOS Toolbar & XCUITest Reliability** | `apps/ios/Memoria/Sources/Memoria/Views/HomeFeedView.swift`, `MemoryDetailView.swift`, `apps/ios/Memoria/Tests/MemoriaUITests/MemoriaUITests.swift` | Split `HomeFeedView` `HStack` toolbar containers into native `ToolbarItemGroup` items (`topBarLeading`/`topBarTrailing` on iOS) so `Switch Space` and `Capture Memory` expose valid `UIBarButtonItem` hit points; added `tapReliably`, `typeReliably`, sheet disappearance waits, and live backend health preflight in `MemoriaUITests`. | Local `xcodebuild test-without-building` (`37/37` `MemoriaTests`, `2/2` `MemoriaUITests`) + CI `macos-15` (`43709387139`) |

## 2. Verified Test Counts (Commit `354234c`, CI Run `43709387139`)

- **Quality Gate & Build:** `pnpm run check:quality` (`0` violations), `pnpm build` (`16/16` workspace projects built).
- **Backend, Security & Backup/Restore Suite (`NODE_ENV=test pnpm test`):** `84/84` passed across `14` suites (`0` failed, `0` skipped).
- **Web PWA E2E (`tests/e2e/*.ts`):** `30/30` passed (`6/6` Playwright Chromium browser E2E + `24/24` SSR/PWA route checks).
- **Swift Package Tests (`cd apps/ios/Memoria && swift test`):** `34/34` passed across `4` suites.
- **iOS Simulator Tests (`xcodebuild test`):** `37/37` `MemoriaTests` passed across `4` suites + `2/2` `MemoriaUITests` (`testLivingArchiveTabNavigationAndKeyWorkflows` and `testLiveAuthenticatedEndToEndWorkflow`) passed.

## 3. Remaining Physical-Device Hardware Limitations

- **Physical iOS Device Code Signing & Provisioning:** CI runs with `CODE_SIGNING_ALLOWED=NO` on the iOS Simulator; TestFlight / App Store distribution requires Apple Developer Team certificates and provisioning profiles.
- **Hardware GPU / Thermal / Memory Pressure:** `DeviceCapabilityAnalyzer`, `ThermalMonitor`, and `MemoryPressureManager` are verified via deterministic unit/simulation tests, not under sustained physical iPhone thermal throttling or Metal/RealityKit hardware frame-pacing.
- **Physical Camera, Microphone & APNs:** Camera/microphone hardware capture and live APNs push delivery are not available on the iOS Simulator; UI tests exercise the Simulator-compatible capture/recorder flows.
